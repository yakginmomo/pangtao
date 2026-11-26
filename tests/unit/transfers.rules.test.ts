import { describe, it, expect } from 'vitest';
import type { AccountType } from '@prisma/client';
import { checkPaymentAccounts, checkReceiptAccounts, RuleAccount } from '../../server/src/services/allocation.rules.js';
import { AppError } from '../../server/src/middleware/error.middleware.js';
import {
  accountingInvariant,
  computeBalances,
  type LedgerAccount,
  type LedgerTransaction,
} from '../../server/src/services/balance.engine.js';
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

describe('F-11 Transfers (unit rules)', () => {
  it('TEST-11.1 (AC-11.1): the Payment matrix accepts Cash → another Cash account (transfer out)', () => {
    expect(thrownCode(() => checkPaymentAccounts(account('CASH'), [account('CASH')]))).toBeNull();
  });

  it('TEST-11.2 (AC-11.2): the Receipt matrix accepts Cash ← another Cash account (transfer in)', () => {
    expect(thrownCode(() => checkReceiptAccounts(account('CASH'), [account('CASH')]))).toBeNull();
  });

  it('TEST-11.5 (AC-11.5): the source as its own target, an archived Cash target and a card source with a Cash line are rejected', () => {
    const bank = account('CASH');
    expect(thrownCode(() => checkPaymentAccounts(bank, [bank]))).toBe('INVALID_TARGET_ACCOUNT');
    expect(thrownCode(() => checkReceiptAccounts(bank, [bank]))).toBe('INVALID_TARGET_ACCOUNT');
    expect(thrownCode(() => checkPaymentAccounts(bank, [account('CASH', true)]))).toBe('INVALID_TARGET_ACCOUNT');
    expect(thrownCode(() => checkReceiptAccounts(bank, [account('CASH', true)]))).toBe('INVALID_TARGET_ACCOUNT');
    expect(thrownCode(() => checkPaymentAccounts(account('LOAN_TAKEN'), [account('CASH')]))).toBe('INVALID_TARGET_ACCOUNT');
  });

  it('TEST-11.4 (AC-11.4): the balance engine and the summary engine agree on a ledger with transfers: net worth = openings + income − expense', () => {
    const accounts: LedgerAccount[] = [
      { id: 'bank', type: 'CASH' },
      { id: 'wallet', type: 'CASH' },
      { id: 'card', type: 'LOAN_TAKEN' },
      { id: 'salary', type: 'INCOME' },
      { id: 'dining', type: 'EXPENSE' },
      { id: 'groceries', type: 'EXPENSE' },
    ];
    const txn = (kind: LedgerTransaction['kind'], accountId: string, totalAmount: bigint, lines: Array<[string, bigint]> = []): LedgerTransaction => ({
      kind,
      accountId,
      totalAmount,
      voidedAt: null,
      lines: lines.map(([targetAccountId, amount]) => ({ targetAccountId, amount })),
    });
    const journey = [
      txn('OPENING_BALANCE', 'bank', 5_000_000n),
      txn('RECEIPT', 'bank', 3_000_000n, [['salary', 3_000_000n]]),
      txn('PAYMENT', 'card', 120_000n, [['dining', 70_000n], ['groceries', 50_000n]]),
      txn('PAYMENT', 'bank', 80_000n, [['card', 80_000n]]),
    ];
    const transfers = [
      txn('PAYMENT', 'bank', 1_000_000n, [['wallet', 1_000_000n]]), // transfer out
      txn('RECEIPT', 'bank', 150_000n, [['wallet', 150_000n]]), // transfer in
      txn('PAYMENT', 'bank', 150_000n, [['wallet', 100_000n], ['dining', 50_000n]]), // mixed
    ];
    const ledger = [...journey, ...transfers];

    const balances = computeBalances(accounts, ledger);
    expect(balances.get('bank')).toBe(5_000_000n + 3_000_000n - 80_000n - 1_000_000n + 150_000n - 150_000n);
    expect(balances.get('wallet')).toBe(1_000_000n - 150_000n + 100_000n);

    const summary = computeIncomeExpense(accounts, ledger);
    // Only the mixed Payment's Dining line is new spending; the transfer lines are not income or expense.
    expect(summary).toEqual({ income: 3_000_000n, expense: 170_000n, net: 2_830_000n });

    const rows = accounts.map((a) => ({
      type: a.type,
      balance: balances.get(a.id)!,
      openingAmount: a.id === 'bank' ? 5_000_000n : 0n,
    }));
    const { netWorth, expected } = accountingInvariant(rows);
    expect(netWorth).toBe(expected);
    expect(netWorth).toBe(5_000_000n + summary.income - summary.expense);
  });
});
