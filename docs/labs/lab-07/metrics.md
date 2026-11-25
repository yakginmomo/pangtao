# Lab 7 Part C: Engineering metrics

| Field | Value |
|---|---|
| Repository | https://github.com/yakginmomo/pangtao (all branches) |
| Observation window | **22 Nov 2026 00:00 – 25 Nov 2026 22:41 (Asia/Bangkok)**: the maintenance period from the start of Lab 6 UAT to the Lab 7 release |
| Snapshot time | 25 Nov 2026 22:41 (Bangkok) |
| Release in scope | `main` at `2dc3dc1` (PR #52), deployed by Deploy demo run `45637417725` as Cloud Run revision `pangtao-00009-cwz` |
| Source | GitHub REST API (`/issues`, `/pulls`, `/actions/runs`, `/commits/{sha}/check-runs`), read at the snapshot time; `docs/labs/lab-06/uat.md` §7 |

All times are Bangkok time (UTC+7).

## Summary

| ID | Metric | Value | Evidence |
|---|---|---|---|
| M-1 | Completed Issues | **3** completed (#27, #28, #46); 1 open (#49) | §1 |
| M-2 | Merged PRs | **10** merged (8 into `sprint-2-staging`, 2 into `main`); 0 closed without merge | §2 |
| M-3 | Automated test results on the release code | Unit + API **137 passed, 0 failed, 0 skipped**; E2E **20 passed, 0 failed, 0 skipped, 0 flaky**; service-layer line coverage 99.02% | §3 |
| M-4 | UAT defect status | **2** opened, **2** resolved, **0** open | §4 |
| M-5 | CI run outcomes | CI: **14** runs, 12 success, 1 failure, 1 cancelled. Deploy demo: **2** runs, 2 success | §5 |

---

## M-1 Completed Issues

**Definition.** An Issue (not a PR) closed with reason `completed` inside the window. Issues closed as `not_planned` are counted separately. Open Issues are listed but not counted.

| Issue | Title | Opened | Closed | Reason |
|---|---|---|---|---|
| #27 | [Lab5 #7] Deploy workflow and first pipeline release | 14 Nov 10:54 | 22 Nov 15:43 | completed |
| #28 | [Lab5 #8] Persistence check (restart and redeploy) | 14 Nov 10:54 | 22 Nov 15:43 | completed |
| #46 | [Lab6] CE-F-01: payment with lines summing below the total is saved | 25 Nov 14:21 | 25 Nov 19:11 | completed |
| #49 | [Lab7 #1] BR-10: reject Payments and Receipts dated more than 90 days ago | 25 Nov 19:11 | **open** | — |

Value: **3 completed**, 0 not planned, 0 duplicates. #27 and #28 are Lab 5 work closed late, inside this window. #49 is still open at the snapshot, although its implementation (PR #51) was released in PR #52 at 21:44.

## M-2 Merged PRs

**Definition.** A pull request merged inside the window, by target branch. The merge time comes from the PR's `merged_at` field.

| PR | Title | Target | Merged | Merge commit |
|---|---|---|---|---|
| #41 | chore(lab6): create uat.md | `sprint-2-staging` | 22 Nov 16:02 | `3dc83fa` |
| #42 | docs(lab6): record independent UAT execution on the partner release | `sprint-2-staging` | 22 Nov 20:50 | `702b343` |
| #43 | chore(lab6): edit uat.md | `sprint-2-staging` | 22 Nov 23:53 | `1e87d0e` |
| #44 | chore(lab6): Re-test result & evidence | `sprint-2-staging` | 23 Nov 23:48 | `2de6f6b` |
| #45 | chore(lab6): reintroduce a Sprint 1 defect for the controlled UAT exercise | `sprint-2-staging` | 24 Nov 00:16 | `2eeb73b` |
| #47 | Fix/lab6 allocation sum | `sprint-2-staging` | 25 Nov 15:32 | `c7f43d0` |
| #48 | merge lab6 into main | `main` | 25 Nov 15:46 | `41bb484` |
| #50 | docs(lab7): revise BR-10 contract for the 90-day backdate limit | `sprint-2-staging` | 25 Nov 20:30 | `c07b47d` |
| #51 | Feature/f 05 backdate limit | `sprint-2-staging` | 25 Nov 21:17 | `72c8635` |
| #52 | To deploy Lab7 | `main` | 25 Nov 21:44 | `2dc3dc1` |

Value: **10 merged**: 8 into `sprint-2-staging` and 2 release PRs into `main`. No PR was closed without merging in the window. The Lab 7 change is PRs #50 (contract), #51 (tests and code) and #52 (release). Every other PR in the window is Lab 6 work, and none is unrelated Sprint 2/3 feature work.

## M-3 Automated test results

**Definition.** Pass, fail and skip counts for the full automated suite on one identified commit.

| Field | Value |
|---|---|
| Tested commit | `5b16bc7` (Lab 7 implementation). `git diff 5b16bc7 2dc3dc1 -- server web prisma tests` is empty, so the released `main` runs the same code and tests. The only commit after it, `bfd5589`, changes docs only |
| Commands | `npm test` (Vitest unit + API with coverage), `npx playwright test` |
| Unit + API | 14 files; **137 passed, 0 failed, 0 skipped** |
| E2E | **20 passed, 0 failed, 0 skipped, 0 flaky** |
| Coverage | service-layer line coverage 99.02% (gate 80%) |
| Source | `docs/traceability.md` §3, "Lab 7 tested version"; PR #51 description |
| Re-run on the release commit | `2dc3dc1` checked out locally on 26 Nov 2026 01:20 (Bangkok), PostgreSQL 16 in Docker. Same counts: unit + API **137 passed, 0 failed, 0 skipped** (14 files), service-layer line coverage 99.02%; build succeeded; E2E **20 passed, 0 failed, 0 skipped**. Output below (EV-C-03) |
| CI corroboration | Run `45636816104` on `83a2276` (the PR #52 head, the same tree as `2dc3dc1`): all four jobs passed (Lint/type-check/build, Unit and API tests, End-to-end tests, Docker image build) |

Output excerpt (EV-C-03), commit `2dc3dc1`, 26 Nov 2026 01:20 (Bangkok):

```
$ npm run test:coverage
 Test Files  14 passed (14)
      Tests  137 passed (137)
   Start at  01:20:59
   Duration  137.35s
 src/services                |   99.02 |    90.53 |     100 |   99.02 |
  transaction.service.ts     |     100 |      100 |     100 |     100 |
  date.util.ts               |     100 |     87.5 |     100 |     100 |

$ npm run build            # succeeded
$ npx playwright test --reporter=line
[19/20] [chromium] › tests\e2e\transactions.spec.ts:135:3 › F-05 Payment and Charge (STS) › TEST-05.15 (AC-05.15): the date picker starts at today − 90, and an older typed date shows a field error and sends nothing
[20/20] [chromium] › tests\e2e\transactions.spec.ts:193:3 › F-06 Received Money (STS) › TEST-06.8 (AC-06.8): a salary receipt shows live allocation, submits, and raises the Cash balance
  20 passed (1.2m)
```

## M-4 UAT defect status

**Definition.** A defect found during Lab 6 UAT, or by the Lab 6 controlled exercise, and opened inside the window. **Resolved** means the retest or failing-first test passes on a release in `main` and the record is closed.

| ID | Source | Opened | Severity | Resolution | Resolved | Status at snapshot |
|---|---|---|---|---|---|---|
| `UATF-01` | Partner UAT (team ปลวกแดง), UAT-02 step 3; reported through the agreed channel, no GitHub Issue | 22 Nov 16:17 | Minor (operational) | The §4.1 data reset was run on the deployed database (no code change); retest PASS on `64c98f4` / `pangtao-00006-cjx` | 22 Nov 21:35 | Closed (`uat.md` §7.3) |
| CE-F-01 (#46) | Controlled exercise: defect reintroduced by PR #45 | 25 Nov 14:21 | — | PR #47: red `d082577`, green `adc801b`; released in PR #48 (`41bb484`) | 25 Nov 19:11 (Issue closed) | Closed |

Value: **2 opened, 2 resolved, 0 open.** CE-F-01 was injected on purpose, so it is not a defect that escaped into a release.

## M-5 CI run outcomes

**Definition.** GitHub Actions runs created inside the window, per workflow, with their final conclusion. `CI` runs on pull requests into `main` and `sprint-*-staging`. `Deploy demo` runs on pushes to `main`.

| Run ID | Workflow | Branch / PR | Commit | Created | Conclusion |
|---|---|---|---|---|---|
| 45004000710 | CI | `chore/lab6-uat-doc` (#41) | `dfd38dd` | 22 Nov 15:41 | success |
| 45004852190 | CI | `chore/lab6-uat-doc` (#41) | `9a7abb6` | 22 Nov 15:52 | success |
| 45005078330 | CI | `chore/lab6-uat-doc` (#41) | `b29779f` | 22 Nov 15:55 | success |
| 45029393869 | CI | `chore/lab6-partner-uat-execution` (#42) | `e90bf1c` | 22 Nov 20:48 | success |
| 45044558751 | CI | `chore/lab6-uat-doc` (#43) | `ccad756` | 22 Nov 23:34 | success |
| 45219808969 | CI | `chore/lab6-partner-uat-execution` (#44) | `74a6ff5` | 23 Nov 23:44 | success |
| 45221424268 | CI | `chore/lab6-controlled-exercise` (#45) | `345c320` | 23 Nov 23:52 | **failure** |
| 45575034299 | CI | `fix/lab6-allocation-sum` (#47) | `b5dc9eb` | 25 Nov 15:17 | success |
| 45578137805 | CI | `sprint-2-staging` (#48) | `c7f43d0` | 25 Nov 15:38 | success |
| 45578901396 | CI | `sprint-2-staging` (#48) | `942fb61` | 25 Nov 15:44 | success |
| 45579272079 | Deploy demo | `main` push | `41bb484` | 25 Nov 15:46 | success |
| 45612238417 | CI | `docs/update-contract` (#50) | `fcbd92f` | 25 Nov 19:16 | success |
| 45628663171 | CI | `feature/F-05-backdate-limit` (#51) | `bfd5589` | 25 Nov 20:56 | success |
| 45636767079 | CI | `sprint-2-staging` (#52) | `72c8635` | 25 Nov 21:41 | **cancelled** |
| 45636816104 | CI | `sprint-2-staging` (#52) | `83a2276` | 25 Nov 21:41 | success |
| 45637417725 | Deploy demo | `main` push | `2dc3dc1` | 25 Nov 21:44 | success |

Value: **CI 14 runs: 12 success, 1 failure, 1 cancelled (12/14 = 86% success). Deploy demo 2 runs: 2 success (2/2).**
- The failure (`45221424268`) is the expected result of the Lab 6 controlled exercise: CI caught the reintroduced allocation-sum defect. PR #45 was still merged into `sprint-2-staging` to stage that exercise.
- The cancelled run (`45636767079`) was replaced by `45636816104` 1 minute later, when `83a2276` (a merge of `main` into `sprint-2-staging`) was pushed to the PR #52 branch.

---

## Interpretation (≤ 100 words)

Issue closure lags delivery. CE-F-01 (#46) closed 3 h 39 min after its fix merged (15:32 → 19:11). #49 is still open at the snapshot, although its change was released at 21:44 (M-1, M-2). PRs into `sprint-2-staging` do not close Issues automatically, so M-1 undercounts finished work and the Issue list doesn't match the release. **Action:** whoever merges a release PR into `main` closes every linked Issue in the same session, after the post-deploy checks. Owner: Supichaya. First use: close #49 after the Lab 7 post-deploy checks, by 26 Nov 2026. Check again at the Final Delivery release.
