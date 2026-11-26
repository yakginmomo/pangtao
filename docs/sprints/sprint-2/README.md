# Sprint 2 Engineering Contracts and Definition of Done

CPE 334 Project Deliverable 2 · Sprint 2 · Baseline v1.0 · 26 November 2026

Related documents: [SRS](../../srs.md) · [Feature inventory](../../features.md) · [Requirements traceability](../../traceability.md) · [System-Level SDS](../../system-sds.md) · [Three-sprint plan](../plan.md) · [Sprint 1 conventions](../sprint-1/README.md) · [Part A: Sprint 1 continuity](part-a-sprint-1-continuity.md)

---

## 1. Sprint 2 overview and scope

Sprint 2 is the core expansion (plan.md §1): a User manages their own accounts, records loans and transfers, corrects or removes opening balances, and edits or voids transactions, with every balance and summary still derived from saved transactions. It starts from the Lab 7 release (`2dc3dc1`, BR-10 v2.0) and ends with the reviewed release `v0.2.0` on `main`, deployed through the Lab 5 pipeline.

### 1.1 Sprint 2 feature inventory

| ID | Feature | Issue | Contract document | Linked requirements | Depends on | Owner |
|---|---|---|---|---|---|---|
| **F-09** | Account management | #57 | [f-09-account-management.md](f-09-account-management.md) | FR-09; BR-01, 02, 14; NFR-02, 08 | F-03 | Chawin |
| **F-10** | Loans | #60 | [f-10-loans.md](f-10-loans.md) | FR-14, 21; BR-01, 02, 04–08, 10, 14, 16; NFR-02, 03, 08 | F-05, F-06, F-09 | Chawin |
| **F-11** | Transfers | #58 | [f-11-transfers.md](f-11-transfers.md) | FR-15; BR-01, 02, 04–08, 10, 14; NFR-03, 08 | F-05, F-06 | Supichaya |
| **F-12** | Opening balance management | #59 | [f-12-opening-balance-management.md](f-12-opening-balance-management.md) | FR-11; BR-01, 02, 04, 10, 11, 14; NFR-02, 03, 08 | F-04 | Supichaya |
| **F-13** | Edit and void transactions | #61 | [f-13-edit-void.md](f-13-edit-void.md) | FR-16; BR-01, 02, 04–07, 10, 12, 14, 16; NFR-02, 03, 08 | F-05, F-06, F-07 | Supichaya |

The owner drives the implementation; the other student reviews the PR. Chawin writes the Sprint 2 contracts and Supichaya reviews them; Supichaya writes the Sprint 3 contracts (F-14 to F-18) and Chawin reviews them, so neither student holds a permanent specification or coding role. All five Sprint 2 contracts are merged into `sprint-2-staging` before the first failing test of any Sprint 2 feature.

**Also in the sprint:** defect **L7-01**, Issue #62 (the date picker's T−90 to T window is computed when the form renders; Lab 7 readiness §3), owner Chawin, fixed on `fix/L7-01-date-window` before the release.

**Not in Sprint 2:** search and filter (F-14), favorites and duplicate (F-15), category summaries and reports (F-16), administrator account creation (F-17) and hardening (F-18) are Sprint 3.

### 1.2 What already exists

Sprint 1 built the ledger for the full SRS §4 matrix, so Sprint 2 extends rules and screens rather than the data model:

| Already in the code | Where | Used by |
|---|---|---|
| `accounts.subtype` with the `accounts_subtype_valid` CHECK, `accounts.is_archived`, unique `(user_id, name)` | migration `20261111213027_accounts_ledger` | F-09 |
| Balance effects for every target type, including Cash, Loan Given and Loan Taken lines on both forms | `server/src/services/balance.engine.ts` (`lineEffect`) | F-10, F-11 |
| `transactions.voided_at`, excluded from balances, summaries and history | balance engine, `summary.service.ts`, `transaction.service.ts` | F-12, F-13 |
| `unique_active_opening_balance` index, limited to rows with `voided_at IS NULL` | migration `20261111213027_accounts_ledger` | F-12 |
| Summary counts only Income and Expense lines | `summary.engine.ts` (BR-08) | F-10, F-11 |

The Sprint 1 limits that Sprint 2 lifts are the allowed-target tables `PAYMENT_TARGETS` and `RECEIPT_TARGETS` in `server/src/services/allocation.rules.ts`, and the history query that lists non-voided transactions only (F-07 1.1 §1).

**Expected schema change: none.** A contract that needs a migration says so in its §2.3 and updates System-Level SDS §2 (table and ER diagram) in the same PR.

---

## 2. Shared decisions for Sprint 2

### 2.1 Conventions carried over

