# F-05 Payment and Charge: Engineering Contract

Requirements: FR-12; BR-04, BR-05, BR-06, BR-07, BR-09, BR-10, BR-14, BR-16 · Depends on: F-03 · Contract version: 1.4 (see [version history](README.md#5-contract-version-history)) · Suggested branch: `feature/F-05-payment-charge`

Shared conventions, error codes and the Product Definition of Done are in [README.md](README.md).

---

## 1. Feature design

**Purpose.** Allow users to record expenditures paid from Cash accounts or charged to Credit Cards (Loan Taken), split across one or more allocation lines (Expense accounts or Credit Card repayments), updating affected balances atomically and with exact satang precision.

**Workflow**

1. The user navigates to `/transactions/new` (Payment tab selected).
2. The user selects a source account (Cash or Loan Taken), transaction date, and optional memo.
3. The user inputs total amount and adds one or more allocation lines specifying target account, line amount, and optional note.
4. The UI displays the remaining unallocated balance; the submit button remains disabled until the line sum equals the total amount.
5. On submission, the server verifies input, executes business rule validations, and inserts the transaction and lines inside a single database transaction.
6. The user is redirected to the Dashboard with updated balances. (Transaction History arrives with F-07.)

**Rules and validation**

- **BR-04 (Positive Satang Amounts)**: `totalAmount` and all line `amount` values must be positive integer satang $\le 10,000,000,000$ ($100,000,000.00\text{ THB}$).
- **BR-05 (Line Sum Equality)**: A transaction must contain at least 1 allocation line. The sum of line amounts must equal `totalAmount` exactly. Any mismatch returns `400 VALIDATION_ERROR` with code `INVALID_ALLOCATION_SUM`, and nothing is saved.
- **BR-06 (Allowed Target Matrix & Separation)**:
  - When source is **Cash**: target accounts in Sprint 1 may be `EXPENSE` (spending) or `LOAN_TAKEN` (debt repayment). (v1.4) From Sprint 2 they may also be `LOAN_GIVEN` (lending, F-10) or another `CASH` account (transfer out, F-11); `INCOME` stays invalid (Sprint 2 README §2.2).
  - When source is **Loan Taken** (card charge): target accounts must be `EXPENSE` only (unchanged in Sprint 2: F-10 Q-1).
  - Target account cannot equal source account.
  - All referenced accounts must belong to the caller and must not be archived. An archived source account returns `400 VALIDATION_ERROR` and nothing is saved (BR-14, as in F-04).
- **BR-16 (Source Account Type)**: The source account must be a `CASH` or `LOAN_TAKEN` account. Any other source type returns `400 INVALID_SOURCE_ACCOUNT` and nothing is saved.
- **BR-07 (Atomic Balance Effects)**:
  - Cash source: decreases source balance by total.
  - Card source: increases outstanding debt by total.
  - Expense line: increases target expense account total.
  - Loan Taken line (repayment): decreases card debt by line amount.
- **BR-09 (Credit Card Treatment)**: Card purchases count as expense on the charge date; paying down the card decreases cash and debt, but is **never** counted as an expense.
- **BR-10 (Calendar Date)**: Date must be $\le$ today in Bangkok time and $\ge$ today − 90 days in Bangkok time (v1.3). The window is inclusive and counted in calendar days: with today = 2026-11-25, `2026-08-27` (T−90) is accepted and `2026-08-26` (T−91) returns `400 DATE_TOO_OLD`. The limit is the constant `BACKDATE_LIMIT_DAYS = 90`; it is not configurable. Transactions already saved with an older date are not changed and still count in balances, history and summaries.

**Permissions:** User only. Administrator receives 403, anonymous receives 401.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| POST /api/v1/transactions | `{ kind: "PAYMENT", accountId, txnDate, totalAmount, memo?, lines: [ { targetAccountId, amount, note? } ] }` | 201 `{ transaction: { id, kind, accountId, txnDate, totalAmount, memo, lines } }` | 400 VALIDATION_ERROR; 400 INVALID_ALLOCATION_SUM; 400 FUTURE_DATE_NOT_ALLOWED; 400 DATE_TOO_OLD; 400 INVALID_SOURCE_ACCOUNT; 400 INVALID_TARGET_ACCOUNT; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 415 UNSUPPORTED_MEDIA_TYPE |

- When the source account is not Cash or Loan Taken: returns 400 with code `INVALID_SOURCE_ACCOUNT`.
- When `txnDate` is more than 90 days before today in Bangkok time: returns 400 with code `DATE_TOO_OLD`, message "Date cannot be more than 90 days before today in Bangkok time" and `details: [{ field: "txnDate", issue: "date must not be more than 90 days before today in Bangkok time" }]`; nothing is saved (v1.3). The check runs inside the same database transaction and at the same point as the future-date check: after the ownership check (another user's account is still 404 NOT_FOUND, whatever the date) and the source/target type checks, and before the allocation-sum check. A malformed or impossible date is still 400 VALIDATION_ERROR.
- When the source account is archived: returns 400 VALIDATION_ERROR (BR-14).
- When lines do not sum to total: returns 400 with code `INVALID_ALLOCATION_SUM`.
- When card source targets a non-expense account in Sprint 1: returns 400 with code `INVALID_TARGET_ACCOUNT`.
- When a line target is archived, equals the source, or is outside the matrix (Sprint 1 rows; from v1.4 the Sprint 2 rows in Sprint 2 README §2.2): returns 400 with code `INVALID_TARGET_ACCOUNT`.
- When any account belongs to another user: returns 404 NOT_FOUND.

### 2.2 UI

- **Screen (`/transactions/new`)**: Payment tab. Source account dropdown (filtered to Cash and Loan Taken accounts).
- **Dynamic Line Editor**: Add line, remove line. Shows live "Total", "Allocated", and "Remaining to allocate".
- **Client Guards**: Submit button is disabled unless remaining to allocate is 0.00 THB and all required fields are filled.
- **Date Field (v1.3)**: The date picker offers only today − 90 days to today (Bangkok). A typed date older than that shows "Date cannot be more than 90 days ago." under the Date field and sends nothing; the existing "Date cannot be later than today." message is unchanged. The Receive tab (F-06) uses the same field and messages.
- **Visual Feedback**: Server validation errors mapped to individual form fields or displayed in an alert banner.

### 2.3 Data

- Stored in `transactions` (`kind = 'PAYMENT'`) and `allocation_lines` tables. No new tables or migrations; uses the schema defined in the System-Level SDS.
- Foreign keys scoped to `user_id` ensuring composite foreign key integrity. Cascade delete from transaction to allocation lines.

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-05.1 | Submitting a valid payment from Cash with multiple Expense lines returns 201, reduces Cash balance, and increases each Expense total. |
| AC-05.2 | Submitting a valid charge from a Credit Card with Expense lines returns 201 and increases Credit Card debt. |
| AC-05.3 | Submitting a credit card repayment from Cash (source: Cash, line: Credit Card) returns 201, reduces Cash, and reduces Credit Card debt. |
| AC-05.4 | If the allocation lines sum does not match `totalAmount`, the request returns 400 INVALID_ALLOCATION_SUM and no transaction or line is saved. |
| AC-05.5 | A transaction with zero allocation lines returns 400 VALIDATION_ERROR. |
| AC-05.6 | Attempting to charge a Credit Card with a repayment line or non-expense line in Sprint 1 returns 400 INVALID_TARGET_ACCOUNT. |
| AC-05.7 | Attempting to use a source or target account belonging to another user returns 404 NOT_FOUND. |
| AC-05.8 | A date in the future returns 400 FUTURE_DATE_NOT_ALLOWED. |
| AC-05.14 | (v1.3) A Payment dated more than 90 days before today (Bangkok) returns 400 DATE_TOO_OLD and saves nothing (no transaction, no line, every balance unchanged); a Payment dated exactly today − 90 days returns 201. The same applies to a card charge (Loan Taken source). A Payment using another user's account with an old date still returns 404 NOT_FOUND. |
| AC-05.15 | (v1.3) In the UI, days before today − 90 cannot be picked in the date picker; typing such a date shows "Date cannot be more than 90 days ago." under the Date field and no request is sent. |
| AC-05.9 | In the UI, the user records a multi-line charge and sees the live allocation calculation update and submit succeed. |
| AC-05.10 | Submitting a Payment whose source is an Income, Expense or Loan Given account returns 400 INVALID_SOURCE_ACCOUNT and saves nothing. |
| AC-05.11 | A zero or negative total or line amount, or an amount above $100,000,000.00\text{ THB}$, returns 400 VALIDATION_ERROR and saves nothing (BR-04). |
| AC-05.12 | Submitting a Payment whose source account is archived returns 400 VALIDATION_ERROR and saves nothing (BR-14). |
| AC-05.13 | A line whose target is archived, equals the source, or has a type outside the matrix returns 400 INVALID_TARGET_ACCOUNT and saves nothing (BR-06). Sprint 1 matrix: Cash → Expense or Loan Taken; Loan Taken → Expense. (v1.4) Sprint 2 adds Cash → Loan Given (F-10) and Cash → Cash (F-11). |

---

## 4. Software test specification

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-05.1** | AC-05.1 | A | Alice logged in; Bank balance 50,000.00 THB | POST `/api/v1/transactions` (kind: PAYMENT, source: Bank, total: 1,500.00 THB, lines: Dining 1,000.00 THB, Electricity 500.00 THB) | 201 Created; GET `/api/v1/accounts` shows Bank balance reduced by 1,500.00 THB; Dining total 1,000.00 THB; Electricity total 500.00 THB. |
| **TEST-05.2** | AC-05.2 | A | Alice logged in; Card debt 0 | POST `/api/v1/transactions` (kind: PAYMENT, source: Credit Card, total: 1,200.00 THB, lines: Dining 700.00, Groceries 500.00) | 201 Created; GET `/api/v1/accounts` shows Card debt is 1,200.00 THB; Dining and Groceries totals updated. |
| **TEST-05.3** | AC-05.3 | A | Alice logged in; Bank balance 50,000.00 THB; Card debt 1,200.00 THB | POST `/api/v1/transactions` (kind: PAYMENT, source: Bank, total: 800.00 THB, lines: Credit Card 800.00 THB) | 201 Created; Bank balance 49,200.00 THB; Card debt reduced to 400.00 THB. |
| **TEST-05.4** | AC-05.4 | U, A | Alice logged in | POST `/api/v1/transactions` with total 1,200.00 THB, but lines sum to 1,000.00 THB (Dining 600, Groceries 400) | 400 INVALID_ALLOCATION_SUM; database contains zero new rows. |
| **TEST-05.5** | AC-05.5 | A | Alice logged in | POST `/api/v1/transactions` with `lines: []` | 400 VALIDATION_ERROR; nothing saved. |
| **TEST-05.6** | AC-05.6 | A | Alice logged in | POST `/api/v1/transactions` with source: Credit Card and target: Bank Account | 400 INVALID_TARGET_ACCOUNT; nothing saved. |
| **TEST-05.7** | AC-05.7 | A | Bob logged in; Alice’s account IDs | Bob sends POST `/api/v1/transactions` with Alice’s Bank account as source; then with Alice’s Dining account as a line target | Both return 404 NOT_FOUND; Alice’s balances unchanged. |
| **TEST-05.8** | AC-05.8 | A | Alice logged in | POST `/api/v1/transactions` with tomorrow's date | 400 FUTURE_DATE_NOT_ALLOWED; nothing saved. |
| **TEST-05.14** | AC-05.14 | U, A | U: fixed clock 2026-11-25 12:00 Bangkok. A: Alice logged in; Bank Account opening 50,000.00 THB; dates computed from the Bangkok clock at run time | U: the date check accepts `2026-08-27` (T−90), rejects `2026-08-26` (T−91), and at 00:30 Bangkok on 2026-11-26 accepts `2026-08-28` and rejects `2026-08-27` (the window moves at Bangkok midnight). A: POST a Payment Bank → Dining 100.00 THB dated T−91; then the same Payment dated T−90; then a card charge Credit Card → Dining dated T−91; then Bob sends a Payment from Alice's Bank Account dated T−91 | T−91 Payment: 400 DATE_TOO_OLD with `details[0].field = "txnDate"`, row counts and every balance unchanged. T−90 Payment: 201, Bank balance down by 100.00 THB. T−91 card charge: 400 DATE_TOO_OLD, card debt unchanged. Bob: 404 NOT_FOUND. |
| **TEST-05.15** | AC-05.15 | E | Alice logged in; `/transactions/new`, Payment tab | Check the Date input's `min`; type T−91 and click **Save payment**; then type T−90 | `min` = T−90; with T−91 the field error "Date cannot be more than 90 days ago." appears and no POST is sent; with T−90 the error clears. |
| **TEST-05.9** | AC-05.9 | E | Alice logged in | In browser, open `/transactions/new`, select Credit Card, enter 1,200.00 THB, add 2 lines (700 and 500), submit | Remaining to allocate updates live and submit stays disabled until it is 0.00 THB; form submits and redirects to the Dashboard; Credit Card debt shows 1,200.00 THB; one PAYMENT with 2 allocation lines is stored. (The History view of this transaction is covered by F-07 TEST-07.6.) |
| **TEST-05.10** | AC-05.10 | A | Alice logged in; Salary account (`INCOME`) | POST `/api/v1/transactions` (kind: PAYMENT, source: Salary, total: 1,000.00 THB, lines: Dining 1,000.00 THB) | 400 INVALID_SOURCE_ACCOUNT; no transaction or line is saved. |
| **TEST-05.11** | AC-05.11 | A | Alice logged in; Bank source | POST `/api/v1/transactions` with total 0; then total -100; then total 10000000001; then a valid total with a line amount of 0 | Each returns 400 VALIDATION_ERROR; no transaction or line is saved. |
| **TEST-05.12** | AC-05.12 | A | Alice logged in; Wallet archived | POST `/api/v1/transactions` (kind: PAYMENT, source: Wallet, total: 100.00 THB, lines: Dining 100.00 THB) | 400 VALIDATION_ERROR; no transaction or line is saved. |
| **TEST-05.13** | AC-05.13 | U, A | Alice logged in; Bank source | POST `/api/v1/transactions` (source: Bank) with a line targeting, in turn: Salary (Income), Bank itself, an archived Telecom account. (v1.4: the Wallet (Cash) case moved to TEST-11.1, where a Cash target is an accepted transfer; it stays here until F-11 changes the matrix.) | Each returns 400 INVALID_TARGET_ACCOUNT; no transaction or line is saved. |

---

## 5. Definition of done (F-05)

- Every AC above has an executed automated test with results documented.
- Failing-first evidence is retained for AC-05.4 (allocation sum mismatch), AC-05.6 (illegal target type), AC-05.12 (archived source), and (v1.3) AC-05.14 and AC-05.15 (90-day limit), shown failing on the pre-change release before the implementation commit.
- Atomicity is verified: when a multi-line transaction fails validation, neither the header nor any line is persisted.
- Product Definition of Done in [README.md](README.md) is met.
