# W195 — Q15 gate dossier: the G6 decision, priced

Narrow, like its predecessors. `docs/GATE-DOSSIER-Y2.md` holds G0–G7 with their code-level
enforcement, `docs/GATE-DOSSIER-Q9.md` covers credential visibility, `docs/GATE-DOSSIER-Q11.md`
GP-to-GP routing, `docs/GATE-DOSSIER-Q13.md` prices G5 and `docs/GATE-DOSSIER-Q14.md` prices G3.
**This one does one thing: it prices G6 — the public directory launch.** Nothing here restates a
gate's definition or re-argues a position already recorded.

## The finding, stated first: the ledger is wrong about what G6 unblocks

W195's own verify gate says the dossier must name "which Y3 units (W117, W133) unblock with it".
Checking that turned out to be the useful work, because **neither is true as written.**

**W117 is not blocked. It is done** (`d79a99b`), and it is the Q9 gate dossier itself. A dossier
that shipped a year ago does not unblock.

**W133 is blocked, but not on G6.** Its ledger row is labelled `FOUNDER GATE G6`, and its own
"why blocked" text describes a different question entirely: may credential detail cross a practice
boundary — option A, capability presence only; option B, detail inside a consented network. That is
Q9's **action 1**. The Q9 dossier is explicit about the split:

> 1. **Rule A or B, before W131 starts.** … *Blocks: W131, W133, W137.*
> 5. **Commission or explicitly defer the Ahpra advertising review** … *Blocks: G6 itself.*

W133 routes a referral **in-network only** and never renders anything public. An Ahpra advertising
review of profile copy cannot answer whether a credential may cross a practice boundary, because
the two decisions are about different data moving to different audiences.

So the label on W133 is a mislabel — one that has been carried since Q11 — and correcting it moves
the unit's dependency from a gate nobody has scheduled to a decision the Q9 dossier flagged as
**the only genuinely time-critical item in it**. That is a change in urgency, not in scope.

**Corrected: G6 unblocks exactly one unit, W185.**

## What G6 does not open, which is most of what people assume it does

**It does not open specialist titles.** W114 ruled that Meherr publishes no specialist title at
all — stricter than s 133 requires, on the argument that whether a clinician may use one is a fact
on the Ahpra specialist register this product does not read. W187 discovered the consequence when
it became the first unit to turn a profile into copy: `renderProfile` refuses a specialist profile
outright, as a named gate rather than a lint failure, because any honest wording of specialist
registration contains the protected word. **That refusal survives G6 untouched.** It is Q9's
action 4, still open, still cheap, and it is a product decision a build unit made rather than one a
founder ruled.

**It does not produce a directory.** No page in this tree imports anything from `src/directory/`.
The Q15 modules are 3,215 lines with 133 tests and **zero consumers** — a model, a linter, a
renderer, a search, a correction path and a disclosure register, none of which is wired to a route.
W185 is where the pages get built, and G6 opening is its precondition rather than its content.

**It does not decide network membership.** W188 made membership a recorded practice decision,
never inferred from activity, and `SHIPPED_MEMBERSHIPS` is empty. A directory whose advertising
copy has been reviewed and whose membership list is empty publishes nothing.

## What is actually built, verified rather than carried forward

Re-verified for this dossier rather than quoted from the ledger rows:

| Module | What it fixes in place |
| --- | --- |
| `profile.ts` (W183) | A profile is general-with-focus **or** specialist-without. The pairing that renders as "specialist in <condition>" is a type error, not a lint failure. No rating, review, testimonial, endorsement, score or free-text bio field exists, and `REFUSED_FIELDS` states why each is absent. |
| `copy-lint.ts` (W184) | The s 133 claim made **without** the banned word — "specialises in", "expert in". W23 and W6 rules applied by union, never restated. Three surnames excluded by matched word, not by rule. |
| `render.ts` (W187) | The claim made by **juxtaposition**, which no per-field check can see: a focus label may never share a line with a registration word. Framing states whose claim each fact is, and denies the specialty reading explicitly. |
| `search.ts` (W189) | The G7 line: the searcher never describes themselves. No symptom, condition, reason or free-text field exists. Results are never ranked, never truncated, and the stated ordering basis is generated from the same declaration the comparator reads. |
| `membership.ts` (W188) | Membership is a recorded decision, never inferred. |
| `correction.ts` (W190) | Every control reduces or restates a claim; none adds one. |
| `disclosure.ts` (W193) | What leaves the tenancy, enumerated with its basis; a clinician's credentials, capability graph, CPD, complaints and referrals cannot reach a public surface **by type**. |

`SHIPPED_DIRECTORY_PROFILES` and `SHIPPED_MEMBERSHIPS` are both empty and pinned empty by their own
tests. Verify gate green at the time of writing: 168 files, 2,211 tests, build, `audit:gate`.