Sprint 1 README §2 (integer satang, session and cookie rules, default deny, ownership 404, Administrator 403, CSRF and Content-Type checks, error envelope), §3 (test levels U/A/E) and the error catalogue §2.4 apply unchanged. Every new write path applies BR-01 (ownership, 404), BR-02 (Administrator 403), BR-10 (date rules) and BR-14 (archived accounts) unless its contract states why a rule does not apply.

### 2.2 Allocation matrix after Sprint 2

The rows marked Sprint 2 in SRS §4 are added to the allowed-target tables. Each row belongs to one feature:

| Form | Source | Line target | Meaning | Feature |
|---|---|---|---|---|
| Payment | Cash | Expense | Spending | Sprint 1 (F-05) |
| Payment | Loan Taken | Expense | Card charge | Sprint 1 (F-05) |
| Payment | Cash | Loan Taken | Repayment of a card or loan | Sprint 1 (F-05) |
| Payment | Cash | Loan Given | Lending | **F-10** |
| Payment | Cash | another Cash | Transfer out | **F-11** |
| Receipt | Cash | Income | Earnings | Sprint 1 (F-06) |
| Receipt | Cash | Loan Given | Repayment received | **F-10** |
| Receipt | Cash | Loan Taken | New borrowing | **F-10** |
| Receipt | Cash | another Cash | Transfer in | **F-11** |

A Loan Taken source still accepts Expense lines only, and every other row uses a Cash source (Q-1, settled in F-10). This narrows SRS §4, which limited the card source to Expense lines only "in Sprint 1"; it is recorded as requirement revision v2.1 in traceability §2. After Sprint 2 a Cash Payment may target any type except Income, and a Receipt may target any type except Expense.

### 2.3 Planned API surface

Following System-Level SDS §4 (GET reads, POST creates, PATCH updates). Each contract's §2.1 gives the request and response shapes, validation and errors; this table is the overview.

| Method and path | Role | Feature | Purpose |
|---|---|---|---|
| POST /accounts | User | F-09 | Create an account (name, type, optional subtype) |
| PATCH /accounts/:id | User | F-09 | Rename or archive; type and subtype cannot change (BR-14) |
| POST /transactions | User | F-10, F-11 | Unchanged endpoint; accepts the new target types in §2.2 |
| GET /loans | User | F-10 | Outstanding Loan Given and Loan Taken balances, including card debt (FR-21) |
| PATCH /accounts/:id/opening-balance | User | F-12 | Correct the amount or date of the active opening balance |
| POST /accounts/:id/opening-balance/void | User | F-12 | Remove the opening balance (voids it; see §2.4) |
| PATCH /transactions/:id | User | F-13 | Edit a Payment or Receipt; the same rules as creating it |
| POST /transactions/:id/void | User | F-13 | Void a Payment or Receipt |
| GET /transactions, GET /transactions/:id | User | F-13 | Also return voided transactions, marked as voided (BR-12) |

Every route above is User-only: Administrator 403, anonymous 401, another user's record 404 (System-Level SDS §5). New screens: Accounts (`/accounts`, F-09), Loans (`/loans`, F-10), and edit/void actions on the transaction detail page (F-13).

### 2.4 Decisions already taken

| ID | Decision | Reason |
|---|---|---|
| S2-D1 | Nothing is hard-deleted. Removing an opening balance (F-12) sets `voided_at` on its transaction; a new opening balance can then be recorded. | D-04 (never hard-delete) and D-05 (an opening balance is a transaction kind); the existing partial unique index already allows it. |
| S2-D2 | Opening balances are corrected and removed only through F-12, never through the F-13 edit or void endpoints. | Keeps BR-11 and the opening-balance date rule (no 90-day limit) in one place. |
| S2-D3 | A transfer is a Payment or Receipt line to another Cash account (FR-15 "on either form"), not a new transaction kind. | No schema change; the balance engine and BR-08 already treat it correctly. |
| S2-D4 | An edit replaces the transaction's fields and lines in one database transaction and re-runs every create-time rule (BR-04–07, 10, 14, 16) on the new version, with the two exceptions in S2-D6. | BR-07: balances are derived, so an edit must leave the ledger as if the new version had been saved originally. |
| S2-D5 | An archived account keeps its history and balance and can be renamed; it cannot be newly used as a source or target. | BR-14. |
| S2-D6 | An edit may keep values the saved version already had even if a rule would now reject them: an unchanged date older than T−90, and an account the transaction already used that has since been archived, kept in the same role (source stays source, line target stays line target). A changed date and a newly chosen or re-roled account must pass the rules. | Fixing a memo or an amount on an older row must not force the user to re-date it or un-archive an account; nothing new is backdated (BR-10) or newly attached to an archived account (BR-14). |

