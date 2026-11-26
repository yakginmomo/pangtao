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
const ACCOUNT_FIELDS = ['balance', 'id', 'isArchived', 'name', 'openingBalance', 'subtype', 'type'];
// Relative to today, so BR-10 v2.0 (90-day limit) never rejects a fixture.
const DATE = bangkokDate(-1);

interface AccountItem {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  isArchived: boolean;
  balance: number;
  openingBalance: unknown;
}

describe('F-09 Account Management (STS)', () => {
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

  async function accounts(token: string): Promise<AccountItem[]> {
    const res = await as(token).get(ACCOUNTS_URL);
    expect(res.status).toBe(200);
    return res.body.items as AccountItem[];
  }
  const accountCount = async (userId: string) => prisma.account.count({ where: { userId } });

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

  it('TEST-09.1 (AC-09.1): creating an account of each type returns 201 at balance 0 and lists it in its type group', async () => {
    const bobBefore = await accounts(bobToken);
    const created = [
      { name: 'Savings', type: 'CASH', subtype: 'BANK' },
      { name: 'Loan from Mom', type: 'LOAN_TAKEN', subtype: 'OTHER' },
      { name: 'Loan to Bob', type: 'LOAN_GIVEN' },
      { name: 'Bonus', type: 'INCOME' },
      { name: 'Travel', type: 'EXPENSE' },
    ];
    for (const body of created) {
      const res = await as(aliceToken).post(ACCOUNTS_URL).send(body);
      expect(res.status, body.name).toBe(201);
      expect(Object.keys(res.body)).toEqual(['account']);
      expect(Object.keys(res.body.account).sort()).toEqual(ACCOUNT_FIELDS);
      expect(res.body.account).toMatchObject({
        name: body.name,
        type: body.type,
        subtype: body.subtype ?? null,
        isArchived: false,
        balance: 0,
        openingBalance: null,
      });
    }

    const items = await accounts(aliceToken);
    expect(items).toHaveLength(14);
    // f-03 order: Cash, Loan Taken, Loan Given, Income, Expense, then name.
    expect(items.map((a) => [a.type, a.name])).toEqual([
      ['CASH', 'Bank Account'],
      ['CASH', 'Savings'],
      ['CASH', 'Wallet'],
      ['LOAN_TAKEN', 'Credit Card'],
      ['LOAN_TAKEN', 'Loan from Mom'],
      ['LOAN_GIVEN', 'Loan to Bob'],
      ['INCOME', 'Bonus'],
      ['INCOME', 'Interest Earned'],
      ['INCOME', 'Salary'],
      ['EXPENSE', 'Dining'],
      ['EXPENSE', 'Electricity'],
      ['EXPENSE', 'Groceries'],
      ['EXPENSE', 'Telecom'],
      ['EXPENSE', 'Travel'],
    ]);
    expect(await accounts(bobToken)).toEqual(bobBefore);
  });

  it('TEST-09.2 (AC-09.2): a missing, blank or too-long name, an unknown type, or an invalid subtype returns 400 and creates nothing', async () => {
    const before = await accountCount(seededUsers.alice.id);
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ type: 'CASH' }, 'name'],
      [{ name: '   ', type: 'CASH' }, 'name'],
      [{ name: 'x'.repeat(61), type: 'CASH' }, 'name'],
      [{ name: 'Piggy bank', type: 'SAVINGS' }, 'type'],
      [{ name: 'Odd cash', type: 'CASH', subtype: 'CREDIT_CARD' }, 'subtype'],
      [{ name: 'Odd loan', type: 'LOAN_GIVEN', subtype: 'BANK' }, 'subtype'],
      [{ name: 'Odd expense', type: 'EXPENSE', subtype: 'WALLET' }, 'subtype'],
    ];
    for (const [body, field] of cases) {
      const res = await as(aliceToken).post(ACCOUNTS_URL).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code, JSON.stringify(body)).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.map((d: { field: string }) => d.field), JSON.stringify(body)).toContain(field);
    }
    // A 60-character name is the longest accepted.
    const longest = await as(aliceToken).post(ACCOUNTS_URL).send({ name: 'y'.repeat(60), type: 'EXPENSE' });
    expect(longest.status).toBe(201);
    expect(await accountCount(seededUsers.alice.id)).toBe(before + 1);
  });

  it('TEST-09.3 (AC-09.3): a duplicate name on create or rename returns 409 ACCOUNT_NAME_EXISTS; another user may use it', async () => {
    const savings = await as(aliceToken).post(ACCOUNTS_URL).send({ name: 'Savings', type: 'CASH', subtype: 'BANK' });
    expect(savings.status).toBe(201);
    const before = await accountCount(seededUsers.alice.id);

    for (const res of [
      await as(aliceToken).post(ACCOUNTS_URL).send({ name: 'Savings', type: 'CASH' }),
      await as(aliceToken).post(ACCOUNTS_URL).send({ name: ' Savings ', type: 'EXPENSE' }),
      await as(aliceToken).patch(`${ACCOUNTS_URL}/${ids['Wallet']}`).send({ name: 'Savings' }),
    ]) {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACCOUNT_NAME_EXISTS');
    }
    expect(await accountCount(seededUsers.alice.id)).toBe(before);
    const wallet = await prisma.account.findUnique({ where: { id: ids['Wallet'] } });
    expect(wallet?.name).toBe('Wallet');

    const bob = await as(bobToken).post(ACCOUNTS_URL).send({ name: 'Savings', type: 'CASH' });
    expect(bob.status).toBe(201);
  });

  it('two parallel creates with the same name give one 201 and one 409, never a 500 (f-09 §5)', async () => {
    const body = { name: 'Race', type: 'EXPENSE' };
    const results = await Promise.all([
      as(aliceToken).post(ACCOUNTS_URL).send(body),
      as(aliceToken).post(ACCOUNTS_URL).send(body),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)?.body.error.code).toBe('ACCOUNT_NAME_EXISTS');
    expect(await prisma.account.count({ where: { userId: seededUsers.alice.id, name: 'Race' } })).toBe(1);
  });

  it('TEST-09.4 (AC-09.4): renaming keeps balance, type and subtype, and history shows the new name', async () => {
    const pay = await as(aliceToken).post(TRANSACTIONS_URL).send({
      kind: 'PAYMENT',
      accountId: ids['Bank Account'],
      txnDate: DATE,
      totalAmount: 10_000, // 100.00 THB
      lines: [{ targetAccountId: ids['Dining'], amount: 10_000 }],
    });
    expect(pay.status).toBe(201);

    const res = await as(aliceToken).patch(`${ACCOUNTS_URL}/${ids['Dining']}`).send({ name: 'Eating out' });
    expect(res.status).toBe(200);
    expect(res.body.account).toMatchObject({
      id: ids['Dining'],
      name: 'Eating out',
      type: 'EXPENSE',
      subtype: null,
      balance: 10_000, // 100.00 THB
    });

    const detail = await as(aliceToken).get(`${TRANSACTIONS_URL}/${pay.body.transaction.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.transaction.lines[0].targetAccountName).toBe('Eating out');
  });

  it('TEST-09.5 (AC-09.5): a PATCH with type, subtype, an unknown field or an empty body returns 400 and changes nothing', async () => {
    for (const body of [{ type: 'EXPENSE' }, { subtype: 'BANK' }, { name: 'W', colour: 'red' }, {}]) {
      const res = await as(aliceToken).patch(`${ACCOUNTS_URL}/${ids['Wallet']}`).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body.error.code, JSON.stringify(body)).toBe('VALIDATION_ERROR');
    }
    const wallet = await prisma.account.findUnique({ where: { id: ids['Wallet'] } });
    expect(wallet).toMatchObject({ name: 'Wallet', type: 'CASH', subtype: 'WALLET', isArchived: false });
  });

  it('TEST-09.6 (AC-09.6): archiving keeps the balance and history and blocks new use as source, target and opening balance', async () => {
    const opening = await as(aliceToken)
      .post(`${ACCOUNTS_URL}/${ids['Wallet']}/opening-balance`)
      .send({ amount: 100_000, date: '2026-01-01' }); // 1,000.00 THB
    expect(opening.status).toBe(201);
    const spend = await as(aliceToken).post(TRANSACTIONS_URL).send({
      kind: 'PAYMENT',
      accountId: ids['Wallet'],
      txnDate: DATE,
      totalAmount: 20_000, // 200.00 THB
      lines: [{ targetAccountId: ids['Dining'], amount: 20_000 }],
    });
    expect(spend.status).toBe(201);
    const loan = await as(aliceToken).post(ACCOUNTS_URL).send({ name: 'Loan to Bob', type: 'LOAN_GIVEN' });
    expect(loan.status).toBe(201);
    const loanId = loan.body.account.id as string;

    for (const id of [ids['Wallet'], ids['Telecom'], loanId]) {
      const res = await as(aliceToken).patch(`${ACCOUNTS_URL}/${id}`).send({ isArchived: true });
      expect(res.status).toBe(200);
      expect(res.body.account.isArchived).toBe(true);
    }
    const wallet = (await accounts(aliceToken)).find((a) => a.name === 'Wallet');
    expect(wallet).toMatchObject({ isArchived: true, balance: 80_000 }); // 800.00 THB
    const history = await as(aliceToken).get(TRANSACTIONS_URL);
    expect(history.body.total).toBe(2);

    const rowsBefore = await countLedgerRows(seededUsers.alice.id);
    const fromWallet = await as(aliceToken).post(TRANSACTIONS_URL).send({
      kind: 'PAYMENT',
      accountId: ids['Wallet'],
      txnDate: DATE,
      totalAmount: 1_000,
      lines: [{ targetAccountId: ids['Dining'], amount: 1_000 }],
    });
    expect(fromWallet.status).toBe(400);
    expect(fromWallet.body.error.code).toBe('VALIDATION_ERROR');
    const toTelecom = await as(aliceToken).post(TRANSACTIONS_URL).send({
      kind: 'PAYMENT',
      accountId: ids['Bank Account'],
      txnDate: DATE,
      totalAmount: 1_000,
      lines: [{ targetAccountId: ids['Telecom'], amount: 1_000 }],
    });
    expect(toTelecom.status).toBe(400);
    expect(toTelecom.body.error.code).toBe('INVALID_TARGET_ACCOUNT');
    const loanOpening = await as(aliceToken)
      .post(`${ACCOUNTS_URL}/${loanId}/opening-balance`)
      .send({ amount: 1_000, date: '2026-01-01' });
    expect(loanOpening.status).toBe(400);
    expect(loanOpening.body.error.code).toBe('VALIDATION_ERROR');
    expect(await countLedgerRows(seededUsers.alice.id)).toEqual(rowsBefore);
  });

  it('TEST-09.7 (AC-09.7): an archived account can be renamed and unarchived, then used again; unarchive is idempotent', async () => {
    const archive = await as(aliceToken).patch(`${ACCOUNTS_URL}/${ids['Wallet']}`).send({ isArchived: true });
    expect(archive.status).toBe(200);

    const rename = await as(aliceToken).patch(`${ACCOUNTS_URL}/${ids['Wallet']}`).send({ name: 'Old wallet' });
    expect(rename.status).toBe(200);
    expect(rename.body.account).toMatchObject({ name: 'Old wallet', isArchived: true });

    const unarchive = await as(aliceToken).patch(`${ACCOUNTS_URL}/${ids['Wallet']}`).send({ isArchived: false });
    expect(unarchive.status).toBe(200);
    expect(unarchive.body.account.isArchived).toBe(false);

    const pay = await as(aliceToken).post(TRANSACTIONS_URL).send({
      kind: 'PAYMENT',
      accountId: ids['Wallet'],
      txnDate: DATE,
      totalAmount: 10_000, // 100.00 THB
      lines: [{ targetAccountId: ids['Dining'], amount: 10_000 }],
    });
    expect(pay.status).toBe(201);

    const again = await as(aliceToken).patch(`${ACCOUNTS_URL}/${ids['Wallet']}`).send({ isArchived: false });
    expect(again.status).toBe(200);
    expect(again.body.account).toMatchObject({ name: 'Old wallet', isArchived: false, balance: -10_000 });
  });

  it("TEST-09.8 (AC-09.8): another user's account is 404, an Administrator 403, an anonymous caller 401, and nothing changes", async () => {
    // Control: Alice can PATCH her own account, so the 404s below come from ownership, not a missing route.
    const own = await as(aliceToken).patch(`${ACCOUNTS_URL}/${ids['Wallet']}`).send({ name: 'Wallet' });
    expect(own.status).toBe(200);

    for (const body of [{ name: 'Mine' }, { isArchived: true }]) {
      const res = await as(bobToken).patch(`${ACCOUNTS_URL}/${ids['Wallet']}`).send(body);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body).not.toHaveProperty('account');
    }

    for (const token of [adminToken, null]) {
      const created = await as(token).post(ACCOUNTS_URL).send({ name: 'Hack', type: 'CASH' });
      const changed = await as(token).patch(`${ACCOUNTS_URL}/${ids['Wallet']}`).send({ name: 'Hack' });
      const expected = token ? [403, 'FORBIDDEN'] : [401, 'UNAUTHENTICATED'];
      for (const res of [created, changed]) {
        expect(res.status).toBe(expected[0]);
        expect(res.body.error.code).toBe(expected[1]);
      }
    }

    const wallet = await prisma.account.findUnique({ where: { id: ids['Wallet'] } });
    expect(wallet).toMatchObject({ name: 'Wallet', isArchived: false });
    expect(await prisma.account.count({ where: { name: 'Hack' } })).toBe(0);
  });
});
