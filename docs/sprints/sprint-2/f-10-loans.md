# F-10 Loans: Engineering Contract

Requirements: FR-14, FR-21; BR-01, BR-02, BR-05, BR-06, BR-07, BR-08, BR-10, BR-14, BR-16 · Depends on: F-05, F-06, F-09 · Issue: #60 · Contract version: 1.0 (see [version history](README.md#6-contract-version-history)) · Suggested branch: `feature/F-10-loans`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 2 README](README.md) §2; the Sprint 2 Definition of Done is in [Sprint 2 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Let a User record money they lend and borrow and the repayments in both directions, and see in one place how much is owed to them and how much they owe, including credit card debt.

**Workflow**

1. The User creates a Loan Given account (for example `Loan to Bob`) or a Loan Taken account (for example `Loan from Mom`) with F-09, and may record an opening balance with F-04.
2. **Lend:** on the Payment tab, a Cash source with a line to a Loan Given account (group **Lend**). Cash falls; the amount owed to the User rises.
3. **Receive a repayment:** on the Receive tab, a Cash receiving account with a line to the Loan Given account (group **Repayment received**). Cash rises; the amount owed falls.
4. **Borrow:** on the Receive tab, a Cash receiving account with a line to a Loan Taken account (group **Borrow**). Cash rises; the debt rises. This also covers a card cash advance.
5. **Repay a loan:** on the Payment tab, a Cash source with a line to a Loan Taken account (group **Loan repayment**), as in Sprint 1 for the card. Cash falls; the debt falls.
6. The User opens **Loans** (`/loans`) to see two lists, **Owed to me** and **I owe**, each with its accounts, their balances and a total, and buttons to lend, borrow or record a repayment.

**Rules and validation**

- **BR-06 (matrix, Sprint 2):** a Cash Payment source may now target **Loan Given** (lending); a Cash Receipt may target **Loan Given** (repayment received) and **Loan Taken** (borrowing). Targets must differ from the source, belong to the caller and not be archived; otherwise `400 INVALID_TARGET_ACCOUNT`.
- **Q-1 (settled):** a **Loan Taken** source (card charge) still accepts **Expense** lines only. Lending by card or moving card credit to Cash is not supported; such a line returns `400 INVALID_TARGET_ACCOUNT`. Reason: the stakeholder brief only needs card purchases, and every loan row in SRS §4 is then a Cash movement, which keeps the effects and the summary rules simple. SRS §4 is reworded in v2.1 to state this without "In Sprint 1".
- **BR-16:** unchanged. A Loan Given account is never a source; a Payment or Receipt from it returns `400 INVALID_SOURCE_ACCOUNT`.
- **BR-07 (effects, already in the balance engine):** Payment line to Loan Given: owed + line. Receipt line to Loan Given: owed − line. Receipt line to Loan Taken: debt + line. Payment line to Loan Taken: debt − line.
- **BR-08:** lending, borrowing and repayments in either direction are neither income nor expense; the summary is unchanged by them, and the NFR-03 invariant holds.
- **D-02 (over-repayment):** receiving more than is owed, or repaying more than the debt, is allowed; the balance goes negative and is shown with a minus sign and "Negative balance".
- **Outstanding loans (FR-21):** `GET /loans` lists every Loan Given account under `owedToMe` and every Loan Taken account (including credit cards) under `owedByMe`, except archived accounts whose balance is 0. Each list is ordered by name and has `total`, the sum of its balances in satang (a negative balance reduces it).
- **BR-04, BR-05, BR-10, BR-14:** unchanged from F-05/F-06 and applied in the same order.

**Permissions:** User only. Administrator receives 403 (BR-02), anonymous receives 401. `GET /loans` returns only the caller's accounts.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| POST /api/v1/transactions | Unchanged from F-05/F-06 §2.1; a line may now target Loan Given (Payment or Receipt) or Loan Taken (Receipt) | 201 `{ transaction: { id, kind, accountId, txnDate, totalAmount, memo, lines } }` | Unchanged from F-05/F-06 §2.1 |
| GET /api/v1/loans | none | 200 `{ owedToMe: { items: [ { id, name, subtype, isArchived, balance } ], total }, owedByMe: { items: [ … ], total } }` | 401 UNAUTHENTICATED; 403 FORBIDDEN |

- `balance` and `total` are integer satang from the balance engine, the same values `GET /api/v1/accounts` returns.
- Example lend: `{ "kind": "PAYMENT", "accountId": "<Bank Account>", "txnDate": "2026-11-26", "totalAmount": 200000, "lines": [ { "targetAccountId": "<Loan to Bob>", "amount": 200000 } ] }`.

### 2.2 UI

