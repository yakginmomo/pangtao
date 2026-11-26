import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import type { AccountSubtype, AccountType } from '@prisma/client';
import { AppError } from '../../server/src/middleware/error.middleware.js';
import { isValidSubtype, mapDuplicateName } from '../../server/src/services/account.rules.js';

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

  it('a unique violation on the (user_id, name) index becomes 409 ACCOUNT_NAME_EXISTS; any other error is returned unchanged (f-09 §1)', () => {
    const violation = (target: unknown) =>
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target },
      });

    for (const target of [['user_id', 'name'], ['userId', 'name'], 'accounts_user_id_name_key']) {
      const mapped = mapDuplicateName(violation(target));
      expect(mapped, JSON.stringify(target)).toBeInstanceOf(AppError);
      expect(mapped).toMatchObject({ statusCode: 409, code: 'ACCOUNT_NAME_EXISTS' });
    }

    // A unique violation on some other key, or without a target, is not a duplicate name.
    for (const other of [violation(['email']), violation(undefined), violation('users_email_key')]) {
      expect(mapDuplicateName(other)).toBe(other);
    }
    const foreignKey = new Prisma.PrismaClientKnownRequestError('Foreign key failed', { code: 'P2003', clientVersion: 'test' });
    const plain = new Error('boom');
    expect(mapDuplicateName(foreignKey)).toBe(foreignKey);
    expect(mapDuplicateName(plain)).toBe(plain);
  });
});
