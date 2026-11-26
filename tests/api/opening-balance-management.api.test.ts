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
const SUMMARY_URL = '/api/v1/summary/income-expense';
const TODAY = bangkokDate(0);
const MONTH_START = `${TODAY.slice(0, 8)}01`;
const PATCH_FIELDS = ['accountId', 'id', 'kind', 'totalAmount', 'txnDate'];
const VOID_FIELDS = ['accountId', 'id', 'kind', 'totalAmount', 'txnDate', 'voidedAt'];

interface AccountItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  openingBalance: { transactionId: string; amount: number; date: string } | null;
}

describe('F-12 Opening Balance Management (STS)', () => {
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
  const openingUrl = (accountId: string) => `${ACCOUNTS_URL}/${accountId}/opening-balance`;
  const correct = (token: string | null, accountId: string, body: object) => as(token).patch(openingUrl(accountId)).send(body);
  const remove = (token: string | null, accountId: string) => as(token).post(`${openingUrl(accountId)}/void`);

  async function accounts(token: string): Promise<Record<string, AccountItem>> {
    const res = await as(token).get(ACCOUNTS_URL);
    expect(res.status).toBe(200);
    return Object.fromEntries((res.body.items as AccountItem[]).map((a) => [a.name, a]));
  }

  /** F-04: record an opening balance that must succeed; returns its transaction id. */
  async function open(token: string, accountId: string, amount: number, date = MONTH_START): Promise<string> {
    const res = await as(token).post(openingUrl(accountId)).send({ amount, date });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body.transaction.id as string;
  }

  const activeOpenings = (accountId: string) =>
    prisma.transaction.count({ where: { accountId, kind: 'OPENING_BALANCE', voidedAt: null } });

  async function salary(amount = 3_000_000) {
    const res = await as(aliceToken)
      .post(TRANSACTIONS_URL)
      .send({ kind: 'RECEIPT', accountId: ids['Bank Account'], txnDate: TODAY, totalAmount: amount, lines: [{ targetAccountId: ids['Salary'], amount }] });
    expect(res.status).toBe(201);
  }

  async function monthSummary() {
    const res = await as(aliceToken).get(`${SUMMARY_URL}?from=${MONTH_START}&to=${TODAY}`);
    expect(res.status).toBe(200);
    return res.body as { income: number; expense: number; net: number };
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

  it('TEST-12.1 (AC-12.1): correcting the amount and then the date keeps the same transaction, moves the balance and leaves the summary unchanged', async () => {
    const openingId = await open(aliceToken, ids['Bank Account'], 5_000_000); // 50,000.00 THB
    await salary(); // 30,000.00 THB
    const before = await prisma.transaction.findUniqueOrThrow({ where: { id: openingId }, select: { updatedAt: true } });

    const amount = await correct(aliceToken, ids['Bank Account'], { amount: 5_500_000 }); // 55,000.00 THB
    expect(amount.status).toBe(200);
    expect(Object.keys(amount.body.transaction).sort()).toEqual(PATCH_FIELDS);
    expect(amount.body.transaction).toMatchObject({
      id: openingId,
      kind: 'OPENING_BALANCE',
      accountId: ids['Bank Account'],
      txnDate: MONTH_START,
      totalAmount: 5_500_000,
    });

    // BR-10 v2.0: an opening balance has no 90-day limit, so T−200 is accepted.
    const oldDate = bangkokDate(-200);
    const date = await correct(aliceToken, ids['Bank Account'], { date: oldDate });
    expect(date.status).toBe(200);
    expect(date.body.transaction).toMatchObject({ id: openingId, txnDate: oldDate, totalAmount: 5_500_000 });

    const bank = (await accounts(aliceToken))['Bank Account'];
    expect(bank.balance).toBe(8_500_000); // 55,000.00 + 30,000.00 THB
    expect(bank.openingBalance).toEqual({ transactionId: openingId, amount: 5_500_000, date: oldDate });
    expect(await activeOpenings(ids['Bank Account'])).toBe(1);
    const after = await prisma.transaction.findUniqueOrThrow({ where: { id: openingId }, select: { updatedAt: true } });
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    expect(await monthSummary()).toMatchObject({ income: 3_000_000, expense: 0, net: 3_000_000 });
  });

  it('TEST-12.2 (AC-12.2): an invalid amount, an empty body or an unknown field is 400 VALIDATION_ERROR, a future date is FUTURE_DATE_NOT_ALLOWED, and nothing changes', async () => {
    const openingId = await open(aliceToken, ids['Bank Account'], 5_000_000);
    // Owner control: a valid correction works, so the rejections below are rule results.
    const control = await correct(aliceToken, ids['Bank Account'], { amount: 5_000_000 });
    expect(control.status).toBe(200);

    for (const body of [{ amount: -1 }, { amount: 10_000_000_001 }, { amount: 12.5 }, {}, { amount: 100, accountId: 'x' }]) {
      const res = await correct(aliceToken, ids['Bank Account'], body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code, JSON.stringify(body)).toBe('VALIDATION_ERROR');
    }
    const future = await correct(aliceToken, ids['Bank Account'], { date: bangkokDate(1) });
    expect(future.status).toBe(400);
    expect(future.body.error.code).toBe('FUTURE_DATE_NOT_ALLOWED');

    expect((await accounts(aliceToken))['Bank Account'].openingBalance).toEqual({
      transactionId: openingId,
      amount: 5_000_000,
      date: MONTH_START,
    });
  });

  it('TEST-12.3 (AC-12.3): removing an opening balance voids it, the balance drops it, and a new one can then be recorded', async () => {
    const openingId = await open(aliceToken, ids['Bank Account'], 5_000_000);
    await salary();
    expect((await correct(aliceToken, ids['Bank Account'], { amount: 5_500_000 })).status).toBe(200);

    const res = await remove(aliceToken, ids['Bank Account']);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.transaction).sort()).toEqual(VOID_FIELDS);
    expect(res.body.transaction).toMatchObject({ id: openingId, kind: 'OPENING_BALANCE', totalAmount: 5_500_000 });
    expect(new Date(res.body.transaction.voidedAt).toISOString()).toBe(res.body.transaction.voidedAt);

    // D-04: the row is voided, never deleted.
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: openingId }, select: { voidedAt: true } });
    expect(stored.voidedAt).not.toBeNull();
    const bank = (await accounts(aliceToken))['Bank Account'];
    expect(bank.balance).toBe(3_000_000); // only the 30,000.00 THB salary
    expect(bank.openingBalance).toBeNull();

    const reopened = await open(aliceToken, ids['Bank Account'], 1_000_000, TODAY); // 10,000.00 THB
    expect(reopened).not.toBe(openingId);
    expect((await accounts(aliceToken))['Bank Account'].balance).toBe(4_000_000);
    expect(await activeOpenings(ids['Bank Account'])).toBe(1);
  });

  it('TEST-12.4 (AC-12.4): correcting or removing where there is no active opening balance is 404 NOT_FOUND and changes nothing', async () => {
    await open(aliceToken, ids['Bank Account'], 5_000_000);
    // Owner control: the endpoints exist and work on an account that has one.
    expect((await remove(aliceToken, ids['Bank Account'])).status).toBe(200);
    const rowsBefore = await countLedgerRows(seededUsers.alice.id);

    const cases: Array<[string, () => ReturnType<typeof remove>]> = [
      ['PATCH Wallet (never set)', () => correct(aliceToken, ids['Wallet'], { amount: 100 })],
      ['void Wallet (never set)', () => remove(aliceToken, ids['Wallet'])],
      ['void Bank Account again (already removed)', () => remove(aliceToken, ids['Bank Account'])],
      ['PATCH Salary (Income account)', () => correct(aliceToken, ids['Salary'], { amount: 100 })],
    ];
    for (const [label, call] of cases) {
      const res = await call();
      expect(res.status, label).toBe(404);
      expect(res.body.error.code, label).toBe('NOT_FOUND');
      expect(res.body, label).not.toHaveProperty('transaction');
    }
    expect(await countLedgerRows(seededUsers.alice.id)).toEqual(rowsBefore);
    expect(await activeOpenings(ids['Bank Account'])).toBe(0);
  });

  it('TEST-12.5 (AC-12.5): correcting or removing the opening balance of an archived account is 400 VALIDATION_ERROR and changes nothing', async () => {
    const openingId = await open(aliceToken, ids['Wallet'], 100_000); // 1,000.00 THB
    // Archived directly in the database (F-12 does not depend on F-09).
    await prisma.account.update({ where: { id: ids['Wallet'] }, data: { isArchived: true } });

    const patch = await correct(aliceToken, ids['Wallet'], { amount: 200_000 });
    expect(patch.status).toBe(400);
    expect(patch.body.error.code).toBe('VALIDATION_ERROR');
    const voided = await remove(aliceToken, ids['Wallet']);
    expect(voided.status).toBe(400);
    expect(voided.body.error.code).toBe('VALIDATION_ERROR');

    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: openingId }, select: { totalAmount: true, voidedAt: true } });
    expect(stored).toEqual({ totalAmount: 100_000n, voidedAt: null });

    // Control: once unarchived, the same correction is accepted.
    await prisma.account.update({ where: { id: ids['Wallet'] }, data: { isArchived: false } });
    expect((await correct(aliceToken, ids['Wallet'], { amount: 200_000 })).status).toBe(200);
  });

  it("TEST-12.6 (AC-12.6): another user's account is 404, an Administrator 403, an anonymous caller 401, and the opening balance is unchanged", async () => {
    const openingId = await open(aliceToken, ids['Bank Account'], 5_000_000);
    // Owner control: Alice herself can correct it, so Bob's 404 is an ownership result.
    expect((await correct(aliceToken, ids['Bank Account'], { amount: 5_000_000 })).status).toBe(200);

    for (const [label, token, status, code] of [
      ['Bob', bobToken, 404, 'NOT_FOUND'],
      ['Admin', adminToken, 403, 'FORBIDDEN'],
      ['anonymous', null, 401, 'UNAUTHENTICATED'],
    ] as const) {
      const patch = await correct(token, ids['Bank Account'], { amount: 1 });
      expect(patch.status, `${label} PATCH`).toBe(status);
      expect(patch.body.error.code, `${label} PATCH`).toBe(code);
      const voided = await remove(token, ids['Bank Account']);
      expect(voided.status, `${label} void`).toBe(status);
      expect(voided.body.error.code, `${label} void`).toBe(code);
    }

    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: openingId }, select: { totalAmount: true, voidedAt: true } });
    expect(stored).toEqual({ totalAmount: 5_000_000n, voidedAt: null });
  });

  it('two parallel removes of the same opening balance give one 200 and one 404 (f-12 §5)', async () => {
    await open(aliceToken, ids['Bank Account'], 5_000_000);

    const results = await Promise.all([remove(aliceToken, ids['Bank Account']), remove(aliceToken, ids['Bank Account'])]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 404]);
    expect(await activeOpenings(ids['Bank Account'])).toBe(0);
  });

  it('the NFR-03 invariant holds after a corrected and a removed opening balance (f-12 §5)', async () => {
    await open(aliceToken, ids['Bank Account'], 5_000_000);
    await open(aliceToken, ids['Wallet'], 200_000);
    await open(aliceToken, ids['Credit Card'], 40_000); // opening card debt 400.00 THB
    await salary();
    expect((await correct(aliceToken, ids['Bank Account'], { amount: 4_500_000 })).status).toBe(200); // corrected
    expect((await remove(aliceToken, ids['Wallet'])).status).toBe(200); // removed

    const items = Object.values(await accounts(aliceToken));
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
    expect(openings).toBe(4_460_000); // 45,000.00 − 400.00 THB; the removed Wallet opening is gone
    expect(netWorth - (openings + income - expense)).toBe(0);
    expect(netWorth).toBe(7_460_000); // 45,000.00 + 30,000.00 − 400.00 THB
  });
});