### 2.5 Open questions and how the contracts settle them

Each answer is recorded in the named contract and is open to challenge in its review; changing one after merge is a contract revision.

| ID | Question | Answer | Settled in |
|---|---|---|---|
| Q-1 | May a Loan Taken source pay Loan Given or Cash targets (card cash advance, lending by card)? | No. A Loan Taken source accepts Expense lines only; lending and transfers use a Cash source. Requirement revision v2.1 (narrowed). | F-10 §1 |
| Q-2 | May an account with a non-zero balance be archived? | Yes; the confirmation shows the balance. | F-09 §1 |
| Q-3 | Can an archived account be unarchived? | Yes, with `PATCH { isArchived: false }`. | F-09 §1 |
| Q-4 | Does the 90-day limit (BR-10) apply to the original date of a transaction being edited or voided? | Only a changed date is checked against the window (S2-D6). Voiding has no date limit. | F-13 §1 |
| Q-5 | Can a voided transaction be edited or un-voided? | No: 409 `TRANSACTION_VOIDED`. Void is final; the user records a new transaction instead. | F-13 §1 |
| Q-6 | Does an edit keep an audit trail of the previous version? | No. `updated_at` records that an edit happened; previous versions are not stored (disclosed limitation). | F-13 §1 |

### 2.6 Error codes added in Sprint 2

These codes extend the catalogue in Sprint 1 README §2.4; all other Sprint 2 failures reuse codes from that catalogue.

| HTTP | Code | Trigger | Feature |
|---|---|---|---|
| 409 | `ACCOUNT_NAME_EXISTS` | Create or rename to a name the user already has (BR-14) | F-09 |
| 409 | `TRANSACTION_VOIDED` | Edit or void a transaction that is already voided (BR-12) | F-13 |

For example, an invalid type/subtype pair or an attempt to change the type is `VALIDATION_ERROR`; an unallowed target is `INVALID_TARGET_ACCOUNT`; a missing opening balance or another user's record is `NOT_FOUND`.

---

## 3. Sprint 2 demonstration journey

The release must pass this journey on its deployed revision. It continues from the end of the Sprint 1 journey (plan.md §2: Bank 79,200.00 THB, Credit Card debt 400.00 THB, income 30,000.00 THB, expense 1,200.00 THB). All dates are in the current month and within the BR-10 window.

1. **F-09** Alice creates `Savings` (Cash, Bank), `Loan to Bob` (Loan Given) and `Loan from Mom` (Loan Taken, Other). Creating a second `Savings` is rejected with 409 `ACCOUNT_NAME_EXISTS`.
2. **F-11** Payment of 10,000.00 THB from Bank Account to Savings.
3. **F-10** Payment of 2,000.00 THB from Bank Account to Loan to Bob; Receipt of 500.00 THB into Bank Account from Loan to Bob; Receipt of 5,000.00 THB into Wallet from Loan from Mom.
4. **F-12** Correct Bank Account's opening balance from 50,000.00 to 55,000.00 THB.
5. **F-13** Edit the card charge so Dining is 900.00 THB (total 1,400.00 THB); void the 800.00 THB card repayment.
6. **Expected:**

   | Account | Balance |
   |---|---|
   | Bank Account | 73,500.00 THB |
   | Savings | 10,000.00 THB |
   | Wallet | 5,000.00 THB |
   | Credit Card (debt) | 1,400.00 THB |
   | Loan to Bob (owed to Alice) | 1,500.00 THB |
   | Loan from Mom (debt) | 5,000.00 THB |

   The month's summary is income 30,000.00, expense 1,400.00, net 28,600.00 THB: transfers, lending, borrowing and repayments are not counted (BR-08). The Loans page lists 1,500.00 owed to Alice and 6,400.00 owed by her. History shows the voided repayment, marked as voided, and it is not counted.
7. **Rejection:** after archiving Savings, a Payment to it is refused with 400 `INVALID_TARGET_ACCOUNT` and nothing is saved; a transfer from Bank Account to itself is refused the same way.
8. **Forbidden:** Bob edits or voids Alice's transaction → 404; the Administrator calls `POST /accounts` or `GET /loans` → 403; an anonymous caller → 401.

The Sprint 1 journey (Part A §2.3) is re-run on the same candidate as the regression check.

---

## 4. Build order and schedule

