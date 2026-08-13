# Q5 hardening (W65) — care-gap registers

Scope: the register chain built in W55–W64 — schema (W55), interval loader (W56 container),
membership (W57), care-gap detection (W58), eligibility narrowing (W59), console (W60),
ranking (W61), provenance UI (W62), simulation (W63), analytics (W64).

Method: a ten-angle code-review fan-out over `src/registers/`, with the two most severe
findings verified empirically by runnable probes rather than by reading. Fifteen findings
survived deduplication. This matters more than usual for this quarter: I wrote most of the
chain myself, so a self-review would have been close to worthless — the review was run
independently and it found real defects in my own code, including the worst one.

**Verdict: zero criticals outstanding.** Eleven findings fixed, four recorded below.

## Fixed

| # | Where | Finding | Fix |
|---|---|---|---|
| 1 | `compare.ts:90` | **The W63 report claimed "invariants held in both arms" without ever checking.** `invariantsHeld` was hardcoded `true`, `checkInvariants()` was never called, and the guarding test (`expect(invariantsHeld).toBe(true)`) was a tautology that could never fail. A holdout patient receiving an invitation, an invite cap breach, or a failed log replay would all have been reported as clean. | Calls the same `checkInvariants()` the fleet run uses, on both arms, and reports the violations. The test now asserts the violation lists are empty rather than asserting the flag. A report that launders an unverified claim through a trusted artefact is worse than one that says nothing. |
| 2 | `membership.ts:126` | **Repeated close/rejoin cycles produced multiple live memberships.** `reconcileMemberships` reopened one row per *closed historical row*, so after close→rejoin→close→rejoin a patient held two open rows. Verified by running it. Downstream this double-counted the register, emitted duplicate care gaps, and double-counted `gapsAtStart`. | Two passes: closing is decided per row, reopening happens at most once per key. Regression test runs three full cycles and asserts exactly one live row throughout. |
| 3 | `caregap.ts:29` | **`CareGap` dropped the `practiceId` its membership carried**, so every consumer keyed on `patientId` alone and a gap list spanning two tenants could let one practice's gaps narrow and reorder another's invitation pool. The isolation W60's store and W72's attribution both hold, abandoned at the type level. | `practiceId` is carried through detection, plus a `scopeGapsToPractice` seam so callers holding multi-tenant gaps can scope before narrowing. |
| 4 | `recalls.ts:88` | `PracticeRecall.practiceId` was declared and never read, so a recall owned by one practice suppressed another's gaps on a colliding patient id. | Scopes against the practice the gaps belong to (now available thanks to #3). |
| 5 | `analytics.ts:78` | `closuresFromAppointments` had no practice filter and its parameter type omitted `practiceId` — unlike `countAttribution`, which it mirrors — so another practice's attended visit inflated this register's closure count. | Takes `practiceId` and discards foreign rows, exactly as `countAttribution` does. Regression test added. |
| 6 | `intervals.ts:137` | `lookupInterval` with no name returned `matches[0]`, so **which cited source governed a patient's cadence depended on row order**. A data-only reordering would silently flip gap counts — the precise opposite of the unit's "traceable to a cited source" guarantee. | Ambiguity is refused, not resolved arbitrarily: a condition with several cadences must be looked up by name. |
| 7 | `provenance.ts:47` | `describeAge` compared a UTC-midnight date against a wall-clock `now`, so in AEST (UTC+10) a source retrieved today rendered as **"reviewed in the future"** for the first ten hours of every day — on the one page whose purpose is making provenance credible. | Compares date to date. |
| 8 | `provenance.ts:54` | Age was non-monotonic: 719 days read "23 months ago", 720 days read "1 year ago". A source appeared to get *fresher* as it aged. A fixed-length year also made an exactly-two-year-old source read as one year old. | Calendar months, with years derived from them, so the two cannot disagree. |
| 9 | `analytics.ts:123` | `ambiguousClosures` incremented per closed *gap* rather than per unscoped *closure event*, so one visit closing three registers reported 3 — and a caller comparing it against `closures.length` to judge how much of the result rested on the unscoped assumption got a ratio above 1. | Both figures are now reported under unambiguous names (`ambiguousClosures` = events, `ambiguousGapClosures` = gaps). Reporting both rather than picking one avoids silently reversing the original author's intent on a judgement call. |
| 10 | `caregap.ts:132` | `gapCountsByCondition` accumulated into a plain object keyed by PMS-supplied condition codes. A code of `__proto__` resolves to `Object.prototype`, so `?? 0` never fires, `+ 1` yields a string, and the assignment is a silent no-op — **the register would report zero gaps for that condition with no error anywhere**. | Null-prototype accumulator. |
| 11 | `sim-registers.ts:130` | `registerMemberIds` was a dead export with no caller, whose doc claimed it was used by the comparison. It re-derived membership by calling the flag helper directly, bypassing `deriveMemberships`' known-patient and enabled-register guards, so wiring it up would have reported members the real engine rejects. | Deleted. (CLAUDE.md rule 3: no speculative abstractions.) |

Two performance findings were also applied: the register layer's id set is built once per week
rather than per clinician-session, and `attribution.ts` copies the appointment array once
rather than once per condition.

## Recorded, not fixed

| Where | Finding | Why it stands |
|---|---|---|
| `analytics.ts:24` | `explainWithheld` from `attribution.ts` describes a 30-**patient** threshold while analytics withholds on a 20-**gap** threshold, so a practice with 25 gaps per arm would be told it needs 30 patients. | Fixed by adding `explainClosureWithheld` in this module's own units; the shared `WithheldReason` type stays, which is correct — the reasons are genuinely the same, only the thresholds differ. Recorded here because the underlying shape (one reason type, two threshold regimes) will bite again if a third consumer appears. |
| `provenance.ts:60` | The `intervalMonths === 12` branch of `cadenceLabel` returned a string byte-identical to the fallback. | Removed as dead code. Noted because it was a live maintenance trap: an edit to the general phrasing would silently not have applied to the most common cadence. |
| W56 values | The interval catalogue ships empty and every gap figure in this quarter therefore comes from **fixture** cadences citing a placeholder source. | Blocked on the founder G5 ruling. The container enforces provenance so that whatever loads later is traceable; nothing in Q5 depends on the values existing. |
| W63 result | The register arm's measured incrementality is negative in the synthetic world. | Expected and documented in the report itself: the sim models no relationship between having a gap and responding, so no benefit can appear by construction, and the narrowed arm is too small for its holdout comparison to resolve. Three tests assert those caveats are present in the artefact. |

## Verification

`pnpm verify` green — typecheck, **637 tests / 67 files**, build, `audit:gate` PASS with its two
accepted advisories. Founder gates unchanged: synthetic data only, no live SMS, no production
credentials, no symptom-based triage (W57's non-inference property is exhaustive over the
source union), no public directory copy.
