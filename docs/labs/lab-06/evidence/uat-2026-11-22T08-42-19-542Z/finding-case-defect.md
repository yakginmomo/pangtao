# Finding F-OUM-02-01 - incorrect out-of-range input in UAT-OUM-02

| Field | Value |
| :--- | :--- |
| Finding ID | `F-OUM-02-01` |
| Type | **UAT case defect (test data)** - not a product defect |
| Product team / owner | Oum & T (`ssiriwan/cpe334-approval-system`) |
| Reporter | Pangtao UAT Team - Chawin and Supichaya |
| Reported | 2026-11-22 (UTC) |
| Tested version | running commit `f371c232715f1185bc46b64ea28335639ae8eabf` (Cloud Run `sd3cdaba1-4d7hbszvwq-as.a.run.app`) |
| Linked case | `UAT-OUM-02` step 1 (`E-OUM-02a`, `E-OUM-02c`) |
| Linked requirement | BR-04 (`amount` must be > 0 and **<= 9,999,999,999.99**), AC-02 |
| Severity | **Low** - no user impact; the product enforces the documented rule correctly. Impact is on grading evidence: the case as written reports FAIL even though the product is correct. |

## Preconditions / data

- Authenticated as `oum.requester@cpe334.local`.
- `UAT-OUM-01` request `REQ-20261122-0001` exists and is `APPROVED`.
- Requester's own request count before this step: **2**.

## Reproduction

1. `POST /api/requests` with
   `{ title: "UAT boundary probe", amount: 10000000.00, category: "EQUIPMENT", description: "UAT case 02" }`.
2. Observe response and re-read `GET /api/requests/my`.

## Expected (per the handoff case as written)

`400 VALIDATION_ERROR` and no new request row.

## Actual

`HTTP 201` with `requestNo = REQ-20261122-0002`, `status = PENDING`, `amount = "10000000.00"`,
`assignedReviewer = t.reviewer@cpe334.local`. My-request count changed **2 -> 3**.

## Root cause

The case input contradicts its own requirement. BR-04 and the implementation
(server-side validation: `.max(9999999999.99)`) cap `amount` at **9,999,999,999.99**
(about 10 billion). The case supplies **10,000,000.00** (10 million), which is three orders of
magnitude **inside** the allowed range. No product code change is warranted.

## Consequential deviations (same root cause)

| Observation | Expected | Actual | Result |
| :--- | :--- | :--- | :--- |
| `UAT-OUM-02` step 1 "no request row created by invalid payloads" | count unchanged (2) | count 2 -> 3 | FAIL |
| `UAT-OUM-02` step 4 "request count unchanged by rejected operations" | 3 (2 + disclosed probe) | 4 (extra row above) | FAIL |

All other `UAT-OUM-02` observations passed: amount 0, `title = AB`, `category = OTHER`, empty
description, REJECT without comment and the second APPROVE all returned the specified 4xx codes
with no state change.

## Verification against the real BR-04 ceiling

Supplementary probe (evidence in `boundary.jsonl` / `boundary-check.md`):

| Input | Expected | Actual | Result |
| :--- | :--- | :--- | :--- |
| `10000000000.00` (above max) | 400 `VALIDATION_ERROR`, no row | 400 `VALIDATION_ERROR`, no row | PASS |
| `9999999999.999` (> 2 decimals) | 400 `VALIDATION_ERROR`, no row | 400 `VALIDATION_ERROR`, no row | PASS |

**Conclusion:** BR-04 is enforced correctly. The product should not be changed.

## Recommended action

1. Product Team corrects the handoff case input from `10000000.00` to `10000000000.00` (or updates
   BR-04 if 10,000,000 was genuinely intended as the ceiling - that would be an approved scope change
   with AC/TEST impact, not a silent edit).
2. Re-run `UAT-OUM-02` with the corrected input and record the result against the corrected case.
3. Reset `REQ-20261122-0002` with the rest of the synthetic test data before grading.

## Evidence

- `raw.jsonl` - exchange `1. invalid payload: amount = 10000000.00` (status 201, body contains `REQ-20261122-0002`)
- `results.md` - §2 `UAT-OUM-02` observation rows 2, 6 and 11
- `boundary.jsonl`, `boundary-check.md` - BR-04 ceiling proof
- `state.json` - complete list of records created during the run
