# Lab 6 - UAT execution record (pre phase)

> **Testers:** Chawin (`UAT-OUM-01`, `UAT-OUM-02`) and Supichaya (`UAT-OUM-03`, `UAT-OUM-04`) - Pangtao UAT Team
> **Executed:** 2026-11-22T08:42:19.544Z
> **Target:** https://sd3cdaba1-4d7hbszvwq-as.a.run.app
> **Running commit:** `f371c232715f1185bc46b64ea28335639ae8eabf`
> **Cases:** UAT-OUM-01..04 (partner handoff document)

## 1. Case summary

| Case ID | Tester | Date/time (UTC) | Version | Inputs | ACTUAL result | Result | Evidence IDs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-OUM-01` | Chawin | 2026-11-22T08:42:19.544Z | `f371c232715f1185bc46b64ea28335639ae8eabf` | 1500.00 EQUIPMENT | All observations matched the expected results (see §2). | **PASS** | E-OUM-01a,b,c |
| `UAT-OUM-02` | Chawin | 2026-11-22T08:42:19.544Z | `f371c232715f1185bc46b64ea28335639ae8eabf` | amount 0 / 10000000.00; title AB; category OTHER; empty description; REJECT without comment; second APPROVE | 3 observation(s) deviated, all from one root cause: case input `10000000.00` is **inside** the BR-04 limit (9,999,999,999.99) so the product correctly returned 201 and created `REQ-20261122-0002`. The two count checks then deviated as a consequence. See `finding-case-defect.md`; BR-04 itself verified PASS at the real ceiling in `boundary-check.md`. | **FAIL (case defect, not a product defect)** | E-OUM-02a,b,c |
| `UAT-OUM-03` | Supichaya | 2026-11-22T08:42:19.544Z | `f371c232715f1185bc46b64ea28335639ae8eabf` | no cookie; requester review; unrelated reviewer; self-approval | All observations matched the expected results (see §2). | **PASS** | E-OUM-03a,b,c,d |
| `UAT-OUM-04` | Supichaya | 2026-11-22T08:42:19.544Z | `f371c232715f1185bc46b64ea28335639ae8eabf` | case-01 requestNo + redeploy | Before-snapshot checks passed (E-OUM-04a). After-redeploy comparison (E-OUM-04b) has **not** run yet - it is pending the agreed redeploy. | **PARTIAL - NOT PASS** | E-OUM-04a (E-OUM-04b pending) |

## 2. Observation detail

### UAT-OUM-01

| Step | Expected | Actual | Result | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 1. login as requester | HTTP 200, role REQUESTER, no passwordHash in payload | 200 role=REQUESTER passwordHash=false | PASS | - |
| 2. create request | HTTP 201, status PENDING, requestNo REQ-YYYYMMDD-NNNN, assignedReviewer = Reviewer-A (EQUIPMENT) | 201 status=PENDING requestNo=REQ-20261122-0001 assignedReviewer=t.reviewer@cpe334.local | PASS | E-OUM-01a |
| 3. my requests shows the new request as PENDING | request present in My Requests with status PENDING | present status=PENDING | PASS | E-OUM-01a |
| 3. detail shows exactly one SUBMITTED history entry | 1 history entry, action SUBMITTED, actor = requester | 1 entries: SUBMITTED/oum.requester@cpe334.local | PASS | E-OUM-01a |
| 4. login as Reviewer-A | HTTP 200, role REVIEWER | 200 role=REVIEWER | PASS | - |
| 5. request appears in the assigned pending queue | request present in GET /api/requests/pending for Reviewer-A | present | PASS | E-OUM-01b |
| 5. approve returns 200 with APPROVED status | HTTP 200, status APPROVED, updatedAt changed | 200 status=APPROVED updatedAt=2026-11-22T08:42:25.701Z createdAt=2026-11-22T08:42:24.875Z | PASS | E-OUM-01b |
| 5. new APPROVED history entry with exact comment | history action APPROVED, actor = Reviewer-A, comment = "Approved for UAT" | action=APPROVED actor=t.reviewer@cpe334.local comment="Approved for UAT" | PASS | E-OUM-01b |
| 6. requester sees APPROVED with two ordered history entries | status APPROVED, 2 entries ordered SUBMITTED -> APPROVED | status=APPROVED entries=SUBMITTED -> APPROVED | PASS | E-OUM-01c |

### UAT-OUM-02

| Step | Expected | Actual | Result | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 1. amount = 0 -> 400 VALIDATION_ERROR | HTTP 400 VALIDATION_ERROR, no new request row | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"amount","message":"Amount must be greater than 0."}]}} | PASS | E-OUM-02a |
| 1. amount = 10000000.00 -> 400 VALIDATION_ERROR | HTTP 400 VALIDATION_ERROR, no new request row | 201 null {"data":{"request":{"id":"4b0c5109-83cf-4ac3-8633-0b26a80435fb","requestNo":"REQ-20261122-0002","title":"UAT boundary probe","amount":"10000000.00","category":"EQUIPMENT","description":"UAT case 02","status":"PENDING","requesterId":"f967243b-5527-4378-b45a-99532f5152f5","assignedReviewerId":"7e47dab2-eaef-43d7-ba89-885251be0234","createdAt":"2026-11-22T08:42:27.360Z","updatedAt":"2026-11-22T08:42:27.360Z","requester":{"id":"f967243b-5527-4378-b45a-99532f5152f5","email":"oum.requester@cpe334.local","name":"Oum Requester","role":"REQUESTER"},"assignedReviewer":{"id":"7e47dab2-eaef-43d7-ba89-8852 | FAIL | E-OUM-02a |
| 1. title = AB -> 400 VALIDATION_ERROR | HTTP 400 VALIDATION_ERROR, no new request row | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"title","message":"Title must contain at least 3 characters."}]}} | PASS | E-OUM-02a |
| 1. category = OTHER -> 400 VALIDATION_ERROR | HTTP 400 VALIDATION_ERROR, no new request row | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"category","message":"Invalid enum value. Expected 'EQUIPMENT' \| 'TRAVEL' \| 'SOFTWARE' \| 'SUPPLIES', received 'OTHER'"}]}} | PASS | E-OUM-02a |
| 1. empty description -> 400 VALIDATION_ERROR | HTTP 400 VALIDATION_ERROR, no new request row | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"description","message":"Description is required."}]}} | PASS | E-OUM-02a |
| 1. no request row created by invalid payloads | request count unchanged (2) | count before=2 after=3 | FAIL | E-OUM-02a |
| 2. REJECT without comment -> 400 VALIDATION_ERROR | HTTP 400 VALIDATION_ERROR, request stays PENDING, no history added | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"comment","message":"A rejection comment of at least 3 characters is required."}]}} | PASS | E-OUM-02a |
| 2. probe request unchanged (PENDING, no new history) | status PENDING, history count unchanged | status=PENDING history 1 -> 1 | PASS | E-OUM-02c |
| 3. second decision -> 400 INVALID_STATE_TRANSITION | HTTP 400 INVALID_STATE_TRANSITION, status stays APPROVED, no history added | 400 INVALID_STATE_TRANSITION {"error":{"code":"INVALID_STATE_TRANSITION","message":"Request is already APPROVED."}} | PASS | E-OUM-02b |
| 3. case-01 request unchanged (APPROVED, still 2 history entries) | status APPROVED, 2 history entries | status=APPROVED histories=2 | PASS | E-OUM-02b |
| 4. request count unchanged by rejected operations | count unchanged except the disclosed probe (2 + 1 = 3) | final count=4 | FAIL | E-OUM-02c |

### UAT-OUM-03

| Step | Expected | Actual | Result | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 1. unauthenticated request -> 401 UNAUTHORIZED | HTTP 401 UNAUTHORIZED, no private data | 401 UNAUTHORIZED {"error":{"code":"UNAUTHORIZED","message":"Authentication is required."}} | PASS | E-OUM-03a |
| 2. requester review -> 403 FORBIDDEN | HTTP 403 FORBIDDEN (backend role enforcement) | 403 FORBIDDEN {"error":{"code":"FORBIDDEN","message":"You do not have permission to perform this action."}} | PASS | E-OUM-03b |
| 3. unrelated reviewer -> 403 ACCESS_DENIED | HTTP 403 ACCESS_DENIED (not the assigned reviewer) | 403 ACCESS_DENIED {"error":{"code":"ACCESS_DENIED","message":"This request is not assigned to you."}} | PASS | E-OUM-03c |
| 4. Reviewer-B own request is assigned to Reviewer-A | HTTP 201, assignedReviewer = Reviewer-A (BR-05 category mapping) | 201 assignedReviewer=t.reviewer@cpe334.local | PASS | - |
| 4. self-approval -> 403 SELF_APPROVAL_NOT_ALLOWED | HTTP 403 SELF_APPROVAL_NOT_ALLOWED, checked before assignment | 403 SELF_APPROVAL_NOT_ALLOWED {"error":{"code":"SELF_APPROVAL_NOT_ALLOWED","message":"You cannot approve or reject your own request."}} | PASS | E-OUM-03d |
| 5. case-01 status and history unchanged by rejected calls | status APPROVED, 2 history entries, no new entries | status=APPROVED histories=2 (SUBMITTED -> APPROVED) | PASS | E-OUM-03d |

### UAT-OUM-04

| Step | Expected | Actual | Result | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 1. record requestNo, status and history before redeploy | requestNo recorded, status APPROVED, 2 history entries | requestNo=REQ-20261122-0001 status=APPROVED histories=2 | PASS | E-OUM-04a |
| 4. DELETE /api/requests/:id is not available | HTTP 404 NOT_FOUND (no delete endpoint) | 404 NOT_FOUND | PASS | E-OUM-04a |
| 4. history update is not available | HTTP 404 NOT_FOUND (no update endpoint) | 404 NOT_FOUND | PASS | E-OUM-04a |

## 3. Records created during this run

Sprint 1 has no delete endpoint. Return this list with the results.

- `REQ-20261122-0001` - UAT-OUM-01 normal journey, now APPROVED (`E-OUM-01a/b/c`, snapshot for `UAT-OUM-04`)
- `REQ-20261122-0002` - created unintentionally by the defective `UAT-OUM-02` input `amount = 10000000.00`
- `REQ-20261122-0003` - `UAT-OUM-02` disclosed PENDING probe for reject-without-comment
- `REQ-20261122-0004` - `UAT-OUM-03` Reviewer-B self-approval probe (assigned to Reviewer-A)

`REQ-20261122-0002` is listed for completeness because the first run of the automation did not track
rows created by an unexpectedly accepted "invalid" payload; the tracking logic was corrected afterwards.

## 4. Deviations and notes

- **Tester attribution:** Chawin owns `UAT-OUM-01/02`, Supichaya owns `UAT-OUM-03/04`; this was a
  team dry-run before the case correction. The cases were executed with the automated runner in one
  08:42 UTC session, so the names record the UAT Team's case ownership rather than who pressed each
  key. Finding `F-OUM-02-01` is reported by the team, not by an individual.
- **Finding F-OUM-02-01 (case defect):** the `UAT-OUM-02` input `amount = 10000000.00` contradicts
  BR-04 (`amount <= 9,999,999,999.99`). It is a **test-data error in the handoff**, not a product bug.
  Full report in `finding-case-defect.md`; supplementary boundary proof in `boundary-check.md`.
  As written, the case result is FAIL. With the input corrected to `10000000000.00`, the product
  returns `400 VALIDATION_ERROR` and creates no row.
- `UAT-OUM-02` step 2 requires a PENDING request assigned to Reviewer-A; the run creates a dedicated
  probe request for it, which is disclosed here and listed in §3.
- A case title that already exists for the requester gets a numeric suffix so the case can be re-run.
- `UAT-OUM-04` is **PARTIAL**: only the before snapshot is captured. Run `--phase post` after the
  agreed redeploy. If the redeploy does not happen, record **BLOCKED**, never PASS.
- No password, token or cookie value appears in any evidence file.

## 5. Evidence files

- `raw.jsonl` - every HTTP exchange (login bodies redacted)
- `boundary.jsonl` / `boundary-check.md` - supplementary BR-04 ceiling verification
- `finding-case-defect.md` - finding raised against the UAT case input
- `state.json` - ids and requestNos used by the post-redeploy phase

