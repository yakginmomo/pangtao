import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { Icon } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { accountsQueryKey, fetchAccounts } from '../api/accounts.api';
import { createTransaction, fetchTransaction, transactionsQueryKey, updateTransaction } from '../api/transactions.api';
import { invalidateLedgerQueries } from '../api/ledger-cache';
import { errorCode, errorMessage } from '../api/http';
import { Account, AccountType } from '../types/account.types';
import { ApiErrorResponse } from '../types/auth.types';
import { CreateTransactionInput, HistoryTransaction } from '../types/transaction.types';
import { formatSatang, parseThbToSatang } from '../utils/money';
import { addCalendarDays, BACKDATE_LIMIT_DAYS, formatCalendarDate, isBeforeBackdateLimit, isFutureDate } from '../utils/date';
import { useBangkokToday } from '../hooks/useBangkokToday';
import { colors, font, radius, space } from '../styles/theme';

/** BR-04: 100,000,000.00 THB in integer satang. */
const MAX_AMOUNT_SATANG = 10_000_000_000;

type Mode = 'PAYMENT' | 'RECEIPT';

/**
 * BR-06 / BR-16 matrices (Sprint 2 README §2.2), mirrored from the server so the form only
 * offers valid choices; the order is the order of the target groups. The server stays
 * authoritative. A Loan Taken (card) source accepts Expense lines only (Q-1).
 */
const PAYMENT_TARGETS: Partial<Record<AccountType, AccountType[]>> = {
  CASH: ['EXPENSE', 'LOAN_TAKEN', 'LOAN_GIVEN', 'CASH'],
  LOAN_TAKEN: ['EXPENSE'],
};

const RECEIPT_TARGETS: Partial<Record<AccountType, AccountType[]>> = {
  CASH: ['INCOME', 'LOAN_GIVEN', 'LOAN_TAKEN', 'CASH'],
};

interface ModeConfig {
  sourceTypes: AccountType[];
  targets: Partial<Record<AccountType, AccountType[]>>;
  sourceGroups: Array<{ type: AccountType; label: string }>;
  sourceLabel: string;
  detailsLabel: string;
  submitLabel: string;
  errorFallback: string;
  emptyMessage: string;
  targetHint: string;
  /** f-10 §2.2: what a line to each target type means on this form. */
  targetGroupLabel: Partial<Record<AccountType, string>>;
}

const MODE_CONFIG: Record<Mode, ModeConfig> = {
  PAYMENT: {
    sourceTypes: ['CASH', 'LOAN_TAKEN'],
    targets: PAYMENT_TARGETS,
    sourceGroups: [
      { type: 'CASH', label: 'Cash' },
      { type: 'LOAN_TAKEN', label: 'Credit cards and loans (charge)' },
    ],
    sourceLabel: 'Paid from',
    detailsLabel: 'Payment details',
    submitLabel: 'Save payment',
    errorFallback: 'Unable to save the payment. Please try again.',
    emptyMessage: 'You have no active Cash or Credit Card account to pay from.',
    targetHint: 'Choose the account you paid from to see where the money can go.',
    targetGroupLabel: { EXPENSE: 'Expenses', LOAN_TAKEN: 'Loan repayment', LOAN_GIVEN: 'Lend', CASH: 'Transfer to' },
  },
  RECEIPT: {
    sourceTypes: ['CASH'],
    targets: RECEIPT_TARGETS,
    sourceGroups: [{ type: 'CASH', label: 'Cash' }],
    sourceLabel: 'Received into',
    detailsLabel: 'Receipt details',
    submitLabel: 'Save receipt',
    errorFallback: 'Unable to save the receipt. Please try again.',
    emptyMessage: 'You have no active Cash account to receive money into.',
    targetHint: 'Choose the Cash account that received the money to see where it can be allocated.',
    targetGroupLabel: { INCOME: 'Income', LOAN_GIVEN: 'Repayment received', LOAN_TAKEN: 'Borrow', CASH: 'Transfer from' },
  },
};

interface LineDraft {
  key: number;
  targetAccountId: string;
  amount: string;
  note: string;
}

type FieldErrors = Record<string, string>;

