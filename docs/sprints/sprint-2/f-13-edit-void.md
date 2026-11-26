# F-13 Edit and Void Transactions: Engineering Contract

Requirements: FR-16; BR-01, BR-02, BR-04, BR-05, BR-06, BR-07, BR-10, BR-12, BR-14, BR-16; NFR-02, NFR-03, NFR-08 · Depends on: F-05, F-06, F-07 · Issue: #61 · Contract version: 1.1 (see [version history](README.md#6-contract-version-history)) · Suggested branch: `feature/F-13-edit-void`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 2 README](README.md) §2; the Sprint 2 Definition of Done is in [Sprint 2 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Let a User correct a Payment or Receipt, or void one that should not count, with every balance and summary following automatically, while voided transactions stay visible in history.

**Workflow**

1. On the transaction detail page (`/transactions/:id`), an active Payment or Receipt shows **Edit** and **Void**.
2. **Edit:** opens `/transactions/:id/edit`, the F-05/F-06 form on the transaction's tab (Payment or Receive), pre-filled with its source, date, total, memo and lines. The kind cannot be changed. The User changes any field or line and saves; the server re-checks the whole new version and replaces the transaction's fields and lines in one database transaction. The User returns to the detail page.
3. **Void:** asks "Void this {kind} of {total} on {date}? It will stay in history but no longer count in balances or summaries. This cannot be undone." After confirming, the server sets `voided_at`.
4. History (`/transactions`) and detail show a voided transaction with a **Voided** badge and its amount struck through, and no Edit or Void actions. Balances, the Dashboard, the summary and the Loans page exclude it.

**Rules and validation**

- **S2-D4 (edit = save the new version):** the request carries the full new version (`accountId`, `txnDate`, `totalAmount`, `memo`, `lines`). The server checks it in this order, which is the order the create path already uses (`transaction.service.ts`, `checkPaymentAccounts` / `checkReceiptAccounts`), extended by the three edit-only checks (steps 2 to 4):
  1. Request schema: shape, unknown fields, `kind` present, amounts (BR-04), at least one line, date format → `400 VALIDATION_ERROR`.
  2. The transaction exists and belongs to the caller → otherwise `404 NOT_FOUND` (BR-01).
  3. It is not an opening balance → otherwise `400 VALIDATION_ERROR` (S2-D2).
  4. It is not voided → otherwise `409 TRANSACTION_VOIDED` (Q-5).
  5. The new source and every line target belong to the caller → otherwise `404 NOT_FOUND`.
  6. Archived source → `400 VALIDATION_ERROR` (BR-14), unless exempt under S2-D6.
  7. Source type → `400 INVALID_SOURCE_ACCOUNT` (BR-16).
  8. Targets: archived (unless exempt under S2-D6), the source itself, or outside the matrix (including the F-10/F-11 rows) → `400 INVALID_TARGET_ACCOUNT` (BR-06).
  9. Future date → `400 FUTURE_DATE_NOT_ALLOWED`; then the 90-day window → `400 DATE_TOO_OLD`, unless the date is unchanged (S2-D6) (BR-10).
  10. Allocation sum → `400 INVALID_ALLOCATION_SUM` (BR-05).

  On any failure nothing changes. The create and edit paths call one shared validator for steps 5 to 10, so the order cannot drift between them.
- **S2-D6 (unchanged values may stay):** an edit may keep (a) the saved `txnDate` even if it is now more than 90 days ago, and (b) an account that has since been archived, but only **in the same role**: the saved source may stay the source, and an account that was a line target may stay a line target. An archived account moved into another role (for example a former target chosen as the new source) counts as newly chosen. A **changed** date must be within T−90 to today (**Q-4**), and a **newly chosen** account must be active.
- **Kind is fixed:** a body with `kind`, or any field other than the five above, returns `400 VALIDATION_ERROR`.
- **Lines are replaced:** the old lines are deleted and the new ones inserted with new ids and `line_no` 1..n. The transaction keeps its `id` and `created_at`; `updated_at` is set to the time of the edit. (1.1) A new transaction has `updated_at` equal to `created_at`, and a void sets `voided_at` only and leaves `updated_at` unchanged, so `updatedAt` later than `createdAt` means the transaction was edited.
- **Q-6 (no audit trail):** previous versions are not stored; `updatedAt` shows that, and when, a transaction was last edited. This is a disclosed limitation.
- **Void:** sets `voided_at`; nothing is deleted (D-04). There is no date limit on voiding (**Q-4**).
- **Q-5 / BR-12 (void is final):** editing or voiding a voided transaction returns `409 TRANSACTION_VOIDED` and changes nothing; there is no un-void. The void uses a conditional update (`voided_at IS NULL`), so two concurrent voids give one 200 and one 409, and an edit that races a void either completes first or returns 409.
- **S2-D2:** an `OPENING_BALANCE` transaction cannot be edited or voided here: `400 VALIDATION_ERROR` with `details[0].issue = "opening balances are changed on the account"` (F-12).
- **BR-12 (history):** `GET /transactions` and `GET /transactions/:id` return voided transactions with `voidedAt` set; they still count in `total` and keep their place in the newest-first order. Balances (F-03), the summary (F-08) and loans (F-10) already exclude `voided_at IS NOT NULL`. This revises F-07 to 1.2.
- **BR-01:** another user's transaction id returns `404 NOT_FOUND` for edit and void.

