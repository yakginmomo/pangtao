import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { Amount } from '../components/Amount';
import { useAuth } from '../context/AuthContext';
import { fetchLoans, loansQueryKey } from '../api/loans.api';
import { errorCode, errorMessage } from '../api/http';
import { AccountSubtype } from '../types/account.types';
import { LoanList } from '../types/loan.types';
import { colors, font, radius, space } from '../styles/theme';

const SUBTYPE_LABEL: Record<AccountSubtype, string> = {
  WALLET: 'Wallet',
  BANK: 'Bank',
  CREDIT_CARD: 'Credit card',
  OTHER: 'Other',
};

const skeletonBar: React.CSSProperties = {
  display: 'block',
  height: '0.85rem',
  borderRadius: radius.full,
  backgroundColor: '#E8E2D6',
};

const LoansSkeleton: React.FC = () => (
  <div data-testid="loans-skeleton" role="status" aria-live="polite" aria-label="Loading loans" style={{ display: 'grid', gap: space[6] }}>
    {[0, 1].map((i) => (
      <div key={i} className="pt-card" style={{ borderRadius: radius.xl, padding: space[5], display: 'grid', gap: space[3] }}>
        <span style={{ ...skeletonBar, width: '35%', height: '1.1rem' }} />
        <span style={{ ...skeletonBar, width: '70%' }} />
        <span style={{ ...skeletonBar, width: '55%' }} />
      </div>
    ))}
  </div>
);

interface SectionAction {
  label: string;
  /** f-10 §2.2: the transaction form opens on this tab. */
  tab: 'payment' | 'receive';
  testId: string;
}

/** One of the two lists: its accounts, their balances and the section total (f-10 §2.2). */
const LoanSection: React.FC<{
  id: 'owed-to-me' | 'owed-by-me';
  title: string;
  list: LoanList;
  actions: SectionAction[];
}> = ({ id, title, list, actions }) => (
  <section data-testid={`loans-${id}`} aria-label={title} className="pt-card" style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space[3], flexWrap: 'wrap', padding: space[5] }}>
      <h3 style={{ margin: 0, fontSize: font.size.lg, fontWeight: font.weight.semibold, color: colors.textPrimary }}>{title}</h3>
      <div style={{ display: 'flex', gap: space[2], flexWrap: 'wrap' }}>
        {actions.map((action) => (
          <Link key={action.testId} to={`/transactions/new?tab=${action.tab}`} data-testid={action.testId} className="pt-pill-btn">
            {action.label}
          </Link>
        ))}
      </div>
    </div>
    {list.items.length === 0 ? (
      <p style={{ margin: 0, padding: `0 ${space[5]} ${space[5]}`, fontSize: font.size.sm, color: colors.textMuted }}>No accounts here.</p>
    ) : (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {list.items.map((item) => (
          <li
            key={item.id}
            data-testid={`loans-row-${item.name}`}
            className="pt-section-row"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space[3], flexWrap: 'wrap', borderTop: `1px solid ${colors.border}` }}
          >
            <span style={{ flex: '1 1 10rem', minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: font.size.base, fontWeight: font.weight.medium, color: colors.textPrimary, overflowWrap: 'anywhere' }}>
                {item.name}
                {item.isArchived && <span style={{ marginLeft: space[2], fontSize: font.size.xs, color: colors.textMuted }}>(archived)</span>}
              </span>
              {item.subtype && <span style={{ fontSize: font.size.xs, color: colors.textMuted }}>{SUBTYPE_LABEL[item.subtype]}</span>}
            </span>
            <Amount satang={item.balance} size={font.size.lg} testId={`loans-balance-${item.name}`} />
          </li>
        ))}
      </ul>
    )}
    <div
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space[3], padding: space[5], borderTop: `1px solid ${colors.border}` }}
    >
      <span style={{ fontSize: font.size.sm, fontWeight: font.weight.semibold, color: colors.textSecondary }}>Total</span>
      <Amount satang={list.total} size={font.size.lg} testId={`loans-total-${id}`} />
    </div>
  </section>
);

/** f-10 §2.2 (FR-21): outstanding loans owed to and by the User, including card debt. */
export const LoansPage: React.FC = () => {
  const { refetchUser } = useAuth();
  const loansQuery = useQuery({ queryKey: loansQueryKey, queryFn: fetchLoans });

  // An expired session re-checks the user, and the route guard then sends them to /login.
  const unauthenticated = errorCode(loansQuery.error) === 'UNAUTHENTICATED';
  useEffect(() => {
    if (unauthenticated) void refetchUser();
  }, [unauthenticated, refetchUser]);

  const data = loansQuery.data;
  const empty = data !== undefined && data.owedToMe.items.length === 0 && data.owedByMe.items.length === 0;

  return (
    <AppShell>
      <div>
        <div style={{ marginBottom: space[6] }}>
          <h2 style={{ fontSize: font.size['2xl'], fontWeight: font.weight.semibold, color: colors.textPrimary, marginBottom: space[2] }}>Loans</h2>
          <p className="pt-hide-on-mobile" style={{ color: colors.textMuted, margin: 0 }}>
            What others owe you, and what you owe, including credit card debt.
          </p>
        </div>

        {loansQuery.isError && (
          <ErrorBanner
            message={errorMessage(loansQuery.error, 'Unable to load your loans. Please try again.')}
            onRetry={() => void loansQuery.refetch()}
          />
        )}

        {loansQuery.isPending || (loansQuery.isError && loansQuery.isFetching) ? (
          <LoansSkeleton />
        ) : data && empty ? (
          <div data-testid="loans-empty" className="pt-card" style={{ borderRadius: radius.xl, padding: space[6], color: colors.textSecondary }}>
            No loans yet. Create a Loan Given or Loan Taken account on the{' '}
            <Link to="/accounts" data-testid="loans-empty-accounts-link" style={{ color: colors.cobalt, fontWeight: font.weight.semibold }}>
              Accounts page
            </Link>
            .
          </div>
        ) : data ? (
          <div style={{ display: 'grid', gap: space[6] }}>
            <LoanSection
              id="owed-to-me"
              title="Owed to me"
              list={data.owedToMe}
              actions={[
                { label: 'Lend', tab: 'payment', testId: 'loans-lend' },
                { label: 'Record repayment received', tab: 'receive', testId: 'loans-repayment-received' },
              ]}
            />
            <LoanSection
              id="owed-by-me"
              title="I owe"
              list={data.owedByMe}
              actions={[
                { label: 'Borrow', tab: 'receive', testId: 'loans-borrow' },
                { label: 'Repay', tab: 'payment', testId: 'loans-repay' },
              ]}
            />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
};
