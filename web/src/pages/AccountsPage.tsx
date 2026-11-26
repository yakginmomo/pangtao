import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../components/AppShell';
import { Amount } from '../components/Amount';
import { ErrorBanner } from '../components/ErrorBanner';
import { Icon } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { accountsQueryKey, createAccount, fetchAccounts, updateAccount } from '../api/accounts.api';
import { transactionsQueryKey } from '../api/transactions.api';
import { errorCode, errorMessage } from '../api/http';
import { Account, AccountSubtype, AccountType, CreateAccountInput } from '../types/account.types';
import { formatSatang } from '../utils/money';
import { colors, font, radius, space } from '../styles/theme';

const MAX_NAME_LENGTH = 60;

const TYPE_SECTIONS: ReadonlyArray<{ type: AccountType; title: string }> = [
  { type: 'CASH', title: 'Cash' },
  { type: 'LOAN_TAKEN', title: 'Debts (Loan Taken)' },
  { type: 'LOAN_GIVEN', title: 'Owed to me (Loan Given)' },
  { type: 'INCOME', title: 'Income' },
  { type: 'EXPENSE', title: 'Expense' },
];

const TYPE_LABEL: Record<AccountType, string> = {
  CASH: 'Cash',
  LOAN_TAKEN: 'Loan Taken',
  LOAN_GIVEN: 'Loan Given',
  INCOME: 'Income',
  EXPENSE: 'Expense',
};

const SUBTYPE_LABEL: Record<AccountSubtype, string> = {
  WALLET: 'Wallet',
  BANK: 'Bank',
  CREDIT_CARD: 'Credit card',
  OTHER: 'Other',
};

/** BR-14, f-09 §1: the subtypes each type may carry; other types have none. */
const SUBTYPES_FOR_TYPE: Partial<Record<AccountType, AccountSubtype[]>> = {
  CASH: ['WALLET', 'BANK'],
  LOAN_TAKEN: ['CREDIT_CARD', 'OTHER'],
};

const NAME_EXISTS_MESSAGE = 'You already have an account with this name.';