**Q15 also found the class of defect that only appears between units.** W194's finding is worth
carrying into the review: W184 excluded three surnames that collide with the marketing rules, so
Dr Sarah Best's profile passed field linting; W187 reached the heading through the unfiltered
primitive, so the same profile could not be rendered. Both halves were locally correct. Together
they meant a real clinician had a publishable profile that could not be published, and the
workaround a practice would find is to misspell her name. **An Ahpra reviewer will read rendered
pages, not modules**, and this is the shape of thing that only shows up there.

## What launches, and what stays internal

**Launches on the day G6 opens** — subject to W185 building the pages:

- A profile per consenting clinician: name, registration number, profession, suburb and state,
  languages, whether they are taking new patients, and declared focus areas under an explicit
  denial that they constitute a specialty.
- A search over declared attributes, returning every match in a stated order, ranking nobody.
- A correction path for clinicians, which can only reduce or restate what is published.

**Stays internal, permanently and by type**: credential records and the evidence documents behind
them, verification provenance, the capability graph and routing weights, appointment volume and
recency, CPD records, complaints, referrals written or received, and session configuration. W193
enumerates all ten classes with a reason each, and the module paths are checked against the tree so
a rename cannot leave a stale entry reading as coverage.

**Stays shut regardless of G6**: specialist titles (W114, above), and anything requiring the A-or-B
ruling.

## The honest counter-argument

The case for leaving G6 shut indefinitely is stronger than this tree has previously written down.

A directory is the one Meherr surface with no practice between the product and the public. Every
other artefact is read by somebody who signed an agreement and can be told what a figure means. A
profile is read by a woman looking for a GP, and the only control on how she reads it is the copy
itself. The tree has now found the s 133 claim in a type, in a field, in a composed line, and in a
surname exclusion — four different places, in four consecutive units, none of which the previous
unit anticipated. That is not evidence the problem is solved; it is evidence the surface is large.

Set against that: the population this product exists for is the one least well served by the
directories that already exist, and "we built the compliant version and never shipped it" helps
nobody. The decision is a judgement about appetite, not a technical readiness question, and this
dossier does not make it.

## What is asked, concretely

Numbered by what they block, not by size.

1. **~~Correct W133's blocking gate from G6 to the Q9 action-1 ruling.~~ Done in this unit.**
   A bookkeeping correction of a label a build unit set at Q11, not a founder decision: W133
   stays blocked either way, and the row now names the ruling that actually blocks it. Recorded
   here because the mislabel had been hiding the tree's most time-critical open decision behind
   a gate nobody is scheduling, and a founder reading the ledger should know it moved.
   *Blocks: nothing; unhides W131/W133/W137's real dependency.*
2. **Rule A or B on cross-boundary credential visibility.** Carried unchanged from Q9 action 1,
   where it was already "the only genuinely time-critical item". It has been open for two
   quarters. *Blocks: W133, and W137's usefulness.*
3. **Commission or explicitly defer the Ahpra advertising review of profile copy, `/` and
   `/finder`.** Q9 action 5, itself carried from the Y2 dossier, where it was already the third
   ask. **It has now been open for more than a year of build.** If the answer is "prototype only",
   writing that in `BUILD-STATE.md` closes it — the Y2 dossier said exactly this and nothing was
   written down, so this dossier says it a third time and names the cost of not answering: W185
   cannot be scheduled, and seven modules stay at zero consumers. *Blocks: G6, therefore W185.*
4. **Ratify or overturn the W114 specialist position.** Q9 action 4, unchanged, and now with a
   concrete consequence attached: W187 refuses to render a specialist profile at all, so a
   practice with a specialist-registered GP cannot list them even after G6 opens. Still cheap to
   change; more expensive once practices have authored focus labels around it.
   *Blocks: nothing today.*
5. **Decide whether network membership requires per-clinician consent.** Q9 action 2, unchanged.
   W188 records membership as a practice decision; whether the clinician must also agree to being
   published is a separate question the model does not currently ask. *Blocks: nothing today;
   answering it after profiles exist means re-consenting people.*

## What this dossier deliberately does not do

It does not argue for or against launching. It does not restate G6's definition, which is in
`docs/GATE-DOSSIER-Y2.md`. It does not re-derive the Q9 actions it carries forward — where an item
is unchanged it says so and points at the original rather than rewriting it, so a founder reading
both does not have to work out whether the wording drifted.

## Verification

Every claim above was checked against the tree at the time of writing rather than read from a
ledger row: module inventory and line counts from `src/directory/`, test counts from a full run,
the absence of consumers from a search for `@/directory` across `app/`, W117's status and SHA from
`BUILD-STATE.md`, and the action-1/action-5 split quoted directly from `docs/GATE-DOSSIER-Q9.md`.
