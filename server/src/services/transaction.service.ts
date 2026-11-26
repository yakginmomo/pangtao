import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { satangToJson } from '../utils/money.util.js';
import { checkTransactionVersion, RuleAccount, SavedVersion } from './allocation.rules.js';
import type {
  CreateTransactionBodyDto,
  ListTransactionsQueryDto,
  UpdateTransactionBodyDto,
} from '../schemas/transaction.schema.js';

export interface AllocationLineView {
  id: string;
  targetAccountId: string;
  /** Integer satang. */
  amount: number;
  note: string | null;
}

/** f-05 §2.1 / f-06 §2.1: `{ id, kind, accountId, txnDate, totalAmount, memo, lines }`. */
export interface TransactionView {
  id: string;
  kind: 'PAYMENT' | 'RECEIPT';
  accountId: string;
  /** YYYY-MM-DD */
  txnDate: string;
  /** Integer satang. */
  totalAmount: number;
  memo: string | null;
  lines: AllocationLineView[];
}

/** f-13 §2.1 PATCH response: the saved version plus when it was edited. */
export interface EditedTransactionView extends TransactionView {
  /** ISO 8601 timestamp. */
  updatedAt: string;
}

/** f-13 §2.1 void response. */
export interface VoidedTransactionView {
  id: string;
  kind: 'PAYMENT' | 'RECEIPT';
  accountId: string;
  /** YYYY-MM-DD */
  txnDate: string;
  /** Integer satang. */
  totalAmount: number;
  memo: string | null;
  /** ISO 8601 timestamp. */
  voidedAt: string;
}

/** f-07 §2.1 line: the stored line plus its target account's name. */
export interface HistoryLineView extends AllocationLineView {
  targetAccountName: string;
}

/**
 * f-07 §2.1 (1.3): `{ id, kind, accountId, accountName, txnDate, totalAmount, memo, lines, voidedAt,
 * createdAt, updatedAt }`. `updatedAt` later than `createdAt` means the transaction was edited (f-13 1.1).
 */
export interface TransactionHistoryView {
  id: string;
  kind: 'PAYMENT' | 'RECEIPT' | 'OPENING_BALANCE';
  accountId: string;
  accountName: string;
  /** YYYY-MM-DD */
  txnDate: string;
  /** Integer satang. */
  totalAmount: number;
  memo: string | null;
  lines: HistoryLineView[];
  /** ISO 8601 timestamp, or null while the transaction counts. */
  voidedAt: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp. */
  updatedAt: string;
}

export interface TransactionHistoryPage {
  items: TransactionHistoryView[];
  total: number;
  limit: number;
  offset: number;
}

const ACCOUNT_RULE_FIELDS = { id: true, type: true, isArchived: true } as const;

const HISTORY_SELECT = {
  id: true,
  kind: true,
  accountId: true,
  account: { select: { name: true } },
  txnDate: true,
  totalAmount: true,
  memo: true,
  voidedAt: true,
  createdAt: true,
  updatedAt: true,
  lines: {
    orderBy: { lineNo: 'asc' },
    select: {
      id: true,
      targetAccountId: true,
      targetAccount: { select: { name: true } },
      amount: true,
      note: true,
    },
  },
} satisfies Prisma.TransactionSelect;

type HistoryRow = Prisma.TransactionGetPayload<{ select: typeof HISTORY_SELECT }>;

function toHistoryView(row: HistoryRow): TransactionHistoryView {
  return {
    id: row.id,
    kind: row.kind,
    accountId: row.accountId,
    accountName: row.account.name,
    txnDate: row.txnDate.toISOString().slice(0, 10),
    totalAmount: satangToJson(row.totalAmount),
    memo: row.memo,
    lines: row.lines.map((line) => ({
      id: line.id,
      targetAccountId: line.targetAccountId,
      targetAccountName: line.targetAccount.name,
      amount: satangToJson(line.amount),
      note: line.note,
    })),
    voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type Tx = Prisma.TransactionClient;

/** A Payment or Receipt body as create and edit both carry it. */
type VersionBody = Pick<CreateTransactionBodyDto, 'accountId' | 'txnDate' | 'totalAmount' | 'lines'>;

/**
 * f-13 §1 step 5, shared by create and edit: the source and every line target must belong to
 * the caller, so another user's account looks like an unknown one (404, BR-01).
 */
async function loadVersionAccounts(
  tx: Tx,
  userId: string,
  body: VersionBody
): Promise<{ source: RuleAccount; targets: RuleAccount[] }> {
  const source = await tx.account.findFirst({
    where: { id: body.accountId, userId },
    select: ACCOUNT_RULE_FIELDS,
  });
  if (!source) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }

  const targetIds = [...new Set(body.lines.map((line) => line.targetAccountId))];
  const found = await tx.account.findMany({
    where: { id: { in: targetIds }, userId },
    select: ACCOUNT_RULE_FIELDS,
  });
  const byId = new Map<string, RuleAccount>(found.map((account) => [account.id, account]));
  if (byId.size !== targetIds.length) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }
  return { source, targets: body.lines.map((line) => byId.get(line.targetAccountId)!) };
}

