# Lab 6 - UAT execution record (post phase)

> **Tester:** Chawin & Supichaya (Pangtao UAT Team)
> **Executed:** 2026-11-23T15:39:03.212Z
> **Target:** https://sd3cdaba1-4d7hbszvwq-as.a.run.app
> **Running commit:** `90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f`
> **Cases:** UAT-OUM-01..04 (partner handoff document)

## 1. Case summary

| Case ID | Tester | Date/time (UTC) | Version | Inputs | ACTUAL result | Result | Evidence IDs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UAT-OUM-01` | Chawin & Supichaya (Pangtao UAT Team) | 2026-11-23T15:39:03.212Z | `90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f` | 1500.00 EQUIPMENT | Not executed in this phase | **NOT RUN** | - |
| `UAT-OUM-02` | Chawin & Supichaya (Pangtao UAT Team) | 2026-11-23T15:39:03.212Z | `90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f` | amount 0 / 10000000000.00; title AB; category OTHER; empty description; REJECT without comment; second APPROVE; target setup 250.00 EQUIPMENT | Not executed in this phase | **NOT RUN** | - |
| `UAT-OUM-03` | Chawin & Supichaya (Pangtao UAT Team) | 2026-11-23T15:39:03.212Z | `90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f` | no cookie; requester review; unrelated reviewer; self-approval; Reviewer-B detail access | Not executed in this phase | **NOT RUN** | - |
| `UAT-OUM-04` | Chawin & Supichaya (Pangtao UAT Team) | 2026-11-23T15:39:03.212Z | `90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f` | case-01 requestNo + redeploy (same commit, new revision) | All observations matched the expected results (see §2). | **PASS** | E-OUM-04a,b |

## 2. Observation detail

### UAT-OUM-04

| Step | Expected | Actual | Result | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 3. same requestNo and status after redeploy | requestNo REQ-20261122-0005, status APPROVED | requestNo=REQ-20261122-0005 status=APPROVED | PASS | E-OUM-04b |
| 3. history entries unchanged after redeploy (append-only) | 2 identical entries in the same order | 2 entries, identical=true | PASS | E-OUM-04b |
| 4. PUT /api/requests/:id/history still unavailable | HTTP 404 NOT_FOUND or 405 METHOD_NOT_ALLOWED | 404 NOT_FOUND | PASS | E-OUM-04b |
| 4. DELETE /api/requests/:id/history still unavailable | HTTP 404 NOT_FOUND or 405 METHOD_NOT_ALLOWED | 404 NOT_FOUND | PASS | E-OUM-04b |
| 4. update/delete still unavailable after redeploy | HTTP 404 NOT_FOUND | 404 NOT_FOUND | PASS | E-OUM-04b |

## 3. Records created during this run

Sprint 1 has no delete endpoint. Return this list with the results.

_None._

## 4. Deviations and notes

- Executed against the corrected handoff (commit `284533d`): the `UAT-OUM-02` input is now
  `10000000000.00` (above the BR-04 ceiling), the reject target is created in step 2 as specified,
  and `UAT-OUM-03` step 5 (Reviewer-B detail access) is included.
- Because the Product Team does not reset data before the retest, an already-existing case-01
  title gets a numeric suffix so every case can be re-run; all created requestNos are listed in §3.
- `BLOCKED` is not a pass: if the redeploy for `UAT-OUM-04` does not happen, record BLOCKED explicitly.

## 5. External confirmations required

- UAT-OUM-04 redeploy: /api/health commit before=f371c232715f1185bc46b64ea28335639ae8eabf, after=90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f. The handoff specifies the SAME commit with a NEW Cloud Run revision; confirm the old/new revision numbers from the Product Team's deployment tooling or the Cloud Console. If no redeploy happened, record BLOCKED - never PASS.

## 6. Evidence files

- `raw.jsonl` - every HTTP exchange (login bodies redacted)
- `state.json` - ids and requestNos used by the post-redeploy phase