| Order | Work | Issue | Owner | Contract merged | Feature merged to staging |
|---|---|---|---|---|---|
| 1 | F-09 account management | #57 | Chawin | 27 Nov | 27 Nov |
| 1 | F-11 transfers | #58 | Supichaya | 27 Nov | 27 Nov |
| 2 | F-12 opening balance management | #59 | Supichaya | 27 Nov | 28 Nov |
| 2 | L7-01 date picker window | #62 | Chawin | — (defect fix) | 28 Nov |
| 3 | F-10 loans (needs F-09 for test accounts) | #60 | Chawin | 27 Nov | 28 Nov |
| 3 | F-13 edit and void | #61 | Supichaya | 27 Nov | 28 Nov |
| 4 | Release PR `sprint-2-staging` → `main`, tag `v0.2.0`, deploy, post-deploy checks of §3 | — | Both | — | 28 Nov |

F-11 and F-10 both edit the allowed-target tables in `allocation.rules.ts`; F-11 merges first and F-10 rebases on it. F-13 reuses the create-time validation, so it rebases after F-10 and F-11 to re-run their rules on edit. If a feature cannot meet its date, the team records an approved scope revision in §6 rather than moving it to Sprint 3 unannounced.

---

## 5. Sprint 2 Definition of Done

Sprint 1 README §4 applies, with these Sprint 2 values:

- Feature branches start from `sprint-2-staging` and merge into it by teammate-reviewed PR; the release PR moves `sprint-2-staging` into `main` and is tagged **`v0.2.0`**.
- Each feature has a GitHub Issue; its PR closes it only after the release's post-deploy checks (Lab 7 retrospective).
- Failing-first evidence (a failing-test commit before the implementation commit) is required for every new business rule: each new allocation-matrix row, the archive and name rules, opening-balance correction and removal, edit re-validation and void exclusion.
- Regression: the full suite, the Sprint 1 journey (Part A) and the NFR-02 route-list test pass on the release commit; the NFR-03 ledger invariant test covers transfers, loans, edits and voids (SRS NFR-03 "re-run in 2").
- Every new screen has loading, empty and error states, inline validation, a 401 redirect to `/login`, and a 360 px E2E check (NFR-08); every write invalidates the queries it affects (accounts, history, summary, loans).
- [traceability.md](../../traceability.md) gains a Sprint 2 results section tied to the tested commit, and a status per AC.

---

## 6. Contract version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 26 Nov 2026 | Initial Sprint 2 scope, shared decisions (S2-D1 to S2-D6), answers to Q-1 to Q-6, API overview, error codes, demonstration journey, build order and DoD, with contracts F-09 1.0 to F-13 1.0, all before implementation. The Sprint 2 matrix rows revise F-05 and F-06 to 1.4, and voided transactions in history revise F-07 to 1.2 (Sprint 1 README §5). |
| F-11 1.1 | 27 Nov 2026 | Test-specification correction, recorded in the F-11 PR (#58) before the E2E test that uses it; no rule, AC or behaviour changes. TEST-11.8's Receive step named Wallet as the receiving account and Bank Account as the **Transfer from** target, which moves 200.00 THB from Bank into Wallet (SRS §4: a Receipt line to Cash lowers that account), giving Bank 48,800.00 and Wallet 1,200.00, while its expected result said Bank 49,200.00 and Wallet 800.00. The step now receives into Bank Account from Wallet, so the expected result holds unchanged. §2.4 also names the unit pair tables of TEST-05.13/TEST-06.11 and the F-10 TEST-10.10 target-group list, which change with the matrix; and the DoD notes that F-10 merged first (PR #67), so F-11 carries no rebase. No AC or TEST removed. |
| F-13 1.1 | 27 Nov 2026 | Recorded before the F-13 tests (Issue #61). §2.2 asks for an "Edited" mark from `updatedAt`, but the 1.0 API returned no creation time, so an edited transaction could not be told from a new one (every new row has `updated_at` equal to `created_at`). History items and the detail now also return `createdAt` (F-07 1.3), a void leaves `updated_at` unchanged, and "Edited" means `updatedAt` later than `createdAt`. §2.4 adds `createdAt` to the TEST-07.1 and TEST-07.3 key lists. No rule, AC or TEST added or removed. |
| F-12 1.1 | 27 Nov 2026 | Recorded in the F-13 PR (#70) review, before the fix and its failing test. §2.3 said `updated_at` changes on every write, but f-13 1.1 defines "Edited" as `updated_at` later than `created_at` and a void keeps `updated_at`. F-12's remove is also a void, and Prisma moved `updated_at` on it, so a removed opening balance that was never corrected showed both "Voided on" and "Edited" once history and detail return voided rows. A correction still changes `updated_at`; a remove now leaves it unchanged. TEST-12.3 also asserts this. No rule, AC or TEST added or removed. |

F-09 and F-10 are at version 1.0; F-11, F-12 and F-13 are at version 1.1. Later revisions are recorded in this table and in the repository git history.
