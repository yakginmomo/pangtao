# F-16 Category Summary and Monthly Report: Engineering Contract

Requirements: FR-23, FR-24; BR-01, BR-02, BR-08, BR-09, BR-12; NFR-02, NFR-03, NFR-07, NFR-08 · Depends on: F-08 · Issue: to open · Contract version: 1.0 (see [version history](README.md#8-contract-version-history)) · Suggested branch: `feature/F-16-category-monthly-report`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 3 README](README.md) §2; the Sprint 3 Definition of Done is in [Sprint 3 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Show the User where their money goes (spending per expense category, with each category's share) and how income and expense move across a year, using exactly the same counting rules as the income and expense summary.

**Workflow**

1. **Reports** (`/reports`, in the User navigation) opens with two sections.
2. **Spending by category:** a date range (default: the current month in Bangkok time) and a table of Expense accounts with spending in that range, largest first: name, amount, share of total, and a bar whose length is the share. The total row equals the Summary screen's expense for the same range.
3. **Monthly report:** a year selector (default: the current year in Bangkok time) and twelve rows, January to December: income, expense and net, plus a year total row.
4. Changing the range or year reloads that section only.

**Rules and validation: category summary (FR-23)**

- **S3-D4 (same rules as F-08):** counts allocation lines of the caller's non-voided transactions (BR-12) whose target is an **Expense** account (BR-08), dated within the inclusive range. Transfers, lending, borrowing, repayments, opening balances and income are excluded by construction. A card purchase counts on its charge date (BR-09).
- **Q-11:** Expense accounts only; Income accounts are not listed.
- **Items:** one per Expense account with a positive amount in the range, sorted by amount descending, then name ascending, then id. Accounts with no spending are omitted. Archived Expense accounts with spending in the range are included, with `isArchived: true`.
- **Total:** the sum of the item amounts, which equals F-08's `expense` for the same `from` and `to` (cross-feature check).
- **Share (Q-12, S3-D7):** `shareBasisPoints` is an integer from 0 to 10,000, computed with BigInt: each item gets `floor(amount × 10000 / total)`; the remaining basis points (10,000 minus the sum of floors, always fewer than the number of items) go one each to the items with the largest remainder `amount × 10000 mod total`, ties broken by the item order above. The shares of a non-empty report sum to exactly 10,000. The UI shows basis points as a percentage with two decimals (6429 → 64.29%) by integer formatting, not floating-point division.
- **Empty range:** `items: []`, `total: 0`; no division happens.
- **Range:** `from`, `to` optional `YYYY-MM-DD`; an omitted bound is filled from the current Bangkok month, then `from` later than `to` is `400 VALIDATION_ERROR` (as F-08). Unknown parameters are 400.

**Rules and validation: monthly report (FR-24)**

- **Year:** `year` optional integer 2000 to 2100, default the current Bangkok year; anything else (decimal, text, out of range) and unknown parameters are `400 VALIDATION_ERROR`.
- **Months:** always twelve entries, `month` 1 to 12, each with `income`, `expense` and `net = income − expense` in satang. Months with no activity, including future months, are zeros. A transaction belongs to the month of its `txn_date` (a calendar date, A-03), so 31 January and 1 February fall in different months regardless of the time of entry.
- **Counting:** the F-08 rules (Income and Expense line targets of non-voided transactions). Each month equals F-08's summary for that month's first to last day, and the year totals equal F-08 for 1 January to 31 December.
- **Totals:** `totals: { income, expense, net }` for the year, the exact sums of the months.

**Permissions:** User only; each report covers only the caller's data (BR-01). Administrator receives 403 (BR-02), anonymous receives 401. There are no ids in the request, so there is no 404 case.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| GET /api/v1/summary/categories?from&to | both optional | 200 `{ from, to, total, items: [ { accountId, name, isArchived, amount, shareBasisPoints } ] }` | 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN |
| GET /api/v1/summary/monthly?year | optional | 200 `{ year, months: [ { month, income, expense, net } ×12 ], totals: { income, expense, net } }` | 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN |

- Amounts are integer satang (`satangToJson`); `from` and `to` in the response are the applied bounds.
- Both endpoints are one SQL aggregation each, reusing the F-08 join (`transactions` → `allocation_lines` → `accounts`, `voided_at IS NULL`, the `user_id` filter on every table). The monthly query groups by `date_trunc('month', txn_date)`; the twelve months are filled in the service.
- The share calculation is a pure function (`computeShares` in `summary.engine.ts`) with unit tests; the service calls it on the SQL result.
- Both routes use `access('USER')` and are added to the NFR-02 route list.

### 2.2 UI

- **Reports screen (`/reports`):** section headings "Spending by category" and "Monthly report".
- **Category table:** columns Category, Amount (฿), Share; each row has a horizontal bar labelled with its percentage in text, so the share never depends on colour or length alone; archived categories show "(archived)". A total row. Date inputs with the same inline validation as Summary (from later than to). Empty: "No spending in this period." Loading skeleton; error banner with Retry.
- **Monthly table:** columns Month, Income, Expense, Net; negative net shows a minus sign and the word "deficit" (System-Level SDS §3 money rule); a year total row; year selector with previous and next buttons and an inline error for an invalid year. A year with no activity shows the twelve zero rows and the note "No income or expense recorded in {year}."
- At 360 px both tables keep the amount columns readable (the bar moves under the category name); nothing overflows horizontally.
- Writes elsewhere (create, edit, void, duplicate) invalidate the `reports` queries along with `summary`. An API 401 redirects to `/login`.

### 2.3 Data

- No migration; read-only. Uses the tables and indexes F-08 uses. F-18 measures both endpoints with 10,000 transactions (NFR-07).

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-16.1 | The category summary lists each Expense account with spending in the range, largest first, with its amount and share; `total` equals the F-08 `expense` for the same range. |
| AC-16.2 | Voided transactions, transfers, lending, borrowing, repayments, opening balances and income are not counted; a card charge counts on its charge date; an archived Expense account with spending is listed with `isArchived: true`. |
| AC-16.3 | Shares are integers in basis points that sum to exactly 10,000 for any non-empty report, assigned by largest remainder with the stated tie-break; an empty range returns `items: []` and `total: 0`. |
| AC-16.4 | The monthly report returns twelve months for the year, each with income, expense and net equal to F-08's summary for that month, and year totals equal to the sum of the months; a transaction on the last day of a month counts in that month. |
| AC-16.5 | The defaults are the current Bangkok month and year; `from` later than `to`, an invalid date, an invalid `year`, or an unknown parameter returns 400 VALIDATION_ERROR. |
| AC-16.6 | Each report covers only the caller's data; an Administrator receives 403 and an anonymous caller 401. |
| AC-16.7 | After any mix of payments, receipts, edits, voids and transfers, the category total, the monthly expense for each month and F-08's expense agree to the satang (NFR-03). |
| AC-16.8 | In the browser, the Reports screen shows the category table with text percentages and the monthly table for the chosen year, updates after a new transaction without a page reload, and has loading, empty and error states and a 360 px layout. |

---

## 4. Software test specification

Starting state unless stated: the **search ledger** (Sprint 3 README §6). In its month range the only Expense lines are (3) Dining 70,000 and Groceries 50,000 satang; (6) Dining 15,000 is voided. Tests that need fixed months insert rows through Prisma with explicit dates in a past year, so they do not depend on today.

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-16.1** | AC-16.1 | A | Search ledger | `GET /summary/categories?from={T−30}&to={T}`; `GET /summary/income-expense` with the same range | Items Dining 70,000 (5833 bp), Groceries 50,000 (4167 bp); `total: 120000`; equals the F-08 expense. |
| **TEST-16.2** | AC-16.2 | A | Search ledger; a Loan Given account "Loan to Bob" created with the ledger helper; then, dated T: a Payment Bank → Electricity 30,000 satang, after which Electricity is archived with the ledger helper; a Payment Bank → Loan to Bob 20,000; a Receipt into Bank from Loan to Bob 5,000 | Same range as TEST-16.1 | Items in order Dining 70,000, Groceries 50,000, Electricity 30,000 with `isArchived: true`; `total: 150000`; the voided (6), the transfer (5), the repayment (4), the opening (1), the Receipt (2) and the loan rows add nothing. |
| **TEST-16.3** | AC-16.3 | U, A | U: pure `computeShares` | Inputs: [70000, 50000]; [100, 100, 100]; [1, 1, 1, 1, 1, 1, 1]; [9999, 1]; [1]; [] | [5833, 4167]; [3334, 3333, 3333] (the extra point to the first in order); seven items summing to 10,000 with the first four 1429 and the rest 1428; [9999, 1]; [10000]; []. Every non-empty result sums to 10,000. A: a range with no Expense lines returns `items: []`, `total: 0`. |
| **TEST-16.4** | AC-16.4 | A | Alice with Prisma-inserted rows in 2025: Receipt 100,000 → Salary on 31 Jan; Payment 40,000 → Dining on 1 Feb; Payment 25,000 → Groceries on 31 Dec; a voided Payment 9,000 → Dining on 15 Mar | `GET /summary/monthly?year=2025`; F-08 for each month and for the whole year | January income 100,000, expense 0, net 100,000; February 0, 40,000, −40,000; December 0, 25,000, −25,000; March and every other month zeros; totals 100,000, 65,000, 35,000; each month and the totals equal F-08 for the same range. |
| **TEST-16.5** | AC-16.5 | U, A | Search ledger; clock fixed to a known Bangkok date in the U test | Categories with no parameters; monthly with no parameters; categories `from` after `to`; `from=2025-02-30`; monthly `year=1999`, `year=2101`, `year=2025.5`, `year=abc`; `?month=1` on either endpoint | Defaults: the current Bangkok month and year in the response. Each invalid case 400 VALIDATION_ERROR naming the parameter. U: the defaults switch at Bangkok midnight on the last day of a month and of a year. |
| **TEST-16.6** | AC-16.6 | A | Search ledger; Bob and Admin logged in | Bob calls both endpoints for the range and year; Admin calls both; anonymous calls both | Bob: only his Dining 70,000 (10,000 bp) and his month expense; Admin 403 FORBIDDEN; anonymous 401 UNAUTHENTICATED. |
| **TEST-16.7** | AC-16.7 | U, A | Search ledger | Edit (3) to Dining 90,000 and total 140,000 (F-13); void (4); add a transfer; then compute categories, the monthly report for the current year, and F-08 for the current month | Category total for the month = monthly expense for the month = F-08 expense, to the satang. U: the pure engine and the SQL give the same totals over the same ledger. |
| **TEST-16.8** | AC-16.8 | E | Search ledger; viewports 1280 and 360 | Open Reports; record a Payment Bank → Groceries 100.00 THB dated today in another tab of the app and return; load Reports with the API answering 500 once; open a year with no activity | Category rows with text percentages and bars; after the new Payment the Groceries row and the month's expense change without a page reload; error banner and Retry; the zero-year note; no horizontal overflow at 360 px. |

---

## 5. Definition of done (F-16)

- Every AC above has an executed automated test with results recorded per Sprint 3 README §5.
- Failing-first evidence is retained for AC-16.1 (category totals), AC-16.3 (share rounding), AC-16.4 (month boundaries and F-08 equality) and AC-16.7 (agreement after edits and voids).
- F-08 tests pass unchanged; the F-08 SQL is shared or factored, not copied with a different filter.
- The NFR-02 route-list test includes both endpoints.
- System-Level SDS §3 (Reports screen and navigation), §4 (two routes) and §5 (report row in the permission matrix) are updated in the implementation PR.
- The Sprint 3 DoD in [README.md](README.md) §5 is met.
