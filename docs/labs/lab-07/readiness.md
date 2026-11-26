# Pangtao Lab 7 Part D: Release readiness and retrospective

Scope: the **maintained Sprint 1 functionality** (F-01 to F-08) in the current deployed release, including the approved BR-10 change (Issue #49) and the Sprint 1 behaviour it must not break. Sprint 2/3 features are not part of this review; none is on `main` (§1).

| Field | Value |
|---|---|
| Team | ผิงโหด: Chawin (67070501012), Supichaya (67070501087) |
| Review date | 26 Nov 2026 (Bangkok) |
| Basis | `git log` of `main` and `sprint-2-staging`, GitHub Issues, PRs and Actions runs, the Cloud Run deploy logs, `docs/traceability.md` §3, Lab 6 `uat.md` §7–§8, `change-impact.md` §5, `metrics.md` |

## 1. Versions

| Role | Version |
|---|---|
| Sprint 1 baseline tag | `v0.1.0` = `bec5575` |
| Accepted Sprint 1 release (Lab 6 UAT) | `main` at `64c98f4`, revision `pangtao-00006-cjx`, accepted 22 Nov 2026 |
| Pre-change implementation | `main` at `41bb484` (PR #48), revision `pangtao-00008-dfl` |
| **Submitted release** | **`main` at `2dc3dc1` (PR #52), Deploy demo run `45637417725`, Cloud Run revision `pangtao-00009-cwz`, serving 100% of traffic at https://pangtao-vowtduxdha-as.a.run.app** |
| Other revisions | `pangtao-00010-ges` (Lab 6 controlled-exercise build `345c320`) is kept for Lab 6 grading with 0% traffic. Its `exercise` tag was removed on 26 Nov 2026 (R-1), so no URL serves it |
| Later-sprint work on `main` | None. Since `64c98f4` `main` gained only the CE-F-01 regression test and fix (PR #47/#48) and the BR-10 change (PR #50–#52) |

## 2. Readiness checklist

| Area | Status | Evidence |
|---|---|---|
| Deployed version | `2dc3dc1` / `pangtao-00009-cwz`; `GET /api/v1/health` 200 `{"status":"ok"}` on 26 Nov | Deploy demo run `45637417725`; `change-impact.md` §5 step 6 |
| Approved change | BR-10 v2.0 implemented as contracted: T−91 → 400 `DATE_TOO_OLD`, T−90 → 201, UI picker T−90 to T. Contract reviewed before code (PR #50 approved 20:29, red `676e90c` at 20:40) | traceability v2.0 and §3 Lab 7 tested version; PR #50, #51 |
| Defects | 2 recorded in the period, 0 open against the submitted release. See §3 | Lab 6 `uat.md` §7.3, §8; Issue #46 |
| Automated tests | Unit + API **137 passed, 0 failed, 0 skipped**; E2E **20 passed, 0 failed, 0 skipped, 0 flaky**; service-layer line coverage 99.02% (gate 80%); lint and both type-checks clean; build succeeded. Same counts re-run on `2dc3dc1` | traceability §3 (Lab 7 tested version, `5b16bc7`); `metrics.md` M-3 (EV-C-03) |
| CI | PR #51 run `45628663171` and release PR #52 run `45636816104`: 4/4 jobs passed. Deploy run `45637417725` re-ran the four jobs, then deployed: 5/5 passed. One CI run cancelled (`45636767079`, superseded 1 min later) | `metrics.md` M-5 |
| Skipped checks | Deploy smoke test: `SKIP login: optional smoke credentials not configured` (only `/api/v1/health` and `/` are checked automatically). No skipped unit, API or E2E test | Deploy run `45637417725`, step "Smoke test public URL"; TD-2 |
| User tests (Sprint 1) | Lab 6 UAT by the partner team: UAT-01 to UAT-08 **PASS** on `64c98f4` (22 Nov 21:35, after the `UATF-01` reset). Controlled exercise on `pangtao-00010-ges`: UAT-04 **FAIL** (CE-F-01, defect injected on purpose), others PASS | Lab 6 `uat.md` §7.1, §7.3, §8 |
| User tests (Lab 7, manual) | Post-deploy checks PD-1 to PD-6 on `pangtao-00009-cwz`, 26 Nov 01:43: all as expected (T−91 400, T−90 201, cross-user read 404, cross-user post at T−91 404, Admin 403, anonymous 401). PD-3 needed a re-run because the first attempt's script sent an empty ID (400 `VALIDATION_ERROR`); both results are recorded | `change-impact.md` §5 step 7 (EV-B-POST) |
| Not re-tested by users | The partner team has not run UAT on `pangtao-00009-cwz`. Lab 6 cases use dates at most 31 days old, so they stay valid under the 90-day rule (`change-impact.md` §2, "UAT documents") | — |
| Technical debt | 5 items, none blocking. See §4 | — |
| Configuration and secrets | No new env var: 90 is the code constant `BACKDATE_LIMIT_DAYS`; `APP_TIMEZONE` still defines "today". `DATABASE_URL` and `SEED_DEFAULT_PASSWORD` come from Secret Manager; the image holds no `.env`; CI uses no repository secrets. Evidence uses only the synthetic seed accounts | `deployment.md` §2; System-Level SDS §7 |
| Documentation and run instructions | README quickstart (NFR-05) and `docs/labs/lab-05/deployment.md` unchanged by Lab 7 and still accurate. Contracts F-05 1.3, F-06 1.3, F-04 1.2; SRS v2.0; traceability v2.0. Stale entries found by this review (CE-F-01 row in `uat.md`, pre-change revision in `change-impact.md` §0, M-4 severity) are corrected in the same PR as this file | this PR |
| Deployment and smoke | Deploy demo run `45637417725` success: migrate job, new revision, smoke `PASS /api/v1/health`, `PASS /`; login check skipped (TD-2) | Deploy run log |

## 3. Defects by severity and status

| ID | Found by | Severity | Status | Notes |
|---|---|---|---|---|
| `UATF-01` | Partner UAT, UAT-02 step 3, 22 Nov | Minor (operational) | **Closed** | Starting data not reset before the session; §4.1 reset run, retest PASS 22 Nov 21:35. No code change |
| CE-F-01 (#46) | Partner, Lab 6 controlled exercise on `pangtao-00010-ges`, 24 Nov | Major | **Fixed and released**; Issue closed 25 Nov 19:11 | Injected on purpose (PR #45). Red `d082577`, green `adc801b` (PR #47), released in `41bb484` (`pangtao-00008-dfl`) and still in `2dc3dc1`. A UAT Team retest on a fixed revision is not recorded (R-3). The defective build's `exercise` tag URL was removed on 26 Nov (R-1) |
| Lab 7 | Tests, CI, post-deploy checks | — | None found | — |

## 4. Technical debt

| ID | Item | Impact | Priority | Disposition |
|---|---|---|---|---|
| TD-1 | The BR-10 window is coded twice: `server/src/utils/date.util.ts` and `web/src/utils/date.ts` | If they drift, the form could block a date the server accepts, or the reverse. The server stays authoritative | Low | Keep. The unit test "the web form uses the same window as the server" fails on any drift. Revisit if a shared package is added |
| TD-2 | The deploy smoke test skips its login check (`SMOKE_EMAIL` / `SMOKE_PASSWORD` not set in the `demo` environment) | The pipeline proves health and the SPA only; an authentication or session regression would pass the deploy and be found by hand | Medium | Add a dedicated USER smoke account to the `demo` environment before Final Delivery (R-4) |
| TD-3 | The date picker's `min`/`max` are computed when the form renders | A form left open across Bangkok midnight offers yesterday's window until it re-renders. The submit check and the server compute the window at use, so no wrong date is saved | Low | Accept; noted as a known limitation |
| TD-4 | `deploy/tests/` (offline stub tests of the deploy scripts) are not run by `ci.yml` | A change to the deploy scripts can break the pipeline without a failing check | Low | Add a CI job before Final Delivery, or record why not |
| TD-5 | The exercise revision `pangtao-00010-ges` and its image are kept for Lab 6 grading | Storage cost only; no URL serves it since R-1 | Low | Tag removed 26 Nov (R-1); delete the revision and image after Lab 6 grading |

## 5. Outstanding items

| ID | Item | Owner | Action | Due | Blocks READY? |
|---|---|---|---|---|---|
| R-1 | **Done.** The `exercise` tag routed to `pangtao-00010-ges` (CE-F-01 defect) at `https://exercise---pangtao-vowtduxdha-as.a.run.app`, which returned 200 on 26 Nov. As a revision of the production service it could write to the production database | Chawin | `gcloud run services update-traffic pangtao --remove-tags exercise` run on 26 Nov 2026. Confirmed at 09:17: `gcloud run services describe` shows only `pangtao-00009-cwz`, 100%, no tag; the tag URL's `/api/v1/health` returns 404; the production URL returns 200 | Done 26 Nov 2026 | Was the only blocker |
| R-2 | Issue #49 still open after release and post-deploy checks | Supichaya | Close with the release and PD-1 to PD-6 summary (Part C action) | 26 Nov 2026 | No |
| R-3 | CE-F-01 retest by the UAT Team not recorded | Chawin | Ask the partner team to re-run UAT-04 on the production URL and record the result in `uat.md` §7.3, or record that no retest was done | Before Final Delivery | No |
| R-4 | Smoke login check skipped (TD-2) | Chawin | Set `SMOKE_EMAIL` and the `SMOKE_PASSWORD` secret in the `demo` environment; confirm `PASS login` on the next deploy | Before Final Delivery | No |
| R-5 | PD-2 left one 1.00 THB synthetic Payment (memo "LAB7 post-deploy check") in Alice's production ledger | Supichaya | Run the Lab 6 §4.1 reset before the next UAT or demo session | Before the next session | No |

## 6. Decision

**READY** (26 Nov 2026, 09:17) for the maintained Sprint 1 scope in `2dc3dc1` / `pangtao-00009-cwz`. The approved change is verified at the boundary in tests and on the deployed revision; 137 + 20 automated tests pass with none skipped; CI is green; user isolation and Admin denial are confirmed on the deployed revision; no defect is open against the release.

This review first found the release NOT READY: the Lab 6 exercise build, with a known Major money defect, was still publicly reachable on its `exercise` tag (R-1). The tag was removed and checked the same morning. R-2 to R-5 remain open; none blocks the decision, and each has an owner and a date. The skipped login smoke check (TD-2) is disclosed, and the authenticated paths were checked by hand (PD-1 to PD-6).

## 7. Retrospective

| Question | Answer |
|---|---|
| What helped? | Writing the contract first, with the check order spelled out and reviewed (PR #50), made the implementation one small diff, and the Bob-at-T−91 case in TEST-05.14 pins the 404-before-400 order. CI also caught the Lab 6 injected defect on PR #45 (run `45221424268` failed), so the test suite was proven to guard BR-05. |
| What hurt? | Hard-coded test dates: the 90-day rule broke the January dates in `transaction-history.spec.ts` and would have expired the November API dates, which cost an extra fixture commit (`84dadca`). Records also fell behind the code: #46 closed 3 h 39 min after its fix, #49 stayed open after release, and the `exercise` tag outlived the exercise. |
| What will change for the final release? | The person who merges a release PR closes its Issues, updates the UAT and defect records and removes temporary Cloud Run tags right after the post-deploy checks, in the same session. New tests use `bangkokDate(±n)` instead of literal dates, and the login smoke check (R-4) is turned on before Final Delivery. |
