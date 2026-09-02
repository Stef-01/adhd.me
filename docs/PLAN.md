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

One active lane, claimed from `BUILD-STATE.md` under the same protocol and the same lock as every
lane before it. **Founder-directed 2026-09-01/02 (O227):** a critical appraisal of "exactly what is
needed to upgrade the whole platform into a perfectly functional app", consolidated into one
one-year build plan, with "a complex multistage refactor for next few months" inside it.

| Lane | Units | Spec lives in | What it is for |
|---|---|---|---|
| **U — the one-year build plan** | `U1`–`U68` | [`ONE-YEAR-BUILD-PLAN.md`](ONE-YEAR-BUILD-PLAN.md) | Four quarters, September 2026 to August 2027. Q1 (U1–U23): deployment readiness and the refactor's foundation, stages R0–R2. Q2 (U24–U43): the refactor's second half, R3–R5, and durability — a real store, isolation at the SQL layer, consent and retention. Q3 (U44–U56): the finder at scale and the installed app. Q4 (U57–U68): matching evidence, enforcement and the year's reckoning. The refactor lane (R0–R5, U14–U34) runs on a measured ratchet that only goes down (§2.5). |

**Where the findings behind it come from.** The plan's own §1 (the premise, measured on the day it
opened) and §2 (the appraisal, layer by layer) — each finding is a location, a severity and the
unit that answers it, so a unit's "why" is one hop away rather than restated. §8 says where every
open item of the three plans it retired went, so closing them lost nothing.

**How to choose the next unit.** Follow `BUILD-STATE.md`'s claim protocol — it already orders by
in-progress, then reclaimable, then lowest-numbered available, and `[P]` units are claimable out of
order the day their quarter opens. A row with `Depends:` waits for every named row to be `done`;
the nine `blocked` rows wait on a founder decision the plan's §6 defines.

---

## Every plan-shaped document, classified

Both directions are enforced: `src/quality/plan-canon.test.ts` fails if a document in `docs/`
matching the plan/checklist/appraisal shape is missing from this table, **and** if this table names
one that does not exist. A new plan cannot appear unclassified, which is how eight of them
accumulated without anybody deciding to have eight.

| Document | Status | Why |
|---|---|---|
| `ONE-YEAR-BUILD-PLAN.md` | **ACTIVE** | The live backlog: the U lane, U1–U68, September 2026 to August 2027, with the multistage refactor R0–R5 inside it. Its §8 names where every open item of the three plans below went. |
| `MATCHING-YEAR-PLAN.md` | **REFERENCE** | Executed on the ledger through O226 (Q1 reach, Q-M M1–M10, the continuous lanes). Its remaining numbered items and standing debts are U rows, gates or recorded refusals in `ONE-YEAR-BUILD-PLAN.md` §8; M11/M12 stay founder-gated where the ledger left them. Kept because the O-series' reasoning cites it. |
| `AESTHETIC-REVIEW-PLAN.md` | **CLOSED** | AR1–AR40, done on the ledger. `AR-DOSSIER.md` §3's priced gaps are U59–U61; the accepted-diff chain and the three-run protocol continue as the U lane's pixel witness. |
| `MATCHING-APPRAISAL-O182.md` | **REFERENCE** | Findings F1–F10 and the founder gates. Not a schedule — Q-M schedules it. |
| `MATCHING-APPRAISAL.md` | **REFERENCE** | The earlier appraisal whose F1–F10 the overhaul executed. Kept because the O-series' reasoning cites it. |
| `MATCHING-PLAN.md` | **REFERENCE** | Architecture options for the finder and the clinician interview spec. It prices the ways of matching and names the road out; it holds no units and is consulted, not executed. |
| `FIVE-YEAR-PLAN.md` | **CLOSED** | W1–W260, closed at Year 5 by W260. Kept whole: its rows are the reasoning behind most of the engine, and `plan-ledger`, `year-six-horizon` and the credentials tests all read it. Do NOT reopen it — the Y6 horizon section says what succeeds it. |
| `MATCHING-OVERHAUL-PLAN.md` | **CLOSED** | O1–O8, executed and merged. The schedule that repaired `MATCHING-APPRAISAL.md`'s findings. |
| `STANDALONE-APP-PLAN.md` | **REFERENCE** | The app-conversion appraisal (O220 lane). Phase 1a shipped (O220/O221/O225); 1b → U49/U50, 1c → U48, Phase 2 → U55, Phase 3 → U66 under D-NATIVE with G-APP-1..3 kept verbatim in `ONE-YEAR-BUILD-PLAN.md` §6. Its §4 must-not-lose list binds every unit that touches the finder. |
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
in one place where the continuous lanes could see it. The AR series earned its own file because it
governed a different thing entirely (the review system, not the product), and even that was
reachable from here in one hop. O227 applied the rule at the next scale up: the refactor the founder
asked for is a lane (R0–R5) inside `ONE-YEAR-BUILD-PLAN.md`, not a `REFACTOR-PLAN.md`, and the three
plans it absorbed went to REFERENCE or CLOSED in the same commit rather than staying ACTIVE beside it.

**When a plan closes, mark it CLOSED here and leave the document alone.** This tree does not rewrite
its past: a closed plan's rows are the reasoning behind the code that exists, and editing them to
look tidier would make the history claim decisions nobody took.
