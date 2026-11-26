import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { voidTransaction } from '../api/transactions.api';
import { invalidateLedgerQueries } from '../api/ledger-cache';
import { errorCode, errorMessage } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { HistoryTransaction } from '../types/transaction.types';
import { KIND_LABEL } from './TransactionKindBadge';
import { formatSatang } from '../utils/money';
import { formatCalendarDate } from '../utils/date';
import { colors, font, radius, space, zIndex } from '../styles/theme';

interface VoidTransactionDialogProps {
  transaction: HistoryTransaction;
  onClose: () => void;
  /** Called with a message for the page when the void could not apply (409, 404). */
  onConflict: (message: string) => void;
}

const secondaryButton: React.CSSProperties = {
  padding: '0.45rem 0.9rem',
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.porcelain,
  color: colors.textPrimary,
  fontWeight: font.weight.medium,
  cursor: 'pointer',
};

/**
 * f-13 §1 step 3: confirm, then void. Every ledger query is refreshed afterwards (§2.2), a
 * conflict (already voided, or gone) closes the dialog and reloads the transaction, and an
 * expired session takes the usual path to `/login`.
 */
export const VoidTransactionDialog: React.FC<VoidTransactionDialogProps> = ({ transaction, onClose, onConflict }) => {
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();

  const mutation = useMutation({
    mutationFn: () => voidTransaction(transaction.id),
    onSuccess: async () => {
      await invalidateLedgerQueries(queryClient);
      onClose();
    },
    onError: async (error) => {
      const code = errorCode(error);
      if (code === 'UNAUTHENTICATED') {
        await refetchUser();
        return;
      }
      if (code === 'TRANSACTION_VOIDED' || code === 'NOT_FOUND') {
        onConflict(code === 'TRANSACTION_VOIDED' ? 'This transaction has already been voided.' : 'Transaction not found.');
        await invalidateLedgerQueries(queryClient);
        onClose();
      }
    },
  });

  const saving = mutation.isPending;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saving, onClose]);

  const shownError =
    mutation.isError && !['UNAUTHENTICATED', 'TRANSACTION_VOIDED', 'NOT_FOUND'].includes(errorCode(mutation.error) ?? '')
      ? errorMessage(mutation.error, 'Unable to void this transaction. Please try again.')
      : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex.modal,
        backgroundColor: 'rgba(15, 30, 51, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: space[4],
      }}
      onClick={() => !saving && onClose()}
    >
      <div
        role="alertdialog"
        className="pt-card-solid"
        aria-modal="true"
        aria-labelledby="void-title"
        aria-describedby="void-text"
        data-testid="void-dialog"
        style={{ width: '100%', maxWidth: '440px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', borderRadius: radius.xl, padding: space[6] }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="void-title" style={{ marginTop: 0, marginBottom: space[2], fontSize: font.size.lg, color: colors.textPrimary }}>
          Void transaction
        </h3>
        <p id="void-text" style={{ marginTop: 0, color: colors.textSecondary, overflowWrap: 'anywhere' }}>
          Void this {KIND_LABEL[transaction.kind]} of {formatSatang(transaction.totalAmount)} on {formatCalendarDate(transaction.txnDate)}? It will
          stay in history but no longer count in balances or summaries. This cannot be undone.
        </p>
        {shownError && (
          <div role="alert" className="pt-error-banner">
            {shownError}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: space[2], flexWrap: 'wrap' }}>
          <button type="button" data-testid="void-cancel" onClick={onClose} disabled={saving} style={secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            data-testid="void-confirm"
            onClick={() => mutation.mutate()}
            disabled={saving}
            className="pt-btn-primary"
            autoFocus
          >
            {saving ? 'Voiding…' : 'Void'}
          </button>
        </div>
      </div>
    </div>
  );
};
