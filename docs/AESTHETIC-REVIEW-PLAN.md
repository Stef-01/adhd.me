# The aesthetic review system, and the proof that it all works — a three-month plan (AR-series)

**Goal (founder, 2026-08-22):** an aesthetic review system for the whole site, which also
thoroughly checks that everything is actually working.

Two halves, and they are the same problem. A design rule nobody checks is a preference; a check
that cannot fail is decoration. This quarter turns the tree's taste law into a register the build
enforces, and turns the sweeps that enforce it into checks that have proved they can go red.

**Runs as its own lane, alongside `docs/MATCHING-YEAR-PLAN.md`.** Unit ids are `AR1…AR36` so they
cannot collide with the loop's O-numbers. Claiming follows `BUILD-STATE.md`'s protocol unchanged —
these rows live in the same ledger and take the same lock.

---

## Where this starts from — measured 2026-08-22, not asserted

| Thing | Count | How it was measured |
|---|---|---|
| Page routes in `app/` | **47** (31 console, 14 public, 2 dynamic) | `find app -name page.tsx`; the derived list is `e2e/site-routes.ts` |
| e2e specs | **57** | `ls e2e/*.spec.ts` |
| Specs reading the **derived** route list | **8** | `grep -l site-routes e2e/*.spec.ts` |
| Rules in the taste law (`.claude/skills/adhdme-taste`) | **21**, in 6 sections | bullet count |
| Per-unit design records in `docs/DESIGN-QA.md` | **70** | `grep -c '^## O'` |
| Rules mapped to the check that enforces them | **0** | there is no such mapping |

**The last row is this plan's premise.** Everything else exists and much of it is good. What does
not exist is any relation between the 21 rules and the 57 specs. A rule can be written and never
checked; a sweep can drift from the rule it was written for; and no build failure occurs in either
case. That is not a gap in coverage — it is the absence of the thing that would let anyone *state*
the coverage.

### The four findings this plan is built on, all from the tree's own record

1. **O168** — a sweep named "every surface" swept a hardcoded array covering 34 of 45 routes.
   Eleven console screens were swept by nothing while the suite ran green. Fixed for six sweeps
   (O169–O175); **49 of 57 specs still hold hardcoded route arrays.**
2. **O170/O171** — non-vacuity floors were found stale, one row apart, in two different sweeps.
   A floor transcribed on the day it was written is a number that stops meaning anything the next
   time the site grows.
3. **O174** — three mock fixtures failed silently and a compliance sweep measured the resulting
   empty pages. It passed.
4. **O173** — the CI gate was red for five consecutive units and nothing told the loop.

Read together they say one thing: **this tree's checks fail by going quietly green, not by going
red.** So the system built here is not mainly more assertions. It is the machinery that makes a
silent pass impossible.

---

## Phase 1 (weeks 1–3) — the taste law becomes a register

The rules are prose in a skill file. Prose cannot be asserted against, so the first move is to give
the law a machine-readable twin — and to pin the twin against the prose in **both directions**, the
shape `src/compliance/public-surfaces.test.ts` and `src/tenancy/store-reads.ts` already use here.

- **AR1 — every rule gets a stable id.** `src/design/taste-register.ts`: one entry per rule
  (`layout.one-idea`, `type.accent-is-live`, `interaction.touch-44`, `motion.reduced-equal`, …),
  each carrying its section, its one-line statement, and the incident that produced it.
  → verify: the register and `.claude/skills/adhdme-taste/SKILL.md` agree in both directions — a
  rule in the file and not the register fails the build, and so does the reverse. Neither is
  allowed to be the sole source; drift is a build error, not a review finding.
- **AR2 — every rule names its enforcement, or names its absence.** Each entry gains
  `enforcedBy: string[]` (spec files + test names) or `unenforced: "<reason>"`.
  → verify: no entry may omit both. A spec claiming a rule id that does not exist fails. **The
  count of `unenforced` rules is asserted against a recorded number**, so it can only fall
  deliberately — the O177 lesson that a queue must distinguish "not done" from "decided".
- **AR3 — every rule names the routes it is asserted over.** Coverage is computed from the derived
  route list at run time, never transcribed.
  → verify: for each enforced rule, the set of routes actually visited by its checks is derived and
  compared against `ALL_PAGE_ROUTES`; every route not covered is either listed with a reason or the
  build fails. This is O168's fix applied to the *rules* rather than to one sweep.