/** f-13 §1 steps 5 to 10 for create (no `saved`) and edit (the stored version, S2-D6). */
async function checkVersion(
  tx: Tx,
  userId: string,
  kind: 'PAYMENT' | 'RECEIPT',
  body: VersionBody,
  saved?: SavedVersion
): Promise<RuleAccount> {
  const { source, targets } = await loadVersionAccounts(tx, userId, body);
  checkTransactionVersion(
    {
      kind,
      source,
      targets,
      txnDate: body.txnDate,
      totalAmount: BigInt(body.totalAmount),
      amounts: body.lines.map((line) => BigInt(line.amount)),
    },
    saved
  );
  return source;
}

/** Insert the version's lines with `line_no` 1..n and read them back in order. */
async function writeLines(tx: Tx, userId: string, transactionId: string, lines: VersionBody['lines']) {
  // Lines carry user_id explicitly: it is shared by the composite FKs to transactions and accounts.
  await tx.allocationLine.createMany({
    data: lines.map((line, index) => ({
      transactionId,
      userId,
      targetAccountId: line.targetAccountId,
      amount: BigInt(line.amount),
      lineNo: index + 1,
      note: line.note ?? null,
    })),
  });
  const stored = await tx.allocationLine.findMany({
    where: { transactionId, userId },
    orderBy: { lineNo: 'asc' },
    select: { id: true, targetAccountId: true, amount: true, note: true },
  });
  return stored.map((line) => ({
    id: line.id,
    targetAccountId: line.targetAccountId,
    amount: satangToJson(line.amount),
    note: line.note,
  }));
}

/**
 * f-13 §1 steps 2 to 4, shared by edit and void: the caller's transaction (404 otherwise, BR-01),
 * not an opening balance (400, S2-D2) and not voided (409, BR-12 / Q-5).
 */
async function findEditable(tx: Tx, userId: string, id: string) {
  const row = await tx.transaction.findFirst({
    where: { id, userId },
    select: {
      id: true,
      kind: true,
      accountId: true,
      txnDate: true,
      totalAmount: true,
      memo: true,
      voidedAt: true,
      updatedAt: true,
      lines: { select: { targetAccountId: true } },
    },
  });
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
  }
  if (row.kind === 'OPENING_BALANCE') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Opening balances are changed on the account', [
      { field: 'id', issue: 'opening balances are changed on the account' },
    ]);
  }
  if (row.voidedAt !== null) {
    throw transactionVoided();
  }
  return { ...row, kind: row.kind };
}

function transactionVoided(): AppError {
  return new AppError(409, 'TRANSACTION_VOIDED', 'This transaction has already been voided');
}

export class TransactionService {
  /**
   * FR-12 / FR-13 / BR-01, BR-04 to BR-07, BR-09, BR-10, BR-14, BR-16: record one Payment
   * or Receipt. Ownership is checked first, so another user's account looks like an unknown
   * one (404). Every rule and both inserts run in one database transaction, so a rejected
   * request writes nothing.
   */
  async createTransaction(dto: CreateTransactionBodyDto, userId: string): Promise<TransactionView> {
    return prisma.$transaction(async (tx) => {
      const source = await checkVersion(tx, userId, dto.kind, dto);

      const transaction = await tx.transaction.create({
        data: {
          userId,
          kind: dto.kind,
          accountId: source.id,
          // DATE column: store the calendar day at UTC midnight, like every other ledger row.
          txnDate: new Date(`${dto.txnDate}T00:00:00.000Z`),
          totalAmount: BigInt(dto.totalAmount),
          memo: dto.memo ?? null,
        },
        select: { id: true, accountId: true, txnDate: true, totalAmount: true, memo: true },
      });
      const lines = await writeLines(tx, userId, transaction.id, dto.lines);

      return {
        id: transaction.id,
        kind: dto.kind,
        accountId: transaction.accountId,
        txnDate: transaction.txnDate.toISOString().slice(0, 10),
        totalAmount: satangToJson(transaction.totalAmount),
        memo: transaction.memo,
        lines,
      };
    });
  }

