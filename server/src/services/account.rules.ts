/**
 * F-09 account rules (pure): no database, no I/O.
 */
import { Prisma } from '@prisma/client';
import type { AccountSubtype, AccountType } from '@prisma/client';
import { AppError } from '../middleware/error.middleware.js';

/**
 * BR-14: the subtypes each account type may carry. A type missing from this table, or a
 * `null` subtype, means "no subtype". Mirrors the `accounts_subtype_valid` CHECK constraint
 * from migration 20261111213027_accounts_ledger, which stays the database backstop.
 */
const VALID_SUBTYPES: Readonly<Partial<Record<AccountType, readonly AccountSubtype[]>>> = {
  CASH: ['WALLET', 'BANK'],
  LOAN_TAKEN: ['CREDIT_CARD', 'OTHER'],
};

/** BR-14: a missing subtype is always valid; otherwise it must belong to the type. */
export function isValidSubtype(type: AccountType, subtype: AccountSubtype | null | undefined): boolean {
  if (subtype === null || subtype === undefined) return true;
  return VALID_SUBTYPES[type]?.includes(subtype) ?? false;
}

/** BR-14: names are unique per user. The details name the field so the form can show it under Name. */
export function accountNameExistsError(): AppError {
  return new AppError(409, 'ACCOUNT_NAME_EXISTS', 'You already have an account with this name', [
    { field: 'name', issue: 'an account with this name already exists' },
  ]);
}

/** True when a Prisma unique-violation `meta.target` (column names or the index name) includes `name`. */
function targetsName(target: unknown): boolean {
  if (Array.isArray(target)) return target.includes('name');
  if (typeof target === 'string') return target.includes('name');
  return false;
}

/**
 * The `(user_id, name)` unique index is the race-safe guard behind the name check: a concurrent
 * duplicate must be a 409, never a 500. Only a violation on that index is mapped; any other
 * error, including a unique violation on another key, is returned unchanged.
 */
export function mapDuplicateName(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && targetsName(error.meta?.target)) {
    return accountNameExistsError();
  }
  return error;
}
