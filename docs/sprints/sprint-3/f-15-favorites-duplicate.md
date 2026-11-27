# F-15 Favorites and Duplicate: Engineering Contract

Requirements: FR-19, FR-20; BR-01, BR-02, BR-12, BR-15 (and BR-04–07, 10, 14, 16 on the saved copy); NFR-02, NFR-08 · Depends on: F-07 (and the F-05/F-06 form) · Issue: to open · Contract version: 1.0 (see [version history](README.md#8-contract-version-history)) · Suggested branch: `feature/F-15-favorites-duplicate`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 3 README](README.md) §2; the Sprint 3 Definition of Done is in [Sprint 3 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Let a User keep the transactions they repeat often (rent, a regular bill, a usual lunch) as favorites, and start a new transaction from any existing one without retyping it, while the original never changes.

**Workflow: favorites**

1. On the transaction detail page and on each history row, an active Payment or Receipt shows a star toggle labelled **Add to favorites** or **Remove from favorites**.
2. Clicking it sends `PATCH /api/v1/transactions/:id/favorite` with `{ isFavorite: true }` or `{ isFavorite: false }`. The star changes after the server answers.
3. **Favorites** (`/favorites`, in the User navigation) lists the favorites newest first, paginated, through `GET /api/v1/transactions?favorite=true`. Each row has **Duplicate** and **Remove from favorites**.

**Workflow: duplicate**

1. The detail page, each history row's menu and each Favorites row show **Duplicate** for a Payment or Receipt, voided or not.
2. Duplicate opens `/transactions/new?duplicateOf=:id`. The form loads `GET /api/v1/transactions/:id` and pre-fills the matching tab (Pay or Receive) with the source, total, memo and every line's target, amount and note. The date is **today** (Bangkok).
3. The User may change anything, including the tab. Nothing is saved until **Save**, which sends an ordinary `POST /api/v1/transactions`.
4. On success the User lands on the new transaction's detail page. The original is unchanged.

**Rules and validation: favorites**

- **Body:** exactly `{ isFavorite: boolean }`; anything else is `400 VALIDATION_ERROR`. The request is idempotent: marking a favorite twice returns 200 both times.
- **Order of checks**, in one database transaction: (1) id is a UUID and the body matches → else 400; (2) the transaction exists and belongs to the caller → else `404 NOT_FOUND` (BR-01); (3) it is not an `OPENING_BALANCE` → else `400 VALIDATION_ERROR` with `details[0].issue = "opening balances cannot be favorites"`; (4) for `isFavorite: true`, it is not voided → else `409 TRANSACTION_VOIDED` (**Q-9**).
- **Q-9:** unmarking a voided favorite is allowed. Voiding a favorite keeps `is_favorite`, so it stays on the Favorites list with the **Voided** badge until the User unmarks it. Marking uses a conditional update (`voided_at IS NULL`), so a mark that races a void either completes first or returns 409.
- **S3-D6 (not an edit):** marking or unmarking writes `is_favorite` only and leaves `updated_at` unchanged, so the transaction is not shown as "Edited". Prisma's `@updatedAt` would move it; the update writes the saved `updated_at` explicitly, as the F-12 remove and the F-13 void do.
- **No financial effect:** balances, the summary, loans and reports ignore `is_favorite`.
- **Favorites list:** `GET /transactions?favorite=true` returns only favorites, with the F-07 order, pagination and item shape; `favorite=false` returns only non-favorites; without the parameter all transactions are returned. Any other value is 400. Once F-14 merges, `favorite` combines with every F-14 filter by AND.
- **Strict query (F-07 1.4):** this feature introduces the strict history query schema: `limit`, `offset` and `favorite`; an unknown parameter is `400 VALIDATION_ERROR`. F-14 extends the same schema.

**Rules and validation: duplicate (BR-15)**

- **Q-10 (what is copied):** kind, source account, total, memo, and each line's target, amount and note, in line order. Not copied: id, date (set to today), `isFavorite` (the copy starts as `false`), `voidedAt`, timestamps.
- **Nothing saved before submit:** opening the duplicate form sends no write request. Leaving the page discards it.
- **The copy is a new transaction:** it is saved through `POST /transactions`, so BR-04, 05, 06, 07, 10, 14 and 16 are checked exactly as for a typed-in transaction (S3-D3), and the response is 201 with a new id.
- **The original is unchanged:** its fields, lines, line ids, `isFavorite`, `voidedAt` and `updatedAt` are the same before and after the copy is saved.
- **Archived accounts:** if the original's source or a line target is now archived, the form still shows it, marks that field "This account is archived. Choose another account.", and keeps Save disabled until it is replaced. The server would reject it anyway (BR-14, BR-06).
- **Voided originals** can be duplicated (Sprint 2 Q-5: a voided transaction is re-recorded as a new one).
- **Opening balances** have no Duplicate action. `duplicateOf` naming an opening balance shows "Opening balances cannot be duplicated" and an empty form.
- **Unknown or another user's id** in `duplicateOf`: the detail request returns 404 and the form shows "Transaction not found" above an empty form (BR-01).

**Permissions:** User only. Administrator receives 403 (BR-02), anonymous receives 401.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| PATCH /api/v1/transactions/:id/favorite | `{ isFavorite: boolean }` | 200 `{ transaction: { id, isFavorite, updatedAt } }` | 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 409 TRANSACTION_VOIDED; 415 UNSUPPORTED_MEDIA_TYPE |
| GET /api/v1/transactions?favorite&limit&offset | `favorite` = `true` or `false`, optional | 200, the F-07 page shape; each item gains `isFavorite` (boolean) | 400 VALIDATION_ERROR (bad value, unknown parameter); 401; 403 |
| GET /api/v1/transactions/:id | unchanged | The transaction gains `isFavorite` | unchanged |
| POST /api/v1/transactions | unchanged (used by Duplicate) | unchanged, 201 | unchanged |

- The route is registered with `access('USER')` and added to the NFR-02 route list.
- State-changing request rules apply (JSON Content-Type, Origin check).

### 2.2 UI

- **Star toggle** (detail page and history rows): an icon button with a text label for screen readers and a tooltip; `aria-pressed` reflects the state; disabled while the request runs; not shown for opening balances; for a voided favorite only **Remove from favorites** is shown.
- **Favorites screen (`/favorites`):** the history list filtered to favorites, with the Voided badge where it applies, **Duplicate** and **Remove from favorites** on each row, and the history pagination. Loading: skeleton rows. Empty: "No favorites yet. Use the star on a transaction to add one." with a link to Transactions. Error: banner with Retry.
- **Duplicate:** the New transaction form, pre-filled, with the title "Duplicate transaction" and the line "Copied from {kind} of {total} on {date}". The live Total / Allocated / Remaining, inline validation and the date window are those of F-05 §2.2. Archived accounts are flagged as in §1.
- **States and cache:** an API 401 redirects to `/login`. A favorite change invalidates the `transactions` list and detail and `favorites`; saving a duplicate invalidates what `POST /transactions` already invalidates. Usable at 360 px.

### 2.3 Data

- No migration. Uses `transactions.is_favorite` (`BOOLEAN NOT NULL DEFAULT false`, migration `20261111213027_accounts_ledger`). The favorites list filters `user_id = ? AND is_favorite` and is served by `transactions_user_id_txn_date_created_at_idx`; F-18 checks whether a partial index is needed.
- `HISTORY_SELECT` and `TransactionHistoryView` gain `isFavorite`.

### 2.4 Sprint 1 tests revised by this feature (F-07 1.4)

In the F-15 commit that adds `isFavorite` to the history select, and listed in the F-15 PR:

| Test | Current expectation (F-07 1.3) | Expectation from F-15 (F-07 1.4) |
|---|---|---|
| TEST-07.1 | item keys `ITEM_KEYS` without `isFavorite` | `ITEM_KEYS` gains `isFavorite`; every demo-ledger item has `isFavorite: false` |
| TEST-07.3 | detail keys equal `ITEM_KEYS` | the same shared `ITEM_KEYS`, now with `isFavorite` |

No other F-07 test changes. A request with an unknown parameter is now 400; no existing test or client sends one (`web/src/api/transactions.api.ts` sends `limit` and `offset` only).

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-15.1 | Marking an active Payment or Receipt as favorite returns 200 with `isFavorite: true`; history and detail then show `isFavorite: true`; `updatedAt` is unchanged; balances and the month summary are unchanged. |
| AC-15.2 | Unmarking returns 200 with `isFavorite: false`; marking or unmarking twice returns 200 each time with the same result. |
| AC-15.3 | `GET /transactions?favorite=true` returns only the caller's favorites, newest first, with `total` counting favorites only; `favorite=false` returns only the others; a value other than `true` or `false`, or an unknown parameter, returns 400 VALIDATION_ERROR. |
| AC-15.4 | Marking a voided transaction returns 409 TRANSACTION_VOIDED and changes nothing; unmarking a voided favorite returns 200; voiding a favorite keeps it on the favorites list with `voidedAt` set; marking an opening balance returns 400 VALIDATION_ERROR. |
| AC-15.5 | A body other than `{ isFavorite: boolean }` returns 400; another user's transaction returns 404 NOT_FOUND and its flag is unchanged; an Administrator receives 403 and an anonymous caller 401; a non-JSON body returns 415. |
| AC-15.6 | Duplicate opens the form pre-filled with the original's kind, source, total, memo and lines (targets, amounts, notes) and today's date, and sends no write request until Save. |
| AC-15.7 | Saving the duplicate creates a new transaction (new id, `isFavorite: false`) whose balance effect is applied exactly once; the original's fields, lines, `isFavorite` and `updatedAt` are unchanged (BR-15). |
| AC-15.8 | A duplicate whose original uses an account archived since is shown with that field flagged and Save disabled until the account is replaced; an opening balance cannot be duplicated; an unknown or another user's `duplicateOf` shows "Transaction not found" and an empty form; a voided transaction can be duplicated. |
| AC-15.9 | In the browser, the User stars a transaction, finds it on Favorites, duplicates it from there and saves the copy; the history then shows both, the star on the original only; Favorites has loading, empty and error states and is usable at 360 px. |

---

## 4. Software test specification

Starting state unless stated: the **search ledger** (Sprint 3 README §6). Satang: Receipt (2) 3,000,000; card charge (3) 120,000; repayment (4) 80,000; transfer (5) 1,000,000; voided Payment (6) 15,000. Bank Account 6,920,000; card debt 40,000; Wallet 1,000,000.

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-15.1** | AC-15.1 | A | Search ledger; record the card charge's `updatedAt` | PATCH `/transactions/{3}/favorite` `{ isFavorite: true }`; GET the detail, `GET /transactions`, `GET /accounts`, the month summary | 200 `{ transaction: { id, isFavorite: true, updatedAt } }` with `updatedAt` equal to the recorded value; detail and history item show `isFavorite: true`; every balance and the summary equal their values before the call. |
| **TEST-15.2** | AC-15.2 | A | TEST-15.1 state | PATCH (3) `true` again; PATCH (3) `false`; PATCH (3) `false` again | 200, 200, 200; final `isFavorite: false`; `updatedAt` still unchanged. |
| **TEST-15.3** | AC-15.3 | A | Mark (2) and (3) | `GET /transactions?favorite=true`; `?favorite=false`; `?favorite=yes`; `?favorite=true&sort=date` | First: `total: 2`, items (3), (2). Second: `total: 4`, items (6), (5), (4), (1). Third and fourth: 400 VALIDATION_ERROR with `details[0].field` `favorite` and `sort`. |
| **TEST-15.4** | AC-15.4 | A | Search ledger; mark (5) | PATCH (6) `true`; void (5) through `/transactions/{5}/void`, then `GET ?favorite=true`; PATCH (5) `false`; PATCH the opening balance (1) `true`; two parallel requests: void (4) and mark (4) | (6): 409 TRANSACTION_VOIDED, still `false`. After voiding (5): listed with `voidedAt` set. Unmark (5): 200. (1): 400 VALIDATION_ERROR, unchanged. Parallel: either both 200 with (4) voided and favorite, or the void 200 and the mark 409; never a voided row newly marked after the void. |
| **TEST-15.5** | AC-15.5 | A | Search ledger; Bob and Admin logged in | PATCH (3) with `{}`, `{ isFavorite: "true" }`, `{ isFavorite: true, memo: "x" }`, a malformed id, a `text/plain` body; Bob PATCHes (3); Admin PATCHes (3); anonymous PATCHes (3) | 400, 400, 400, 400, 415; Bob 404 NOT_FOUND; Admin 403 FORBIDDEN; anonymous 401 UNAUTHENTICATED; (3) still `isFavorite: false`. |
| **TEST-15.6** | AC-15.6 | E | Search ledger | Open the card charge (3), click **Duplicate**; record every request the page sends | URL `/transactions/new?duplicateOf={3}`; Pay tab; source Credit Card; total 1,200.00; memo "Weekend"; lines Dining 700.00 "Team lunch" and Groceries 500.00; date today; no POST, PATCH or PUT request was sent. |
| **TEST-15.7** | AC-15.7 | A, E | Search ledger; mark (3); record (3)'s detail | E: from TEST-15.6, click Save. A: POST the copied body with today's date; then GET (3), `GET /accounts`, the summary for `from=to=today` | 201 with a new id and `isFavorite: false`; (3)'s detail equal to the recorded one (fields, line ids, `isFavorite: true`, `updatedAt`); card debt 160,000 satang (+120,000 once); today's summary expense 120,000 satang. E: lands on the new detail page. |
| **TEST-15.8** | AC-15.8 | E | Search ledger; Groceries archived with the ledger helper | Duplicate (3); duplicate the voided (6); open `/transactions/new?duplicateOf={1}`; open `?duplicateOf=` a random UUID and Bob's Payment id | (3): Groceries line flagged archived and Save disabled until another Expense account is chosen, then Save succeeds. (6): form pre-filled from Wallet 150.00 → Dining. (1): "Opening balances cannot be duplicated", empty form. Random and Bob's id: "Transaction not found", empty form. |
| **TEST-15.9** | AC-15.9 | E | Search ledger; viewports 1280 and 360 | Star (2) on History; open Favorites; click Duplicate on (2), save; open History; load Favorites with the API answering 500 once, and as a user with no favorites | Favorites lists (2) with Duplicate; after Save, History shows the new Receipt and the original, with the star on the original only; error state shows the banner and Retry restores the list; empty state shows its message; no horizontal overflow at 360 px. |

---

## 5. Definition of done (F-15)

- Every AC above has an executed automated test with results recorded per Sprint 3 README §5.
- Failing-first evidence is retained for AC-15.1 (`updatedAt` unchanged), AC-15.3 (favorites filter and strict query), AC-15.4 (voided and opening-balance rules) and AC-15.7 (original unchanged).
- The F-07 tests change only as §2.4 lists, in the commit that adds `isFavorite`; every other F-07, F-05 and F-06 test passes unchanged.
- The NFR-02 route-list test includes `PATCH /transactions/:id/favorite`.
- System-Level SDS §3 (Favorites screen, Duplicate), §4 (route and `favorite` parameter) and §5 (favorite row in the permission matrix) are updated in the implementation PR.
- F-15 merges before F-14, which rebases on the strict query schema.
- The Sprint 3 DoD in [README.md](README.md) §5 is met.
