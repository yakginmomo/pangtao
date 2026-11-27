import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { favoritesQueryKey, transactionsQueryKey, updateFavorite } from '../api/transactions.api';
import { errorCode, errorMessage } from '../api/http';
import { HistoryTransaction } from '../types/transaction.types';
import { colors } from '../styles/theme';

interface FavoriteButtonProps {
  transaction: Pick<HistoryTransaction, 'id' | 'kind' | 'isFavorite' | 'voidedAt'>;
  showLabel?: boolean;
  onNotice?: (message: string) => void;
}

/**
 * f-15 §2.2 star toggle: shown for active Payments and Receipts, and as "Remove from favorites"
 * only for voided favorites (Q-9). Never shown for opening balances.
 */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ transaction, showLabel = false, onNotice }) => {
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();

  const voided = transaction.voidedAt !== null;
  const visible = transaction.kind !== 'OPENING_BALANCE' && (!voided || transaction.isFavorite);

  const mutation = useMutation({
    mutationFn: (nextFavorite: boolean) => updateFavorite(transaction.id, nextFavorite),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: favoritesQueryKey }),
      ]);
    },
    onError: async (error) => {
      const code = errorCode(error);
      if (code === 'UNAUTHENTICATED') {
        await refetchUser();
        return;
      }
      if (code === 'TRANSACTION_VOIDED' || code === 'NOT_FOUND') {
        await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
      }
      onNotice?.(errorMessage(error, 'Unable to update favorite. Please try again.'));
    },
  });

  if (!visible) return null;

  const label = transaction.isFavorite ? 'Remove from favorites' : 'Add to favorites';

  return (
    <button
      type="button"
      data-testid="favorite-toggle"
      aria-label={label}
      title={label}
      aria-pressed={transaction.isFavorite}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(!transaction.isFavorite)}
      className="pt-pill-btn"
      style={{
        color: transaction.isFavorite ? colors.brass : colors.cobalt,
        borderColor: transaction.isFavorite ? colors.brass : colors.parchment,
      }}
    >
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={{
          fontSize: '1rem',
          verticalAlign: 'middle',
          fontVariationSettings: transaction.isFavorite ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        star
      </span>
      {showLabel && <span>{label}</span>}
    </button>
  );
};
