# F-11 Transfers: Engineering Contract

Requirements: FR-15; BR-01, BR-02, BR-05, BR-06, BR-07, BR-08, BR-10, BR-14 · Depends on: F-05, F-06 · Issue: #58 · Contract version: 1.0 (see [version history](README.md#6-contract-version-history)) · Suggested branch: `feature/F-11-transfers`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 2 README](README.md) §2; the Sprint 2 Definition of Done is in [Sprint 2 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Let a User move money between their own Cash accounts (for example Bank Account to Wallet) as an allocation line on either transaction form, so the move changes both balances and is never counted as income or expense.

**Workflow**

1. The User opens `/transactions/new`.
2. **Transfer out (Payment tab):** the User picks a Cash source, the date, the total and a line whose target is another of their Cash accounts, shown in the target list under **Transfer to**. The source drops by the line amount and the target rises by it.
3. **Transfer in (Receive tab):** the User picks the receiving Cash account and a line whose target is the Cash account the money came from, shown under **Transfer from**. The receiving account rises and the other Cash account drops by the line amount.
4. A transfer line can be mixed with other lines in one transaction (for example, withdraw 1,500.00 THB from the bank: 1,000.00 THB into the Wallet and 500.00 THB spent on Dining).
5. On save the server applies every F-05/F-06 rule and inserts the transaction and lines in one database transaction; the User returns to the Dashboard, where both Cash balances have changed.

**Rules and validation**

- **S2-D3:** a transfer is a `PAYMENT` or `RECEIPT` with a line targeting a `CASH` account. There is no new transaction kind, endpoint or column.
- **BR-06 (matrix, Sprint 2):** a **Cash** source may now target another **Cash** account on both forms (Sprint 2 README §2.2). The target must differ from the source, belong to the caller and not be archived; otherwise `400 INVALID_TARGET_ACCOUNT`. A **Loan Taken** source still accepts Expense lines only, so a card cannot transfer to Cash (`400 INVALID_TARGET_ACCOUNT`; Q-1, F-10).
- **BR-07 (effects):** Payment line to Cash: target balance + line (transfer in). Receipt line to Cash: target balance − line (transfer out). The source effect is the F-05/F-06 one (Payment −total, Receipt +total). These effects are already in `lineEffect` of the balance engine.
- **BR-08:** transfer lines are neither income nor expense; the income/expense summary is unchanged by a transfer, and so is net worth (NFR-03 invariant).
- **BR-04, BR-05, BR-10, BR-14, BR-16:** unchanged from F-05/F-06 and applied in the same order (ownership 404 first; then source and target types; then the future and 90-day date checks; then the allocation sum).
- **BR-01:** another user's Cash account as a target returns `404 NOT_FOUND`, and nothing is saved.

**Permissions:** User only. Administrator receives 403, anonymous receives 401.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| POST /api/v1/transactions | Unchanged from F-05/F-06 §2.1: `{ kind, accountId, txnDate, totalAmount, memo?, lines: [ { targetAccountId, amount, note? } ] }`, where a line target may now be another Cash account | 201 `{ transaction: { id, kind, accountId, txnDate, totalAmount, memo, lines } }` | Unchanged from F-05/F-06 §2.1 |

- Example transfer out: `{ "kind": "PAYMENT", "accountId": "<Bank Account>", "txnDate": "2026-11-26", "totalAmount": 1000000, "lines": [ { "targetAccountId": "<Savings>", "amount": 1000000 } ] }`.
- `GET /api/v1/transactions`, `GET /api/v1/accounts` and `GET /api/v1/summary/income-expense` are unchanged; a transfer appears in history like any other Payment or Receipt.

### 2.2 UI

- **Payment tab target list:** a **Transfer to** group listing the user's active Cash accounts other than the selected source, after the Expense and Loan repayment groups.
- **Receive tab target list:** a **Transfer from** group listing the user's active Cash accounts other than the receiving account.
- Changing the source clears the target of any line whose target is now the source and shows "Choose another account for this line." on that line; Save stays disabled until a target is chosen.
- The live Total / Allocated / Remaining calculation, inline validation and the date field (F-05 §2.2, v1.3) are unchanged.
- **Cache:** a saved transfer invalidates the `accounts`, `transactions` and `summary` queries (and `loans` once F-10 exists), as every save does.
- Usable at 360 px width.

### 2.3 Data

- No new tables, columns or migrations. Uses `transactions` and `allocation_lines`. The code change is the allowed-target tables `PAYMENT_TARGETS.CASH` and `RECEIPT_TARGETS.CASH` in `server/src/services/allocation.rules.ts`, and the matching groups in the web form.

### 2.4 Sprint 1 contracts revised by this feature

The Sprint 1 matrix tests treated a Cash target as invalid. This feature makes it valid, so the cases move here (recorded as F-05 1.4 and F-06 1.4 in [Sprint 1 README](../sprint-1/README.md) §5):

