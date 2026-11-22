# Lab 6 - Partner execution of OUR UAT cases and additional cases (product: Approval System)

> **Testers:** Chawin and Supichaya (`yakginmomo/pangtao` UAT Team)
> **Case ownership:**
> - Chawin - `UAT-OUM-01`, `UAT-OUM-02`, `UAT-PB-01` to `UAT-PB-06`
> - Supichaya - `UAT-OUM-03`, `UAT-OUM-04`, `UAT-PB-07`, `UAT-PB-08`, `UAT-PB-09`
> **Product Team:** Oum (`67070501075`) and T (`67070501021`)
> **Cases source:**
> - `UAT-OUM-01..04`: [`uat-cases-for-partner.md`](./uat-cases-for-partner.md) - corrected version
>   (documentation commit `284533d`, 22 Nov 2026)
> - `UAT-PB-01..09`: written by the UAT Team from the Product Team's own Sprint 1 contract
>   (acceptance criteria, BR-04 and NFR-04), so a
>   failure is a defect against specified behavior, not an enhancement
> **Why the additional cases:** the instructor's Lab 6 clarification asks the UAT Team not only to
> execute the Product Team's cases, but also to check whether they cover the important Sprint 1
> requirements and acceptance criteria, suggest additional cases where necessary, and test boundary
> conditions, invalid inputs, access restrictions and unusual user actions.
> **Execution method:**
> - `UAT-OUM-01..04`: API-level automation against the public Cloud Run release, using the UAT
>   Team's automated runner. Every exchange was saved; login bodies were redacted and no
>   password, token or cookie value was written to any evidence file. UI screenshots were captured
>   afterwards with a headless-browser (Playwright) screenshot script.
> - `UAT-PB-01..09`: manual UI, browser `fetch` and `curl` execution with screenshots.
> **Time zone:** all times in this document are **Bangkok time (UTC+7)**, 22 Nov 2026. Evidence
> folder names (for example `uat-2026-11-22T09-04-25-620Z`) and timestamps inside the evidence files
> keep the tools' original UTC values (`Z`); add 7 hours to compare.
> **Handout:** this is the partner's execution of our Part A handoff; it is supporting evidence for
> our Lab 6 record (Part B/D), not a substitute for our own execution of the partner's cases.

---

## 1. Tested version

| Item | Value |
| :--- | :--- |
| Public URL | <https://sd3cdaba1-4d7hbszvwq-as.a.run.app> |
| Sprint 1 baseline | tag `v0.1.0-sprint1` (commit `f35ad24…`) |
| Running commit (from `GET /api/health`) | `f371c232715f1185bc46b64ea28335639ae8eabf` (also checked before the 18:19 additional-cases run, `E-PB-00`) |
| Deployed revision | Pre phase: `sd3cdaba1-00008-2pg` at 15:30 **as reported in the corrected handoff**. Post phase and additional cases: a **new revision after T's redeploy** (confirmed verbally by T, Product Team, before the 17:15 retest); the new revision **name was not supplied** and the API does not expose it - see §9 item 2 |
| UAT document version | corrected commit `284533d` (amount ceiling fixed to `10000000000.00`, `UAT-OUM-03` step 5 added) |
| Execution time (corrected run) | 2026-11-22 16:04 (cases 01-03 + `UAT-OUM-04` before snapshot) |
| Execution time (`UAT-OUM-04` after redeploy) | 2026-11-22 17:15 - health still reported commit `f371c23…` (same image, as the handoff specifies) |
| Execution time (screenshots of `UAT-OUM-01..04`) | 2026-11-22 18:11 |
| Execution time (additional cases) | 2026-11-22: `UAT-PB-03` 16:32, `UAT-PB-04` 17:31, `UAT-PB-01`, `02`, `05` to `09` 18:19-18:20 |
| Tester identity | Chawin and Supichaya (Pangtao UAT Team) |

Health preflight: `HTTP 200`, `{"status":"ok","commit":"f371c232715f1185bc46b64ea28335639ae8eabf",...}`.

### 1.1 Tester assignment

| Tester | Cases owned | Observations | Result at this point |
| :--- | :--- | :--- | :--- |
| **Chawin** | `UAT-OUM-01`, `UAT-OUM-02` | 20 | 20 PASS / 0 FAIL |
| **Chawin** | `UAT-PB-01` to `UAT-PB-06` | 6 | 4 PASS / 2 FAIL |
| **Supichaya** | `UAT-OUM-03`, `UAT-OUM-04` | 12 + 5 (after redeploy) = 17 | 17 PASS / 0 FAIL |
| **Supichaya** | `UAT-PB-07`, `UAT-PB-08`, `UAT-PB-09` | 3 | 3 PASS / 0 FAIL |
| **Total** | 13 cases | 46 | 44 PASS / 2 FAIL |

