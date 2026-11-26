import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { fetchTransaction, transactionsQueryKey } from '../api/transactions.api';
import { errorCode, errorMessage } from '../api/http';
import { FormSkeleton, TransactionForm } from './NewTransactionPage';
import { colors, font, radius, space } from '../styles/theme';

const cardStyle: React.CSSProperties = {
  borderRadius: radius.xl,
  padding: space[5],
  minWidth: 0,
};

/** A page-level message with a way back to the transaction's detail. */
const Notice: React.FC<{ testId: string; message: string; id: string }> = ({ testId, message, id }) => (
  <AppShell>
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <h2 style={{ fontSize: font.size['2xl'], fontWeight: font.weight.semibold, color: colors.textPrimary, marginBottom: space[4] }}>
        Edit transaction
      </h2>
      <div data-testid={testId} className="pt-card" style={cardStyle}>
        <p style={{ margin: 0, color: colors.textSecondary }}>
          {message}{' '}
          {id && <Link to={`/transactions/${id}`}>Back to the transaction</Link>}
        </p>
      </div>
    </div>
  </AppShell>
);

/**
 * f-13 §2.2: `/transactions/:id/edit`. Loads the transaction (the same query the detail page
 * uses), then shows the edit form for an active Payment or Receipt; a voided transaction or an
 * opening balance gets a message instead, and an unknown id "Transaction not found".
 */
export const EditTransactionPage: React.FC = () => {
  const { id = '' } = useParams();
  const { refetchUser } = useAuth();
  const detailQuery = useQuery({
    queryKey: [...transactionsQueryKey, 'detail', id],
    queryFn: () => fetchTransaction(id),
  });

  const code = errorCode(detailQuery.error);
  useEffect(() => {
    if (code === 'UNAUTHENTICATED') void refetchUser();
  }, [code, refetchUser]);

  const transaction = detailQuery.data;

  if (code === 'NOT_FOUND' || code === 'VALIDATION_ERROR') {
    return <Notice testId="transaction-not-found" message="Transaction not found." id="" />;
  }
  if (detailQuery.isError && !transaction) {
    return (
      <AppShell>
        <ErrorBanner
          message={errorMessage(detailQuery.error, 'Unable to load this transaction. Please try again.')}
          onRetry={() => void detailQuery.refetch()}
        />
      </AppShell>
    );
  }
  // First load only: a background refetch must not unmount the form and lose the user's changes.
  if (!transaction) {
    return (
      <AppShell>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <FormSkeleton />
        </div>
      </AppShell>
    );
  }
  if (transaction.voidedAt !== null) {
    return <Notice testId="edit-not-editable" message="This transaction has already been voided." id={transaction.id} />;
  }
  if (transaction.kind === 'OPENING_BALANCE') {
    return <Notice testId="edit-not-editable" message="Opening balances are changed from the Dashboard." id={transaction.id} />;
  }
  // Keyed by version, so a reload after a save or a conflict starts the form from the stored values.
  return <TransactionForm key={transaction.updatedAt} existing={transaction} />;
};
