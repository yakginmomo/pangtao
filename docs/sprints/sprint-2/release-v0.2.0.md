# Sprint 2 Release Record: v0.2.0

Issue #78 · Related: [Sprint 2 README](README.md) §3 (demonstration journey), §5 (DoD) · [Requirements traceability](../../traceability.md) §4 · [Sprint 3 README](../sprint-3/README.md) §7.2

This record identifies the accepted Sprint 2 release, so it stays identifiable after later Sprint 3 releases replace it on `main` and on Cloud Run (Deliverable 2 Part B).

---

## 1. Release identification

| Item | Value |
|---|---|
| Tag | `v0.2.0` |
| Commit | `0d66ae20b06e09c6eced76bc7edee7f0aae68ef2` (`0d66ae2`), merge of PR #71 (`sprint-2-staging` → `main`), 27 Nov 2026 03:20 Bangkok |
| Deploy workflow run | [Deploy demo 45890385872](https://github.com/yakginmomo/pangtao/actions/runs/45890385872), push to `main` at `0d66ae2`, success |
| Cloud Run revision | `pangtao-00011-28l`, serving 100% of traffic after the deploy (deploy log, 27 Nov 03:26 Bangkok) |
| Public URL | https://pangtao-vowtduxdha-as.a.run.app |
| Previous release | `2dc3dc1` (Lab 7, BR-10 v2.0), revision `pangtao-00009-cwz` |

### 1.1 Contents

| Work | Issue | Merged into `sprint-2-staging` |
|---|---|---|
| F-09 Account management | #57 | PR #66, `b0e8682` |
| F-10 Loans | #60 | PR #67, `92916f0` |
| F-11 Transfers | #58 | PR #68, `df027a3` |
| F-12 Opening balance management | #59 | PR #69, `ae7aa09` |
| F-13 Edit and void transactions | #61 | PR #70, `a05a0fb` |
| L7-01 date picker window (defect) | #62 | PR #65, `f388bea` (red `90433ca`, green `ba75d86`) |
| Sprint 2 contracts and Part A baseline v2.1 | — | PR #63 `d4238d2`, PR #64 `ce7029f` |

### 1.2 Checks in the deploy run on `0d66ae2`

| Job | Result |
|---|---|
| Lint, type-check, build | passed |
| Unit and API tests | 198 passed, 0 failed, 0 skipped (23 files); all-files line coverage 96.12%, coverage gate passed |
| End-to-end tests | 32 passed, 0 failed, 0 skipped |
| Docker image build | passed |
| Deploy, then smoke test (`deploy/smoke_test.py`) | `PASS /api/v1/health`, `PASS /`; login check **skipped** (smoke credentials not configured) |

---

## 2. Post-deploy checks on `pangtao-00011-28l`

### 2.1 Anonymous checks (recorded)

Run on 27 Nov 2026 at 10:51 Bangkok (03:51 UTC) with `curl` against the public URL. These checks write nothing.

| ID | Check | Expected | Actual |
|---|---|---|---|
| PD2-1 | `GET /api/v1/health` | 200 | 200 |
| PD2-2 | `GET /api/v1/accounts`, no session | 401 `UNAUTHENTICATED` | 401 `UNAUTHENTICATED` |
| PD2-3 | `GET /api/v1/transactions`, no session | 401 | 401 |
| PD2-4 | `GET /api/v1/loans` (F-10), no session | 401 | 401 |
| PD2-5 | `GET /api/v1/summary/income-expense`, no session | 401 | 401 |
| PD2-6 | `GET /api/v1/admin/users`, no session | 401 | 401 |
| PD2-7 | `GET /api/v1/auth/me`, no session | 401 | 401 |

Every 401 body was `{"error":{"code":"UNAUTHENTICATED","message":"Authentication required"}}`, with no private data.

### 2.2 Sprint 2 journey (to run)

Sprint 2 README §3, in the browser or with `curl`, as the seeded users. Run it with the seed password outside the repository. Record the result and the time below. **Run it before the next release to `main`**, because that release replaces this revision.

| ID | Journey step (Sprint 2 README §3) | Expected | Actual | By, time |
|---|---|---|---|---|
| PD2-8 | 1. F-09: Alice creates Savings, Loan to Bob, Loan from Mom; a second Savings | 201 ×3; 409 `ACCOUNT_NAME_EXISTS` | not yet run | |
| PD2-9 | 2. F-11: Bank Account → Savings 10,000.00 | 201 | not yet run | |
| PD2-10 | 3. F-10: lend 2,000.00; receive 500.00 from Bob; borrow 5,000.00 into Wallet | 201 ×3 | not yet run | |
| PD2-11 | 4. F-12: correct Bank opening 50,000.00 → 55,000.00 | 200 | not yet run | |
| PD2-12 | 5. F-13: edit card charge to Dining 900.00 (total 1,400.00); void the 800.00 repayment | 200; 200 | not yet run | |
| PD2-13 | 6. Balances, summary, Loans page, history | Bank 73,500.00; Savings 10,000.00; Wallet 5,000.00; card 1,400.00; Loan to Bob 1,500.00; Loan from Mom 5,000.00; month income 30,000.00, expense 1,400.00; Loans 1,500.00 / 6,400.00; voided row marked | not yet run | |
| PD2-14 | 7. Payment to archived Savings; transfer Bank → Bank | 400 `INVALID_TARGET_ACCOUNT` ×2, nothing saved | not yet run | |
| PD2-15 | 8. Bob edits/voids Alice's transaction; Admin `POST /accounts`, `GET /loans` | 404; 403 | not yet run | |
| PD2-16 | Persistence: log out, log in again, reload | Same balances as PD2-13 | not yet run | |

The journey starts from the end of the Sprint 1 journey (Bank 79,200.00, card debt 400.00). If Alice's production ledger is not in that state, first run the Lab 6 §4.1 reset and the Sprint 1 journey (plan.md §2), then this one. Afterwards, reset again before any demo or UAT session (Lab 7 readiness R-5).

---

## 3. Closing actions

- [x] Tag `v0.2.0` on `0d66ae2`.
- [x] Revision ↔ commit ↔ workflow run recorded (§1).
- [x] Anonymous post-deploy checks recorded (§2.1).
- [x] Traceability §4 status lines updated for F-09 to F-13.
- [x] Lab 7 readiness: L7-01 marked fixed and released.
- [ ] Sprint 2 journey PD2-8 to PD2-16 run and recorded (§2.2).
- [ ] After §2.2 passes: close Issues #57 to #61 and #62, and mark F-09 to F-13 **accepted** in traceability §4 and the Sprint 3 remaining-work table.