The `UAT-OUM` cases were executed with the automated runner in one 16:04 session; the table above
is the case ownership reported by the UAT Team, not a claim that each person typed every request
separately. Raw HTTP evidence is kept per run in `evidence/` and is not split per person - the
handout requires actual results and evidence IDs, not one file per tester.

---

## 2. Product Team's cases - results (`UAT-OUM-01..04`)

Format follows the handoff §6 template (ACTUAL results, not copies of the expected results).

| Case ID | Tester | Date/time (Bangkok) | Tested version | Inputs | ACTUAL result | PASS / FAIL / BLOCKED | Evidence IDs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-OUM-01` | Chawin | 2026-11-22 16:04 | `f371c23` / rev `sd3cdaba1-00008-2pg` | 1500.00 EQUIPMENT; Reviewer-A comment "Approved for UAT" | `POST /api/requests` → 201, `REQ-20261122-0005`, `PENDING`, assignee `t.reviewer@cpe334.local`; detail had 1 `SUBMITTED` entry; pending queue contained the request; Reviewer-A APPROVE → 200, `APPROVED`, `updatedAt` changed, new `APPROVED` entry with exact actor/comment; requester re-read shows `SUBMITTED -> APPROVED`. | **PASS** | `E-OUM-01a,b,c` |
| `UAT-OUM-02` | Chawin | 2026-11-22 16:04 | same | amount 0 / 10000000000.00; title `AB`; category `OTHER`; empty description; target setup 250.00 EQUIPMENT; REJECT without comment; second APPROVE | All five invalid payloads → 400 `VALIDATION_ERROR` with field-level details; my-request count stayed 5 → 5 (no rows created). Target setup → 201 (`REQ-20261122-0006`); Reviewer-A REJECT without comment → 400 `VALIDATION_ERROR`, target stayed `PENDING`, history still 1. Second APPROVE on case 01 → 400 `INVALID_STATE_TRANSITION`, still `APPROVED`, history still 2. Final count 6 (5 + the disclosed target). | **PASS** | `E-OUM-02a,b,c` |
| `UAT-OUM-03` | Supichaya | 2026-11-22 16:04 | same | no cookie; requester review; unrelated reviewer; self-approval; Reviewer-B detail | No cookie `GET /my` → 401 `UNAUTHORIZED`. Requester review → 403 `FORBIDDEN`. Reviewer-B review of case 01 → 403 `ACCESS_DENIED`. Reviewer-B own EQUIPMENT request → 201 assigned to Reviewer-A; review of own request → 403 `SELF_APPROVAL_NOT_ALLOWED`. Reviewer-B detail of case 01 → 403 `ACCESS_DENIED`, no `data` object and no `requestNo` leaked. Case 01 still `APPROVED` with 2 history entries. | **PASS** | `E-OUM-03a,b,c,d,e` |
| `UAT-OUM-04` | Supichaya | 2026-11-22 16:04 (before) / 17:15 (after) | before: `f371c23` / rev `sd3cdaba1-00008-2pg`; after: `f371c23` / new revision after T's redeploy (name not supplied) | case-01 `REQ-20261122-0005` + agreed redeploy | **Before (16:04):** status `APPROVED`, history `SUBMITTED` (oum.requester) → `APPROVED` (t.reviewer, "Approved for UAT"); `DELETE /api/requests/:id` → 404; `PUT`/`DELETE /api/requests/:id/history` → 404. **After redeploy (17:15):** health still `f371c23…` (same image); requester re-login and detail → `REQ-20261122-0005`, `APPROVED`; the 2 history entries are **identical** to the snapshot (same ids, actors, comment, timestamps, order); `PUT`/`DELETE /api/requests/:id/history` → 404 again. No record created. | **PASS** (redeploy confirmed by T; revision name outstanding) | `E-OUM-04a`, `E-OUM-04b` |

**Totals: 37 observations, 37 PASS, 0 FAIL** (32 in the 16:04 corrected run + 5 in the 17:15 post-redeploy run).
- Chawin (`UAT-OUM-01` + `UAT-OUM-02`): 20 observations, 20 PASS.
- Supichaya (`UAT-OUM-03` + `UAT-OUM-04`): 17 observations, 17 PASS.

`UAT-OUM-04` is PASS on the basis of T's (Product Team) confirmation that the website was redeployed
before the 17:15 retest. The commit is unchanged by design (same image); the new Cloud Run revision
name was not given to us, so it is recorded as an open confirmation item (§9 item 2), not as observed evidence.

Full per-observation expected/actual tables:
- Cases 01-03 + `UAT-OUM-04` before: [`evidence/uat-2026-11-22T09-04-25-620Z/results.md`](./evidence/uat-2026-11-22T09-04-25-620Z/results.md)
- `UAT-OUM-04` after redeploy (`E-OUM-04b`): [`evidence/uat-2026-11-22T10-15-41Z-post/results.md`](./evidence/uat-2026-11-22T10-15-41Z-post/results.md).
  This run used its own folder seeded with a copy of the 16:04 `state.json`, so the 16:04 evidence files were not overwritten.
- Screenshots for every case (UI + in-browser API, 28 images named by evidence ID): [`evidence/screenshots-2026-11-22T11-11-41-675Z/index.md`](./evidence/screenshots-2026-11-22T11-11-41-675Z/index.md)

### 2.1 Screenshot evidence for `UAT-OUM-01..04`

All images are in `evidence/screenshots-2026-11-22T11-11-41-675Z/`, captured at 18:11 on commit
`f371c23` by the UAT Team's headless-browser screenshot script. **UI** = the product screen after a real user action;
**API** = a real `fetch()` response from the same logged-in browser session, drawn in a panel over
the page. The case-01 UI journey used a new request, `REQ-20261122-0011`; cases 02-04 reuse the
16:04 records (`REQ-20261122-0005`, `-0006`, `-0007`).

| Evidence ID | Screenshot | Kind | What it shows |
| :--- | :--- | :---: | :--- |
| `E-OUM-01a` | [`E-OUM-01a-1.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-01a-1.png) | UI | Requester fills New Request: 1500.00, EQUIPMENT |
| | [`E-OUM-01a-2.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-01a-2.png) | UI | Detail of `REQ-20261122-0011`: `PENDING`, assigned to t.reviewer, one `SUBMITTED` entry |
| | [`E-OUM-01a-3.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-01a-3.png) | UI | My Requests lists the new request as `PENDING` |
| `E-OUM-01b` | [`E-OUM-01b-1.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-01b-1.png) | UI | Reviewer-A's pending queue contains the request |
| | [`E-OUM-01b-2.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-01b-2.png) | UI | Reviewer-A selects Approve with comment "Approved for UAT" |
| | [`E-OUM-01b-3.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-01b-3.png) | UI | "Decision recorded": `APPROVED`, new `APPROVED` entry by T Reviewer |
| `E-OUM-01c` | [`E-OUM-01c.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-01c.png) | UI | Requester reopens: `APPROVED`, `SUBMITTED` → `APPROVED` |
| `E-OUM-02a` | [`E-OUM-02a-1.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02a-1.png) | UI | amount `0`: inline error, not submitted |
| | [`E-OUM-02a-2.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02a-2.png) | UI | amount `10000000000.00`: inline error, not submitted |
| | [`E-OUM-02a-3.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02a-3.png) | UI | title `AB`: inline error, not submitted |
| | [`E-OUM-02a-4.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02a-4.png) | UI | empty description: inline error, not submitted |
| | [`E-OUM-02a-5.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02a-5.png) | API | all five invalid payloads (incl. category `OTHER`) → 400 `VALIDATION_ERROR` |
| | [`E-OUM-02a-6.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02a-6.png) | UI | Reject `REQ-20261122-0006` with empty comment: form error, stays `PENDING` |
| | [`E-OUM-02a-7.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02a-7.png) | API | Reject without comment → 400 `VALIDATION_ERROR`; `PENDING`; history 1 |
| `E-OUM-02b` | [`E-OUM-02b-1.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02b-1.png) | UI | decided request reopened by Reviewer-A: no decision form |
| | [`E-OUM-02b-2.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02b-2.png) | API | second APPROVE → 400 `INVALID_STATE_TRANSITION`; still `APPROVED`; history 2 |
| `E-OUM-02c` | [`E-OUM-02c.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-02c.png) | API | My Requests count unchanged (10 → 10) |
| `E-OUM-03a` | [`E-OUM-03a-1.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-03a-1.png) | UI | My Requests with no session: redirected to `/login` |
| | [`E-OUM-03a-2.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-03a-2.png) | API | `GET /api/requests/my` with no cookie → 401 `UNAUTHORIZED` |
| `E-OUM-03b` | [`E-OUM-03b-1.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-03b-1.png) | UI | Requester opens a reviewer page: "403 — Forbidden" |
| | [`E-OUM-03b-2.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-03b-2.png) | API | Requester calls review / pending → 403 `FORBIDDEN` |
| `E-OUM-03c` | [`E-OUM-03c.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-03c.png) | API | Reviewer-B reviews Reviewer-A's request → 403 `ACCESS_DENIED` |
| `E-OUM-03d` | [`E-OUM-03d.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-03d.png) | UI | Reviewer-B approves own `REQ-20261122-0007`: `SELF_APPROVAL_NOT_ALLOWED` banner; still `PENDING` |
| `E-OUM-03e` | [`E-OUM-03e.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-03e.png) | UI | Reviewer-B opens another request's detail: Access Denied, no data shown |
| `E-OUM-03f` | [`E-OUM-03f.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-03f.png) | UI | Requester re-checks the case-01 request: still `APPROVED`, 2 entries |
| `E-OUM-04a` | no screenshot - [`evidence/uat-2026-11-22T09-04-25-620Z/state.json`](./evidence/uat-2026-11-22T09-04-25-620Z/state.json) | API log | before-redeploy snapshot of `REQ-20261122-0005` (cannot be screenshotted after the fact) |
| `E-OUM-04b` | [`E-OUM-04b-1.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-04b-1.png) | API | `/api/health` → 200, commit `f371c23` |
| | [`E-OUM-04b-2.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-04b-2.png) | UI | `REQ-20261122-0005` after redeploy: `APPROVED`, history identical to the snapshot |
| | [`E-OUM-04b-3.png`](./evidence/screenshots-2026-11-22T11-11-41-675Z/E-OUM-04b-3.png) | API | `PUT` / `DELETE` history → 404 |