  /**
   * FR-16 / f-13 S2-D4: replace a Payment or Receipt with the full new version. The kind is
   * fixed; the checks run in f-13 §1 order through the validator create uses, with S2-D6's
   * exemptions for the saved date and accounts kept in their role. The update is conditional
   * on `voided_at IS NULL`, so an edit racing a void either completes first or returns 409.
   * The old lines are deleted and the new ones inserted; `id` and `created_at` stay.
   */
  async updateTransaction(userId: string, id: string, dto: UpdateTransactionBodyDto): Promise<EditedTransactionView> {
    return prisma.$transaction(async (tx) => {
      const saved = await findEditable(tx, userId, id);
      const kind = saved.kind;
      await checkVersion(tx, userId, kind, dto, {
        accountId: saved.accountId,
        txnDate: saved.txnDate.toISOString().slice(0, 10),
        targetIds: new Set(saved.lines.map((line) => line.targetAccountId)),
      });

      const updated = await tx.transaction.updateMany({
        where: { id, userId, voidedAt: null },
        data: {
          accountId: dto.accountId,
          txnDate: new Date(`${dto.txnDate}T00:00:00.000Z`),
          totalAmount: BigInt(dto.totalAmount),
          memo: dto.memo ?? null,
        },
      });
      if (updated.count === 0) {
        throw transactionVoided();
      }
      await tx.allocationLine.deleteMany({ where: { transactionId: id, userId } });
      const lines = await writeLines(tx, userId, id, dto.lines);

      const row = await tx.transaction.findFirstOrThrow({
        where: { id, userId },
        select: { accountId: true, txnDate: true, totalAmount: true, memo: true, updatedAt: true },
      });
      return {
        id,
        kind,
        accountId: row.accountId,
        txnDate: row.txnDate.toISOString().slice(0, 10),
        totalAmount: satangToJson(row.totalAmount),
        memo: row.memo,
        lines,
        updatedAt: row.updatedAt.toISOString(),
      };
    });
  }

  /**
   * BR-12 / f-13 Q-5: void a Payment or Receipt. Nothing is deleted (D-04) and there is no
   * date limit (Q-4). The update is conditional on `voided_at IS NULL`, so of two concurrent
   * voids one gets 200 and the other 409. `updated_at` is kept (f-13 1.1), so it changes only
   * when the transaction is edited.
   */
  async voidTransaction(userId: string, id: string): Promise<VoidedTransactionView> {
    return prisma.$transaction(async (tx) => {
      const saved = await findEditable(tx, userId, id);
      const voidedAt = new Date();
      const updated = await tx.transaction.updateMany({
        where: { id, userId, voidedAt: null },
        data: { voidedAt, updatedAt: saved.updatedAt },
      });
      if (updated.count === 0) {
        throw transactionVoided();
      }
      return {
        id,
        kind: saved.kind,
        accountId: saved.accountId,
        txnDate: saved.txnDate.toISOString().slice(0, 10),
        totalAmount: satangToJson(saved.totalAmount),
        memo: saved.memo,
        voidedAt: voidedAt.toISOString(),
      };
    });
  }

  /**
   * FR-17 / BR-01: one page of the user's history, newest first (`txn_date DESC, created_at
   * DESC`, served by `transactions_user_id_txn_date_created_at_idx`), with `id DESC` as a final
   * tie-break so offset pages never repeat or skip rows that share a date and creation time.
   * Voided rows are included with `voidedAt` set and keep their place (BR-12, f-07 1.2). Count
   * and page are read from one REPEATABLE READ snapshot so `total` matches the page.
   */
  async listTransactions(userId: string, query: ListTransactionsQueryDto): Promise<TransactionHistoryPage> {
    const where = { userId } satisfies Prisma.TransactionWhereInput;
    const [total, rows] = await prisma.$transaction(
      [
        prisma.transaction.count({ where }),
        prisma.transaction.findMany({
          where,
          orderBy: [{ txnDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
          skip: query.offset,
          take: query.limit,
          select: HISTORY_SELECT,
        }),
      ],
      { isolationLevel: 'RepeatableRead' }
    );
    return { items: rows.map(toHistoryView), total, limit: query.limit, offset: query.offset };
  }

  /**
   * FR-25 / BR-01, D-03: one transaction's full detail, voided or not (BR-12, f-07 1.2). The
   * lookup is scoped to the caller, so another user's id is indistinguishable from an unknown id: 404.
   */
  async getTransaction(userId: string, id: string): Promise<TransactionHistoryView> {
    const row = await prisma.transaction.findFirst({
      where: { id, userId },
      select: HISTORY_SELECT,
    });
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
    }
    return toHistoryView(row);
  }
}

export const transactionService = new TransactionService();