- **Navigation:** the User menu gains **Loans** (`/loans`) after Summary.
- **Loans screen (`/loans`):** two sections, **Owed to me** and **I owe**, each listing account name, subtype (for example Credit card) and formatted balance, an "(archived)" tag where `isArchived`, and the section total. Negative balances show a minus sign and "Negative balance". Buttons: **Lend** and **Record repayment received** (open `/transactions/new` on the Payment or Receive tab), **Borrow** and **Repay** (Receive or Payment tab). The form accepts `?tab=payment|receive` to open on that tab.
- **Empty state:** "No loans yet. Create a Loan Given or Loan Taken account on the Accounts page." with a link to `/accounts`.
- **Transaction form target groups:** Payment tab: Expense, **Loan repayment** (Loan Taken), **Lend** (Loan Given), Transfer to (Cash, F-11). Receive tab: Income, **Repayment received** (Loan Given), **Borrow** (Loan Taken), Transfer from (Cash, F-11). Groups with no active account are hidden. A Credit Card source shows only Expense.
- **States and cache:** skeleton while loading, error banner with Retry, API 401 → `/login`, usable at 360 px. A saved transaction invalidates `accounts`, `transactions`, `summary` and the new `loans` query key.

### 2.3 Data

- No new tables, columns or migrations. `GET /loans` reads the derived balances already computed for `GET /accounts`. The code changes are the allowed-target tables in `server/src/services/allocation.rules.ts`, a loans service and route, and the web form groups and Loans page.

### 2.4 Sprint 1 contracts revised by this feature

- F-06 AC-06.11 / TEST-06.11: the Credit Card (Loan Taken) target case becomes a valid borrowing and moves to TEST-10.3. The archived-target, self and Dining (Expense) cases stay. Recorded as F-06 1.4 in [Sprint 1 README](../sprint-1/README.md) §5, together with F-11's change to the same test.
- F-05 AC-05.6 / TEST-05.6 (a card source with a non-expense line is rejected) is unchanged, because of Q-1.

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-10.1 | A Payment from Cash with a line to a Loan Given account returns 201; Cash falls and the amount owed to the User rises by the line amount. |
| AC-10.2 | A Receipt into Cash with a line to a Loan Given account returns 201; Cash rises and the amount owed falls by the line amount. |
| AC-10.3 | A Receipt into Cash with a line to a Loan Taken account (a personal loan or a credit card) returns 201; Cash rises and the debt rises by the line amount. |
| AC-10.4 | A Payment from Cash with a line to a non-card Loan Taken account returns 201 and reduces that debt. |
| AC-10.5 | After lending, borrowing and repayments, the income/expense summary is unchanged and the NFR-03 invariant holds to the satang. |
| AC-10.6 | A card (Loan Taken) source with a Loan Given or Cash line, and an archived loan account as a target, return 400 INVALID_TARGET_ACCOUNT; a Payment or Receipt whose source is a Loan Given account returns 400 INVALID_SOURCE_ACCOUNT; a Receipt line to an Expense account and a Payment line to an Income account still return 400 INVALID_TARGET_ACCOUNT; a line to another user's loan account returns 404 NOT_FOUND. Each saves nothing. |
| AC-10.7 | Receiving more than is owed on a Loan Given account returns 201, and the account's balance becomes negative. |
| AC-10.8 | `GET /api/v1/loans` returns the caller's Loan Given accounts under `owedToMe` and Loan Taken accounts under `owedByMe` with correct balances and totals, omits archived accounts with a zero balance, and never includes another user's accounts; an Administrator receives 403 and an anonymous caller 401. |
| AC-10.9 | In the browser, the Loans page shows both lists with totals, the empty state, loading and error-with-Retry states, a negative balance with its label, and is usable at 360 px; its buttons open the transaction form on the right tab. |
| AC-10.10 | In the browser, the User lends from the Payment tab using the **Lend** group and borrows from the Receive tab using the **Borrow** group; afterwards the Loans page and the Dashboard show the new balances without a reload. |

---

## 4. Software test specification