---

## 3. First run, case defect and correction (transparent history)

| Run | Time (Bangkok) | Result | Note |
| :--- | :--- | :--- | :--- |
| [`uat-2026-11-22T08-42-19-542Z`](./evidence/uat-2026-11-22T08-42-19-542Z/results.md) | 15:42 | 26 PASS / 3 FAIL | The handoff case listed `amount = 10000000.00` (10 million) as invalid, but BR-04 allows up to `9,999,999,999.99`. The product correctly returned 201 and created `REQ-20261122-0002`; the two request-count checks then failed as a consequence. Raised as finding [`F-OUM-02-01`](./evidence/uat-2026-11-22T08-42-19-542Z/finding-case-defect.md) - **case data defect, not a product defect**. A supplementary probe proved BR-04 at the real ceiling (`10000000000.00` and `9999999999.999` → 400 `VALIDATION_ERROR`, no row): [`boundary-check.md`](./evidence/uat-2026-11-22T08-42-19-542Z/boundary-check.md). |
| [`uat-2026-11-22T09-04-25-620Z`](./evidence/uat-2026-11-22T09-04-25-620Z/results.md) | 16:04 | 32 PASS / 0 FAIL | Corrected handoff (`284533d`): ceiling input is `10000000000.00`, step 2 target setup is explicit, and `UAT-OUM-03` step 5 was added. Finding `F-OUM-02-01` is **resolved**. Both runs are retained; neither was rewritten. |
| [`uat-2026-11-22T10-15-41Z-post`](./evidence/uat-2026-11-22T10-15-41Z-post/results.md) | 17:15 | 5 PASS / 0 FAIL | `UAT-OUM-04` after-redeploy phase only (`--phase post`), after T confirmed the redeploy. Read-only: no record created. |

