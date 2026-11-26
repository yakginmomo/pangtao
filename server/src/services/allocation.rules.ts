/**
 * F-05/F-06 allocation rules (pure): no database, no I/O. Each check throws an AppError
 * so the calling service can run it inside its database transaction.
 */
import type { AccountType } from '@prisma/client';
import { AppError } from '../middleware/error.middleware.js';
import { DEFAULT_TIME_ZONE, isBeforeBackdateLimit, isFutureDate } from '../utils/date.util.js';

export interface RuleAccount {
  id: string;
  type: AccountType;
  isArchived: boolean;
}

/**
 * BR-06 / BR-16 matrices (srs §4, Sprint 2 README §2.2): allowed source types, and for each
 * source type the allowed line target types. A Loan Taken (card) source accepts Expense lines
 * only (srs v2.1, F-10 Q-1); every loan row uses a Cash source.
 */
const PAYMENT_TARGETS: Readonly<Partial<Record<AccountType, ReadonlySet<AccountType>>>> = {
  // spending; card or loan repayment; lending (F-10); transfer out to another Cash account (F-11)
  CASH: new Set<AccountType>(['EXPENSE', 'LOAN_TAKEN', 'LOAN_GIVEN', 'CASH']),
  LOAN_TAKEN: new Set<AccountType>(['EXPENSE']), // card charge
};

const RECEIPT_TARGETS: Readonly<Partial<Record<AccountType, ReadonlySet<AccountType>>>> = {
  // earnings; repayment received and borrowing (F-10); transfer in from another Cash account (F-11)
  CASH: new Set<AccountType>(['INCOME', 'LOAN_GIVEN', 'LOAN_TAKEN', 'CASH']),
};

/** BR-05: line amounts must sum exactly to the total. Summed as bigint, so never rounded. */
export function checkAllocationSum(total: bigint, amounts: readonly bigint[]): void {
  const allocated = amounts.reduce((sum, amount) => sum + amount, 0n);
  if (allocated !== total) {
    throw new AppError(400, 'INVALID_ALLOCATION_SUM', 'Allocation lines must add up to the total amount', [
      { field: 'lines', issue: 'line amounts must sum exactly to totalAmount' },
    ]);
  }
}

/**
 * BR-06: each line target (in line order) must be active, differ from the source, and be
 * allowed for it. Shared by the Payment and Receipt matrices.
 */
function checkTargets(
  source: RuleAccount,
  targets: readonly RuleAccount[],
  allowedTargets: ReadonlySet<AccountType>,
  message: string
): void {
  targets.forEach((target, index) => {
    const field = `lines.${index}.targetAccountId`;
    let issue: string | null = null;
    if (target.isArchived) issue = 'target account must not be archived';
    else if (target.id === source.id) issue = 'target account must differ from the source account';
    else if (!allowedTargets.has(target.type)) issue = 'target account type is not allowed for this source';

    if (issue) {
      throw new AppError(400, 'INVALID_TARGET_ACCOUNT', message, [{ field, issue }]);
    }
  });
}

/**
 * BR-14, BR-16, BR-06: the source must be an active Cash or Loan Taken account, and each
 * line target (in line order) must be active, differ from the source, and be allowed for it.
 */
export function checkPaymentAccounts(source: RuleAccount, targets: readonly RuleAccount[]): void {
  if (source.isArchived) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Archived accounts cannot record new transactions', [
      { field: 'accountId', issue: 'account must not be archived' },
    ]);
  }

  const allowedTargets = PAYMENT_TARGETS[source.type];
  if (!allowedTargets) {
    throw new AppError(400, 'INVALID_SOURCE_ACCOUNT', 'A payment must be made from a Cash or Loan Taken account', [
      { field: 'accountId', issue: 'source account type must be CASH or LOAN_TAKEN' },
    ]);
  }

  checkTargets(source, targets, allowedTargets, 'A line targets an account this payment cannot use');
}

/**
 * BR-14, BR-16, BR-06: the receiving account must be an active Cash account, and each
 * line target (in line order) must be active, differ from the source, and be allowed for it.
 */
export function checkReceiptAccounts(source: RuleAccount, targets: readonly RuleAccount[]): void {
  if (source.isArchived) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Archived accounts cannot record new transactions', [
      { field: 'accountId', issue: 'account must not be archived' },
    ]);
  }

  const allowedTargets = RECEIPT_TARGETS[source.type];
  if (!allowedTargets) {
    throw new AppError(400, 'INVALID_SOURCE_ACCOUNT', 'A receipt must be received into a Cash account', [
      { field: 'accountId', issue: 'source account type must be CASH' },
    ]);
  }

  checkTargets(source, targets, allowedTargets, 'A line targets an account this receipt cannot use');
}

/** One Payment or Receipt version to check: the accounts are already loaded and owned by the caller. */
export interface TransactionVersion {
  kind: 'PAYMENT' | 'RECEIPT';
  source: RuleAccount;
  /** One per line, in line order. */
  targets: readonly RuleAccount[];
  /** YYYY-MM-DD */
  txnDate: string;
  totalAmount: bigint;
  amounts: readonly bigint[];
}

/** What an edited transaction was saved with (f-13 S2-D6). */
export interface SavedVersion {
  accountId: string;
  /** YYYY-MM-DD */
  txnDate: string;
  targetIds: ReadonlySet<string>;
}

/**
 * F-05/F-06 create and F-13 edit share this check (f-13 §1 steps 6 to 10): archived source
 * (BR-14), source type (BR-16), targets (BR-06), future date and the 90-day window (BR-10),
 * then the allocation sum (BR-05). With `saved` (an edit, S2-D6), an account archived since
 * may stay in the role it was saved in, and an unchanged date is exempt from the 90-day window.
 */
export function checkTransactionVersion(version: TransactionVersion, saved?: SavedVersion, now: Date = new Date()): void {
  const keptSource = saved !== undefined && version.source.id === saved.accountId;
  const source = keptSource ? { ...version.source, isArchived: false } : version.source;
  const targets = version.targets.map((target) =>
    saved?.targetIds.has(target.id) ? { ...target, isArchived: false } : target
  );
  if (version.kind === 'PAYMENT') {
    checkPaymentAccounts(source, targets);
  } else {
    checkReceiptAccounts(source, targets);
  }

  if (isFutureDate(version.txnDate, DEFAULT_TIME_ZONE, now)) {
    throw new AppError(400, 'FUTURE_DATE_NOT_ALLOWED', 'Date cannot be later than today in Bangkok time', [
      { field: 'txnDate', issue: 'date must not be later than today in Bangkok time' },
    ]);
  }
  const dateUnchanged = saved !== undefined && version.txnDate === saved.txnDate;
  if (!dateUnchanged && isBeforeBackdateLimit(version.txnDate, DEFAULT_TIME_ZONE, now)) {
    throw new AppError(400, 'DATE_TOO_OLD', 'Date cannot be more than 90 days before today in Bangkok time', [
      { field: 'txnDate', issue: 'date must not be more than 90 days before today in Bangkok time' },
    ]);
  }

  checkAllocationSum(version.totalAmount, version.amounts);
}
