import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/app.js';
import { prisma } from '../../server/src/prisma.js';
import { resetDatabase, createTestSession } from '../helpers/db.helper.js';
import { clearRateLimitStore } from '../../server/src/middleware/rate-limit.middleware.js';
import { accountIdsByName, bangkokDate, countLedgerRows, insertAccount } from '../helpers/ledger.helper.js';

// State-changing requests must carry an Origin (NFR-10); act as the Vite dev origin.
const TEST_ORIGIN = 'http://localhost:3000';
const ACCOUNTS_URL = '/api/v1/accounts';
const TRANSACTIONS_URL = '/api/v1/transactions';
const SUMMARY_URL = '/api/v1/summary/income-expense';
// Today in Bangkok, so every row is inside the BR-10 window and inside this month's summary.
const TODAY = bangkokDate(0);
const MONTH_START = `${TODAY.slice(0, 8)}01`;

interface AccountItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  openingBalance: { amount: number } | null;
}

interface Line {
  targetAccountId: string;
  amount: number;
}

describe('F-11 Transfers (STS)', () => {
  let seededUsers: Awaited<ReturnType<typeof resetDatabase>>;
  let aliceToken: string;
  let bobToken: string;
  let adminToken: string;
  let ids: Record<string, string>;

  const as = (token: string | null) => {
    const cookie = token ? [`sid=${token}`] : [];
    return {
      get: (url: string) => request(app).get(url).set('Origin', TEST_ORIGIN).set('Cookie', cookie),
      post: (url: string) => request(app).post(url).set('Origin', TEST_ORIGIN).set('Cookie', cookie),
    };
  };

  async function balances(token: string): Promise<Record<string, number>> {
    const res = await as(token).get(ACCOUNTS_URL);
    expect(res.status).toBe(200);
    return Object.fromEntries((res.body.items as AccountItem[]).map((a) => [a.name, a.balance]));
  }

  const send = (
    token: string | null,
    kind: 'PAYMENT' | 'RECEIPT',
    accountId: string,
    totalAmount: number,
    lines: Line[],
    txnDate = TODAY
  ) => as(token).post(TRANSACTIONS_URL).send({ kind, accountId, txnDate, totalAmount, lines });

  /** POST a transaction as Alice that must succeed. */
  async function record(kind: 'PAYMENT' | 'RECEIPT', accountId: string, totalAmount: number, lines: Line[]) {
    const res = await send(aliceToken, kind, accountId, totalAmount, lines);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res;
  }

  const one = (targetAccountId: string, amount: number): Line[] => [{ targetAccountId, amount }];

  async function open(account: string, amount: number) {
    const res = await as(aliceToken)
      .post(`${ACCOUNTS_URL}/${ids[account]}/opening-balance`)
      .send({ amount, date: MONTH_START });
    expect(res.status).toBe(201);
  }

  beforeEach(async () => {
    await clearRateLimitStore();
    seededUsers = await resetDatabase();
    aliceToken = await createTestSession(seededUsers.alice.id);
    bobToken = await createTestSession(seededUsers.bob.id);
    adminToken = await createTestSession(seededUsers.admin.id);
    ids = await accountIdsByName(seededUsers.alice.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('TEST-11.1 (AC-11.1): a Payment from one Cash account with a line to another moves the money out of the source and into the target', async () => {
    await open('Bank Account', 5_000_000); // 50,000.00 THB
    expect((await balances(aliceToken))['Wallet']).toBe(0);

    await record('PAYMENT', ids['Bank Account'], 1_000_000, one(ids['Wallet'], 1_000_000)); // 10,000.00 THB

    const after = await balances(aliceToken);
    expect(after['Bank Account']).toBe(4_000_000); // 40,000.00 THB
    expect(after['Wallet']).toBe(1_000_000); // 10,000.00 THB
  });

  it('TEST-11.2 (AC-11.2): a Receipt into one Cash account with a line to another moves the money out of the other account and into the receiver', async () => {
    await open('Wallet', 200_000); // 2,000.00 THB
    await open('Bank Account', 0);

    await record('RECEIPT', ids['Bank Account'], 150_000, one(ids['Wallet'], 150_000)); // 1,500.00 THB

    const after = await balances(aliceToken);
    expect(after['Bank Account']).toBe(150_000); // 1,500.00 THB
    expect(after['Wallet']).toBe(50_000); // 500.00 THB
  });

  it('TEST-11.3 (AC-11.3): a Payment mixing a transfer line and an expense line applies each line once', async () => {
    await open('Bank Account', 5_000_000);

    const res = await record('PAYMENT', ids['Bank Account'], 150_000, [
      { targetAccountId: ids['Wallet'], amount: 100_000 }, // 1,000.00 THB to the Wallet
      { targetAccountId: ids['Dining'], amount: 50_000 }, // 500.00 THB spent
    ]);
    expect(res.body.transaction.lines).toHaveLength(2);

    const after = await balances(aliceToken);
    expect(after['Bank Account']).toBe(4_850_000); // 48,500.00 THB
    expect(after['Wallet']).toBe(100_000);
    expect(after['Dining']).toBe(50_000);
    expect(await prisma.allocationLine.count({ where: { transactionId: res.body.transaction.id } })).toBe(2);
  });

  it('TEST-11.4 (AC-11.4): transfers leave the income/expense summary unchanged and the ledger invariant holds', async () => {
    // The Sprint 1 journey: opening 50,000.00; salary 30,000.00; card charge 1,200.00 (Dining 700.00 + Groceries 500.00); repayment 800.00.
    await open('Bank Account', 5_000_000);
    await record('RECEIPT', ids['Bank Account'], 3_000_000, one(ids['Salary'], 3_000_000));
    await record('PAYMENT', ids['Credit Card'], 120_000, [
      { targetAccountId: ids['Dining'], amount: 70_000 },
      { targetAccountId: ids['Groceries'], amount: 50_000 },
    ]);
    await record('PAYMENT', ids['Bank Account'], 80_000, one(ids['Credit Card'], 80_000));

    const summaryOf = async () => {
      const res = await as(aliceToken).get(`${SUMMARY_URL}?from=${MONTH_START}&to=${TODAY}`);
      expect(res.status).toBe(200);
      return res.body as { income: number; expense: number; net: number };
    };
    expect(await summaryOf()).toMatchObject({ income: 3_000_000, expense: 120_000, net: 2_880_000 });

    // TEST-11.1 and TEST-11.2 style transfers, dated today.
    await record('PAYMENT', ids['Bank Account'], 1_000_000, one(ids['Wallet'], 1_000_000)); // out to the Wallet
    await record('RECEIPT', ids['Bank Account'], 150_000, one(ids['Wallet'], 150_000)); // back from the Wallet

    expect(await summaryOf()).toMatchObject({ income: 3_000_000, expense: 120_000, net: 2_880_000 });

    // NFR-03 invariant over the API's derived balances, in integer satang.
    const res = await as(aliceToken).get(ACCOUNTS_URL);
    const items = res.body.items as AccountItem[];
    const sum = (filter: (a: AccountItem) => boolean, value: (a: AccountItem) => number) =>
      items.filter(filter).reduce((total, a) => total + value(a), 0);
    const asset = (a: AccountItem) => a.type === 'CASH' || a.type === 'LOAN_GIVEN';
    const debt = (a: AccountItem) => a.type === 'LOAN_TAKEN';
    const balanceOf = (a: AccountItem) => a.balance;
    const openingOf = (a: AccountItem) => a.openingBalance?.amount ?? 0;

    const netWorth = sum(asset, balanceOf) - sum(debt, balanceOf);
    const openings = sum(asset, openingOf) - sum(debt, openingOf);
    const income = sum((a) => a.type === 'INCOME', balanceOf);
    const expense = sum((a) => a.type === 'EXPENSE', balanceOf);
    expect(netWorth - (openings + income - expense)).toBe(0);
    expect(netWorth).toBe(7_880_000); // 78,800.00 THB: transfers move money between Cash accounts, not worth
    const after = Object.fromEntries(items.map((a) => [a.name, a.balance]));
    expect(after['Bank Account']).toBe(7_070_000); // 79,200.00 − 10,000.00 + 1,500.00
    expect(after['Wallet']).toBe(850_000); // 10,000.00 − 1,500.00
  });

  it('TEST-11.5 (AC-11.5): a transfer to the source itself or to an archived Cash account, and a card source with a Cash line, are rejected and save nothing', async () => {
    const savings = await insertAccount(seededUsers.alice.id, { name: 'Savings', type: 'CASH', subtype: 'BANK', isArchived: true });
    await open('Bank Account', 5_000_000);
    const rowsBefore = await countLedgerRows(seededUsers.alice.id);
    const balancesBefore = await balances(aliceToken);

    const cases: Array<[string, () => ReturnType<typeof send>]> = [
      ['Bank Account → itself', () => send(aliceToken, 'PAYMENT', ids['Bank Account'], 10_000, one(ids['Bank Account'], 10_000))],
      ['Bank Account → archived Savings', () => send(aliceToken, 'PAYMENT', ids['Bank Account'], 10_000, one(savings, 10_000))],
      ['Bank Account ← archived Savings', () => send(aliceToken, 'RECEIPT', ids['Bank Account'], 10_000, one(savings, 10_000))],
      ['Credit Card → Wallet', () => send(aliceToken, 'PAYMENT', ids['Credit Card'], 10_000, one(ids['Wallet'], 10_000))],
    ];
    for (const [label, call] of cases) {
      const res = await call();
      expect(res.status, label).toBe(400);
      expect(res.body.error.code, label).toBe('INVALID_TARGET_ACCOUNT');
    }

    expect(await countLedgerRows(seededUsers.alice.id)).toEqual(rowsBefore);
    expect(await balances(aliceToken)).toEqual(balancesBefore);
  });

  it("TEST-11.6 (AC-11.6): a transfer to another user's Cash account is 404, an Administrator 403, an anonymous caller 401, and nothing is saved", async () => {
    const bobIds = await accountIdsByName(seededUsers.bob.id);
    const aliceBefore = await balances(aliceToken);
    const rowsBefore = { alice: await countLedgerRows(seededUsers.alice.id), bob: await countLedgerRows(seededUsers.bob.id) };

    const bob = await send(bobToken, 'PAYMENT', bobIds['Bank Account'], 10_000, one(ids['Wallet'], 10_000));
    expect(bob.status).toBe(404);
    expect(bob.body.error.code).toBe('NOT_FOUND');

    const admin = await send(adminToken, 'PAYMENT', ids['Bank Account'], 10_000, one(ids['Wallet'], 10_000));
    expect(admin.status).toBe(403);
    expect(admin.body.error.code).toBe('FORBIDDEN');

    const anonymous = await send(null, 'PAYMENT', ids['Bank Account'], 10_000, one(ids['Wallet'], 10_000));
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe('UNAUTHENTICATED');

    expect(await balances(aliceToken)).toEqual(aliceBefore);
    expect(await countLedgerRows(seededUsers.alice.id)).toEqual(rowsBefore.alice);
    expect(await countLedgerRows(seededUsers.bob.id)).toEqual(rowsBefore.bob);
  });

  it('TEST-11.7 (AC-11.7): a transfer dated more than 90 days ago (Bangkok) returns 400 DATE_TOO_OLD and saves nothing; today − 90 is accepted', async () => {
    await open('Bank Account', 5_000_000);
    const transfer = (txnDate: string) =>
      send(aliceToken, 'PAYMENT', ids['Bank Account'], 10_000, one(ids['Wallet'], 10_000), txnDate); // 100.00 THB

    const rowsBefore = await countLedgerRows(seededUsers.alice.id);
    const tooOld = await transfer(bangkokDate(-91));
    expect(tooOld.status).toBe(400);
    expect(tooOld.body.error.code).toBe('DATE_TOO_OLD');
    expect(await countLedgerRows(seededUsers.alice.id)).toEqual(rowsBefore);

    const oldest = await transfer(bangkokDate(-90));
    expect(oldest.status).toBe(201);
    expect((await balances(aliceToken))['Wallet']).toBe(10_000);
  });
});
