# Lab 6 - Partner's Execution of Our UAT Cases (Received)

> **UAT Team:** Chawin and Supichaya (`yakginmomo/pangtao`)
> **Product Team:** Oum and T (our team)
> **Full original report:** <https://github.com/yakginmomo/pangtao/blob/sprint-2-staging/docs/labs/lab-06/partner-cases-execution.md>
> **Raw evidence and screenshots:** <https://github.com/yakginmomo/pangtao/tree/sprint-2-staging/docs/labs/lab-06/evidence>

This is the partner's independent execution of our Part A handoff (`uat-cases-for-partner.md`,
corrected commit `284533d`) plus nine additional cases they wrote from our Sprint 1 contract, and
their retest of the two defects they found after we shipped the correction. Their full report and all
screenshots remain in their public repository; the material below is the summary needed for our PDF
(Part B/D), not a replacement for their record. The primary logs of every run are in
[`evidence/`](./evidence/).

## 1. Tested version

| Round | When (UTC / ICT) | Commit (`GET /api/health`) | Cloud Run revision | What was executed |
| :--- | :--- | :--- | :--- | :--- |
| Original run | 22 Nov 09:04 / 16:04 | `f371c23…` | `sd3cdaba1-00008-2pg` | `UAT-OUM-01..03` + `UAT-OUM-04` before-snapshot |
| After our redeploy | 22 Nov 10:15 / 17:15 | `f371c23…` | new revision after the redeploy; we recorded `sd3cdaba1-00009-gxv` from `kit.sh status` | `UAT-OUM-04` after-redeploy comparison |
| Additional cases | 22 Nov 09:32-11:20 / 16:32-18:20 | `f371c23…` | same as above | `UAT-PB-01..09` |
| **Retest of the fix** | **23 Nov 15:37-15:42 / 22:37-22:42** | **`90e9fac…`** | **`sd3cdaba1-00010-lxj`** | **`UAT-PB-03`, `UAT-PB-04` + persistence re-check** |

The partner were not given the revision name during their first run and disclose this in their report
§9 item 2; we close that item here. `/api/health` exposes the commit only, so the revision column comes
from our deployment tooling and is corroborated by the commit value the partner verified themselves.

## 2. Results

| Case set | Observations | PASS | FAIL | Notes |
| :--- | :---: | :---: | :---: | :--- |
| `UAT-OUM-01..04` (our cases) | 37 | **37** | 0 | Includes `UAT-OUM-04` before/after our redeploy: history identical, no update/delete endpoint (404) |
| `UAT-PB-01..09` (their additional cases) | 9 | **7** | **2** | `UAT-PB-03` → `F-PB-01` (Major); `UAT-PB-04` → `F-PB-02` (Minor) |
| First (pre-correction) run at 15:42 | 29 | 26 | 3 | Case-data defect `F-OUM-02-01` (our `10000000.00` input was in fact valid); corrected handoff `284533d` resolved it. Both runs retained by the partner. |
| **Retest of `UAT-PB-03`/`04` on `90e9fac…`** | **15** | **14** | **1** | Both defects verified fixed; the single deviation is the accepted check-order limitation in §2.1 |

### 2.1 Independent retest after the fix release (23 Nov 2026)

The UAT Team verified the release identity before testing (`GET /api/health` returned
`90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f`, not the defective `f371c23…`), then re-ran the two failing
cases and a set of regression guards.

| Case | Finding | What was executed | Actual result | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `UAT-PB-03` | `F-PB-01` | `1234567.89` as a decimal string; `2097190.01` as a JSON number; the same amount through the real New Request form; regression guards `10000000000.00` (ceiling) and `10.123` (3 decimals) | `201 PENDING` with `amount=1234567.89`, assigned to Reviewer-A, one `SUBMITTED` entry (`REQ-20261123-0002`); `201` for `2097190.01` (`-0003`); UI created `-0005` with no inline error; both regression guards still `400 VALIDATION_ERROR` | **PASS** (6/6 API + UI) |
| `UAT-PB-04` | `F-PB-02` | 200,000-character body with a session and without one; description 1,001 and exactly 1,000 characters; title 151 characters | With a session: `400 VALIDATION_ERROR "Request body is too large."` (no more `500`). Without a session: `400` - see deviation 2b. Description 1,001 → `400`, exactly 1,000 → `201` (`REQ-20261123-0004`), title 151 → `400` | **PASS with 1 disclosed deviation** |
| `UAT-OUM-04` | regression | Persistence of the 22 Nov records on the new image | `REQ-20261122-0005` still `APPROVED` with the identical two history entries; no update/delete surface appeared | **PASS** (5/5) |

**Deviation 2b (accepted, minor):** an oversized body sent **without** a session returns
`400 VALIDATION_ERROR` instead of the `401 UNAUTHORIZED` that AC-04 lists first, because the JSON body
limit is enforced before the authentication middleware. The requirement that actually matters for
NFR-04 - never `500`, always a standard error code, no data exposed - is met, so this is recorded as a
documented limitation rather than an open defect. It is the only non-PASS observation in the retest.

