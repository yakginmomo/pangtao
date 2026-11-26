# Pangtao: Requirements Traceability

Related documents: [SRS](srs.md) · [Feature inventory](features.md) · [System-Level SDS](system-sds.md) · [Three-sprint plan](sprints/plan.md)

## 1. Requirements-to-feature-to-sprint traceability

AC and test IDs follow the convention AC-NN.k and TEST-NN.k, where NN is the feature number. Test levels: U unit, A API/database integration, E end-to-end. Sprint 1 IDs are fixed in Part E; later-sprint rows get contracts before implementation.

| Requirement | Feature | Sprint | Planned verification |
|---|---|---|---|
| FR-01 | F-01 | 1 | AC-01.x / TEST-01.x · A, E |
| FR-02 | F-01 | 1 | AC-01.x / TEST-01.x · A, E |
| FR-03 | F-01 | 1 | AC-01.x / TEST-01.x · A |
| FR-04 | F-01; F-09 to F-13 (new routes) | 1, 2 | AC-01.x / TEST-01.x · A (role and ownership); Sprint 2: AC-09.8, 10.8, 11.6, 12.6, 13.8 · A |
| FR-05 | F-02 | 1 | AC-02.x / TEST-02.x · A |
| FR-06 | F-02 | 1 | AC-02.x / TEST-02.x · A, E |
| FR-07 | F-17 | 3 | Contract in Sprint 3 · A |
| FR-08 | F-03, F-08 | 1 | AC-03.x / TEST-03.x · U, A, E (accounts and balances API); AC-08.x / TEST-08.x · U, A, E (income/expense totals) |
| FR-09 | F-09 | 2 | AC-09.1–09.10 / TEST-09.1–09.10 (F-09 1.0) · U, A, E |
| FR-10 | F-04 | 1 | AC-04.x / TEST-04.x · U, A |
| FR-11 | F-12 | 2 | AC-12.1–12.7 / TEST-12.1–12.7 (F-12 1.1) · A, E |
| FR-12 | F-05 | 1 | AC-05.x / TEST-05.x · U, A, E |
| FR-13 | F-06 | 1 | AC-06.x / TEST-06.x · U, A, E |
| FR-14 | F-10 | 2 | AC-10.1–10.7, 10.10 / TEST-10.1–10.7, 10.10 (F-10 1.0) · U, A, E |
| FR-15 | F-11 | 2 | AC-11.1–11.8 / TEST-11.1–11.8 (F-11 1.0) · U, A, E |
| FR-16 | F-13 | 2 | AC-13.1–13.10 / TEST-13.1–13.10 (F-13 1.1) · U, A, E |
| FR-17 | F-07 | 1 | AC-07.x / TEST-07.x · A, E |
| FR-18 | F-14 | 3 | Contract in Sprint 3 · A |
| FR-19 | F-15 | 3 | Contract in Sprint 3 · A |
| FR-20 | F-15 | 3 | Contract in Sprint 3 · A, E |
| FR-21 | F-10 | 2 | AC-10.8, 10.9 / TEST-10.8, 10.9 (F-10 1.0) · A, E |
| FR-22 | F-08 | 1 | AC-08.x / TEST-08.x · U, A, E |
| FR-23 | F-16 | 3 | Contract in Sprint 3 · A |
| FR-24 | F-16 | 3 | Contract in Sprint 3 · A |
| FR-25 | F-07 | 1 | AC-07.3 / TEST-07.3 · A; detail screen checked end to end |
| BR-01 | F-01 (all routes), F-03, F-07, F-08; F-09 to F-13 | 1, 2 | AC-01.x, 03.x, 07.x, 08.x · A (cross-user access); AC-01.9 verified by TEST-07.4 (f-01 v1.1); Sprint 2: AC-09.3 (names unique per user), 09.8, 10.6, 10.8, 11.6, 12.6, 13.8 · A |
| BR-02 | F-01 (all routes), F-02, F-03, F-07, F-08; F-09 to F-13 | 1, 2 | AC-01.x, 02.x, 03.x, 07.x, 08.x · A (admin denied financial data); Sprint 2: AC-09.8, 10.8, 11.6, 12.6, 13.8 · A |
| BR-03 | F-02 | 1 | AC-02.x · A |
| BR-04 | F-04, F-05, F-06; F-12, F-13 | 1, 2 | AC-04.x, 05.x, 06.x · U, A; Sprint 2: AC-12.2 (corrected opening amount), AC-13.3 (edited amounts) · A; F-10 and F-11 reuse the F-05/F-06 amount checks |
| BR-05 | F-05, F-06; F-11, F-13 | 1, 2 | AC-05.x, 06.x · U, A; Sprint 2: AC-11.3 (mixed transfer and expense lines), AC-13.3 (edit re-checks the sum) · U, A |
| BR-06 | F-05, F-06 (subset); F-10, F-11 (rest) | 1, 2 | AC-05.x (incl. AC-05.6, AC-05.13), 06.x · U, A; Sprint 2 rows: AC-10.1–10.3, 10.6 (F-10), AC-11.1, 11.2, 11.5 (F-11), AC-13.3 (edit re-checks targets) · U, A |
| BR-07 | F-03, F-05, F-06; F-10 to F-13 | 1, 2 | AC-03.x, 05.x, 06.x · U, A; Sprint 2: AC-10.1–10.4, 10.7, 11.1–11.3, 12.1, 12.3, 13.1, 13.2, 13.5 · U, A |
| BR-08 | F-08; F-10 to F-13 | 1, 2 | AC-08.x · U, A; Sprint 2: AC-10.5, 11.4 (loans and transfers excluded), AC-12.1 (opening corrections excluded), AC-13.1, 13.5 (edits and voids reflected) · U, A |
| BR-09 | F-05, F-08 | 1 | AC-05.x, 08.x · A, E |
| BR-10 | F-04, F-05, F-06; F-11 to F-13 | 1, 2 | AC-04.6, AC-05.8, AC-06.6 (future date) · U, A; v2.0 (Lab 7): AC-05.14 · U, A, AC-05.15 · E, AC-06.12 · A (90-day Payment/Receipt limit); Sprint 2: AC-11.7 (transfers), AC-12.2 (opening corrections: no 90-day limit), AC-13.3, 13.4 (edits: changed date checked, unchanged date kept) · U, A |
| BR-11 | F-04, F-12 | 1, 2 | AC-04.x · A; AC-12.1, 12.3, 12.4 (F-12) · A |
| BR-12 | F-13 | 2 | AC-13.5, 13.6 / TEST-13.5, 13.6, 13.10 (F-13 1.1) · A, E; until F-13 merges, F-07 history lists non-voided transactions only (f-07 1.2) |
| BR-13 | F-02 | 1 | AC-02.x · A |
| BR-14 | F-04, F-05, F-06 (archived rule), F-09 (lifecycle), F-10 to F-13 | 1, 2 | AC-04.10 · A, E; AC-05.12 / TEST-05.12 · A (archived source); AC-05.13 · U, A (archived target, BR-06); AC-06.10 / TEST-06.10 · A (archived receiving account); Sprint 2: AC-09.2 (subtype valid for type), AC-09.3 (unique names), AC-09.5 (type and subtype fixed), AC-09.6, 09.7 (archive and unarchive), AC-10.6, 11.5 (archived loan or Cash target), AC-12.5 (archived account's opening balance), AC-13.3, 13.4 (edits: newly chosen archived account rejected, archived account kept in the same role) · U, A |
| BR-15 | F-15 | 3 | Contract in Sprint 3 · A |
| BR-16 | F-05, F-06; F-10, F-13 | 1, 2 | AC-05.10, AC-06.4 / TEST-05.10, TEST-06.4 · A; Sprint 2: AC-10.6 (Loan Given source rejected), AC-13.3 (edit re-checks the source type) · U, A |
| NFR-01 | F-01 | 1 | AC-01.x · A |
| NFR-02 | F-01 (all routes) | 1, re-run in 2, 3 | AC-01.x · A route-list test; Sprint 2 routes added to it (F-09, F-10, F-12, F-13 DoD), anonymous 401 in AC-09.8, 10.8, 11.6, 12.6, 13.8 · A |
| NFR-03 | F-03 | 1, re-run in 2 | AC-03.x · U, A invariant test; re-run with transfers, loans, edits and voids: AC-11.4, AC-10.5, AC-13.9 · U, A |
| NFR-04 | F-01 | 1 | AC-01.x · A |
| NFR-05 | F-19 (local run verified in Sprint 1; Docker in Lab 5 #23) | 1 local, Lab 5 Docker | README run-through; clean-clone container run (§3, Lab 5 #23) |
| NFR-06 | F-19 (local restart check in Sprint 1; redeploy in Lab 5) | 1 local, Lab 5 | Restart check; Lab 5 evidence |
| NFR-07 | F-18 | 3 | Timing script |
| NFR-08 | F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08 (Sprint 1 screens); F-09 to F-13 (Sprint 2 screens); F-18 (all) | 1 (built screens), 2 (built screens), 3 | E checks plus checklist; Sprint 2: AC-09.9, 09.10, 10.9, 10.10, 11.8, 12.7, 13.10 · E (inline validation, loading/empty/error states, 360 px) |
| NFR-09 | F-19 | 1 local, Lab 5 CI | Coverage gate in CI (`unit-api-tests` job); CI runs |
| NFR-10 | F-01 | 1 | AC-01.6, AC-01.12, AC-01.13 / TEST-01.6, TEST-01.12, TEST-01.13 · A |

## 2. Coverage and change status

Baseline v1.0 contains 25 FR, 16 BR and 10 NFR. Every one is mapped to a feature or system responsibility and a sprint. Sprint 1 carries 13 FR (FR-01–06, 08, 10, 12, 13, 17, 22, 25), Sprint 2 carries 6 (FR-09, 11, 14, 15, 16, 21) and Sprint 3 carries 6 (FR-07, 18, 19, 20, 23, 24). **Uncovered requirements: none.**

| Version | Date | Change | Approved |
|---|---|---|---|
| v1.0 | 7 Nov 2026 | Initial baseline | Team |
| v1.1 | 10 Nov 2026 | F-01 contract v1.1: AC-01.9 verification moved to F-07 (TEST-07.4); no requirement added or dropped | Teammate review, PR #10 (approved and merged) |
| v1.2 | 11 Nov 2026 | F-03 contract v1.1: F-03 creates the full ledger schema (accounts, transactions, allocation_lines); AC-03.4 invariant wording made explicit for Loan Taken openings; no requirement added or dropped | Teammate review, PR #12 (approved and merged) |
| v1.3 | 12 Nov 2026 | System-Level SDS §1 corrected to match the code: services call Prisma directly (no separate repository layer), the route guard is `access(...)`, the repository layout lists `tests/unit`, `tests/helpers` and `scripts/`, the runtime is Node.js 20 or later, and brute-force limiting counts failed attempts only (as SRS NFR-10 and F-01 state). Feature inventory and sprint README list BR-01 for F-07, matching the F-07 contract and this matrix. F-01 contract v1.4: §2.2 aligned with web app route guarding (Administrator on User page redirected to `/admin/users`, API 401 redirects to `/login`). §3 below added with actual Sprint 1 test results. Product DoD 1.1 and F-01 contract 1.3–1.4 (sprint README §5): results are recorded in the PR and, from Lab 5, in CI; the committed per-feature evidence folder is removed and kept in git history. No requirement added or dropped. FR-08 is traced to F-03 (accounts and balances API) and F-08 (income/expense totals), and the verification record names the feature baseline plus this documentation commit rather than `cec8b61` alone | Teammate review, PR #13 (approved and merged) |
| v1.4 | 13 Nov 2026 | F-07 contract v1.1: TEST-07.9 (E) added for the empty and error states of AC-07.6; history lists non-voided transactions until F-13 delivers BR-12; real index name `transactions_user_id_txn_date_created_at_idx` in §2.3 and §5. No requirement added or dropped | Teammate review, PR #17 (approved and merged) |
| v1.5 | 13 Nov 2026 | F-08 contract 1.0: AC-08.1–AC-08.9 verified at unit, API and E2E levels; §3 records the F-08 failing-first and implementation commits. No requirement added or dropped | Teammate review, PR #18 (changes requested, addressed, approved and merged) |
| v1.6 | 14 Nov 2026 | F-01 contract v1.5 (Lab 5): the AC-01.12 counter is stored in the new `login_attempts` table and, behind Cloud Run, keyed by the client IP from `X-Forwarded-For` (`TRUST_PROXY`); expired windows are deleted on every login attempt. System-Level SDS §1, §2 (table and ER diagram), §6 and §7 updated to match, and §7 no longer claims Zod validation of the environment. §3 gains the Lab 5 tested version, and its status line now records the Sprint 1 release on `main` (PR #20). No requirement added or dropped | Teammate review, PR #29 (changes requested, addressed, approved and merged) |
| v1.7 | 15 Nov 2026 | Lab 5 #23 (containerize): System-Level SDS §7 lists `APP_PORT` and the `GIT_SHA` default and marks `LOG_LEVEL` as reserved, and §8 now says `docker compose up -d` starts PostgreSQL only while `--profile app` adds the `migrate` job and the app container. NFR-05 evidence names the clean-clone container run, and §3 gains the Lab 5 #23 tested version. No requirement added or dropped | Teammate review, PR #32 (approved and merged) |
| v1.8 | 15 Nov 2026 | Lab 5 #24 (CI): `.github/workflows/ci.yml` runs lint, type-check, build, unit and API tests with the coverage gate, E2E and the Docker build on pull requests. System-Level SDS §8 describes the four checks (E2E on every PR, not only the release PR); the deployment guide gains a CI row and section (pull-request runs test GitHub's merge commit; the run summary names failed and flaky tests), and the `TEST_DATABASE_URL` and `SEED_DEFAULT_PASSWORD` rows note the CI values. NFR-09 evidence names the CI gate. §3 gains the Lab 5 #24 tested version, and its #23 entry no longer says #31 tracks the P2028 failures. That error recurred on this branch and is addressed: the server's Prisma client waits up to 5 s instead of 2 s for a pooled connection (System-Level SDS §1), checked by `tests/api/transaction-wait.api.test.ts`; the CI runs on this PR show whether it recurs. No requirement added or dropped | Teammate review, PR #33 (approved and merged) |
| v1.9 | 17 Nov 2026 | Lab 5 #27 (repeatable release, Student Guide 7.7): the login subtitle changes so the second pipeline release is visible on the public URL. The deployment guide records the public URL, its running-commit row points to §6, and §6 gains the Cloud Run revision history and migration job checks. No requirement added or dropped | Teammate review, PR #40 (approved and merged) |
| v2.0 | 25 Nov 2026 | Lab 7 change request (Issue #49): BR-10 revised. A Payment or Receipt dated more than 90 days before today in Bangkok time is rejected with the new code 400 `DATE_TOO_OLD`; opening balances, summaries, history and rows already saved are unchanged. F-05 1.3 and F-06 1.3 add AC-05.14, AC-05.15 and AC-06.12 with TEST-05.14, TEST-05.15 and TEST-06.12; F-04 1.2 is wording only. Recorded before implementation. Impact analysis: `docs/labs/lab-07/change-impact.md`. No requirement added or dropped | Teammate review, PR #50 (approved and merged before implementation) |
| v2.1 | 26 Nov 2026 | Sprint 2 contracts F-09 1.0 to F-13 1.0 and Sprint 2 README 1.0, recorded before implementation. **Requirement revision (narrowed), F-10 Q-1:** SRS §4 limited a Loan Taken (card) source to Expense lines "in Sprint 1", which left card lending and card-to-Cash moves open; v2.1 makes the Expense-only rule permanent, so every loan and transfer row uses a Cash source. The SRS §4 matrix table is unchanged. Contract revisions: F-05 1.4 and F-06 1.4 move the TEST-05.13/TEST-06.11 cases that the Sprint 2 rows make valid to TEST-11.1, TEST-11.2 and TEST-10.3; F-07 1.2 returns voided transactions in history from F-13 (BR-12), and F-13 §2.4 lists the F-07 tests whose expected values change with it. §1 maps every Sprint 2 AC to FR-04, 09, 11, 14, 15, 16, 21, BR-01, 02, 04, 05, 06, 07, 08, 10, 11, 12, 14, 16 and NFR-02, 03, 08. New error codes `ACCOUNT_NAME_EXISTS` and `TRANSACTION_VOIDED` (Sprint 2 README §2.6). No requirement added or dropped; no AC removed | Teammate review, PR #63 (changes requested twice, addressed, approved and merged) |
| v2.2 | 27 Nov 2026 | F-11 1.1 (Sprint 2 README §6): TEST-11.8's Receive step corrected to receive into Bank Account from Wallet, so its expected balances (Bank 49,200.00, Wallet 800.00 THB) follow from SRS §4; 1.0's step moved the money the other way. §2.4 names the unit pair tables of TEST-05.13/TEST-06.11 and F-10 TEST-10.10's target-group list, which change with the matrix. Test specification only: no requirement, rule, AC or behaviour changes | Teammate review, PR for Issue #58 |
| v2.3 | 27 Nov 2026 | F-13 1.1 and F-07 1.3 (Sprint 2 README §6, Sprint 1 README §5): history items and the transaction detail also return `createdAt`, and a void leaves `updatedAt` unchanged, so the "Edited" mark in F-13 §2.2 can be computed (`updatedAt` later than `createdAt`). Recorded before the F-13 tests. No requirement, AC or TEST added or dropped | Teammate review pending (F-13 PR, Issue #61) |
| v2.4 | 27 Nov 2026 | F-12 1.1 (Sprint 2 README §6): removing an opening balance leaves `updated_at` unchanged, as a void does in f-13 1.1, so a removed opening balance that was never corrected is not marked "Edited"; a correction still changes it. TEST-12.3 asserts it. Recorded before the fix and its failing test. No requirement, AC or TEST added or dropped | Teammate review, F-13 PR #70 (changes requested) |

All assumptions and decisions (A-01–A-04, D-01–D-07) are fully resolved and agreed by the team; zero open items remain.

## 3. Sprint 1 verification results

Actual tests and results for every Sprint 1 acceptance criterion. Automated test names start with their test ID, for example `TEST-03.3 (AC-03.3): …`, so each row can be found by searching the file for the ID.

**Tested version:** `sprint-1-staging` at commit `cec8b61` (merge of PR #12), 12 Nov 2026, plus this documentation and verification commit on `docs/sprint-1-align-contracts` (its head commit is recorded in the PR description per DoD 1.1). Commands: `npm run verify` on that tree: lint and type-check clean, `npm test` 44 passed, 0 failed, 0 skipped, service-layer line coverage 98.41%, build succeeded, `npx playwright test` 4 passed, 0 failed, 0 skipped (TEST-02.4 end-to-end added). **F-04:** branch `feature/F-04-opening-balance`, failing-first commit `f03c53a`, implementation commit `d831c3d`, UI/E2E/traceability commit `1fa5afa`, review failing-first commit `968d5f9`, plus the review-fix commit at this PR's head (recorded in the F-04 PR description per DoD 1.1). Commands: `npm run verify` on that tree: lint and type-check clean, `npm test` 61 passed, 0 failed, 0 skipped, service-layer line coverage 98.13% (`opening-balance.service.ts` 97.05%), build succeeded, `npx playwright test` 7 passed, 0 failed, 0 skipped (the extra F-04 spec covers the §2.2 dialog at desktop and 360 px, the archived-row rule and the expired-session redirect; it is not part of the contract STS). **F-05:** branch `feature/F-05-payment-charge`, contract 1.2 commit `1645b2d`, failing-first commit `f3b0a32`, implementation commit at this PR's head (recorded in the F-05 PR description per DoD 1.1). Commands: `npm run verify` on that tree: lint and type-check clean, `npm test` 82 passed, 0 failed, 0 skipped, service-layer line coverage 98.62% (`transaction.service.ts` and `allocation.rules.ts` 100%), build succeeded, `npx playwright test` 9 passed, 0 failed, 0 skipped. **F-06:** branch `feature/F-06-received-money`, contract 1.2 commit `b26ea54`, failing-first commit `ccac71a`, implementation commit at this PR's head (recorded in the F-06 PR description per DoD 1.1). Commands: `npm run verify` on that tree: lint and type-check clean, `npm test` 98 passed, 0 failed, 0 skipped, service-layer line coverage 98.7% (`transaction.service.ts` and `allocation.rules.ts` 100%), build succeeded, `npx playwright test` 10 passed, 0 failed, 0 skipped. On Windows the E2E run was made with `TEMP`/`TMP` outside `%TEMP%`, because Playwright otherwise stalls deleting the browser profile after the tests pass (all specs; fixed separately on `chore/playwright-temp-dir`). **F-07:** branch `feature/F-07-transaction-history`, contract 1.1 commit `64e4b0d`, failing-first commit `4a8d6fe`, implementation commit at this PR's head (recorded in the F-07 PR description per DoD 1.1). Commands: `npm run verify` on that tree: lint and type-check clean, `npm test` 109 passed, 0 failed, 0 skipped, service-layer line coverage 98.86% (`transaction.service.ts` 100%), build succeeded, `npx playwright test` 14 passed, 0 failed, 0 skipped. **F-08:** branch `feature/F-08-income-expense-summary`, contract 1.0, failing-first commit `bb79797`, implementation commit at this PR's head (recorded in the F-08 PR description per DoD 1.1). Commands: `npm run verify` on that tree: lint and type-check clean, `npm test` 125 passed, 0 failed, 0 skipped, service-layer line coverage 98.95% (`summary.service.ts` and `summary.engine.ts` 100%), build succeeded, `npx playwright test` 19 passed, 0 failed, 0 skipped. Extra F-08 coverage beyond TEST-08.7: the dashboard widget, cache refresh after a new payment, inline custom-range validation, the skeleton/error/retry states, the 360 px layout, and a parity test that runs the pure engine and the SQL aggregation over the same ledger. On Windows, a terminal opened as `c:\…` made v8 count every source file twice (once at 0%) and fail the 80% gate although all tests passed; `vitest.config.ts` now pins the root to an uppercase drive letter, and the run above was made from `c:\…`. Update this table and the tested version whenever a feature merges into staging.

**Lab 5 tested version (#22, cloud readiness):** branch `chore/lab5-cloud-ready`, failing-first commits `9e5398a` and `915a37c`, implementation commit `f25fbc1`, plus the review-fix commit at the head of PR #29 (recorded in the PR description per DoD 1.1). Commands on that tree: lint and type-check clean, `npm test` 131 passed, 0 failed, 0 skipped, service-layer line coverage 99.01% (`login-attempt.service.ts` 100%), build succeeded, `npx playwright test` 19 passed, 0 failed, 0 skipped.

**Lab 5 tested version (#23, containerize):** branch `chore/lab5-containerize`, image commits `09de27b` and `78d0339`, plus the review-fix commit at the head of its PR (documentation, `.dockerignore` and comments; recorded in the PR description). Commands on that tree: lint and type-check clean, `npm test` 131 passed, 0 failed, 0 skipped, service-layer line coverage 99.01%, build succeeded, `npx playwright test` 19 passed, 0 failed, 0 skipped in each of the last four full runs (two earlier full runs each failed TEST-08.7 with Prisma P2028 before the development database was re-seeded; #31 was closed as not planned; the same error came back while verifying #24 and is addressed there, see the #24 entry). C-03: a fresh clone of `78d0339` with only `SEED_DEFAULT_PASSWORD` set in `.env` ran `GIT_SHA=$(git rev-parse HEAD) docker compose --profile app up -d --build` (`GIT_SHA` only labels the build; without it the log shows `commit local`); `migrate` exited 0 after applying migrations and seeding, `app` became healthy and logged `[production] commit 78d0339…`, `GET /api/v1/health` returned `{"status":"ok"}`, a seeded user logged in (200) and `/` served the web app. The image runs as `node` (uid 1000) and contains no `.env`, `tests`, `docs` or `.git`. After the review fix, a `docker build --target build` with planted `server/.env.local`, `web/.env.production` and `server/planted.pem` showed none of them in the build stage and nothing inlined into `web/dist`.

**Lab 5 tested version (#24, CI):** branch `chore/lab5-ci` from `sprint-2-staging` at `8c649cd` (merge of PR #32). Failing-test commit `99ee514`; implementation commit `898b62e`. Local commands on `898b62e`: lint and type-check clean, `npm test` 132 passed, 0 failed, 0 skipped, service-layer line coverage 99.01%, build succeeded, `npx playwright test` 19 passed, 0 failed, 0 skipped, 0 flaky. Earlier runs: the first full E2E run on the branch failed with test timeouts across several specs (not investigated); at `78aee4c` one test failed (the F-08 360 px skeleton and retry test), whose opening-balance POST returned 500 with Prisma P2028, the error #31 recorded for TEST-08.7. The likely cause is Prisma's default 2-second wait for a pooled connection: `tests/api/transaction-wait.api.test.ts` reproduces P2028 with a one-connection pool. Its first version failed at `99ee514` (it used its own client, and the server option did not exist yet); the current version runs on the server's own client and fails again when the option is removed from `server/src/prisma.ts`. The server now waits up to 5 s (`TRANSACTION_OPTIONS`). The CI runs on this PR show whether E2E failures or flaky retries remain: the E2E job's summary names any failed test and any test that passed only after a retry. CI on PR #33: run [43690133827](https://github.com/Finyakginshabu/pangtao/actions/runs/43690133827) (`898b62e`) and run [43690457894](https://github.com/Finyakginshabu/pangtao/actions/runs/43690457894) (`dd241c0`, which changes only this file), each testing the merge into `sprint-2-staging`: all four checks passed in both, unit and API 132 passed, 0 failed, 0 skipped, service-layer line coverage 99.01%, E2E 19 passed, 0 failed, 0 skipped, 0 flaky.

**Lab 7 tested version (#49, BR-10 90-day limit):** branch `feature/F-05-backdate-limit` from `docs/update-contract` at `fcbd92f` (contract revision, merged into `sprint-2-staging` by PR #50 as `c07b47d`). Failing-test commit `676e90c`, run on `fcbd92f`, whose `server/`, `web/` and `prisma/` are identical to the pre-change `main` at `41bb484`: TEST-05.14 and TEST-06.12 failed with `expected 201 to be 400` (the T−91 request was saved), and TEST-05.15 failed because the date input had no `min`. Fixture commit `84dadca` dates the transaction fixtures relative to today; implementation commit `5b16bc7`. Commands on `5b16bc7` (no tracked changes): lint and both type-checks clean, `npm test` 137 passed, 0 failed, 0 skipped, service-layer line coverage 99.02%, build succeeded, `npx playwright test` 20 passed, 0 failed, 0 skipped, 0 flaky.

| AC | Test | Level | Actual test file | Result |
|---|---|---|---|---|
| AC-01.1 to AC-01.8 | TEST-01.1 to TEST-01.8 | A | `tests/api/auth.api.test.ts` | PASS |
| AC-01.9 | TEST-07.4 (f-01 v1.1) | A | `tests/api/transaction-history.api.test.ts` | PASS; failing-first `4a8d6fe` |
| AC-01.10 to AC-01.13 | TEST-01.10 to TEST-01.13 | A | `tests/api/auth.api.test.ts` | PASS; extra AC-01.12 cases (f-01 v1.5): behind a proxy and across a restart, failing-first `9e5398a`; window expiry and reset on success, failing-first `915a37c` |
| AC-01.14 | TEST-01.14 | E | `tests/e2e/auth.spec.ts` | PASS |
| AC-02.1 to AC-02.3 | TEST-02.1 to TEST-02.3 | A | `tests/api/admin.api.test.ts` | PASS |
| AC-02.4 | TEST-02.4 | A, E | `tests/api/admin.api.test.ts` and `tests/e2e/admin-users.spec.ts` | PASS at both levels |
| AC-02.5 to AC-02.7 | TEST-02.5 to TEST-02.7 | A | `tests/api/admin.api.test.ts` | PASS |
| AC-02.8 | TEST-02.8 | E | `tests/e2e/admin-users.spec.ts` | PASS |
| AC-02.9 | TEST-02.9 | A | `tests/api/admin.api.test.ts` | PASS |
| AC-03.1, AC-03.2 | TEST-03.1, TEST-03.2 | A | `tests/api/accounts.api.test.ts` | PASS |
| AC-03.3, AC-03.4 | TEST-03.3, TEST-03.4 | U, A | `tests/unit/balance.engine.test.ts` and `tests/api/accounts.api.test.ts` | PASS at both levels |
| AC-03.5 | TEST-03.5 | A | `tests/api/accounts.api.test.ts` | PASS |
| AC-03.6 | TEST-03.6 | E | `tests/e2e/dashboard.spec.ts` | PASS |
| AC-04.1, AC-04.2 | TEST-04.1, TEST-04.2 | A | `tests/api/opening-balance.api.test.ts` | PASS |
| AC-04.3 | TEST-04.3 | U, A | `tests/unit/opening-balance.test.ts` and `tests/api/opening-balance.api.test.ts` | PASS at both levels |
| AC-04.4 | TEST-04.4 | A | `tests/api/opening-balance.api.test.ts` | PASS; failing-first `f03c53a`, implementation `d831c3d` |
| AC-04.5 | TEST-04.5 | A | `tests/api/opening-balance.api.test.ts` | PASS; failing-first `f03c53a`, implementation `d831c3d` |
| AC-04.6 | TEST-04.6 | U, A | `tests/unit/opening-balance.test.ts` and `tests/api/opening-balance.api.test.ts` | PASS at both levels |
| AC-04.7 to AC-04.9 | TEST-04.7 to TEST-04.9 | A | `tests/api/opening-balance.api.test.ts` | PASS |
| AC-04.10 | TEST-04.10 | A, E | `tests/api/opening-balance.api.test.ts` and `tests/e2e/opening-balance.spec.ts` | PASS at both levels; failing-first `968d5f9` |
| AC-05.1 to AC-05.3 | TEST-05.1 to TEST-05.3 | A | `tests/api/transactions.api.test.ts` | PASS |
| AC-05.4 | TEST-05.4 | U, A | `tests/unit/allocation.rules.test.ts` and `tests/api/transactions.api.test.ts` | PASS at both levels; failing-first `f3b0a32`; extra API case for UAT finding CE-F-01 (#46, Lab 6 controlled exercise): a Bank payment with one line below the total leaves every balance unchanged, failing-first `d082577` |
| AC-05.5 | TEST-05.5 | A | `tests/api/transactions.api.test.ts` | PASS |
| AC-05.6 | TEST-05.6 | A | `tests/api/transactions.api.test.ts` | PASS; failing-first `f3b0a32` |
| AC-05.7, AC-05.8 | TEST-05.7, TEST-05.8 | A | `tests/api/transactions.api.test.ts` | PASS |
| AC-05.9 | TEST-05.9 | E | `tests/e2e/transactions.spec.ts` | PASS |
| AC-05.10, AC-05.11 | TEST-05.10, TEST-05.11 | A | `tests/api/transactions.api.test.ts` | PASS |
| AC-05.12 | TEST-05.12 | A | `tests/api/transactions.api.test.ts` | PASS; failing-first `f3b0a32` |
| AC-05.13 | TEST-05.13 | U, A | `tests/unit/allocation.rules.test.ts` and `tests/api/transactions.api.test.ts` | PASS at both levels |
| AC-05.14 | TEST-05.14 | U, A | `tests/unit/date.util.test.ts` and `tests/api/transactions.api.test.ts` | PASS at both levels; failing-first `676e90c` (API level; the unit test arrives with the helper it tests) |
| AC-05.15 | TEST-05.15 | E | `tests/e2e/transactions.spec.ts` | PASS; failing-first `676e90c` |
| AC-06.1, AC-06.2 | TEST-06.1, TEST-06.2 | A | `tests/api/transactions.api.test.ts` | PASS |
| AC-06.3 | TEST-06.3 | U, A | `tests/unit/allocation.rules.test.ts` and `tests/api/transactions.api.test.ts` | PASS at both levels; failing-first `ccac71a` |
| AC-06.4 | TEST-06.4 | A | `tests/api/transactions.api.test.ts` | PASS; failing-first `ccac71a` |
| AC-06.5, AC-06.6 | TEST-06.5, TEST-06.6 | A | `tests/api/transactions.api.test.ts` | PASS |
| AC-06.7 | TEST-06.7 | A | `tests/api/transactions.api.test.ts` | PASS |
| AC-06.8 | TEST-06.8 | E | `tests/e2e/transactions.spec.ts` | PASS |
| AC-06.9 | TEST-06.9 | A | `tests/api/transactions.api.test.ts` | PASS |
| AC-06.10 | TEST-06.10 | A | `tests/api/transactions.api.test.ts` | PASS; failing-first `ccac71a` |
| AC-06.11 | TEST-06.11 | U, A | `tests/unit/allocation.rules.test.ts` and `tests/api/transactions.api.test.ts` | PASS at both levels; failing-first `ccac71a` |
| AC-06.12 | TEST-06.12 | A | `tests/api/transactions.api.test.ts` | PASS; failing-first `676e90c` |
| AC-07.1 to AC-07.3 | TEST-07.1 to TEST-07.3 | A | `tests/api/transaction-history.api.test.ts` | PASS |
| AC-07.4 | TEST-07.4 | A | `tests/api/transaction-history.api.test.ts` | PASS; failing-first `4a8d6fe` (fails on the owner's 200 control, not on the missing route's 404) |
| AC-07.5 | TEST-07.5, TEST-07.7 | A | `tests/api/transaction-history.api.test.ts` | PASS |
| AC-07.6 | TEST-07.6, TEST-07.9 | E | `tests/e2e/transaction-history.spec.ts` | PASS |
| AC-07.7 | TEST-07.8 | A | `tests/api/transaction-history.api.test.ts` | PASS |
| AC-08.1, AC-08.2 | TEST-08.1 | A | `tests/api/summary.api.test.ts` | PASS |
| AC-08.3 | TEST-08.2, TEST-08.6 | U, A | `tests/unit/summary.engine.test.ts` and `tests/api/summary.api.test.ts` | PASS at both levels; failing-first `bb79797` |
| AC-08.4 | TEST-08.3 | A | `tests/api/summary.api.test.ts` | PASS |
| AC-08.5 | TEST-08.4 | A | `tests/api/summary.api.test.ts` | PASS |
| AC-08.6 | TEST-08.5 | A | `tests/api/summary.api.test.ts` | PASS |
| AC-08.7 | TEST-08.7 | E | `tests/e2e/summary.spec.ts` | PASS |
| AC-08.8 | TEST-08.8 | A | `tests/api/summary.api.test.ts` | PASS |
| AC-08.9 | TEST-08.9 | A | `tests/api/summary.api.test.ts` | PASS |

**Status by feature:** F-01 to F-08 are implemented, merged into `sprint-1-staging` (F-08 through PR #18) and released on `main` through the Sprint 1 release PR #20 (`bec5575`); F-07's TEST-07.4 passes, which completes F-01 AC-01.9. `sprint-2-staging` starts from that release. Lab 5 changes (from #22) target `sprint-2-staging` and reach `main` through the release pipeline (#27).

**Where results are recorded:** in each feature PR description (tested commit, counts, AC-to-test table, failing-test and implementation commits) and, from Lab 5 #24, in the CI run on that PR (test summary on the run page). Earlier per-feature output files are in git history (sprint README §5, DoD 1.1).

## 4. Sprint 2 verification results

Actual tests and results for each Sprint 2 feature, in the same form as §3. Automated test names start with their test ID, so each row can be found by searching the file for the ID. The tested commit and the CI run are recorded in the feature's PR description (DoD 1.1); until a feature merges its row stays "not yet".

### F-09 Account management (contract 1.0, Issue #57)

**Tested version:** branch `feature/F-09-account-management` from `sprint-2-staging` at `f388bea` (merge of PR #65). Failing-test commit `eafc03c`; implementation commits `8f7c80b` (server) and `f85f513` (Accounts screen), then the review-fix commit at this PR's head (recorded in the F-09 PR description per DoD 1.1). Commands on the tree with the review fix (Docker `app` container stopped, so E2E used this branch's server): lint and both type-checks clean, `npm test` 150 passed, 0 failed, 0 skipped (16 files), service-layer line coverage 98.84%, build succeeded, `npx playwright test` 23 passed, 0 failed, 0 skipped, 0 flaky. CI on `fa7231e` (before the review fix): run [45865562142](https://github.com/yakginmomo/pangtao/actions/runs/45865562142), all four checks passed.

**Failing-first.** At `eafc03c` the nine new API tests and the NFR-02 route-list test (TEST-01.7) failed on the pre-change code: the account requests returned 404 because `POST /accounts` and `PATCH /accounts/:id` did not exist. Two disclosures:

- The unit half of TEST-09.2 (`tests/unit/account.rules.test.ts`) was added with the implementation, because before it a unit test could only fail on a missing import; AC-09.2 is shown failing first through its API test.
- `eafc03c` spelled the new route-list entry `/api/v1/accounts`; the route table records the collection path as `/api/v1/accounts/` (as it does for the existing `GET`). The implementation commit corrects only that spelling; the expected access level (`USER`) and the method are unchanged.

| AC | TEST | Level | Test file | Result |
|---|---|---|---|---|
| AC-09.1 | TEST-09.1 | A | `tests/api/account-management.api.test.ts` | PASS |
| AC-09.2 | TEST-09.2 | U, A | `tests/unit/account.rules.test.ts` and `tests/api/account-management.api.test.ts` | PASS at both levels; failing-first `eafc03c` (API) |
| AC-09.3 | TEST-09.3, and the parallel-create test (untagged) | A | `tests/api/account-management.api.test.ts` | PASS; failing-first `eafc03c` |
| AC-09.4 | TEST-09.4 | A | `tests/api/account-management.api.test.ts` | PASS |
| AC-09.5 | TEST-09.5 | A | `tests/api/account-management.api.test.ts` | PASS; failing-first `eafc03c` |
| AC-09.6 | TEST-09.6 | A | `tests/api/account-management.api.test.ts` | PASS; failing-first `eafc03c` |
| AC-09.7 | TEST-09.7 | A | `tests/api/account-management.api.test.ts` | PASS |
| AC-09.8 | TEST-09.8; NFR-02 route list in TEST-01.7 | A | `tests/api/account-management.api.test.ts` and `tests/api/auth.api.test.ts` | PASS (TEST-09.8 opens with an owner control, so Bob's 404 is an ownership result) |
| AC-09.9 | TEST-09.9 | E | `tests/e2e/accounts.spec.ts` | PASS locally and in CI run 45865562142 (`fa7231e`) |
| AC-09.10 | TEST-09.10 | E | `tests/e2e/accounts.spec.ts` | PASS locally and in CI run 45865562142 (`fa7231e`) |

**Mutation checks (PR #66 review).** The failing-first commit only shows that the endpoint was missing (404). To show that each rule is enforced, the rule was disabled in the implementation, the matching test was run, and the file was restored from a saved copy. These runs are not commits.

| AC | Rule disabled | Test run | Result with the rule disabled |
|---|---|---|---|
| AC-09.2 | `superRefine` subtype check in `CreateAccountBodySchema` | TEST-09.2 (API) | FAIL: `expected 500 to be 400` for CASH with `CREDIT_CARD` (the database CHECK constraint rejects it, but as a server error) |
| AC-09.3 | Name check in `assertNameFree` and the unique-violation mapping | TEST-09.3 | FAIL: `expected 500 to be 409` |
| AC-09.3 | Only the unique-violation mapping (`mapDuplicateName`) | unit mapping test; the real PostgreSQL violation test | FAIL both: the Prisma error comes back unmapped |
| AC-09.5 | `.strict()` on `UpdateAccountBodySchema` | TEST-09.5 | FAIL: `expected 200 to be 400` for `{ name, colour }` |
| AC-09.6 | `isArchived` never written by `updateAccount` | TEST-09.6; TEST-09.7 | FAIL both: the archived flag is not set |
| AC-09.6 | Archived Payment source accepted (`checkPaymentAccounts`, F-05) | TEST-09.6 | FAIL: `expected 201 to be 400` |
| AC-09.6 | Archived line target accepted (`checkTargets`, F-05) | TEST-09.6 | FAIL: `expected 201 to be 400` |
| AC-09.6 | Opening balance accepted on an archived account (`opening-balance.service.ts`, F-04) | TEST-09.6 | FAIL: `expected 201 to be 400` |

The same mutation exposed a weak test. With only the unique-violation mapping disabled, the parallel-create test (two simultaneous creates) still passed, because the name check normally wins the race and returns the 409 itself, so that test does not prove the mapping. The mapping therefore moved into `account.rules.ts` as a pure function and is pinned by two deterministic tests: a unit test, and a test that takes the real error PostgreSQL raises for a duplicate `(user_id, name)` and passes it through the mapping. The mapping also now acts only on a violation whose target includes `name`; a unique violation on another key is returned unchanged. The parallel-create test stays as an end-to-end check, not as evidence for the mapping.

**Status:** at the time of writing, PR #66 is open with CI passing on `fa7231e`; F-09 is not yet merged into `sprint-2-staging` and not released. The statuses and the tested commit are updated when it merges.

### F-10 Loans (contract 1.0, Issue #60)

**Tested version:** branch `feature/F-10-loans` from `sprint-2-staging` at `b0e8682` (merge of PR #66). Failing-test commit `0d5a7fb`; implementation commits `bd4fb87` (matrix rows, `GET /loans`) and `838d5c6` (Loans screen and form groups). `npm run verify` on `838d5c6` (Docker `app` container stopped, so E2E used this branch's server): lint and both type-checks clean, 163 unit and API tests passed, 0 failed, 0 skipped (18 files), service-layer line coverage 98.90%, build succeeded, 25 E2E tests passed, 0 failed, 0 skipped. CI runs on the PR.

**Failing-first.** At `0d5a7fb`, on the pre-change code, the new matrix rows failed with `INVALID_TARGET_ACCOUNT` where 201 (API) or no error (unit) was expected: TEST-10.1, 10.2, 10.3 (U and A), 10.4, 10.5, 10.7 and 10.8. The NFR-02 route list (TEST-01.7) failed because `GET /api/v1/loans/` was not declared. Three disclosures:

- TEST-10.6 (U and A) and the unit half of TEST-10.5 already passed at `0d5a7fb`. They assert that the card source, Loan Given sources, archived targets and the form-crossing rows stay rejected, and that the summary engine ignores loan lines (BR-08). Both held before F-10, so they are regression guards, not failing-first evidence.
- TEST-10.5 and TEST-10.8 failed at `0d5a7fb` in their setup (the first loan transaction was rejected), not on the summary or on `GET /loans`. The mutation checks below show that TEST-10.8 checks the overview itself.
- The E2E tests TEST-10.9 and TEST-10.10 were added with the screen in `838d5c6`, not before it. The DoD asks failing-first evidence for the rules (AC-10.1, 10.2, 10.3, 10.5, 10.8), which the API tests carry.

**Existing tests changed with the matrix (f-05 1.4, f-06 1.4).** In `bd4fb87`, the same commit as the matrix change:

- TEST-06.11 (API, `tests/api/transactions.api.test.ts`): the Credit Card target case is removed, as f-10 §2.4 lists; it is accepted borrowing and is asserted in TEST-10.3. The archived, self, Wallet and Dining cases stay; Wallet stays until F-11 (TEST-11.2).
- TEST-05.13 and TEST-06.11 (unit, `tests/unit/allocation.rules.test.ts`): these loop over every source and target type against an expected matrix. The expected matrix now also accepts Cash → Loan Given (Payment) and Cash ← Loan Given / Loan Taken (Receipt), as AC-05.13 and AC-06.11 v1.4 state. Every pair is still asserted, and every other pair is still rejected. f-10 §2.4 names only the API case; the unit tables are recorded here.

**Mutation checks.** Each rule in `loans.service.ts` was disabled, TEST-10.8 was run, and the file was restored from a saved copy. These runs are not commits.

| AC | Rule disabled | Result with the rule disabled |
|---|---|---|
| AC-10.8 | Archived accounts with a zero balance no longer left out | FAIL: `owedToMe.items` has 2 items, expected 1 (`Old loan` listed) |
| AC-10.8 | Total not summed (always 0) | FAIL: `expected +0 to be 150000` |
| AC-10.8 | Loan Given accounts also listed under `owedByMe` | FAIL: `owedByMe.items` has 4 items, expected 3 |

| AC | TEST | Level | Test file | Result |
|---|---|---|---|---|
| AC-10.1 | TEST-10.1 | U, A | `tests/unit/loans.rules.test.ts`, `tests/api/loans.api.test.ts` | PASS; failing-first `0d5a7fb` |
| AC-10.2 | TEST-10.2 | U, A | `tests/unit/loans.rules.test.ts`, `tests/api/loans.api.test.ts` | PASS; failing-first `0d5a7fb` |
| AC-10.3 | TEST-10.3 | U, A | `tests/unit/loans.rules.test.ts`, `tests/api/loans.api.test.ts` | PASS; failing-first `0d5a7fb` |
| AC-10.4 | TEST-10.4 | A | `tests/api/loans.api.test.ts` | PASS |
| AC-10.5 | TEST-10.5 | U, A | `tests/unit/loans.rules.test.ts`, `tests/api/loans.api.test.ts` | PASS; API failing-first `0d5a7fb` (in setup); unit is a BR-08 regression guard |
| AC-10.6 | TEST-10.6 | U, A | `tests/unit/loans.rules.test.ts`, `tests/api/loans.api.test.ts` | PASS; regression guard (passed before F-10) |
| AC-10.7 | TEST-10.7 | A | `tests/api/loans.api.test.ts` | PASS |
| AC-10.8 | TEST-10.8; NFR-02 route list in TEST-01.7 | A | `tests/api/loans.api.test.ts`, `tests/api/auth.api.test.ts` | PASS; failing-first `0d5a7fb` (route list; TEST-10.8 in setup) and the mutation checks above |
| AC-10.9 | TEST-10.9 | E | `tests/e2e/loans.spec.ts` | PASS locally |
| AC-10.10 | TEST-10.10 | E | `tests/e2e/loans.spec.ts` | PASS locally |

TEST-10.9 needs "Alice with no loan accounts", but every seeded user owns a Credit Card (Loan Taken). The test archives that zero-balance card for the empty-state step, which `GET /loans` then leaves out (f-10 §1), and unarchives it afterwards.

**Status:** at the time of writing, F-10 is implemented on its branch and all ten ACs pass locally. It is not yet reviewed, merged into `sprint-2-staging` or released. The statuses and the tested commit are updated when it merges.

### F-11 Transfers (contract 1.1, Issue #58)

**Tested version:** branch `feature/F-11-transfers` from `sprint-2-staging` at `92916f0` (merge of PR #67, F-10). Failing-test commit `0d4d17b`; implementation commit `3114e9d` (matrix rows); contract correction `8a40972` (f-11 1.1, traceability v2.2); form commit `5b1ceeb`. `npm run verify` on `5b1ceeb` (Docker `app` container stopped, so E2E used this branch's server): lint and both type-checks clean, 174 unit and API tests passed, 0 failed, 0 skipped (20 files), service-layer line coverage 98.90%, build succeeded, 26 E2E tests passed, 0 failed, 0 skipped. CI runs on the PR.

**Failing-first.** At `0d4d17b`, on the pre-change code, a Cash target failed with `INVALID_TARGET_ACCOUNT` where 201 (API) or no error (unit) was expected: TEST-11.1, 11.2 (U and A), 11.3 and 11.4 (API). TEST-11.7's T−91 transfer returned `INVALID_TARGET_ACCOUNT` instead of `DATE_TOO_OLD`, because the target check runs before the date check. Three disclosures:

- TEST-11.5 (U and A), TEST-11.6 and the unit half of TEST-11.4 already passed at `0d4d17b`. They assert that the source itself, archived Cash targets, a card source with a Cash line and another user's account stay rejected, and that the engines agree on a ledger with transfers. These held before F-11, so they are regression guards, not failing-first evidence.
- The API half of TEST-11.4 failed at `0d4d17b` in its setup (the first transfer was rejected), not on the summary. A mutation check shows it checks the summary itself: with the summary query counting lines to Cash accounts as expense, TEST-11.4 fails (`income/expense` no longer match `3,000,000 / 120,000`). The file was restored from a saved copy; the run is not a commit.
- TEST-11.8 (E2E) was added with the form in `5b1ceeb`. Its first run exposed a contract error: f-11 1.0's Receive step moved 200.00 THB from Bank into Wallet, but its expected result needed the opposite direction. f-11 1.1 (`8a40972`) corrects the step before the test was committed; the expected balances are unchanged (Sprint 2 README §6).

**Existing tests changed with the matrix (f-05 1.4, f-06 1.4, f-11 1.1 §2.4).**

- In `3114e9d`: TEST-05.13 (API) loses its Wallet case, now accepted in TEST-11.1; TEST-06.11 (API) loses its Wallet case, now accepted in TEST-11.2. The unit pair tables of TEST-05.13 and TEST-06.11 now accept Cash → Cash on both forms; every pair is still asserted.
- In `5b1ceeb`: F-10 TEST-10.10's exact target-group lists end with **Transfer to** and **Transfer from**, as f-10 §2.2 specifies.

| AC | TEST | Level | Test file | Result |
|---|---|---|---|---|
| AC-11.1 | TEST-11.1 | U, A | `tests/unit/transfers.rules.test.ts`, `tests/api/transfers.api.test.ts` | PASS; failing-first `0d4d17b` |
| AC-11.2 | TEST-11.2 | U, A | `tests/unit/transfers.rules.test.ts`, `tests/api/transfers.api.test.ts` | PASS; failing-first `0d4d17b` |
| AC-11.3 | TEST-11.3 | A | `tests/api/transfers.api.test.ts` | PASS; failing-first `0d4d17b` |
| AC-11.4 | TEST-11.4 | U, A | `tests/unit/transfers.rules.test.ts`, `tests/api/transfers.api.test.ts` | PASS; API failing-first `0d4d17b` (in setup) and the mutation check above; unit is a regression guard |
| AC-11.5 | TEST-11.5 | U, A | `tests/unit/transfers.rules.test.ts`, `tests/api/transfers.api.test.ts` | PASS; regression guard (passed before F-11) |
| AC-11.6 | TEST-11.6 | A | `tests/api/transfers.api.test.ts` | PASS; regression guard (passed before F-11) |
| AC-11.7 | TEST-11.7 | A | `tests/api/transfers.api.test.ts` | PASS; failing-first `0d4d17b` |
| AC-11.8 | TEST-11.8 | E | `tests/e2e/transfers.spec.ts` | PASS locally (step as corrected in f-11 1.1) |

**Status:** at the time of writing, F-11 is implemented on its branch and all eight ACs pass locally. It is not yet reviewed, merged into `sprint-2-staging` or released. The statuses and the tested commit are updated when it merges.

### F-12 Opening balance management (contract 1.1, Issue #59)

**Tested version:** branch `feature/F-12-opening-balance-management` from `sprint-2-staging` at `df027a3` (merge of PR #68, F-11). Failing-test commit `dcf8042`; implementation commits `3ef345b` (both endpoints) and `46e2d27` (Dashboard actions and dialogs); review defect red `5d60992`, green `ec3dde5` (below). `npm run verify` on `ec3dde5` (Docker `app` container stopped, so E2E used this branch's server): lint and both type-checks clean, 182 unit and API tests passed, 0 failed, 0 skipped (21 files), service-layer line coverage 98.99%, build succeeded, 27 E2E tests passed, 0 failed, 0 skipped. CI runs on the PR.

**Failing-first.** At `dcf8042`, on the pre-change code, `PATCH /accounts/:id/opening-balance` and `POST /accounts/:id/opening-balance/void` did not exist, so every new API test failed with 404 where 200 or 400 was expected, and the NFR-02 route list (TEST-01.7) missed both routes. TEST-12.2, TEST-12.4 and TEST-12.6 open with an owner control that must return 200, so their expected 400 and 404 results cannot pass against a missing route. Two disclosures:

- A missing route shows the tests reach the endpoints, not that each rule is enforced, so the DoD's three rule ACs also have mutation checks below.
- TEST-12.7 (E2E) was added with the Dashboard actions in `46e2d27`, not before it. The DoD asks failing-first evidence for the rules (AC-12.1, 12.3, 12.5), which the API tests carry.

**Mutation checks.** Each rule in `opening-balance.service.ts` was replaced, the matching test was run, and the file was restored from a saved copy. These runs are not commits.

| AC | Rule replaced | Result |
|---|---|---|
| AC-12.1 | Correcting voids the opening balance and inserts a new row instead of updating it in place | TEST-12.1 FAIL: the returned transaction is not the original id |
| AC-12.3 | Removing deletes the row instead of voiding it (D-04) | TEST-12.3 FAIL: `No Transaction found` for the original id |
| AC-12.5 | The archived-account check skipped | TEST-12.5 FAIL: `expected 200 to be 400` |

| AC | TEST | Level | Test file | Result |
|---|---|---|---|---|
| AC-12.1 | TEST-12.1 | A | `tests/api/opening-balance-management.api.test.ts` | PASS; failing-first `dcf8042` and the mutation check above |
| AC-12.2 | TEST-12.2 | A | `tests/api/opening-balance-management.api.test.ts` | PASS; failing-first `dcf8042` (owner control) |
| AC-12.3 | TEST-12.3 | A | `tests/api/opening-balance-management.api.test.ts` | PASS; failing-first `dcf8042` and the mutation check above |
| AC-12.4 | TEST-12.4 | A | `tests/api/opening-balance-management.api.test.ts` | PASS; failing-first `dcf8042` (owner control) |
| AC-12.5 | TEST-12.5 | A | `tests/api/opening-balance-management.api.test.ts` | PASS; failing-first `dcf8042` and the mutation check above |
| AC-12.6 | TEST-12.6; NFR-02 route list in TEST-01.7 | A | `tests/api/opening-balance-management.api.test.ts`, `tests/api/auth.api.test.ts` | PASS; failing-first `dcf8042` (owner control, route list) |
| AC-12.7 | TEST-12.7 | E | `tests/e2e/opening-balance-management.spec.ts` | PASS locally, including the PR #69 review case below |

The f-12 §5 DoD checks are the untagged tests "two parallel removes of the same opening balance give one 200 and one 404" and "the NFR-03 invariant holds after a corrected and a removed opening balance" in the same API file; both pass and both failed at `dcf8042`.

**PR #69 review defect (f-12 §2.2).** In the edit dialog, Save compared the raw amount text with the pre-filled `50000.00`, while the request compared parsed satang, so retyping the same amount as `50000` enabled Save and sent `PATCH {}` (400 and a banner). Red `5d60992`: TEST-12.7 types `50000`, `50,000.00` and `50000.0` and expects Save to stay disabled and no PATCH after Enter; it failed on `46e2d27` with Save enabled for `50000`. Green `ec3dde5`: "unchanged" compares the parsed amount and the date, disables Save and stops submit, so a request always names a changed field.

**F-13 PR #70 review defect (f-12 1.1).** With F-13, history and detail return voided rows and mark a transaction "Edited" when `updatedAt` is later than `createdAt`. The remove let Prisma's `@updatedAt` move `updated_at`, so a removed opening balance that was never corrected showed both "Voided on" and "Edited". Contract `9c9b9b1` (f-12 1.1, traceability v2.4); red `542c290`: TEST-12.3 failed with `expected 1795723472184 to be 1795723472178` on the `updatedAt` check; green `e2b78bc`: the remove writes the saved `updated_at`, as the F-13 void does. Fixed on the F-13 branch, after F-12 was merged.

**Status:** at the time of writing, F-12 is implemented on its branch and all seven ACs pass locally. It is not yet reviewed, merged into `sprint-2-staging` or released. The statuses and the tested commit are updated when it merges.

### F-13 Edit and void transactions (contract 1.1, Issue #61)

**Tested version:** branch `feature/F-13-edit-void` from `sprint-2-staging` at `df027a3` (merge of PR #68, F-11), so edits are checked against the Sprint 2 matrix (F-10 and F-11 merged first). Contract revision `3567cdb` (f-13 1.1, f-07 1.3, traceability v2.3); failing-test commit `972b5df`; implementation commit `49a8d81`, where `npm run verify` passed (190 unit and API tests, 31 E2E). F-12 (PR #69) merged into `sprint-2-staging` meanwhile, and `40fc961` merges it into this branch (merged rather than rebased, so the commits above stay valid; conflicts only in the NFR-02 route list, System-Level SDS §3 and §5, and this section). `npm run verify` on `40fc961` (Docker `app` container stopped, so E2E used this branch's server): lint and both type-checks clean, 198 unit and API tests passed, 0 failed, 0 skipped (23 files), service-layer line coverage 98.71%, build succeeded, 32 E2E tests passed, 0 failed, 0 skipped. CI runs on the PR. After the PR #70 review: the F-12 fix above (`9c9b9b1`, `542c290`, `e2b78bc`) and `617a8b7`, where the edit form's date picker keeps `min` at T−90 and still shows a saved older date. `npm run verify` on `617a8b7`: lint and both type-checks clean, 198 unit and API tests passed, 0 failed, 0 skipped (23 files), service-layer line coverage 98.71%, build succeeded, 32 E2E tests passed, 0 failed, 0 skipped.

**Failing-first.** At `972b5df`, on the pre-change code, every API test in `tests/api/edit-void.api.test.ts` failed because neither endpoint existed (404 where 200, 400, 403 or 409 was expected): TEST-13.1 to 13.8, plus the f-13 1.1 `updatedAt`/`createdAt` check and the malformed or unknown id check. TEST-13.3 and TEST-13.4 (unit) failed with `checkTransactionVersion is not a function`. TEST-01.7 failed because its route list expects both endpoints. All five E2E tests failed with the Edit and Void controls missing. Three disclosures:

- TEST-13.9 (unit) already passed at `972b5df`: the balance engine skipped voided rows and read whatever lines are stored before F-13, so it is a regression guard. The API half of TEST-13.9 failed in its setup (the edit returned 404), not on the invariant.
- In TEST-13.8, Bob's 404 matched at `972b5df` only because the route was missing; the test failed on the Administrator's expected 403. At `49a8d81` the 404 comes from the ownership check.
- TEST-13.10 changed in `49a8d81`: at 360 px the line input is below the fold, so the test now scrolls it into view before checking it is in the viewport. The no-horizontal-overflow check is unchanged.

**Existing tests changed with the history query (f-07 1.2, 1.3; f-13 §2.4).** In `49a8d81`, as listed in f-13 §2.4: TEST-07.1 (`total: 5`, the voided payment first with `voidedAt` set), TEST-07.2 (`total: 5`, items card charge and salary), TEST-07.3 (`voidedAt: null`; `ITEM_KEYS` gains `voidedAt`, `createdAt` and `updatedAt`), the past-the-end page (`total: 5`), the renamed "a voided transaction is returned by id, marked as voided (f-07 1.2)", and the index test's `EXPLAIN` without the voided filter (still `transactions_user_id_txn_date_created_at_idx`). The F-05 and F-06 tests pass unchanged on the shared validator.

| AC | TEST | Level | Test file | Result |
|---|---|---|---|---|
| AC-13.1 | TEST-13.1 | A | `tests/api/edit-void.api.test.ts` | PASS; failing-first `972b5df` |
| AC-13.2 | TEST-13.2 | A | `tests/api/edit-void.api.test.ts` | PASS; failing-first `972b5df` |
| AC-13.3 | TEST-13.3 | U, A | `tests/unit/edit-void.rules.test.ts`, `tests/api/edit-void.api.test.ts` | PASS; failing-first `972b5df` |
| AC-13.4 | TEST-13.4 | U, A | `tests/unit/edit-void.rules.test.ts`, `tests/api/edit-void.api.test.ts` | PASS; failing-first `972b5df` |
| AC-13.5 | TEST-13.5 | A | `tests/api/edit-void.api.test.ts` | PASS; failing-first `972b5df` |
| AC-13.6 | TEST-13.6 | A | `tests/api/edit-void.api.test.ts` | PASS; failing-first `972b5df` |
| AC-13.7 | TEST-13.7 | A | `tests/api/edit-void.api.test.ts` | PASS; failing-first `972b5df` |
| AC-13.8 | TEST-13.8 | A | `tests/api/edit-void.api.test.ts` | PASS; failing-first `972b5df` (on the Administrator case) |
| AC-13.9 | TEST-13.9 | U, A | `tests/unit/edit-void.rules.test.ts`, `tests/api/edit-void.api.test.ts` | PASS; API failing-first `972b5df` (in setup); unit is a regression guard |
| AC-13.10 | TEST-13.10 | E | `tests/e2e/edit-void.spec.ts` | PASS locally; failing-first `972b5df` |

**Status:** at the time of writing, F-13 is implemented on its branch and all ten ACs pass locally. It includes F-12 through the merge `40fc961`. It is not yet reviewed, merged into `sprint-2-staging` or released. The statuses and the tested commit are updated when it merges.
