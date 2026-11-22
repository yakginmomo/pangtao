# Lab 6 - UAT screenshot evidence (UAT-OUM-01..04)

> **Tester:** Chawin & Supichaya (Pangtao UAT Team)
> **Captured:** 2026-11-22T11:11:41.676Z (UTC)
> **Target:** https://sd3cdaba1-4d7hbszvwq-as.a.run.app
> **Running commit (GET /api/health):** `f371c232715f1185bc46b64ea28335639ae8eabf`
> **Tool:** UAT Team headless-browser screenshot script (Playwright Chromium, headless, 1280x900, full page)

Every image has a caption bar added by the script (evidence ID, case/step, actor, UTC time,
commit, URL), because headless screenshots have no address bar. **UI** images show the
product's own screen after a real user action. **API** images show a real backend response
obtained with `fetch()` from the same logged-in browser session (handoff §7.2), drawn in a
panel over the product page; they cover checks the UI deliberately does not offer.
No password, cookie or token appears in any image.

## Screenshots

| Evidence ID | Case / step | Kind | Actor | Expected | Observed | File |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `E-OUM-01a-1` | UAT-OUM-01 step 2 - New Request form filled | UI | Requester (oum.requester@cpe334.local) | Form accepts the synthetic inputs | Form filled before submit | [`E-OUM-01a-1.png`](./E-OUM-01a-1.png) |
| `E-OUM-01a-2` | UAT-OUM-01 step 2-3 - detail after submit | UI | Requester (oum.requester@cpe334.local) | PENDING; REQ-YYYYMMDD-NNNN; assigned to Reviewer-A; 1 SUBMITTED entry | PENDING; REQ-20261122-0011; assigned t.reviewer@cpe334.local; SUBMITTED | [`E-OUM-01a-2.png`](./E-OUM-01a-2.png) |
| `E-OUM-01a-3` | UAT-OUM-01 step 3 - My Requests | UI | Requester (oum.requester@cpe334.local) | New request listed as PENDING | Listed (see screenshot) | [`E-OUM-01a-3.png`](./E-OUM-01a-3.png) |
| `E-OUM-01b-1` | UAT-OUM-01 step 5 - Pending Reviews queue | UI | Reviewer-A (t.reviewer@cpe334.local) | Request present in Reviewer-A queue | Present (see screenshot) | [`E-OUM-01b-1.png`](./E-OUM-01b-1.png) |
| `E-OUM-01b-2` | UAT-OUM-01 step 5 - Approve with comment (before submit) | UI | Reviewer-A (t.reviewer@cpe334.local) | Decision form available to the assigned reviewer | Form shown, Approve selected | [`E-OUM-01b-2.png`](./E-OUM-01b-2.png) |
| `E-OUM-01b-3` | UAT-OUM-01 step 5 - decision recorded | UI | Reviewer-A (t.reviewer@cpe334.local) | HTTP 200; APPROVED; new APPROVED entry, actor Reviewer-A, exact comment | Decision recorded: request is now APPROVED (see screenshot) | [`E-OUM-01b-3.png`](./E-OUM-01b-3.png) |
| `E-OUM-01c` | UAT-OUM-01 step 6 - requester reopens detail | UI | Requester (oum.requester@cpe334.local) | APPROVED; SUBMITTED -> APPROVED | APPROVED; SUBMITTED -> APPROVED | [`E-OUM-01c.png`](./E-OUM-01c.png) |
| `E-OUM-02a-1` | UAT-OUM-02 step 1 (UI) - amount = 0 | UI | Requester (oum.requester@cpe334.local) | Inline validation error; form does not submit; no new row | "Amount must be greater than 0 and up to 9,999,999,999.99."; stayed on /requests/new = true | [`E-OUM-02a-1.png`](./E-OUM-02a-1.png) |
| `E-OUM-02a-2` | UAT-OUM-02 step 1 (UI) - amount = 10000000000.00 | UI | Requester (oum.requester@cpe334.local) | Inline validation error; form does not submit; no new row | "Amount must be greater than 0 and up to 9,999,999,999.99."; stayed on /requests/new = true | [`E-OUM-02a-2.png`](./E-OUM-02a-2.png) |
| `E-OUM-02a-3` | UAT-OUM-02 step 1 (UI) - title = AB | UI | Requester (oum.requester@cpe334.local) | Inline validation error; form does not submit; no new row | "Title must be between 3 and 150 characters."; stayed on /requests/new = true | [`E-OUM-02a-3.png`](./E-OUM-02a-3.png) |
| `E-OUM-02a-4` | UAT-OUM-02 step 1 (UI) - empty description | UI | Requester (oum.requester@cpe334.local) | Inline validation error; form does not submit; no new row | "Description is required (max 1,000 characters)."; stayed on /requests/new = true | [`E-OUM-02a-4.png`](./E-OUM-02a-4.png) |
| `E-OUM-02a-5` | UAT-OUM-02 step 1 (API) - invalid payloads | API | Requester (oum.requester@cpe334.local) | 400 VALIDATION_ERROR for each; no new row | amount = 0: 400 VALIDATION_ERROR; amount = 10000000000.00: 400 VALIDATION_ERROR; title = AB: 400 VALIDATION_ERROR; category = OTHER (not offered by the UI dropdown): 400 VALIDATION_ERROR; empty description: 400 VALIDATION_ERROR | [`E-OUM-02a-5.png`](./E-OUM-02a-5.png) |
| `E-OUM-02a-6` | UAT-OUM-02 step 2 (UI) - REJECT REQ-20261122-0006 with empty comment | UI | Reviewer-A (t.reviewer@cpe334.local) | Validation error; request stays PENDING | "A rejection comment of at least 3 characters is required." | [`E-OUM-02a-6.png`](./E-OUM-02a-6.png) |
| `E-OUM-02a-7` | UAT-OUM-02 step 2 (API) - REJECT without comment | API | Reviewer-A (t.reviewer@cpe334.local) | 400 VALIDATION_ERROR; PENDING; no history added | 400 VALIDATION_ERROR; status PENDING; history 1 | [`E-OUM-02a-7.png`](./E-OUM-02a-7.png) |
| `E-OUM-02b-1` | UAT-OUM-02 step 3 (UI) - reopen decided REQ-20261122-0011 | UI | Reviewer-A (t.reviewer@cpe334.local) | No second decision possible | Decision form not shown | [`E-OUM-02b-1.png`](./E-OUM-02b-1.png) |
| `E-OUM-02b-2` | UAT-OUM-02 step 3 (API) - second APPROVE | API | Reviewer-A (t.reviewer@cpe334.local) | 400 INVALID_STATE_TRANSITION; APPROVED; no new history | 400 INVALID_STATE_TRANSITION; APPROVED; history 2 | [`E-OUM-02b-2.png`](./E-OUM-02b-2.png) |
| `E-OUM-02c` | UAT-OUM-02 step 4 - My Requests count | API | Requester (oum.requester@cpe334.local) | count unchanged | before 10, after 10 | [`E-OUM-02c.png`](./E-OUM-02c.png) |
| `E-OUM-03a-1` | UAT-OUM-03 step 1 (UI) - open My Requests with no session | UI | Unauthenticated (no cookie) | No private data shown | redirected to /login | [`E-OUM-03a-1.png`](./E-OUM-03a-1.png) |
| `E-OUM-03a-2` | UAT-OUM-03 step 1 (API) - GET /api/requests/my with no cookie | API | Unauthenticated (no cookie) | 401 UNAUTHORIZED | HTTP 401 | [`E-OUM-03a-2.png`](./E-OUM-03a-2.png) |
| `E-OUM-03b-1` | UAT-OUM-03 step 2 (UI) - requester opens a reviewer page | UI | Requester (oum.requester@cpe334.local) | Requester cannot reach the review screen | 403 - Forbidden page | [`E-OUM-03b-1.png`](./E-OUM-03b-1.png) |
| `E-OUM-03b-2` | UAT-OUM-03 step 2 (API) - requester review | API | Requester (oum.requester@cpe334.local) | 403 FORBIDDEN | POST 403 FORBIDDEN; GET 403 FORBIDDEN | [`E-OUM-03b-2.png`](./E-OUM-03b-2.png) |
| `E-OUM-03c` | UAT-OUM-03 step 3 (API) - unrelated reviewer | API | Reviewer-B (manager.hybrid@cpe334.local) | 403 ACCESS_DENIED | 403 ACCESS_DENIED | [`E-OUM-03c.png`](./E-OUM-03c.png) |
| `E-OUM-03d` | UAT-OUM-03 step 4 (UI) - Reviewer-B approves own REQ-20261122-0007 | UI | Reviewer-B (manager.hybrid@cpe334.local) | 403 SELF_APPROVAL_NOT_ALLOWED; status unchanged | alert SELF_APPROVAL_NOT_ALLOWED; assigned t.reviewer@cpe334.local; status PENDING | [`E-OUM-03d.png`](./E-OUM-03d.png) |
| `E-OUM-03e` | UAT-OUM-03 step 5 (UI) - Reviewer-B opens detail of REQ-20261122-0011 | UI | Reviewer-B (manager.hybrid@cpe334.local) | 403 ACCESS_DENIED; no data disclosed | Access Denied page (see screenshot) | [`E-OUM-03e.png`](./E-OUM-03e.png) |
| `E-OUM-03f` | UAT-OUM-03 step 6 (UI) - requester re-checks the case-01 request | UI | Requester (oum.requester@cpe334.local) | APPROVED; 2 entries | APPROVED; SUBMITTED -> APPROVED | [`E-OUM-03f.png`](./E-OUM-03f.png) |
| `E-OUM-04b-1` | UAT-OUM-04 health after redeploy | API | Unauthenticated | commit f371c232715f1185bc46b64ea28335639ae8eabf | HTTP 200; commit f371c232715f1185bc46b64ea28335639ae8eabf | [`E-OUM-04b-1.png`](./E-OUM-04b-1.png) |
| `E-OUM-04b-2` | UAT-OUM-04 step 3 (UI) - reopen REQ-20261122-0005 after redeploy | UI | Requester (oum.requester@cpe334.local) | same requestNo, APPROVED, identical history | APPROVED; identical to snapshot = true | [`E-OUM-04b-2.png`](./E-OUM-04b-2.png) |
| `E-OUM-04b-3` | UAT-OUM-04 step 4 (API) - PUT/DELETE history | API | Requester (oum.requester@cpe334.local) | 404 or 405 | PUT 404; DELETE 404 | [`E-OUM-04b-3.png`](./E-OUM-04b-3.png) |

