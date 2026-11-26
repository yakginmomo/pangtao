import { describe, it, expect } from 'vitest';
import type { AccountType } from '@prisma/client';
import {
  checkTransactionVersion,
  type RuleAccount,
  type SavedVersion,
  type TransactionVersion,
} from '../../server/src/services/allocation.rules.js';
import { AppError } from '../../server/src/middleware/error.middleware.js';
import {
  accountingInvariant,
  computeBalances,
  type BalanceSheetRow,
  type LedgerAccount,
  type LedgerTransaction,
} from '../../server/src/services/balance.engine.js';

// Pure functions only: no database, no network (STS level U).

// A fixed "now" so every date is relative to one Bangkok day: 15 Jun 2026, 12:00 in Bangkok.
const NOW = new Date('2026-06-15T05:00:00.000Z');
const TODAY = '2026-06-15';
const TOMORROW = '2026-06-16';
const T_MINUS_91 = '2026-03-16';
const T_MINUS_100 = '2026-03-07';
const T_MINUS_120 = '2026-02-15';

const account = (id: string, type: AccountType, isArchived = false): RuleAccount => ({ id, type, isArchived });

const card = account('card', 'LOAN_TAKEN');
const bank = account('bank', 'CASH');
const salary = account('salary', 'INCOME');
const dining = account('dining', 'EXPENSE');
const groceries = account('groceries', 'EXPENSE');

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

/** The starting state's card charge: Credit Card 1,200.00 THB, Dining 700.00 + Groceries 500.00. */
const charge: TransactionVersion = {
  kind: 'PAYMENT',
  source: card,
  targets: [dining, groceries],
  txnDate: TODAY,
  totalAmount: 120_000n,
  amounts: [70_000n, 50_000n],
};

/** What the charge was saved with. */
const chargeSaved: SavedVersion = { accountId: 'card', txnDate: TODAY, targetIds: new Set(['dining', 'groceries']) };

const check = (version: TransactionVersion, saved?: SavedVersion) => thrownCode(() => checkTransactionVersion(version, saved, NOW));