**Permissions:** User only. Administrator receives 403 (BR-02), anonymous receives 401.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| PATCH /api/v1/transactions/:id | `{ accountId, txnDate, totalAmount, memo?, lines: [ { targetAccountId, amount, note? } ] }` | 200 `{ transaction: { id, kind, accountId, txnDate, totalAmount, memo, lines, updatedAt } }` | 400 VALIDATION_ERROR; 400 INVALID_ALLOCATION_SUM; 400 FUTURE_DATE_NOT_ALLOWED; 400 DATE_TOO_OLD; 400 INVALID_SOURCE_ACCOUNT; 400 INVALID_TARGET_ACCOUNT; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 409 TRANSACTION_VOIDED; 415 UNSUPPORTED_MEDIA_TYPE |
| POST /api/v1/transactions/:id/void | none | 200 `{ transaction: { id, kind, accountId, txnDate, totalAmount, memo, voidedAt } }` | 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 409 TRANSACTION_VOIDED |
| GET /api/v1/transactions, GET /api/v1/transactions/:id | Unchanged requests | Each item / the transaction gains `voidedAt` (ISO timestamp or `null`), `updatedAt` and (1.1) `createdAt`; voided transactions are included (F-07 1.2, 1.3) | Unchanged |

- The `PATCH` body has the same field rules as `POST /transactions` (F-05 §2.1) without `kind`.
- `createdAt`, `updatedAt` and `voidedAt` are ISO 8601 timestamps.

### 2.2 UI

- **Detail page (`/transactions/:id`):** for an active Payment or Receipt, **Edit** and **Void** buttons. For a voided transaction, a **Voided** badge, "Voided on {date}", struck-through amounts and no actions. For an opening balance, no actions and the note "Change it from the Dashboard".
- **Edit page (`/transactions/:id/edit`):** the F-05/F-06 form on the matching tab with the kind tabs disabled, pre-filled; the live Total / Allocated / Remaining, the target groups, inline validation and the date field as in F-05 §2.2 (v1.3), except that an unchanged date older than T−90 is shown without an error. Save is disabled while invalid and until something changes. Cancel returns to the detail page. Server errors map to fields or a banner.
- **Void confirmation:** the text in §1 step 3, with Void and Cancel.
- **History (`/transactions`):** voided rows show the **Voided** badge and struck-through total; edited rows (`updatedAt` later than `createdAt`, 1.1) show "Edited" with `updatedAt` on the detail page.
- **States and cache:** buttons disabled while saving; an API 401 redirects to `/login`; a 404 shows "Transaction not found"; a 409 shows "This transaction has already been voided." and reloads it. Edit and void invalidate `accounts`, `transactions` (list and detail), `summary` and `loans`. Usable at 360 px.

### 2.3 Data

- No new tables, columns or migrations. Uses `transactions.voided_at` and `transactions.updated_at` (migration `20261111213027_accounts_ledger`); lines are replaced through the existing cascade from `transactions` to `allocation_lines`. The F-05/F-06 validation is shared by create and edit rather than copied.

### 2.4 Sprint 1 tests revised by this feature (F-07 1.2, 1.3)

The F-07 demo ledger (`insertDemoLedger` in `tests/helpers/ledger.helper.ts`) already contains one voided 5,000.00 THB Payment dated 28 Jan, newer than the other four rows. Once history returns voided transactions, these tests in `tests/api/transaction-history.api.test.ts` change, **in the F-13 commit that changes the history query**, and the F-13 PR lists them. No AC changes, and each test keeps checking the same behaviour.