/** Inline name check shared by the create form and rename (f-09 §2.2); the server stays the authority. */
function nameError(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 'Enter a name.';
  if (trimmed.length > MAX_NAME_LENGTH) return `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  return null;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: font.size.sm,
  fontWeight: font.weight.medium,
  color: colors.textPrimary,
  marginBottom: space[1],
};

const fieldErrorStyle: React.CSSProperties = { margin: `${space[1]} 0 0`, fontSize: font.size.xs, color: '#8B2525' };

const skeletonBar: React.CSSProperties = {
  display: 'block',
  height: '0.85rem',
  borderRadius: radius.full,
  backgroundColor: '#E8E2D6',
};

const AccountsSkeleton: React.FC = () => (
  <div data-testid="accounts-skeleton" role="status" aria-live="polite" aria-label="Loading accounts" style={{ display: 'grid', gap: space[6] }}>
    {[0, 1, 2].map((i) => (
      <div key={i} className="pt-card" style={{ borderRadius: radius.xl, padding: space[5], display: 'grid', gap: space[3] }}>
        <span style={{ ...skeletonBar, width: '35%', height: '1.1rem' }} />
        <span style={{ ...skeletonBar, width: '70%' }} />
        <span style={{ ...skeletonBar, width: '55%' }} />
      </div>
    ))}
  </div>
);

/** Server details[].field → inline message; a duplicate name is shown under Name (f-09 §2.2). */
function serverNameMessage(error: unknown): string | null {
  if (errorCode(error) === 'ACCOUNT_NAME_EXISTS') return NAME_EXISTS_MESSAGE;
  return null;
}

const AccountRow: React.FC<{ account: Account }> = ({ account }) => {
  const { refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(account.name);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: { name?: string; isArchived?: boolean }) => updateAccount(account.id, input),
    onSuccess: async () => {
      // Account names appear in history and the transaction form, so every dependent query refreshes.
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey });
      await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
      setRenaming(false);
      setConfirmingArchive(false);
      setServerError(null);
    },
    onError: async (error) => {
      if (errorCode(error) === 'UNAUTHENTICATED') {
        await refetchUser();
        return;
      }
      setServerError(serverNameMessage(error) ?? errorMessage(error, 'Unable to save the change. Please try again.'));
    },
  });

  const draftError = touched ? nameError(draft) : null;
  const canSaveRename = nameError(draft) === null && draft.trim() !== account.name && !mutation.isPending;

  const startRename = () => {
    setDraft(account.name);
    setTouched(false);
    setServerError(null);
    setConfirmingArchive(false);
    setRenaming(true);
  };

  const saveRename = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!canSaveRename) return;
    mutation.mutate({ name: draft.trim() });
  };

  return (
    <li
      data-testid={`accounts-row-${account.name}`}
      className="pt-section-row"
      style={{ display: 'flex', flexDirection: 'column', gap: space[2], borderTop: `1px solid ${colors.border}` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space[3], flexWrap: 'wrap' }}>
        <span style={{ flex: '1 1 10rem', minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: font.size.base, fontWeight: font.weight.medium, color: colors.textPrimary, overflowWrap: 'anywhere' }}>
            {account.name}
          </span>
          {account.subtype && (
            <span style={{ fontSize: font.size.xs, color: colors.textMuted }}>{SUBTYPE_LABEL[account.subtype]}</span>
          )}
        </span>
        <Amount satang={account.balance} size={font.size.lg} testId={`accounts-balance-${account.name}`} />
      </div>

      {renaming ? (
        <form onSubmit={saveRename} noValidate style={{ display: 'grid', gap: space[2] }}>
          <label htmlFor={`rename-${account.id}`} style={labelStyle}>
            New name
          </label>
          <input
            id={`rename-${account.id}`}
            data-testid="rename-input"
            className={`pt-glass-input${draftError || serverError ? ' pt-glass-input--error' : ''}`}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setTouched(true);
              setServerError(null);
            }}
            aria-invalid={Boolean(draftError || serverError)}
          />
          {(draftError || serverError) && (
            <p data-testid="rename-error" role="alert" style={fieldErrorStyle}>
              {draftError ?? serverError}
            </p>
          )}
          <span style={{ display: 'flex', gap: space[2], flexWrap: 'wrap' }}>
            <button type="submit" className="pt-btn-primary" data-testid="rename-save" disabled={!canSaveRename}>
              Save
            </button>
            <button type="button" className="pt-pill-btn" data-testid="rename-cancel" onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </span>
        </form>
      ) : confirmingArchive ? (
        <div role="alertdialog" aria-label={`Archive ${account.name}`} style={{ display: 'grid', gap: space[2] }}>
          <p data-testid="archive-confirm-text" style={{ margin: 0, fontSize: font.size.sm, color: colors.textPrimary }}>
            Archive {account.name}? Its balance of {formatSatang(account.balance)} and its history stay; it can no longer be used in
            new transactions.
          </p>
          {serverError && (
            <p role="alert" style={fieldErrorStyle}>
              {serverError}
            </p>
          )}
          <span style={{ display: 'flex', gap: space[2], flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pt-btn-primary"
              data-testid="archive-confirm"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ isArchived: true })}
            >
              Archive
            </button>
            <button type="button" className="pt-pill-btn" data-testid="archive-cancel" onClick={() => setConfirmingArchive(false)}>
              Cancel
            </button>
          </span>
        </div>
      ) : (
        <span style={{ display: 'flex', gap: space[2], flexWrap: 'wrap' }}>
          <button type="button" className="pt-pill-btn" data-testid={`rename-${account.name}`} aria-label={`Rename ${account.name}`} onClick={startRename}>
            Rename
          </button>
          {account.isArchived ? (
            <button
              type="button"
              className="pt-pill-btn"
              data-testid={`unarchive-${account.name}`}
              aria-label={`Unarchive ${account.name}`}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ isArchived: false })}
            >
              Unarchive
            </button>
          ) : (
            <button
              type="button"
              className="pt-pill-btn"
              data-testid={`archive-${account.name}`}
              aria-label={`Archive ${account.name}`}
              onClick={() => {
                setServerError(null);
                setConfirmingArchive(true);
              }}
            >
              Archive
            </button>
          )}
          {serverError && (
            <span role="alert" style={fieldErrorStyle}>
              {serverError}
            </span>
          )}
        </span>
      )}
    </li>
  );
};

const NewAccountForm: React.FC<{ onCreated: () => void; onCancel: () => void }> = ({ onCreated, onCancel }) => {
  const { refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CASH');
  const [subtype, setSubtype] = useState<AccountSubtype | ''>('');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const subtypeOptions = SUBTYPES_FOR_TYPE[type] ?? [];
  const localError = touched ? nameError(name) : null;
  const valid = nameError(name) === null;

  const mutation = useMutation({
    mutationFn: (input: CreateAccountInput) => createAccount(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey });
      await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
      onCreated();
    },
    onError: async (error) => {
      if (errorCode(error) === 'UNAUTHENTICATED') {
        await refetchUser();
        return;
      }
      setServerError(serverNameMessage(error) ?? errorMessage(error, 'Unable to create the account. Please try again.'));
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    // Invalid input is never sent (f-09 §2.2).
    if (!valid || mutation.isPending) return;
    setServerError(null);
    mutation.mutate({ name: name.trim(), type, ...(subtype ? { subtype } : {}) });
  };

  const shownError = localError ?? serverError;

  return (
    <form
      data-testid="new-account-form"
      onSubmit={submit}
      noValidate
      className="pt-card"
      style={{ borderRadius: radius.xl, padding: space[5], display: 'grid', gap: space[4], marginBottom: space[6] }}
    >
      <div>
        <label htmlFor="new-account-name" style={labelStyle}>
          Name
        </label>
        <input
          id="new-account-name"
          data-testid="new-account-name"
          className={`pt-glass-input${shownError ? ' pt-glass-input--error' : ''}`}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setServerError(null);
          }}
          onBlur={() => setTouched(true)}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? 'new-account-name-error' : undefined}
        />
        {shownError && (
          <p id="new-account-name-error" data-testid="new-account-name-error" role="alert" style={fieldErrorStyle}>
            {shownError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="new-account-type" style={labelStyle}>
          Type
        </label>
        <select
          id="new-account-type"
          data-testid="new-account-type"
          className="pt-glass-input"
          value={type}
          onChange={(event) => {
            setType(event.target.value as AccountType);
            setSubtype('');
          }}
        >
          {TYPE_SECTIONS.map(({ type: value }) => (
            <option key={value} value={value}>
              {TYPE_LABEL[value]}
            </option>
          ))}
        </select>
      </div>

      {subtypeOptions.length > 0 && (
        <div>
          <label htmlFor="new-account-subtype" style={labelStyle}>
            Subtype
          </label>
          <select
            id="new-account-subtype"
            data-testid="new-account-subtype"
            className="pt-glass-input"
            value={subtype}
            onChange={(event) => setSubtype(event.target.value as AccountSubtype | '')}
          >
            <option value="">None</option>
            {subtypeOptions.map((value) => (
              <option key={value} value={value}>
                {SUBTYPE_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
      )}

      <span style={{ display: 'flex', gap: space[2], flexWrap: 'wrap' }}>
        <button type="submit" className="pt-btn-primary" data-testid="new-account-submit" disabled={!valid || mutation.isPending}>
          Create account
        </button>
        <button type="button" className="pt-pill-btn" data-testid="new-account-cancel" onClick={onCancel}>
          Cancel
        </button>
      </span>
    </form>
  );
};

export const AccountsPage: React.FC = () => {
  const { refetchUser } = useAuth();
  const accountsQuery = useQuery({ queryKey: accountsQueryKey, queryFn: fetchAccounts });
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // An expired session re-checks the user, and the route guard then sends them to /login.
  const unauthenticated = errorCode(accountsQuery.error) === 'UNAUTHENTICATED';
  useEffect(() => {
    if (unauthenticated) void refetchUser();
  }, [unauthenticated, refetchUser]);

  const accounts = accountsQuery.data ?? [];
  const active = accounts.filter((account) => !account.isArchived);
  const archived = accounts.filter((account) => account.isArchived);

  return (
    <AppShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: space[3], flexWrap: 'wrap', marginBottom: space[6] }}>
          <div>
            <h2 style={{ fontSize: font.size['2xl'], fontWeight: font.weight.semibold, color: colors.textPrimary, marginBottom: space[2] }}>
              Accounts
            </h2>
            <p className="pt-hide-on-mobile" style={{ color: colors.textMuted, margin: 0 }}>
              Create, rename and archive your accounts.
            </p>
          </div>
          {!creating && (
            <button type="button" className="pt-btn-primary" data-testid="new-account-button" onClick={() => setCreating(true)}>
              <Icon name="add" size={1.125} />
              New account
            </button>
          )}
        </div>

        {creating && <NewAccountForm onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />}

        {accountsQuery.isError && (
          <ErrorBanner
            message={errorMessage(accountsQuery.error, 'Unable to load your accounts. Please try again.')}
            onRetry={() => void accountsQuery.refetch()}
          />
        )}

        {accountsQuery.isPending || (accountsQuery.isError && accountsQuery.isFetching) ? (
          <AccountsSkeleton />
        ) : accountsQuery.isSuccess ? (
          <div style={{ display: 'grid', gap: space[6] }}>
            {TYPE_SECTIONS.map(({ type, title }) => {
              const rows = active.filter((account) => account.type === type);
              return (
                <section
                  key={type}
                  data-testid={`accounts-section-${type}`}
                  aria-label={title}
                  className="pt-card"
                  style={{ borderRadius: radius.xl, overflow: 'hidden' }}
                >
                  <h3 style={{ margin: 0, padding: space[5], fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.textPrimary }}>
                    {title}
                  </h3>
                  {rows.length === 0 ? (
                    <p style={{ margin: 0, padding: `0 ${space[5]} ${space[5]}`, fontSize: font.size.sm, color: colors.textMuted }}>
                      No accounts of this type.
                    </p>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {rows.map((account) => (
                        <AccountRow key={account.id} account={account} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}

            {archived.length > 0 && (
              <section data-testid="accounts-archived" aria-label="Archived accounts" className="pt-card" style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
                <h3 style={{ margin: 0, fontSize: font.size.lg, fontWeight: font.weight.semibold }}>
                  <button
                    type="button"
                    data-testid="archived-toggle"
                    aria-expanded={showArchived}
                    onClick={() => setShowArchived((open) => !open)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: space[5],
                      font: 'inherit',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                    }}
                  >
                    Archived ({archived.length})
                  </button>
                </h3>
                {showArchived && (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {archived.map((account) => (
                      <AccountRow key={account.id} account={account} />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
};
