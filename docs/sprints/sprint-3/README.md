# Sprint 3 Engineering Contracts and Definition of Done

CPE 334 Project Deliverable 2, Part C · Sprint 3 · Baseline v1.0 · 27 November 2026

Related documents: [SRS](../../srs.md) · [Feature inventory](../../features.md) · [Requirements traceability](../../traceability.md) · [System-Level SDS](../../system-sds.md) · [Three-sprint plan](../plan.md) · [Sprint 1 conventions](../sprint-1/README.md) · [Sprint 2 README](../sprint-2/README.md)

---

## 1. Sprint 3 overview and scope

Sprint 3 finishes the product (plan.md §1): a User searches and filters history, keeps favorite transactions and duplicates them, and reads category spending and a monthly report; an Administrator creates user accounts; and the whole product is hardened for performance (NFR-07), usability on every screen (NFR-08) and failure handling. It starts from the Sprint 2 release on `main` (`0d66ae2`, merge of PR #71) and ends with the reviewed release **`v1.0.0`** on `main`, deployed through the Lab 5 pipeline, before **13 December 2026**.

The Deliverable 2 checkpoint (29 November) needs the contracts for all five features, at least one meaningful workflow implemented and tested in the deployed candidate on `main`, and the remaining-work table in §7. F-15 is the workflow the checkpoint relies on; F-14 follows it and joins the candidate only if it is tested in time (plan.md §1, revised with this README).

### 1.1 Sprint 3 feature inventory

| ID | Feature | Issue | Contract document | Linked requirements | Depends on | Owner (proposed) |
|---|---|---|---|---|---|---|
| **F-14** | Search and filter history | to open | [f-14-search-filter.md](f-14-search-filter.md) | FR-18; BR-01, 02, 12; NFR-02, 07, 08 | F-07 | Chawin |
| **F-15** | Favorites and duplicate | to open | [f-15-favorites-duplicate.md](f-15-favorites-duplicate.md) | FR-19, 20; BR-01, 02, 12, 15 (and the create-time rules BR-04–07, 10, 14, 16 on the copy); NFR-02, 08 | F-07 (F-05, F-06 form) | Supichaya |
| **F-16** | Category summary and monthly report | to open | [f-16-category-monthly-report.md](f-16-category-monthly-report.md) | FR-23, 24; BR-01, 02, 08, 09, 12; NFR-02, 03, 07, 08 | F-08 | Chawin |
| **F-17** | Administrator creates a user | to open | [f-17-admin-create-user.md](f-17-admin-create-user.md) | FR-07; BR-02; NFR-01, 02, 04, 08, 10 | F-02 | Supichaya |
| **F-18** | Product hardening | to open | [f-18-hardening.md](f-18-hardening.md) | NFR-07, 08; regression of NFR-02, 03, 04 | all | Both (performance: Chawin; usability and failure handling: Supichaya) |

Supichaya writes the Sprint 3 contracts and Chawin reviews them (Sprint 2 README §1.1). The owners above are a proposal for that review; the owner drives the implementation and the other student reviews the PR. All five contracts are merged before the first failing test of any Sprint 3 feature. Issue numbers are filled in when the Issues are opened, before the first branch.

**Not in Sprint 3:** everything SRS §3 lists as out of scope; an audit trail of edits (Sprint 2 Q-6); a forced password change or password reset for a user created by F-17 (Q-15).

### 1.2 What already exists

| Already in the code | Where | Used by |
|---|---|---|
| `transactions.is_favorite` (`BOOLEAN NOT NULL DEFAULT false`), never read or written yet | migration `20261111213027_accounts_ledger`, `prisma/schema.prisma` | F-15 |
| History query, newest first, with `limit`/`offset`, served by `transactions_user_id_txn_date_created_at_idx`; voided rows included and marked | `transaction.service.ts` `listTransactions` (F-07 1.3) | F-14, F-15 |
| `TransactionForm` with an `existing` transaction (edit mode), `?tab=payment\|receive` | `web/src/pages/NewTransactionPage.tsx` (F-13) | F-15 Duplicate |
| Income/expense SQL aggregation that counts only Income and Expense lines of non-voided transactions | `summary.service.ts`, `summary.engine.ts` (F-08) | F-16 |
| Default current month in Bangkok time, calendar-date validation | `server/src/utils/date.util.ts`, `summary.schema.ts` | F-14, F-16 |
| Administrator list and enable/disable; profile-only select `USER_PROFILE_SELECT` | `admin.service.ts` (F-02) | F-17 |
| bcrypt hashing at `BCRYPT_COST` (12) | `server/src/utils/hash.util.ts` | F-17 |

**Expected schema change: none.** F-18 may add an index if the NFR-07 measurement needs one; that PR adds the migration and updates System-Level SDS §2 (table and ER diagram) in the same change.

---

## 2. Shared decisions for Sprint 3

### 2.1 Conventions carried over

Sprint 1 README §2 (integer satang, session and cookie rules, default deny, ownership 404, Administrator 403, CSRF and Content-Type checks, error envelope), §3 (test levels U/A/E) and the error catalogue §2.4, and Sprint 2 README §2.1, apply unchanged. Every new User route applies BR-01 (ownership, 404) and BR-02 (Administrator 403); the new Administrator route returns 403 to a User. Every new route starts with `access(level)` and is added to the NFR-02 route-list test (TEST-01.7) in the PR that adds it.

### 2.2 Planned API surface

Following System-Level SDS §4. Each contract's §2.1 gives the full request, response and error shapes.

| Method and path | Role | Feature | Purpose |
|---|---|---|---|
| GET /transactions?from&to&accountId&categoryId&q&minAmount&maxAmount | User | F-14 | History filtered by date range, account, category, text and amount range; same order, pagination and item shape as F-07 |
| GET /transactions?favorite=true | User | F-15 | Favorites list (the same history query, filtered) |
| PATCH /transactions/:id/favorite | User | F-15 | Mark or unmark a Payment or Receipt as favorite: `{ isFavorite }` |
| GET /transactions, GET /transactions/:id | User | F-15 | Items and the detail gain `isFavorite` |
| GET /summary/categories?from&to | User | F-16 | Spending per Expense account with share of total (FR-23) |
| GET /summary/monthly?year | User | F-16 | Income, expense and net for each month of a year (FR-24) |
| POST /admin/users | Administrator | F-17 | Create a User with an initial password (FR-07) |

Duplicate (F-15) has no endpoint: it pre-fills the New transaction form from `GET /transactions/:id`, and the copy is saved by the existing `POST /transactions`.

New screens: **Favorites** (`/favorites`, F-15) and **Reports** (`/reports`, F-16) join the User navigation; the Transactions screen gains a filter panel (F-14); the Users screen gains **Create user** (F-17).

### 2.3 Decisions already taken

| ID | Decision | Reason |
|---|---|---|
| S3-D1 | No new tables or columns. Favorites use the existing `is_favorite`; reports are read-only aggregations. | Keeps Sprint 3 to rules and screens on the Sprint 1 data model (plan.md §2). |
| S3-D2 | Search, filters and the favorites list are query parameters on the existing `GET /transactions`, not new endpoints. With no filter the response is byte-for-byte the F-07 response. | One ordering, one pagination, one item shape and one ownership filter; the F-07 tests stay valid as the no-filter regression. |
| S3-D3 | Duplicate is client-side only: the form is pre-filled from the detail and the copy is saved through `POST /transactions`, which re-runs every create-time rule. | BR-15: nothing is saved until submit, and the copy cannot bypass BR-04–07, 10, 14 or 16. |
| S3-D4 | Category and monthly reports use the same filter as F-08 (Income or Expense line targets, `voided_at IS NULL`, Bangkok calendar dates). Their totals must equal the F-08 summary for the same range. | BR-08 and BR-12 in one place; the equality is a cross-feature test (AC-16.1, AC-16.4). |
| S3-D5 | The Administrator creates `USER` accounts only. The new user has no financial accounts; the Administrator never creates, reads or changes any financial record. | BR-02 (an Administrator never touches financial records); a second Administrator is not needed for the course scope. |
| S3-D6 | A write that is not an edit leaves `updated_at` unchanged. Marking or unmarking a favorite therefore does not make a transaction "Edited". | f-13 1.1 defines "Edited" as `updatedAt` later than `createdAt`; f-12 1.1 applied the same rule to the opening-balance remove after the PR #70 defect. |
| S3-D7 | Money in filters and reports stays integer satang end to end. A share of total is integer **basis points** (0–10,000) computed with BigInt and the largest-remainder method, so the shares of a report always sum to exactly 10,000. | NFR-03 and the CLAUDE.md money rule: no floating-point value is ever computed from money on the server. |

### 2.4 Open questions and how the contracts settle them

Each answer is recorded in the named contract and is open to challenge in its review; changing one after merge is a contract revision.

| ID | Question | Answer | Settled in |
|---|---|---|---|
| Q-7 | Does the account filter match only the source account? | No. It matches a transaction whose source **or** any line target is the account, so a transfer into Savings or a card repayment appears under that account. Income and Expense accounts are filtered with `categoryId` instead. | F-14 §1 |
| Q-8 | Which text does search look in? | The memo and every line note, case-insensitive substring. `%` and `_` are literal characters. Account names are not searched (use the account filter). | F-14 §1 |
| Q-9 | Can an opening balance or a voided transaction be a favorite? | An opening balance cannot (400). A voided transaction cannot be newly marked (409 `TRANSACTION_VOIDED`) but can be unmarked; voiding keeps the flag. | F-15 §1 |
| Q-10 | What does Duplicate copy? | Kind, source, total, memo, and every line's target, amount and note. The date is today (Bangkok). Archived accounts are copied but flagged and must be replaced before Save. Favorite status is not copied. A voided transaction can be duplicated. | F-15 §1 |
| Q-11 | Does the category summary include income categories? | No. FR-23 asks for spending per expense account. Income per month is in the monthly report. | F-16 §1 |
| Q-12 | How is "share of total" rounded? | Integer basis points by largest remainder (S3-D7); the UI shows them as a percentage with two decimals. | F-16 §1 |
| Q-13 | May the Administrator create another Administrator or set up the user's accounts? | No (S3-D5): role is always `USER`; a body with `role` is 400. | F-17 §1 |
| Q-14 | What is the initial password policy? | 12 to 128 characters and not equal to the email. | F-17 §1 |
| Q-15 | Must the new user change the initial password at first login? | No. There is no password-change feature in the SRS; the Administrator hands the password over outside the system. Disclosed limitation. | F-17 §1 |
| Q-16 | Where is NFR-07 measured? | On the production build in the local container, against a separate performance database seeded with 10,000 transactions for one user. The deployed database is never seeded with test data; the deployed revision gets a smaller timing spot check on the demo users. | F-18 §1 |

### 2.5 Error codes added in Sprint 3

These codes extend the catalogue in Sprint 1 README §2.4; all other Sprint 3 failures reuse existing codes.

| HTTP | Code | Trigger | Feature |
|---|---|---|---|
| 409 | `EMAIL_EXISTS` | Create a user with an email that already exists, compared after trimming and lower-casing | F-17 |

For example, an invalid filter or a `from` later than `to` is `VALIDATION_ERROR`; a filter on another user's account is `NOT_FOUND`; marking a voided transaction as favorite is `TRANSACTION_VOIDED`.

### 2.6 Contract revisions caused by Sprint 3

**F-07 1.4** (Sprint 1 README §5): `GET /transactions` accepts the F-14 and F-15 filter parameters and rejects unknown parameters with 400 `VALIDATION_ERROR` (today they are silently ignored); history items and the detail gain `isFavorite`. AC-07.x are unchanged. The F-07 tests that list item keys (TEST-07.1, TEST-07.3 through the shared `ITEM_KEYS`) gain `isFavorite` in the F-15 commit that adds the field; F-15 §2.4 lists them.

---

## 3. Sprint 3 demonstration journey

The final release must pass this journey on its deployed revision. It continues from the end of the Sprint 2 journey (Sprint 2 README §3, step 6): Bank Account 73,500.00 THB, Savings 10,000.00, Wallet 5,000.00, Credit Card debt 1,400.00 (Dining 900.00 and Groceries 500.00, one charge), Loan to Bob 1,500.00, Loan from Mom 5,000.00; month income 30,000.00, expense 1,400.00. All dates are in the current month.

1. **F-17** The Administrator creates `carol@example.test` ("Carol") with an initial password. Creating `Carol@Example.test` again is refused with 409 `EMAIL_EXISTS`. Carol logs in with the initial password and sees an empty Dashboard that points her to Accounts.
2. **F-15** Alice marks the salary Receipt and the card charge as favorites; Favorites lists both, newest first, and neither shows "Edited". She duplicates the card charge from Favorites: the form opens with Credit Card, 1,400.00, Dining 900.00, Groceries 500.00 and today's date; she saves it. The original is unchanged and still a favorite; the copy is not.
3. **F-14** On Transactions, Alice filters by category Dining (two rows: the charge and its copy), by account Savings (one row: the 10,000.00 transfer, found through its line target), and by amount 1,000.00 to 2,000.00 THB inclusive (three rows: the charge, its copy and the 2,000.00 loan to Bob). Clear filters restores the full list. Text search is shown on the search ledger (TEST-14.4), because the Sprint 1 and 2 journeys set no memos.
4. **F-16** Reports, current month: Dining 1,800.00 THB (64.29%), Groceries 1,000.00 THB (35.71%), total 2,800.00 THB, equal to the month's expense on Summary. The monthly report for the current year shows this month's income 30,000.00, expense 2,800.00, net 27,200.00 THB and zero for the other months of the demo ledger.
5. **Rejection:** a filter with minimum above maximum is shown inline and the API refuses it with 400 `VALIDATION_ERROR`; marking a voided transaction as favorite is 409 `TRANSACTION_VOIDED`; creating a user with an 8-character password is 400 and nothing is saved.
6. **Forbidden:** Bob marks Alice's transaction as favorite → 404; Bob filters by Alice's Dining account → 404; the Administrator calls `GET /summary/categories` or `GET /transactions?q=lunch` → 403; Alice calls `POST /admin/users` → 403; an anonymous caller → 401.
7. **F-18** The NFR-07 timing table for the release commit shows p95 ≤ 500 ms for every measured endpoint; the NFR-08 checklist (F-18 §2.2) is complete for every screen.

The Sprint 1 journey (Sprint 2 Part A §2.3) and the Sprint 2 journey (Sprint 2 README §3) are re-run on the same candidate as the regression check.

---

## 4. Build order

This section fixes the order and the dependencies, not dates. The only dates are the course deadlines: the Deliverable 2 checkpoint (29 November: at least one Sprint 3 workflow implemented, tested and in the deployed candidate on `main`) and the final release (before 13 December). The final examination period is 1–11 December.

| Order | Work | Owner | Depends on | Release |
|---|---|---|---|---|
| 0 | This README and contracts F-14 1.0 to F-18 1.0; create `sprint-3-staging` from `main` | Supichaya (review: Chawin) | — | — |
| 1 | F-15 favorites and duplicate (smallest; column exists; owns the `favorite` parameter) | Supichaya | contracts merged | checkpoint candidate |
| 1 | F-14 search and filter | Chawin | F-15 (shared query schema) | checkpoint candidate, or `v1.0.0` |
| 2 | F-17 administrator creates a user | Supichaya | contracts merged | `v1.0.0` |
| 2 | F-16 category summary and monthly report | Chawin | contracts merged | `v1.0.0` |
| 3 | F-18 hardening: NFR-07 timing, NFR-08 checklist and E2E, failure handling, regression | Both | F-14 to F-17 merged | `v1.0.0` |
| 4 | Release PR → `main`, tag `v1.0.0`, deploy, post-deploy checks of §3, UAT re-test, final video | Both | F-18 | `v1.0.0` |

The checkpoint candidate is a release PR `sprint-3-staging` → `main` tagged `v0.3.0` with whatever Sprint 3 work is tested by then (at least F-15), deployed with post-deploy checks of the journey steps it covers. F-15 merges first and owns the strict query schema with `favorite`; F-14 rebases on it and adds the other parameters. F-16 and F-17 touch different routes and can merge in either order. F-18 runs last because it measures and checks the finished screens. A feature that will not make the final release is recorded as an approved scope revision in §8 and in §7, rather than dropped unannounced.

---

## 5. Sprint 3 Definition of Done

Sprint 1 README §4 and Sprint 2 README §5 apply, with these Sprint 3 values:

- Feature branches start from `sprint-3-staging` and merge into it by teammate-reviewed PR; the checkpoint release is tagged **`v0.3.0`** and the final release **`v1.0.0`**.
- Each feature has a GitHub Issue; its PR closes it only after the release's post-deploy checks.
- Failing-first evidence (a failing-test commit before the implementation commit) is required for every new rule: each filter's matching rule, the favorite rules (voided, opening balance, `updated_at` kept), Duplicate's BR-15 behaviour, the category share rounding, the month boundaries, the email uniqueness and password rules, and every NFR-07 or NFR-08 defect F-18 finds.
- Regression: the full suite, the Sprint 1 and Sprint 2 journeys and the NFR-02 route-list test pass on each release commit; the NFR-03 invariant test still passes; with no filter, `GET /transactions` passes every F-07 test, changed only as F-15 §2.4 lists.
- Every new screen and control has loading, empty and error states, inline validation, a 401 redirect to `/login` and a 360 px E2E check (NFR-08); every write invalidates the queries it affects (`transactions` list and detail, `favorites`, `accounts`, `summary`, `reports`, `loans`, `admin users`).
- [traceability.md](../../traceability.md) gains a Sprint 3 results section tied to the tested commit, with a status per AC using the vocabulary in §7.1; the remaining-work table in §7 is updated at every merge and release.

---

## 6. Sprint 3 test data

Sprint 3 contracts name their starting state in each STS. Two fixtures are shared:

| Fixture | Contents | Used by |
|---|---|---|
| **Search ledger** (`insertSearchLedger`, to be added to `tests/helpers/ledger.helper.ts` by F-15 or F-14, whichever merges first) | Alice, dates relative to today T (Bangkok): (1) T−30 opening balance Bank Account 50,000.00; (2) T−20 Receipt into Bank Account 30,000.00 → Salary, memo "November salary"; (3) T−10 Payment from Credit Card 1,200.00 → Dining 700.00 note "Team lunch", Groceries 500.00, memo "Weekend"; (4) T−5 Payment from Bank Account 800.00 → Credit Card, memo "Card bill"; (5) T−2 Payment from Bank Account 10,000.00 → Wallet, memo "Top up 100%"; (6) T−1 Payment from Wallet 150.00 → Dining, memo "Coffee", voided. Bob: T−3 Payment from his Bank Account 700.00 → his Dining, note "Team lunch". | F-14, F-15, F-16 |
| **Performance ledger** (F-18 §2.3) | One user with 10,000 transactions over 365 days, in a separate `<database>_perf` database | F-18 |

Dates more than 90 days old are inserted through Prisma, as TEST-13.4 does, because BR-10 rejects them on the API.

---

## 7. Remaining work (Part C)

Status at **27 November 2026**, base `main` at `0d66ae2`. Updated at every merge and release; previous states stay in git history.

### 7.1 Status vocabulary

| Status | Meaning |
|---|---|
| **planned** | Contract written (in review or merged); no code on a branch |
| **in progress** | Feature branch exists with at least the failing-test (RED) commit |
| **implemented** | Implementation (GREEN) commit exists; the feature's ACs pass locally on the branch |
| **tested** | Merged into the staging branch; the full suite and CI pass on the recorded tested commit; per-AC results in traceability |
| **accepted** | Included in a tagged release on `main`, deployed, its post-deploy check passed, and the teammate (or the UAT partner) accepted it |

A feature is reported at the lowest status any of its ACs has reached; an unexecuted test never counts as tested.

### 7.2 Remaining-work table

| Feature or defect | Current status | Remaining action | Owner and target |
|---|---|---|---|
| **F-15** Favorites and duplicate | planned (contract 1.0 in review); 0 of 9 ACs; no tested commit | Issue; RED tests for AC-15.1–15.9; favorite endpoint, `isFavorite` in history, Favorites screen, Duplicate; F-07 key change (§2.6); merge; release `v0.3.0` | Supichaya · in the checkpoint candidate by 29 Nov |
| **F-14** Search and filter | planned (contract 1.0 in review); 0 of 9 ACs; no tested commit | Issue; RED tests for AC-14.1–14.9; strict query schema, filter SQL, filter panel with URL state; merge after F-15 | Chawin · before 13 Dec (checkpoint candidate if tested in time) |
| **F-17** Administrator creates a user | planned (contract 1.0 in review); 0 of 7 ACs | Issue; RED tests; `POST /admin/users`, `EMAIL_EXISTS`, Create user dialog; merge | Supichaya · before 13 Dec |
| **F-16** Category summary and monthly report | planned (contract 1.0 in review); 0 of 8 ACs | Issue; RED tests incl. the share-rounding unit test; two summary endpoints; Reports screen; merge | Chawin · before 13 Dec |
| **F-18** Product hardening | planned (contract 1.0 in review); 0 of 6 ACs | Timing script and performance ledger; NFR-08 checklist and E2E sweep; failure-handling checks; defects fixed failing-first; regression on the release commit | Chawin (NFR-07), Supichaya (NFR-08, failure handling) · before 13 Dec |
| Sprint 2 release record | F-09 to F-13 merged to `main` (`0d66ae2`, PR #71); tag `v0.2.0` not present in the repository at the time of writing | Tag the release commit, record the deployed revision and post-deploy checks of Sprint 2 README §3; update the traceability §4 status lines for F-12 and F-13, which still say "not yet merged" | Chawin · by 29 Nov |
| L7-01 date picker window | Fixed (`90433ca` RED, `ba75d86` GREEN), merged in PR #65 and released with Sprint 2 | Close Issue #62 after the Sprint 2 post-deploy check; move the Lab 7 readiness entry to closed | Chawin · by 29 Nov |
| Final release and course deliverables | planned | `v1.0.0` release PR, deploy and post-deploy checks of §3; UAT re-test; final report and video | Both · before 13 Dec |

---

## 8. Contract version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 27 Nov 2026 | Initial Sprint 3 scope, shared decisions (S3-D1 to S3-D7), answers to Q-7 to Q-16, API overview, the new error code `EMAIL_EXISTS`, demonstration journey, build order (order and dependencies, no internal dates), DoD, shared test fixtures and the remaining-work table, with contracts F-14 1.0 to F-18 1.0, all before implementation. F-07 is revised to 1.4 (§2.6; Sprint 1 README §5). plan.md §1 is revised to match: the 29 Nov checkpoint needs F-15 only, with F-14 after it (it previously listed F-14 and F-15 both implemented). Pending review by Chawin. |

F-14 to F-18 are at version 1.0. Later revisions are recorded in this table and in the repository git history.
