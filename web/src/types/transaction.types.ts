/** f-05/f-06 §2.1 request: amounts are integer satang, `txnDate` is `YYYY-MM-DD`. */
export interface CreateTransactionInput {
  kind: 'PAYMENT' | 'RECEIPT';
  accountId: string;
  txnDate: string;
  totalAmount: number;
  memo?: string;
  lines: Array<{ targetAccountId: string; amount: number; note?: string }>;
}

export interface AllocationLine {
  id: string;
  targetAccountId: string;
  /** Integer satang. */
  amount: number;
  note: string | null;
}

/** f-05/f-06 §2.1 response. */
export interface Transaction {
  id: string;
  kind: 'PAYMENT' | 'RECEIPT';
  accountId: string;
  /** YYYY-MM-DD */
  txnDate: string;
  /** Integer satang. */
  totalAmount: number;
  memo: string | null;
  lines: AllocationLine[];
}

export interface TransactionResponse {
  transaction: Transaction;
}

/** f-13 §2.1 PATCH request: the full new version; the kind is fixed. */
export type UpdateTransactionInput = Omit<CreateTransactionInput, 'kind'>;

/** f-13 §2.1 PATCH response. */
export interface EditedTransaction extends Transaction {
  /** ISO 8601 timestamp. */
  updatedAt: string;
}

/** f-13 §2.1 void response. */
export interface VoidedTransaction extends Omit<Transaction, 'lines'> {
  /** ISO 8601 timestamp. */
  voidedAt: string;
}

export type TransactionKind = 'PAYMENT' | 'RECEIPT' | 'OPENING_BALANCE';

/** f-07 §2.1 line: amounts are integer satang. */
export interface HistoryLine {
  id: string;
  targetAccountId: string;
  targetAccountName: string;
  amount: number;
  note: string | null;
}

/** f-07 §2.1 history item and detail (1.3: with voidedAt, createdAt and updatedAt). */
export interface HistoryTransaction {
  id: string;
  kind: TransactionKind;
  accountId: string;
  accountName: string;
  /** YYYY-MM-DD */
  txnDate: string;
  /** Integer satang. */
  totalAmount: number;
  memo: string | null;
  lines: HistoryLine[];
  /** ISO 8601 timestamp, or null while the transaction counts (BR-12). */
  voidedAt: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp; later than createdAt once the transaction was edited (f-13 1.1). */
  updatedAt: string;
}

export interface TransactionHistoryPage {
  items: HistoryTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface TransactionDetailResponse {
  transaction: HistoryTransaction;
}
