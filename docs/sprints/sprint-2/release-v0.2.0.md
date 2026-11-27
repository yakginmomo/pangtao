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

### 2.2 Sprint 2 journey (recorded)

Run by Supichaya on 27 Nov 2026 in the browser on the public URL (`pangtao-837912025702.asia-southeast1.run.app`, the same service; revision `pangtao-00011-28l`), after the Lab 6 §4.1 reset and the Sprint 1 journey. Evidence: 28 screenshots in [evidence/release-v0.2.0/](evidence/release-v0.2.0/README.md) (dashboard after each step, forms, History, DevTools console), mapped to each check there. Times of day were not recorded.

**Starting state (Sprint 1 journey):** Bank Account 79,200.00 (opening 50,000.00 on 1 Nov), Credit Card 400.00, month income 30,000.00, expense 1,200.00, net 28,800.00. As expected (plan.md §2).

| ID | Journey step (Sprint 2 README §3) | Expected | Actual | Result |
|---|---|---|---|---|
| PD2-8 | 1. F-09: Alice creates Savings, Loan to Bob, Loan from Mom; a second Savings | 201 ×3; 409 `ACCOUNT_NAME_EXISTS` | Savings (Cash, Bank), Loan from Mom (Loan Taken, Other) and Loan to Bob (Loan Given) listed on Accounts with 0.00. Creating a second `Savings` (run afterwards): `POST /api/v1/accounts` 409 (Conflict), inline "You already have an account with this name." | PASS |
| PD2-9 | 2. F-11: Bank Account → Savings 10,000.00 | Saved | Bank 69,200.00, Savings 10,000.00 | PASS |
| PD2-10 | 3. F-10: lend 2,000.00; receive 500.00 from Bob; borrow 5,000.00 into Wallet | Saved ×3 | Bank 67,200.00 → 67,700.00; Loan to Bob 2,000.00 → 1,500.00; Wallet 5,000.00; Loan from Mom 5,000.00 | PASS |
| PD2-11 | 4. F-12: correct Bank opening 50,000.00 → 55,000.00 | Saved | Dashboard "Opening balance 55,000.00 ฿ on 01 Nov 2026"; History opening row 55,000.00 | PASS |
| PD2-12 | 5. F-13: edit card charge to Dining 900.00 (total 1,400.00); void the 800.00 repayment | Saved; voided | Charge saved as 1,400.00 (2 lines); repayment detail shows **Voided**, "Voided on 27 Nov 2026" and struck-through 800.00 | PASS |
| PD2-13 | 6. Balances, summary, loans, history | Bank 73,500.00; Savings 10,000.00; Wallet 5,000.00; card 1,400.00; Loan to Bob 1,500.00; Loan from Mom 5,000.00; month income 30,000.00, expense 1,400.00, net 28,600.00; owed to me 1,500.00 / I owe 6,400.00; voided row marked | Dashboard shows every balance as expected, Owed to Me 1,500.00, Debts 6,400.00, month 30,000.00 / 1,400.00 / 28,600.00; History lists 8 transactions with the repayment marked Voided. The Summary and Loans screens themselves were not captured (the Dashboard figures come from the same summary and accounts APIs) | PASS |
| PD2-14 | 7. Payment to archived Savings; transfer Bank → Bank | 400 `INVALID_TARGET_ACCOUNT` ×2, nothing saved | First run: Bank → Bank `[400, 'INVALID_TARGET_ACCOUNT']`; payment to Savings `[201]` because Savings was still active (§2.3 item 1). **Re-run** after archiving Savings (Accounts lists it under Archived (1) with Unarchive): console `Savings archived? true`, payment to archived Savings **400 `INVALID_TARGET_ACCOUNT`** | PASS (re-run) |
| PD2-15 | 8. Bob edits/voids Alice's card charge; Admin `POST /accounts`, `GET /loans` | Bob 404, 404; Admin 403, 403 | Bob: edit 404, void 404. Admin: 403, 403. An earlier run of the same snippet in **Alice's** session returned edit 400 and void **200** (§2.3 item 2). **Re-run** in an Incognito window as Bob (`running as bob@example.test`) against Alice's active 30,000.00 Salary receipt: edit 404, void 404; Alice's History afterwards still shows that receipt active | PASS |
| PD2-16 | Persistence: log out, log in again, reload | Same balances as before logging out | Balances unchanged after log out, log in and reload (run after §2.3, so the state includes the two deviations: Bank Account 73,499.00, Savings 10,001.00) | PASS |

