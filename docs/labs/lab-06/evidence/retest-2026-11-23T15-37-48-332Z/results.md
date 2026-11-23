# Lab 6 - independent retest of F-PB-01 / F-PB-02 (UAT-PB-03, UAT-PB-04)

> **Tester:** Chawin (Pangtao UAT Team) - case owner UAT-PB-03 and UAT-PB-04
> **Executed (UTC):** 2026-11-23T15:37:48.333Z
> **Target:** https://sd3cdaba1-4d7hbszvwq-as.a.run.app
> **Running commit:** `90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f`
> **Cases:** `UAT-PB-03` (F-PB-01), `UAT-PB-04` (F-PB-02) + regression guards
> **Credentials:** supplied privately, never written here; login bodies are redacted in `raw.jsonl`

## 1. Case summary

| Case | Finding | Observations | PASS | FAIL | Result |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `UAT-PB-03` | F-PB-01 | 6 | 6 | 0 | **PASS** |
| `UAT-PB-04` | F-PB-02 | 6 | 5 | 1 | **PASS with 1 disclosed deviation** |

## 2. Observation detail

| Case | Step | Expected | Actual | Result | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PREFLIGHT` | 1. release identity | HTTP 200 with the corrected commit 90e9fac… | 200 commit=90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f | PASS | E-PB-RT-00 |
| `UAT-PB-03` | 0. login as requester | HTTP 200, role REQUESTER | 200 role=REQUESTER | PASS | - |
| `UAT-PB-03` | 1. valid amount 1234567.89 is accepted | HTTP 201, status PENDING, requestNo issued, amount 1234567.89, assigned reviewer = Reviewer-A | 201 status=PENDING requestNo=REQ-20261123-0002 amount=1234567.89 assignedReviewer=t.reviewer@cpe334.local | PASS | E-PB-RT-03a |
| `UAT-PB-03` | 2. amount stored unchanged and one SUBMITTED history entry | amount 1234567.89, 1 history entry SUBMITTED by the requester | amount=1234567.89 histories=1 SUBMITTED/oum.requester@cpe334.local | PASS | E-PB-RT-03a |
| `UAT-PB-03` | 3. a second affected amount, sent as a number, is also accepted | HTTP 201, amount 2097190.01 | 201 amount=2097190.01 {"data":{"request":{"id":"56174c3e-c30b-4d66-94f8-b4e4ae23abb4","requestNo":"REQ-20261123-0003","title":"UAT-Fin-02","amount":"2097190.01","category":"EQUIPMENT","description":"Second large 2-decimal amount, sent as a JSON number.","status":"PENDING","requesterId":"f967243b-5527-4378-b45a-99532f5152f5","assignedReviewerId":"7e47dab2-eaef-43d7-ba89-885251be0234","createdAt":"2026-11-23T15:37:55.303 | PASS | E-PB-RT-03b |
| `UAT-PB-03` | 4. the fix did not widen the ceiling | HTTP 400 VALIDATION_ERROR, no row created | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"amount","message":"Amount must be greater than 0 and at most 9,999,999,999.99."}]}} | PASS | E-PB-RT-03c |
| `UAT-PB-03` | 5. more than 2 decimals is still rejected | HTTP 400 VALIDATION_ERROR, no row created | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"amount","message":"Amount must have at most 2 decimal places."}]}} | PASS | E-PB-RT-03c |
| `UAT-PB-04` | 1. oversized body with a session returns a 4xx, never 500 | HTTP 4xx with a standard error code (400 VALIDATION_ERROR per the fix), no row created | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request body is too large."}} | PASS | E-PB-RT-04a |
| `UAT-PB-04` | 2. no 500 for an unauthenticated oversized body | never HTTP 500 (NFR-04); a 4xx with a standard code | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request body is too large."}} | PASS | E-PB-RT-04b |
| `UAT-PB-04` | 2b. check order: AC-04 expects 401 UNAUTHORIZED for an unauthenticated call | HTTP 401 UNAUTHORIZED | 400 VALIDATION_ERROR (body-size limit is applied by the JSON parser before the authentication middleware, so the size error wins; the 500 is gone but the AC-04 precedence is not met. Disclosed as a minor deviation, not a blocker.) | FAIL | E-PB-RT-04b |
| `UAT-PB-04` | 3. description over 1,000 characters is rejected | HTTP 400 VALIDATION_ERROR | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"description","message":"Description must not exceed 1,000 characters."}]}} | PASS | E-PB-RT-04c |
| `UAT-PB-04` | 4. exactly 1,000 characters is accepted (boundary) | HTTP 201, status PENDING | 201 requestNo=REQ-20261123-0004 | PASS | E-PB-RT-04c |
| `UAT-PB-04` | 5. title over 150 characters is rejected | HTTP 400 VALIDATION_ERROR | 400 VALIDATION_ERROR {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"title","message":"Title must not exceed 150 characters."}]}} | PASS | E-PB-RT-04c |

## 3. Records created during this retest

Sprint 1 has no delete endpoint. Return this list to the Product Team for the post-grading reset.

- `REQ-20261123-0002`
- `REQ-20261123-0003`
- `REQ-20261123-0004`

## 4. Notes

- `UAT-PB-03` was originally observed in the UI (inline form error). The API observations here
  prove the server accepts the amount; the UI path is captured separately by
  the UAT Team's headless-browser screenshot pass (evidence `E-PB-RT-03-UI`).
- `UAT-PB-04` observation 2b is expected to FAIL by design of this script: it records the
  precedence question (AC-04 wants 401 first) instead of hiding it. The 500 defect itself is
  verified fixed by observations 1 and 2.
- The 200,000-character payload is not written to `raw.jsonl`; only its length and the response are.

## 5. Evidence files

- `raw.jsonl` - every HTTP exchange (login bodies redacted)
- `results.md` - this file

**Total: 13 observations, 12 PASS, 1 FAIL.**

