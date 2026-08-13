# Q13 hardening — code review and security review (W168)

Scope: W157–W167 — the vertical model, completeness report, cross-member consistency, binding,
console and store, the allowlist review, the two-practice console, and W167's order-dependence
register. Reviewer: `builder-A`, which wrote most of them; the method therefore leans on
mechanical sweeps and on hunting known bug classes rather than on rereading code I already
believe is correct. **All four findings came from a sweep. Two are mine.**

## Verdict

**Zero criticals. Four findings, all fixed.** One is a real order-dependence defect in patient
consent; one is a lock-integrity failure in `BUILD-STATE.md` that I introduced two units ago; two
are blind spots in controls built this quarter — including one in the control built specifically
to catch the class the consent defect belongs to.

The theme is unpleasant and worth stating plainly: **three of the four are failures of controls,
not of product code.** A register that cannot see part of what it registers, a lock nobody
checks, and a detector that reports zero for a family it cannot detect all fail in the same
direction — they look clean.

## Findings

### Q13-1 — HIGH: a same-day consent pair resolved by array order — FIXED

`consentFor` (W125, hardened at W129) picked the operative decision with
`sort(by decidedAt).at(-1)`. Dates are day-granularity. Two decisions recorded on the same day
with opposite values — a patient who refuses in the morning and agrees in the afternoon, or the
reverse — resolved to whichever the caller's store happened to list last.

What makes this more than an oversight: **the module already knew.** W129 rewrote the withdrawal
rule to be stated over the whole set precisely because "day-granularity dates cannot order two
events within a day", and the comment ends "refusing to guess is the safe direction for consent".
Twelve lines later the code guessed. That is the Y3-1 shape exactly — the code that names an
ambiguity is not the code that resolves it — in the module that decides whether a patient agreed
to anything.

**Fix.** The latest day's records are collected and, where they disagree, the non-`given`
decision is the answer. That is the sentence the module already wrote, applied. No sort remains,
so there is no comparator and no position for a tie to resolve by. Regression-tested in both
orders, with two companions proving the fix does not over-refuse: same-day decisions that *agree*
still read as given, and a later day still overrides an earlier one.

### Q13-2 — HIGH (process): the claim ledger had a duplicate `available` row — FIXED

`BUILD-STATE.md` is not documentation. Its own header says "this file IS the lock". Resolving a
rebase conflict in W166 kept **both sides** of the conflicted region, leaving W166 twice and W167
twice — and the second W167 row still read `available` next to builder-B's completed one.

A builder following the claim protocol would have taken the available row and rebuilt a finished
unit. The lock had a duplicate key and said nothing. Two further defects surfaced while fixing
it: three pairs of rows sat out of numeric order (two pre-existing, deliberately left at W156 and
now fixed), and **W41's row was missing its closing pipe** and carried an unescaped `|`, so it was
not a table row at all — invisible to any parser stricter than a loose regex, and broken in the
rendered table.

**Fix, and the part that matters:** `src/quality/ledger-integrity.test.ts`. Every expansion week
— W52, W104, W156 — verified integrity *by hand* and wrote "no gaps, no duplicates" in a commit
message. This week that habit failed, in the way hand-checks always fail: nobody was looking at
the moment it broke. The check is now derived from the artefact: no duplicate ids, no gaps,
numeric order, a SHA on every `done`, a named gate on every `blocked`, an owner and timestamp on
every `claimed` (which the W54 staleness rule needs to function), and only statuses the protocol
defines. It found Q13-2's W41 defect on its first run.

### Q13-3 — MEDIUM: W167's detector could not see half the folds it registers — FIXED

W167 built the register this quarter's biggest control depends on, and its ledger row states:
"There are no sort-then-take-first sites, which is why the register covers exactly the
fold-to-one population: twelve modules, all via `.reduce`."

That conclusion was drawn from a detector matching `.reduce(` and nothing else. There were **five**
sort-then-take-one sites — `.at(-1)` and `[xs.length - 1]` fold a collection to one answer just as
much as a reduce does — and one of them was Q13-1. A detector that cannot see a family reports
zero for it, and zero reads as clean.

**Fix.** The pattern set is widened, and all five modules are now declared with a disposition:
`consent.ts` and `referrals/store.ts` carry tie-break tests, while `audit.ts`, `versioning.ts` and
`security/audit-gate.ts` carry rationales — each naming why position *is* the fact there (an
append-only trail that refuses out-of-order writes; a replay guaranteeing at most one; a list
written by hand in source, where the order is the author's).

### Q13-4 — LOW: the detector counted folds mentioned in prose — FIXED

Widening Q13-3 immediately made `order-independence.ts` match itself, because its header and its
rationale strings name the patterns. Two things follow. The patterns are now assembled from
fragments (W153's trick — the alternative is excluding the file by name, and an excluded file is
a place to hide something), and **comments are stripped before counting**: a fold named in prose
is not a fold, and counting one inflates a declared count that somebody then "corrects" without
reading the code.

## Confirmed clean

| Checked | Evidence |
|---|---|
| Vertical gate composition | `model.ts` contains no sign-off vocabulary (asserted against its own source); an ungated `PathwayVersion` cannot enter a vertical's evidence, asserted in `tsc` |
| Empty-vertical vacuity | A bundle with no members is refused — "every member is usable" would otherwise be vacuously true |
| W159 wiring | A blocking contradiction cannot coexist with `usable: true`; proven by short-circuiting the wire and watching exactly two tests fail |
| Two-practice isolation | Practice-scoped surfaces redirect a non-member to onboarding; a forged selection cookie resolves to nothing, asserted end-to-end |
| Cookie cannot widen access | `activePracticeFor` honours a request only when the email is already a member — membership is the grant, the cookie is a preference |
| Per-practice config | Rules, roster, session dials and setup progress live on the record; two practices cannot share a rules config |
| Founder gates | Nine `SHIPPED_*` registries still empty; no model endpoint anywhere (W153's scanner); no `fetch` in `src/pms`; G3's constructor still refuses live Twilio hosts |
| Store registries | `src/verticals/store.ts` declared in `STORE_RESETTERS` and `RECORD_CLASSES` (`no_patient_identity`) |
| Dependency exposure | `audit:gate` PASS, 0 unaccepted; both acceptances still inside their review date (next: 2026-11-09, owned by W165) |

## Carried forward

1. **`src/verticals/store.ts` has no test of its own.** Its two functions — `assembleEvidence`
   and `knownMembers` — are exercised only through the console e2e. The tree-checked registries
   caught its *registration*; nothing catches a missing test file. Worth a unit, and worth asking
   whether "every non-test module in `src/` has a test" should itself be mechanical.
2. **The role-refusal path lost its e2e** (raised in W166). A non-member now takes a different
   route — redirect to onboarding — so the case of a *member with insufficient role* needs a
   fixture that seats one, which the mock console route does not offer.
3. **W164's observation stands**: of W159's three blocking contradiction kinds, only
   `pathway_unsatisfiable` is reachable through the registries today. The other two are guards
   against evidence assembled another way, which is fine — but they are guards, not live paths,
   and should be known as such.

## Method

Sweeps over the whole Q13 surface rather than the diff: every module in `src/verticals/` against
a test file; the fold register against the tree with a widened detector; the ledger parsed as a
table; the founder-gate registries re-derived from source; `src/verticals/store.ts` traced to its
callers. Q13-1 was confirmed by writing the failing test first and watching it fail in one input
order and pass in the other — the order dependence made visible before it was removed.
