import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/app.js';
import { prisma } from '../../server/src/prisma.js';
import { resetDatabase, createTestSession } from '../helpers/db.helper.js';
import { clearRateLimitStore } from '../../server/src/middleware/rate-limit.middleware.js';
import { accountIdsByName, bangkokDate, insertTransaction } from '../helpers/ledger.helper.js';

// State-changing requests must carry an Origin (NFR-10); act as the Vite dev origin.
const TEST_ORIGIN = 'http://localhost:3000';
const ACCOUNTS_URL = '/api/v1/accounts';
const TRANSACTIONS_URL = '/api/v1/transactions';
const SUMMARY_URL = '/api/v1/summary/income-expense';
const LOANS_URL = '/api/v1/loans';
// Today in Bangkok, so the starting state is inside the BR-10 window and this month's summary.
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
  note?: string;
}

interface EditBody {
  accountId: string;
  txnDate: string;
  totalAmount: number;
  memo?: string;
  lines: Line[];
  [extra: string]: unknown;
}

describe('F-13 Edit and void transactions (STS)', () => {
  let seededUsers: Awaited<ReturnType<typeof resetDatabase>>;
  let aliceToken: string;
  let bobToken: string;
  let adminToken: string;
  let ids: Record<string, string>;
  /** The starting state's transaction ids (f-13 §4). */
  let journey: { opening: string; salary: string; charge: string; repayment: string };

  const as = (token: string | null) => {
    const cookie = token ? [`sid=${token}`] : [];
    return {
      get: (url: string) => request(app).get(url).set('Origin', TEST_ORIGIN).set('Cookie', cookie),
      post: (url: string) => request(app).post(url).set('Origin', TEST_ORIGIN).set('Cookie', cookie),
      patch: (url: string) => request(app).patch(url).set('Origin', TEST_ORIGIN).set('Cookie', cookie),
    };
  };

  const edit = (token: string | null, id: string, body: EditBody) => as(token).patch(`${TRANSACTIONS_URL}/${id}`).send(body);
  const voidTxn = (token: string | null, id: string) => as(token).post(`${TRANSACTIONS_URL}/${id}/void`);

  async function balances(): Promise<Record<string, number>> {
    const res = await as(aliceToken).get(ACCOUNTS_URL);
    expect(res.status).toBe(200);
    return Object.fromEntries((res.body.items as AccountItem[]).map((a) => [a.name, a.balance]));
  }

  async function summary() {
    const res = await as(aliceToken).get(`${SUMMARY_URL}?from=${MONTH_START}&to=${TODAY}`);
    expect(res.status).toBe(200);
    return res.body as { income: number; expense: number; net: number };
  }

  async function detail(id: string) {
    const res = await as(aliceToken).get(`${TRANSACTIONS_URL}/${id}`);
    expect(res.status).toBe(200);
    return res.body.transaction;
  }

  /** The stored row and its lines, to show that a rejected request changed nothing. */
  async function snapshot(id: string) {
    return prisma.transaction.findUniqueOrThrow({
      where: { id },
      select: {
        accountId: true,
        txnDate: true,
        totalAmount: true,
        memo: true,
        voidedAt: true,
        updatedAt: true,
        lines: { orderBy: { lineNo: 'asc' }, select: { id: true, targetAccountId: true, amount: true, lineNo: true } },
      },
    });
  }

  /** POST a transaction as Alice that must succeed; returns its id. */
  async function record(kind: 'PAYMENT' | 'RECEIPT', accountId: string, totalAmount: number, lines: Line[], txnDate = TODAY) {
    const res = await as(aliceToken).post(TRANSACTIONS_URL).send({ kind, accountId, txnDate, totalAmount, lines });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return res.body.transaction.id as string;
  }

  async function open(account: string, amount: number): Promise<string> {
    const res = await as(aliceToken).post(`${ACCOUNTS_URL}/${ids[account]}/opening-balance`).send({ amount, date: MONTH_START });
    expect(res.status).toBe(201);
    return res.body.transaction.id as string;
  }

  /** The card charge's 1.0 body: Credit Card 1,200.00 THB, Dining 700.00 + Groceries 500.00. */
  const chargeBody = (): EditBody => ({
    accountId: ids['Credit Card'],
    txnDate: TODAY,
    totalAmount: 120_000,
    lines: [
      { targetAccountId: ids['Dining'], amount: 70_000 },
      { targetAccountId: ids['Groceries'], amount: 50_000 },
    ],
  });

  /** f-13 §4 starting state: Alice after the Sprint 1 journey. Bank 7,920,000 satang; card debt 40,000. */
  async function startingState() {
    const opening = await open('Bank Account', 5_000_000); // 50,000.00 THB
    const salary = await record('RECEIPT', ids['Bank Account'], 3_000_000, [{ targetAccountId: ids['Salary'], amount: 3_000_000 }]);
    const charge = await record('PAYMENT', ids['Credit Card'], 120_000, chargeBody().lines);
    const repayment = await record('PAYMENT', ids['Bank Account'], 80_000, [{ targetAccountId: ids['Credit Card'], amount: 80_000 }]);
    journey = { opening, salary, charge, repayment };
    const start = await balances();
    expect(start['Bank Account']).toBe(7_920_000);
    expect(start['Credit Card']).toBe(40_000);
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

  it('TEST-13.1 (AC-13.1): editing a card charge’s lines and total keeps its id, sets a later updatedAt and recalculates the debt, the expenses and the summary', async () => {
    await startingState();
    const before = await snapshot(journey.charge);

    const res = await edit(aliceToken, journey.charge, {
      ...chargeBody(),
      totalAmount: 140_000, // 1,400.00 THB
      lines: [
        { targetAccountId: ids['Dining'], amount: 90_000 }, // 900.00 THB
        { targetAccountId: ids['Groceries'], amount: 50_000 },
      ],
    });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.transaction).toMatchObject({ id: journey.charge, kind: 'PAYMENT', totalAmount: 140_000 });
    expect(new Date(res.body.transaction.updatedAt).getTime()).toBeGreaterThan(before.updatedAt.getTime());
    const after = await balances();
    expect(after['Credit Card']).toBe(60_000); // 40,000 + 20,000 more charged
    expect(after['Dining']).toBe(90_000);
    expect(after['Groceries']).toBe(50_000);
    expect((await summary()).expense).toBe(140_000);
  });

  it('TEST-13.2 (AC-13.2): editing a Payment’s source, date and memo restores the old source, moves the new one and replaces the lines', async () => {
    await startingState();
    await open('Wallet', 100_000); // 1,000.00 THB
    const oldLineIds = (await snapshot(journey.repayment)).lines.map((l) => l.id);
    // The 2nd of the month; on the 1st or 2nd, yesterday, so the date always changes and is never in the future.
    const second = `${TODAY.slice(0, 8)}02`;
    const newDate = TODAY > second ? second : bangkokDate(-1);

    const res = await edit(aliceToken, journey.repayment, {
      accountId: ids['Wallet'],
      txnDate: newDate,
      totalAmount: 80_000,
      memo: 'moved',
      lines: [{ targetAccountId: ids['Credit Card'], amount: 80_000 }],
    });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.transaction).toMatchObject({ id: journey.repayment, accountId: ids['Wallet'], txnDate: newDate, memo: 'moved' });
    const after = await balances();
    expect(after['Bank Account']).toBe(8_000_000); // 800.00 THB back on the old source
    expect(after['Wallet']).toBe(20_000); // 1,000.00 − 800.00 THB
    expect(after['Credit Card']).toBe(40_000);
    const shown = await detail(journey.repayment);
    expect(shown.memo).toBe('moved');
    expect(shown.lines).toHaveLength(1);
    expect(oldLineIds).not.toContain(shown.lines[0].id);
  });

  it('TEST-13.3 (AC-13.3): an edit that breaks a create-time rule returns that rule’s error and changes nothing', async () => {
    await startingState();
    // Archived directly in the database (F-13 does not depend on F-09).
    await prisma.account.update({ where: { id: ids['Telecom'] }, data: { isArchived: true } });
    const before = await snapshot(journey.charge);
    const balancesBefore = await balances();
    const base = chargeBody();

    const cases: Array<[string, EditBody, string]> = [
      ['lines summing to 1,000.00 of 1,200.00', { ...base, lines: [{ targetAccountId: ids['Dining'], amount: 100_000 }] }, 'INVALID_ALLOCATION_SUM'],
      ['a line to Salary', { ...base, lines: [{ targetAccountId: ids['Salary'], amount: 120_000 }] }, 'INVALID_TARGET_ACCOUNT'],
      ['source Salary', { ...base, accountId: ids['Salary'] }, 'INVALID_SOURCE_ACCOUNT'],
      ["tomorrow's date", { ...base, txnDate: bangkokDate(1) }, 'FUTURE_DATE_NOT_ALLOWED'],
      ['date T−91', { ...base, txnDate: bangkokDate(-91) }, 'DATE_TOO_OLD'],
      [
        'a new line to the archived Telecom',
        { ...base, lines: [base.lines[0], { targetAccountId: ids['Telecom'], amount: 50_000 }] },
        'INVALID_TARGET_ACCOUNT',
      ],
      ['a body with kind', { ...base, kind: 'RECEIPT' }, 'VALIDATION_ERROR'],
    ];

    for (const [label, body, code] of cases) {
      const res = await edit(aliceToken, journey.charge, body);
      expect(res.status, label).toBe(400);
      expect(res.body.error.code, label).toBe(code);
      expect(await snapshot(journey.charge), label).toEqual(before);
    }
    expect(await balances()).toEqual(balancesBefore);
  });

  it('TEST-13.4 (AC-13.4): an unchanged old date and a target archived after saving may stay; a changed old date or an archived account in a new role is rejected', async () => {
    const userId = seededUsers.alice.id;
    // An old row saved before BR-10 v2.0, inserted through Prisma.
    const old = await insertTransaction(userId, {
      kind: 'PAYMENT',
      accountId: ids['Bank Account'],
      date: bangkokDate(-120),
      total: 10_000, // 100.00 THB
      lines: [{ targetAccountId: ids['Telecom'], amount: 10_000 }],
    });
    const electricity = await record('PAYMENT', ids['Bank Account'], 5_000, [{ targetAccountId: ids['Electricity'], amount: 5_000 }]);
    await prisma.account.update({ where: { id: ids['Electricity'] }, data: { isArchived: true } });

    const oldBody: EditBody = {
      accountId: ids['Bank Account'],
      txnDate: bangkokDate(-120),
      totalAmount: 12_000, // 120.00 THB
      memo: 'old',
      lines: [{ targetAccountId: ids['Telecom'], amount: 12_000 }],
    };
    const keepDate = await edit(aliceToken, old.id, oldBody);
    expect(keepDate.status, JSON.stringify(keepDate.body)).toBe(200);
    expect((await balances())['Telecom']).toBe(12_000);

    const afterFirst = await snapshot(old.id);
    const moveDate = await edit(aliceToken, old.id, { ...oldBody, txnDate: bangkokDate(-100) });
    expect(moveDate.status).toBe(400);
    expect(moveDate.body.error.code).toBe('DATE_TOO_OLD');
    expect(await snapshot(old.id)).toEqual(afterFirst);

    const electricityBody: EditBody = {
      accountId: ids['Bank Account'],
      txnDate: TODAY,
      totalAmount: 5_000,
      memo: 'kept',
      lines: [{ targetAccountId: ids['Electricity'], amount: 5_000 }],
    };
    const keepTarget = await edit(aliceToken, electricity, electricityBody);
    expect(keepTarget.status, JSON.stringify(keepTarget.body)).toBe(200);

    const afterKeep = await snapshot(electricity);
    const newRole = await edit(aliceToken, electricity, { ...electricityBody, accountId: ids['Electricity'] });
    expect(newRole.status).toBe(400);
    expect(newRole.body.error.code).toBe('VALIDATION_ERROR'); // archived source (BR-14)
    expect(await snapshot(electricity)).toEqual(afterKeep);
  });

  it('TEST-13.5 (AC-13.5): a voided transaction leaves balances, the summary and loans, and stays in history marked as voided', async () => {
    await startingState();

    const res = await voidTxn(aliceToken, journey.repayment);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.transaction).toMatchObject({ id: journey.repayment, kind: 'PAYMENT', totalAmount: 80_000 });
    expect(Number.isNaN(Date.parse(res.body.transaction.voidedAt))).toBe(false);
    const after = await balances();
    expect(after['Bank Account']).toBe(8_000_000);
    expect(after['Credit Card']).toBe(120_000); // the repayment no longer counts
    expect(await summary()).toMatchObject({ income: 3_000_000, expense: 120_000 });
    const loans = await as(aliceToken).get(LOANS_URL);
    expect(loans.body.owedByMe.total).toBe(120_000);

    const history = await as(aliceToken).get(TRANSACTIONS_URL);
    expect(history.body.total).toBe(4);
    const listed = (history.body.items as Array<{ id: string; voidedAt: string | null }>).find((t) => t.id === journey.repayment);
    expect(listed?.voidedAt).toBe(res.body.transaction.voidedAt);
    expect((await detail(journey.repayment)).voidedAt).toBe(res.body.transaction.voidedAt);
  });

  it('TEST-13.6 (AC-13.6): editing or voiding a voided transaction is 409 and changes nothing; two concurrent voids give one 200 and one 409', async () => {
    await startingState();
    expect((await voidTxn(aliceToken, journey.repayment)).status).toBe(200);
    const voided = await snapshot(journey.repayment);

    const patch = await edit(aliceToken, journey.repayment, {
      accountId: ids['Bank Account'],
      txnDate: TODAY,
      totalAmount: 90_000,
      lines: [{ targetAccountId: ids['Credit Card'], amount: 90_000 }],
    });
    expect(patch.status).toBe(409);
    expect(patch.body.error.code).toBe('TRANSACTION_VOIDED');
    const again = await voidTxn(aliceToken, journey.repayment);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('TRANSACTION_VOIDED');
    expect(await snapshot(journey.repayment)).toEqual(voided);

    const second = await record('PAYMENT', ids['Bank Account'], 10_000, [{ targetAccountId: ids['Dining'], amount: 10_000 }]);
    const parallel = await Promise.all([voidTxn(aliceToken, second), voidTxn(aliceToken, second)]);
    expect(parallel.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(parallel.find((r) => r.status === 409)?.body.error.code).toBe('TRANSACTION_VOIDED');
  });

  it('TEST-13.7 (AC-13.7): an opening balance cannot be edited or voided through these endpoints', async () => {
    await startingState();
    const before = await snapshot(journey.opening);

    const patch = await edit(aliceToken, journey.opening, {
      accountId: ids['Bank Account'],
      txnDate: MONTH_START,
      totalAmount: 6_000_000,
      lines: [{ targetAccountId: ids['Salary'], amount: 6_000_000 }],
    });
    const voided = await voidTxn(aliceToken, journey.opening);

    for (const res of [patch, voided]) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].issue).toBe('opening balances are changed on the account');
    }
    expect(await snapshot(journey.opening)).toEqual(before);
    expect(before.voidedAt).toBeNull();
  });

  it('TEST-13.8 (AC-13.8): another user gets 404, an Administrator 403 and an anonymous caller 401, and the charge is unchanged', async () => {
    await startingState();
    const before = await snapshot(journey.charge);
    const body = { ...chargeBody(), memo: 'not yours' };

    const cases: Array<[string, string | null, number, string]> = [
      ['Bob', bobToken, 404, 'NOT_FOUND'],
      ['Admin', adminToken, 403, 'FORBIDDEN'],
      ['anonymous', null, 401, 'UNAUTHENTICATED'],
    ];
    for (const [who, token, status, code] of cases) {
      const patch = await edit(token, journey.charge, body);
      const voided = await voidTxn(token, journey.charge);
      for (const res of [patch, voided]) {
        expect(res.status, who).toBe(status);
        expect(res.body.error.code, who).toBe(code);
      }
    }
    expect(await snapshot(journey.charge)).toEqual(before);
  });

  it('TEST-13.9 (AC-13.9): after an edit and a void the NFR-03 invariant holds to the satang', async () => {
    await startingState();
    const edited = await edit(aliceToken, journey.charge, {
      ...chargeBody(),
      totalAmount: 140_000,
      lines: [
        { targetAccountId: ids['Dining'], amount: 90_000 },
        { targetAccountId: ids['Groceries'], amount: 50_000 },
      ],
    });
    expect(edited.status).toBe(200);
    expect((await voidTxn(aliceToken, journey.repayment)).status).toBe(200);

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
    expect(netWorth).toBe(7_860_000); // 8,000,000 − 140,000 satang
    expect(openings + income - expense).toBe(7_860_000); // 5,000,000 + 3,000,000 − 140,000
    expect(netWorth - (openings + income - expense)).toBe(0);
  });

  it('f-13 1.1 §1: a new transaction has updatedAt equal to createdAt, an edit moves updatedAt, and a void leaves it unchanged', async () => {
    await startingState();
    const fresh = await detail(journey.charge);
    expect(fresh.updatedAt).toBe(fresh.createdAt);

    expect((await edit(aliceToken, journey.charge, { ...chargeBody(), memo: 'edited' })).status).toBe(200);
    const edited = await detail(journey.charge);
    expect(Date.parse(edited.updatedAt)).toBeGreaterThan(Date.parse(edited.createdAt));

    const repaymentBefore = await detail(journey.repayment);
    expect((await voidTxn(aliceToken, journey.repayment)).status).toBe(200);
    const repaymentAfter = await detail(journey.repayment);
    expect(repaymentAfter.voidedAt).not.toBeNull();
    expect(repaymentAfter.updatedAt).toBe(repaymentBefore.updatedAt);
  });

  it('f-13 §1: a malformed id is 400 and an unknown id is 404 for edit and void', async () => {
    await startingState();
    const body = chargeBody();
    for (const res of [await edit(aliceToken, 'not-a-uuid', body), await voidTxn(aliceToken, 'not-a-uuid')]) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const unknown = '00000000-0000-4000-8000-000000000000';
    for (const res of [await edit(aliceToken, unknown, body), await voidTxn(aliceToken, unknown)]) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });
});
