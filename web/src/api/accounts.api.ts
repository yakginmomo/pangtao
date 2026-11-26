import { handleResponse } from './http';
import {
  Account,
  AccountResponse,
  AccountsResponse,
  CreateAccountInput,
  CreateOpeningBalanceInput,
  OpeningBalanceResponse,
  OpeningBalanceTransaction,
  UpdateAccountInput,
} from '../types/account.types';

export const accountsQueryKey = ['accounts'] as const;

/** GET /api/v1/accounts: the caller's accounts with derived balances, in display order. */
export async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch('/api/v1/accounts', { credentials: 'include' });
  const data = await handleResponse<AccountsResponse>(res);
  return data.items;
}

/** POST /api/v1/accounts/:id/opening-balance — User only (f-04 §2.1). */
export async function createOpeningBalance(
  accountId: string,
  input: CreateOpeningBalanceInput
): Promise<OpeningBalanceTransaction> {
  const res = await fetch(`/api/v1/accounts/${encodeURIComponent(accountId)}/opening-balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await handleResponse<OpeningBalanceResponse>(res);
  return data.transaction;
}

/** POST /api/v1/accounts: create an account (f-09 §2.1). A duplicate name is 409 ACCOUNT_NAME_EXISTS. */
export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const res = await fetch('/api/v1/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await handleResponse<AccountResponse>(res);
  return data.account;
}

/** PATCH /api/v1/accounts/:id: rename, archive or unarchive (f-09 §2.1). */
export async function updateAccount(accountId: string, input: UpdateAccountInput): Promise<Account> {
  const res = await fetch(`/api/v1/accounts/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const data = await handleResponse<AccountResponse>(res);
  return data.account;
}
