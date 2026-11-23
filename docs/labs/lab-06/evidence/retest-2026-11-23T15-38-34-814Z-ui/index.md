# Lab 6 - UI evidence for the F-PB-01 retest (`UAT-PB-03`)

> **Tester:** Chawin & Supichaya (Pangtao UAT Team)
> **Executed (UTC):** 2026-11-23T15:38:41.739Z
> **Target:** https://sd3cdaba1-4d7hbszvwq-as.a.run.app
> **Running commit:** `90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f`
> **Input:** exactly the reported one - title `UAT-Fin-01 (UI retest)`, amount
> `1234567.89`, category Equipment, description `Test Amount value.`

## Result

**PASS** - the form accepted `1234567.89` and created `REQ-20261123-0005` (status `PENDING`, amount `1234567.89`). No inline validation error was shown.

## Images

| Evidence ID | File | What it shows |
| :--- | :--- | :--- |
| `E-PB-RT-03-UI-1` | [`E-PB-RT-03-UI-1.png`](./E-PB-RT-03-UI-1.png) | New Request form filled with the reported input (amount 1234567.89) before submit - no inline error shown. Captured separately, see note below |
| `E-PB-RT-03-UI-2` | [`E-PB-RT-03-UI-2.png`](./E-PB-RT-03-UI-2.png) | Request created from the UI with amount 1234567.89 - navigated to /requests/e19100e4-d942-4c6c-8fe1-9eba2e42c8ce |
| `E-PB-RT-03-UI-3` | [`E-PB-RT-03-UI-3.png`](./E-PB-RT-03-UI-3.png) | The request created with 1234567.89 is listed - REQ-20261123-0005 listed |

**Note on `E-PB-RT-03-UI-1`:** the 15:38 UTC pass submitted the form straight away and did not keep a
before-submit image. `E-PB-RT-03-UI-1` was captured afterwards, at 2026-11-23T16:23:38Z (23:23 ICT),
on the same commit `90e9fac…` (checked with `GET /api/health` first), with the same inputs. The form
was **not submitted**, so this capture created no record. The submit result itself is shown by
`-UI-2` and `-UI-3` from the 15:38 UTC pass.

## Records created

- `REQ-20261123-0005` (by the 15:38 UTC pass; the `-UI-1` capture created none)