- **AR4 — the coverage document generates itself.** `docs/AESTHETIC-COVERAGE.md`, written by a
  script from the register, never by hand.
  → verify: regenerating it in CI and diffing must produce no change (W207's shape — a document
  that cannot go stale because staleness is a failing test).
- **AR5 — the 49 remaining hardcoded route arrays, triaged.** Not "fix them all": classify each as
  (a) a sweep that should read the derived list, (b) a feature test rightly pinned to one route, or
  (c) a stale array nobody noticed.
  → verify: the classification is computed and pinned; category (a) is a work queue with a count,
  and the count is asserted so it can only shrink.

## Phase 2 (weeks 4–6) — a check that cannot fail is not a check

The strongest claim this plan makes: **every sweep must prove it can go red.** A passing test tells
you nothing until you know it would have failed.

- **AR6 — one non-vacuity harness, replacing per-spec floors.** `e2e/support/measured.ts`: a sweep
  declares what it measured (routes visited, elements asserted); zero is a failure, and the number
  is reported.
- **AR7 — floors are derived, never transcribed.** Recomputed from the route list each run; drift
  fails **in both directions** — a floor that has fallen behind the site is exactly as wrong as one
  set too high, which is what O170 and O171 each found separately.
- **AR8 — fixture liveness (O174, generalised).** A fixture that fails to seed fails loudly; a sweep
  that runs against an empty page reports the emptiness rather than measuring it.
  → verify: seed a deliberately broken fixture and assert the suite goes red with a message naming
  the fixture. O174's three silent failures are the regression pins.
- **AR9–AR12 — the mutation probe, one per sweep family** (accent discipline · touch floor ·
  semantics · contrast). For each rule, a probe deliberately violates it on one route and asserts
  the sweep catches it, names the route, and names the rule id.
  → verify: probe on → suite red with the expected rule id; probe off → green. A sweep whose probe
  cannot make it fail is reported as **vacuous**, and vacuity is a build failure, not a note.
- **AR13 — the mutation report.** How many rules have a live probe, how many do not, and which.
  → verify: count pinned; a rule losing its probe fails the build.
- **AR14 — the gate reaches the loop (O173).** A red gate must be visible to the next firing rather
  than discovered five units later.
  → verify: gate state is written where the loop reads it at claim time, and a red state blocks a
  new claim with the failure named. Simulated against O173's real five-unit window.

## Phase 3 (weeks 7–10) — visual truth, in both themes, at both widths

`qa/` holds ~150 hand-taken screenshots across 70 records. They are a genuine archive and a poor
regression system: nothing compares them, so nothing catches a visual change nobody intended.

- **AR15 — per-route visual baselines**, derived from the route list: **47 routes × 2 widths
  (390/1280) × 2 themes × 2 motion settings**, deterministic (fixed seed, fixed clock, fonts
  pre-loaded, motion pinned).
  → verify: the run is stable across three consecutive executions with zero diff before any
  baseline is accepted. **A flaky baseline is worse than none** — it trains the reader to approve
  diffs — so stability is the gate, not the coverage.
- **AR16 — accepted-diff discipline.** A visual change lands only with the unit id that intended it;
  an unattributed diff fails.
- **AR17–AR18 — theme parity.** Every rule in the register that concerns colour is asserted in light
  **and** dark; contrast measured against the palette tokens, not sampled by eye. Raw hex in a
  component is already a taste violation — here it becomes a build failure.
- **AR19 — the fold register, checked.** W167's fold discipline is prose today: nothing above the
  fold that is not the idea, and a fold may never cut a tied band or split a claim from its
  qualifier. Assert it at both widths.
- **AR20 — reduced-motion equality.** Every animated element has a static equal, checked at the hook
  (`useReducedMotion`), not only in CSS — O127 established that this is where it must be checked.
  → verify: with reduced motion on, no element rests transformed; every reveal's content is present
  and readable. Probe-backed per AR9–AR12.
- **AR21 — type scale and rhythm**, derived from the tokens: no raw px type, `rem` throughout (O60),
  `tabular-nums` wherever numbers align (O60's and the taste law's rule, asserted rather than
  remembered).
- **AR22 — the 44px touch floor at real hit-area** (O14), including decorative-smaller-visual
  exemptions declared per element rather than inferred.
