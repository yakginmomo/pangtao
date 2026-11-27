# Evidence: v0.2.0 post-deploy checks

Screenshots for [release-v0.2.0.md](../../release-v0.2.0.md) §2.2–§2.3, taken by Supichaya on 27 Nov 2026 on the public URL (`pangtao-837912025702.asia-southeast1.run.app`, revision `pangtao-00011-28l`). Seeded synthetic users only; no passwords or cookies are visible.

| File | Check | Shows |
|---|---|---|
| `01-pd2-8-accounts-created.png` | PD2-8 | Savings, Loan from Mom, Loan to Bob created; Bank 79,200.00 |
| `02-sprint1-start-dashboard.png` | Start | Sprint 1 end state: Bank 79,200.00, card 400.00, month 30,000.00 / 1,200.00 |
| `03`, `04` | PD2-9 | Transfer form Bank → Savings 10,000.00; Dashboard Bank 69,200.00, Savings 10,000.00 |
| `05`, `06` | PD2-10 | Lend 2,000.00 to Loan to Bob; Bank 67,200.00, Loan to Bob 2,000.00 |
| `07`, `08` | PD2-10 | Receive 500.00 from Loan to Bob; Bank 67,700.00, Loan to Bob 1,500.00 |
| `09`, `10` | PD2-10 | Receive 5,000.00 into Wallet from Loan from Mom; Wallet 5,000.00, Loan from Mom 5,000.00 |
| `11-pd2-11-opening-dialog.png` | PD2-11 | Edit opening balance dialog, 55,000.00 on 01 Nov 2026 |
| `12`–`13` | PD2-12 | Card charge detail (1,200.00) and edit form (Dining 900.00, Groceries 500.00, total 1,400.00) |
| `14`–`15` | PD2-12 | Void confirmation for the 800.00 repayment; detail with Voided badge and "Voided on 27 Nov 2026" |
| `16-pd2-13-history.png` | PD2-13 | History, 8 transactions, repayment Voided, charge 1,400.00, opening 55,000.00 |
| `17-pd2-13-dashboard.png` | PD2-13 | Bank 73,500.00, Savings 10,000.00, Wallet 5,000.00, card 1,400.00, Loan from Mom 5,000.00, Loan to Bob 1,500.00; month 30,000.00 / 1,400.00 / 28,600.00 |
| `18-pd2-14-first-run-201.png` | PD2-14 (deviation) | Payment to Savings `[201]` (Savings still active); Bank → Bank `[400, INVALID_TARGET_ACCOUNT]` |
| `19-pd2-15-snippet-in-alice-session.png` | PD2-15 (deviation) | Bob snippet run in Alice's session: edit 400, void 200 (Alice voided her own charge) |
| `20-pd2-15-bob-404.png` | PD2-15 | Bob: edit 404, void 404 |
| `21-pd2-15-admin-403.png` | PD2-15 | Admin: `POST /accounts` 403, `GET /loans` 403 |
| `22-pd2-8-duplicate-409.png` | PD2-8 | Second `Savings`: `POST /accounts` 409, "You already have an account with this name."; Savings active, 10,001.00 |
| `23`–`25` | PD2-14 re-run | Archive confirmation; Savings under Archived (1) with Unarchive, 10,001.00; Bank 73,499.00 |
| `26-pd2-14-rerun-console-400.png` | PD2-14 re-run | `Savings archived? true`; payment to archived Savings 400 `INVALID_TARGET_ACCOUNT` |
| `27-pd2-15-rerun-bob-active-txn.png` | PD2-15 re-run | Incognito as Bob (`running as bob@example.test`): edit 404, void 404 on an active Alice transaction |
| `28-pd2-15-rerun-alice-history.png` | PD2-15 re-run | Alice's History after the re-run: 10 transactions, Salary receipt 30,000.00 still active, card charge 1,400.00 Voided, two 1.00 Payments from Bank Account (see release record §2.3 item 3) |