## Captions

- **E-OUM-01a-1** - Requester fills the New Request form with the case inputs (1500.00, EQUIPMENT).
- **E-OUM-01a-2** - Detail of the new request REQ-20261122-0011: PENDING, one SUBMITTED history entry.
- **E-OUM-01a-3** - My Requests lists REQ-20261122-0011 with status PENDING.
- **E-OUM-01b-1** - Reviewer-A's assigned pending queue contains REQ-20261122-0011.
- **E-OUM-01b-2** - Reviewer-A selects Approve and enters the comment "Approved for UAT".
- **E-OUM-01b-3** - Success message; status APPROVED; APPROVED history entry by T Reviewer with the comment.
- **E-OUM-01c** - Requester sees REQ-20261122-0011 as APPROVED with two ordered history entries.
- **E-OUM-02a-1** - Invalid input amount = 0: inline validation error, form not submitted.
- **E-OUM-02a-2** - Invalid input amount = 10000000000.00: inline validation error, form not submitted.
- **E-OUM-02a-3** - Invalid input title = AB: inline validation error, form not submitted.
- **E-OUM-02a-4** - Invalid input empty description: inline validation error, form not submitted.
- **E-OUM-02a-5** - Backend rejects all five invalid payloads with 400 VALIDATION_ERROR (category OTHER cannot be chosen in the UI).
- **E-OUM-02a-6** - Reviewer-A tries to reject REQ-20261122-0006 without a comment: inline error, nothing submitted.
- **E-OUM-02a-7** - Backend returns 400 VALIDATION_ERROR; the target stays PENDING with one history entry.
- **E-OUM-02b-1** - For an APPROVED request the UI offers no decision form ("already been decided").
- **E-OUM-02b-2** - Backend returns 400 INVALID_STATE_TRANSITION; still APPROVED with 2 history entries.
- **E-OUM-02c** - No rejected operation created a request (target reused from the 09:04 run, so no new row).
- **E-OUM-03a-1** - Without a session the app redirects to the login page.
- **E-OUM-03a-2** - Browser opens the API URL directly with no cookie: 401 UNAUTHORIZED, no data.
- **E-OUM-03b-1** - The UI shows 403 Forbidden for a requester on a reviewer route (UI guard; backend shown next).
- **E-OUM-03b-2** - Backend role enforcement: 403 FORBIDDEN on POST review (and on GET pending).
- **E-OUM-03c** - Reviewer-B is not the assigned reviewer: 403 ACCESS_DENIED (the UI cannot open this request for Reviewer-B, see E-OUM-03e).
- **E-OUM-03d** - Reviewer-B's own request (assigned to Reviewer-A): approve attempt returns SELF_APPROVAL_NOT_ALLOWED from the server.
- **E-OUM-03e** - Reviewer-B is neither owner nor assigned reviewer: Access Denied (ACCESS_DENIED), no request data shown.
- **E-OUM-03f** - Status and history unchanged by all rejected calls.
- **E-OUM-04b-1** - GET /api/health after the redeploy: same commit (same image, as the handoff specifies).
- **E-OUM-04b-2** - REQ-20261122-0005 still APPROVED with the same two history entries as the 09:04 snapshot.
- **E-OUM-04b-3** - No update/delete surface for history: both probes return 404.

## Data used

- Reused from the 09:04 API run: case-01 `REQ-20261122-0005` (UAT-OUM-04), reject target `REQ-20261122-0006` (UAT-OUM-02 step 2), Reviewer-B own request `REQ-20261122-0007` (UAT-OUM-03 step 4).
- Created by this run (return for cleanup; Sprint 1 has no delete endpoint): `REQ-20261122-0011`.
- Also created by an earlier screenshot attempt whose images were discarded (caption bar covered page content): `REQ-20261122-0010`. Same journey and results; include it in the cleanup list.

## Limits

- `E-OUM-04a` (before redeploy) could not be screenshotted retroactively; it is the 09:04 API
  snapshot in `uat-2026-11-22T09-04-25-620Z/`. The images here are `E-OUM-04b` (after).
- Category `OTHER` cannot be selected in the UI dropdown, so it appears only in the API image.
- The Cloud Run revision is not visible from the app; see `partner-cases-execution.md` §9.

