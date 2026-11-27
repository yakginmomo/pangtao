# Sprint 3 Release Record: v0.3.0 (Deliverable 2 checkpoint candidate)

Issue #79 · Related: [Sprint 3 README](README.md) §3 (demonstration journey), §4 (checkpoint candidate), §7.2 · [F-15 contract](f-15-favorites-duplicate.md) · [Requirements traceability](../../traceability.md) §5 · Previous release: [v0.2.0](../sprint-2/release-v0.2.0.md)

This record identifies the Sprint 3 checkpoint release that carries F-15 to `main` and Cloud Run (Deliverable 2 Parts C and E).

---

## 1. Release identification

| Item | Value |
|---|---|
| Tag | `v0.3.0` (annotated) |
| Commit | `b02370888fd994c5cc7e3276b60d92c138bddf0e` (`b023708`), merge of release PR #84 (`sprint-3-staging` → `main`, head `d0bc6fd`), 27 Nov 2026 12:58 Bangkok; approved by the other student before merge |
| Deploy workflow run | [Deploy demo 45948980771](https://github.com/yakginmomo/pangtao/actions/runs/45948980771), push to `main` at `b023708`, success |
| Cloud Run revision | `pangtao-00012-29s`, serving 100% of traffic after the deploy (deploy log, 27 Nov 13:04 Bangkok) |
| Public URL | https://pangtao-vowtduxdha-as.a.run.app |
| Previous release | `v0.2.0`, `0d66ae2`, revision `pangtao-00011-28l` |

### 1.1 Contents

| Work | Issue | Merged into `sprint-3-staging` |
|---|---|---|
| F-15 Favorites and duplicate (contract 1.0; F-07 1.4) | #73 | PR #81, `49018bc` (RED `1764d74`, GREEN `84d41bd`, `fee71b1`) |
| Sprint 3 README 1.0 and contracts F-14 1.0 to F-18 1.0 | #72 | PR #72 |
| Sprint 2 release record (`v0.2.0`) | #78 | PR #82, `2c8bd62` |
| Sprint 3 remaining-work status | #79 | PR #83, `d0bc6fd` |

F-14, F-16, F-17 and F-18 are **not** in this release (planned; Sprint 3 README §7.2).

### 1.2 Checks in the deploy run on `b023708`

| Job | Result |
|---|---|
| Lint, type-check, build | passed |
| Unit and API tests | 204 passed, 0 failed, 0 skipped (24 files); all-files line coverage 96.07%, coverage gate passed |
| End-to-end tests | 35 passed, 0 failed, 0 skipped |
| Docker image build | passed |
| Deploy, then smoke test (`deploy/smoke_test.py`) | `PASS /api/v1/health`, `PASS /`; login check **skipped** (smoke credentials not configured) |

No test failed or was skipped in the suites; the only skip is the smoke login check, as in `v0.2.0`. No defect is open against F-15.

---

## 2. Post-deploy checks on `pangtao-00012-29s`

### 2.1 Anonymous checks (recorded)

Run on 27 Nov 2026 at 13:10 Bangkok (06:10:45 UTC) with `curl` against the public URL. These checks write nothing.

| ID | Check | Expected | Actual |
|---|---|---|---|
| PD3-1 | `GET /api/v1/health` | 200 | 200 |
| PD3-2 | `GET /api/v1/transactions?favorite=true` (F-15), no session | 401 `UNAUTHENTICATED` | 401 `UNAUTHENTICATED` |
| PD3-3 | `GET /api/v1/transactions?favorite=yes`, no session | 401 (authentication runs before validation) | 401 `UNAUTHENTICATED` |
| PD3-4 | `GET /api/v1/accounts`, no session | 401 | 401 `UNAUTHENTICATED` |

Every 401 body was `{"error":{"code":"UNAUTHENTICATED","message":"Authentication required"}}`, with no private data.

### 2.2 F-15 journey (Sprint 3 README §3 steps 2, 5 and 6)

Run by Supichaya on 27 Nov 2026 in the browser on the public URL (`pangtao-837912025702.asia-southeast1.run.app`, the same service; revision `pangtao-00012-29s`), on Alice's ledger as the `v0.2.0` checks left it (no reset; §2.3 item 1). Evidence: screenshots in [evidence/release-v0.3.0/](evidence/release-v0.3.0/README.md). Times of day were not recorded.

**Starting state:** Alice's History lists the 10 transactions of the Sprint 2 end state, including the card charge `b58f4921` (1,400.00, Voided) and the two 1.00 Payments ([release-v0.2.0.md](../sprint-2/release-v0.2.0.md) §2.3). The data survived the deploy to the new revision.

| ID | Check | AC | Expected | Actual | Result |
|---|---|---|---|---|---|
| PD3-5 | Star the 30,000.00 Salary receipt (`ce6627fb…`) in History | AC-15.1, 15.9 | Star filled on that row only | Star filled on the 30,000.00 Salary receipt only; other rows unstarred; voided rows show no star button (screenshot 01) | PASS |
| PD3-6 | Duplicate the Salary receipt | AC-15.6 | Form pre-filled with kind, account, total, lines; date today; nothing saved before Save | `/transactions/new?duplicateOf=ce6627fb…`: "Copied from Receipt of 30,000.00 ฿ on 27 Nov 2026", Receive, Bank Account, 11/27/2026, 30000.00, line Salary 30000.00, "Fully allocated" (screenshot 02) | PASS |
| PD3-7 | Save the copy | AC-15.7, 15.9 | New transaction without a star; original unchanged and still starred | History lists 11 transactions: the new 30,000.00 Receipt at the top with an empty star; the original 30,000.00 Receipt keeps its star (screenshot 03) | PASS |
| PD3-8 | Step 5: mark the voided card charge `b58f4921` as favorite | AC-15.4 | 409 `TRANSACTION_VOIDED` | Console `favorite voided 409 TRANSACTION_VOIDED`; the row still shows no star (screenshot 04) | PASS |
| PD3-9 | Step 6: Bob unmarks Alice's Salary receipt (`PATCH …/ce6627fb…/favorite`, Incognito) | AC-15.5 | 404; Alice's flag unchanged | `running as bob@example.test`, `bob favorite 404` (screenshot 06). The first attempt sent the placeholder id and got 400 (§2.3 item 2) | PASS (re-run) |
| PD3-10 | Step 6: anonymous caller | AC-15.5 | 401 | PD3-2, PD3-3 | PASS |
| PD3-11 | Favorites page and persistence: Alice logs out and in again | AC-15.3, 15.9 | Favorites lists the Salary receipt (no "Edited"); History still has 11 transactions with the star on the original | Favorites (`/favorites`): one row, the 27 Nov 2026 Receipt 30,000.00 into Bank Account, with "Remove from favorites" and Duplicate, no "Edited", "Showing 1–1 of 1" (screenshot 07). History: 11 transactions, the copy at the top without a star, the star on the original only (screenshot 08). Bob's refused PATCH (PD3-9) left the flag set | PASS |

### 2.3 Deviations

1. **Journey step 2 adapted.** The README journey stars both the Salary receipt and the 1,400.00 card charge and duplicates the card charge. The card charge was voided during the `v0.2.0` checks ([release-v0.2.0.md](../sprint-2/release-v0.2.0.md) §2.3 item 2) and the ledger was not reset, so it cannot be newly starred (that is step 5's rejection, PD3-8). Step 2 was run on the Salary receipt alone. The multi-line copy (two lines, Dining and Groceries) is covered by TEST-15.6 and TEST-15.9 in the deploy run, not on the deployed revision.
2. **PD3-9 first attempt returned 400.** The snippet was run with the literal placeholder `<id ของ Salary>` instead of the id, so the path parameter failed UUID validation before any ownership check (screenshot 05). This is a procedure error, not a defect. It was re-run with `ce6627fb-f468-49df-a84b-b86d311f0579` (the id in screenshot 02's URL) and returned 404. Neither request changed the flag: both use `isFavorite: false` and were refused.
3. **Sprint 1 and Sprint 2 journeys not re-run.** They need a reset of Alice's ledger (open action in [release-v0.2.0.md](../sprint-2/release-v0.2.0.md) §3). Regression on this revision rests on the full suite in the deploy run (§1.2), including every Sprint 1 and 2 API and E2E test, and on the Sprint 2 data being intact after the deploy. The full re-run on a reset ledger is planned for `v1.0.0` (Sprint 3 README §3).
4. **Alice's ledger now holds a second 30,000.00 Receipt** (the PD3-7 copy, dated 27 Nov 2026). Month income on the Dashboard is therefore 60,000.00 until it is voided or the ledger is reset.

---

## 3. Closing actions

- [x] Release PR #84 reviewed by the other student and merged to `main` (`b023708`).
- [x] Tag `v0.3.0` on `b023708`.
- [x] Revision ↔ commit ↔ workflow run recorded (§1).
- [x] Anonymous post-deploy checks recorded (§2.1).
- [x] F-15 journey PD3-5 to PD3-11 recorded as passed, including the Favorites page and persistence (§2.2).
- [x] F-15 marked **accepted** in Sprint 3 README §7.2 and traceability §1 and §5.
- [ ] Close Issues #73 and #79.
- [ ] Reset Alice's ledger before the `v1.0.0` journey (§2.3 items 3 and 4).
