# F-18 Product Hardening: Engineering Contract

Requirements: NFR-07, NFR-08; regression of NFR-02, NFR-03, NFR-04 · Depends on: all features (runs last) · Issue: to open · Contract version: 1.0 (see [version history](README.md#8-contract-version-history)) · Suggested branch: `feature/F-18-hardening`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 3 README](README.md) §2; the Sprint 3 Definition of Done is in [Sprint 3 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Show, with measurements and executed checks on the release candidate, that the finished product is fast enough for a heavy user (NFR-07), that every screen handles loading, empty, error, invalid input and a phone-width layout (NFR-08), and that failures never lose data or leak details; and fix what the checks find.

F-18 adds no business rule and no endpoint. Its outputs are a timing script, an NFR-08 checklist, a cross-screen E2E sweep, failure-handling tests, and the defect fixes those find, each failing-first with a defect ID (`S3-NN`).

**Workflow**

1. Build the performance ledger (§2.3) in a separate database and start the production build against it.
2. Run the timing script; record p50, p95 and maximum per endpoint, the commit and the machine in the F-18 PR and in traceability.
3. Run the NFR-08 sweep and fill the checklist (§2.2) for every screen; manual items name who checked them and when.
4. Record each failure as a defect (`S3-01`, …) with severity, write its failing test, fix it, and re-run steps 2 and 3.
5. On the `v1.0.0` release commit, run the regression set (§1, Regression) and the post-deploy spot check.

**NFR-07: performance (Q-16)**

- **Target:** p95 ≤ 500 ms per endpoint, measured at the HTTP client, with 10,000 transactions for one user.
- **Endpoints measured:** the three NFR-07 names (balances `GET /accounts`; a 50-row history page `GET /transactions?limit=50`; summaries `GET /summary/income-expense`), plus the Sprint 3 reads that work on the same data: a filtered history page (`?categoryId=…&q=…&from=…`, F-14), the favorites page (`?favorite=true`, F-15), `GET /summary/categories` and `GET /summary/monthly` (F-16), and `GET /loans` (F-10).
- **Method:** production build (`docker compose --profile app`) against the performance database; one logged-in session; 10 warm-up requests, then 100 sequential timed requests per endpoint; p95 is the 95th of the 100 sorted times. The script prints a markdown table and exits non-zero if any p95 is above 500 ms, so it can serve as the failing test of a performance defect.
- **Where:** locally, on a recorded machine (CPU, RAM, OS) and commit. The deployed Cloud SQL database is never seeded with performance data (Q-16); the deployed revision gets a spot check of the same endpoints for the demo user Alice (20 requests each), recorded with the revision name, as evidence that the deployed setup does not add a large constant cost.
- **If an endpoint misses the target:** a defect with the before and after tables; a fix may be a query change or an index (a migration, recorded in System-Level SDS §2), and must not change any response.

**NFR-08: usability on every screen**

- Every screen in System-Level SDS §3 (Login, Dashboard, Accounts, Transactions with filters, Transaction detail, New transaction, Edit transaction, Duplicate, Favorites, Summary, Reports, Loans, Users with Create user, Not permitted) has: a loading state (skeleton or labelled spinner), an empty state with the next action where the screen can be empty, an error state with a banner and **Retry**, field-level validation messages on every form field that the server validates, and no horizontal overflow at 360 px.
- An API 401 on any screen redirects to `/login`; a 403 shows Not permitted.
- Money and state are never shown by colour alone (SDS §3).

**Failure handling**

- A 500 on a write keeps the form and everything typed, shows a banner, and allows a retry; nothing is saved twice.
- A submit button is disabled while its request runs, so a double click sends one request.
- A network failure (request aborted) on a read shows the error state with Retry; on a write, the same as a 500.
- A session that expires while a form is open redirects to `/login` on submit; nothing is saved.
- NFR-04 re-run: a forced server error on each Sprint 3 route returns the generic `INTERNAL_ERROR` body with `X-Request-Id`, no stack, SQL or path.

**Regression on the release commit**

- `npm run verify` (lint, type-checks, unit and API tests with the 80% service-layer coverage gate, build, E2E) with pass, fail and skip counts; CI on the release PR.
- The NFR-02 route-list test with every route, including the Sprint 3 ones.
- The NFR-03 invariant over the performance ledger (net worth equals openings plus income minus expense, to the satang), in addition to the existing invariant tests.
- The Sprint 1, Sprint 2 and Sprint 3 journeys (Sprint 3 README §3) on the deployed revision.

**Permissions:** no new operation. The checks confirm the existing matrix (System-Level SDS §5) on every Sprint 3 route.

---

## 2. Specifications

### 2.1 API

No new endpoint or change in any response. An index added for NFR-07 is invisible to the API.

### 2.2 UI: NFR-08 checklist

Recorded in the F-18 PR and copied into traceability. One row per screen; each cell is **E** (checked by an automated E2E test, named) or **M** (manual: checker and date), and PASS or a defect ID.

| Screen | Loading | Empty | Error + Retry | Field validation | 360 px | 401 → /login |
|---|---|---|---|---|---|---|
| Login | — | — | E | E | E | — |
| Dashboard | E | E (new user, F-17) | E | E (opening dialog) | E | E |
| Accounts | E | E | E | E | E | E |
| Transactions (with filters) | E | E (no rows; no matches) | E | E (filters) | E | E |
| Transaction detail | E | — (404 message) | E | — | E | E |
| New / Edit / Duplicate | E | — | E (save 500) | E | E | E |
| Favorites | E | E | E | — | E | E |
| Summary | E | E | E | E | E | E |
| Reports | E | E | E | E | E | E |
| Loans | E | E | E | — | E | E |
| Users (+ Create user) | E | — | E | E | E | E |
| Not permitted | — | — | — | — | E | — |

The E2E sweep (`tests/e2e/usability.spec.ts`) visits every User screen and the Users screen at 360 × 740, asserts `document.documentElement.scrollWidth ≤ 360`, forces one 500 on the screen's main read with `page.route` and checks the banner and Retry, and checks the empty state on a user with no data (created through F-17 or the test helper).

### 2.3 Data and tooling

- **Performance ledger:** `scripts/perf/seed-perf.ts` builds `<database>_perf` (never the development or test database) with one user `perf@example.test`, the seed's account set plus two Loan accounts, and 10,000 transactions spread evenly over the last 365 days: about 60% Payments with 1 to 3 lines, 25% Receipts, 10% transfers and loan movements, one opening balance per Cash and Loan account, about 2% voided and 5% favorites, memos and notes from a fixed word list. Rows are inserted through Prisma in batches, with a fixed random seed so every run builds the same ledger. Dates older than T−90 are allowed because the rows are inserted directly (as TEST-13.4 does).
- **Timing script:** `scripts/perf/nfr-07.mjs`, run as `npm run perf:nfr07`; it reads the base URL and the perf password from environment variables (never committed) and prints the table.
- No change to `.env.example` other than documenting the two variables with placeholders.

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-18.1 | With the 10,000-transaction ledger, the timing script reports p95 ≤ 500 ms for balances, a 50-row history page and the income and expense summary, and for every Sprint 3 read listed in §1, on the release candidate commit. |
| AC-18.2 | Every screen in §2.2 shows its loading, empty (where applicable) and error-with-Retry states, and Retry recovers after the failure clears. |
| AC-18.3 | Every form field that the server validates shows a field-level message for an invalid value before submit, and a server validation error is shown on the named field. |
| AC-18.4 | Every screen is usable at 360 px wide with no horizontal overflow. |
| AC-18.5 | A failed write keeps the user's input and saves nothing; a double click sends one request; an expired session on submit redirects to `/login` and saves nothing; a forced server error on each Sprint 3 route returns the safe error body (NFR-04). |
| AC-18.6 | On the release commit, the full suite, the NFR-02 route list with every Sprint 3 route, the NFR-03 invariant over the performance ledger, and the Sprint 1, 2 and 3 journeys on the deployed revision pass, with the counts recorded. |

---

## 4. Software test specification

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-18.1** | AC-18.1 | Measurement | Performance ledger; production build; release candidate commit | `npm run perf:nfr07` | A table with p50, p95 and max per endpoint; every p95 ≤ 500 ms; exit code 0. Recorded with commit and machine. Spot check on the deployed revision recorded separately. |
| **TEST-18.2** | AC-18.2 | E, M | Seed users; a new empty user; `page.route` forcing one 500 per screen's main read | Visit every screen in §2.2 | Skeleton while loading; the empty message for the empty user; the error banner, then Retry shows the data. Manual items in the checklist. |
| **TEST-18.3** | AC-18.3 | E | Seed users | For each form (login, opening balance, transaction, account, filters, summary and report ranges, create user), enter one invalid value per validated field; then force a server `VALIDATION_ERROR` with `details[0].field` set | A message next to each field before submit; the server error appears on the named field. |
| **TEST-18.4** | AC-18.4 | E | Viewport 360 × 740 | Visit every screen, open each dialog | `scrollWidth ≤ 360` on every screen and dialog. |
| **TEST-18.5** | AC-18.5 | E, A | Seed users | E: submit a Payment with the POST answering 500 once, then retry; double-click Save on a valid Payment; delete the session row, then submit. A: for each Sprint 3 route, make its service method throw an unexpected error with a Vitest spy and call the route (the existing `/crash` test route covers the generic handler only) | E: the form keeps every field after the 500 and one transaction exists after the retry; one POST for the double click; redirect to `/login` and no new transaction. A: 500 `{ error: { code: "INTERNAL_ERROR", … } }` with `X-Request-Id` and no stack, SQL or path. |
| **TEST-18.6** | AC-18.6 | U, A, E, M | Release candidate commit; deployed revision | `npm run verify`; CI on the release PR; the invariant script over the performance ledger; the three journeys on the deployed revision | Counts recorded with 0 failed; invariant difference 0 satang; every journey step's expected value seen on the deployed revision, with the revision name and tag. |

---

## 5. Definition of done (F-18)

- Every AC above has an executed check with results recorded per Sprint 3 README §5; manual checks name the checker and date.
- Each defect found has an ID, a failing test or failing timing run before its fix, and a separate fix commit.
- Any index added has a migration and a System-Level SDS §2 update; no response changes.
- The NFR-07, NFR-08 and NFR-02/03/04 rows in traceability §1 point to the recorded results.
- The `v1.0.0` release PR names the tested commit, the counts, the timing table and the checklist.
- The Sprint 3 DoD in [README.md](README.md) §5 is met.
