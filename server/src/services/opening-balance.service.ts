import { AccountType, Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AppError } from '../middleware/error.middleware.js';
import { satangToJson } from '../utils/money.util.js';
import { isFutureDate } from '../utils/date.util.js';
import type { CorrectOpeningBalanceBodyDto, OpeningBalanceBodyDto } from '../schemas/opening-balance.schema.js';

/** f-04 §2.1: exactly these five fields, with `txnDate` as a calendar date. */
export interface OpeningBalanceTransactionView {
  id: string;
  kind: 'OPENING_BALANCE';
  accountId: string;
  /** YYYY-MM-DD */
  txnDate: string;
  /** Integer satang. */
  totalAmount: number;
}

/** f-12 §2.1: a removed opening balance also carries when it was voided. */
export interface VoidedOpeningBalanceView extends OpeningBalanceTransactionView {
  /** ISO 8601 timestamp. */
  voidedAt: string;
}

const OPENING_VIEW_FIELDS = { id: true, accountId: true, txnDate: true, totalAmount: true } as const;

function toView(row: { id: string; accountId: string; txnDate: Date; totalAmount: bigint }): OpeningBalanceTransactionView {
  return {
    id: row.id,
    kind: 'OPENING_BALANCE',
    accountId: row.accountId,
    // DATE column arrives as UTC midnight; the calendar date is its ISO prefix.
    txnDate: row.txnDate.toISOString().slice(0, 10),
    totalAmount: satangToJson(row.totalAmount),
  };
}

const NO_ACTIVE_OPENING = () => new AppError(404, 'NOT_FOUND', 'This account has no opening balance');

/** BR-11: only Cash, Loan Taken and Loan Given accounts may own an opening balance. */
const OPENING_BALANCE_ACCOUNT_TYPES: ReadonlySet<AccountType> = new Set([
  AccountType.CASH,
  AccountType.LOAN_TAKEN,
  AccountType.LOAN_GIVEN,
]);

