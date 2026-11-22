# Supplementary boundary check - UAT-OUM-02

> **Target:** https://sd3cdaba1-4d7hbszvwq-as.a.run.app
> **Running commit:** `f371c232715f1185bc46b64ea28335639ae8eabf`
> **Executed:** 2026-11-22T08:43:25.060Z

## Why this check exists

The handoff case lists `amount = 10000000.00` (10 million) as invalid, but BR-04 and the
implementation set the ceiling at `9,999,999,999.99` (about 10 billion). The 10-million
input is therefore **inside** the allowed range. These probes test the documented ceiling.

| Probe | Input | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- |
| above BR-04 maximum (10,000,000,000.00) | `10000000000` | 400 `VALIDATION_ERROR`, no row | 400 `VALIDATION_ERROR` | PASS |
| more than 2 decimal places (9,999,999,999.999) | `9999999999.999` | 400 `VALIDATION_ERROR`, no row | 400 `VALIDATION_ERROR` | PASS |

Login: 200 - the probes ran with an authenticated requester cookie.

Raw exchanges are in `boundary.jsonl` in this folder.
