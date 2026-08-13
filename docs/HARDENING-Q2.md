# Q2 hardening (W26)

Full review sweep over the Q2 surface (`src/sim`, `src/guardrails`, `src/report`,
`src/tenancy`, `src/economics`, `src/ops`, `src/audit`, `src/session`, `src/compliance`,
`src/engine/continuity.ts`, `app/console`, `app/demo`) via the code-review skill, plus a
perf pass and docs pass. Gate: **zero criticals** — met; both criticals found were fixed
and regression-tested this unit (`src/sim/hardening-q2.test.ts`).

## Findings and outcomes

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | **Critical** | Bookings bypassed the W17 session config: the rail booked the earliest open slot of a session, ignoring fillable types, the scheduling window, and protected capacity | **Fixed.** `bookInvitation` now accepts the session's offerable-slot set (fixed at pool time); the sim passes it, bookings can never land outside it, and expiry-on-fill triggers when the *offerable* set exhausts. New sim invariant asserts no generated booking violates type/window. |
| 2 | **Critical** | `onboard` allowed any signed-in user to re-onboard, overwriting the practice and seating themselves as owner (W18 bypass) | **Fixed.** `onboardPractice` is create-only; a second attempt returns a form error and changes nothing. Regression test pins it. |
| 3 | High | `buildWeeklyReport(result, week)` mixed an interior week's rates with end-of-run cumulative totals | **Fixed** by making the semantics honest: a report is always the final week of the supplied run (matching the live Monday-report cadence); a run with no completed weeks refuses. |
| 4 | High | Missing `holdoutPercent` in the onboarding POST coerced to 0 (`Number(null)`), silently disabling the holdout arm | **Fixed.** Missing/blank now parses to NaN and fails validation. An explicit 0 remains a deliberate, visible choice. |
| 5 | Medium | Dashboard chart produced NaN geometry for 1-week series and hardcoded 26-week x-ticks | **Fixed.** Guarded span; ticks derived from series length. |
| 6 | Medium | Sim re-implemented STOP handling instead of calling W6 `handleStop` | **Fixed.** One STOP implementation everywhere. |
| 7 | Medium | Spine arm derived by substring-matching audit prose (`detail.includes("arm=holdout")`) | **Fixed.** Arm read structurally from the assigned patient flag. |
| 8 | Low | `isoDaysFrom` copy-pasted in three modules (week-boundary math must be identical) | **Fixed.** Consolidated into `src/lib/dates.ts`. |
| 9 | Low | Report generation recomputed the full dashboard per requested week (O(weeks²×appointments)) | Mitigated by #3 (one report per run). Residual: `buildWeeklyReport` still builds full `DashboardData` (~25 ms) — acceptable; revisit at W48 scale work. |
| 10 | Filed | "Worthwhile + no action needed" is rejected by the W15 usefulness validation — arguably a legitimate combination (reassurance visit) | **Filed, not fixed**: this is W15's deliberate, e2e-tested semantics ("worthwhile requires a concrete action"). Product question for the founder; flip = one predicate + one e2e expectation. |

## Perf pass

Measured on the loop runner (vitest, cold):

| Probe | Time | Budget |
|---|---|---|
| 26-week sim, 4,000 patients (36,270 appointments, 8,195 spine entries) | 3.1 s | ≤ 5 s |
| Dashboard build from a finished run | 25 ms | ≤ 250 ms |
| Full unit suite (195 tests) | ~11 s | ≤ 60 s |

Dominant sim cost is the rail's whole-array copy per booking (~500 bookings × 36k
appointments). Fine at practice scale; the W48 100-practice load unit is where an indexed
rail becomes worth it — noted there, not speculatively built now.

## Docs pass

- `docs/ATTRIBUTION.md`, `docs/DEMO.md`, `docs/DESIGN-QA.md`, `docs/SECURITY-REVIEW-Q1.md`
  re-read against current behavior — no drift found.
- `buildWeeklyReport`'s new final-week contract documented at the function (finding #3).
- This dossier is the Q2 findings record.