Evidence: [`evidence/retest-2026-11-23T15-37-48-332Z/`](./evidence/retest-2026-11-23T15-37-48-332Z/results.md)
(API, `raw.jsonl`),
[`evidence/retest-2026-11-23T15-38-34-814Z-ui/`](./evidence/retest-2026-11-23T15-38-34-814Z-ui/index.md)
(UI images `E-PB-RT-03-UI-2`, `E-PB-RT-03-UI-3`: the amount that used to be rejected is now created),
[`evidence/retest-2026-11-23T16-05-45-950Z-ui-pb04/`](./evidence/retest-2026-11-23T16-05-45-950Z-ui-pb04/index.md)
(browser/API images `E-PB-RT-04a`, `E-PB-RT-04b`, `E-PB-RT-04c`: the 200,000-character body,
the 1,001-character description and the 151-character title all return 4xx; the 1,000-character
request is accepted), and
[`evidence/uat-2026-11-23T15-42Z-post-fix/`](./evidence/uat-2026-11-23T15-42Z-post-fix/results.md)
(persistence on the corrected image). The observations were produced by the UAT Team's runner
scripts (`retest-pb.mjs`) and the two screenshot passes (`retest-pb-ui.mjs`, `retest-pb04-ui.mjs`)
in the UAT Team's working workspace; the captures themselves are committed here.

## 3. Coverage feedback from the partner (their §4/§8)

They found that our four cases did not cover all Sprint 1 acceptance criteria and added nine cases
for invalid login, logout/`/me`, large valid amounts, oversized payloads, REJECT paths, decision
validation, queue exclusion, ordering/ownership and URL-based access. After both sets and the retest:

| Status | AC IDs | Comment |
| :--- | :--- | :--- |
| Covered (PASS) | `AC-01`, `AC-02`, `AC-03`, `AC-05`, `AC-06`, `AC-07`, `AC-08`, `AC-09`, `AC-10`, `AC-11`, `AC-12`, `AC-AUTH-02`, `AC-AUTH-03`, `AC-AUTH-04` | `AC-01`/`AC-02` completed by the retest (large valid amount, 1000/1001-character and 150/151-character boundaries) |
| Covered after redeploy | `AC-04b`, `AC-11` | before/after comparison identical on both the 22 Nov and the 23 Nov release |
| Partial | `AC-04` | the unauthenticated oversized body returns `400` before `401` (deviation 2b); a requester opening *another requester's* request was still not executed |
| Not covered by UAT | `AC-AUTH-05` | bcrypt cost and JWT expiry are server internals covered by our automated `TEST-AUTH-05` |
| Partial | `AC-AUTH-01` | login and the `token` cookie were observed; the `httpOnly` flag was not asserted in the browser |

We accept this distinction: the gap was in UAT evidence, not in the product, and the two real product
failures are now corrected and verified. We do not claim 100% AC coverage from UAT alone.

## 4. Honest status

- **The UAT Team's verdict (this report is its record): Accepted with documented minor limitations**
  after it independently retested `UAT-PB-03`/`UAT-PB-04` on `90e9fac…` / `sd3cdaba1-00010-lxj`.
  The UAT Team only issues the result and the evidence; writing the decision into the Product Team's
  own acceptance document is the Product Team's task.
- The two accepted defects are closed: `F-PB-01` (Major) verified fixed in the API and the UI,
  `F-PB-02` (Minor) verified fixed for the `500`, with deviation 2b accepted as a limitation.
- No data was deleted by either team. Every `requestNo` created during the UAT is listed in §5 for the
  post-grading reset.
- The UAT Team redacted login bodies in all evidence files; no password, token or cookie value is
  present in any evidence file or in this document.
- Coverage is not claimed beyond the table in §3; `AC-AUTH-05` and the requester-vs-requester case
  remain unexecuted in UAT and are covered elsewhere (automated tests) or not at all.

## 5. Records created (return to Product Team for the post-grading reset)

Sprint 1 has no delete endpoint. The cloud database was not reset, so every UAT record is still present.
Verified on 23 Nov 2026 against `GET /api/requests/my` for the two accounts that own them.

| `requestNo` | Created by | Purpose | Status now |
| :--- | :--- | :--- | :--- |
| `REQ-20261122-0001` | UAT run 1 (15:42) | `UAT-OUM-01` normal journey | APPROVED |
| `REQ-20261122-0002` | UAT run 1 | created by the defective `10000000.00` case input (`F-OUM-02-01`) | PENDING |
| `REQ-20261122-0003` | UAT run 1 | `UAT-OUM-02` reject target | PENDING |
| `REQ-20261122-0004` | UAT run 1 | `UAT-OUM-03` Reviewer-B self-approval probe | PENDING |
| `REQ-20261122-0005` | UAT run 2 (16:04) | `UAT-OUM-01` normal journey + `UAT-OUM-04` snapshot | APPROVED |
| `REQ-20261122-0006` | UAT run 2 | `UAT-OUM-02` reject target | PENDING |
| `REQ-20261122-0007` | UAT run 2 | `UAT-OUM-03` self-approval probe | PENDING |
| `REQ-20261122-0010`, `-0011` | UAT screenshot session (18:10-18:11) | `UAT-OUM-01` UI journey (the first attempt's images were discarded) | APPROVED |
| `REQ-20261122-0012` | UAT `UAT-PB-05` (18:19) | successful REJECT path | REJECTED |
| `REQ-20261122-0013` | UAT `UAT-PB-06` (18:19) | invalid-decision target | PENDING |
| `REQ-20261123-0002` to `-0005` | UAT retest (23 Nov 15:37-15:42) | `UAT-PB-03` (x3) and the 1,000-character boundary for `UAT-PB-04` | PENDING |

The two screenshot passes for the retest created **no new records**: the `UAT-PB-03` UI pass created
`REQ-20261123-0005` (already listed above) and the `UAT-PB-04` pass only sent rejected payloads and
re-opened the existing `REQ-20261123-0004`.

`REQ-20261122-0008` and `-0009` were not created by the UAT Team (they appeared between our 17:15 and
18:10 runs; `-0009` is a `1234567.01` repro of `F-PB-01`). `REQ-20261123-0001` is our own live smoke
check after the fix deployment. `REQ-20261121-0001`/`-0002` predate this lab (Lab 5 verification).
