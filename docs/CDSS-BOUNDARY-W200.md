# W200 — the G7 boundary, re-derived at vertical scale

The Q11 dossier (`docs/GATE-DOSSIER-Q11.md` §"G7 — the four properties") stated four properties
the rail enforces, and W150 added a fifth in `docs/EDUCATION-BOUNDARY-W144.md`. Each was true of
the tree that existed when it was written. Y4 then added fifty-two units — verticals, outcome
auditing, a public directory and reporting to third parties — and this unit's gate says the
properties must be **re-derived** against that, not carried forward.

The distinction is the whole unit. Carrying forward would have produced a document saying five
things still hold. Re-deriving produced four that hold on their own construction and one that
held on nothing but care.

## The result in one line

**Property five's enforcement did not follow the product out of `src/education/`.** W150's
declared copy surface, `EDUCATION_COPY_MODULES`, names six files. Every quarter of Y4 added
operator-facing copy outside those six, and no linter reached any of it. Running the advice rules
over all of it now finds no advice about any patient — so the property itself held — but "it held"
was care rather than a control, and the distance between the two is why this tree writes
registers.

## Properties one to four

Each had a Y4 surface that could plausibly have broken it. The re-derivations are in
`src/compliance/cdss-boundary.ts` as data, per property, with the units cited; a test asserts each
one names at least one Y4 unit, so none of them can be a sentence about the old tree.

| Property | Y4's stress on it | Verdict |
|---|---|---|
| Never selects a clinician | W189's directory search takes a patient's need and returns clinicians | **Holds.** Ordered by declared attributes, no clinical scoring, the ordering basis renders to the reader, and W184/W187/W198 close the prose and price routes to the same recommendation |
| Never decides care transferred | Q14 audits outcomes over the referral rail, where an inferred transfer would surface | **Holds.** `reached` requires a recorded event; no path returns it from an absence |
| Never concludes from silence | Q14 and Q16 both count things that may not be there | **Strengthened.** W170's `not_recorded`, W179's split zero, W171's refusal, W196 refusing to emit a figure over an empty basis |
| Writes no clinical text | W191's dermatology vertical, and `/clinicians` | **Holds.** The vertical is a spec awaiting G5, not shipped content; W192 classified `/clinicians` professional and referred the underlying question to the founder |

## Property five, and what was done about it

The control now covers every Y4 module. Three design points, each of which was a wrong first
attempt before it was a decision.

**Membership is read off the tree, not off a list.** `Y4_FIRST_UNIT` plus each module's own
`// W<n>` header decides which modules must be declared. The first version of the register was a
hand-written list of nine modules — which is the same shape as the thing this unit found wrong
with W150, and it missed nineteen. A Y4 module added tomorrow now fails the test until somebody
says what its copy is.

**Each entry declares which exports an operator READS, not which are strings.** Running the advice
rules over every string export of Y4 flags eleven things; eight are the register machinery itself
— the words a refusal has to quote in order to refuse them, and reviewer notes explaining why a
rule exists. This is the sixth instance of the pattern W198 named: *a scan whose subject matter is
the thing it bans matches the sentence doing the banning.* A heuristic would need an exemption per
collision. A declared surface asks the question that actually decides it.

**The three real hits are accepted per string, and the rule is not loosened.** All three are in
copy an operator does read:

| Module | Export | Rule | Match |
|---|---|---|---|
| `src/ops/silence.ts` | `SILENCE_COPY` | `no-action-framing` | "action needed" |
| `src/verticals/completeness.ts` | `REMAINING_CHAIN` | `no-benefit-claims` | "specialist" |
| `src/verticals/consistency.ts` | `CONTRADICTION_COPY` | `no-clinical-necessity` | "require" |

The first is the one worth arguing. W179's copy says **"No action needed"** about an appointment
feed — the connection is fine, the book is empty — and that is the single most useful sentence a
practice manager can be shown. The tempting fix is to teach `no-action-framing` about negation.
It is wrong: in education copy, *"this pathway changed, no action needed"* would be a clinical
judgement about whether to review anybody. Same six characters, opposite meanings, and the
difference is the surface rather than the string. **This is W192's audience finding arriving from
the other direction** — there it was one page reading differently to a patient and a clinician;
here it is one phrase reading differently in ops copy and education copy. So the rule stays sharp
and each acceptance carries module, export, rule, exact matched string, an argument and a review
date of 2027-02-11, in the shape W53 set for dependency advisories and W192 reused for compliance
findings.

## Security and compliance review

Reviewed against the diff (`src/compliance/cdss-boundary.ts`, `src/compliance/cdss-boundary.test.ts`).

- **No new attack surface.** Both files are pure TypeScript registers and a test. No network, no
  I/O outside the test's read of the repository's own `src/` tree, no user input, no parsing of
  anything untrusted, no new dependency.
- **Founder gates.** No patient data of any kind, real or synthetic, is touched. Nothing here
  sends anything. G5, G6 and G9 registries are read for their emptiness and not written.
- **Compliance.** The unit's product is a compliance control; the copy it declares is unchanged by
  it. No clinical claim, no testimonial or rating, and the word "specialist" appears only in
  refusals and in the acceptance that explains one.
- **The register's known bound, stated rather than filed quietly.** This reaches *exported* copy.
  Prose composed inline inside a render function — `search.ts`'s "Ordered by …" is the clearest
  case — is not reachable by export name. Each entry's `notCopy` says so where it applies. Linting
  rendered output against per-module fixtures is the follow-up, and it is a unit's worth of work,
  not a paragraph's.
- **Residual, for a later hardening week.** ~30 pre-Y4 modules export `_COPY` constants that no
  advice linter reaches. Y4 was this unit's gate and Y4 is what it covers; the pre-Y4 surface is
  the same class of gap one year older, and it should be closed by extending `Y4_FIRST_UNIT`
  downward rather than by writing a second register.

## Verification

`pnpm verify` green. Eleven new tests. Mutation-checked three ways, each failing the named test
and no other:

1. An advisory sentence planted in a declared operator-copy export → *finds no unaccepted advice*
   fails.
2. A Y4 module deleted from the register → *declares every Y4 module* fails.
3. `copyTexts` reduced to a one-level walk → *names only exports that exist, and only exports with
   text in them* fails with `SILENCE_COPY yields no text to lint`.

The third is not hypothetical. The one-level walk was the first version of the function, and
`SILENCE_COPY` is a record of objects, so the lint ran over nothing and reported it clean. The
vacuity guard exists because a lint that reaches no string always passes.
