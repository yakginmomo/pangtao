# Part A — Sprint 1 continuity and change status

**CPE 334 Project Deliverable 2 · Sprint 2 completion and Sprint 3 progress**

| Item | Value |
|---|---|
| Team | ผิงโหด: Chawin (67070501012), Supichaya (67070501087) |
| Theme | Theme 7 — Personal Money and Expense Logging System (Pangtao) |
| Repository | https://github.com/yakginmomo/pangtao |
| Accepted Sprint 1 tag | **`v0.1.0` = `bec5575c3ce434b4b1eac0899e734e513e672d9f`** (13 Nov 2026, release PR #20) |
| Sprint 1 release accepted by the Lab 6 UAT Team | **`64c98f4fcd293fb67f0d32b1db75943dfbf2c749`** (17 Nov 2026) = `v0.1.0` plus Lab 5 delivery changes; 8 of 8 UAT cases PASS on 22 Nov 2026 |
| Assessed candidate | **`cad7d9d8fdccbe66573e515308470c315a5b183c`** (`main`, merge of PR #55, 26 Nov 2026 21:00 Bangkok) |
| Candidate deployment | Deploy demo run [45834624485](https://github.com/yakginmomo/pangtao/actions/runs/45834624485) on `cad7d9d`, success; all four CI jobs, migration, deploy and public smoke test passed. Cloud Run revision **`pangtao-00010-hl7`**, serving 100% of traffic from 26 Nov 2026 21:04:59 Bangkok (deploy log of that run). `GET /api/v1/health` returned 200 `{"status":"ok"}` on 26 Nov 2026 21:16 Bangkok |
| Continuity verification date | 26 Nov 2026, 21:13–21:18 Bangkok |
| Evidence package | [evidence/part-a](evidence/part-a/README.md): scripts, recorded output, reset SQL and an excerpt of the `npm run verify` output |
| Time zone | All times are Asia/Bangkok (UTC+7) unless marked otherwise |
| Related documents | [Sprint 1 contracts](../sprint-1/README.md) · [Sprint 1 UAT and findings](../../labs/lab-06/uat.md) · [Lab 7 change impact](../../labs/lab-07/change-impact.md) · [Lab 7 readiness](../../labs/lab-07/readiness.md) · [SRS](../../srs.md) · [Traceability](../../traceability.md) |

This document is the Part A record for Deliverable 2. It identifies the accepted Sprint 1 release, shows the original critical domain journey working on the current candidate, registers the deployment, UAT and maintenance findings that affect the baseline, and records the approved baseline revisions with their rationale. Execution evidence is quoted with the commit it was run on.

> **Versioning rule.** The candidate moves as Sprint 2 and Sprint 3 work lands. Part A is re-run with the same commands and the same acceptance criteria on the final candidate commit before submission; the commit, counts and revision in this header are replaced by the final values, and this paragraph is removed only when the final run is recorded. The current record is honest about its assessed commit and does not claim later work.

---

## 1. Accepted Sprint 1 release and lineage

### 1.1 Identification

The Sprint 1 acceptance has two identifiers, and they are not the same commit:

| Role | Commit | Date | Meaning |
|---|---|---|---|
| **Sprint 1 release tag** | `v0.1.0` = `bec5575` | 13 Nov 2026 20:33 Bangkok | Release PR #20 merged `sprint-1-staging` into `main`. It contains F-01 to F-08 with their contracts, tests and deployment-free local verification. |
| **Sprint 1 release accepted in UAT** | `64c98f4` | 17 Nov 2026 23:27 Bangkok | `v0.1.0` plus the Lab 5 delivery work (container, CI, Cloud Run, database-backed login limit, connection wait, visible release marker). The Lab 6 UAT Team accepted this release on 22 Nov 2026: UAT-01 to UAT-08 all PASS, 0 FAIL, 0 BLOCKED, Cloud Run revision `pangtao-00006-cjx` (`uat.md` §7). |

`v0.1.0` is an ancestor of the candidate; this was checked with `git merge-base --is-ancestor v0.1.0 cad7d9d`, which exits 0. The tag is not moved or re-pointed: later releases add commits on top of it.

The Lab 6 acceptance record is explicit that the UAT Team's label "`v0.1.0`" refers to the deployed `64c98f4`, not to the tagged `bec5575` (`uat.md` §7.3). This document keeps that distinction.

### 1.2 Lineage from the tag to the candidate

| Commit | Date (Bangkok) | PR / trigger | What it changes | Class |
|---|---|---|---|---|
| `bec5575` (`v0.1.0`) | 13 Nov | #20 | Sprint 1 release: F-01 to F-08 | Release baseline |
| `64c98f4` | 17 Nov | #29, #32–#36, #38–#40 | Lab 5: container image, CI gate, deploy workflow, database-backed login limit, 5 s connection wait, login subtitle marker | Delivery and reliability |
| `41bb484` | 25 Nov | #47, #48 | CE-F-01 fix: allocation lines must sum exactly to the total | Defect fix |
| `2dc3dc1` | 25 Nov | #50–#52 | BR-10 v2.0: 90-day backdate limit for Payments and Receipts | Approved change |
| `4650670` | 26 Nov | #53, #54 | Lab 7 metrics and readiness documents | Documentation |
| `cad7d9d` | 26 Nov | #55 | Lab 7 documentation merged into `main`; deployed by run `45834624485` | Documentation and candidate |

`git diff --stat 2dc3dc1 cad7d9d -- server web prisma tests` is empty: the deployed application code and tests at the candidate are identical to the Lab 7 release. The only committed differences are documentation. The working tree used for the 26 Nov run carried one unrelated local `.gitignore` edit; `git diff cad7d9d -- server web prisma tests` was empty, so no product or test file differed from the candidate.

At this commit, `main` contains **no Sprint 2 feature code**. Sprint 2 contracts and implementation are added later on `sprint-2-staging`; Part A is re-run on the final candidate after that merge (see §5).

---

## 2. The original critical domain journey on the candidate

### 2.1 Journey under test

The Sprint 1 critical journey is the one promised in `docs/sprints/plan.md` §2 and exercised by UAT-03, with the rule-rejection and access checks of UAT-04, UAT-06 and UAT-07:

1. Alice logs in; the Dashboard shows her nine seeded accounts at 0.00 ฿.
2. Alice records a **50,000.00 ฿ opening balance** on Bank Account.
3. Alice receives a **30,000.00 ฿ salary** into Bank Account, allocated to Salary.
4. Alice charges **1,200.00 ฿ to the Credit Card**, split Dining 700.00 + Groceries 500.00.
5. Alice repays **800.00 ฿** from Bank Account to the Credit Card.
6. Balances are Bank Account **79,200.00 ฿**, Credit Card debt **400.00 ฿**; the income–expense summary shows Income **30,000.00 ฿**, Expenses **1,200.00 ฿**, Net **28,800.00 ฿** (all four transactions are dated today, so the day and the month to date give the same totals; see the A6 note in §2.3); History shows four transactions, newest first, with the split lines and detail page.
7. Rejection: a payment whose lines sum below its total is refused with `400 INVALID_ALLOCATION_SUM`, and every balance and row count is unchanged.
8. Access: Bob cannot read Alice's transaction (**404**), the Administrator cannot read financial accounts (**403**), and an anonymous caller cannot read history (**401**).

### 2.2 Automated verification on the candidate

Commands and results on the candidate tree, 26 Nov 2026 21:14–21:16 Bangkok, PostgreSQL 16 in Docker, Node v25.5.0 locally (CI uses Node 22):

```
$ npm run verify
> lint      eslint . --max-warnings=0                       # clean, 0 warnings
> typecheck tsc --noEmit (server, web)                      # clean
> test:coverage vitest run --coverage
  Test Files  14 passed (14)
       Tests  137 passed (137)       0 failed, 0 skipped
  service-layer line coverage 99.02% (gate 80%)
> build     tsc && vite build                               # succeeded
> test:e2e  playwright test
  20 passed (46.8s)                  0 failed, 0 skipped, 0 flaky
```

The same commit passed the same four checks in CI on the deploy run: **Deploy demo `45834624485`** (`cad7d9d`) — Lint/type-check/build, Unit and API tests, End-to-end tests, Docker image build, then migration, Cloud Run deploy and the public smoke test, all successful. This ties the local result to the deployed candidate rather than to an uncommitted tree.

An excerpt of the output, including the per-file coverage table and the twenty E2E test names, is in [`evidence/part-a/verify-output.txt`](evidence/part-a/verify-output.txt).

### 2.3 Scripted journey on the running candidate

The scripted run drove the real HTTP API against the candidate server and the real PostgreSQL database. It used the seeded synthetic users; no production data and no real credentials are in this document. The script is [`evidence/part-a/continuity-journey.mjs`](evidence/part-a/continuity-journey.mjs), its recorded output is [`continuity-journey-output.json`](evidence/part-a/continuity-journey-output.json), and the reset and run commands are in [`evidence/part-a/README.md`](evidence/part-a/README.md). All 15 checks passed:

| Step | Call | Expected | Actual | Result |
|---|---|---|---|---|
| A1 | `POST /api/v1/accounts/{Bank}/opening-balance` 5,000,000 satang | 201 | 201 | PASS |
| A2 | `POST /api/v1/transactions` receipt 3,000,000 satang → Salary | 201 | 201 | PASS |
| A3 | `POST /api/v1/transactions` card charge 120,000 satang (Dining 70,000 + Groceries 50,000) | 201 | 201 | PASS |
| A4 | `POST /api/v1/transactions` repayment 80,000 satang → Credit Card | 201 | 201 | PASS |
| A5 | `GET /api/v1/accounts` | Bank 7,920,000; Credit Card 40,000 satang | Bank 7,920,000; Credit Card 40,000 | PASS |
| A6 | `GET /api/v1/summary/income-expense?from=today&to=today` | income 3,000,000; expense 120,000; net 2,880,000 | 3,000,000 / 120,000 / 2,880,000 | PASS |
| A7 | `GET /api/v1/transactions` | 4 rows | 4 rows | PASS |
| A8 | Under-allocated payment (total 100,000; one line 60,000) | 400 `INVALID_ALLOCATION_SUM` | 400 `INVALID_ALLOCATION_SUM` | PASS |
| A9 | Row count before and after A8 | 4 and 4 | 4 and 4 | PASS |
| A10 | Payment dated tomorrow | 400 `FUTURE_DATE_NOT_ALLOWED` | 400 `FUTURE_DATE_NOT_ALLOWED` | PASS |
| A11 | Payment dated T−91 | 400 `DATE_TOO_OLD` | 400 `DATE_TOO_OLD` | PASS |
| A12 | Bob reads Alice's transaction | 404 `NOT_FOUND` | 404 `NOT_FOUND` | PASS |
| A13 | Administrator reads accounts | 403 `FORBIDDEN` | 403 `FORBIDDEN` | PASS |
| A14 | Anonymous reads history | 401 `UNAUTHENTICATED` | 401 `UNAUTHENTICATED` | PASS |
| A15 | Alice re-logs in and reads the transaction detail | 200, same id | 200, `0a7a5e95-3ed6-4173-a6a4-8f28874aefb9` | PASS |

**Notes on A6 and A9 in the recorded run.** A6 queried a single day (`from = to = today`), although the recorded JSON labels it "month summary". It is a day check, and it equals the month-to-date figure only because every journey row is dated today. A9 compared the count before and after A8 with each other; the recorded values are 4 and 4, so a direct check of 4 is also met. The script has since been corrected to query the 1st of the month to today and to assert the count of 4 directly; the A-R1 re-run (§5) records output from the corrected script. The recorded 26 Nov output is not edited.

Key excerpt from the recorded JSON (full A1–A15 output in [`continuity-journey-output.json`](evidence/part-a/continuity-journey-output.json)):

```json
{"id":"A5 balances after journey (satang)","expected":{"Bank":7920000,"Card":40000},"actual":{"Bank":7920000,"Card":40000},"pass":true}
{"id":"A6 month summary (satang)","expected":{"income":3000000,"expense":120000,"net":2880000},"actual":{"income":3000000,"expense":120000,"net":2880000},"pass":true}
{"id":"A8 under-allocated payment rejected","expected":400,"actual":400,"code":"INVALID_ALLOCATION_SUM","pass":true}
{"id":"A9 nothing saved after rejection","expected":4,"actual":4,"pass":true}
{"id":"A15 detail after re-login","pass":true}
```

### 2.4 Persistence across a process restart

After completing the journey, the server process was stopped and started again. A new login then read the saved ledger with [`persistence-read.mjs`](evidence/part-a/persistence-read.mjs); the recorded output is [`persistence-output.json`](evidence/part-a/persistence-output.json):

```json
{
  "loginStatus": 200,
  "detailStatus": 200,
  "transaction": {"id": "0a7a5e95-3ed6-4173-a6a4-8f28874aefb9", "kind": "PAYMENT", "totalAmount": 80000, "memo": "Sprint 1 continuity repayment", "lines": 1},
  "balances": {"Bank Account": 7920000, "Wallet": 0, "Credit Card": 40000, "Interest Earned": 0, "Salary": 3000000, "Dining": 70000, "Electricity": 0, "Groceries": 50000, "Telecom": 0}
}
```

This shows the journey's rows were persisted in PostgreSQL, not held in memory, and that balances are still derived correctly after restart. The local development database was reset to the seeded state after the run.

### 2.5 UI-level coverage of the same journey

The Playwright suite runs the journeys through the browser on the candidate. The tests that carry the critical path:

| Journey part | Test ID / name | File | Result |
|---|---|---|---|
| Login, role landing, logout, route guard | TEST-01.14 (AC-01.14) | `tests/e2e/auth.spec.ts` | PASS |
| Dashboard groups and derived balances | TEST-03.6 (AC-03.6) | `tests/e2e/dashboard.spec.ts` | PASS |
| Opening balance dialog, validation, 360 px | F-04 extra E2E (f-04 §2.2) | `tests/e2e/opening-balance.spec.ts` | PASS |
| Archived accounts are not offered an opening | TEST-04.10 (AC-04.10) | `tests/e2e/opening-balance.spec.ts` | PASS |
| Salary receipt with live allocation | TEST-06.8 (AC-06.8) | `tests/e2e/transactions.spec.ts` | PASS |
| Multi-line card charge raises debt | TEST-05.9 (AC-05.9) | `tests/e2e/transactions.spec.ts` | PASS |
| Over-allocation blocks Save | f-05 §2.2 case | `tests/e2e/transactions.spec.ts` | PASS |
| History list, empty state, detail page | TEST-07.6, TEST-07.9, detail case | `tests/e2e/transaction-history.spec.ts` | PASS |
| Summary totals, widget refresh, custom range | TEST-08.7 and f-08 §2.2/§1 cases | `tests/e2e/summary.spec.ts` | PASS |
| Administrator user management and session revocation | TEST-02.8, TEST-02.4 | `tests/e2e/admin-users.spec.ts` | PASS |

The card repayment is covered at API level by TEST-05.3 (`tests/api/transactions.api.test.ts`); the UI suite does not have a separate repayment-only spec. This is disclosed rather than implied.

### 2.6 Deployed continuity

- The candidate is deployed: Deploy demo run `45834624485` on `cad7d9d` passed the four CI jobs, the migration job and the smoke test; its deploy log shows revision `pangtao-00010-hl7` serving 100% of traffic from 21:04:59 on 26 Nov 2026, and the public URL returned 200 at 21:16.
- The Lab 7 post-deploy checks PD-1 to PD-6 on `2dc3dc1` / `pangtao-00009-cwz` — whose application code is identical to the candidate — confirmed on the deployed revision: T−91 rejected (`DATE_TOO_OLD`), T−90 accepted, another user's transaction read as 404, another user's account write at T−91 as 404 (not 400), Administrator denied 403, anonymous 401 (`change-impact.md` §5 step 7).
- Lab 6 UAT was accepted on `64c98f4`, not on the candidate. No partner UAT has been run on the candidate; that re-run is planned for Part E and is listed as a remaining action (§5). This document does not claim UAT coverage on the candidate.

### 2.7 Behaviour that changed intentionally, and why continuity still holds

| Change | Effect on the Sprint 1 journey | Why the journey still passes |
|---|---|---|
| BR-10 v2.0: Payment/Receipt dates must be within T−90 to T | An old date that Sprint 1 accepted is now rejected with `DATE_TOO_OLD` | The critical journey and the Lab 6 UAT use today or the first of the current month; rows older than 90 days already saved remain readable and are still counted. A11 verifies the new boundary on the candidate. |
| CE-F-01 fix: lines must sum exactly to the total | An under-allocated payment is now rejected | This restores the contracted BR-05/AC-05.4 behaviour; the Sprint 1 release already behaved this way. A8 and A9 verify it. |
| Database-backed login limit (F-01 v1.5) | The rule is unchanged; the counter survives restarts and instances | The endpoint behaviour, key (client IP + email) and 429 response are unchanged; the AC-01.12 tests pass. |
| 5 s connection wait | A save that met a briefly busy pool no longer fails with a server error | No observable rule changed; the A1–A4 writes pass. |

---

## 3. Change and defect register

Every finding that affects the accepted baseline is listed, including ones judged not to be product defects. Statuses are as at 26 Nov 2026; "resolved" is only used where a fix or decision has been verified.

### 3.1 Product, UAT and approved-change register

| ID | Source and date | Affected requirement / feature | Accepted decision | Status | Fix / change release | Re-test outcome |
|---|---|---|---|---|---|---|
| **UATF-01** | Lab 6 UAT Team (ปลวกแดง), UAT-02 step 3, 22 Nov 2026; sent through the agreed channel | AC-04.1, UAT-02 starting state, F-04; handoff §4.1 | Accepted as a defect against the **handoff**, not the product: Alice still held opening balances from 18 Nov because the reset was not run. The 409 `OPENING_BALANCE_EXISTS` response was correct. No code change. | **Closed** 22 Nov 2026 | None. The §4.1 reset SQL was run on the deployed database before the retest. | **PASS.** UAT-01 to UAT-08 re-run on the reset database, 22 Nov 21:35–21:40, 8/8 PASS (`uat.md` §7.3). |
| **CE-F-01** (#46) | Partner UAT controlled exercise on `pangtao-00010-ges`, reported 24 Nov 2026; Issue opened 25 Nov 14:21 Bangkok | BR-05, AC-05.4, F-05 | Accepted defect (Major): a payment whose lines summed below the total was saved, leaving money unaccounted for. The defect had been reintroduced deliberately in PR #45 to test the UAT process; the accepted release was not affected. Restore the exact-sum rule. | **Fixed and released**; Issue #46 closed 25 Nov 19:11 | Red `d082577`, green `adc801b`, PR #47; released by PR #48 as `41bb484` (revision `pangtao-00008-dfl`) and present in `2dc3dc1` and the candidate | **Automated PASS, independent UAT retest outstanding.** TEST-05.4, including the new under-allocation case, passes in the 137-test suite on the candidate; the UAT Team has not yet re-run UAT-04 on a fixed revision (Part E / remaining action **R-3**). |
| **CHG-01** (#49) | Lab 7 change request, 25 Nov 2026 19:11 | BR-10 v2.0; F-05 1.3, F-06 1.3; F-04 1.2 (wording only) | Accepted: a Payment or Receipt may not be dated more than 90 days before today (Bangkok); T−90 accepted, T−91 rejected with 400 `DATE_TOO_OLD`; opening balances, summaries, history and already-saved rows unchanged. Contract revised and reviewed **before** code. | **Implemented and released**; Issue #49 closed 26 Nov 19:42 Bangkok (12:42 UTC) | Contract `fcbd92f`, PR #50; red `676e90c`; implementation `5b16bc7`, PR #51; released by PR #52 as `2dc3dc1` (revision `pangtao-00009-cwz`) | **PASS.** TEST-05.14 (U, A), TEST-05.15 (E), TEST-06.12 (A) pass; PD-1 T−91 → 400, PD-2 T−90 → 201, PD-4 cross-user at T−91 → 404 on the deployed revision; A11 re-checks it on the candidate. |
| **L7-01** | Lab 7 readiness review, 26 Nov 2026 | AC-05.15, BR-10, F-05 (web date picker) | Accepted as a **documented known limitation**: the picker's `min`/`max` are computed when the form renders. A form left open across Bangkok midnight offers yesterday's window until any input changes. The submit check and the server compute the window at use, so no wrong date can be saved. Committed Sprint 2 fix: owner Chawin, due 29 Nov 2026. | **Open — fix committed for Sprint 2** | No fix yet; no code change | **Not applicable as a save defect:** a T−91 typed date still shows the field error and the server returns `DATE_TOO_OLD`; verified by TEST-05.14/TEST-05.15. Fix, test and re-test due 29 Nov 2026 (Chawin), before the Deliverable 2 submission. |

### 3.2 Deployment, verification and maintenance register

| ID | Source and date | Affected requirement / feature | Accepted decision | Status | Fix / change release | Re-test outcome |
|---|---|---|---|---|---|---|
| **DEP-01** | Lab 5 cloud-readiness review (R-04), 14 Nov 2026 | NFR-10, AC-01.12, F-01 | Accepted: move the failed-login counter from process memory to PostgreSQL (`login_attempts`), because Cloud Run restarts containers and may run several instances. The rule and the key (client IP + email) are unchanged. | **Resolved** | Migration `20261114044417_login_attempts`; red `9e5398a`; fixes `f25fbc1`, `915a37c`, `d4d756a`; PR #29; in `64c98f4` and the candidate | **PASS.** AC-01.12 proxy, restart, expiry and successful-login-reset cases pass; UAT-01 passed on the deployed release; the local 137-test suite passes on the candidate. |
| **DEP-02** | Lab 5 cloud-readiness review, 14 Nov 2026 | NFR-10, AC-01.12, F-01 | Accepted: take the client IP from `X-Forwarded-For` only when `TRUST_PROXY` is set; ignore it otherwise, so a client cannot forge a fresh quota. | **Resolved** | Same PR #29 and release as DEP-01 | **PASS.** AC-01.12 "behind a trusted proxy" and "without TRUST_PROXY" tests pass; Lab 7 PD checks exercised the cloud path. |
| **DEP-03** | Lab 5 #24 CI failures (Prisma P2028), 15 Nov 2026 | NFR-06, FR-12, FR-13, F-05/F-06 save path | Accepted: interactive transactions wait up to 5 s for a pooled connection instead of failing after 2 s; reproduce with a one-connection pool test. | **Resolved** | Red `99ee514`, fix `898b62e`; PR #33; in `64c98f4` and the candidate | **PASS.** `tests/api/transaction-wait.api.test.ts` passes; no P2028 failure in the 26 Nov run. |
| **DEP-04** | Lab 5 first real GCP run (#25), 15–16 Nov 2026 | F-19; NFR-06; release pipeline | Accepted: make release re-runs and the migrate/seed split interruption-safe — migrations run on every release, seeding only once, so a release cannot undo an Administrator's disable action. | **Resolved** | `5dc9cf1`, `d2a8c15`, `4bc7d06`; PR #35; pipeline used by every later release | **PASS.** Deploy runs `45637417725` (`2dc3dc1`) and `45834624485` (`cad7d9d`) both completed migration and deploy successfully; repeated deploys are the normal path. |
| **DEP-05** (R-1) | Lab 7 readiness review, 26 Nov 2026 | NFR-06; deployment exposure of CE-F-01 (`BR-05`) | Accepted as a release blocker while it existed: the `exercise` traffic tag publicly routed to revision `pangtao-00010-ges`, which contained the deliberately injected Major defect. Remove the tag; keep the revision at 0% traffic for Lab 6 grading and delete it afterwards. | **Resolved** 26 Nov 2026 09:17 Bangkok | `gcloud run services update-traffic pangtao --remove-tags exercise`; no code change | **PASS at 09:17 Bangkok:** `gcloud run services describe` showed only `pangtao-00009-cwz` at 100% and no tag; the tag URL returned 404; the production URL returned 200. **Superseded at 21:04:59 Bangkok** by the candidate deploy (run `45834624485`), whose log shows `pangtao-00010-hl7` serving 100% of traffic, so the exercise revision `pangtao-00010-ges` receives no traffic. `pangtao-00010-hl7` (live) and `pangtao-00010-ges` (exercise) share the `00010` number; always use the full name. |
| **OPS-01** (TD-2) | Lab 5/7 deployment review, 26 Nov 2026 | NFR-06, F-19; deploy verification | Accepted limitation: the deploy smoke test skips its login check because `SMOKE_EMAIL` / `SMOKE_PASSWORD` are not set in the `demo` environment. Authenticated paths are checked manually and by the CI E2E job. | **Open — accepted limitation**; add before Final Delivery (R-4) | No code change yet | **Partial:** `/api/v1/health` (runs `SELECT 1`) and `/` pass on every deploy; the authenticated smoke path is not automatically checked. Next deploy must show `PASS login`. |
| **OPS-02** (R-5) | Lab 7 post-deploy checks, 26 Nov 2026 | Synthetic data hygiene; Alice's ledger | Accepted: PD-2 left one 1.00 ฿ synthetic Payment (memo "LAB7 post-deploy check") in the production ledger. Run the UAT reset before the next session. No product defect. | **Open — housekeeping** | None; reset procedure (`uat.md` §4.1) | Not yet re-checked; reset scheduled before the next UAT or demo session. |
| **OPS-03** (R-2) | Lab 7 readiness review (R-2), 26 Nov 2026 | Process / traceability of the BR-10 change | Accepted: an Issue must be closed after the post-deploy checks, not at merge time. The Issue closure lagged the release by several hours. | **Resolved** 26 Nov 2026 19:42 Bangkok (12:42 UTC) | Issue #49 closed with the release and PD-1 to PD-6 summary; no code change | Verified: #49 is `closed` / `completed`. The process action applies to future releases. |
| **OPS-04** (TD-5) | Lab 7 readiness review, 26 Nov 2026 | Storage cost only; no requirement | Accepted: keep the exercise revision `pangtao-00010-ges` and its image at 0% traffic until Lab 6 grading finishes, then delete them. Do not confuse it with the live candidate revision `pangtao-00010-hl7`. | **Open — low** | No code change | No user-facing path; verified no tag and no traffic (DEP-05). |
| **OPS-05** (TD-6) | Lab 7 readiness review, 26 Nov 2026 | NFR-09, test quality; AC-05.14/06.12 fixtures | Accepted low debt: one test comment still says "fixed calendar date" although the value is relative; a run crossing Bangkok midnight between two T−90 computations could produce a rare false failure. Fix the comment and avoid computing T−90 twice; accept the midnight risk. Owner Supichaya, due 13 Dec 2026. | **Open — low** | No code change yet | **PASS** in the 26 Nov run; no functional impact. |
| **OPS-06** (TD-1) | Lab 7 readiness review, 26 Nov 2026 | BR-10 v2.0; F-05/F-06 date window | Accepted: keep the Bangkok date window implemented once on the server (`date.util.ts`) and once in the web form (`date.ts`). The server is authoritative; a unit test fails if the two windows drift. Revisit only if a shared package is introduced. | **Open — low, accepted** | No code change | The drift-guard unit test passes in the 26 Nov suite; A10 and A11 exercise the server boundary. |
| **OPS-07** (TD-4) | Lab 7 readiness review, 26 Nov 2026 | NFR-06; release pipeline; `deploy/tests/` | Accepted low debt: the offline stub tests for the deploy scripts are not run by `.github/workflows/ci.yml`, so a deploy-script change can break the pipeline without a failing check. Add a CI job before Final Delivery, or record why not. | **Open — low** | No code change yet | Not applicable to product behaviour. Deploy runs `45637417725` and `45834624485` completed the real pipeline successfully with the current scripts. |

**No finding in this register changes a Sprint 1 acceptance criterion's intended behaviour without an approved contract revision.** CHG-01 is the only requirement-level change, and it was reviewed in PR #50 before tests or code.

---

## 4. Approved baseline revisions and rationale

### 4.1 Requirements baseline (SRS and traceability)

The baseline version history is kept in `docs/traceability.md` §2 and `docs/sprints/sprint-1/README.md` §5. Revisions are append-only; no requirement was added or dropped.

| Version | Date | Approval | Change and rationale |
|---|---|---|---|
| v1.0 | 7 Nov 2026 | Team | Initial SRS and traceability baseline: 25 FR, 16 BR, 10 NFR mapped to F-01–F-19. |
| v1.1 | 10 Nov 2026 | PR #10 | F-01: AC-01.9 verification moved to F-07 (TEST-07.4), because no financial record exists before F-05. No AC or requirement removed. |
| v1.2 | 11 Nov 2026 | PR #12 | F-03 creates `accounts`, `transactions` and `allocation_lines` in one migration, because the balance engine and `openingBalance.transactionId` need all three. AC-03.4 wording made explicit for Loan Taken openings. |
| v1.3 | 12 Nov 2026 | PR #13 | System-Level SDS corrected to the code (services call Prisma directly; no separate repository layer); traceability §3 added with actual Sprint 1 test results. FR-08 traced to F-03 and F-08. |
| v1.4 | 13 Nov 2026 | PR #17 | F-07: TEST-07.9 added for the empty and error states already required by AC-07.6; history lists non-voided transactions until F-13. |
| v1.5 | 13 Nov 2026 | PR #18 | F-08: AC-08.1–AC-08.9 verified at unit, API and E2E levels; results recorded. |
| v1.6 | 14 Nov 2026 | PR #29 | F-01 v1.5 (Lab 5 R-04): `login_attempts` table and `TRUST_PROXY`; SDS and traceability updated. This is DEP-01/DEP-02. |
| v1.7 | 15 Nov 2026 | PR #32 | Lab 5 containerization: SDS §7/§8, `APP_PORT`/`GIT_SHA`, NFR-05 evidence. |
| v1.8 | 15 Nov 2026 | PR #33 | Lab 5 CI: four parallel checks, E2E on every PR, 5 s connection wait (DEP-03), NFR-09 evidence. |
| v1.9 | 17 Nov 2026 | PR #40 | Repeatable release: visible login subtitle marker; deployment guide records the public URL and revision checks. |
| v2.0 | 25 Nov 2026 | PR #50 (approved before implementation) | BR-10 revised for the 90-day backdate limit; F-05 1.3/F-06 1.3 add AC-05.14, AC-05.15, AC-06.12; F-04 1.2 is wording only. This is CHG-01. |

### 4.2 Release baselines

| Release | Commit | Date | Scope and rationale |
|---|---|---|---|
| Sprint 1 tag `v0.1.0` | `bec5575` | 13 Nov | F-01 to F-08, contracts and tests; the immutable Deliverable 1 baseline. |
| Sprint 1 UAT-accepted release | `64c98f4` | 17 Nov | `v0.1.0` plus Lab 5 delivery; accepted 8/8 in UAT on 22 Nov. Kept identifiable even though later commits exist. |
| CE-F-01 fix release | `41bb484` | 25 Nov | Restores the BR-05/AC-05.4 exact-allocation rule after the controlled exercise; revision `pangtao-00008-dfl`. |
| Lab 7 release | `2dc3dc1` | 25 Nov | BR-10 v2.0 plus the CE-F-01 fix; revision `pangtao-00009-cwz`; PD-1 to PD-6 passed. |
| Current candidate | `cad7d9d` | 26 Nov | Lab 7 documentation merged; application code and tests identical to `2dc3dc1`; deployed by run `45834624485` as revision `pangtao-00010-hl7`. |

### 4.3 Feature contract versions

| Feature | Version | Rationale recorded in `sprint-1/README.md` §5 |
|---|---|---|
| F-01 | 1.5 | Test routing, CSRF/Origin and Content-Type tightening, error catalogue, database-backed rate limit, `TRUST_PROXY`. |
| F-02 | 1.0 | Admin list, enable/disable, self-protection; no revision. |
| F-03 | 1.1 | Full ledger schema in one migration; invariant wording for Loan Taken openings. |
| F-04 | 1.2 | Archived-account rule (BR-14) and Lab 7 wording: the 90-day limit does not apply to opening balances. |
| F-05 | 1.3 | BR-14 archived source, BR-06 target cases, and BR-10 v2.0 90-day limit with AC-05.14/05.15. |
| F-06 | 1.3 | BR-14 archived receiving account, BR-06 target cases, and BR-10 v2.0 with AC-06.12. |
| F-07 | 1.1 | Empty/error-state E2E test; non-voided history until F-13; real index name. |
| F-08 | 1.0 | Summary totals, presets, invalid range, access; no revision. |

### 4.4 What the revisions did not change

- No FR, BR or NFR was added or removed; the count remains 25 FR, 16 BR, 10 NFR.
- No acceptance criterion or test was removed or weakened by a revision. New AC and TEST IDs were added only where a contracted behaviour had no test — for example AC-04.10, AC-05.12/05.13, AC-06.10/06.11, TEST-07.9, AC-05.14/05.15 and AC-06.12.
- BR-10 is the only requirement-level revision: it tightens a date rule for new Payments and Receipts and explicitly leaves opening balances, summaries, history and existing rows unchanged.
- Every revision above was merged through a reviewed PR; the rationale and the reviewed version are preserved in git history and in the sprint README version table.

---

## 5. Continuity status and remaining actions

**Status: PASS on candidate `cad7d9d`.** The tag `v0.1.0` is an ancestor of the candidate; the original critical journey passes through the UI (20 E2E tests) and through a scripted API/DB run (15/15 checks) with restart persistence; the rule rejection and the ownership/role boundaries behave as contracted; the candidate is deployed as revision `pangtao-00010-hl7` and its health endpoint returns 200. The only intentional behaviour change, BR-10 v2.0, is verified at its boundary and does not affect the journey or the Lab 6 UAT dates.

Remaining actions, with owners and dates:

| ID | Action | Owner | Due | Why it does not block this Part A record |
|---|---|---|---|---|
| **A-R1** | Re-run this Part A verification (`npm run verify`, scripted journey, deploy) on the **final** candidate after Sprint 2 and implemented Sprint 3 work merge; update the commit, counts, revision and dates wherever they appear in this document and re-check every register status | Chawin and Supichaya | Before the 29 Nov 2026 submission | The record is explicitly tied to `cad7d9d`; the rule in the header prevents silent reuse. |
| **R-3** | Ask the UAT Team to re-run UAT-04 on the fixed production revision and record it in `uat.md` §7.3, or record that no retest was done | Chawin | Before final delivery (13 Dec) | CE-F-01 is fixed and guarded by TEST-05.4; the gap is independent UAT evidence, not product behaviour. |
| **R-4** | Set `SMOKE_EMAIL` and the `SMOKE_PASSWORD` secret in the `demo` environment; confirm `PASS login` on the next deploy | Chawin | Before final delivery | OPS-01 is a disclosed verification gap; the authenticated E2E job passes. |
| **L7-01** | Recompute the date picker window on focus/change so a form left open across midnight never offers yesterday's range; add a test and re-release | Chawin | 29 Nov 2026 (Sprint 2) | A T−91 date still cannot be saved: the submit check and server reject it. |
| **TD-6** | Correct the stale test comment and avoid computing T−90 twice in one request | Supichaya | 13 Dec 2026 | The 26 Nov suite passed; this is test hygiene. |
| **TD-4** | Add a CI job for `deploy/tests/`, or record why it is not run, before Final Delivery | Chawin | Before final delivery (13 Dec) | Deploy scripts changed only in Lab 5 and both later deploy runs succeeded; no product path is affected. |
| **R-5** | Run the Lab 6 §4.1 reset before the next UAT or demo session | Supichaya | Before the next session | Only one synthetic 1.00 ฿ row; no effect on this verification (local DB was reset). |
| **TD-5** | Delete the exercise revision `pangtao-00010-ges` (not the live `pangtao-00010-hl7`) and its image after Lab 6 grading | Chawin | After grading | It has 0% traffic and no tag (DEP-05). |

Open risks for the next Part A run:

1. **Sprint 2 regressions.** Merging F-09 to F-13 can change shared code paths (accounts, allocation matrix, balance engine, history). The final run must repeat the full suite and the scripted journey, not only the Sprint 2 tests.
2. **Test dates near the BR-10 boundary.** Tests use Bangkok-relative dates; a run crossing midnight can be flaky at exactly T−90 (TD-6). The final run should record the time and re-run a failure before declaring a defect.
3. **Deployment identity.** The final record must state the Cloud Run revision created by the final deploy run, not the revision of an earlier release. The `APP_COMMIT` value and the image digest tie the revision to the commit.
4. **UAT on the final candidate.** Lab 6 UAT evidence belongs to `64c98f4`. The final candidate needs either a partner re-run or a clearly labelled team acceptance run; Part E owns that evidence.
