# Pangtao Lab 7 Part A: Change Request, Impact and Contract Revision

Change: **BR-10 backdate limit**. A Payment or Receipt may no longer be dated more than 90 days before today (Bangkok).

| Item | Value |
|---|---|
| Team | ผิงโหด: Chawin (67070501012), Supichaya (67070501087) |
| Repository | https://github.com/yakginmomo/pangtao |
| Change request | GitHub Issue #__ (to be opened from §1) |
| Contract revision | SRS v2.0 (BR-10); F-05 1.3, F-06 1.3, F-04 1.2; sprint README §2.4 and §5; traceability v2.0; System-Level SDS §7 |
| Teammate review of the contract | **Pending**: PR #__ into `sprint-2-staging` (§6) |

## 0. Versions

| Role | Version | Notes |
|---|---|---|
| Accepted Sprint 1 release (old behaviour) | `main` at `64c98f4`, Cloud Run revision `pangtao-00006-cjx`, accepted by the Lab 6 UAT Team on 22 Nov 2026 | The Sprint 1 baseline tag `v0.1.0` = `bec5575`; `64c98f4` adds Lab 5 delivery only (Lab 6 `uat.md` §1) |
| Pre-change implementation (code to be modified) | `main` at `41bb484` (PR #48, 25 Nov 2026), deployed by Deploy demo run `45579272079` (revision name to be copied from that run) | `server/`, `web/` and `prisma/` are identical to `64c98f4`; the only difference is one added regression test from the Lab 6 exercise (PR #47) |
| Intervening development | PRs #41–#48: Lab 6 UAT documents, the controlled exercise (#45, reverted by #47) | No Sprint 2/3 feature code is on `main` |
| Contract branch | `docs/update-contract` from `sprint-2-staging` at `942fb61` | Documentation only; code and tests follow after review (Part B) |

## 1. Change request (Issue text)

**Title:** `[Lab7] BR-10: reject Payments and Receipts dated more than 90 days ago`

### 1.1 Original requirement and implemented rule

- **SRS BR-10 (v1.x):** "A transaction date is a valid calendar date not later than today (Asia/Bangkok)."
- **Implemented in Sprint 1:** F-05 (Payment and charge) and F-06 (Received money). `transaction.service.ts` rejects only a future date (`isFutureDate`, 400 `FUTURE_DATE_NOT_ALLOWED`); **any past date is accepted**, e.g. `2025-11-25` or `1990-01-01`. The UI date picker has a maximum (today) and no minimum.
- **Present in:** accepted release `64c98f4` and pre-change `41bb484`.

### 1.2 Proposed new rule

A Payment or Receipt date must be **≥ today − 90 days and ≤ today**, both counted as Bangkok calendar days.

- **Boundary (inclusive):** with today = 2026-11-25 (Bangkok), `2026-08-27` (T−90) is accepted and `2026-08-26` (T−91) is rejected. The window moves at Bangkok midnight, not server or browser midnight.
- **Rejection:** 400 `DATE_TOO_OLD`, message "Date cannot be more than 90 days before today in Bangkok time", `details: [{ field: "txnDate", … }]`. Nothing is saved: no transaction, no line, no balance change.
- **UI:** the date picker offers T−90 to T; a typed older date shows "Date cannot be more than 90 days ago." and sends nothing.

### 1.3 Reason

A wrong year or month typed into the date field (e.g. `2025-11-02` instead of `2026-11-02`) is accepted today and silently moves money into a closed period: that month's income/expense summary changes and the transaction is hidden far down the history, so the user's current month looks wrong with no error. Sprint 1 has no edit or void (F-13 is Sprint 2), so such an entry cannot be corrected. A 90-day window still allows late entry of a whole quarter of receipts.

### 1.4 Scope

| In scope | Out of scope (unchanged) |
|---|---|
| `POST /api/v1/transactions` for `PAYMENT` (Cash or Loan Taken source, including card charges and repayments) and `RECEIPT` | Opening balances (F-04): any past date still allowed, only the future-date rule applies |
| Payment and Receive tabs of `/transactions/new` | Summary date ranges (F-08) and history (F-07): any period can still be viewed |
| | Transactions already saved with older dates: kept, still counted in balances, history and summaries |
| | Sprint 2/3 features (edit/void F-13, duplicate F-15): not implemented; they will decide whether the window applies when they are specified |

### 1.5 Acceptance criteria, invalid cases and access

| AC | Outcome |
|---|---|
| AC-05.14 | Payment dated T−91 → 400 `DATE_TOO_OLD`, nothing saved, every balance unchanged; dated T−90 → 201. Same for a card charge. Another user's account with an old date → 404 NOT_FOUND |
| AC-05.15 | UI: days before T−90 cannot be picked; a typed T−91 shows the field error and sends no request |
| AC-06.12 | Receipt dated T−91 → 400 `DATE_TOO_OLD`, nothing saved; dated T−90 → 201 |

Invalid cases and their codes (precedence unchanged except for the new row):

| Input | Result |
|---|---|
| Malformed or impossible date (`2026-02-30`, `25-11-2026`) | 400 VALIDATION_ERROR (unchanged) |
| Any account of another user, any date | 404 NOT_FOUND (unchanged; checked before the date) |
| Wrong source or target type, any date | 400 INVALID_SOURCE_ACCOUNT / INVALID_TARGET_ACCOUNT (unchanged; checked before the date) |
| Date after today | 400 FUTURE_DATE_NOT_ALLOWED (unchanged) |
| **Date before T−90** | **400 DATE_TOO_OLD (new)** |
| Date T−90 to T, lines not summing to total | 400 INVALID_ALLOCATION_SUM (unchanged) |

Access is unchanged: only a logged-in `USER` may record a transaction, on their own accounts. `ADMIN` → 403 FORBIDDEN and anonymous → 401 UNAUTHENTICATED before any date check.

## 2. Impact analysis

| Requirement | Feature | SRS | Feature SDS | System-Level SDS | AC | STS | Code modules |
|---|---|---|---|---|---|---|---|
| BR-10 (Payment) | F-05 | §BR-10 | f-05 §1 BR-10, §2.1, §2.2, §3, §4, §5 | §7 `APP_TIMEZONE` | AC-05.8 (kept), **AC-05.14, AC-05.15 (new)** | TEST-05.8 (kept), **TEST-05.14 (U, A), TEST-05.15 (E)** | `server/src/utils/date.util.ts` (new helper + `BACKDATE_LIMIT_DAYS`), `server/src/services/transaction.service.ts`, `web/src/utils/date.ts`, `web/src/pages/NewTransactionPage.tsx` |
| BR-10 (Receipt) | F-06 | §BR-10 | f-06 §1, §2.1, §2.2, §3, §4, §5 | as above | AC-06.6 (kept), **AC-06.12 (new)** | TEST-06.6 (kept), **TEST-06.12 (A)** | same service and page (one code path for both kinds) |
| BR-10 (opening balance) | F-04 | §BR-10 states the exclusion | f-04 §1 wording only (1.2) | — | AC-04.6 unchanged | TEST-04.6 unchanged | none: `opening-balance.service.ts` and `OpeningBalanceDialog.tsx` must stay as they are |
| Error catalog (NFR-04) | all | — | sprint README §2.4 `DATE_TOO_OLD` | §5 error envelope unchanged | — | — | `error.middleware.ts` unchanged (code passes through `AppError`) |

| Area | Impact |
|---|---|
| Callers / dependencies | Single caller: `POST /api/v1/transactions` → `createTransaction`. `isFutureDate` is also used by `opening-balance.service.ts`; it is not modified, so F-04 is untouched |
| UI / API validation | Server is authoritative (inside the same `prisma.$transaction`); the UI check is a convenience. The Zod schema stays calendar-only, because "today" belongs in the service (same reason as the existing future-date check) |
| Roles / ownership | No change. Check placed after the 404 ownership check, so it cannot reveal whether another user's account exists |
| Persistence | Rejected request saves nothing (existing `$transaction` rollback). No new column, table or constraint |
| Historical data | Rows older than 90 days stay valid. Balances are derived (BR-07), so nothing is recalculated. Production currently holds only synthetic seed data |
| Migrations | **Not applicable**: a rule on new writes only; a DB CHECK would need `now()` and would break old rows |
| Configuration | **Not applicable** for a new variable: 90 is a constant (`BACKDATE_LIMIT_DAYS`), not an env var, so every instance enforces the same rule. `APP_TIMEZONE` continues to define "today" |
| Money / precision | **Not applicable**: no amount is calculated differently |
| Summaries (F-08), history (F-07) | **Not applicable** to their logic; they read whatever is saved. Covered by regression (§3) |
| Test fixtures | `tests/e2e/transaction-history.spec.ts` posts `2026-01-25`–`27` through the API, so it **will fail** under the new rule: move its dates inside the window and keep its assertions (versioned in sprint README §5). API tests posting fixed November dates (`DATE = '2026-11-01'`, `'2026-11-22'`) pass now but expire after 90 days: switch them to `bangkokDate(-n)`. Fixtures written straight into the DB (`insertDemoLedger`, January dates) are unaffected and act as the "old rows still work" regression |
| UAT documents | Lab 6 `uat.md` uses dates T and M1 (≤ 31 days old), so its cases stay valid |

## 3. Behaviour that must stay unchanged, and the tests protecting it

| Preserved behaviour | Protected by (existing tests, run on the change PR) |
|---|---|
| Future date rejected for Payment, Receipt and opening balance; today accepted | TEST-05.8, TEST-06.6, TEST-04.6 (`tests/api/transactions.api.test.ts`, `opening-balance.api.test.ts`), unit `isFutureDate` cases in `tests/unit/opening-balance.test.ts` |
| Opening balance with an old date (e.g. `2026-01-01`) still accepted | TEST-04.x fixtures in `opening-balance.api.test.ts` and `accounts.api.test.ts` that open balances on `2026-01-01` |
| Old saved rows still appear in history, balances and summaries | `transaction-history.api.test.ts` and `summary.api.test.ts` (January/November rows inserted directly), TEST-03.x balance engine |
| User isolation: another user's account → 404 | TEST-05.7, TEST-06.7, TEST-07.4, TEST-08.9; plus the new 404 case in TEST-05.14 |
| Admin denied financial data | TEST-01.8, TEST-03.2, TEST-07.5, TEST-08.5, and the `transactions.api.test.ts` case "an Administrator gets 403 and an anonymous caller 401, and nothing is saved" on `POST /api/v1/transactions` |
| Allocation sum, source/target matrix, amount limits, archived rules | TEST-05.4–05.6, 05.10–05.13, TEST-06.3–06.5, 06.9–06.11 |
| Atomicity: rejected request saves nothing | `aliceRows()` / balance assertions in every rejection test above |

Full suite to run before and after: `npm run verify` (lint, type-check, unit + API with coverage gate, build, E2E); CI on the PR runs the same four jobs. No existing test is removed or weakened; the only revised test is the E2E fixture date change above.

## 4. Contract excerpts: old → new

| Location | Old (≤ `41bb484`) | New (this revision) |
|---|---|---|
| SRS BR-10 | A transaction date is a valid calendar date not later than today (Asia/Bangkok). | … not later than today (Asia/Bangkok). A Payment or Receipt date must also be no more than 90 days before today: today − 90 accepted, today − 91 rejected. Opening-balance dates have only the not-later-than-today limit. |
| f-05 §1 BR-10 | Date must be ≤ today in Bangkok time. | Date must be ≤ today and ≥ today − 90 days in Bangkok time, inclusive; T−90 accepted, T−91 → 400 DATE_TOO_OLD; old saved rows unchanged. |
| f-05 / f-06 §2.1 errors | … 400 FUTURE_DATE_NOT_ALLOWED; … | adds 400 DATE_TOO_OLD with message, `details` and check order |
| f-05 / f-06 §2.2 UI | (no date minimum) | Date picker T−90 to T; "Date cannot be more than 90 days ago." |
| f-05 §3 / §4 | AC-05.1 – AC-05.13, TEST-05.1 – 05.13 | + AC-05.14, AC-05.15, TEST-05.14 (U, A), TEST-05.15 (E) |
| f-06 §3 / §4 | AC-06.1 – AC-06.11 | + AC-06.12, TEST-06.12 (A) |
| f-04 §1 BR-10 | not later than today | unchanged rule; states that the 90-day limit does not apply |
| sprint README §2.4 | — | new row `DATE_TOO_OLD` |
| sprint README §5 | F-05/F-06 at 1.2, F-04 at 1.1 | row "F-05 1.3, F-06 1.3 and F-04 1.2", 25 Nov 2026 |
| traceability | BR-10 → AC-05.x, 06.x; latest v1.9 | BR-10 row lists the new ACs; v2.0 row; §3 rows marked NOT YET IMPLEMENTED |

## 5. Planned sequence (recorded commits fill in as they happen)

| Step | Evidence | Commit / PR |
|---|---|---|
| 1. Change request opened | §1 | Issue #__ |
| 2. Contract revision committed | this branch | __ |
| 3. Teammate reviews the contract **before code** | PR review text | PR #__ |
| 4. Failing tests on the pre-change code (RED) | output on `41bb484` + test commit | __ |
| 5. Implementation (GREEN) + regression run | `npm run verify` counts | __ |
| 6. Reviewed PR → `sprint-2-staging` → release PR → `main` → deploy | CI runs, revision | __ |
| 7. Post-deploy checks: T−91 rejected, T−90 accepted; Alice cannot reach Bob's record (404); Admin denied (403) | evidence IDs | __ |

## 6. Teammate review of the revised contract

| Reviewer | Date | What was checked | Outcome |
|---|---|---|---|
| __ | __ | __ | __ |
