# Part A evidence — Sprint 1 continuity on the candidate

This folder holds the reproducibility package for Part A of Deliverable 2. The assessed
candidate, counts and dates are recorded in
[`../part-a-sprint-1-continuity.md`](../part-a-sprint-1-continuity.md); this file only says how
to reproduce the evidence and what each file contains.

## Assessed version

| Item | Value |
|---|---|
| Candidate commit | `cad7d9d8fdccbe66573e515308470c315a5b183c` (`main`, PR #55) |
| Accepted Sprint 1 tag | `v0.1.0` = `bec5575c3ce434b4b1eac0899e734e513e672d9f` |
| Sprint 1 release accepted in UAT | `64c98f4fcd293fb67f0d32b1db75943dfbf2c749` |
| Run date | 26 Nov 2026, 21:13–21:18 Asia/Bangkok |
| Local runtime | Node v25.5.0, PostgreSQL 16 (`postgres:16-alpine` via `docker compose`) |
| CI runtime | Node 22, same commit, Deploy demo run `45834624485` |

## Prerequisites

1. Docker Desktop is running; `docker compose up -d db` has started the database on
   `localhost:5433`.
2. The repository is at the assessed commit with no product or test file modified. Confirm with
   `git status --short` (only unrelated local files may appear) and
   `git diff <commit> -- server web prisma tests` (must be empty).
3. `.env` exists with the local `DATABASE_URL` and `SEED_DEFAULT_PASSWORD` used by the seed.
   Neither value is copied into this repository or into any output file.
4. Dependencies are installed (`npm ci`) and Prisma is generated (`npx prisma generate`).
5. Apply the migrations and seed the synthetic users:

   ```powershell
   npx prisma migrate deploy
   npm run db:seed
   ```

6. Reset the two ledgers to the Sprint 1 starting state:

   ```powershell
   Get-Content docs/sprints/sprint-2/evidence/part-a/reset-ledger.sql |
     npx prisma db execute --stdin
   ```

## Commands

### 1. Full local gate

```powershell
npm run verify
```

Runs lint, type-check, the 137 unit and API tests with coverage, the production build and the
20 Playwright E2E tests. The recorded result is in `verify-output.txt`.

### 2. Scripted critical journey

Start the server in one terminal:

```powershell
npm run dev:server
```

In another terminal, load the seed password from `.env` without printing it, then run the
journey. It records 15 checks (A1–A15) and exits non-zero if any check fails.

```powershell
$pass = ((Get-Content .env | Where-Object { $_ -match '^SEED_DEFAULT_PASSWORD=' }) -join '').Substring(22)
$env:PANGTAO_PASS = $pass
node docs/sprints/sprint-2/evidence/part-a/continuity-journey.mjs |
  Out-File -Encoding utf8 docs/sprints/sprint-2/evidence/part-a/continuity-journey-output.json
```

Expected: every entry in `results` has `"pass": true`; balances Bank 7,920,000 and Credit Card
40,000 satang; summary income 3,000,000, expense 120,000, net 2,880,000 satang.

### 3. Persistence across a restart

Note the id of the fourth transaction (the card repayment) from the journey output, then stop
the server (Ctrl+C or stop the listener on port 8080), start it again with
`npm run dev:server`, and read the ledger through a new login:

```powershell
node docs/sprints/sprint-2/evidence/part-a/persistence-read.mjs <transaction-id> |
  Out-File -Encoding utf8 docs/sprints/sprint-2/evidence/part-a/persistence-output.json
```

Expected: `loginStatus` and `detailStatus` are 200, the transaction id and amount are unchanged,
and the balances still match step 2.

### 4. Reset after the run

```powershell
Get-Content docs/sprints/sprint-2/evidence/part-a/reset-ledger.sql |
  npx prisma db execute --stdin
```

The reset is required because Sprint 1 has no in-app delete; it removes only the synthetic
users' ledger rows.

## Files

| File | Contents |
|---|---|
| `continuity-journey.mjs` | Read-only-after-reset HTTP script for A1–A15. Takes `PANGTAO_PASS` from the environment; no credential is embedded. |
| `continuity-journey-output.json` | Recorded A1–A15 output from the 26 Nov 2026 run. |
| `persistence-read.mjs` | New-session read after a server restart; takes a transaction id as its argument. |
| `persistence-output.json` | Recorded restart output from the 26 Nov 2026 run. |
| `reset-ledger.sql` | Lab 6 §4.1 reset restricted to the two synthetic users. |
| `verify-output.txt` | Lint, type-check, test counts, coverage, build and E2E results, plus the CI and deployed-health record. |

## Boundaries

- The scripts are evidence helpers, not product code or part of the test suite. They are not
  imported by `src/` or `tests/`, and `npm run verify` does not run them.
- The run used synthetic seed users only (`alice@example.test`, `bob@example.test`,
  `admin@example.test`). No production data or real credential is stored here.
- The deployed checks were read-only (`GET /api/v1/health`) or used the disposable synthetic
  users. No customer data was touched.