- **AR23 — focus order and the visible ring** across all 47 routes; `outline: none` without a
  replacement is a build failure.

## Phase 4 (weeks 11–13) — "it is all working", asserted on outcomes

The aesthetic half checks how the site looks. This half checks that it *does what it says* — and
the tree's own history says the dangerous failure is a page that renders beautifully while meaning
nothing.

- **AR24 — three kinds of zero, everywhere** (W246's rule, generalised from the interop console to
  all 47 routes): no data, no results, and broken must be visually and semantically distinct. A
  route that cannot tell them apart fails.
- **AR25 — the working-truth sweep.** Every route renders real content from a seeded fixture — not
  an empty state, not an error, not a skeleton that never resolves.
  → verify: derived from the route list; each route declares the assertion that proves it worked.
- **AR26–AR28 — the three journeys, asserted on outcomes not page loads**: the finder end-to-end
  (O121's walk, made permanent), booking through to a confirmed appointment, and the console's
  practice flow. Each asserts the *result* — a match ranked, an invitation minted, a register
  changed — never merely that a page responded 200.
- **AR29 — voice input, still working** (the finder has it; O59/O46 both found it broken in ways a
  render check could not see).
- **AR30 — the honesty surfaces, checked as behaviour.** No testimonials, no ratings, no clinical
  claim, "specialist" never beside a niche scope — already compliance law; here it is asserted over
  the derived route list in both themes, so a new screen joins the sweep by existing.
- **AR31 — cross-tenant truth at the UI layer.** Y4-1's class (a console screen showing another
  practice's data) asserted from the browser, not only from the store.
- **AR32 — performance floors that mean something**: a budget per route derived from what the route
  actually ships, failing on regression rather than on an absolute nobody tuned.
- **AR33 — the a11y sweep completed to WCAG 2.2 AA** across all 47 routes, with every exemption
  named and dated.

### Closing

- **AR34 — the quarter's full audit** (W51 method: the whole system re-derived from source, not a
  diff of what changed).
- **AR35 — the dossier**: what the review system now guarantees, what it explicitly does not, and
  what each remaining gap would cost to close. Counts derived from the register and pinned
  row-by-row (W207's shape).
- **AR36 — the founder gate list.** Which aesthetic and working-truth questions are *product*
  decisions rather than engineering ones, priced and named, never silently decided by the loop.

---

## Standing constraints — no unit may bend these

- **The tree's laws win.** Compliance, copy and founder gates (`CLAUDE.md` §4, §6) outrank every
  aesthetic rule here. A prettier screen that makes a clinical claim is a defect.
- **Synthetic data only.** Every fixture, baseline and journey runs on seeded synthetic data. No
  baseline may contain a real patient, a real photograph of one, or a real clinical record.
- **No unit weakens a gate to go green.** If a probe proves a sweep vacuous, the sweep is fixed —
  the probe is never deleted. If the visual baseline is flaky, the flake is fixed, never accepted.
- **Report the disagreement, do not resolve it** (W120). Where a measurement contradicts a
  recorded number, the row states both and says which it trusts and why.
- **No per-route hand-tuning.** Rules are general or they are declared exceptions with reasons.
  A register of 47 special cases is not a design system.

## What is deliberately NOT in this plan

- **A visual-diff tool that approves its own diffs.** Acceptance stays attributed to a unit id.
- **Screenshot review by model as a gate.** Useful as a *finder* of candidate issues, never as the
  thing that decides green — it cannot be regression-pinned, and this tree's whole method is that
  the check must be able to fail reproducibly.
- **A redesign.** This quarter builds the system that reviews the design; changing the design is the
  UI-refinement lane's work and stays there.
- **Deleting `docs/DESIGN-QA.md`'s 70 records.** They are the reasoning behind the rules and most of
  their value. The register cites them; it does not replace them.

## Honest note on pace

At the build loop's observed throughput (O168–O178: eleven units in one day) 36 units is not three
months of work at that rate. The pacing here assumes what actually holds: this lane competes with
the matching year plan and the UI lane for the same loop, several units are gated on founder
decisions, and Phase 2's probes and Phase 3's baseline stability are the kind of work that goes
slowly precisely because going fast produces a system that passes without checking anything. **If
the lane runs ahead of schedule the correct response is deeper probes, not more units.**