| Test | Current expectation (F-07 1.1) | Expectation from F-13 (F-07 1.2, 1.3) |
|---|---|---|
| TEST-07.1 | `total: 4`; items repayment, card charge, salary, opening; `not.toContain(voidedTransactionId)`; item keys without `voidedAt`/`updatedAt` | `total: 5`; items voided payment, repayment, card charge, salary, opening; the voided item has `voidedAt` set and the other four `voidedAt: null`; item keys include `voidedAt`, `updatedAt` and `createdAt` |
| TEST-07.2 | `?limit=2&offset=2` → `total: 4`, items salary, opening | `total: 5`, items card charge, salary (the voided row now takes position 1) |
| TEST-07.3 | `GET /transactions/{card charge}` → keys equal `ITEM_KEYS` (no `voidedAt`/`updatedAt`) | keys include `voidedAt`, `updatedAt` and `createdAt` (through the shared `ITEM_KEYS`), with `voidedAt: null` for the card charge |
| "a malformed transaction id returns 400 … and an offset past the end returns an empty page" | `?offset=10` → `total: 4` | `total: 5` |
| "a voided transaction is not returned by id (f-07 1.1 §1)" | 404 | Renamed to "a voided transaction is returned by id, marked as voided (f-07 1.2)": 200 with `voidedAt` set |
| "the history query uses ${HISTORY_INDEX} on a realistic ledger (f-07 §5)" | `EXPLAIN` of the query with `voided_at IS NULL` | `EXPLAIN` of the new history query without the voided filter; still uses `transactions_user_id_txn_date_created_at_idx` |

The comment in that file's `beforeEach` ("one voided 5,000.00 payment that history must not list") is updated to match. Balances (`accounts.api.test.ts` TEST-03.3) and summaries (`summary.api.test.ts` TEST-08.3) still exclude the voided row and do not change; nor does "transactions tied on date and creation time page in a stable id order …", whose two rows are dated 1 Feb, newer than the voided 28 Jan row, so they stay at offsets 0 and 1.

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-13.1 | Editing a card charge's lines and total returns 200 with the same id and a new `updatedAt`; the card debt, the expense totals and the month summary change exactly as if the new version had been saved originally. |
| AC-13.2 | Editing a Payment's source, date and memo returns 200; the old source's balance is restored and the new source's balance changes; the transaction keeps its id, and its lines are replaced. |
| AC-13.3 | An edit that breaks a create-time rule (lines not summing to the total, a target outside the matrix, a source of the wrong type, a future date, a new date before T−90, a newly chosen archived account, or a body with `kind`) returns that rule's error and leaves the transaction, its lines and every balance unchanged. |
| AC-13.4 | A transaction dated before T−90 can be edited when its date is unchanged, and a transaction whose target was archived after saving can be edited while keeping that target; changing that old transaction's date to another date before T−90 returns 400 DATE_TOO_OLD. |
| AC-13.5 | Voiding a transaction returns 200 with `voidedAt`; balances, the month summary and the loans totals exclude it; `GET /transactions` and `GET /transactions/:id` still return it with `voidedAt` set and it still counts in `total`. |
| AC-13.6 | Editing or voiding a voided transaction returns 409 TRANSACTION_VOIDED and changes nothing; two concurrent voids give one 200 and one 409. |
| AC-13.7 | Editing or voiding an `OPENING_BALANCE` transaction through these endpoints returns 400 VALIDATION_ERROR and changes nothing. |
| AC-13.8 | Editing or voiding another user's transaction returns 404 NOT_FOUND and changes nothing; an Administrator receives 403 FORBIDDEN and an anonymous caller 401 UNAUTHENTICATED. |
| AC-13.9 | After any mix of edits and voids, the NFR-03 invariant holds to the satang. |
| AC-13.10 | In the browser, the User edits a transaction from its detail page (pre-filled form, live allocation, inline validation) and voids another after confirming; history then shows the voided row with its badge, and the Dashboard and summary show the new values without a page reload; the edit form is usable at 360 px. |

---

## 4. Software test specification

