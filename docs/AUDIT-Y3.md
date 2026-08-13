# W155 — Year-3 full-system audit (2026-08-11)

Independent review of the whole tree at the close of Year 3, run by `builder-A`. Scope is the W51
method: **the whole tree, not a diff.** Both findings below justify that choice — one lives in W32
code that Year 3 never touched, and the other in W93 code last changed in Q8.

**Reviewer's independence, stated plainly:** most of Q9–Q12 is my own work, including W151 and W153
written today. Self-review is the weakest form, so the method leans on **mechanical sweeps** and on
hunting **known bug classes** rather than on rereading code I already believe is correct. Neither
finding came from judgement; both came from a sweep for a class this tree has now met repeatedly,
and both were confirmed by writing the failing test first.

## Verdict

**Year 3 is sound, with two order-dependence defects found and fixed.** Gate green at HEAD: 140
test files, 1748 tests, typecheck, build and `audit:gate` clean; ~29.5k LOC of first-party source
across 35 modules; 42 routes, 42 census lines, checked both ways. No founder gate is unenforced.

The two findings are the **same class**, which is the finding behind the findings — see §Pattern.

## Findings

### Y3-1 — HIGH at G3, latent today: effective SMS consent was decided by row order — FIXED

`ingestFromAdapter` step 4 resolved a patient's effective `smsConsent` by sorting their provenance
records on `capturedAt` and taking the last one. Two problems compounded:

1. The comparator was `(a, b) => a.capturedAt < b.capturedAt ? -1 : 1` — it returned `1` for equal
   keys rather than `0`, which is an **inconsistent comparator**, not merely a missing tie-break.
2. Step 3 already **detected** two observations at the same `capturedAt` with opposite values and
   pushed a `ConsentConflict`. Step 4 never read it. The product filed the ambiguity and then
   resolved it anyway.

So a patient with contradictory same-instant consent observations got an effective flag chosen by
whatever order the PMS returned rows in. This is not contrived: a batch export that stamps every
row with the export time produces exactly this shape.

**The existing test was named `flags same-capture conflicting values instead of silently picking
one` and only ever asserted that the conflict was recorded.** The name claimed the property; the
assertion checked something else. That is the "passing for the wrong reason" class in its purest
form, and it is why the sweep looked here at all.

Severity is HIGH on the axis that matters — this is the flag that decides whether a real person is
contacted — and latent today only because G3 blocks live SMS. `optedOut` remains terminal
throughout and was never at risk, so the exposure was confined to PMS-sourced observations.

**Fix.** The ambiguity now decides. Records at the maximum `capturedAt` are collected; if they
disagree, effective consent is `false`. Absence of a clear yes is not a yes — W120/W125's rule,
applied to consent. There is **no sort left at all**: the maximum is taken directly, so there is no
comparator to be inconsistent and no position for a tie to be resolved by.

Regression-tested in **both input orders** (the fix was watched failing first: `[true,false]`
happened to yield `false` and `[false,true]` yielded `true` — the order dependence made visible),
plus a companion test that an *unambiguous* later capture still wins, so the fix cannot degrade
into refusing everybody.

### Y3-2 — MEDIUM, latent: a same-day referral chain was replayed in storage order — FIXED

`replayReferral` sorted events by `at` and broke ties by leaving them alone. That is stable, and
therefore deterministic — but deterministic **on storage order**, which nothing guarantees matches
the order things happened. The module's own comment described this as "a stable sort by time",
which reads as a guarantee about time and is only a guarantee about position.

`at` is a date in practice. A referral written and an appointment booked the same day is the
ordinary case, not an edge one: the patient books at reception on the way out. Delivered
booked-first, the fold rejected the booking as `out_of_order` and reported
`written_no_appointment` with `leaked: true` — a referral that went nowhere, about a patient who
was in the waiting room. A practice acting on that chases a referral that is already booked.

Latent because the referrals console currently reads `detectLeakage` only for a presence check;
the verdict itself is not yet rendered per row.

**Fix.** Ties break on chain position (`referral_written` → `appointment_recorded` →
`appointment_cancelled` → `completion_recorded` → `referral_cancelled`). This is not inventing
information: the state machine already declares that a referral must exist before anything can
happen to it, and the fix stops an arbitrary row order from contradicting a constraint the model
states. Events with **different** dates are untouched, asserted by a test — a booking dated before
its referral is a real disagreement in the record and must stay visible as one.

**What it does not resolve, filed rather than guessed at:** two events of the *same* kind at one
timestamp, and a same-day cancel-and-rebook, where the true order is genuinely unrecoverable from
the data. Those keep storage order. Resolving them would mean inventing a sequence, and W142's
lesson is that a wrong answer presented confidently is worse than an acknowledged gap.

## Pattern (the finding behind the findings)

Both defects are **one collection folded into one answer, where two elements tie on the sort key**.
Counting the Q9–Q12 hardening weeks, this class has now been found **eight times** in this tree
(W123, W129, W137, W142, and the two here, plus two caught pre-emptively during Q11).

The rule the hardening notes have been converging on, now stated at full strength:

