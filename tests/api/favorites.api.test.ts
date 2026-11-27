import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/app.js';
import { prisma } from '../../server/src/prisma.js';
import { resetDatabase, createTestSession } from '../helpers/db.helper.js';
import { clearRateLimitStore } from '../../server/src/middleware/rate-limit.middleware.js';
import { bangkokDate, insertSearchLedger } from '../helpers/ledger.helper.js';

const TEST_ORIGIN = 'http://localhost:3000';
const TRANSACTIONS_URL = '/api/v1/transactions';
const ACCOUNTS_URL = '/api/v1/accounts';
const SUMMARY_URL = '/api/v1/summary/income-expense';

interface AccountItem {
  id: string;
  name: string;
  balance: number;
}

interface HistoryItem {
  id: string;
  kind: string;
  accountId: string;
  txnDate: string;
  totalAmount: number;
  memo: string | null;
  isFavorite: boolean;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: Array<{ id: string; targetAccountId: string; amount: number; note: string | null }>;
}

describe('F-15 Favorites and Duplicate (STS)', () => {
  let seededUsers: Awaited<ReturnType<typeof resetDatabase>>;
  let aliceToken: string;
  let bobToken: string;
  let adminToken: string;
  let ledger: Awaited<ReturnType<typeof insertSearchLedger>>;

  const as = (token: string | null) => {
    const cookie = token ? [`sid=${token}`] : [];
    return {
      get: (url: string) => request(app).get(url).set('Origin', TEST_ORIGIN).set('Cookie', cookie),
      post: (url: string) => request(app).post(url).set('Origin', TEST_ORIGIN).set('Cookie', cookie),
      patch: (url: string) => request(app).patch(url).set('Origin', TEST_ORIGIN).set('Cookie', cookie),
    };
  };

  const mark = (token: string | null, id: string, body: unknown) =>
    as(token).patch(`${TRANSACTIONS_URL}/${id}/favorite`).send(body as object);

  async function balances(): Promise<Record<string, number>> {
    const res = await as(aliceToken).get(ACCOUNTS_URL);
    expect(res.status).toBe(200);
    return Object.fromEntries((res.body.items as AccountItem[]).map((a) => [a.name, a.balance]));
  }

  async function summary(from = bangkokDate(-30), to = bangkokDate(0)) {
    const res = await as(aliceToken).get(`${SUMMARY_URL}?from=${from}&to=${to}`);
    expect(res.status).toBe(200);
    return res.body as { income: number; expense: number; net: number };
  }

  beforeEach(async () => {
    await clearRateLimitStore();
    seededUsers = await resetDatabase();
    aliceToken = await createTestSession(seededUsers.alice.id);
    bobToken = await createTestSession(seededUsers.bob.id);
    adminToken = await createTestSession(seededUsers.admin.id);
    ledger = await insertSearchLedger(seededUsers.alice.id, seededUsers.bob.id);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('TEST-15.1 (AC-15.1): marking an active transaction sets isFavorite without changing updatedAt, balances, or summary', async () => {
    const beforeDetail = await as(aliceToken).get(`${TRANSACTIONS_URL}/${ledger.cardChargeTransactionId}`);
    expect(beforeDetail.status).toBe(200);
    const recordedUpdatedAt = beforeDetail.body.transaction.updatedAt as string;
    const beforeBalances = await balances();
    const beforeSummary = await summary();
    expect(beforeBalances['Bank Account']).toBe(6_920_000);
    expect(beforeBalances['Credit Card']).toBe(40_000);
    expect(beforeBalances['Wallet']).toBe(1_000_000);

    const res = await mark(aliceToken, ledger.cardChargeTransactionId, { isFavorite: true });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      transaction: {
        id: ledger.cardChargeTransactionId,
        isFavorite: true,
        updatedAt: recordedUpdatedAt,
      },
    });

    const detail = await as(aliceToken).get(`${TRANSACTIONS_URL}/${ledger.cardChargeTransactionId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.transaction.isFavorite).toBe(true);
    expect(detail.body.transaction.updatedAt).toBe(recordedUpdatedAt);

    const list = await as(aliceToken).get(TRANSACTIONS_URL);
    expect(list.status).toBe(200);
    const item = (list.body.items as HistoryItem[]).find((t) => t.id === ledger.cardChargeTransactionId);
    expect(item?.isFavorite).toBe(true);

    expect(await balances()).toEqual(beforeBalances);
    expect(await summary()).toEqual(beforeSummary);
  });

  it('TEST-15.2 (AC-15.2): unmarking returns 200 with isFavorite false and repeated calls are idempotent', async () => {
    const before = await as(aliceToken).get(`${TRANSACTIONS_URL}/${ledger.cardChargeTransactionId}`);
    const recordedUpdatedAt = before.body.transaction.updatedAt as string;

    const firstMark = await mark(aliceToken, ledger.cardChargeTransactionId, { isFavorite: true });
    expect(firstMark.status).toBe(200);

    const secondMark = await mark(aliceToken, ledger.cardChargeTransactionId, { isFavorite: true });
    expect(secondMark.status).toBe(200);
    expect(secondMark.body.transaction.isFavorite).toBe(true);

    const firstUnmark = await mark(aliceToken, ledger.cardChargeTransactionId, { isFavorite: false });
    expect(firstUnmark.status).toBe(200);
    expect(firstUnmark.body.transaction.isFavorite).toBe(false);

    const secondUnmark = await mark(aliceToken, ledger.cardChargeTransactionId, { isFavorite: false });
    expect(secondUnmark.status).toBe(200);
    expect(secondUnmark.body.transaction).toEqual({
      id: ledger.cardChargeTransactionId,
      isFavorite: false,
      updatedAt: recordedUpdatedAt,
    });
  });

  it('TEST-15.3 (AC-15.3): GET /transactions?favorite filters favorites and rejects invalid or unknown parameters with 400', async () => {
    const badValue = await as(aliceToken).get(`${TRANSACTIONS_URL}?favorite=yes`);
    expect(badValue.status).toBe(400);
    expect(badValue.body.error.code).toBe('VALIDATION_ERROR');
    expect(badValue.body.error.details[0].field).toBe('favorite');

    const unknownParam = await as(aliceToken).get(`${TRANSACTIONS_URL}?favorite=true&sort=date`);
    expect(unknownParam.status).toBe(400);
    expect(unknownParam.body.error.code).toBe('VALIDATION_ERROR');
    expect(unknownParam.body.error.details[0].field).toBe('sort');

    // F-07 1.4: empty or repeated parameters are 400 VALIDATION_ERROR.
    for (const query of ['favorite=', 'offset=', 'limit=', 'favorite=true&favorite=false']) {
      const res = await as(aliceToken).get(`${TRANSACTIONS_URL}?${query}`);
      expect(res.status, query).toBe(400);
      expect(res.body.error.code, query).toBe('VALIDATION_ERROR');
    }

    expect((await mark(aliceToken, ledger.salaryTransactionId, { isFavorite: true })).status).toBe(200);
    expect((await mark(aliceToken, ledger.cardChargeTransactionId, { isFavorite: true })).status).toBe(200);

    const favs = await as(aliceToken).get(`${TRANSACTIONS_URL}?favorite=true`);
    expect(favs.status).toBe(200);
    expect(favs.body.total).toBe(2);
    expect((favs.body.items as HistoryItem[]).map((t) => t.id)).toEqual([
      ledger.cardChargeTransactionId,
      ledger.salaryTransactionId,
    ]);

    const nonFavs = await as(aliceToken).get(`${TRANSACTIONS_URL}?favorite=false`);
    expect(nonFavs.status).toBe(200);
    expect(nonFavs.body.total).toBe(4);
    expect((nonFavs.body.items as HistoryItem[]).map((t) => t.id)).toEqual([
      ledger.voidedTransactionId,
      ledger.transferTransactionId,
      ledger.repaymentTransactionId,
      ledger.openingTransactionId,
    ]);
  });

  it('TEST-15.4 (AC-15.4): enforces voided and opening-balance favorite rules, including concurrent void vs mark', async () => {
    expect((await mark(aliceToken, ledger.transferTransactionId, { isFavorite: true })).status).toBe(200);

    // Voided row (6) cannot be newly marked.
    const markVoided = await mark(aliceToken, ledger.voidedTransactionId, { isFavorite: true });
    expect(markVoided.status).toBe(409);
    expect(markVoided.body.error.code).toBe('TRANSACTION_VOIDED');
    const voidedRow = await prisma.transaction.findUniqueOrThrow({
      where: { id: ledger.voidedTransactionId },
      select: { isFavorite: true },
    });
    expect(voidedRow.isFavorite).toBe(false);

    // Voiding favorite (5) keeps it on ?favorite=true with voidedAt set.
    expect((await as(aliceToken).post(`${TRANSACTIONS_URL}/${ledger.transferTransactionId}/void`)).status).toBe(200);
    const favs = await as(aliceToken).get(`${TRANSACTIONS_URL}?favorite=true`);
    expect(favs.status).toBe(200);
    expect(favs.body.total).toBe(1);
    expect(favs.body.items[0].id).toBe(ledger.transferTransactionId);
    expect(favs.body.items[0].voidedAt).not.toBeNull();

    // Unmarking voided favorite (5) is allowed.
    const unmarkVoided = await mark(aliceToken, ledger.transferTransactionId, { isFavorite: false });
    expect(unmarkVoided.status).toBe(200);
    expect(unmarkVoided.body.transaction.isFavorite).toBe(false);

    // Opening balance (1) cannot be marked favorite.
    const markOpening = await mark(aliceToken, ledger.openingTransactionId, { isFavorite: true });
    expect(markOpening.status).toBe(400);
    expect(markOpening.body.error.code).toBe('VALIDATION_ERROR');
    expect(markOpening.body.error.details[0].issue).toBe('opening balances cannot be favorites');
    const openingRow = await prisma.transaction.findUniqueOrThrow({
      where: { id: ledger.openingTransactionId },
      select: { isFavorite: true },
    });
    expect(openingRow.isFavorite).toBe(false);

    // Parallel race: void (4) and mark (4).
    const [voidRes, markRes] = await Promise.all([
      as(aliceToken).post(`${TRANSACTIONS_URL}/${ledger.repaymentTransactionId}/void`),
      mark(aliceToken, ledger.repaymentTransactionId, { isFavorite: true }),
    ]);
    expect(voidRes.status).toBe(200);
    expect([200, 409]).toContain(markRes.status);
    if (markRes.status === 409) {
      expect(markRes.body.error.code).toBe('TRANSACTION_VOIDED');
    }
    const finalRow = await prisma.transaction.findUniqueOrThrow({
      where: { id: ledger.repaymentTransactionId },
      select: { voidedAt: true, isFavorite: true },
    });
    expect(finalRow.voidedAt).not.toBeNull();
    expect(finalRow.isFavorite).toBe(markRes.status === 200);
  });

  it('TEST-15.5 (AC-15.5): rejects malformed bodies, wrong content type, cross-user access, admin, and anonymous callers', async () => {
    for (const badBody of [{}, { isFavorite: 'true' }, { isFavorite: true, memo: 'x' }]) {
      const res = await mark(aliceToken, ledger.cardChargeTransactionId, badBody);
      expect(res.status, JSON.stringify(badBody)).toBe(400);
      expect(res.body.error.code, JSON.stringify(badBody)).toBe('VALIDATION_ERROR');
    }

    const malformedId = await mark(aliceToken, 'not-a-uuid', { isFavorite: true });
    expect(malformedId.status).toBe(400);
    expect(malformedId.body.error.code).toBe('VALIDATION_ERROR');

    const nonJson = await request(app)
      .patch(`${TRANSACTIONS_URL}/${ledger.cardChargeTransactionId}/favorite`)
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', [`sid=${aliceToken}`])
      .set('Content-Type', 'text/plain')
      .send('{"isFavorite":true}');
    expect(nonJson.status).toBe(415);
    expect(nonJson.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');

    const bobRes = await mark(bobToken, ledger.cardChargeTransactionId, { isFavorite: true });
    expect(bobRes.status).toBe(404);
    expect(bobRes.body.error.code).toBe('NOT_FOUND');

    const adminRes = await mark(adminToken, ledger.cardChargeTransactionId, { isFavorite: true });
    expect(adminRes.status).toBe(403);
    expect(adminRes.body.error.code).toBe('FORBIDDEN');

    const anonRes = await mark(null, ledger.cardChargeTransactionId, { isFavorite: true });
    expect(anonRes.status).toBe(401);
    expect(anonRes.body.error.code).toBe('UNAUTHENTICATED');

    const row = await prisma.transaction.findUniqueOrThrow({
      where: { id: ledger.cardChargeTransactionId },
      select: { isFavorite: true },
    });
    expect(row.isFavorite).toBe(false);
  });

  it('TEST-15.7 (AC-15.7, API): saving a copied body creates a new non-favorite transaction and leaves the original unchanged', async () => {
    expect((await mark(aliceToken, ledger.cardChargeTransactionId, { isFavorite: true })).status).toBe(200);
    const originalRes = await as(aliceToken).get(`${TRANSACTIONS_URL}/${ledger.cardChargeTransactionId}`);
    expect(originalRes.status).toBe(200);
    const original = originalRes.body.transaction as HistoryItem;

    const today = bangkokDate(0);
    const copyRes = await as(aliceToken).post(TRANSACTIONS_URL).send({
      kind: original.kind,
      accountId: original.accountId,
      txnDate: today,
      totalAmount: original.totalAmount,
      ...(original.memo ? { memo: original.memo } : {}),
      lines: original.lines.map((line) => ({
        targetAccountId: line.targetAccountId,
        amount: line.amount,
        ...(line.note ? { note: line.note } : {}),
      })),
    });
    expect(copyRes.status).toBe(201);
    const newId = copyRes.body.transaction.id as string;
    expect(newId).not.toBe(original.id);

    const copyDetail = await as(aliceToken).get(`${TRANSACTIONS_URL}/${newId}`);
    expect(copyDetail.status).toBe(200);
    expect(copyDetail.body.transaction.isFavorite).toBe(false);

    const originalAfter = await as(aliceToken).get(`${TRANSACTIONS_URL}/${ledger.cardChargeTransactionId}`);
    expect(originalAfter.status).toBe(200);
    expect(originalAfter.body.transaction).toEqual(original);

    const afterBalances = await balances();
    expect(afterBalances['Credit Card']).toBe(160_000);
    const todaySummary = await summary(today, today);
    expect(todaySummary.expense).toBe(120_000);
  });
});
