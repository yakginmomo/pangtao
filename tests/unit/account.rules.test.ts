import { describe, it, expect } from 'vitest';
import type { AccountSubtype, AccountType } from '@prisma/client';
import { isValidSubtype } from '../../server/src/services/account.rules.js';

const TYPES: AccountType[] = ['CASH', 'LOAN_TAKEN', 'LOAN_GIVEN', 'INCOME', 'EXPENSE'];
const SUBTYPES: AccountSubtype[] = ['WALLET', 'BANK', 'CREDIT_CARD', 'OTHER'];

// BR-14, f-09 §1: the only valid (type, subtype) pairs with a subtype present.
const VALID_PAIRS = new Set(['CASH:WALLET', 'CASH:BANK', 'LOAN_TAKEN:CREDIT_CARD', 'LOAN_TAKEN:OTHER']);

describe('F-09 Account Management (unit rules)', () => {
  it('TEST-09.2 (AC-09.2): the subtype rule accepts exactly the pairs in the contract and any type without a subtype', () => {
    for (const type of TYPES) {
      expect(isValidSubtype(type, null), `${type} with null`).toBe(true);
      expect(isValidSubtype(type, undefined), `${type} with undefined`).toBe(true);
      for (const subtype of SUBTYPES) {
        expect(isValidSubtype(type, subtype), `${type}:${subtype}`).toBe(VALID_PAIRS.has(`${type}:${subtype}`));
      }
    }
  });
});
