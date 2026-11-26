import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/app.js';
import { prisma } from '../../server/src/prisma.js';
import { resetDatabase, createTestSession } from '../helpers/db.helper.js';
import { clearRateLimitStore } from '../../server/src/middleware/rate-limit.middleware.js';
import { accountIdsByName, bangkokDate, countLedgerRows } from '../helpers/ledger.helper.js';

// State-changing requests must carry an Origin (NFR-10); act as the Vite dev origin.
const TEST_ORIGIN = 'http://localhost:3000';
const ACCOUNTS_URL = '/api/v1/accounts';
const TRANSACTIONS_URL = '/api/v1/transactions';
const LOANS_URL = '/api/v1/loans';
const SUMMARY_URL = '/api/v1/summary/income-expense';
// Today in Bangkok, so every row is inside the BR-10 window and inside this month's summary.
const TODAY = bangkokDate(0);
const MONTH_START = `${TODAY.slice(0, 8)}01`;

interface AccountItem {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  isArchived: boolean;
  balance: number;
  openingBalance: { amount: number } | null;
}

interface LoanItem {
  id: string;
  name: string;
  subtype: string | null;
  isArchived: boolean;
  balance: number;
}

interface Line {
  targetAccountId: string;
  amount: number;
}

describe('F-10 Loans (STS)', () => {
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
      patch: (url: string) => request(app).patch(url).set('Origin', TEST_ORIGIN).set('Cookie', cookie),
    };
  };

  async function balances(token: string): Promise<Record<string, number>> {
    const res = await as(token).get(ACCOUNTS_URL);
    expect(res.status).toBe(200);
    return Object.fromEntries((res.body.items as AccountItem[]).map((a) => [a.name, a.balance]));
  }

  /** F-09: every loan account in these tests is created through the API. */
  async function createAccount(token: string, name: string, type: string, subtype?: string): Promise<string> {
    const res = await as(token).post(ACCOUNTS_URL).send({ name, type, ...(subtype ? { subtype } : {}) });
    expect(res.status, name).toBe(201);
    return res.body.account.id as string;
  }

  async function archive(token: string, accountId: string) {
    const res = await as(token).patch(`${ACCOUNTS_URL}/${accountId}`).send({ isArchived: true });
    expect(res.status).toBe(200);
  }

  const send = (token: string, kind: 'PAYMENT' | 'RECEIPT', accountId: string, totalAmount: number, lines: Line[]) =>
    as(token).post(TRANSACTIONS_URL).send({ kind, accountId, txnDate: TODAY, totalAmount, lines });

  /** POST a transaction that must succeed. */
  async function record(kind: 'PAYMENT' | 'RECEIPT', accountId: string, totalAmount: number, lines: Line[]) {
    const res = await send(aliceToken, kind, accountId, totalAmount, lines);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res;
  }

  const one = (targetAccountId: string, amount: number): Line[] => [{ targetAccountId, amount }];

  async function openBank(amount = 5_000_000) {
    const res = await as(aliceToken)
      .post(`${ACCOUNTS_URL}/${ids['Bank Account']}/opening-balance`)
      .send({ amount, date: MONTH_START });
    expect(res.status).toBe(201);
  }

  /** TEST-10.1 to TEST-10.4 in order, from Bank Account opening 50,000.00 THB. */
  async function lendRepayBorrowRepay() {
    await record('PAYMENT', ids['Bank Account'], 200_000, one(ids['Loan to Bob'], 200_000)); // lend 2,000.00
    await record('RECEIPT', ids['Bank Account'], 50_000, one(ids['Loan to Bob'], 50_000)); // repaid 500.00
    await record('RECEIPT', ids['Wallet'], 500_000, one(ids['Loan from Mom'], 500_000)); // borrow 5,000.00
    await record('RECEIPT', ids['Bank Account'], 30_000, one(ids['Credit Card'], 30_000)); // card cash advance 300.00
    await record('PAYMENT', ids['Wallet'], 100_000, one(ids['Loan from Mom'], 100_000)); // repay 1,000.00
  }

  beforeEach(async () => {
    await clearRateLimitStore();
    seededUsers = await resetDatabase();
    aliceToken = await createTestSession(seededUsers.alice.id);
    bobToken = await createTestSession(seededUsers.bob.id);
    adminToken = await createTestSession(seededUsers.admin.id);
    ids = await accountIdsByName(seededUsers.alice.id);
    ids['Loan to Bob'] = await createAccount(aliceToken, 'Loan to Bob', 'LOAN_GIVEN');
    ids['Loan from Mom'] = await createAccount(aliceToken, 'Loan from Mom', 'LOAN_TAKEN', 'OTHER');
    await openBank();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('TEST-10.1 (AC-10.1): a Cash Payment to a Loan Given account lends money: Cash falls and the amount owed rises', async () => {
    await record('PAYMENT', ids['Bank Account'], 200_000, one(ids['Loan to Bob'], 200_000));

    const after = await balances(aliceToken);
    expect(after['Bank Account']).toBe(4_800_000); // 48,000.00 THB
    expect(after['Loan to Bob']).toBe(200_000); // 2,000.00 THB owed to Alice
  });

  it('TEST-10.2 (AC-10.2): a Cash Receipt from a Loan Given account is a repayment received: Cash rises and the amount owed falls', async () => {
    await record('PAYMENT', ids['Bank Account'], 200_000, one(ids['Loan to Bob'], 200_000));
    await record('RECEIPT', ids['Bank Account'], 50_000, one(ids['Loan to Bob'], 50_000));

    const after = await balances(aliceToken);
    expect(after['Bank Account']).toBe(4_850_000); // 48,500.00 THB
    expect(after['Loan to Bob']).toBe(150_000); // 1,500.00 THB
  });

  it('TEST-10.3 (AC-10.3): a Cash Receipt from a Loan Taken account (a personal loan or a credit card) is borrowing: Cash and the debt both rise', async () => {
    const before = await balances(aliceToken);
    expect(before['Wallet']).toBe(0);
    expect(before['Credit Card']).toBe(0);

    await record('RECEIPT', ids['Wallet'], 500_000, one(ids['Loan from Mom'], 500_000));
    await record('RECEIPT', ids['Bank Account'], 30_000, one(ids['Credit Card'], 30_000));

    const after = await balances(aliceToken);
    expect(after['Wallet']).toBe(500_000); // 5,000.00 THB
    expect(after['Loan from Mom']).toBe(500_000); // 5,000.00 THB debt
    expect(after['Credit Card']).toBe(30_000); // 300.00 THB debt
    expect(after['Bank Account']).toBe(5_030_000); // 50,300.00 THB
  });

  it('TEST-10.4 (AC-10.4): a Cash Payment to a non-card Loan Taken account repays it and reduces the debt', async () => {
    await record('RECEIPT', ids['Wallet'], 500_000, one(ids['Loan from Mom'], 500_000));
    await record('PAYMENT', ids['Wallet'], 100_000, one(ids['Loan from Mom'], 100_000));

    const after = await balances(aliceToken);
    expect(after['Wallet']).toBe(400_000); // 4,000.00 THB
    expect(after['Loan from Mom']).toBe(400_000); // 4,000.00 THB debt
  });

  it('TEST-10.5 (AC-10.5): lending, borrowing and repayments leave the income/expense summary unchanged and the ledger invariant holds', async () => {
    // The Sprint 1 journey: salary 30,000.00; card charge 1,200.00 (Dining 700.00 + Groceries 500.00); repayment 800.00.
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
    const journeyOnly = await summaryOf();
    expect(journeyOnly).toMatchObject({ income: 3_000_000, expense: 120_000, net: 2_880_000 });

    await lendRepayBorrowRepay();

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
    expect(netWorth).toBe(7_880_000); // 50,000 + 30,000 − 1,200 = 78,800.00 THB: loans moved money, not worth
  });

  it("TEST-10.6 (AC-10.6): card lending, archived loan targets, Loan Given sources, Expense/Income on the wrong form and another user's loan account are rejected and save nothing", async () => {
    const oldLoan = await createAccount(aliceToken, 'Old loan', 'LOAN_GIVEN');
    await archive(aliceToken, oldLoan);
    const bobIds = await accountIdsByName(seededUsers.bob.id);
    const aliceBefore = { rows: await countLedgerRows(seededUsers.alice.id), balances: await balances(aliceToken) };
    const bobBefore = { rows: await countLedgerRows(seededUsers.bob.id), balances: await balances(bobToken) };

    const cases: Array<[string, () => ReturnType<typeof send>, number, string]> = [
      ['card → Loan Given', () => send(aliceToken, 'PAYMENT', ids['Credit Card'], 10_000, one(ids['Loan to Bob'], 10_000)), 400, 'INVALID_TARGET_ACCOUNT'],
      ['card → Cash', () => send(aliceToken, 'PAYMENT', ids['Credit Card'], 10_000, one(ids['Wallet'], 10_000)), 400, 'INVALID_TARGET_ACCOUNT'],
      ['Cash → archived Loan Given', () => send(aliceToken, 'PAYMENT', ids['Bank Account'], 10_000, one(oldLoan, 10_000)), 400, 'INVALID_TARGET_ACCOUNT'],
      ['Payment from Loan Given', () => send(aliceToken, 'PAYMENT', ids['Loan to Bob'], 10_000, one(ids['Dining'], 10_000)), 400, 'INVALID_SOURCE_ACCOUNT'],
      ['Receipt into Loan Given', () => send(aliceToken, 'RECEIPT', ids['Loan to Bob'], 10_000, one(ids['Salary'], 10_000)), 400, 'INVALID_SOURCE_ACCOUNT'],
      ['Receipt line to Expense', () => send(aliceToken, 'RECEIPT', ids['Bank Account'], 10_000, one(ids['Dining'], 10_000)), 400, 'INVALID_TARGET_ACCOUNT'],
      ['Payment line to Income', () => send(aliceToken, 'PAYMENT', ids['Bank Account'], 10_000, one(ids['Salary'], 10_000)), 400, 'INVALID_TARGET_ACCOUNT'],
      ["Bob → Alice's Loan Given", () => send(bobToken, 'PAYMENT', bobIds['Bank Account'], 10_000, one(ids['Loan to Bob'], 10_000)), 404, 'NOT_FOUND'],
    ];
    for (const [label, call, status, code] of cases) {
      const res = await call();
      expect(res.status, label).toBe(status);
      expect(res.body.error.code, label).toBe(code);
    }

    expect(await countLedgerRows(seededUsers.alice.id)).toEqual(aliceBefore.rows);
    expect(await balances(aliceToken)).toEqual(aliceBefore.balances);
    expect(await countLedgerRows(seededUsers.bob.id)).toEqual(bobBefore.rows);
    expect(await balances(bobToken)).toEqual(bobBefore.balances);
  });

  it('TEST-10.7 (AC-10.7): receiving more than is owed on a Loan Given account is accepted and the balance goes negative (D-02)', async () => {
    await record('PAYMENT', ids['Bank Account'], 200_000, one(ids['Loan to Bob'], 200_000));
    await record('RECEIPT', ids['Bank Account'], 50_000, one(ids['Loan to Bob'], 50_000));
    expect((await balances(aliceToken))['Loan to Bob']).toBe(150_000);

    await record('RECEIPT', ids['Bank Account'], 200_000, one(ids['Loan to Bob'], 200_000));

    expect((await balances(aliceToken))['Loan to Bob']).toBe(-50_000); // −500.00 THB
  });

  it("TEST-10.8 (AC-10.8): GET /loans lists the caller's loans owed to and by them with totals, omits archived zero balances, and is User-only", async () => {
    await lendRepayBorrowRepay();
    const oldLoan = await createAccount(aliceToken, 'Old loan', 'LOAN_GIVEN');
    await archive(aliceToken, oldLoan); // archived with 0: omitted
    const closedCard = await createAccount(aliceToken, 'Closed card', 'LOAN_TAKEN', 'CREDIT_CARD');
    await record('PAYMENT', closedCard, 10_000, one(ids['Dining'], 10_000)); // 100.00 THB charge
    await archive(aliceToken, closedCard); // archived with 10,000: still listed
    const bobLoan = await createAccount(bobToken, 'Loan to Carol', 'LOAN_GIVEN');

    const alice = await as(aliceToken).get(LOANS_URL);
    expect(alice.status).toBe(200);
    expect(Object.keys(alice.body).sort()).toEqual(['owedByMe', 'owedToMe']);
    const owedToMe = alice.body.owedToMe as { items: LoanItem[]; total: number };
    const owedByMe = alice.body.owedByMe as { items: LoanItem[]; total: number };

    expect(owedToMe.items).toEqual([
      { id: ids['Loan to Bob'], name: 'Loan to Bob', subtype: null, isArchived: false, balance: 150_000 },
    ]);
    expect(owedToMe.total).toBe(150_000);
    expect(owedByMe.items).toEqual([
      { id: closedCard, name: 'Closed card', subtype: 'CREDIT_CARD', isArchived: true, balance: 10_000 },
      { id: ids['Credit Card'], name: 'Credit Card', subtype: 'CREDIT_CARD', isArchived: false, balance: 30_000 },
      { id: ids['Loan from Mom'], name: 'Loan from Mom', subtype: 'OTHER', isArchived: false, balance: 400_000 },
    ]);
    expect(owedByMe.total).toBe(440_000); // 4,400.00 THB
    const aliceIds = [...owedToMe.items, ...owedByMe.items].map((item) => item.id);
    expect(aliceIds).not.toContain(oldLoan);
    expect(aliceIds).not.toContain(bobLoan);

    // Bob sees only his own accounts: his new loan and his seeded card.
    const bob = await as(bobToken).get(LOANS_URL);
    expect(bob.status).toBe(200);
    expect(bob.body.owedToMe.items.map((item: LoanItem) => item.id)).toEqual([bobLoan]);
    const bobIds = new Set(Object.values(await accountIdsByName(seededUsers.bob.id)));
    for (const item of [...bob.body.owedToMe.items, ...bob.body.owedByMe.items] as LoanItem[]) {
      expect(bobIds.has(item.id), item.name).toBe(true);
    }

    const admin = await as(adminToken).get(LOANS_URL);
    expect(admin.status).toBe(403);
    expect(admin.body.error.code).toBe('FORBIDDEN');
    expect(admin.body).not.toHaveProperty('owedToMe');

    const anonymous = await as(null).get(LOANS_URL);
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe('UNAUTHENTICATED');
  });
});
