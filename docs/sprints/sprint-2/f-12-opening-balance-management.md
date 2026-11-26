# F-12 Opening Balance Management: Engineering Contract

Requirements: FR-11; BR-01, BR-02, BR-04, BR-10, BR-11, BR-14; NFR-02, NFR-03, NFR-08 · Depends on: F-04 · Issue: #59 · Contract version: 1.1 (see [version history](README.md#6-contract-version-history)) · Suggested branch: `feature/F-12-opening-balance-management`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 2 README](README.md) §2; the Sprint 2 Definition of Done is in [Sprint 2 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Let a User correct the amount or date of an account's opening balance, or remove it, so a wrong starting position can be fixed without touching any other transaction.

**Workflow**

1. On the Dashboard (`/`), an account card that has an opening balance shows it with two actions: **Edit opening balance** and **Remove**.
2. **Correct:** **Edit opening balance** opens the F-04 dialog filled with the current amount and date. The User changes either or both and saves. The server updates the same opening-balance transaction in place; the card shows the new balance.
3. **Remove:** **Remove** asks "Remove the opening balance of {amount} from {account}? The balance will no longer include it." After confirming, the server voids the opening-balance transaction. The card shows the balance without it and offers **Set opening balance** again (F-04).

**Rules and validation**

- **BR-11:** an account has at most one *active* (not voided) opening balance. Correcting keeps the same transaction id. Removing sets `voided_at` on it (S2-D1, D-04: never hard-deleted), after which F-04 can record a new one; the partial unique index `unique_active_opening_balance` already ignores voided rows.
- **BR-04:** a corrected `amount` is an integer satang value from 0 to 10,000,000,000, as in F-04.
- **BR-10:** a corrected `date` is a valid calendar date not later than today in Bangkok time (`400 FUTURE_DATE_NOT_ALLOWED` otherwise). The 90-day limit does **not** apply to opening balances (BR-10 v2.0, F-04 1.2), so an older date is accepted.
- **Request body:** `PATCH` accepts `amount` and `date`, at least one; any other field, or an empty body, returns `400 VALIDATION_ERROR`. The remove request has no body.
- **No active opening balance:** correcting or removing on an account that has none (never recorded, already removed, or an Income/Expense account) returns `404 NOT_FOUND`. A second remove therefore returns 404.
- **BR-14:** correcting or removing the opening balance of an archived account returns `400 VALIDATION_ERROR`, as recording one does (F-04); the user unarchives it first (F-09).
- **BR-01:** another user's account id returns `404 NOT_FOUND`.
- **S2-D2:** opening balances are changed only here. F-13's edit and void endpoints refuse them.
- **BR-08:** an opening balance is never income or expense, so correcting or removing one never changes the income/expense summary.
- Every check and the write run in one database transaction. The remove uses a conditional update (`voided_at IS NULL`), so two concurrent removes give one 200 and one 404.

**Permissions:** User only. Administrator receives 403 (BR-02), anonymous receives 401.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| PATCH /api/v1/accounts/:id/opening-balance | `{ "amount"?: 5500000, "date"?: "2026-11-01" }`, at least one | 200 `{ "transaction": { id, kind: "OPENING_BALANCE", accountId, txnDate, totalAmount } }` (same `id` as before) | 400 VALIDATION_ERROR; 400 FUTURE_DATE_NOT_ALLOWED; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 415 UNSUPPORTED_MEDIA_TYPE |
| POST /api/v1/accounts/:id/opening-balance/void | none | 200 `{ "transaction": { id, kind: "OPENING_BALANCE", accountId, txnDate, totalAmount, voidedAt } }` | 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND |

- `GET /api/v1/accounts` is unchanged: `openingBalance` shows the corrected values after a `PATCH`, and `null` after a remove.
- `voidedAt` is an ISO 8601 timestamp.
- Until F-13 is merged, history lists non-voided transactions only (F-07 1.1), so a removed opening balance disappears from history; from F-13 (F-07 1.2) it is listed and marked as voided.

### 2.2 UI

- **Dashboard card (F-03/F-04):** when `openingBalance` is set and the account is active, the card shows "Opening balance {amount} on {date}" with **Edit opening balance** and **Remove**. Archived accounts show the text without actions.
- **Edit dialog:** the F-04 dialog with the title "Edit opening balance", pre-filled; the same inline validation (amount not negative and at most 100,000,000.00; date not later than today) and no request while invalid. Save is disabled until a value changes.
- **Remove confirmation:** the text in §1 step 3, with Remove and Cancel.
- **States:** saving and removing disable the buttons; a server error shows a banner in the dialog; an API 401 redirects to `/login`. Usable at 360 px.
- **Cache:** both actions invalidate `accounts`, `transactions` and `summary` (and `loans` once F-10 exists).

### 2.3 Data

