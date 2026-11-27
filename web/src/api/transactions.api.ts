import { handleResponse } from './http';
import {
  CreateTransactionInput,
  EditedTransaction,
  FavoriteTransaction,
  HistoryTransaction,
  Transaction,
  TransactionDetailResponse,
  TransactionHistoryPage,
  TransactionResponse,
  UpdateTransactionInput,
  VoidedTransaction,
} from '../types/transaction.types';

/** Prefix of every history query key, so a new transaction can invalidate them all. */
export const transactionsQueryKey = ['transactions'] as const;

/** Sub-key for the Favorites list (invalidated alongside `transactionsQueryKey`). */
export const favoritesQueryKey = [...transactionsQueryKey, 'favorites'] as const;

/** POST /api/v1/transactions — User only (f-05/f-06 §2.1). */
export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const res = await fetch('/api/v1/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await handleResponse<TransactionResponse>(res);
  return data.transaction;
}

/** GET /api/v1/transactions?limit&offset&favorite — newest first (f-07 §2.1, f-15 §2.1). */
export async function fetchTransactions(
  limit: number,
  offset: number,
  options?: { favorite?: boolean }
): Promise<TransactionHistoryPage> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (options?.favorite !== undefined) {
    params.set('favorite', String(options.favorite));
  }
  const res = await fetch(`/api/v1/transactions?${params.toString()}`, { credentials: 'include' });
  return handleResponse<TransactionHistoryPage>(res);
}

/** GET /api/v1/transactions/:id — one transaction with every line (f-07 §2.1, FR-25). */
export async function fetchTransaction(id: string): Promise<HistoryTransaction> {
  const res = await fetch(`/api/v1/transactions/${encodeURIComponent(id)}`, { credentials: 'include' });
  const data = await handleResponse<TransactionDetailResponse>(res);
  return data.transaction;
}

/** PATCH /api/v1/transactions/:id — replace a Payment or Receipt with its new version (f-13 §2.1). */
export async function updateTransaction(id: string, input: UpdateTransactionInput): Promise<EditedTransaction> {
  const res = await fetch(`/api/v1/transactions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await handleResponse<{ transaction: EditedTransaction }>(res);
  return data.transaction;
}

/** POST /api/v1/transactions/:id/void — void a Payment or Receipt; it stays in history (f-13 §2.1). */
export async function voidTransaction(id: string): Promise<VoidedTransaction> {
  const res = await fetch(`/api/v1/transactions/${encodeURIComponent(id)}/void`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await handleResponse<{ transaction: VoidedTransaction }>(res);
  return data.transaction;
}

/** PATCH /api/v1/transactions/:id/favorite — mark or unmark a Payment or Receipt (f-15 §2.1). */
export async function updateFavorite(id: string, isFavorite: boolean): Promise<FavoriteTransaction> {
  const res = await fetch(`/api/v1/transactions/${encodeURIComponent(id)}/favorite`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ isFavorite }),
  });
  const data = await handleResponse<{ transaction: FavoriteTransaction }>(res);
  return data.transaction;
}