- F-05 AC-05.13 / TEST-05.13: the Wallet (Cash) target case moves to TEST-11.1 as an accepted transfer. The Salary (Income), self and archived-target cases stay.
- F-06 AC-06.11 / TEST-06.11: the Wallet (Cash) target case moves to TEST-11.2 as an accepted transfer.

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-11.1 | A Payment from a Cash account with one line to another of the user's Cash accounts returns 201; the source balance falls and the target balance rises by the line amount. |
| AC-11.2 | A Receipt into a Cash account with one line targeting another of the user's Cash accounts returns 201; the receiving balance rises and the other Cash balance falls by the line amount. |
| AC-11.3 | A Payment whose lines mix a transfer and an expense returns 201 and applies each line's effect exactly once. |
| AC-11.4 | After transfers, the income/expense summary for the period is unchanged, and the NFR-03 invariant (net worth = signed openings + income − expense) holds to the satang. |
| AC-11.5 | A transfer line to the source itself or to an archived Cash account, and a card (Loan Taken) source with a Cash line, return 400 INVALID_TARGET_ACCOUNT and save nothing. |
| AC-11.6 | A transfer line to another user's Cash account returns 404 NOT_FOUND and saves nothing; an Administrator posting a transfer receives 403 FORBIDDEN and an anonymous caller 401 UNAUTHENTICATED. |
| AC-11.7 | A transfer dated more than 90 days before today returns 400 DATE_TOO_OLD and saves nothing, like any Payment or Receipt (BR-10 v2.0). |
| AC-11.8 | In the browser, the User records a transfer from the Payment tab using the **Transfer to** group and from the Receive tab using the **Transfer from** group; the source account is never offered as its own target, and the Dashboard shows both new balances. |

---

## 4. Software test specification

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-11.1** | AC-11.1 | U, A | Alice logged in; Bank Account opening 50,000.00 THB; Wallet 0 | U: the Payment matrix accepts Cash → Cash. A: POST PAYMENT source Bank Account, total 10,000.00 THB, line Wallet 10,000.00 THB | 201; Bank Account 4,000,000 satang; Wallet 1,000,000 satang. |
| **TEST-11.2** | AC-11.2 | U, A | Alice; Wallet opening 2,000.00 THB; Bank Account opening 0 | U: the Receipt matrix accepts Cash ← Cash. A: POST RECEIPT source Bank Account, total 1,500.00 THB, line Wallet 1,500.00 THB | 201; Bank Account 150,000 satang; Wallet 50,000 satang. |
| **TEST-11.3** | AC-11.3 | A | Alice; Bank Account opening 50,000.00 THB | POST PAYMENT source Bank Account, total 1,500.00 THB, lines Wallet 1,000.00 THB and Dining 500.00 THB | 201; Bank Account 4,850,000 satang; Wallet 100,000 satang; Dining 50,000 satang; the transaction has 2 lines. |
| **TEST-11.4** | AC-11.4 | U, A | Alice after the Sprint 1 journey (income 3,000,000; expense 120,000 satang) | Record TEST-11.1 and TEST-11.2 style transfers dated today; GET the month summary; compute the invariant over `GET /api/v1/accounts` | Summary still income 3,000,000, expense 120,000, net 2,880,000 satang; net worth equals signed openings + income − expense with zero difference. U: the balance engine and summary engine give the same result for a ledger with transfers. |
| **TEST-11.5** | AC-11.5 | U, A | Alice; Savings (Cash) archived | POST PAYMENT Bank Account → Bank Account; PAYMENT Bank Account → Savings; RECEIPT into Bank Account with line Savings; PAYMENT from Credit Card → Wallet | Each returns 400 INVALID_TARGET_ACCOUNT; transaction count and every balance unchanged. |
| **TEST-11.6** | AC-11.6 | A | Bob logged in; Alice's Wallet id; Admin logged in | Bob POSTs PAYMENT from his Bank Account with a line to Alice's Wallet; Admin POSTs a transfer; an anonymous caller POSTs a transfer | Bob: 404 NOT_FOUND, nothing saved, Alice's Wallet unchanged. Admin: 403 FORBIDDEN. Anonymous: 401 UNAUTHENTICATED. |
| **TEST-11.7** | AC-11.7 | A | Alice; Bank Account opening 50,000.00 THB; dates from the Bangkok clock at run time | POST PAYMENT Bank Account → Wallet 100.00 THB dated T−91; then dated T−90 | T−91: 400 DATE_TOO_OLD, nothing saved. T−90: 201. |
| **TEST-11.8** | AC-11.8 | E | Alice logged in; Bank Account opening 50,000.00 THB | On `/transactions/new` Payment tab choose Bank Account, total 1,000.00, target Wallet from **Transfer to**, save; then on the Receive tab choose Wallet, total 200.00, target Bank Account from **Transfer from**, save; check that the selected source never appears in its own target list | Both saves redirect to the Dashboard; Bank Account shows 49,200.00 ฿ and Wallet 800.00 ฿; the source is never offered as a target. |

---

## 5. Definition of done (F-11)

- Every AC above has an executed automated test with results recorded per Sprint 2 README §5.
- Failing-first evidence is retained for AC-11.1 and AC-11.2 (the new matrix rows), shown failing with `INVALID_TARGET_ACCOUNT` on the pre-change code, and for AC-11.4 (summary unchanged).
- TEST-05.13 and TEST-06.11 are changed only as listed in §2.4, in the same commit as the matrix change, and the PR says so.
- The NFR-03 invariant test includes transfers.
- F-11 merges before F-10, which edits the same allowed-target tables.
- The Sprint 2 DoD in [README.md](README.md) §5 is met.
