# F-14 Search and Filter History: Engineering Contract

Requirements: FR-18; BR-01, BR-02, BR-12; NFR-02, NFR-07, NFR-08 · Depends on: F-07 (rebases on F-15 for the strict query schema) · Issue: to open · Contract version: 1.0 (see [version history](README.md#8-contract-version-history)) · Suggested branch: `feature/F-14-search-filter`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 3 README](README.md) §2; the Sprint 3 Definition of Done is in [Sprint 3 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Let a User find transactions in a long history by date range, account, category, text and amount range, without leaving the history screen.

**Workflow**

1. On Transactions (`/transactions`) the User opens the filter panel and sets any of: date from, date to, account, category, text, minimum amount, maximum amount (and, from F-15, Favorites only).
2. **Apply** sends `GET /api/v1/transactions` with the set filters, `limit` and `offset=0`. The filters are also written to the page URL, so reload, Back and a shared link keep them.
3. The list shows the matching transactions, newest first, paginated, with "{total} transactions match" above it.
4. **Clear filters** removes every filter and returns to the full history.

**Rules and validation**

- **S3-D2:** the filters are optional query parameters on the existing endpoint. With none set, the response is the F-07 response. Every filter is combined with every other by **AND**.
- **Ownership (BR-01):** the query always filters `transactions.user_id = session.userId`; a filter can only narrow the caller's own rows.
- **Date range** (`from`, `to`, `YYYY-MM-DD`, each optional): inclusive on `txn_date`. `from` later than `to` is `400 VALIDATION_ERROR` on `from`. There is no 90-day limit on searching; any valid calendar date is accepted.
- **Account** (`accountId`, UUID) (**Q-7**): matches a transaction whose **source is the account or any line targets it**. The account must belong to the caller (else `404 NOT_FOUND`) and be Cash, Loan Taken or Loan Given (else `400 VALIDATION_ERROR` with `details[0].issue = "use categoryId for income and expense accounts"`). Archived accounts are allowed: their history is kept (BR-14).
- **Category** (`categoryId`, UUID): matches a transaction with at least one line targeting the account. The account must belong to the caller (else 404) and be Income or Expense (else 400). Archived categories are allowed.
- **Text** (`q`) (**Q-8**): trimmed, 1 to 100 characters; case-insensitive substring of the memo or of any line note. `%`, `_` and `\` are matched literally (escaped before `ILIKE`). Empty or whitespace-only `q` is 400.
- **Amount range** (`minAmount`, `maxAmount`, integer satang, 0 to 10,000,000,000 each): inclusive on `total_amount`. `minAmount` greater than `maxAmount` is 400 on `minAmount`. Decimal or negative values are 400. (Integer satang, S3-D7; the UI converts THB input with the same parser as the forms.)
- **Matched rows are whole transactions:** each item carries all its lines, not only the ones that matched.
- **Voided transactions (BR-12):** included and marked, exactly as in F-07 1.2; they count in `total`.
- **Order and pagination:** unchanged (`txn_date DESC, created_at DESC, id DESC`; `limit` 1–100, default 50; `offset` ≥ 0). `total` counts the filtered set; count and page come from one REPEATABLE READ snapshot, as F-07 does.
- **Strict query:** each parameter may appear once; a repeated parameter, an empty value or an unknown parameter is 400 (F-07 1.4, schema introduced by F-15). Errors name the parameter in `details[].field`.
- **Performance:** the filtered query keeps the `user_id` index path; F-18 measures a filtered 50-row page against NFR-07 with 10,000 transactions.

**Permissions:** User only. Administrator receives 403 (BR-02), anonymous receives 401. Neither ever sees whether an account id exists.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| GET /api/v1/transactions?from&to&accountId&categoryId&q&minAmount&maxAmount&favorite&limit&offset | all optional; see §1 | 200 `{ items: [ …F-07 item with isFavorite… ], total, limit, offset }` | 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND (accountId or categoryId not the caller's) |

- The filter is built in one place (`buildHistoryWhere` or equivalent) and used for both the count and the page, so `total` and `items` can never disagree.
- The text and account filters use `EXISTS` sub-queries on `allocation_lines` (joined on `transaction_id` and `user_id`), never a join that duplicates rows.
- The response shape does not change; the request echoes nothing back except `limit` and `offset`.

### 2.2 UI

- **Filter panel** above the history list: date from and to (date inputs), Account (select grouped Cash / Loan Taken / Loan Given; archived accounts labelled "(archived)"), Category (select grouped Income / Expense), Text, Minimum and Maximum amount (THB), Favorites only (F-15). Buttons **Apply** and **Clear filters**. At 360 px the panel is collapsed behind a **Filters** button that shows the number of active filters.
- **Inline validation** before any request: from later than to, minimum above maximum, an amount with more than 2 decimals or above 100,000,000.00, text over 100 characters. Apply is disabled while a field is invalid. Server errors map to the named field.
- **URL state:** the filters are stored in the URL query string (`/transactions?categoryId=…&q=lunch`); changing any filter resets the page to the first one.
- **States:** loading skeleton; empty with filters: "No transactions match these filters." with **Clear filters**; empty without filters: the F-07 empty state; error banner with Retry; a 404 for a filter account (for example a stale shared link) shows "That account was not found" and clears that filter. An API 401 redirects to `/login`.
- **Active-filter chips** above the list name each filter in text (for example "Category: Dining", "Amount: 1,000.00–2,000.00 ฿"), each removable.

### 2.3 Data

- No migration. The filters read `transactions` (`txn_date`, `total_amount`, `memo`, `account_id`) and `allocation_lines` (`target_account_id`, `note`). If F-18 finds a filtered page above the NFR-07 limit, F-18 adds the index and records it in System-Level SDS §2.

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-14.1 | `from` and `to` return exactly the caller's transactions dated within the inclusive range, newest first, with `total` counting them. |
| AC-14.2 | `accountId` of a Cash or Loan account returns every transaction whose source is that account or with a line targeting it, including opening balances and transfers in. |
| AC-14.3 | `categoryId` of an Income or Expense account returns every transaction with a line targeting it, each with all its lines. |
| AC-14.4 | `q` returns transactions whose memo or any line note contains the text, ignoring case; `%` and `_` match only themselves. |
| AC-14.5 | `minAmount` and `maxAmount` return transactions whose total is within the inclusive range, in satang. |
| AC-14.6 | Several filters combine by AND; `total`, `limit` and `offset` describe the filtered set; voided transactions that match are included and marked; with no filter the response equals the F-07 response. |
| AC-14.7 | An invalid filter (from after to, min above max, a non-UUID id, an Income account as `accountId`, a Cash account as `categoryId`, an empty or 101-character `q`, a decimal amount, a repeated or unknown parameter) returns 400 VALIDATION_ERROR naming the parameter. |
| AC-14.8 | A filter on another user's account returns 404 NOT_FOUND; no filter ever returns another user's transaction; an Administrator receives 403 and an anonymous caller 401. |
| AC-14.9 | In the browser, the User filters by category, text and amount, sees the matching rows and the active-filter chips, reloads the page with the filters kept, and clears them; inline errors stop an invalid filter; the empty-result state and 360 px layout work. |

---

## 4. Software test specification

Starting state unless stated: the **search ledger** (Sprint 3 README §6), with transactions (1) to (6) and Bob's Payment. Satang: (1) 5,000,000; (2) 3,000,000; (3) 120,000; (4) 80,000; (5) 1,000,000; (6) 15,000, voided.

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-14.1** | AC-14.1 | A | Search ledger | `GET /transactions?from={T−10}&to={T−2}`; `?from={T−1}`; `?to={T−30}` | First: `total: 3`, items (5), (4), (3) (both ends included). Second: `total: 1`, (6). Third: `total: 1`, (1). |
| **TEST-14.2** | AC-14.2 | A | Search ledger | `?accountId=` Wallet; Bank Account; Credit Card; an archived Cash account with no rows (archived with the ledger helper) | Wallet: `total: 2`, (6) source, (5) line target. Bank: `total: 4`, (5), (4), (2), (1). Credit Card: `total: 2`, (4) target, (3) source. Archived: 200, `total: 0`. |
| **TEST-14.3** | AC-14.3 | A | Search ledger | `?categoryId=` Dining; Salary; Groceries | Dining: `total: 2`, (6) with `voidedAt` set, (3) with both its lines (Dining and Groceries). Salary: `total: 1`, (2). Groceries: `total: 1`, (3). |
| **TEST-14.4** | AC-14.4 | U, A | Search ledger | `?q=lunch`; `?q=SALARY`; `?q=%25` (`%`); `?q=_`; `?q=top%20up` | `lunch`: `total: 1`, (3) (from its line note; Bob's row not returned). `SALARY`: (2). `%`: (5) only. `_`: `total: 0`. `top up`: (5). U: the escape function turns `%`, `_` and `\` into literals. |
| **TEST-14.5** | AC-14.5 | A | Search ledger | `?minAmount=80000&maxAmount=120000`; `?minAmount=1000000`; `?maxAmount=15000` | First: `total: 2`, (4), (3) (both ends included). Second: `total: 3`, (5), (2), (1). Third: `total: 1`, (6). |
| **TEST-14.6** | AC-14.6 | A | Search ledger; (3) marked favorite (F-15) | `?categoryId=Dining&q=lunch&from={T−10}`; `?accountId=Bank&limit=1`; `?accountId=Bank&limit=1&offset=1`; `?categoryId=Dining&favorite=true`; no filter | First: `total: 1`, (3). Second: `total: 4`, items (5). Third: `total: 4`, items (4). Fourth: `total: 1`, (3). No filter: equal to the F-07 TEST-07.1 shape with `total: 6`. |
| **TEST-14.7** | AC-14.7 | U, A | Search ledger | In turn: `from` after `to`; `minAmount=200&maxAmount=100`; `accountId=abc`; `accountId=` Salary; `categoryId=` Wallet; `q=` (empty); `q` of 101 characters; `minAmount=1.5`; `minAmount=-1`; `q=a&q=b`; `?page=2` | Each 400 VALIDATION_ERROR with `details[0].field` naming `from`, `minAmount`, `accountId`, `accountId`, `categoryId`, `q`, `q`, `minAmount`, `minAmount`, `q`, `page`. U: the query schema gives the same errors. |
| **TEST-14.8** | AC-14.8 | A | Search ledger; Bob and Admin logged in | Bob `?categoryId=` Alice's Dining; Bob `?accountId=` Alice's Bank Account; Bob `?q=lunch`; Admin `?q=lunch`; anonymous `?q=lunch` | Bob: 404 NOT_FOUND, 404 NOT_FOUND, then 200 `total: 1` with his own Payment only. Admin 403 FORBIDDEN; anonymous 401 UNAUTHENTICATED. No response body contains an Alice transaction id. |
| **TEST-14.9** | AC-14.9 | E | Search ledger; viewports 1280 and 360 | Open Transactions; set Category Dining and Apply; add Text "lunch"; reload; set Minimum 2,000.00 and Maximum 1,000.00; fix it to Minimum 1,000.00, Maximum 2,000.00, Category cleared, Text cleared, Apply; set Text "zzz"; click Clear filters | Dining: rows (6) Voided and (3), chips "Category: Dining". With "lunch": (3) only; after reload the URL and the list are unchanged. Min above max: inline error, Apply disabled, no request sent. Amount 1,000.00–2,000.00: (3) only. "zzz": the empty-result message with Clear filters. Clear: all six rows. At 360 px the panel opens from **Filters** and nothing overflows. |

---

## 5. Definition of done (F-14)

- Every AC above has an executed automated test with results recorded per Sprint 3 README §5.
- Failing-first evidence is retained for AC-14.2 (source-or-target match), AC-14.4 (literal wildcards), AC-14.6 (AND and `total`), AC-14.7 (strict validation) and AC-14.8 (another user's account 404).
- Every F-07 test passes unchanged after F-15's §2.4 changes; the F-07 index test is extended with an `EXPLAIN` of a filtered query that still starts from `transactions_user_id_txn_date_created_at_idx`.
- The NFR-02 route-list test is unchanged (no new route) and passes.
- System-Level SDS §3 (filter panel on Transactions) and §4 (`GET /transactions` parameters) are updated in the implementation PR.
- The Sprint 3 DoD in [README.md](README.md) §5 is met.
