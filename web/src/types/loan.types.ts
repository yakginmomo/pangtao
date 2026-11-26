import { AccountSubtype } from './account.types';

/** f-10 §2.1: one Loan Given or Loan Taken account in the overview. */
export interface LoanItem {
  id: string;
  name: string;
  subtype: AccountSubtype | null;
  isArchived: boolean;
  /** Integer satang, derived by the server; negative after an over-repayment (D-02). */
  balance: number;
}

export interface LoanList {
  items: LoanItem[];
  /** Integer satang: the sum of the listed balances. */
  total: number;
}

/** GET /api/v1/loans (FR-21). */
export interface LoansOverview {
  owedToMe: LoanList;
  owedByMe: LoanList;
}
