# F-09 Account Management: Engineering Contract

Requirements: FR-09; BR-01, BR-02, BR-14 · Depends on: F-03 · Issue: #57 · Contract version: 1.0 (see [version history](README.md#6-contract-version-history)) · Suggested branch: `feature/F-09-account-management`

Shared conventions and error codes are in [Sprint 1 README](../sprint-1/README.md) §2 and [Sprint 2 README](README.md) §2; the Sprint 2 Definition of Done is in [Sprint 2 README](README.md) §5.

---

## 1. Feature design

**Purpose.** Let a User create their own accounts of the five types, rename them, and archive or unarchive them, so the ledger can model the user's real wallets, bank accounts, cards, loans and categories instead of only the seeded set.

**Workflow**

1. The User opens **Accounts** (`/accounts`) from the top bar. The page lists their accounts grouped by type (Cash, Loan Taken, Loan Given, Income, Expense), with archived accounts in a separate collapsed **Archived** group.
2. **Create:** the User clicks **New account**, enters a name, picks a type and, for Cash or Loan Taken, an optional subtype, and saves. The server checks the input and the name rule and inserts the account with no transactions; its balance is 0.00 THB.
3. **Rename:** the User edits the name of an active or archived account and saves.
4. **Archive:** the User clicks **Archive**; a confirmation shows the account's current balance. After confirming, the account moves to the Archived group, keeps its history and balance, and is no longer offered in transaction or opening-balance forms.
5. **Unarchive:** the User clicks **Unarchive** on an archived account; it returns to its type group and can be used again.
6. Every change refreshes the Accounts page, the Dashboard and the transaction form's account lists.

**Rules and validation**

- **Name:** a string, trimmed of leading and trailing spaces, 1 to 60 characters after trimming. A blank, missing or longer name returns `400 VALIDATION_ERROR` with `details[0].field = "name"`.
- **BR-14 (unique names):** names are unique per user, compared exactly after trimming (the database constraint `(user_id, name)` is case-sensitive, so `Savings` and `savings` are different names). Creating, or renaming to, a name the user already has returns `409 ACCOUNT_NAME_EXISTS`. Another user may use the same name. A unique-constraint violation from a concurrent request is also returned as `409 ACCOUNT_NAME_EXISTS`, never 500.
- **Type:** one of `CASH`, `LOAN_TAKEN`, `LOAN_GIVEN`, `INCOME`, `EXPENSE`. Anything else returns `400 VALIDATION_ERROR`.
- **BR-14 (valid subtype):** `subtype` is optional. For `CASH` it may be `WALLET` or `BANK`; for `LOAN_TAKEN`, `CREDIT_CARD` or `OTHER`; for `LOAN_GIVEN`, `INCOME` and `EXPENSE` it must be absent or `null`. Any other pair returns `400 VALIDATION_ERROR` with `details[0].field = "subtype"` (the `accounts_subtype_valid` CHECK constraint is the database backstop).
- **BR-14 (type and subtype are fixed):** `PATCH` accepts only `name` and `isArchived`. A body containing `type`, `subtype` or any other field returns `400 VALIDATION_ERROR` and changes nothing; so does an empty body.
- **Archive (Q-2):** any account may be archived whatever its balance (D-02 already allows any balance); its transactions, balance and summary contributions are unchanged.
- **Unarchive (Q-3):** `PATCH { "isArchived": false }` makes the account usable again. Archiving an archived account or unarchiving an active one is accepted and changes nothing (200, idempotent).
- **BR-14 (archived accounts in use):** unchanged from Sprint 1 and re-verified here: an archived account as a Payment/Receipt source or opening-balance account returns `400 VALIDATION_ERROR`; as a line target, `400 INVALID_TARGET_ACCOUNT` (BR-06). An archived account can still be renamed (S2-D5).
- **BR-01:** `PATCH` on an id that is unknown or owned by another user returns `404 NOT_FOUND`. The server takes the owner from the session; the body never carries a user id.
- Every check and the write run in one database transaction, so a rejected request writes nothing.

**Permissions:** User only. Administrator receives 403 (BR-02), anonymous receives 401.

---

## 2. Specifications

### 2.1 API

| Endpoint | Request | Success | Errors |
|---|---|---|---|
| POST /api/v1/accounts | `{ "name": "Savings", "type": "CASH", "subtype": "BANK" }` (`subtype` optional) | 201 `{ "account": { id, name, type, subtype, isArchived: false, balance: 0, openingBalance: null } }` | 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 409 ACCOUNT_NAME_EXISTS; 415 UNSUPPORTED_MEDIA_TYPE |
| PATCH /api/v1/accounts/:id | `{ "name"?: string, "isArchived"?: boolean }`, at least one | 200 `{ "account": { id, name, type, subtype, isArchived, balance, openingBalance } }` | 400 VALIDATION_ERROR; 401 UNAUTHENTICATED; 403 FORBIDDEN; 404 NOT_FOUND; 409 ACCOUNT_NAME_EXISTS; 415 UNSUPPORTED_MEDIA_TYPE |