Starting state unless stated: Alice after the Sprint 1 journey (plan.md §2): Bank Account opening 50,000.00 THB; Receipt 30,000.00 THB to Salary; card charge 1,200.00 THB (Dining 700.00, Groceries 500.00); repayment 800.00 THB from Bank Account to Credit Card; all dated in the current month. Bank Account 7,920,000 satang; card debt 40,000 satang.

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-13.1** | AC-13.1 | A | Starting state | PATCH the card charge with total 1,400.00 THB, lines Dining 900.00 and Groceries 500.00, same source and date | 200; same id; `updatedAt` later than before; card debt 60,000 satang; Dining 90,000; Groceries 50,000; month expense 140,000 satang. |
| **TEST-13.2** | AC-13.2 | A | Starting state; Wallet opening 1,000.00 THB | PATCH the repayment: source Wallet, date the 2nd of the month, memo "moved", one line Credit Card 800.00 THB | 200; same id; Bank Account 8,000,000 satang; Wallet 20,000 satang; card debt 40,000; detail shows the new memo and one line with a new line id. |
| **TEST-13.3** | AC-13.3 | U, A | Starting state; Telecom archived directly in the database with the ledger helper (F-13 does not depend on F-09) | PATCH the card charge with, in turn: lines summing to 1,000.00 of 1,200.00; a line to Salary; source Salary; tomorrow's date; date T−91; a new line to Telecom; a body with `kind: "RECEIPT"` | INVALID_ALLOCATION_SUM; INVALID_TARGET_ACCOUNT; INVALID_SOURCE_ACCOUNT; FUTURE_DATE_NOT_ALLOWED; DATE_TOO_OLD; INVALID_TARGET_ACCOUNT; VALIDATION_ERROR. After each, the charge, its two lines and every balance are unchanged. U: the shared validator returns the same errors for create and edit. |
| **TEST-13.4** | AC-13.4 | U, A | A Payment Bank Account → Telecom 100.00 THB dated T−120, inserted through Prisma (an old row saved before v2.0); a Payment Bank Account → Electricity 50.00 THB dated today, then Electricity archived directly in the database with the ledger helper | PATCH the T−120 Payment with memo "old" and total and line 120.00 (date unchanged); PATCH it with date T−100; PATCH the Electricity Payment with memo "kept" (target unchanged); PATCH it again with source Electricity (archived, moved into the source role) | First: 200 and Telecom shows 12,000 satang. Second: 400 DATE_TOO_OLD, unchanged. Third: 200. Fourth: 400 VALIDATION_ERROR (archived source), unchanged. U: the rule exempts only an unchanged date and accounts kept in the same role. |
| **TEST-13.5** | AC-13.5 | A | Starting state | POST `/transactions/{repayment}/void`; GET accounts, the month summary, `GET /transactions` and the detail | 200 with `voidedAt`; Bank Account 8,000,000 satang; card debt 120,000; summary unchanged (income 3,000,000, expense 120,000); history `total` still 4 and the repayment has `voidedAt` set; detail 200 with `voidedAt`. |
| **TEST-13.6** | AC-13.6 | A | TEST-13.5 state; a second active Payment | PATCH the voided repayment; void it again; send two voids of the second Payment in parallel | PATCH and repeat void: 409 TRANSACTION_VOIDED, nothing changes; parallel voids: one 200 and one 409. |
| **TEST-13.7** | AC-13.7 | A | Starting state | PATCH the Bank Account opening-balance transaction; void it through `/transactions/:id/void` | Both 400 VALIDATION_ERROR; the opening balance is unchanged and active. |
| **TEST-13.8** | AC-13.8 | A | Starting state; Bob and Admin logged in | Bob PATCHes and voids Alice's card charge; Admin does both; anonymous does both | Bob 404 NOT_FOUND; Admin 403 FORBIDDEN; anonymous 401 UNAUTHENTICATED; the charge is unchanged and active. |
| **TEST-13.9** | AC-13.9 | U, A | Starting state | Apply TEST-13.1 and then TEST-13.5; compute the invariant over `GET /api/v1/accounts` | Net worth (8,000,000 − 140,000 = 7,860,000 satang) equals openings 5,000,000 + income 3,000,000 − expense 140,000, with zero difference. U: the balance engine ignores voided rows and uses the edited lines. |
| **TEST-13.10** | AC-13.10 | E | Starting state; viewport 1280 and 360 | Open the card charge, click **Edit**, set Dining to 900.00 (Save is disabled while Remaining is −200.00), set the total to 1,400.00, save; open the repayment, click **Void** and confirm; open `/transactions` and the Dashboard | The detail page shows Dining 900.00 ฿ and "Edited"; the history row for the repayment shows **Voided** and a struck-through 800.00 ฿; the Dashboard shows Bank Account 80,000.00 ฿ and Credit Card 1,400.00 ฿; no page reload; the edit form fits 360 px. |

---

## 5. Definition of done (F-13)

- Every AC above has an executed automated test with results recorded per Sprint 2 README §5.
- Failing-first evidence is retained for AC-13.1 (edit recalculates), AC-13.3 (edit re-validates), AC-13.4 (S2-D6 exemptions), AC-13.5 (void excludes but keeps in history) and AC-13.6 (409 on a voided transaction).
- The create and edit paths share one validation function; the PR shows that F-05/F-06 tests still pass unchanged.
- The F-07 tests listed in §2.4 change only as listed there, in the commit that changes the history query; every other F-07 test passes unchanged. The F-07 1.2 behaviour is also covered by TEST-13.5 and TEST-13.10.
- The NFR-02 route-list test includes both endpoints; the NFR-03 invariant test includes edits and voids.
- System-Level SDS §3 (edit page), §4 and §5 are updated in the implementation PR.
- F-13 rebases after F-10 and F-11 so edits are checked against the Sprint 2 matrix.
- The Sprint 2 DoD in [README.md](README.md) §5 is met.
