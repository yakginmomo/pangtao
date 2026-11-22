# Pangtao Sprint 1 UAT Plan and Handoff (Lab 6, Part A)

Pangtao is a personal money and expense ledger (CPE 334 Theme 7, Personal Finance). This document gives the UAT Team what it needs to test the delivered Sprint 1 release without help from us: the release under test, the scope, the accounts, how data is prepared and reset, and eight executable cases with expected results. Section 7 holds the UAT Team's forms (Parts B to D), transcribed from the UAT Team's own signed record; section 8 is the Product Team's triage of the findings it receives (Part C).

| Item | Value |
|---|---|
| Product Team | ผิงโหด: Chawin (67070501012), Supichaya (67070501087) |
| UAT Team | ปลวกแดง: Thanabun (67070501021), Siriwan (67070501075) |
| Repository | https://github.com/yakginmomo/pangtao |
| Sprint 1 baseline | Tag `v0.1.0` = commit `bec5575` (release PR #20, 13 Nov 2026) |
| Release under test | `main` at `64c98f4` (PR #40, 17 Nov 2026), deployed by the **Deploy demo** workflow |
| Deployed revision | Cloud Run service `pangtao`, revision `pangtao-00006-cjx`, image tag `64c98f4fcd293fb67f0d32b1db75943dfbf2c749`; digest `asia-southeast1-docker.pkg.dev/cpe334-th-028-p7/pangtao/pangtao@sha256:0c479894775aa1ac88e0aff965f1e59af94436193f422541f44397f7cb78ff45` |
| URL | https://pangtao-vowtduxdha-as.a.run.app |
| Visible version marker | The login page subtitle reads **"Log in to your Pangtao account (67)"**. If it does not, stop and tell the Product Team: you are not on the release under test |
| Contracts | `docs/sprints/sprint-1/README.md` (conventions, error codes) and `f-01` to `f-08` in the same folder |

## 1. What changed between `v0.1.0` and the release under test

Only Lab 5 delivery work; no Sprint 2 or 3 feature is on `main`.

| Change | Effect on Sprint 1 behavior |
|---|---|
| Container, CI, Cloud Run deployment (Lab 5) | None; same API and screens |
| Failed-login counter moved from memory to the `login_attempts` table (F-01 v1.5) | Same rule (AC-01.12), now kept across restarts and instances |
| `TRUST_PROXY` setting for the login limit (Lab 5) | Same key (client IP + email); behind Cloud Run the client IP is now the real client instead of the proxy |
| Interactive transactions wait up to 5 s for a database connection (`898b62e`) | None when the database is idle; a save that met a briefly busy connection pool no longer fails with a server error |
| Login subtitle marker "(67)" (PR #40) | Text only; identifies the deployed release |

## 2. Accepted-for-test scope

In scope: Sprint 1 features F-01 to F-08 as far as a user can reach them through the web app.

| Feature | What a tester can check | Cases |
|---|---|---|
| F-01 Authentication | Login, generic failure message, role landing page, logout, route guards, anonymous API denial | UAT-01 |
| F-02 Admin user management | Users list without financial data, disable/enable with session revocation, no self-disable | UAT-07, UAT-08 |
| F-03 Accounts and balances | Dashboard groups, derived balances, negative balance label | UAT-02, UAT-03, UAT-05 |
| F-04 Opening balance | Set once per account, 0 allowed, second attempt and invalid inputs rejected | UAT-02, UAT-06 |
| F-05 Payment and charge | Split payment, card charge, card repayment, allocation rules, amount and date limits | UAT-03, UAT-04 |
| F-06 Received money | Split receipt into Cash, Income targets only | UAT-03, UAT-04 |
| F-07 Transaction history | Newest-first list, split lines, detail page, another user's record hidden | UAT-05, UAT-06 |
| F-08 Income and expense summary | Totals, repayment and openings excluded, date presets, invalid range | UAT-03, UAT-05 |

Not testable through the UI in Sprint 1, so not part of this UAT. Each is covered by the automated suite that CI runs on every release (Unit and API tests, End-to-end tests).

| AC | Why it cannot be reached by a user |
|---|---|
| AC-04.9 (Loan Given opening), AC-04.10, AC-05.12, AC-05.13 (archived part), AC-06.10, AC-06.11 (archived part) | No Loan Given or archived account exists; creating and archiving accounts is F-09 (Sprint 2) |
| AC-08.4 (voided transactions ignored) | Voiding is F-13 (Sprint 2) |
| AC-01.6 (8-hour session expiry) | Requires waiting 8 hours |
| AC-01.10, AC-01.11, AC-01.13, AC-03.5 | Password storage, forced server errors, CSRF headers and engine equivalence are server internals |
| AC-01.1 (cookie flags and password-hash exclusion), AC-01.3, AC-01.4, AC-01.5 | HttpOnly/SameSite attributes, malformed JSON payloads and replaying a deleted cookie are not observable through the browser UI; the automated API suite covers them. The browser-visible half of AC-01.1 (successful login and role landing) is in UAT-01 |
| AC-02.7, AC-02.9 | Bad UUIDs and repeated disable/enable have no reachable UI control (the button flips to the opposite action); automated API suite only |
| AC-03.6 (loading skeletons and error-retry state only), AC-07.6 (error state only) | Transient loading and injected-error states cannot be reproduced by a manual user; the rendered figures, negative-balance label and empty history state are checked in UAT-02, UAT-05 and UAT-06 |
| AC-04.5, AC-04.8, AC-05.5, AC-05.7, AC-06.7 | Income/Expense accounts have no opening-balance button, and the source/target lists only offer the caller's own allowed account types, so another user's account id and a zero-line payload cannot be submitted through the UI; automated API suite only |
| AC-07.2, AC-07.7 | The seeded ledger has only 7 rows, so limit/offset pages and invalid pagination cannot be demonstrated through the UI; automated API suite only |
| AC-01.12 (login rate limit) | Testing it blocks that email from your network for 15 minutes and stalls the session; please do not attempt it |

Sprint 2 and 3 features (account management, loans, transfers, editing, search, reports, admin create user) are out of scope. A request for them is an enhancement, not a defect.

## 3. Accounts

Credentials are sent privately through the agreed course channel; no password appears in this document or in Git. All three accounts share one synthetic seed password.

| Label | Email | Role | Used in |
|---|---|---|---|
| ADMIN | `admin@example.test` (display name "System Admin") | Administrator | UAT-01, UAT-07, UAT-08 |
| USER-A | `alice@example.test` ("Alice User") | User | UAT-01 to UAT-07 |
| USER-B | `bob@example.test` ("Bob User") | User | UAT-06 to UAT-08 |

Each User owns the same nine seeded accounts: **Wallet**, **Bank Account** (Cash); **Credit Card** (Debt); **Salary**, **Interest Earned** (Income); **Dining**, **Groceries**, **Electricity**, **Telecom** (Expense). There is no Loan Given account, so the "Owed to Me" section is always empty.

Login safety: 10 failed logins for one email from one client IP within 15 minutes block that email from that IP for 15 minutes; a successful login clears the count (AC-01.12). The plan has three deliberately failed logins (UAT-01 steps 2 and 3, UAT-08 step 6), each with a different email. Copy the password from the private handoff rather than typing it.

## 4. Data setup, sequence and reset

### 4.1 Starting state (Product Team, before every session)

USER-A and USER-B start with **no transactions**: every balance is 0.00 ฿, History shows "No transactions recorded yet.", and both users are Active. Sprint 1 has no way to delete a transaction or an opening balance from the app (that is F-12 and F-13, Sprint 2), so the Product Team resets the data before each UAT session (initial run and retest) with this SQL in Cloud SQL Studio on the production database:

```sql
BEGIN;
-- Allocation lines are removed with their transactions (ON DELETE CASCADE).
DELETE FROM transactions
 WHERE user_id IN (SELECT id FROM users WHERE email IN ('alice@example.test', 'bob@example.test'));
DELETE FROM sessions
 WHERE user_id IN (SELECT id FROM users WHERE email IN ('alice@example.test', 'bob@example.test'));
DELETE FROM login_attempts WHERE email IN ('alice@example.test', 'bob@example.test', 'admin@example.test');
UPDATE users SET is_active = true WHERE email IN ('alice@example.test', 'bob@example.test');
COMMIT;
```

The reset touches only the synthetic seed users' ledger data; accounts, passwords and the admin are unchanged. The Product Team then logs in as USER-A and USER-B, confirms the starting state above, logs out, and tells the UAT Team the time of the reset. The Product Team does not deploy during a UAT session and announces any deployment in advance.

### 4.2 Sequence

The cases share USER-A's ledger, so run them **in order, UAT-01 to UAT-08, in one session**. Expected balances in each case assume every earlier case ran exactly as written. UAT-04 must save nothing; if it does save something, record the failure, and later expected figures will be off by that amount (note this in the actual result rather than marking later cases FAIL for the same cause).

If a case cannot continue (for example the release is unreachable), record BLOCKED with the reason and contact the Product Team; a re-run needs a reset first.

### 4.3 Dates and notation

- **T** = today's date in Bangkok time on the day of the session. Every date field defaults to T.
- **M1** = the first day of the current month (on the 1st, M1 = T).
- Amounts are typed in THB as shown (for example `450.50`); the app stores integer satang and displays `1,250.50 ฿`.
- Dates are displayed as `01 Nov 2026`.

### 4.4 Browser

Any current desktop Chrome, Edge or Firefox. UAT-06 and UAT-08 need two separate sessions at once: use two different browsers, or one normal and one private window. After the session, log out everywhere; the Product Team then runs the reset in §4.1.

## 5. Case summary

| ID | Title | Lab category | Role | Requirements / AC |
|---|---|---|---|---|
| UAT-01 | Login, role landing and logout | Supporting (access foundation) | ADMIN, USER-A | FR-01–03; AC-01.1, 01.2, 01.7, 01.14 |
| UAT-02 | Opening balances and Dashboard | Business rule (BR-11) | USER-A | FR-08, FR-10; AC-03.1, 03.6, 04.1, 04.2, 04.4, 04.6, 04.7 |
| UAT-03 | Salary, split spending, card charge and card repayment | **Normal domain journey** | USER-A | FR-12, FR-13, FR-22; AC-05.1–05.3, 05.9, 06.1, 06.2, 06.8, 03.3, 03.4, 08.1–08.3 |
| UAT-04 | Allocation, amount, date and target rules | **Business rule / boundary** | USER-A | BR-04–06, 10, 16; AC-05.4, 05.6, 05.8, 05.11, 06.3–06.6, 06.9 |
| UAT-05 | History, detail, summary and persistence after re-login | **State / history / persistence** | USER-A | FR-17, FR-22, FR-25; AC-07.1–07.3, 07.6, 08.5, 08.7, 08.8 |
| UAT-06 | Another user's records stay private | **Forbidden ownership** | USER-B, USER-A | BR-01, D-03; AC-04.3, 07.4, 07.6, 08.9, 01.9 |
| UAT-07 | Administrator is denied financial data | **Forbidden role** | ADMIN, USER-A | BR-02; AC-01.8, 02.1, 02.2, 03.2, 07.5, 08.6 |
| UAT-08 | Disable and re-enable a user | State (session revocation) | ADMIN, USER-B | FR-05, FR-06; BR-03, BR-13; AC-02.3–02.6, 02.8 |

Balance figures used by the cases (USER-A), worked out in satang-exact THB:

| After | Wallet | Bank Account | Cash total | Credit Card (debt) | Income (month) | Expenses (month) | Net |
|---|---|---|---|---|---|---|---|
| Reset | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 |
| UAT-02 | 2,000.00 | 50,000.00 | 52,000.00 | 3,500.00 | 0.00 | 0.00 | 0.00 |
| UAT-03 step 1 (salary) | 2,000.00 | 80,500.00 | 82,500.00 | 3,500.00 | +30,500.00 | 0.00 | +30,500.00 |
| UAT-03 step 2 (Wallet spend) | −250.50 | 80,500.00 | 80,249.50 | 3,500.00 | +30,500.00 | 2,250.50 | +28,249.50 |
| UAT-03 step 3 (card charge) | −250.50 | 80,500.00 | 80,249.50 | 4,700.00 | +30,500.00 | 3,450.50 | +27,049.50 |
| UAT-03 step 4 (card repayment) | −250.50 | 76,500.00 | 76,249.50 | 700.00 | +30,500.00 | 3,450.50 | +27,049.50 |
| UAT-04 to UAT-08 | unchanged | unchanged | unchanged | unchanged | unchanged | unchanged | unchanged |

Check of the accounting invariant (AC-03.4) at the end of UAT-03: net worth = Cash − Debt = 76,249.50 − 700.00 = **75,549.50**; signed openings + income − expenses = (52,000.00 − 3,500.00) + 30,500.00 − 3,450.50 = **75,549.50**.

## 6. Cases

### UAT-01 Login, role landing and logout

- **Purpose:** Only valid credentials open a session; each role lands on its own home; logout ends the session.
- **Role:** ADMIN, USER-A. **Preconditions:** Logged out. Starting state as §4.1.
- **Inputs:** USER-A email with wrong password `Wrong-Pass-1`; unknown email `nobody@example.test` with password `Wrong-Pass-1`; correct USER-A and ADMIN credentials; four API URLs opened with no session.

| # | Action | Expected result |
|---|---|---|
| 1 | Open the URL | Redirected to `/login`. Subtitle reads "Log in to your Pangtao account (67)" |
| 2 | Enter `alice@example.test` and `Wrong-Pass-1`, click **Log in** | Banner "Invalid email or password". Still on `/login` |
| 3 | Enter `nobody@example.test` and `Wrong-Pass-1`, click **Log in** | Exactly the same banner "Invalid email or password" (the app does not reveal which emails exist) |
| 4 | Log in as USER-A with the correct password | Dashboard at `/`. Top bar shows **Dashboard**, **History**, **Summary**, the name "Alice User" and **Log out** |
| 5 | Click **Log out** | Back on `/login` |
| 6 | Press the browser Back button | No Dashboard or balances are shown; the app returns to `/login` |
| 7 | Log in as ADMIN | Lands on `/admin/users` (Users screen), not the Dashboard. No Dashboard/History/Summary links in the top bar |
| 8 | Click **Log out** | Back on `/login` |
| 9 | In a private window (no session), open `<URL>/api/v1/accounts`, `<URL>/api/v1/transactions`, `<URL>/api/v1/summary/income-expense` and `<URL>/api/v1/admin/users` in the address bar, one at a time | Each returns HTTP 401 with `{"error":{"code":"UNAUTHENTICATED","message":"Authentication required"}}` and no user, account, transaction or summary data. This also covers the anonymous half of AC-02.2, 03.2, 07.5 and 08.6 |

### UAT-02 Opening balances and Dashboard

- **Purpose:** Record each account's starting balance once; the Dashboard derives balances from it; a second opening balance on the same account is rejected and changes nothing.
- **Role:** USER-A. **Preconditions:** UAT-01 done; USER-A has no transactions.
- **Inputs:** Bank Account 50,000.00 on M1; Wallet 2,000.00 on M1; Credit Card 3,500.00 on M1; second attempt on Bank Account 999.00.

| # | Action | Expected result |
|---|---|---|
| 1 | Log in as USER-A | Dashboard shows sections **Cash** (Wallet, Bank Account, each 0.00 ฿), **Debts** (Credit Card, 0.00 ฿) and **Owed to Me** (empty-state text "No loans given…"). Each of the three accounts has a **Set opening balance** button. Income/Expenses/Net widget shows 0.00 ฿ |
| 2 | Open a second tab on the same URL (Dashboard). Leave it as it is; call it Tab 2 | Tab 2 shows the same Dashboard with **Set opening balance** on Bank Account |
| 3 | In Tab 1, click **Set opening balance** on Bank Account. Before saving, try amount `-100`, then `100000000.01` (both with date M1), then `50000` with a date after T; click **Save opening balance** after each try. Finally enter `50000`, set the date to M1 and click **Save opening balance** | The first try is rejected with "Enter a valid amount in THB with at most 2 decimal places.", the second with "Amount must not exceed 100,000,000.00 THB.", the third with "Date cannot be later than today."; nothing is saved after any rejection. The final save succeeds: dialog closes, Bank Account shows **50,000.00 ฿** and "Opening balance 50,000.00 ฿ on _M1_"; its button is gone. Cash total 50,000.00 ฿ |
| 4 | In Tab 2 (do not reload), click **Set opening balance** on Bank Account. Enter `999`, keep the date, click **Save opening balance** | The dialog shows the error "This account already has an opening balance". Nothing else changes |
| 5 | Close the dialog in Tab 2 and reload Tab 2 | Bank Account still shows **50,000.00 ฿**, "Opening balance 50,000.00 ฿ on _M1_" (not 999.00 and not 50,999.00). Close Tab 2 |
| 6 | In Tab 1, set Wallet's opening balance: `2000`, date M1 | Wallet **2,000.00 ฿**, "Opening balance 2,000.00 ฿ on _M1_". Cash total **52,000.00 ฿** |
| 7 | Set Credit Card's opening balance: `3500`, date M1 | Credit Card **3,500.00 ฿** (amount owed) with its opening-balance text. Debts total **3,500.00 ฿** |
| 8 | Look at the Income/Expenses/Net widget | Still Income 0.00 ฿, Expenses 0.00 ฿, Net 0.00 ฿: opening balances are not income (BR-08) |

### UAT-03 Salary, split spending, card charge and card repayment (normal domain journey)

- **Purpose:** A month of normal use: receive salary, pay from cash across two categories, charge bills to the card, pay the card down. Balances and income/expense totals follow the money.
- **Role:** USER-A. **Preconditions:** UAT-02 done (Wallet 2,000.00, Bank Account 50,000.00, Credit Card 3,500.00). All dates T.
- **Inputs:** as in each step.

| # | Action | Expected result |
|---|---|---|
| 1 | Click **Record transaction**, choose the **Receive** tab. Received into: **Bank Account**. Total amount `30500`. Memo `UAT salary`. Line 1: **Salary** `30000`. Click **Add line**; line 2: **Interest Earned** `500`. Watch the allocation summary while typing, then click **Save receipt** | Before line 2: Total 30,500.00 ฿, Allocated 30,000.00 ฿, Remaining to allocate 500.00 ฿ ("Still to allocate"), **Save receipt** disabled. After line 2: Remaining 0.00 ฿ "Fully allocated", button enabled. After saving: back on the Dashboard; Bank Account **80,500.00 ฿** (50,000.00 + 30,500.00); widget Income **+30,500.00 ฿**, Net **+30,500.00 ฿** |
| 2 | **Record transaction** → **Payment** tab. Paid from: **Wallet**. Total `2250.50`. Memo `UAT dinner and groceries`. Line 1: **Dining** `450.50`; line 2: **Groceries** `1800`. Click **Save payment** | Saved; Dashboard. Wallet **-250.50 ฿** (2,000.00 − 2,250.50) with the label **"Negative balance"** (overdraft is allowed, D-02). Cash total **80,249.50 ฿**. Widget Expenses **2,250.50 ฿**, Net **+28,249.50 ฿** |
| 3 | **Record transaction** → **Payment**. Paid from: **Credit Card** (listed under "Credit cards and loans (charge)"). Total `1200`. Memo `UAT bills on card`. Line 1: **Electricity** `700`; line 2: **Telecom** `500`. Save | Saved. Credit Card **4,700.00 ฿** (3,500.00 + 1,200.00 owed). Cash unchanged (80,249.50 ฿). Widget Expenses **3,450.50 ฿** (card purchases count as expense on the charge date, BR-09), Net **+27,049.50 ฿** |
| 4 | **Record transaction** → **Payment**. Paid from: **Bank Account**. Total `4000`. Memo `UAT card repayment`. Line 1: **Credit Card** (listed under "Debts (repayment)") `4000`. Save | Saved. Bank Account **76,500.00 ฿**, Credit Card **700.00 ฿**. Cash total **76,249.50 ฿**, Debts total **700.00 ฿**. Widget unchanged: Income +30,500.00 ฿, Expenses **3,450.50 ฿**, Net **+27,049.50 ฿** (a repayment is not an expense, BR-09) |
| 5 | Click **View summary** (or **Summary**). Preset **This Month** | Total Income **+30,500.00 ฿**, Total Expenses **3,450.50 ฿**, Net Savings **+27,049.50 ฿**. Openings (55,500.00 in total) and the 4,000.00 repayment are not counted |

### UAT-04 Allocation, amount, date and target rules (business rule / boundary)

- **Purpose:** Invalid transactions cannot be saved, and the form only offers allowed accounts. Nothing in this case may change any balance.
- **Role:** USER-A. **Preconditions:** UAT-03 done. Write down the Dashboard figures before starting (they should match the "UAT-03 step 4" row in §5).
- **Inputs:** as in each step. Do **not** click Save except where a step says so.

| # | Action | Expected result |
|---|---|---|
| 1 | **Record transaction** → **Payment**. Paid from **Wallet**. Total `500`. Line 1 **Dining** `300` | Allocated 300.00 ฿, Remaining to allocate **200.00 ฿** "Still to allocate". **Save payment** disabled (BR-05) |
| 2 | **Add line**: **Groceries** `300` | Allocated 600.00 ฿, Remaining **-100.00 ฿** "Over-allocated". **Save payment** still disabled |
| 3 | Change line 2 to `200` | Remaining 0.00 ฿ "Fully allocated"; button enabled. Do not save |
| 4 | Set Total amount to `0` | Error under Total: "Enter an amount from 0.01 to 100,000,000.00 THB."; button disabled (BR-04: amounts must be positive) |
| 5 | Set Total to `100000000.01` | Same error (above the 100,000,000.00 THB limit) |
| 6 | Set Total to `12.345` | Same error (more than 2 decimal places; amounts are exact satang) |
| 7 | Set Total to `100000000`, line 1 `100000000`, remove line 2 (**Remove**) | No amount error at the exact limit; Remaining 0.00 ฿. **Do not save.** Then set Total back to `500` and line 1 to `500` |
| 8 | Open the Date calendar, then type the day after T into the Date field and click **Save payment** | Days after T cannot be picked in the calendar. With the typed date: error under Date "Date cannot be later than today." Nothing saved; still on the form (BR-10) |
| 9 | Set Date back to T. Change Paid from to **Credit Card**, open the line 1 target list | Only **Dining**, **Electricity**, **Groceries**, **Telecom** (Expenses) are offered. No Credit Card, Wallet, Bank Account or Income account (BR-06: a card charge targets expenses only in Sprint 1) |
| 10 | Change Paid from to **Wallet**, open the target list | Expenses plus **Credit Card** under "Debts (repayment)". Wallet itself is not offered (BR-06: no line to its own source) |
| 11 | Open the **Paid from** list | Only Wallet, Bank Account and Credit Card. No Income or Expense account (BR-16) |
| 12 | Switch to the **Receive** tab. Open **Received into** | Only Wallet and Bank Account (Credit Card is not offered, BR-16). Choose **Wallet** and open the line target list: only **Salary** and **Interest Earned** (no Expense account, BR-06) |
| 13 | Click **Back to dashboard** | Every balance and the Income/Expenses/Net widget equal the figures written down before step 1 |
| 14 | Open **History** | "Showing 1–7 of 7": nothing was saved by this case |
| 15 | Click **Record transaction**, choose the **Receive** tab. Received into: **Wallet**. Total `500`. Line 1: **Salary** `300` | Allocated 300.00 ฿, Remaining 200.00 ฿ "Still to allocate"; **Save receipt** disabled (AC-06.3) |
| 16 | **Add line**: **Interest Earned** `300` | Allocated 600.00 ฿, Remaining -100.00 ฿ "Over-allocated"; **Save receipt** still disabled. Change line 2 to `200` → Remaining 0.00 ฿ "Fully allocated"; do not save |
| 17 | Set Total to `0`, then `100000000.01`, then `12.345` | Each shows "Enter an amount from 0.01 to 100,000,000.00 THB." under Total; **Save receipt** disabled. Restore Total to `500` and line 2 to `200` (AC-06.9) |
| 18 | Set the Date to the day after T and click **Save receipt** | Error under Date "Date cannot be later than today."; nothing saved, still on the form (AC-06.6) |
| 19 | Set Date back to T, click **Back to dashboard**, then open **History** | Every balance and the Income/Expenses/Net widget still equal the figures written down before step 1; History still "Showing 1–7 of 7" |

### UAT-05 History, detail, summary and persistence after re-login (state / history / persistence)

- **Purpose:** Saved transactions persist in the database across sessions and appear in history newest first, with correct split lines and summary totals.
- **Role:** USER-A. **Preconditions:** UAT-03 and UAT-04 done.

| # | Action | Expected result |
|---|---|---|
| 1 | **Log out**. Close the browser completely, reopen it, and log in as USER-A | Dashboard shows exactly the figures after UAT-03 step 4: Wallet -250.50 ฿ (Negative balance), Bank Account 76,500.00 ฿, Credit Card 700.00 ฿ |
| 2 | Open **History** | "Showing 1–7 of 7", newest first: (1) Payment · Bank Account · 4,000.00 ฿ · "UAT card repayment"; (2) Payment · Credit Card · 1,200.00 ฿ · "UAT bills on card"; (3) Payment · Wallet · 2,250.50 ฿ · "UAT dinner and groceries"; (4) Receipt · Bank Account · 30,500.00 ฿ · "UAT salary"; (5) Opening Balance · Credit Card · 3,500.00 ฿; (6) Opening Balance · Wallet · 2,000.00 ฿; (7) Opening Balance · Bank Account · 50,000.00 ฿. Rows 1–4 dated T, rows 5–7 dated M1 |
| 3 | On row (3), click **Show 2 lines** | Lines **Dining 450.50 ฿** and **Groceries 1,800.00 ฿**; they add up to the row total 2,250.50 ฿. The button now reads **Hide lines** |
| 4 | Click the account name **Bank Account** on row (4) | Transaction detail page `/transactions/<id>`: badge Receipt, **30,500.00 ฿**, Date T, Source account Bank Account, Memo "UAT salary", Allocation lines **Salary 30,000.00 ฿** and **Interest Earned 500.00 ฿**. Write down the URL as **URL-A** |
| 5 | Click **Back to history**, then open **Summary**, preset **This Month** | Total Income **+30,500.00 ฿**, Total Expenses **3,450.50 ฿**, Net Savings **+27,049.50 ฿** (same as the Dashboard widget) |
| 6 | Choose preset **Last Month** | All three cards **0.00 ฿**: nothing was recorded last month (openings dated M1 are not in last month and are never income anyway) |
| 7 | Choose **Custom**, set the start date to T and the end date to the day before T | Message "The start date must be on or before the end date." appears; no new totals are shown for the invalid range (AC-08.5) |
| 8 | Set Custom start M1, end T | Same totals as step 5 |
| 9 | Open `<URL>/api/v1/summary/income-expense` in the address bar with **no query string** | JSON `{"from":"<M1 as YYYY-MM-DD>","to":"<T as YYYY-MM-DD>","income":3050000,"expense":345050,"net":2704950}` — integer satang, i.e. +30,500.00 ฿ / 3,450.50 ฿ / +27,049.50 ฿, the same totals as step 5. With no `from`/`to` the API defaults to the current Bangkok calendar month (AC-08.8) |

### UAT-06 Another user's records stay private (forbidden ownership)

- **Purpose:** A User can never see or reach another User's records, even with the exact URL, and their totals never mix.
- **Role:** USER-B, then USER-A. **Preconditions:** UAT-05 done. USER-B has no transactions. Use two browsers (or a normal and a private window).
- **Inputs:** USER-B Wallet opening balance 0.00 on M1; USER-B receipt 1,000.00 into Wallet, Salary, memo `UAT bob private`.

| # | Action | Expected result |
|---|---|---|
| 1 | Browser 2: log in as USER-B, then open **History** | Dashboard: Wallet, Bank Account, Credit Card all **0.00 ฿**. None of USER-A's balances appear. Widget 0.00 ฿. History shows "No transactions recorded yet." (empty state, AC-07.6) |
| 2 | Set Wallet's opening balance to `0`, date M1 | Accepted: Wallet shows "Opening balance 0.00 ฿ on _M1_" and the button is gone (AC-04.3: zero is allowed for an opening balance only) |
| 3 | Record a receipt: Received into **Wallet**, total `1000`, memo `UAT bob private`, line **Salary** `1000`. Save | Wallet **1,000.00 ฿**. Widget Income **+1,000.00 ฿**, Expenses 0.00 ฿, Net **+1,000.00 ฿** |
| 4 | Open **History** | "Showing 1–2 of 2": the receipt and Wallet's opening balance. No "UAT salary", "UAT dinner…" or other USER-A rows |
| 5 | Open the receipt's detail page (click **Wallet** on its row). Copy the full URL as **URL-B** and note its id. Stay logged in | Detail of the 1,000.00 ฿ receipt with memo "UAT bob private" |
| 6 | Browser 1: logged in as USER-A, paste **URL-B** into the address bar | Transaction detail page shows **"Transaction not found."** No amount, memo, account or line of USER-B is shown |
| 7 | Still as USER-A, open `<URL>/api/v1/transactions/<id from URL-B>` in the address bar | JSON `{"error":{"code":"NOT_FOUND","message":…}}`. The response contains no amount, memo or account of USER-B (404 rather than 403, so existence is not revealed, D-03) |
| 8 | As USER-A, open **History** and **Summary** (This Month) | Still "Showing 1–7 of 7" with no "UAT bob private"; Income still **+30,500.00 ฿** (not 31,500.00), Expenses 3,450.50 ฿, Net +27,049.50 ฿ (AC-08.9) |
| 9 | Browser 2: as USER-B, reload **URL-B** and the Dashboard | The receipt is unchanged (1,000.00 ฿, "UAT bob private"); Wallet 1,000.00 ฿. Log out of Browser 2 |

### UAT-07 Administrator is denied financial data (forbidden role)

- **Purpose:** The Administrator manages users but can never see balances or transactions (BR-02); a User cannot use admin functions.
- **Role:** ADMIN, then USER-A. **Preconditions:** UAT-06 done; you have URL-B.

| # | Action | Expected result |
|---|---|---|
| 1 | Browser 2: log in as ADMIN | Users screen `/admin/users`: table with Name, Email, Role, Status, Created, Action. Rows for Alice User, Bob User and System Admin (marked "You"), ordered by name. No balance, account or transaction column or figure |
| 2 | Type `<URL>/` , then `<URL>/transactions`, `<URL>/summary`, `<URL>/transactions/new` and URL-B into the address bar, one at a time | Each one ends on `/admin/users`. No balance, history, summary, form or "UAT bob private" text is ever shown |
| 3 | Open `<URL>/api/v1/accounts` | JSON `{"error":{"code":"FORBIDDEN",…}}`. No accounts or balances in the response |
| 4 | Open `<URL>/api/v1/transactions` and `<URL>/api/v1/transactions/<id from URL-B>` | Both return `FORBIDDEN` error JSON with no transaction data |
| 5 | Open `<URL>/api/v1/summary/income-expense` | `FORBIDDEN` error JSON, no totals |
| 6 | Open `<URL>/api/v1/admin/users` | JSON object `{"items":[…],"total":3,"limit":…,"offset":0}`. Each entry in `items` has only `id`, `email`, `displayName`, `role`, `isActive`, `createdAt`. No password hash, balance or transaction field |
| 7 | Browser 1: as USER-A, type `<URL>/admin/users` | Page "403 - Not Permitted" with "You do not have permission to access this administrative resource." and **Return to Dashboard**. No user list |
| 8 | As USER-A, open `<URL>/api/v1/admin/users` | `FORBIDDEN` error JSON, no user list |

### UAT-08 Disable and re-enable a user (state: session revocation)

- **Purpose:** Disabling a user ends their open sessions at once and blocks login; re-enabling restores access with data intact; the Administrator cannot disable themself.
- **Role:** ADMIN (Browser 2), USER-B (Browser 1). **Preconditions:** UAT-07 done. ADMIN logged in on Browser 2.

| # | Action | Expected result |
|---|---|---|
| 1 | Browser 1: log out USER-A, log in as USER-B. Leave the Dashboard open | Wallet 1,000.00 ฿ |
| 2 | Browser 2 (ADMIN): look at the System Admin row | Its action button is disabled, with the tooltip "You cannot disable your own account" on hover (BR-03) |
| 3 | Click **Disable** on the Bob User row | Confirmation dialog: "This immediately signs them out of every active session and blocks further logins." |
| 4 | Click **Confirm** | Bob User's Status changes to **Disabled** without reloading; the button now reads **Enable** |
| 5 | Browser 1 (USER-B): click **History** (or reload the page) | USER-B is sent to `/login`; no balances or history are shown (BR-13) |
| 6 | Log in as USER-B with the correct password | Banner "Invalid email or password" (a disabled user gets the same generic message). This is the third and last deliberately failed login in the plan, and the only one for USER-B |
| 7 | Browser 2: click **Enable** on Bob User, then **Confirm** | Status **Active**; button reads **Disable** |
| 8 | Browser 1: log in as USER-B | Dashboard opens. Wallet still **1,000.00 ฿** with its 0.00 ฿ opening balance; History "Showing 1–2 of 2". Disabling deleted no data |
| 9 | Log out of both browsers | Both on `/login`. Tell the Product Team the session is over so it can run the reset (§4.1) |

## 7. Forms for the UAT Team

Filled from the UAT Team's own records in `ssiriwan/cpe334-approval-system`, branch `lab5-staging` at commit `90e9fac` (22 Nov 2026): [`execution-results-partner.md`](https://github.com/ssiriwan/cpe334-approval-system/blob/90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f/docs/labs/lab-06/execution-results-partner.md) (execution and finding) and [`acceptance.md`](https://github.com/ssiriwan/cpe334-approval-system/blob/90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f/docs/labs/lab-06/acceptance.md) (signed decision, §1 "Decision A"). The results, verdicts and evidence IDs are theirs. Their evidence files are in that repository under `docs/labs/lab-06/evidence/`. They executed this document as merged in PR #41 (branch `chore/lab6-uat-doc`). Initial run: 22 Nov 2026, 16:15–16:25. Retest run on the reset database: 21:35–21:40 (Bangkok).

### 7.1 Execution record (one row per case; Part B)

Record what you actually saw, in your own words and figures; do not copy the expected result. A case is PASS only if every step matched; otherwise give the first step that did not. BLOCKED is not a pass: give the reason.

| Case | Tester (name, team) | Date and time (Bangkok) | Version checked (subtitle "(67)", commit) | Inputs used | Actual result | Failed or blocked step | PASS / FAIL / BLOCKED | Evidence IDs |
|---|---|---|---|---|---|---|---|---|
| UAT-01 | Siriwan (ปลวกแดง) | 2026-11-22 21:35 | Subtitle "(67)", commit `64c98f4` | Wrong password, unknown email, valid Alice and Admin credentials, anonymous API calls | Subtitle "(67)" confirmed. Wrong password and unknown email both got a generic 401. Alice lands on `/` and Admin on `/admin/users`. Logout revokes the cookie. Every anonymous API call returns 401 `UNAUTHENTICATED` | None | PASS | `EV-UAT-00`, `EV-UAT-01-a`, `EV-UAT-01-b` |
| UAT-02 | Thanabun (ปลวกแดง) | 2026-11-22 21:35 (retest after the database reset, see `UATF-01`) | Subtitle "(67)", commit `64c98f4` | Bank Account 50,000, Wallet 2,000, Credit Card 3,500; negative amount, future date, duplicate attempt | Clean start: 0.00 ฿ on every account, no opening balance. Bank Account opening 50,000.00 ฿ saved (201). The duplicate was rejected with 409 `OPENING_BALANCE_EXISTS`. Wallet 2,000.00 ฿ and Credit Card 3,500.00 ฿ openings saved (201). Negative amount rejected with 400 `VALIDATION_ERROR`. Future date rejected with 400 `FUTURE_DATE_NOT_ALLOWED` | None (the initial run was blocked at step 3 by `UATF-01`; resolved on retest) | PASS | `EV-UAT-02-a`, `EV-UAT-02-b`, `EV-UAT-02-c` |
| UAT-03 | Siriwan (ปลวกแดง) | 2026-11-22 21:35 | Subtitle "(67)", commit `64c98f4` | Receipt into Bank Account 30,500 (Salary 30,000 + Interest 500); payment from Wallet 2,250.50 (Dining 450.50 + Groceries 1,800); payment from Credit Card 1,200 (Electricity 700 + Telecom 500); payment from Bank Account 4,000 (card repayment) | All 4 transactions created (201). Wallet went to −250.50 ฿ with the "Negative balance" label. The card charge counted as expense; the card repayment did not. Month net +27,049.50 ฿. Ending balances match | None | PASS | `EV-UAT-03-a`, `EV-UAT-03-b`, `EV-UAT-03-c` |
| UAT-04 | Thanabun (ปลวกแดง) | 2026-11-22 21:35 | Subtitle "(67)", commit `64c98f4` | Allocation mismatch (500 vs 300); total 0; future date; Credit Card to Bank Account; Wallet to Wallet; receipt into Credit Card | Every invalid operation was rejected with 400: `INVALID_ALLOCATION_SUM`, `VALIDATION_ERROR`, `FUTURE_DATE_NOT_ALLOWED`, `INVALID_TARGET_ACCOUNT`, `INVALID_SOURCE_ACCOUNT`. Balances and history unchanged | None | PASS | `EV-UAT-04-a`, `EV-UAT-04-b` |
| UAT-05 | Siriwan (ปลวกแดง) | 2026-11-22 21:35 | Subtitle "(67)", commit `64c98f4` | Re-login as Alice; History; detail of row 4; summary presets; invalid custom range | Balances persisted after re-login. History shows 7 rows newest first with correct split lines. Row 4 detail (`e7cb1266…`) shows Salary 30,000 ฿ and Interest 500 ฿. The invalid custom range returned 400 `VALIDATION_ERROR` ("from must not be later than to") | None | PASS | `EV-UAT-05-a`, `EV-UAT-05-b` |
| UAT-06 | Thanabun (ปลวกแดง) | 2026-11-22 21:35 | Subtitle "(67)", commit `64c98f4` | Bob Wallet opening 0; Bob receipt 1,000 (Salary); Alice requests Bob's transaction | Bob starts at 0.00 on every account. Bob's 0 opening balance and 1,000.00 receipt saved (201). Alice requesting `/api/v1/transactions/<bob-id>` gets 404 `NOT_FOUND`. Alice's summary and history are unaffected | None | PASS | `EV-UAT-06-a`, `EV-UAT-06-b` |
| UAT-07 | Siriwan (ปลวกแดง) | 2026-11-22 21:35 | Subtitle "(67)", commit `64c98f4` | Admin login; Admin requests accounts, transactions and summary; Alice requests `/admin/users` | Admin lands on `/admin/users` with no financial links. Admin gets 403 `FORBIDDEN` on accounts, transactions and `summary/income-expense`. Alice gets 403 `FORBIDDEN` on `/admin/users`. The admin users list has 3 users and no financial fields | None | PASS | `EV-UAT-07-a`, `EV-UAT-07-b` |
| UAT-08 | Thanabun (ปลวกแดง) | 2026-11-22 21:35 | Subtitle "(67)", commit `64c98f4` | Admin disables self; Admin disables Bob; Bob's open session; Bob logs in; Admin re-enables Bob; Bob logs in again | Self-disable got 409 `CANNOT_DISABLE_SELF`. Disabling Bob succeeded (200). Bob's open session was revoked at once (401 `UNAUTHENTICATED`). Bob's login was rejected with the generic 401. After re-enable, Bob logs in; data and Wallet 1,000.00 ฿ intact | None | PASS | `EV-UAT-08-a`, `EV-UAT-08-b` |

Initial run (16:15–16:25): UAT-02 was **BLOCKED** at step 3 by `UATF-01` (§7.2), found at 16:17. Because the cases share USER-A's ledger (§4.2), the whole sequence UAT-01 to UAT-08 was re-run after the reset; the rows above are that retest. The UAT Team's record gives no separate per-case results for the initial run.

Product Team note on how the cases were executed (from the UAT Team's evidence log, §5 of their record; their verdicts are unchanged): the evidence items `EV-PRE-01` to `EV-UAT-08-b` are HTTP requests and responses timestamped 21:35:47–21:35:54, and the "(67)" marker was checked in the served JavaScript bundle. Steps that exist only in the browser UI (for example the disabled Save buttons and allocation messages in UAT-04, the two-tab check in UAT-02 steps 2–5, the client-side range message in UAT-05 step 7, and the disabled self-disable button in UAT-08 step 2) are not separately evidenced in their record.

Figures seen at the key steps (write what the screen showed):

| Checkpoint | Wallet | Bank Account | Credit Card | Income | Expenses | Net | History count |
|---|---|---|---|---|---|---|---|
| UAT-02 step 5 (after the rejected second opening balance; the UAT Team recorded it after all three openings were saved) | 2,000.00 ฿ | 50,000.00 ฿ | 3,500.00 ฿ | 0.00 ฿ | 0.00 ฿ | 0.00 ฿ | 3 |
| UAT-03 step 4 (end of the normal journey) | −250.50 ฿ (Negative balance) | 76,500.00 ฿ | 700.00 ฿ | +30,500.00 ฿ | 3,450.50 ฿ | +27,049.50 ฿ | 7 |
| UAT-04 steps 13–14 and 19 (after the rejected inputs; the UAT Team recorded it as "steps 1–11") | −250.50 ฿ | 76,500.00 ฿ | 700.00 ฿ | +30,500.00 ฿ | 3,450.50 ฿ | +27,049.50 ฿ | 7 (unchanged) |
| UAT-06 step 8 (USER-A after USER-B's receipt) | −250.50 ฿ | 76,500.00 ฿ | 700.00 ฿ | +30,500.00 ฿ | 3,450.50 ฿ | +27,049.50 ฿ | 7 (no USER-B data) |
| UAT-08 step 8 (USER-B after re-enable) | 1,000.00 ฿ | 0.00 ฿ | 0.00 ฿ | +1,000.00 ฿ | 0.00 ฿ | +1,000.00 ฿ | 2 |

Evidence: name screenshots `EV-UAT-NN-k` (case and step), with the time and the visible URL. Only the login page shows the version marker, so start each session (initial run and retest) with `EV-UAT-00`: the login page with the subtitle "(67)", the URL and the time. At minimum also capture:

- UAT-02 steps 4 and 5: the rejection, then Bank Account still 50,000.00 ฿ after reload (protected state unchanged)
- UAT-03 steps 4 and 5: the normal journey's balances and summary
- UAT-04 steps 13, 14 and 19: balances unchanged and "Showing 1–7 of 7" (nothing saved, including the Receive-form rejections)
- UAT-01 step 9 and UAT-05 step 9: one of the four 401 responses and the no-query summary JSON matching "This Month"
- UAT-06 steps 6 to 8: the rejection and USER-A's unchanged totals
- UAT-07 steps 2 and 3: admin denial

### 7.2 Finding report (one per failure; Part C)

Open a GitHub issue in `yakginmomo/pangtao` with the label `bug` and a title starting `UAT-NN`, or send the report through the agreed channel if you cannot. Include:

| Field | Content |
|---|---|
| Issue ID | GitHub issue number, or `UATF-k` (k = 1, 2, …) if sent through the agreed channel |
| Title | `UAT-NN step k: <what went wrong>` |
| Product (owning team) | Pangtao, team ผิงโหด |
| Reporter, team, date | |
| Tested version | Subtitle marker and commit |
| Linked case / requirement | `UAT-NN` step, AC id from §5 |
| Preconditions and data | Account used, earlier cases run, balances before the step |
| Steps to reproduce | Numbered |
| Expected result | From the case |
| Actual result | What you saw |
| Severity | **Critical**: money wrong, data lost, or another user's/financial data exposed; **Major**: a Sprint 1 requirement cannot be completed; **Minor**: wrong text or layout with a workaround and no wrong figure |
| Evidence | `EV-` IDs |
| Defect or enhancement | A defect breaks behavior in §5's ACs; a request for behavior outside Sprint 1 scope (§2) is an enhancement |

What severity means for acceptance: a **Critical** or **Major** defect blocks Sprint 1 acceptance until it is fixed, redeployed and independently retested by the UAT Team. A **Minor** defect is either fixed or explicitly accepted by the UAT Team as a documented known limitation.

Finding received (sent through the agreed channel, no GitHub issue):

| Field | Content |
|---|---|
| Issue ID | `UATF-01` |
| Title | UAT-02 step 3: Alice user account contains unreset opening balances from 2026-11-18, blocking clean opening balance creation |
| Product (owning team) | Pangtao, team ผิงโหด |
| Reporter, team, date | Thanabun Tikaew and Siriwan, team ปลวกแดง, 2026-11-22 |
| Tested version | Subtitle "(67)", commit `64c98f4fcd293fb67f0d32b1db75943dfbf2c749`, revision `pangtao-00006-cjx` |
| Linked case / requirement | UAT-02 steps 1 and 3; §4.1 starting state; AC-04.1 |
| Preconditions and data | Logged in as `alice@example.test`; §4.1 says to expect 0 transactions |
| Steps to reproduce | Not given separately in the report; UAT-02 steps 1 and 3 |
| Expected result | USER-A starts with no opening balances, so the Bank Account opening balance saves (UAT-02 step 3) |
| Actual result | At 16:17 Alice already had opening balances from 18 Nov, so the save returned 409 `OPENING_BALANCE_EXISTS` and blocked UAT-02 step 3 |
| Severity | Not given in the report; the Product Team classified it as Minor (operational) in §8 |
| Evidence | `EV-UAT-02-a`, `EV-UAT-02-b`, `EV-UAT-02-c` (retest) |
| Defect or enhancement | Not given in the report; the Product Team accepted it as a defect in the handoff (§8) |

### 7.3 Retest and acceptance record (Part D)

Retest each corrected finding (one row per finding):

| Issue ID | Original case and step | Corrected release (commit, subtitle marker) | Tester (name, team) | Date and time | Actual result | PASS / FAIL / BLOCKED | Evidence IDs |
|---|---|---|---|---|---|---|---|
| `UATF-01` | UAT-02 steps 1 and 3 | Same release, commit `64c98f4`, subtitle "(67)", revision `pangtao-00006-cjx`; no code change, the §4.1 reset was run on the deployed database | Thanabun (ปลวกแดง) | 2026-11-22 21:35 | Clean start (0.00 ฿, no opening balances). Bank Account, Wallet and Credit Card openings saved (201). Duplicate rejected (409 `OPENING_BALANCE_EXISTS`). Negative amount (400 `VALIDATION_ERROR`) and future date (400 `FUTURE_DATE_NOT_ALLOWED`) rejected | PASS | `EV-UAT-02-a`, `EV-UAT-02-b`, `EV-UAT-02-c` |

| Item | Value |
|---|---|
| Release tested for the decision | Commit `64c98f4fcd293fb67f0d32b1db75943dfbf2c749`, subtitle "(67)", Cloud Run revision `pangtao-00006-cjx`, image digest `sha256:0c479894775aa1ac88e0aff965f1e59af94436193f422541f44397f7cb78ff45`. The UAT Team's record labels this release "`v0.1.0`"; in this repository `v0.1.0` is the Sprint 1 baseline `bec5575`, and `64c98f4` (untagged) is that baseline plus the Lab 5 changes in §1. The commit, revision and digest identify the release that was accepted |
| Cases re-run | UAT-01 to UAT-08 on the reset database, 22 Nov 2026 21:35–21:40: all 8 PASS (evidence `EV-PRE-01`, `EV-UAT-00` to `EV-UAT-08-b`) |
| Open findings | None. `UATF-01` closed, PASS on retest |
| Decision | **Accepted** (8 of 8 PASS, 0 FAIL, 0 BLOCKED) |
| Conditions / accepted minor limitations | None |
| Recorded by | Thanabun Tikaew (67070501021) and Siriwan (67070501075), team ปลวกแดง, signed 22 Nov 2026 21:40 (Bangkok), release `64c98f4`, in their `acceptance.md` §1 (link above) |

The decision cannot be **Accepted** or **Accepted with documented minor limitations** while any Critical or Major finding is open, any corrected finding has not passed its retest, or any case is BLOCKED; record **Not Accepted** with the reason instead. Only the UAT Team records this decision.

## 8. Triage of received findings (Product Team; Part C)

Every finding received from the UAT Team gets one row, including findings later judged not to be defects. If none are received, the table keeps the single row "No findings received" with the date the UAT Team confirmed it. Before classifying a report as not-defect or enhancement, the Product Team reproduces it and ties the reason to the Sprint 1 contract (§5 AC ids); a failing Sprint 1 requirement is never relabelled as an enhancement.

| Issue ID | Case and step | Classification (accepted defect / duplicate of # / not-defect / enhancement) | Reason (contract reference and evidence) | Severity | Owner | Fix (branch, PR, release) | Status | Disposition |
|---|---|---|---|---|---|---|---|---|
| `UATF-01` (sent by the UAT Team through the agreed channel, 22 Nov 2026; no GitHub issue) | UAT-02 steps 1 and 3 (the starting state also affects UAT-03 to UAT-08, which share USER-A's ledger, §4.2) | **Accepted defect** against our handoff (§4.1 starting state), not against the product code | §4.1 promises that USER-A starts with no transactions and that the Product Team resets before every session. The UAT Team saw Alice with opening balances recorded on 18 Nov (Bank Account 1,000.67 ฿, Wallet 127.00 ฿, Credit Card 20.00 ฿), so UAT-02 step 3 returned `409 OPENING_BALANCE_EXISTS`. That response is the correct behaviour for a second opening balance (F-04, `opening-balance.service.ts`); the data was not reset. Evidence: partner `EV-UAT-02-a`, and `EV-UAT-06-a` showing Bob clean. The §4.1 SQL does cover opening balances (they are `OPENING_BALANCE` rows in `transactions`), so the script is sufficient; it was not run after the 18 Nov data was created | Minor (operational): no wrong figure or Sprint 1 behaviour, workaround is the reset, but it blocks UAT-02 until retested | Product Team (Chawin, Supichaya) | No code change, branch or PR. The §4.1 reset was run on the production database before the retest | Closed | The UAT Team re-ran UAT-01 to UAT-08 on the reset database on 22 Nov 2026 at 21:35 (UAT-02 PASS, evidence `EV-UAT-02-a` to `EV-UAT-02-c` in their record). The acceptance decision is theirs and is recorded in their document |
