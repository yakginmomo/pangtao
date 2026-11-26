import React, { useEffect, useState } from 'react';
import { removeOpeningBalance } from '../api/accounts.api';
import { errorCode, errorMessage } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { Account, VoidedOpeningBalanceTransaction } from '../types/account.types';
import { formatSatang } from '../utils/money';
import { colors, font, radius, space, zIndex } from '../styles/theme';

interface RemoveOpeningBalanceDialogProps {
  /** An account with an opening balance. */
  account: Account;
  onClose: () => void;
  onRemoved: (transaction: VoidedOpeningBalanceTransaction) => void;
}

/** f-12 §1 step 3 and §2.2: confirm, then void the opening balance (it is never deleted). */
export const RemoveOpeningBalanceDialog: React.FC<RemoveOpeningBalanceDialogProps> = ({ account, onClose, onRemoved }) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const { refetchUser } = useAuth();
  const amount = account.openingBalance ? formatSatang(account.openingBalance.amount) : '';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isRemoving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRemoving, onClose]);

  const close = () => {
    if (!isRemoving) onClose();
  };

  const confirm = async () => {
    setServerError(null);
    setIsRemoving(true);
    try {
      onRemoved(await removeOpeningBalance(account.id));
    } catch (error) {
      // F-01 §2.2: a 401 means the session expired; re-check the user so the route guard redirects.
      if (errorCode(error) === 'UNAUTHENTICATED') {
        await refetchUser();
        return;
      }
      setServerError(errorMessage(error, 'Unable to remove the opening balance. Please try again.'));
    } finally {
      setIsRemoving(false);
    }
  };

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
      onClick={close}
    >
      <div
        role="alertdialog"
        className="pt-card-solid"
        aria-modal="true"
        aria-labelledby="remove-opening-title"
        aria-describedby="remove-opening-text"
        data-testid="remove-opening-dialog"
        style={{ width: '100%', maxWidth: '440px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', borderRadius: radius.xl, padding: space[6] }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="remove-opening-title" style={{ marginTop: 0, marginBottom: space[2], fontSize: font.size.lg, color: colors.textPrimary }}>
          Remove opening balance
        </h3>
        <p id="remove-opening-text" data-testid="remove-opening-text" style={{ marginTop: 0, marginBottom: space[5], color: colors.textSecondary }}>
          Remove the opening balance of {amount} from {account.name}? The balance will no longer include it.
        </p>

        {serverError && (
          <div role="alert" className="pt-error-banner" style={{ marginBottom: space[4] }}>
            {serverError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: space[2] }}>
          <button
            type="button"
            onClick={close}
            disabled={isRemoving}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.porcelain,
              color: colors.textPrimary,
              fontWeight: font.weight.medium,
              cursor: isRemoving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button type="button" data-testid="remove-opening-confirm" disabled={isRemoving} className="pt-btn-primary" onClick={() => void confirm()}>
            {isRemoving ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
};