- No new tables, columns or migrations. Updates `transactions.total_amount`, `transactions.txn_date` and `transactions.voided_at` on the `OPENING_BALANCE` row; a correction (PATCH) changes `updated_at`; a remove (void) leaves it unchanged (f-12 1.1, the same rule as f-13 1.1), so a removed opening balance that was never corrected is not shown as "Edited". The `transactions_total_amount_range` CHECK and `unique_active_opening_balance` index from migration `20261111213027_accounts_ledger` apply unchanged.

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-12.1 | Correcting the amount, the date, or both of an account's opening balance returns 200 with the same transaction id; the account's balance reflects the new amount, the account still has exactly one active opening balance, and the income/expense summary is unchanged. |
| AC-12.2 | A corrected amount below 0, above 100,000,000.00 THB or not an integer, an empty body or an unknown field returns 400 VALIDATION_ERROR; a future date returns 400 FUTURE_DATE_NOT_ALLOWED; in each case nothing changes. A date more than 90 days ago is accepted. |
| AC-12.3 | Removing an opening balance returns 200 with `voidedAt` set; the balance no longer includes it, `openingBalance` is `null`, and a new opening balance can then be recorded (201). |
| AC-12.4 | Correcting or removing on an account with no active opening balance (never set, already removed, or an Income account) returns 404 NOT_FOUND. |
| AC-12.5 | Correcting or removing the opening balance of an archived account returns 400 VALIDATION_ERROR and changes nothing. |
| AC-12.6 | Another user's account returns 404 NOT_FOUND for both endpoints and changes nothing; an Administrator receives 403 FORBIDDEN and an anonymous caller 401 UNAUTHENTICATED. |
| AC-12.7 | In the browser, the User edits an opening balance from the Dashboard card (with inline validation and no request while invalid) and removes it after confirming; the card shows the new balance and then offers **Set opening balance** again, without a page reload. |

---

## 4. Software test specification

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-12.1** | AC-12.1 | A | Alice; Bank Account opening 50,000.00 THB dated the 1st of this month; Receipt 30,000.00 THB into Bank Account | PATCH `{ amount: 5500000 }`; then PATCH `{ date: <T−200> }`; GET accounts and the month summary | Both 200 with the original transaction id; Bank Account balance 8,500,000 satang; `openingBalance` = 5,500,000 on T−200; exactly one active OPENING_BALANCE row for the account; summary income 3,000,000, unchanged. |
| **TEST-12.2** | AC-12.2 | A | Bank Account opening 50,000.00 THB | PATCH `{ amount: -1 }`; `{ amount: 10000000001 }`; `{ amount: 12.5 }`; `{}`; `{ amount: 100, accountId: "x" }`; `{ date: <tomorrow> }` | First five: 400 VALIDATION_ERROR; the last: 400 FUTURE_DATE_NOT_ALLOWED; the opening balance is still 5,000,000 on its original date. |
| **TEST-12.3** | AC-12.3 | A | TEST-12.1 state | POST `/accounts/{Bank}/opening-balance/void`; GET accounts; POST `/accounts/{Bank}/opening-balance` `{ amount: 1000000, date: today }` | 200 with `voidedAt` set; Bank Account balance 3,000,000 satang; `openingBalance: null`; the new opening balance returns 201 and the balance becomes 4,000,000. `updated_at` is the same before and after the remove (and equals `created_at` for an opening balance that was never corrected). |
| **TEST-12.4** | AC-12.4 | A | Wallet with no opening balance; Bank Account's removed (TEST-12.3 before the new one); Salary (Income) | PATCH and void on Wallet; void again on Bank Account; PATCH on Salary | Each returns 404 NOT_FOUND; nothing changes. |
| **TEST-12.5** | AC-12.5 | A | Wallet opening 1,000.00 THB; Wallet archived directly in the database with the ledger helper (F-12 does not depend on F-09) | PATCH `{ amount: 200000 }`; void | Both 400 VALIDATION_ERROR; the opening balance is unchanged and active. |
| **TEST-12.6** | AC-12.6 | A | Alice's Bank Account opening 50,000.00 THB; Bob, Admin logged in | Bob PATCHes and voids Alice's; Admin does both; anonymous does both | Bob 404 NOT_FOUND; Admin 403 FORBIDDEN; anonymous 401 UNAUTHENTICATED; Alice's opening balance unchanged. |
| **TEST-12.7** | AC-12.7 | E | Alice; Bank Account opening 50,000.00 THB; viewport 1280 and 360 | On the Dashboard click **Edit opening balance**, enter -1 (inline error, no PATCH sent), then 55,000.00 and save; click **Remove** and confirm | The card shows 55,000.00 ฿ after saving; after removing it shows 0.00 ฿ and **Set opening balance**; no page reload; the dialog fits 360 px. |

---

## 5. Definition of done (F-12)

- Every AC above has an executed automated test with results recorded per Sprint 2 README §5.
- Failing-first evidence is retained for AC-12.1 (correct in place), AC-12.3 (remove by voiding, then record again) and AC-12.5 (archived account).
- A concurrent double remove (two requests in parallel) gives one 200 and one 404, checked by an API test.
- The NFR-02 route-list test includes both endpoints; the NFR-03 invariant test includes a corrected and a removed opening balance.
- System-Level SDS §4 and §5 are updated in the implementation PR.
- The Sprint 2 DoD in [README.md](README.md) §5 is met.