/** Stable React keys for line rows, so removing a row never reuses another row's inputs. */
let lineKeySeq = 0;
const newLine = (): LineDraft => ({ key: ++lineKeySeq, targetAccountId: '', amount: '', note: '' });

/** Satang as the plain THB text the inputs hold: `120000` → `1200.00`. */
const satangToInput = (satang: number): string => formatSatang(satang).replace(/[,\s฿]/g, '');

/** A version in the shape both forms compare and send, so "unchanged" means the same request. */
function versionKey(v: { accountId: string; txnDate: string; totalAmount: number | null; memo: string | null; lines: Array<{ targetAccountId: string; amount: number | null; note: string | null }> }): string {
  return JSON.stringify([v.accountId, v.txnDate, v.totalAmount, v.memo, v.lines.map((l) => [l.targetAccountId, l.amount, l.note])]);
}

/** A THB input as positive satang within BR-04, or null. */
function positiveSatang(input: string): number | null {
  const satang = parseThbToSatang(input);
  return satang !== null && satang > 0 && satang <= MAX_AMOUNT_SATANG ? satang : null;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: space[2],
  fontSize: font.size.sm,
  fontWeight: font.weight.medium,
  color: colors.textSecondary,
};

const cardStyle: React.CSSProperties = {
  borderRadius: radius.xl,
  padding: space[5],
  minWidth: 0,
};

const fieldGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
  gap: space[4],
};

const secondaryButton: React.CSSProperties = {
  padding: '0.45rem 0.9rem',
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.porcelain,
  color: colors.textPrimary,
  fontWeight: font.weight.medium,
  cursor: 'pointer',
};

const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) =>
  message ? (
    <span id={id} data-testid={id} role="alert" className="pt-field-error" style={{ marginTop: space[1] }}>
      {message}
    </span>
  ) : null;

export const FormSkeleton: React.FC = () => (
  <div data-testid="transaction-form-skeleton" role="status" aria-live="polite" aria-label="Loading accounts" className="pt-card" style={cardStyle}>
    {[60, 85, 70].map((width) => (
      <span
        key={width}
        style={{
          display: 'block',
          height: '0.85rem',
          width: `${width}%`,
          borderRadius: radius.full,
          backgroundColor: '#E8E2D6',
          marginBottom: space[3],
        }}
      />
    ))}
  </div>
);

/** f-05 §2.2 / f-06 §2.2 / f-15 §2.2: `/transactions/new` and `/transactions/new?duplicateOf=:id`. */
export const NewTransactionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const duplicateOf = searchParams.get('duplicateOf');
  const { refetchUser } = useAuth();

  const duplicateQuery = useQuery({
    queryKey: [...transactionsQueryKey, 'detail', duplicateOf],
    queryFn: () => fetchTransaction(duplicateOf!),
    enabled: duplicateOf !== null && duplicateOf !== '',
  });

  const dupCode = errorCode(duplicateQuery.error);
  useEffect(() => {
    if (dupCode === 'UNAUTHENTICATED') void refetchUser();
  }, [dupCode, refetchUser]);

  if (!duplicateOf) {
    return <TransactionForm />;
  }

  if (dupCode === 'NOT_FOUND' || dupCode === 'VALIDATION_ERROR') {
    return <TransactionForm key="dup-not-found" duplicateNotice="Transaction not found." />;
  }

  if (duplicateQuery.isError && !duplicateQuery.data) {
    return (
      <AppShell>
        <ErrorBanner
          message={errorMessage(duplicateQuery.error, 'Unable to load the transaction to duplicate. Please try again.')}
          onRetry={() => void duplicateQuery.refetch()}
        />
      </AppShell>
    );
  }

  if (!duplicateQuery.data) {
    return (
      <AppShell>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <FormSkeleton />
        </div>
      </AppShell>
    );
  }

  if (duplicateQuery.data.kind === 'OPENING_BALANCE') {
    return <TransactionForm key={`dup-opening-${duplicateQuery.data.id}`} duplicateNotice="Opening balances cannot be duplicated." />;
  }

  return (
    <TransactionForm
      key={`dup-${duplicateQuery.data.id}-${duplicateQuery.data.updatedAt}`}
      duplicate={duplicateQuery.data}
    />
  );
};