describe('F-13 Edit and void transactions (STS)', () => {
  it('TEST-13.3 (AC-13.3): the shared validator returns the same error for create and edit', () => {
    const telecomArchived = account('telecom', 'EXPENSE', true);
    const cases: Array<[string, TransactionVersion, string | null]> = [
      ['valid version', charge, null],
      ['lines summing to 1,000.00 of 1,200.00', { ...charge, targets: [dining], amounts: [100_000n] }, 'INVALID_ALLOCATION_SUM'],
      ['a line to Salary', { ...charge, targets: [salary], amounts: [120_000n] }, 'INVALID_TARGET_ACCOUNT'],
      ['source Salary', { ...charge, source: salary }, 'INVALID_SOURCE_ACCOUNT'],
      ["tomorrow's date", { ...charge, txnDate: TOMORROW }, 'FUTURE_DATE_NOT_ALLOWED'],
      ['date T−91', { ...charge, txnDate: T_MINUS_91 }, 'DATE_TOO_OLD'],
      [
        'a new line to an archived account',
        { ...charge, targets: [dining, telecomArchived], amounts: [70_000n, 50_000n] },
        'INVALID_TARGET_ACCOUNT',
      ],
    ];

    for (const [label, version, code] of cases) {
      expect(check(version), `create: ${label}`).toBe(code);
      expect(check(version, chargeSaved), `edit: ${label}`).toBe(code);
    }
  });

  it('TEST-13.3 (AC-13.3): the checks run in the contract order (archived source, source type, targets, dates, sum)', () => {
    const archivedIncome = account('old-income', 'INCOME', true);
    // Several rules broken at once: the first one in f-13 §1 order wins.
    expect(check({ ...charge, source: archivedIncome, txnDate: TOMORROW, amounts: [1n, 1n] })).toBe('VALIDATION_ERROR');
    expect(check({ ...charge, source: salary, txnDate: TOMORROW, amounts: [1n, 1n] })).toBe('INVALID_SOURCE_ACCOUNT');
    expect(check({ ...charge, targets: [salary, groceries], txnDate: TOMORROW, amounts: [1n, 1n] })).toBe('INVALID_TARGET_ACCOUNT');
    expect(check({ ...charge, txnDate: TOMORROW, amounts: [1n, 1n] })).toBe('FUTURE_DATE_NOT_ALLOWED');
    expect(check({ ...charge, txnDate: T_MINUS_91, amounts: [1n, 1n] })).toBe('DATE_TOO_OLD');
  });

  it('TEST-13.4 (AC-13.4): only an unchanged date is exempt from the 90-day window', () => {
    const telecom = account('telecom', 'EXPENSE');
    const old: TransactionVersion = { kind: 'PAYMENT', source: bank, targets: [telecom], txnDate: T_MINUS_120, totalAmount: 12_000n, amounts: [12_000n] };
    const oldSaved: SavedVersion = { accountId: 'bank', txnDate: T_MINUS_120, targetIds: new Set(['telecom']) };

    expect(check(old, oldSaved)).toBeNull(); // date unchanged
    expect(check(old)).toBe('DATE_TOO_OLD'); // a new transaction on that date
    expect(check({ ...old, txnDate: T_MINUS_100 }, oldSaved)).toBe('DATE_TOO_OLD'); // changed to another old date
    expect(check({ ...old, txnDate: TODAY }, oldSaved)).toBeNull(); // moved into the window
  });

  it('TEST-13.4 (AC-13.4): an archived account is exempt only in the role it was saved in', () => {
    const electricityArchived = account('electricity', 'EXPENSE', true);
    const payment: TransactionVersion = {
      kind: 'PAYMENT',
      source: bank,
      targets: [electricityArchived],
      txnDate: TODAY,
      totalAmount: 5_000n,
      amounts: [5_000n],
    };
    const paymentSaved: SavedVersion = { accountId: 'bank', txnDate: TODAY, targetIds: new Set(['electricity']) };

    expect(check(payment, paymentSaved)).toBeNull(); // kept as a target
    expect(check(payment)).toBe('INVALID_TARGET_ACCOUNT'); // newly chosen
    // Moved from the target role into the source role: newly chosen, so BR-14 applies.
    expect(check({ ...payment, source: electricityArchived }, paymentSaved)).toBe('VALIDATION_ERROR');

    // A saved source archived since may stay the source, but not become a target.
    const bankArchived = account('bank', 'CASH', true);
    const fromArchived: TransactionVersion = { ...payment, source: bankArchived, targets: [dining] };
    const fromArchivedSaved: SavedVersion = { accountId: 'bank', txnDate: TODAY, targetIds: new Set(['dining']) };
    expect(check(fromArchived, fromArchivedSaved)).toBeNull();
    expect(check(fromArchived)).toBe('VALIDATION_ERROR');
    const wallet = account('wallet', 'CASH');
    expect(check({ ...payment, source: wallet, targets: [bankArchived] }, fromArchivedSaved)).toBe('INVALID_TARGET_ACCOUNT');
  });

  it('TEST-13.9 (AC-13.9): the balance engine uses the edited lines, ignores the voided row, and the invariant holds', () => {
    const accounts: LedgerAccount[] = [
      { id: 'bank', type: 'CASH' },
      { id: 'card', type: 'LOAN_TAKEN' },
      { id: 'salary', type: 'INCOME' },
      { id: 'dining', type: 'EXPENSE' },
      { id: 'groceries', type: 'EXPENSE' },
    ];
    const txn = (
      kind: LedgerTransaction['kind'],
      accountId: string,
      totalAmount: bigint,
      lines: Array<[string, bigint]> = [],
      voidedAt: Date | null = null
    ): LedgerTransaction => ({ kind, accountId, totalAmount, voidedAt, lines: lines.map(([targetAccountId, amount]) => ({ targetAccountId, amount })) });
    // TEST-13.1 then TEST-13.5: the card charge edited to 1,400.00 (Dining 900.00), the repayment voided.
    const ledger: LedgerTransaction[] = [
      txn('OPENING_BALANCE', 'bank', 5_000_000n),
      txn('RECEIPT', 'bank', 3_000_000n, [['salary', 3_000_000n]]),
      txn('PAYMENT', 'card', 140_000n, [
        ['dining', 90_000n],
        ['groceries', 50_000n],
      ]),
      txn('PAYMENT', 'bank', 80_000n, [['card', 80_000n]], new Date('2026-06-15T06:00:00Z')),
    ];

    const balances = computeBalances(accounts, ledger);
    expect(balances.get('bank')).toBe(8_000_000n);
    expect(balances.get('card')).toBe(140_000n);
    const rows: BalanceSheetRow[] = accounts.map((a) => ({
      type: a.type,
      balance: balances.get(a.id)!,
      openingAmount: a.id === 'bank' ? 5_000_000n : 0n,
    }));
    const { netWorth, expected } = accountingInvariant(rows);
    expect(netWorth).toBe(7_860_000n);
    expect(expected).toBe(7_860_000n);
    expect(netWorth - expected).toBe(0n);
  });
});