The first run was a team dry-run before the case correction; finding `F-OUM-02-01` is reported by the
Pangtao UAT Team (Chawin and Supichaya), not by an individual tester. The runner was also corrected
after that run so that any row created by an unexpectedly accepted "invalid" payload is added to the
cleanup list. The first run's `state.json` was corrected to include `REQ-20261122-0002`, with the
correction noted in the file.

---

## 4. Coverage review of the Product Team's four cases

### 4.1 AC coverage of `UAT-OUM-01..04` alone

The four cases cover the core Sprint 1 business rules but **do not cover all 18 Sprint 1 acceptance
criteria**. Mapping against the Product Team's Sprint 1 acceptance criteria:

| Status | AC IDs | Comment |
| :--- | :--- | :--- |
| Covered | `AC-01`, `AC-07`, `AC-08`, `AC-09`, `AC-10`, `AC-AUTH-04` | exercised by real steps |
| Covered (after redeploy) | `AC-04b`, `AC-11` | before snapshot (16:04) and after redeploy (17:15) identical; history update/delete probes 404 both times |
| Partial | `AC-02` (missing title >150, description >1000), `AC-03` (own list only, not cross-user), `AC-05` (queue positive only), `AC-06` (APPROVE only, no successful REJECT), `AC-12` (only REJECT-without-comment), `AC-AUTH-01` (httpOnly cookie flag not asserted), `AC-AUTH-03` (only unauthenticated 401; no `/me` or logout) | |
| Not covered by these cases | `AC-04` (requester opening another requester's request - the case header lists it but step 5 tests Reviewer-B instead), `AC-AUTH-02` (invalid credentials), `AC-AUTH-05` (bcrypt cost / JWT expiry) | |

Requirement-level: `FR-01` partial, `FR-02` covered, `FR-03` partial, `FR-04` partial, `FR-05` (write)
covered, `FR-06` covered; `BR-01`, `BR-02`, `BR-05`, `BR-06` covered (`BR-06` after the 17:15
post-redeploy run); `BR-03`, `BR-04`, `BR-07` partial. Of the NFRs only `NFR-03` is explicitly covered (case 04) and `NFR-04` implicitly (case 02);
`NFR-01`, `NFR-02`, `NFR-05`, `NFR-06` are not UAT targets of these four cases.

The gap is in **UAT evidence**, not necessarily in the product: the Product Team reports its own
automated test coverage for these ACs (`TEST-AUTH-01..05`, `TEST-04`, `TEST-07`, `TEST-12`, etc.).
This distinction must be kept explicit when reporting.

### 4.2 Gaps and the additional case written for each

| Gap in the Product Team's cases | AC | Additional case |
| :--- | :--- | :--- |
| No invalid-login case | AC-AUTH-02 | `UAT-PB-01` |
| No logout / `/me` after logout | AC-AUTH-03 | `UAT-PB-02` |
| Valid amounts only tested at small values; no large valid amount | AC-01, BR-04 | `UAT-PB-03` |
| No oversized or malformed payload beyond the listed invalid fields | AC-02, AC-04, NFR-04 | `UAT-PB-04` |
| No successful REJECT; comment length boundary (2 vs 3 characters) untested | AC-06, AC-12 | `UAT-PB-05` |
| Invalid decision value and APPROVE comment over 500 characters untested | AC-12 | `UAT-PB-06` |
| Pending queue only checked positively (no exclusion check) | AC-05 | `UAT-PB-07` |
| My Requests order and ownership not checked | AC-03 | `UAT-PB-08` |
| Requester opening reviewer screens by URL not checked in the UI | AC-10 | `UAT-PB-09` |

---

## 5. Additional cases - results (`UAT-PB-01..09`)

Format follows the handoff §6 template (ACTUAL results, not copies of the expected results).

| Case ID | Tester | Date/time (Bangkok) | Tested version | Inputs | ACTUAL result | PASS / FAIL / BLOCKED | Evidence IDs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-PB-01` | Chawin | 2026-11-22 18:19 | `f371c23` / revision after T's redeploy | Login as `oum.requester@cpe334.local` with password `Wrong-Pass-1`; then `nobody@cpe334.local` with `Wrong-Pass-1` | Both attempts: `HTTP 401` `{"error":{"code":"UNAUTHORIZED","message":"Invalid email or password."}}`, banner "UNAUTHORIZED: Invalid email or password.", still on `/login`, no `token` cookie set. The two responses are identical, so the app does not reveal which email exists. | **PASS** | `E-PB-01a`, `E-PB-01b` |
| `UAT-PB-02` | Chawin | 2026-11-22 18:19 | same | Log in as Requester, click **Logout**, then open `<URL>/api/auth/me` | After login: `token` cookie set, `/api/auth/me` → `200` (`oum.requester@cpe334.local`). After Logout: `token` cookie gone, `/api/auth/me` → `401` `{"error":{"code":"UNAUTHORIZED","message":"Authentication is required."}}`. | **PASS** | `E-PB-02a` |
| `UAT-PB-03` | Chawin | 2026-11-22 16:32 | same | UI as Requester (Oum Requester): title `UAT-Fin-01`; amount `1234567.89` (valid under BR-04: > 0, ≤ 9,999,999,999.99, 2 decimals); category Equipment; description `Test Amount value.`; Submit Request | Inline error under Amount: "Amount must have at most 2 decimal places."; the form stayed on `/requests/new` and the request was not submitted. Expected per AC-01: `201`, `PENDING`. | **FAIL** → `F-PB-01` | `E-PB-03a` |
| `UAT-PB-04` | Chawin | 2026-11-22 17:31 | same | No session; JSON body with title `UAT big body`, amount `10`, category `EQUIPMENT`, description of 200,000 characters (about 200 KB); `curl -X POST <URL>/api/requests -H 'Content-Type: application/json' --data-binary @big.json` | `HTTP 500` `{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred."}}`. Expected per AC-04/AC-02/NFR-04: a 4xx with a standard error code (`401` without a session, `400 VALIDATION_ERROR` for a description over 1000 characters), never `500`. | **FAIL** → `F-PB-02` | `E-PB-04a` |
| `UAT-PB-05` | Chawin | 2026-11-22 18:19 | same | Requester created `REQ-20261122-0012` "UAT-PB-05 reject target", 50.00 EQUIPMENT (→ `PENDING`, assigned to Reviewer-A). Reviewer-A on its review page: Reject with comment `ab`; the same via API; then Reject with `abc` | `ab` in the UI: "A rejection comment of at least 3 characters is required.", not sent. `ab` via API: `400 VALIDATION_ERROR`, still `PENDING`, 1 history entry. `abc`: `200`, "Decision recorded: request is now REJECTED." Requester view: `REJECTED`, history `SUBMITTED` by oum.requester → `REJECTED` by t.reviewer "abc". | **PASS** | `E-PB-05a`, `E-PB-05b`, `E-PB-05c` |
| `UAT-PB-06` | Chawin | 2026-11-22 18:19 | same | Requester created `REQ-20261122-0013` "UAT-PB-06 decision payload target", 60.00 EQUIPMENT (→ `PENDING`, Reviewer-A). Reviewer-A, browser `fetch`: `{decision:"MAYBE"}`; `{decision:"APPROVE", comment: 501 characters}` | `MAYBE` → `400 VALIDATION_ERROR` ("Decision must be APPROVE or REJECT."). 501-character comment → `400 VALIDATION_ERROR` ("Comment must not exceed 500 characters."). Afterwards still `PENDING` with 1 history entry. | **PASS** | `E-PB-06a` |
| `UAT-PB-07` | Supichaya | 2026-11-22 18:19-18:20 | same | Pending Reviews as Reviewer-B (`manager.hybrid`), then as Reviewer-A (`t.reviewer`) | Reviewer-B: queue empty; `REQ-20261122-0013` (Reviewer-A's) not shown. Reviewer-A: 9 requests, all `PENDING` and all assigned to Reviewer-A; includes `REQ-20261122-0013`; does not include `REQ-20261122-0012` (just REJECTED). | **PASS** | `E-PB-07a`, `E-PB-07b` |
| `UAT-PB-08` | Supichaya | 2026-11-22 18:19 | same | Requester opens My Requests | 12 requests, all owned by `oum.requester@cpe334.local`, ordered newest first by `createdAt` (first: `REQ-20261122-0013` 18:19:48, `REQ-20261122-0012` 18:19:47, `REQ-20261122-0011` 18:11:52). | **PASS** | `E-PB-08a` |
| `UAT-PB-09` | Supichaya | 2026-11-22 18:19 | same | As Requester, type `<URL>/reviewer/pending` and `<URL>/reviewer/requests/<id of REQ-20261122-0013>` in the address bar | Both show the page "403 — Forbidden"; no queue and no decision form. | **PASS** | `E-PB-09a`, `E-PB-09b` |

**Totals: 9 observations, 7 PASS, 2 FAIL.**
- Chawin (`UAT-PB-01` to `UAT-PB-06`): 6 observations, 4 PASS, 2 FAIL.
- Supichaya (`UAT-PB-07` to `UAT-PB-09`): 3 observations, 3 PASS.

| Evidence ID | What it shows |
| :--- | :--- |
| [`E-PB-00`](./evidence/additional_screenshots/E-PB-00.png) | `GET /api/health` returning commit `f371c23` before the 18:19 run |
| [`E-PB-01a`](./evidence/additional_screenshots/E-PB-01a.png), [`E-PB-01b`](./evidence/additional_screenshots/E-PB-01b.png) | login page with "UNAUTHORIZED: Invalid email or password." for the wrong password and for the unknown email |
| [`E-PB-02a`](./evidence/additional_screenshots/E-PB-02a.png) | `/api/auth/me` after Logout showing `{"error":{"code":"UNAUTHORIZED","message":"Authentication is required."}}` |
| [`E-PB-03a`](./evidence/additional_screenshots/E-PB-03a.png) | Chawin, Safari: `/requests/new` as Oum Requester, amount `1234567.89` with the inline error "Amount must have at most 2 decimal places." |
| [`E-PB-04a`](./evidence/additional_screenshots/E-PB-04a.png) | Chawin, terminal: the `node` command creating the 200,000-character body and the `curl` call returning `INTERNAL_ERROR` / `HTTP 500` |
| [`E-PB-05a`](./evidence/additional_screenshots/E-PB-05a.png) | review page of `REQ-20261122-0012` with comment `ab`, the form error "A rejection comment of at least 3 characters is required.", status still `PENDING` and one history entry |
| [`E-PB-05b`](./evidence/additional_screenshots/E-PB-05b.png) | lower part of the review page after Reject with `abc`: "Decision recorded: request is now REJECTED." and the history `SUBMITTED` → `REJECTED` "abc" |
| [`E-PB-05c`](./evidence/additional_screenshots/E-PB-05c.png) | Requester's detail view showing `REJECTED` and both history entries |
| [`E-PB-06a`](./evidence/additional_screenshots/E-PB-06a.png) | review page of `REQ-20261122-0013` after both invalid calls, still `PENDING` with one history entry (the two `400` responses are recorded in §5) |
| [`E-PB-07a`](./evidence/additional_screenshots/E-PB-07a.png), [`E-PB-07b`](./evidence/additional_screenshots/E-PB-07b.png) | Pending Reviews as Reviewer-B (empty) and as Reviewer-A (9 pending, all assigned to Reviewer-A) |
| [`E-PB-08a`](./evidence/additional_screenshots/E-PB-08a.png) | My Requests as Requester, newest first |
| [`E-PB-09a`](./evidence/additional_screenshots/E-PB-09a.png), [`E-PB-09b`](./evidence/additional_screenshots/E-PB-09b.png) | "403 — Forbidden" for the reviewer queue and a review page opened by URL as Requester |

---

## 6. Defect reports (outgoing, Part C)

Reported through the agreed handoff channel (Product Team handoff §7.5 allows this instead of a
GitHub Issue). Notification date and the Product Team's response: _(fill)_.

### F-PB-01: valid 2-decimal amounts such as 1234567.89 are rejected as "more than 2 decimal places"

| Field | Value |
| :--- | :--- |
| Product (owning team) | Approval System (Oum and T) |
| Reporter | Chawin (Pangtao UAT Team) |
| Tested version | commit `f371c23`, 22 Nov 2026 16:32 |
| Linked case / requirement | `UAT-PB-03` · AC-01, BR-04 |
| Preconditions and data | Logged in as Requester (`oum.requester@cpe334.local`) |
| Steps to reproduce | 1. Open **New Request**. 2. Title `UAT-Fin-01`, amount `1234567.89`, category Equipment, description `Test Amount value.` 3. Click **Submit Request** |
| Expected | `1234567.89` is valid under BR-04 (> 0, ≤ 9,999,999,999.99, at most 2 decimals), so the request is created with `201` and `status = PENDING` (AC-01) |
| Actual | Inline error under Amount: "Amount must have at most 2 decimal places." The form stays on `/requests/new` and nothing is submitted |
| Severity | **Major** (their scale: a Sprint 1 AC fails). A requester cannot submit certain legitimate amounts and is told the valid input is wrong; the only workaround is to change the amount. No data is lost or exposed |
| Defect or enhancement | Defect: specified valid input is refused |
| Likely cause | Both the New Request form and the server appear to check decimals with floating point: `Math.abs(v*100 - Math.round(v*100)) < 1e-8`. `1234567.89 * 100` is `123456788.99999999`, so the check fails. Reading the code, other valid amounts from about 1,000,000 upwards are affected the same way (for example `2097190.01`, while `2097190.02` passes); only `1234567.89` was executed |
| Evidence | `E-PB-03a` |

### F-PB-02: an oversized request body returns 500 INTERNAL_ERROR instead of a 4xx error

| Field | Value |
| :--- | :--- |
| Product (owning team) | Approval System (Oum and T) |
| Reporter | Chawin (Pangtao UAT Team) |
| Tested version | commit `f371c23`, 22 Nov 2026 17:31 |
| Linked case / requirement | `UAT-PB-04` · AC-02, AC-04, NFR-04 |
| Preconditions and data | None; no login needed; no request can be created |
| Steps to reproduce | 1. `node -e 'process.stdout.write(JSON.stringify({title:"UAT big body",amount:10,category:"EQUIPMENT",description:"x".repeat(200000)}))' > big.json` 2. `curl -s -w "\nHTTP %{http_code}\n" -X POST https://sd3cdaba1-4d7hbszvwq-as.a.run.app/api/requests -H 'Content-Type: application/json' --data-binary @big.json` |
| Expected | A 4xx response with a standard error code (AC-04: `401` without a session; AC-02: `400 VALIDATION_ERROR` for a description over 1000 characters; NFR-04: never `500` for an invalid payload) |
| Actual | `{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred."}}` with `HTTP 500` |
| Severity | **Minor** (their scale may rate it Major because AC-02 and NFR-04 fail for this input). Not reachable from the UI, which caps the description at 1000 characters; no data changed or exposed, but any client, even without a session, gets an unexpected server error |
| Defect or enhancement | Defect: AC-02, AC-04 and NFR-04 specify a 4xx response |
| Likely cause | The server's JSON body parser (100 kB default limit) rejects the body with a 413 "payload too large" error before any route runs, and the error handler does not map that error to a 4xx, so it becomes `500` |
| Evidence | `E-PB-04a` |

The only finding against the `UAT-OUM` cases (`F-OUM-02-01`, §3) was against the case data and has
been resolved by the Product Team.

---

## 7. Records created (return to Product Team for post-grading reset)

Sprint 1 has no delete endpoint. Nothing in the cloud database was deleted.

| Run | `requestNo` | Purpose |
| :--- | :--- | :--- |
| 15:42 | `REQ-20261122-0001` | `UAT-OUM-01` normal journey (APPROVED) |
| 15:42 | `REQ-20261122-0002` | created by the defective 10-million case input |
| 15:42 | `REQ-20261122-0003` | `UAT-OUM-02` reject-without-comment target (PENDING) |
| 15:42 | `REQ-20261122-0004` | `UAT-OUM-03` Reviewer-B self-approval probe |
| 16:04 | `REQ-20261122-0005` | `UAT-OUM-01` normal journey (APPROVED, `UAT-OUM-04` snapshot) |
| 16:04 | `REQ-20261122-0006` | `UAT-OUM-02` reject target (PENDING) |
| 16:04 | `REQ-20261122-0007` | `UAT-OUM-03` Reviewer-B self-approval probe |
| 16:32 | none | `UAT-PB-03` request rejected by the form; not submitted |
| 17:31 | none | `UAT-PB-04` sent without a session; rejected before any handler |
| 18:10 | `REQ-20261122-0010` | `UAT-OUM-01` UI journey, first screenshot attempt (images discarded: the caption bar covered page content) - APPROVED |
| 18:11 | `REQ-20261122-0011` | `UAT-OUM-01` UI journey for the screenshot evidence - APPROVED |
| 18:19 | `REQ-20261122-0012` | `UAT-PB-05` reject target (now REJECTED with comment "abc") |
| 18:19 | `REQ-20261122-0013` | `UAT-PB-06` invalid-decision target (still PENDING, assigned to Reviewer-A) |

`REQ-20261122-0008` and `-0009` were not created by us (they appeared between our 17:15 and 18:10 runs).

Note: because the Product Team does not reset data before the retest, the case-01 title already
existed in the second run; the runner appended a numeric suffix. This is disclosed in the run's
`results.md` and does not affect any expected result.

---

## 8. AC / requirement coverage after both case sets

| Status | AC IDs | Comment |
| :--- | :--- | :--- |
| Covered (PASS) | `AC-03`, `AC-04b`, `AC-05`, `AC-06`, `AC-07`, `AC-08`, `AC-09`, `AC-10`, `AC-11`, `AC-12`, `AC-AUTH-02`, `AC-AUTH-03`, `AC-AUTH-04` | `AC-03`, `AC-05`, `AC-06` (REJECT path), `AC-10` (UI), `AC-12`, `AC-AUTH-02`, `AC-AUTH-03` completed by `UAT-PB-01`, `02`, `05` to `09` |
| Covered, with a FAIL | `AC-01` | PASS for `1500.00` (`UAT-OUM-01`); FAIL for the valid amount `1234567.89` (`UAT-PB-03`, `F-PB-01`) |
| Partial, with a FAIL | `AC-02` | listed invalid fields PASS (`UAT-OUM-02`); oversized body returns `500` instead of `400` (`UAT-PB-04`, `F-PB-02`); title >150 and description of 1001 characters still not executed |
| Partial, with a FAIL | `AC-04` | unauthenticated oversized body returns `500` instead of `401` (`F-PB-02`); a requester opening another requester's request is still not executed |
| Partial | `AC-AUTH-01` | login and `token` cookie observed; the `httpOnly` flag is not asserted |
| Not covered by UAT | `AC-AUTH-05` | bcrypt cost and JWT expiry are server internals covered by the Product Team's automated `TEST-AUTH-05` |

Requirement-level: `BR-04` and `NFR-04` have failing UAT evidence. The remaining NFRs (`NFR-01`,
`NFR-02`, `NFR-05`, `NFR-06`) are not UAT targets of these cases.

---

## 9. Limitations and pending items

1. **UI screenshots for `UAT-OUM-01..04` taken separately.** The runner is API-only. UI and
   in-browser `fetch` evidence (handoff §7.2/§7.3) was captured afterwards with a
   headless-browser screenshot script, at 18:11 on the same commit: 28 screenshots named after their
   evidence IDs, listed in
   [`evidence/screenshots-2026-11-22T11-11-41-675Z/index.md`](./evidence/screenshots-2026-11-22T11-11-41-675Z/index.md).
   All results there match the API runs. `E-OUM-04a` cannot be screenshotted after the fact; it
   remains the 16:04 API snapshot.
2. **The redeploy is confirmed only verbally.** T (Product Team) told us the website was
   redeployed, and the 17:15 post phase passed. The commit stayed `f371c23…`, as the handoff
   specifies. The API does not expose the revision and we were not given the new revision name. The
   Product Team should add the old and new revision from their deployment tooling or the Cloud Console
   (expected: something after `sd3cdaba1-00008-2pg`) so `E-OUM-04b` and the `UAT-PB` results can be
   tied to a named revision.
3. **Coverage gaps** listed in §8 remain open in the UAT record; do not claim 100% AC coverage.
4. Only `1234567.89` was executed for `F-PB-01`; the other affected amounts are from reading the
   Product Team's code, not from execution.
5. Still to fill in: the notification date for `F-PB-01` and `F-PB-02` with the Product Team's
   response. Both defects need the Product Team's triage (accepted defect / duplicate / not-defect /
   enhancement) and, if accepted, a fix, redeploy and independent retest by the UAT Team.
6. **File structure:** a separate result file per tester is **not required** by the handout. This
   single document is the consolidated result record with both testers, both case sets and their
   case ownership; the files under `evidence/uat-<timestamp>/` are primary logs (`raw.jsonl`,
   `state.json`) plus the runner's auto-generated `results.md`. They are kept per run (not per
   person) because two runs had different case versions and different outcomes. Do not create a
   second "result doc" for each tester - it would duplicate the same evidence and risk conflicting
   verdicts.
7. Evidence files: `raw.jsonl` (all HTTP exchanges), `state.json` (ids/requestNos and the
   `UAT-OUM-04` snapshot), `results.md` (result tables) in each run folder linked above; `UAT-PB`
   screenshots in `evidence/additional_screenshots/`.