/**
 * The Payment / Receive form.
 * - With `existing` (f-13 §2.2): edit mode — kind fixed, saved archived accounts allowed in
 *   their saved role and unchanged old date accepted (S2-D6), Save waits for a change.
 * - With `duplicate` (f-15 §2.2): duplicate mode — kind/tab switchable, date defaults to today,
 *   archived accounts flagged and block Save until replaced, Save creates a new transaction.
 */
export const TransactionForm: React.FC<{
  existing?: HistoryTransaction;
  duplicate?: HistoryTransaction;
  duplicateNotice?: string;
}> = ({ existing, duplicate, duplicateNotice }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();
  const accountsQuery = useQuery({ queryKey: accountsQueryKey, queryFn: fetchAccounts });

  const initial = existing ?? duplicate;
  // f-10 §2.2: the Loans page opens the form on a tab with ?tab=payment|receive.
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(() =>
    initial ? (initial.kind === 'RECEIPT' ? 'RECEIPT' : 'PAYMENT') : searchParams.get('tab') === 'receive' ? 'RECEIPT' : 'PAYMENT'
  );
  const [sourceId, setSourceId] = useState(initial?.accountId ?? '');
  // null until the user picks a date: the default then follows today, even across midnight (L7-01).
  // In duplicate mode, date always starts as today (f-15 Q-10).
  const [typedDate, setTypedDate] = useState<string | null>(existing?.txnDate ?? null);
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [total, setTotal] = useState(initial ? satangToInput(initial.totalAmount) : '');
  const [lines, setLines] = useState<LineDraft[]>(() =>
    initial && initial.lines.length > 0
      ? initial.lines.map((line) => ({
          key: ++lineKeySeq,
          targetAccountId: line.targetAccountId,
          amount: satangToInput(line.amount),
          note: line.note ?? '',
        }))
      : [newLine()]
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  // BR-10 window (f-05 §2.2 v1.3), recomputed when the Bangkok day changes while the form is open.
  const today = useBangkokToday();
  const oldest = addCalendarDays(today, -BACKDATE_LIMIT_DAYS);
  const txnDate = typedDate ?? today;
  const config = MODE_CONFIG[mode];
  const testIdPrefix = mode === 'PAYMENT' ? 'payment' : 'receipt';

  // An expired session re-checks the user, and the route guard then sends them to /login.
  const unauthenticated = errorCode(accountsQuery.error) === 'UNAUTHENTICATED';
  useEffect(() => {
    if (unauthenticated) void refetchUser();
  }, [unauthenticated, refetchUser]);

  const mutation = useMutation({
    mutationFn: ({ kind, ...version }: CreateTransactionInput) =>
      existing ? updateTransaction(existing.id, version) : createTransaction({ kind, ...version }),
    onSuccess: async (saved) => {
      await invalidateLedgerQueries(queryClient);
      navigate(existing ? `/transactions/${existing.id}` : duplicate ? `/transactions/${saved.id}` : '/');
    },
    onError: async (error) => {
      const code = errorCode(error);
      if (code === 'UNAUTHENTICATED') {
        await refetchUser();
        return;
      }
      // f-13 §2.2: voided or gone meanwhile. Reloading the transaction makes the edit page show why.
      if (existing && (code === 'TRANSACTION_VOIDED' || code === 'NOT_FOUND')) {
        await invalidateLedgerQueries(queryClient);
        return;
      }
      // Map server details[].field (e.g. `lines.1.amount`) back onto the inputs.
      const details = (error as Partial<ApiErrorResponse>)?.error?.details ?? [];
      const mapped: FieldErrors = {};
      for (const detail of details) {
        if (detail.field) mapped[detail.field] = detail.issue;
      }
      setFieldErrors(mapped);
      setServerError(errorMessage(error, config.errorFallback));
    },
  });

  const accounts: Account[] = accountsQuery.data ?? [];
  // S2-D6 (edit) / f-15 §1 (duplicate): include the original's accounts even if archived, so edit
  // can keep them and duplicate can show & flag them until replaced.
  const savedTargetIds = new Set(initial?.lines.map((line) => line.targetAccountId) ?? []);
  const sources = accounts.filter(
    (a) => (!a.isArchived || a.id === initial?.accountId) && config.sourceTypes.includes(a.type)
  );
  const source = sources.find((a) => a.id === sourceId);
  const allowedTypes = source ? config.targets[source.type] ?? [] : [];
  const targets = accounts.filter(
    (a) => (!a.isArchived || savedTargetIds.has(a.id)) && a.id !== sourceId && allowedTypes.includes(a.type)
  );
  const duplicateArchivedSource = duplicate !== undefined && source?.isArchived === true;
  const duplicateArchivedLines = lines.map(
    (line) => duplicate !== undefined && accounts.find((a) => a.id === line.targetAccountId)?.isArchived === true
  );
  const hasArchivedSelection = duplicateArchivedSource || duplicateArchivedLines.some(Boolean);

  const totalSatang = positiveSatang(total);
  const lineSatang = lines.map((line) => positiveSatang(line.amount));
  // Integer satang arithmetic only (NFR-03); every value is a safe integer.
  const allocated = lineSatang.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
  const remaining = (totalSatang ?? 0) - allocated;

  const linesComplete = lines.every(
    (line, i) => lineSatang[i] !== null && targets.some((t) => t.id === line.targetAccountId)
  );
  // f-13 §2.2: in edit mode, Save waits for a change, judged on the values that would be sent.
  const draftVersion = (): string =>
    versionKey({
      accountId: sourceId,
      txnDate,
      totalAmount: totalSatang,
      memo: memo.trim() || null,
      lines: lines.map((line, i) => ({ targetAccountId: line.targetAccountId, amount: lineSatang[i], note: line.note.trim() || null })),
    });
  const changed =
    !existing ||
    draftVersion() !==
      versionKey({
        accountId: existing.accountId,
        txnDate: existing.txnDate,
        totalAmount: existing.totalAmount,
        memo: existing.memo?.trim() || null,
        lines: existing.lines.map((line) => ({ targetAccountId: line.targetAccountId, amount: line.amount, note: line.note?.trim() || null })),
      });
  // S2-D6: the saved date may stay even when it is now older than T−90.
  const keepsSavedDate = existing !== undefined && txnDate === existing.txnDate;
  const canSubmit =
    !!source &&
    !!txnDate &&
    totalSatang !== null &&
    linesComplete &&
    remaining === 0 &&
    changed &&
    !hasArchivedSelection &&
    !mutation.isPending;

  const clearErrors = () => {
    if (Object.keys(fieldErrors).length > 0) setFieldErrors({});
    if (serverError) setServerError(null);
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    // The two forms have different sources and targets, so start the form clean.
    setSourceId('');
    setTotal('');
    setMemo('');
    setLines([newLine()]);
    setFieldErrors({});
    setServerError(null);
  };

  const updateLine = (key: number, patch: Partial<LineDraft>) => {
    clearErrors();
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const changeSource = (id: string) => {
    clearErrors();
    setSourceId(id);
    // Drop targets the new source cannot use (e.g. a card cannot repay itself).
    const nextSource = sources.find((a) => a.id === id);
    const nextAllowed = nextSource ? config.targets[nextSource.type] ?? [] : [];
    // f-11 §2.2: a line whose target is now the source itself says why its target was cleared.
    const errors: FieldErrors = {};
    setLines(
      lines.map((line, index) => {
        const target = accounts.find((a) => a.id === line.targetAccountId);
        const keep = target && target.id !== id && nextAllowed.includes(target.type);
        if (target && target.id === id) errors[`lines.${index}.targetAccountId`] = 'Choose another account for this line.';
        return keep ? line : { ...line, targetAccountId: '' };
      })
    );
    if (Object.keys(errors).length > 0) setFieldErrors(errors);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !source || totalSatang === null) return;
    if (isFutureDate(txnDate)) {
      setFieldErrors({ txnDate: 'Date cannot be later than today.' });
      return;
    }
    if (!keepsSavedDate && isBeforeBackdateLimit(txnDate)) {
      setFieldErrors({ txnDate: 'Date cannot be more than 90 days ago.' });
      return;
    }
    setFieldErrors({});
    setServerError(null);

    const trimmedMemo = memo.trim();
    mutation.mutate({
      kind: mode,
      accountId: source.id,
      txnDate,
      totalAmount: totalSatang,
      ...(trimmedMemo ? { memo: trimmedMemo } : {}),
      lines: lines.map((line, i) => {
        const note = line.note.trim();
        return { targetAccountId: line.targetAccountId, amount: lineSatang[i]!, ...(note ? { note } : {}) };
      }),
    });
  };

  const inputClass = (field: string) => `pt-glass-input${fieldErrors[field] ? ' pt-glass-input--error' : ''}`;

  const targetGroups = allowedTypes
    .map((type) => ({ type, items: targets.filter((t) => t.type === type) }))
    .filter((group) => group.items.length > 0);

  const remainingLabel =
    remaining === 0 ? 'Fully allocated' : remaining > 0 ? 'Still to allocate' : 'Over-allocated';

  const tabStyle = (active: boolean): React.CSSProperties =>
    active
      ? { ...secondaryButton, backgroundColor: colors.cobalt, color: colors.porcelain, border: 'none' }
      : secondaryButton;

  return (
    <AppShell>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <p style={{ margin: 0, marginBottom: space[2], fontSize: font.size.sm }}>
          <Link
            to={existing ? `/transactions/${existing.id}` : '/'}
            className="pt-icon-link"
            style={{ color: colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: space[1] }}
          >
            <Icon name="arrow_back" size={1.125} />
            <span>{existing ? 'Back to transaction' : 'Back to dashboard'}</span>
          </Link>
        </p>
        <h2 style={{ fontSize: font.size['2xl'], fontWeight: font.weight.semibold, color: colors.textPrimary, marginBottom: space[4] }}>
          {existing ? 'Edit transaction' : duplicate ? 'Duplicate transaction' : 'New transaction'}
        </h2>

        {duplicate && (
          <p data-testid="duplicate-banner" style={{ margin: `-${space[2]} 0 ${space[4]}`, fontSize: font.size.sm, color: colors.textSecondary }}>
            Copied from {duplicate.kind === 'RECEIPT' ? 'Receipt' : 'Payment'} of {formatSatang(duplicate.totalAmount)} on{' '}
            {formatCalendarDate(duplicate.txnDate)}
          </p>
        )}

        {duplicateNotice && (
          <div role="status" data-testid="duplicate-notice" className="pt-error-banner" style={{ marginBottom: space[4] }}>
            {duplicateNotice}
          </div>
        )}

        <div role="tablist" aria-label="Transaction type" style={{ display: 'flex', flexWrap: 'wrap', gap: space[2], marginBottom: space[5] }}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'PAYMENT'}
            data-testid="tab-payment"
            onClick={() => changeMode('PAYMENT')}
            // f-13 §2.2: the kind of a saved transaction cannot change.
            disabled={existing !== undefined}
            style={tabStyle(mode === 'PAYMENT')}
          >
            Payment
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'RECEIPT'}
            data-testid="tab-receipt"
            onClick={() => changeMode('RECEIPT')}
            // f-13 §2.2: the kind of a saved transaction cannot change.
            disabled={existing !== undefined}
            style={tabStyle(mode === 'RECEIPT')}
          >
            Receive
          </button>
        </div>

        {accountsQuery.isError && (
          <ErrorBanner
            message={errorMessage(accountsQuery.error, 'Unable to load your accounts. Please try again.')}
            onRetry={() => void accountsQuery.refetch()}
          />
        )}

        {accountsQuery.isPending || (accountsQuery.isError && accountsQuery.isFetching) ? (
          <FormSkeleton />
        ) : accountsQuery.isSuccess && sources.length === 0 ? (
          <div data-testid="transaction-form-empty" className="pt-card" style={cardStyle}>
            <p style={{ margin: 0, color: colors.textSecondary }}>
              {config.emptyMessage} <Link to="/">Return to the dashboard</Link>.
            </p>
          </div>
        ) : accountsQuery.isSuccess ? (
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: space[5] }}>
            <section className="pt-card" style={cardStyle} aria-label={config.detailsLabel}>
              <div style={fieldGrid}>
                <div>
                  <label htmlFor={`${testIdPrefix}-source`} style={labelStyle}>
                    {config.sourceLabel}
                  </label>
                  <select
                    id={`${testIdPrefix}-source`}
                    data-testid={`${testIdPrefix}-source`}
                    className={inputClass('accountId')}
                    value={sourceId}
                    onChange={(event) => changeSource(event.target.value)}
                  >
                    <option value="">Choose an account</option>
                    {config.sourceGroups.map((group) => (
                      <optgroup key={group.type} label={group.label}>
                        {sources
                          .filter((a) => a.type === group.type)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}{a.isArchived ? ' (archived)' : ''}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <FieldError
                    id={`${testIdPrefix}-source-error`}
                    message={fieldErrors.accountId ?? (duplicateArchivedSource ? 'This account is archived. Choose another account.' : undefined)}
                  />
                </div>

                <div>
                  <label htmlFor={`${testIdPrefix}-date`} style={labelStyle}>
                    Date
                  </label>
                  <input
                    id={`${testIdPrefix}-date`}
                    data-testid={`${testIdPrefix}-date`}
                    className={inputClass('txnDate')}
                    type="date"
                    // An edit keeps a saved date older than T−90 as the value (S2-D6), but the picker
                    // never offers other days before T−90, which submit would reject.
                    min={oldest}
                    max={today}
                    value={txnDate}
                    onChange={(event) => {
                      clearErrors();
                      setTypedDate(event.target.value);
                    }}
                  />
                  <FieldError id={`${testIdPrefix}-date-error`} message={fieldErrors.txnDate} />
                </div>

                <div>
                  <label htmlFor={`${testIdPrefix}-total`} style={labelStyle}>
                    Total amount (THB)
                  </label>
                  <input
                    id={`${testIdPrefix}-total`}
                    data-testid={`${testIdPrefix}-total`}
                    className={inputClass('totalAmount')}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={total}
                    onChange={(event) => {
                      clearErrors();
                      setTotal(event.target.value);
                    }}
                    aria-invalid={total !== '' && totalSatang === null}
                  />
                  <FieldError
                    id={`${testIdPrefix}-total-error`}
                    message={
                      fieldErrors.totalAmount ??
                      (total !== '' && totalSatang === null
                        ? 'Enter an amount from 0.01 to 100,000,000.00 THB.'
                        : undefined)
                    }
                  />
                </div>

                <div>
                  <label htmlFor={`${testIdPrefix}-memo`} style={labelStyle}>
                    Memo (optional)
                  </label>
                  <input
                    id={`${testIdPrefix}-memo`}
                    data-testid={`${testIdPrefix}-memo`}
                    className={inputClass('memo')}
                    type="text"
                    value={memo}
                    onChange={(event) => setMemo(event.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="pt-card" style={cardStyle} aria-labelledby="lines-heading">
              <h3 id="lines-heading" style={{ marginTop: 0, marginBottom: space[4], fontSize: font.size.lg, color: colors.textPrimary }}>
                Allocation lines
              </h3>
              {!source && (
                <p style={{ marginTop: 0, color: colors.textMuted, fontSize: font.size.sm }}>{config.targetHint}</p>
              )}

              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: space[4] }}>
                {lines.map((line, i) => {
                  const amountInvalid = line.amount !== '' && lineSatang[i] === null;
                  return (
                    <li
                      key={line.key}
                      data-testid={`line-${i}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
                        gap: space[3],
                        alignItems: 'start',
                        paddingBottom: space[4],
                        borderBottom: i < lines.length - 1 ? `1px solid ${colors.border}` : 'none',
                      }}
                    >
                      <div>
                        <label htmlFor={`line-target-${i}`} style={labelStyle}>
                          Line {i + 1} account
                        </label>
                        <select
                          id={`line-target-${i}`}
                          data-testid={`line-target-${i}`}
                          className={inputClass(`lines.${i}.targetAccountId`)}
                          value={line.targetAccountId}
                          disabled={!source}
                          onChange={(event) => updateLine(line.key, { targetAccountId: event.target.value })}
                        >
                          <option value="">Choose an account</option>
                          {targetGroups.map((group) => (
                            <optgroup key={group.type} label={config.targetGroupLabel[group.type] ?? group.type}>
                              {group.items.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}{a.isArchived ? ' (archived)' : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <FieldError
                          id={`line-target-${i}-error`}
                          message={
                            fieldErrors[`lines.${i}.targetAccountId`] ??
                            (duplicateArchivedLines[i] ? 'This account is archived. Choose another account.' : undefined)
                          }
                        />
                      </div>

                      <div>
                        <label htmlFor={`line-amount-${i}`} style={labelStyle}>
                          Amount (THB)
                        </label>
                        <input
                          id={`line-amount-${i}`}
                          data-testid={`line-amount-${i}`}
                          className={inputClass(`lines.${i}.amount`)}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="0.00"
                          value={line.amount}
                          onChange={(event) => updateLine(line.key, { amount: event.target.value })}
                          aria-invalid={amountInvalid}
                        />
                        <FieldError
                          id={`line-amount-${i}-error`}
                          message={
                            fieldErrors[`lines.${i}.amount`] ??
                            (amountInvalid ? 'Enter an amount from 0.01 to 100,000,000.00 THB.' : undefined)
                          }
                        />
                      </div>

                      <div>
                        <label htmlFor={`line-note-${i}`} style={labelStyle}>
                          Note (optional)
                        </label>
                        <input
                          id={`line-note-${i}`}
                          data-testid={`line-note-${i}`}
                          className="pt-glass-input"
                          type="text"
                          value={line.note}
                          onChange={(event) => updateLine(line.key, { note: event.target.value })}
                        />
                      </div>

                      {lines.length > 1 && (
                        <div style={{ alignSelf: 'end' }}>
                          <button
                            type="button"
                            data-testid={`remove-line-${i}`}
                            aria-label={`Remove line ${i + 1}`}
                            onClick={() => {
                              clearErrors();
                              setLines((current) => current.filter((l) => l.key !== line.key));
                            }}
                            style={{ ...secondaryButton, display: 'inline-flex', alignItems: 'center', gap: space[1] }}
                          >
                            <Icon name="delete" size={1.125} />
                            Remove
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              <button
                type="button"
                data-testid="add-line"
                onClick={() => {
                  clearErrors();
                  setLines((current) => [...current, newLine()]);
                }}
                style={{ ...secondaryButton, marginTop: space[4], display: 'inline-flex', alignItems: 'center', gap: space[1] }}
              >
                <Icon name="add" size={1.125} />
                Add line
              </button>
              <FieldError id="lines-error" message={fieldErrors.lines} />
            </section>

            <section
              aria-label="Allocation summary"
              aria-live="polite"
              data-testid="allocation-summary"
              className="pt-card" style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: space[3] }}
            >
              {[
                { label: 'Total', value: totalSatang ?? 0, testId: 'summary-total' },
                { label: 'Allocated', value: allocated, testId: 'summary-allocated' },
                { label: 'Remaining to allocate', value: remaining, testId: 'summary-remaining' },
              ].map((item) => (
                <div key={item.testId}>
                  <div style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {item.label}
                  </div>
                  <div
                    data-testid={item.testId}
                    style={{ fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatSatang(item.value)}
                  </div>
                </div>
              ))}
              <div data-testid="summary-status" style={{ alignSelf: 'center', fontSize: font.size.sm, color: remaining === 0 ? colors.textSecondary : '#8B2525', fontWeight: font.weight.medium }}>
                {remainingLabel}
              </div>
            </section>

            {serverError && (
              <div role="alert" data-testid={`${testIdPrefix}-error`} className="pt-error-banner" style={{ marginBottom: 0 }}>
                {serverError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: space[2], flexWrap: 'wrap' }}>
              <button
                type="button"
                data-testid={existing ? 'edit-cancel' : undefined}
                onClick={() => navigate(existing ? `/transactions/${existing.id}` : '/')}
                disabled={mutation.isPending}
                style={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid={`${testIdPrefix}-submit`}
                disabled={!canSubmit}
                className="pt-btn-primary"
                // Same width for "Save payment" and "Save receipt" (and "Saving…"), so the button never resizes.
                style={{ minWidth: '9.5rem' }}
              >
                {mutation.isPending ? 'Saving…' : config.submitLabel}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </AppShell>
  );
};
