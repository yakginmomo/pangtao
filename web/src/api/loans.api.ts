import { handleResponse } from './http';
import { LoansOverview } from '../types/loan.types';

/** Every write that moves a loan or card balance invalidates this key (f-10 §2.2). */
export const loansQueryKey = ['loans'] as const;

/** GET /api/v1/loans: outstanding loans owed to and by the caller, with totals (f-10 §2.1). */
export async function fetchLoans(): Promise<LoansOverview> {
  const res = await fetch('/api/v1/loans', { credentials: 'include' });
  return handleResponse<LoansOverview>(res);
}
