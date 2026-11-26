/**
 * F-09 account rules (pure): no database, no I/O.
 */
import type { AccountSubtype, AccountType } from '@prisma/client';

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
