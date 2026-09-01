# The plan — the one document to open first (O185)

**Founder-directed 2026-08-23: "canonicalise all the plans so there is not so many."**

There were eight plan-shaped documents in `docs/`, three of them closed, two of them appraisals
rather than plans, and no way to tell which was live without reading all eight. This is the index
that makes that unnecessary, and the rule that stops the sprawl coming back.

**What this file is, and what it deliberately is not.** It is the map: which plan is live, which
lane owns which units, and where each spec lives. It is NOT a status board — status lives in
`BUILD-STATE.md`, which is the lock every session already claims against, and duplicating it here
would produce two answers to "is AR7 done" with no rule for which wins. One fact, one home.

---

## What is being built right now

Two active lanes. Both are claimed from `BUILD-STATE.md` under the same protocol and the same lock.

| Lane | Units | Spec lives in | What it is for |
|---|---|---|---|
| **Matching year plan** | `O#` (current: **O184**) | [`MATCHING-YEAR-PLAN.md`](MATCHING-YEAR-PLAN.md) | The finder: what the reader is heard saying, and how well it is answered. Q1–Q4 plus the continuous lanes (UI refinement & motion, allocation, refactoring, standing debts, explaining the fit). |
| **Q-M — the arithmetic, made honest** | `M1`–`M12` | [`MATCHING-YEAR-PLAN.md`](MATCHING-YEAR-PLAN.md) §Q-M | A three-month quarter running alongside Q1, opened by the O182 appraisal. Q1 makes the reader HEARD; Q-M makes what is heard COUNT correctly. |
| **AR — aesthetic review & working-truth** | `AR1`–`AR36` | [`AESTHETIC-REVIEW-PLAN.md`](AESTHETIC-REVIEW-PLAN.md) | The system that reviews the design, and the proof the site actually works. Four phases: the taste law becomes a register · a check that cannot fail is not a check · visual truth · "it is all working". |

**Where the findings behind them come from.** [`MATCHING-APPRAISAL-O182.md`](MATCHING-APPRAISAL-O182.md)
holds F1–F10 and the founder gate list (G-A1…G-A6); Q-M's items cite those F-numbers, so a unit's
"why" is one hop away rather than restated.

**How to choose the next unit.** Follow `BUILD-STATE.md`'s claim protocol — it already orders by
in-progress, then reclaimable, then lowest-numbered available, and `[P]` units are claimable out of
order. Alternate lanes rather than draining one.

---

## Every plan-shaped document, classified

Both directions are enforced: `src/quality/plan-canon.test.ts` fails if a document in `docs/`
matching the plan/checklist/appraisal shape is missing from this table, **and** if this table names
one that does not exist. A new plan cannot appear unclassified, which is how eight of them
accumulated without anybody deciding to have eight.

| Document | Status | Why |
|---|---|---|
| `MATCHING-YEAR-PLAN.md` | **ACTIVE** | The live backlog: O-series, Q-M (M1–M12), and the continuous lanes. |
| `AESTHETIC-REVIEW-PLAN.md` | **ACTIVE** | The live AR backlog, AR1–AR36. |
| `MATCHING-APPRAISAL-O182.md` | **REFERENCE** | Findings F1–F10 and the founder gates. Not a schedule — Q-M schedules it. |
| `MATCHING-APPRAISAL.md` | **REFERENCE** | The earlier appraisal whose F1–F10 the overhaul executed. Kept because the O-series' reasoning cites it. |
| `MATCHING-PLAN.md` | **REFERENCE** | Architecture options for the finder and the clinician interview spec. It prices the ways of matching and names the road out; it holds no units and is consulted, not executed. |
| `FIVE-YEAR-PLAN.md` | **CLOSED** | W1–W260, closed at Year 5 by W260. Kept whole: its rows are the reasoning behind most of the engine, and `plan-ledger`, `year-six-horizon` and the credentials tests all read it. Do NOT reopen it — the Y6 horizon section says what succeeds it. |
| `MATCHING-OVERHAUL-PLAN.md` | **CLOSED** | O1–O8, executed and merged. The schedule that repaired `MATCHING-APPRAISAL.md`'s findings. |
| `STANDALONE-APP-PLAN.md` | **ACTIVE** | The app-conversion appraisal and phased plan (O220 lane): Phase 1a shipped with it (installable PWA — manifest + generated icons); 1b/1c and Phase 2 are claimable units; Phase 3 (native) is founder-gated G-APP-1..3 and blocked on sweep parity. |
| `SYNTHETIC-ROSTER-PLAN.md` | **CLOSED** | Executed same-day as O217, collapsed from its five-unit breakdown once the founder answered all three gates (decision `synthetic-roster-tickbox`, which also overrode its recommended eight to twenty). Kept because the non-negotiables in its §3 are the reasoning behind the synthetic-roster census. |
| `LAUNCH-CHECKLIST.md` | **CLOSED** | Executed at O15, 20 items, one a recorded refusal. |

---

## The rule that keeps this short

**A new plan document needs a row here in the same commit that creates it.** That is the whole
mechanism, and it is deliberately the cheapest possible one: not a review, not an approval, just a
line saying which of the three states it is in and why.

It exists because the failure was never that any single plan was wrong — every one of the eight was
written carefully and most were executed. The failure was that nothing made ADDING one cost
anything, so the answer to "what am I building next" quietly became "read eight documents and work
it out". A rule that makes the sprawl visible at the moment it happens is worth more than any
amount of tidying afterwards.

**Prefer a lane inside an existing plan to a new document.** Q-M is a quarter inside the year plan
rather than `MATCHING-ARITHMETIC-PLAN.md`, and that was the right call — it kept the finder's work
in one place where the continuous lanes could see it. The AR series earns its own file because it
governs a different thing entirely (the review system, not the product), and even that is reachable
from here in one hop.

**When a plan closes, mark it CLOSED here and leave the document alone.** This tree does not rewrite
its past: a closed plan's rows are the reasoning behind the code that exists, and editing them to
look tidier would make the history claim decisions nobody took.
