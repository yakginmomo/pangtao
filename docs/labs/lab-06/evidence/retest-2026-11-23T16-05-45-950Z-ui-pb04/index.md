# Lab 6 - API/browser evidence for the F-PB-02 retest (`UAT-PB-04`)

> **Tester:** Chawin & Supichaya (Pangtao UAT Team)
> **Executed (UTC):** 2026-11-23T16:05:49.224Z
> **Target:** https://sd3cdaba1-4d7hbszvwq-as.a.run.app
> **Running commit:** `90e9facdaeb4ef8555c82aa6962bb3fb4f2baf9f`
> **Method:** real `fetch()` from the product page in a Playwright browser
> (handoff §7.2). The response shown is the actual one; the request body is summarised
> by its size instead of being printed.

## Result

**PASS** - every invalid payload returned a standard 4xx. The 200,000-character body returns `400 VALIDATION_ERROR "Request body is too large."` instead of the original `500 INTERNAL_ERROR`. Without a session it is still `400`, not `401` (deviation 2b, disclosed).

| Exchange | Status | Response |
| :--- | :---: | :--- |
| description of 200,000 characters (the reported input) | 400 | {"error":{"code":"VALIDATION_ERROR","message":"Request body is too large."}} |
| description of 1,001 characters (AC-02 boundary) | 400 | {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"description","message":"Description must not exceed 1,000 characters."}]}} |
| title of 151 characters (AC-02 boundary) | 400 | {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","details":[{"path":"title","message":"Title must not exceed 150 characters."}]}} |
| description of 200,000 characters, NO session cookie | 400 | {"error":{"code":"VALIDATION_ERROR","message":"Request body is too large."}} |

## Images

| Evidence ID | File | What it shows |
| :--- | :--- | :--- |
| `E-PB-RT-04a` | [`E-PB-RT-04a.png`](./E-PB-RT-04a.png) | Every invalid payload returns a standard 4xx - no 500 - 400 {"error":{"code":"VALIDATION_ERROR","message":"Request body is too large."}} / 400 {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","det / 400 {"error":{"code":"VALIDATION_ERROR","message":"Request payload is invalid.","det |
| `E-PB-RT-04c` | [`E-PB-RT-04c.png`](./E-PB-RT-04c.png) | Exactly 1,000 characters was accepted - the boundary is at 1,000, not lower - status PENDING, amount 10.00 |
| `E-PB-RT-04b` | [`E-PB-RT-04b.png`](./E-PB-RT-04b.png) | Still a 4xx (never 500); returns 400 before 401 - disclosed as deviation 2b - 400 {"error":{"code":"VALIDATION_ERROR","message":"Request body is too large."}} |

## Records created

_None_ - every request in this script was rejected; the boundary image reuses an existing request.

