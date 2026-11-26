import type { AccountSubtype } from '@prisma/client';
import { satangToJson } from '../utils/money.util.js';
import { accountService, type AccountBalance } from './account.service.js';

export interface LoanItem {
  id: string;
  name: string;
  subtype: AccountSubtype | null;
  isArchived: boolean;
  /** Integer satang, derived (BR-07); negative after an over-repayment (D-02). */
  balance: number;
}

export interface LoanList {
  items: LoanItem[];
  /** Sum of the listed balances in satang; a negative balance reduces it. */
  total: number;
}

export interface LoansOverview {
  owedToMe: LoanList;
  owedByMe: LoanList;
}

/**
 * F-10 / FR-21: the caller's outstanding loans. Loan Given accounts are owed to the User,
 * Loan Taken accounts (including credit cards) are owed by them. An archived account whose
 * balance is 0 is closed and left out; an archived account that still has a balance stays.
 */
function toList(accounts: readonly AccountBalance[]): LoanList {
  const listed = accounts.filter((account) => !(account.isArchived && account.balance === 0n));
  // Summed as bigint before the API conversion, so the total is exact (NFR-03).
  const total = listed.reduce((sum, account) => sum + account.balance, 0n);
  return {
    items: listed.map((account) => ({
      id: account.id,
      name: account.name,
      subtype: account.subtype,
      isArchived: account.isArchived,
      balance: satangToJson(account.balance),
    })),
    total: satangToJson(total),
  };
}

export class LoansService {
  /** AC-10.8: only the caller's accounts (BR-01); balances are the ones GET /accounts returns. */
  async getLoans(userId: string): Promise<LoansOverview> {
    // listAccountBalances keeps F-03 order: by type, then by name, which is the order f-10 §1 asks for.
    const accounts = await accountService.listAccountBalances(userId);
    return {
      owedToMe: toList(accounts.filter((account) => account.type === 'LOAN_GIVEN')),
      owedByMe: toList(accounts.filter((account) => account.type === 'LOAN_TAKEN')),
    };
  }
}

export const loansService = new LoansService();