All tests create the loan accounts through `POST /api/v1/accounts` (F-09): `Loan to Bob` (LOAN_GIVEN) and `Loan from Mom` (LOAN_TAKEN, OTHER). Alice's Bank Account has an opening balance of 50,000.00 THB unless stated.

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-10.1** | AC-10.1 | U, A | Alice logged in | U: the Payment matrix accepts Cash → Loan Given. A: POST PAYMENT Bank Account → Loan to Bob 2,000.00 THB | 201; Bank Account 4,800,000 satang; Loan to Bob 200,000 satang. |
| **TEST-10.2** | AC-10.2 | U, A | TEST-10.1 state | U: the Receipt matrix accepts Cash ← Loan Given. A: POST RECEIPT into Bank Account, line Loan to Bob 500.00 THB | 201; Bank Account 4,850,000 satang; Loan to Bob 150,000 satang. |
| **TEST-10.3** | AC-10.3 | U, A | Alice; Wallet 0; Credit Card debt 0 | U: the Receipt matrix accepts Cash ← Loan Taken. A: POST RECEIPT into Wallet, line Loan from Mom 5,000.00 THB; then RECEIPT into Bank Account, line Credit Card 300.00 THB | Both 201; Wallet 500,000 satang; Loan from Mom 500,000 satang; Credit Card debt 30,000 satang; Bank Account 5,030,000 satang. |
| **TEST-10.4** | AC-10.4 | A | TEST-10.3 state | POST PAYMENT Wallet → Loan from Mom 1,000.00 THB | 201; Wallet 400,000 satang; Loan from Mom 400,000 satang. |
| **TEST-10.5** | AC-10.5 | U, A | Alice after the Sprint 1 journey (income 3,000,000; expense 120,000 satang), then TEST-10.1 to TEST-10.4 dated today | GET the month summary; compute the invariant over `GET /api/v1/accounts` | Summary still income 3,000,000, expense 120,000, net 2,880,000 satang; net worth equals signed openings + income − expense with zero difference. U: the summary engine ignores Loan Given and Loan Taken lines on both forms. |
| **TEST-10.6** | AC-10.6 | U, A | Alice; `Old loan` (LOAN_GIVEN) archived | POST PAYMENT Credit Card → Loan to Bob; PAYMENT Credit Card → Wallet; PAYMENT Bank Account → Old loan; PAYMENT from Loan to Bob → Dining; RECEIPT into Loan to Bob with line Salary; RECEIPT into Bank Account with line Dining; PAYMENT Bank Account → Salary; Bob POSTs PAYMENT from his Bank Account → Alice's Loan to Bob | INVALID_TARGET_ACCOUNT for the two card cases, Old loan, Dining and Salary; INVALID_SOURCE_ACCOUNT for the two Loan to Bob sources; Bob: 404 NOT_FOUND; transaction count and every balance unchanged for both users. |
| **TEST-10.7** | AC-10.7 | A | TEST-10.2 state (Loan to Bob 150,000 satang) | POST RECEIPT into Bank Account, line Loan to Bob 2,000.00 THB | 201; Loan to Bob −50,000 satang. |
| **TEST-10.8** | AC-10.8 | A | TEST-10.1 to TEST-10.4 recorded; `Old loan` archived with 0; `Closed card` (LOAN_TAKEN, CREDIT_CARD) archived after a 100.00 THB charge; Bob has his own Loan Given account; Admin logged in | Alice GET `/api/v1/loans`; Bob GET; Admin GET; anonymous GET | Alice: `owedToMe.items` = [Loan to Bob 150,000], total 150,000; `owedByMe.items` = [Closed card 10,000 archived, Credit Card 30,000, Loan from Mom 400,000] in name order, total 440,000; no `Old loan`; none of Bob's accounts. Bob sees only his own. Admin 403; anonymous 401. |
| **TEST-10.9** | AC-10.9 | E | Alice with no loan accounts, then with TEST-10.7 state; viewport 1280 and 360 | Open `/loans` with no loans; with the request delayed and then failing, press Retry; with loans; press **Borrow** | Empty state with the Accounts link; skeleton then error banner, and Retry renders the lists; Loan to Bob shows -500.00 ฿ with "Negative balance"; totals shown; the page fits 360 px; **Borrow** opens `/transactions/new?tab=receive` on the Receive tab. |
| **TEST-10.10** | AC-10.10 | E | Alice logged in; Loan to Bob and Loan from Mom exist | On the Payment tab choose Bank Account, target Loan to Bob from **Lend**, 2,000.00, save; on the Receive tab choose Wallet, target Loan from Mom from **Borrow**, 5,000.00, save; open `/loans` | Both saves succeed; with Credit Card as source only Expense targets are offered; `/loans` shows Loan to Bob 2,000.00 ฿ and Loan from Mom 5,000.00 ฿, and the Dashboard shows Wallet 5,000.00 ฿, without a page reload. |

---

## 5. Definition of done (F-10)

- Every AC above has an executed automated test with results recorded per Sprint 2 README §5.
- Failing-first evidence is retained for AC-10.1, AC-10.2 and AC-10.3 (the new matrix rows, failing with `INVALID_TARGET_ACCOUNT` on the pre-change code), AC-10.5 (summary unchanged) and AC-10.8 (`GET /loans` ownership and totals).
- TEST-06.11 is changed only as listed in §2.4, in the same commit as the matrix change, and the PR says so.
- The NFR-02 route-list test includes `GET /loans`; the NFR-03 invariant test includes loans.
- System-Level SDS §3 (Loans screen), §4 (`GET /loans`) and §5 are updated in the implementation PR.
- F-10 rebases on F-11 (both change `allocation.rules.ts`).
- The Sprint 2 DoD in [README.md](README.md) §5 is met.
