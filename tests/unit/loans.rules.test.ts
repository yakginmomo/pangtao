import { describe, it, expect } from 'vitest';
import type { AccountType } from '@prisma/client';
import { checkPaymentAccounts, checkReceiptAccounts, RuleAccount } from '../../server/src/services/allocation.rules.js';
import { AppError } from '../../server/src/middleware/error.middleware.js';
import type { LedgerAccount, LedgerTransaction } from '../../server/src/services/balance.engine.js';
import { computeIncomeExpense } from '../../server/src/services/summary.engine.js';

// Pure rules only: no database, no network (STS level U).

let nextId = 0;
const account = (type: AccountType, isArchived = false): RuleAccount => ({ id: `acc-${++nextId}`, type, isArchived });

/** The AppError code thrown by `fn`, or null when it does not throw. */
function thrownCode(fn: () => void): string | null {
  try {
    fn();
    return null;
  } catch (error) {
    if (error instanceof AppError) return error.code;
    throw error;
  }
}

describe('F-10 Loans (unit rules)', () => {
  it('TEST-10.1 (AC-10.1): the Payment matrix accepts Cash → Loan Given (lending)', () => {
    expect(thrownCode(() => checkPaymentAccounts(account('CASH'), [account('LOAN_GIVEN')]))).toBeNull();
  });

  it('TEST-10.2 (AC-10.2): the Receipt matrix accepts Cash ← Loan Given (repayment received)', () => {
    expect(thrownCode(() => checkReceiptAccounts(account('CASH'), [account('LOAN_GIVEN')]))).toBeNull();
  });

  it('TEST-10.3 (AC-10.3): the Receipt matrix accepts Cash ← Loan Taken (borrowing, including a card)', () => {
    expect(thrownCode(() => checkReceiptAccounts(account('CASH'), [account('LOAN_TAKEN')]))).toBeNull();
  });

  it('TEST-10.6 (AC-10.6): a card source still accepts Expense lines only (Q-1), an archived loan target is rejected, and Loan Given is never a source', () => {
    for (const target of ['LOAN_GIVEN', 'CASH', 'LOAN_TAKEN', 'INCOME'] as const) {
      expect(thrownCode(() => checkPaymentAccounts(account('LOAN_TAKEN'), [account(target)])), `card → ${target}`).toBe(
        'INVALID_TARGET_ACCOUNT'
      );
    }
    expect(thrownCode(() => checkPaymentAccounts(account('CASH'), [account('LOAN_GIVEN', true)]))).toBe('INVALID_TARGET_ACCOUNT');
    expect(thrownCode(() => checkReceiptAccounts(account('CASH'), [account('LOAN_TAKEN', true)]))).toBe('INVALID_TARGET_ACCOUNT');
    expect(thrownCode(() => checkPaymentAccounts(account('LOAN_GIVEN'), [account('EXPENSE')]))).toBe('INVALID_SOURCE_ACCOUNT');
    expect(thrownCode(() => checkReceiptAccounts(account('LOAN_GIVEN'), [account('INCOME')]))).toBe('INVALID_SOURCE_ACCOUNT');
    // The form-crossing rows stay invalid: a Receipt never targets Expense, a Payment never targets Income.
    expect(thrownCode(() => checkReceiptAccounts(account('CASH'), [account('EXPENSE')]))).toBe('INVALID_TARGET_ACCOUNT');
    expect(thrownCode(() => checkPaymentAccounts(account('CASH'), [account('INCOME')]))).toBe('INVALID_TARGET_ACCOUNT');
  });

  it('TEST-10.5 (AC-10.5): the summary engine ignores Loan Given and Loan Taken lines on both forms', () => {
    const accounts: LedgerAccount[] = [
      { id: 'bank', type: 'CASH' },
      { id: 'card', type: 'LOAN_TAKEN' },
      { id: 'mom', type: 'LOAN_TAKEN' },
      { id: 'bob', type: 'LOAN_GIVEN' },
      { id: 'salary', type: 'INCOME' },
      { id: 'dining', type: 'EXPENSE' },
    ];
    const txn = (kind: LedgerTransaction['kind'], accountId: string, targetAccountId: string, amount: bigint): LedgerTransaction => ({
      kind,
      accountId,
      totalAmount: amount,
      voidedAt: null,
      lines: [{ targetAccountId, amount }],
    });
    const base = [txn('RECEIPT', 'bank', 'salary', 3_000_000n), txn('PAYMENT', 'card', 'dining', 120_000n)];
    const loans = [
      txn('PAYMENT', 'bank', 'bob', 200_000n), // lend
      txn('RECEIPT', 'bank', 'bob', 50_000n), // repayment received
      txn('RECEIPT', 'bank', 'mom', 500_000n), // borrow
      txn('RECEIPT', 'bank', 'card', 30_000n), // card cash advance
      txn('PAYMENT', 'bank', 'mom', 100_000n), // repay
    ];

    expect(computeIncomeExpense(accounts, [...base, ...loans])).toEqual(computeIncomeExpense(accounts, base));
    expect(computeIncomeExpense(accounts, [...base, ...loans])).toEqual({ income: 3_000_000n, expense: 120_000n, net: 2_880_000n });
  });
});