> For any code that folds a collection into a single answer, ask **what the sort key is** and
> construct two records that **tie on it**. If the tie changes the answer, that is a defect. If no
> principled winner exists, the tie itself is the finding and must be reported rather than
> resolved.

Y3-1 adds a corollary worth carrying into Y4:

> If the code already **detects** an ambiguity, check that the code which **resolves** it reads
> that detection. Filing a conflict and then resolving it anyway is worse than not detecting it,
> because the conflict record makes the system look careful.

And Y3-2 adds a second:

> "Stable sort" is a guarantee about **positions**, not about **meaning**. A comment saying stable
> is not a comment saying correct.

## Confirmed-clean controls

| Control | Evidence |
|---|---|
| G1 live-PMS gate | `VendorPmsAdapter` refuses live vendor hosts; **no `fetch` or `http` reference exists anywhere in `src/pms`**; instantiated nowhere outside tests |
| G3 live-SMS gate | Exactly **one** `fetch(` in the entire tree, in `TwilioSmsAdapter`, whose constructor throws on any `twilio.com` endpoint |
| G2 real-patient-data gate | Every store in-memory or synthetic; no live database wired |
| G5 clinical-content gate | Nine `SHIPPED_*` registries, all empty and pinned by tests, plus `usableContent()`/`usablePathway()`/`renderable()` branding making unapproved content unrepresentable. The one non-empty registry (`registers/escalation.ts`) holds safety escalations, not clinical content |
| G6 no-public-directory | No public surface lists clinicians by capability; W133 remains `blocked` rather than partially built |
| G7 no-symptom-triage | Register membership admits only `pms_condition_flag`/`practice_confirmed`; education triggers match recorded fact CODES; no path from free text to a trigger |
| G8 (proposed) | **Nothing in `src`, `app` or `scripts` names a model endpoint or SDK** — scanned by `instruction-sinks.test.ts` (W153) with an empty declared-exception list. W146/W147 remain `blocked` |
| Authorization | All 13 `"use server"` files gate inside the action; all 13 route handlers gate (`assertMockRoutesEnabled`, `requireSession`/`isMeherrStaff`, or a signed token) |
| Determinism | `Math.random` appears once, in a comment saying it is banned. Every `new Date()` outside tests is at an action/route boundary, never inside a domain function |
| Type escapes | **Zero** `as any` and zero `@ts-ignore` in 29.5k lines. All 25 `@ts-expect-error` are in tests and are deliberate compile-time assertions |
| Code debt | Zero TODO/FIXME/HACK/XXX markers |
| Secrets hygiene | Zero hardcoded credentials or tokens |
| Source hygiene | Zero control characters in any source file (W116's class — checked again here because W153 reintroduced one during authoring and the hygiene test caught it) |
| Surface coverage | 42 routes, 42 census lines, checked in both directions |
| Erasure coverage | `RECORD_CLASSES` checked against the tree; every `globalThis` store is declared |
| Dependency exposure | `audit:gate` PASS — 0 unaccepted, 2 accepted with rationale |

## Outstanding, carried into Year 4

Not defects — decisions this loop must not make, or work already scheduled.

| # | Item | Owner |
|---|---|---|
| 1 | **G8 ratification.** W146/W147 blocked; W153's scanner fails the day an adapter lands without it | Founder |
| 2 | **G5 values.** W56's intervals, SUP-1/SUP-2 still blocked; nine registries ship empty and the product is correspondingly empty | Founder |
| 3 | **G6 position.** W133 blocked; also gates W117 (subject access to evidence scans) | Founder |
| 4 | **Credential visibility across a practice boundary** (Q9 dossier action 1). W131/W137 are built to the safe intersection pending an A-or-B ruling | Founder |
| 5 | ~~**W152's `RenderableItem` is not what W151's console renders.**~~ **CLOSED by W154 (`bce55e6`) while this audit was being written** — filed from the W151 close-out, confirmed critical by Q12 hardening, and fixed there. Recorded rather than deleted because a finding that was raised, routed and closed is evidence the ledger works | Closed |
| 6 | **The console still cannot represent two practices** (Y2 finding B2, still open). Console-side scoping remains untestable end-to-end | Y4 |
| 7 | **`MEHERR_STAFF` ships empty**, so `/console/interest`'s populated branch is unreachable and W153's display sink is not asserted end-to-end | Founder |

## Method

Sweeps run over the whole tree, not the Y3 diff:

- every `.sort(` comparator (66 non-test) read for a missing or meaningless tie-break;
- every "latest wins" pick (`[length - 1]`, `.at(-1)`) traced back to how its input was ordered;
- every `"use server"` file and route handler checked for a gate inside the action;
- founder-gate enforcement re-derived from the source rather than from the previous audit;
- `as any` / `@ts-ignore` / `@ts-expect-error` / debt markers / `Math.random` / `new Date()` /
  secrets / control characters counted and classified;
- route census and record-class registry re-checked in both directions.

Both findings were confirmed by **writing the failing test first** and watching it fail, and both
fixes were confirmed non-vacuous by reverting the fix and watching the new tests fail again.