export class OpeningBalanceService {
  /**
   * FR-10 / BR-01, BR-04, BR-10, BR-11, BR-14: record one opening-balance transaction.
   * Ownership is checked first so a cross-user id is indistinguishable from an unknown one.
   * Every rule and the insert run in one transaction, so a rejected request writes nothing.
   */
  async createOpeningBalance(
    accountId: string,
    dto: OpeningBalanceBodyDto,
    userId: string
  ): Promise<OpeningBalanceTransactionView> {
    try {
      return await prisma.$transaction(async (tx) => {
        const account = await tx.account.findFirst({
          where: { id: accountId, userId },
          select: { id: true, type: true, isArchived: true },
        });

        if (!account) {
          throw new AppError(404, 'NOT_FOUND', 'Account not found');
        }

        // BR-14: archived accounts keep their history but take no new transactions.
        if (account.isArchived) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Archived accounts cannot receive an opening balance', [
            { field: 'accountId', issue: 'account must not be archived' },
          ]);
        }

        if (!OPENING_BALANCE_ACCOUNT_TYPES.has(account.type)) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Opening balance is not allowed for this account type', [
            { field: 'accountId', issue: 'account type must be CASH, LOAN_TAKEN or LOAN_GIVEN' },
          ]);
        }

        if (isFutureDate(dto.date)) {
          throw new AppError(400, 'FUTURE_DATE_NOT_ALLOWED', 'Date cannot be later than today in Bangkok time');
        }

        const existing = await tx.transaction.findFirst({
          where: { userId, accountId, kind: 'OPENING_BALANCE', voidedAt: null },
          select: { id: true },
        });

        if (existing) {
          throw new AppError(409, 'OPENING_BALANCE_EXISTS', 'This account already has an opening balance');
        }

        const transaction = await tx.transaction.create({
          data: {
            userId,
            accountId,
            kind: 'OPENING_BALANCE',
            // DATE column: store the calendar day at UTC midnight, like every other ledger row.
            txnDate: new Date(`${dto.date}T00:00:00.000Z`),
            totalAmount: BigInt(dto.amount),
          },
          select: { id: true, kind: true, accountId: true, txnDate: true, totalAmount: true },
        });

        return {
          id: transaction.id,
          kind: 'OPENING_BALANCE' as const,
          accountId: transaction.accountId,
          txnDate: transaction.txnDate.toISOString().slice(0, 10),
          totalAmount: satangToJson(transaction.totalAmount),
        };
      });
    } catch (error) {
      // The partial unique index unique_active_opening_balance is the race-safe guard.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(409, 'OPENING_BALANCE_EXISTS', 'This account already has an opening balance');
      }
      throw error;
    }
  }

  /**
   * f-12 checks shared by correct and remove, inside the caller's transaction: ownership (404,
   * BR-01), then archived (400, BR-14), then the account's active opening balance (404 when
   * there is none, including Income and Expense accounts, which can never have one).
   */
  private async activeOpening(tx: Prisma.TransactionClient, accountId: string, userId: string) {
    const account = await tx.account.findFirst({ where: { id: accountId, userId }, select: { isArchived: true } });
    if (!account) {
      throw new AppError(404, 'NOT_FOUND', 'Account not found');
    }
    if (account.isArchived) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Archived accounts cannot change their opening balance', [
        { field: 'accountId', issue: 'account must not be archived' },
      ]);
    }
    const opening = await tx.transaction.findFirst({
      where: { userId, accountId, kind: 'OPENING_BALANCE', voidedAt: null },
      select: { id: true },
    });
    if (!opening) throw NO_ACTIVE_OPENING();
    return opening;
  }

  /**
   * FR-11 / AC-12.1, AC-12.2: correct the amount and/or date of the active opening balance in
   * place (same id, BR-11). The date may be any past day but not a future one: the 90-day limit
   * does not apply to opening balances (BR-10 v2.0). One transaction, so a rejection writes nothing.
   */
  async correctOpeningBalance(
    accountId: string,
    dto: CorrectOpeningBalanceBodyDto,
    userId: string
  ): Promise<OpeningBalanceTransactionView> {
    return prisma.$transaction(async (tx) => {
      const opening = await this.activeOpening(tx, accountId, userId);
      if (dto.date !== undefined && isFutureDate(dto.date)) {
        throw new AppError(400, 'FUTURE_DATE_NOT_ALLOWED', 'Date cannot be later than today in Bangkok time');
      }
      // Conditional on still being active, so a correction racing a remove cannot revive it.
      const updated = await tx.transaction.updateMany({
        where: { id: opening.id, userId, voidedAt: null },
        data: {
          ...(dto.amount !== undefined ? { totalAmount: BigInt(dto.amount) } : {}),
          ...(dto.date !== undefined ? { txnDate: new Date(`${dto.date}T00:00:00.000Z`) } : {}),
        },
      });
      if (updated.count === 0) throw NO_ACTIVE_OPENING();
      return toView(await tx.transaction.findUniqueOrThrow({ where: { id: opening.id }, select: OPENING_VIEW_FIELDS }));
    });
  }

  /**
   * FR-11 / AC-12.3: remove the active opening balance by voiding it (S2-D1, D-04: never
   * deleted); F-04 can then record a new one. The void is a conditional update, so of two
   * concurrent removes one succeeds and the other finds nothing active (404).
   */
  async removeOpeningBalance(accountId: string, userId: string): Promise<VoidedOpeningBalanceView> {
    return prisma.$transaction(async (tx) => {
      const opening = await this.activeOpening(tx, accountId, userId);
      const voided = await tx.transaction.updateMany({
        where: { id: opening.id, userId, voidedAt: null },
        data: { voidedAt: new Date() },
      });
      if (voided.count === 0) throw NO_ACTIVE_OPENING();
      const row = await tx.transaction.findUniqueOrThrow({
        where: { id: opening.id },
        select: { ...OPENING_VIEW_FIELDS, voidedAt: true },
      });
      return { ...toView(row), voidedAt: row.voidedAt!.toISOString() };
    });
  }
}

export const openingBalanceService = new OpeningBalanceService();