- The `account` object has the same shape as an item of `GET /api/v1/accounts` (F-03 §2.1), with the balance derived by the balance engine.
- `GET /api/v1/accounts` is unchanged and already returns `isArchived`; the new account appears in its type group in name order (F-03 ordering).
- A malformed `:id` returns `400 VALIDATION_ERROR`, as on the other account routes.
- `PATCH` with the account's own current name is accepted (200, no change).

### 2.2 UI

- **Navigation:** the User menu gains **Accounts** (`/accounts`) between Dashboard and Transactions.
- **Accounts screen (`/accounts`):** one section per type with each account's name, subtype and formatted balance; a collapsed **Archived (n)** section. Actions per row: **Rename** (inline field with Save and Cancel), **Archive** or **Unarchive**.
- **New account form:** Name, Type (select), Subtype (shown only for Cash and Loan Taken, with only that type's options plus "None"). Inline errors: "Enter a name.", "Name must be 60 characters or fewer.", and the server's 409 shown under Name as "You already have an account with this name.". Save is disabled while the form is invalid, and an invalid request is never sent.
- **Archive confirmation:** "Archive {name}? Its balance of {balance} and its history stay; it can no longer be used in new transactions." with Archive and Cancel.
- **States:** skeleton rows while loading; an empty Archived section is hidden; an error banner with Retry; an API 401 on any request redirects to `/login`. Usable at 360 px width.
- **Cache:** create, rename, archive and unarchive invalidate the `accounts` and `transactions` queries (account names appear in history) and the `loans` query once F-10 exists.
- The Dashboard (F-03) and the transaction form (F-05/F-06) already hide archived accounts from new-transaction choices; they show new and renamed accounts after the invalidation.

### 2.3 Data

- No new tables, columns or migrations. Writes the existing `accounts` table: `name`, `type`, `subtype`, `is_archived`, from migration `20261111213027_accounts_ledger`, with its unique `(user_id, name)` constraint and `accounts_subtype_valid` CHECK.
- No transaction rows are created; an opening balance is recorded separately with F-04.

---

## 3. Acceptance criteria

| AC | Observable outcome |
|---|---|
| AC-09.1 | Creating an account with a valid name, type and subtype returns 201 with balance 0 and `openingBalance: null`, and the account then appears in `GET /api/v1/accounts` in its type group; this holds for each of the five types. |
| AC-09.2 | A missing, blank or over-60-character name, an unknown type, or a subtype that is not valid for the type returns 400 VALIDATION_ERROR and creates nothing. |
| AC-09.3 | Creating, or renaming to, a name the user already has returns 409 ACCOUNT_NAME_EXISTS and changes nothing; another user can create an account with that name. |
| AC-09.4 | Renaming an account returns 200; its balance, type and subtype are unchanged, and history and detail show the new name for its existing transactions. |
| AC-09.5 | A `PATCH` whose body contains `type`, `subtype` or an unknown field, or is empty, returns 400 VALIDATION_ERROR and leaves the account unchanged. |
| AC-09.6 | Archiving an account with a non-zero balance returns 200 with `isArchived: true`; its balance and history are unchanged; the archived account is then rejected as a Payment source (400 VALIDATION_ERROR), as a line target (400 INVALID_TARGET_ACCOUNT) and for a new opening balance (400 VALIDATION_ERROR), and each rejection saves nothing. |
| AC-09.7 | Unarchiving an archived account returns 200 with `isArchived: false`, and the account can again be used as a Payment source. An archived account can be renamed. |
| AC-09.8 | `PATCH` on another user's account returns 404 NOT_FOUND and changes nothing; an Administrator calling `POST` or `PATCH` receives 403 FORBIDDEN; an anonymous caller receives 401 UNAUTHENTICATED. |
| AC-09.9 | In the browser, the User creates an account, renames it, archives it (seeing its balance in the confirmation) and unarchives it on `/accounts`; invalid input shows inline errors and sends no request, and the transaction form offers the new account and stops offering it while archived. |
| AC-09.10 | The Accounts screen shows loading, error-with-Retry and empty-Archived states, and its create form is usable at 360 px width. |

---

## 4. Software test specification

| Test | AC | Level | Precondition and input | Action | Expected result |
|---|---|---|---|---|---|
| **TEST-09.1** | AC-09.1 | A | Alice logged in; seeded accounts | POST `/api/v1/accounts` in turn: `Savings` (CASH, BANK); `Loan from Mom` (LOAN_TAKEN, OTHER); `Loan to Bob` (LOAN_GIVEN); `Bonus` (INCOME); `Travel` (EXPENSE) | Each returns 201 with `balance: 0`, `openingBalance: null`, `isArchived: false`; GET `/api/v1/accounts` returns 14 accounts in F-03 order, with each new account in its type group; Bob's account list is unchanged. |
| **TEST-09.2** | AC-09.2 | U, A | Alice logged in | POST with: no name; name `"   "`; a 61-character name; type `SAVINGS`; CASH with subtype `CREDIT_CARD`; LOAN_GIVEN with subtype `BANK`; EXPENSE with subtype `WALLET` | Each returns 400 VALIDATION_ERROR naming the field (`name`, `type` or `subtype`); Alice's account count is unchanged. U: the subtype rule accepts exactly the pairs in §1. |
| **TEST-09.3** | AC-09.3 | A | Alice has `Savings`; Bob logged in separately | Alice POSTs `Savings` again; Alice POSTs ` Savings ` (spaces); Alice renames `Wallet` to `Savings`; Bob POSTs `Savings` | Alice's three requests return 409 ACCOUNT_NAME_EXISTS and change nothing (`Wallet` keeps its name); Bob's returns 201. |
| **TEST-09.4** | AC-09.4 | A | Alice has a Payment Bank Account → Dining 100.00 THB | PATCH Dining `{ name: "Eating out" }`; GET `/api/v1/accounts`; GET the transaction | 200; the account is `Eating out` with balance 10,000 satang and type EXPENSE; the transaction's line shows `targetAccountName: "Eating out"`. |
| **TEST-09.5** | AC-09.5 | A | Alice logged in | PATCH Wallet with `{ type: "EXPENSE" }`; `{ subtype: "BANK" }`; `{ name: "W", colour: "red" }`; `{}` | Each returns 400 VALIDATION_ERROR; Wallet is unchanged. |
| **TEST-09.6** | AC-09.6 | A | Alice has Wallet opening balance 1,000.00 THB, a Payment Wallet → Dining 200.00 THB, and a new Loan Given account `Loan to Bob` | PATCH Wallet, Telecom and Loan to Bob `{ isArchived: true }`; GET accounts and history; POST a Payment from Wallet to Dining; POST a Payment Bank Account → Telecom; POST an opening balance on Loan to Bob | Each archive returns 200 `isArchived: true`; Wallet balance is still 80,000 satang and both Wallet rows are still in history. Payment from Wallet: 400 VALIDATION_ERROR. Payment to Telecom: 400 INVALID_TARGET_ACCOUNT. Opening balance: 400 VALIDATION_ERROR. Transaction count unchanged after each rejection. |
| **TEST-09.7** | AC-09.7 | A | Wallet archived (from TEST-09.6 state) | PATCH Wallet `{ name: "Old wallet" }`; PATCH `{ isArchived: false }`; POST a Payment from it to Dining 100.00 THB; PATCH `{ isArchived: false }` again | Rename 200 while archived; unarchive 200 `isArchived: false`; Payment 201; repeating the unarchive returns 200 and changes nothing. |
| **TEST-09.8** | AC-09.8 | A | Bob logged in; Alice's Wallet id; Admin logged in | Bob PATCHes Alice's Wallet `{ name: "Mine" }` and `{ isArchived: true }`; Admin POSTs and PATCHes; anonymous POSTs and PATCHes | Bob: 404 NOT_FOUND both times, Alice's Wallet unchanged. Admin: 403 FORBIDDEN. Anonymous: 401 UNAUTHENTICATED. No account created or changed. |
| **TEST-09.9** | AC-09.9 | E | Alice logged in | Open `/accounts`; submit New account with an empty name; create `Savings` (Cash, Bank); rename it `Savings 2`; archive it (read the confirmation); open `/transactions/new`; unarchive it; open `/transactions/new` again | Empty name shows "Enter a name." and no POST is sent; `Savings` appears under Cash; the confirmation shows its balance 0.00 ฿; while archived it is under Archived and not in the form's source list; after unarchive it is offered again as a source. |
| **TEST-09.10** | AC-09.10 | E | Alice logged in; viewport 360 × 800 | Open `/accounts` with the accounts request delayed, then failing, then retried; create an account at 360 px | Skeleton rows while loading; the error banner with Retry, and Retry renders the list; no Archived section when nothing is archived; the form fits 360 px without horizontal scrolling and the create succeeds. |

---

## 5. Definition of done (F-09)

- Every AC above has an executed automated test with results recorded per Sprint 2 README §5.
- Failing-first evidence is retained for AC-09.2 (subtype rule), AC-09.3 (unique name), AC-09.5 (type and subtype fixed) and AC-09.6 (archiving keeps the balance and blocks new use).
- `ACCOUNT_NAME_EXISTS` is returned for a concurrent duplicate (unique violation mapped to 409), checked by an API test that sends two creates in parallel.
- The NFR-02 route-list test includes `POST /accounts` and `PATCH /accounts/:id`.
- System-Level SDS §3 (Accounts screen), §4 (both endpoints) and §5 (account management row) are updated in the implementation PR.
- The Sprint 2 DoD in [README.md](README.md) §5 is met.