### 2.3 Deviations

1. **PD2-14, payment to Savings accepted (201).** Checked afterwards on Accounts: Savings is **active** (it shows Archive, not Unarchive) with 10,001.00, and Bank Account shows 73,499.00. Savings had not been archived before the call, so the request was a valid transfer and 201 is correct: a **procedure error, not a defect**. PD2-14's archived-target case still has to be re-run with Savings archived first. The 1.00 THB Payment stays in Alice's ledger until it is voided or the ledger is reset.
2. **PD2-15, snippet run in Alice's session.** The Bob snippet was first run in the tab logged in as Alice. Edit returned 400 (the record is hers, so the request reached validation: source equals target) and void returned 200, so **Alice's 1,400.00 card charge (`b58f4921…`) is now voided**. This is a procedure error, not a cross-user defect: Bob's own run returned 404 for both. It changes Alice's ledger after PD2-13 was recorded (card debt and month expense drop by 1,400.00), so the Sprint 3 journey cannot start from the Sprint 2 end state without a reset and re-run.
3. **A second 1.00 THB Payment from Bank Account appears in Alice's History** after the re-runs (screenshot 28: two 1.00 Payments, 10 transactions). Only one 201 was observed (the first PD2-14 run), and Bank Account was 73,499.00 with Savings 10,001.00 before the PD2-14 re-run (screenshots 22–24). Both are Bank Account → Savings, 1.00 THB, dated 27 Nov 2026, active (`81fef9e8…` and `7d499ca9…`, screenshots 29–30). Two active 1.00 Payments to Savings would make Savings 10,002.00, but screenshots 22–25 show 10,001.00 both before and after Savings was archived, so the second Payment was saved after screenshot 25. Timestamps from the API (screenshot 31, UTC; Bangkok is +7):

   | Row | Created | Voided |
   |---|---|---|
   | Card charge `b58f4921` | 04:29:29 | 04:53:19 (the PD2-15 run in Alice's session) |
   | Payment `81fef9e8` (first PD2-14 run, 201) | 04:48:38 | — |
   | Payment `7d499ca9` (second) | **05:06:21** (12:06 Bangkok) | — |

   Savings is now 1,000,200 satang (10,002.00) and archived. The first Payment fits the screenshot order (PD2-14 before PD2-15). The second was saved about 13 minutes after the card charge was voided, in the window in which the PD2-8 duplicate check, the archive and the PD2-14 re-run were done (screenshots 22–26). The create path checks the archived target before inserting, inside the same database transaction (`createTransaction` → `checkVersion` in `transaction.service.ts`), so a 400 cannot leave a row behind. That leaves two explanations: a POST sent while Savings was still active (for example the first PD2-14 snippet run again from console history), with the Accounts screenshots taken before it; or an archived target accepted. **Not yet explained.** Next step: in Cloud Logging, list the requests to `pangtao-00011-28l` between 05:00 and 05:10 UTC and compare the time of `PATCH /api/v1/accounts/{Savings}` (archive) with the `POST /api/v1/transactions` at 05:06:21 and its status. If the second Payment was saved by the re-run that returned 400, that is a Critical atomicity defect (BR-07) and blocks the next release; if it comes from an extra run of the first snippet, it is a procedure error.

---

## 3. Closing actions

- [x] Tag `v0.2.0` on `0d66ae2`.
- [x] Revision ↔ commit ↔ workflow run recorded (§1).
- [x] Anonymous post-deploy checks recorded (§2.1).
- [x] Traceability §4 status lines updated for F-09 to F-13.
- [x] Lab 7 readiness: L7-01 marked fixed and released.
- [x] Sprint 2 journey PD2-9 to PD2-13 and PD2-15 recorded as passed (§2.2).
- [x] PD2-8 duplicate-name check and PD2-16 persistence recorded; PD2-14's 201 explained (§2.3 item 1).
- [x] PD2-14 re-run with Savings archived (400) and Bob check re-run on an active Alice transaction (404, 404).
- [ ] Explain the second 1.00 THB Payment (§2.3 item 3).
- [ ] Reset Alice's ledger (Lab 6 §4.1 plus the non-seed accounts) before the Sprint 3 journey, because of §2.3 items 1 and 2.
- [ ] After the remaining checks pass: close Issues #57 to #61 and #62, and mark F-09 to F-13 **accepted** in traceability §4 and the Sprint 3 remaining-work table.
