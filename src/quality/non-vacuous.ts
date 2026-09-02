// O196: the non-vacuity helper, and the register of loops that are allowed to iterate nothing.
//
// WHERE THIS CAME FROM. O194 found a timing assertion that failed at random; O195 found its sibling
// that could not fail at all, because a `Math.max(…, 1)` floor added to stop the flake had grown
// larger than anything the test could measure. Two accidents, one shape: an assertion that does not
// assert. This module is the general answer to the question they raised — how many checks in this
// suite pass when there is nothing to check?
//
// MEASURED BEFORE BUILT, AND MEASURED WRONG TWICE BEFORE IT WAS MEASURED RIGHT. That sequence is
// kept because it is the whole lesson of the three units that produced this one.
//
//   * A crude scan reported 340 suspect `it` blocks out of 3427. Hand-checking a sample killed it:
//     most were loops over literal arrays written in the test itself, which cannot be empty.
//   * Refined to loops over an IMPORTED value — the only kind whose emptiness is a real product
//     state — it reported 23, and this module was built to serve those 23.
//   * **The 23 was wrong.** The scanner's capture class included `)`, so a bare `for (const x of
//     REGISTER)` captured `REGISTER)`, which matched no import and was silently dropped. Only
//     loops that happened to end in a call — `of thing()` — were ever counted. The census test
//     found this by failing on entries the scan had never reported. A third bug followed it: the
//     title regex `["'`](.*?)["'`]` stopped at the first apostrophe, so every test whose name
//     contains one was keyed under a truncated title and no register entry could match it.
//   * Corrected on all three: the real population was **146**, not 23 — an undercount of six times.
//     13 are guarded here, 5 are declared legitimately empty, and 133 remain pinned below.
//
// THAT IS WHY THE REMAINDER BELOW IS A RATCHET AND NOT A ZERO. Guarding 13 compliance-adjacent
// sites by hand was a day's honest work; hand-classifying ~146 is not one unit, and wrapping them
// mechanically would be worse than leaving them, because a `.filter(...)` forced non-empty asserts
// something false. So the remainder is pinned as named debt that can only fall — AR2's
// `UNENFORCED_COUNT` and AR25's `UNCLASSIFIED_EMPTY_BRANCHES` shape, applied to assertions.
//
// THE DISTINCTION THAT MAKES THIS A REGISTER RATHER THAN A LINT. Not every empty loop is a defect.
// `KNOWN_FALSE_POSITIVES.filter(e => e.fixedBy)` is empty exactly when nothing has been fixed yet,
// and `REACH_CORPUS.filter(x => x.awaitingFounder)` is empty on the day the founder answers the
// gate — forcing either non-empty would assert a false thing and would make answering a gate break
// the suite. So a loop over a register is one of two things and must say which: guarded by
// `eachOf`, or declared below with the reason its emptiness is legitimate.

/**
 * Assert a collection has something in it, then hand it back to be iterated.
 *
 * `for (const x of eachOf(REGISTER, "what it is"))` reads the same as the loop it replaces and
 * turns "this passed" into "this passed over N things". The message names the collection because a
 * bare "expected 0 to be greater than 0" three frames into a helper tells nobody which register
 * went empty.
 *
 * Deliberately NOT a vitest matcher: it returns the collection so the call site stays a plain
 * `for…of`, which keeps the diff at one line per site and leaves the test readable to somebody who
 * has never seen this module.
 */
export function eachOf<T>(items: readonly T[], what: string): readonly T[] {
  if (items.length === 0) {
    throw new Error(
      `non-vacuity: ${what} is empty, so the assertions below ran over nothing and this test ` +
        `proved nothing. Either the register lost its contents, or emptiness is legitimate here ` +
        `and belongs in LEGITIMATELY_EMPTY in src/quality/non-vacuous.ts with its reason.`,
    );
  }
  return items;
}

/** A counter for loops whose body may legitimately skip items — see `seen`/`atLeast`. */
export interface Tally {
  readonly count: () => number;
  readonly saw: () => void;
}

/**
 * For the loops that CANNOT simply be wrapped, because their body skips items by design.
 *
 * `provenance.test.ts` walks every clinician's reason lines and `continue`s past the ones whose
 * words are not their own cue; `directory/render.test.ts` skips blank lines. In both, the
 * collection is non-empty and the assertions still might not run. Counting what was actually
 * asserted is the only honest guard, so the site tallies and then states its floor.
 */
export function tally(): Tally {
  let n = 0;
  return { count: () => n, saw: () => void (n += 1) };
}

/**
 * Loops over a product register that are allowed to iterate nothing, and why.
 *
 * Both directions are enforced by `non-vacuous.test.ts`: an entry naming a site that no longer
 * matches is stale and fails, and a new unguarded loop over an imported register fails until it is
 * either wrapped in `eachOf` or added here. The reason field is the point — "this one is fine" is
 * not a reason, and an entry that cannot say why emptiness is correct is a `eachOf` waiting to be
 * written.
 */
export interface LegitimatelyEmpty {
  /** `path:line-ish` is deliberately NOT used — line numbers rot. File plus the `it` title. */
  readonly file: string;
  readonly test: string;
  readonly why: string;
}

/**
 * Unguarded loops over an imported register that this unit did NOT reach, pinned so the number can
 * only be paid down deliberately.
 *
 * O196 guarded 13 sites — chosen for stakes rather than convenience: the W55 provenance intervals,
 * the W148 advice linter, the directory renderer's "adds no prose of its own", the finder's
 * patient-visible labels, the sitemap-to-census trace. This is what is left.
 *
 * A NUMBER RATHER THAN A LIST, and the reason is the same one AR2 gives for `UNENFORCED_COUNT`: a
 * list of 133 titles would rot on the first rename and would invite somebody to satisfy the census
 * by editing the list. The count is derived from the tree every run, so it falls when a real guard
 * lands and rises when a new unguarded loop does — and BOTH fail, because a debt that shrinks
 * without anybody recording it stops being a measured fact.
 *
 * Paying it down is ordinary future work, best done a directory at a time; `src/matching` carries
 * much the largest share, then `src/compliance`, `src/quality` and `src/demo`.
 */
/*
 * 133 -> 123 (O209): THE NUMBER FELL BY TEN BECAUSE IT WAS MEASURED WRONG, NOT BECAUSE ANYTHING WAS
 * FIXED — and that distinction is the whole reason this comment exists rather than a bare edit.
 *
 * The census read a loop's collection by capturing the expression after `of`, and that capture
 * swallows a call: `for (const x of eachOf(REG, "…"))` captured `eachOf(REG, "…"`, whose root is
 * `eachOf`. In any file using the guard that root is an imported name, so the site counted as a
 * register loop — and the guard check then looked for `eachOf(eachOf(…` and never found it. A
 * correctly guarded site read as unguarded, from the day this module landed.
 *
 * TEN SITES, AND THEY WERE THIS UNIT'S OWN BEST WORK. O196's ledger row names the 13 it guarded "by
 * stakes": the W55 provenance intervals, the W148 advice linter, the directory renderer, the
 * finder's patient-visible labels, the sitemap-to-census trace. `registers/store.test.ts` (twice),
 * `quality/sitemap.test.ts` and `matching/clarify.test.ts` were among the ten being reported back as
 * debt. The census was refusing to credit the work it was written to record.
 *
 * O196's own law is that an untracked DROP is progress nobody recorded. An untracked CORRECTION is
 * worse, because it reads as progress: nothing was guarded here, ten things stopped being described
 * wrongly. The real debt was always 123.
 */
/*
 * 123 -> 112 (O211): ELEVEN SITES PAID DOWN IN `src/compliance`, AND THE DIRECTORY WAS CHOSEN ON
 * O196's OWN CRITERION — stakes, not convenience. `src/matching` is larger (20), but these are the
 * checks standing behind the product's honesty claims, where an assertion running over nothing is a
 * compliance control reporting success over an empty register.
 *
 * EIGHT GUARDED, THREE DECLARED, and the split is the work. Guarded (`eachOf`), because emptiness
 * would be a failure nobody would see: the G7 rail properties (×4, across cdss-boundary and
 * g7-at-five-years — a rail with no properties is the silent catastrophe this register exists
 * against), the operator-copy surfaces (×2 — one of those tests is *itself* about vacuity, its own
 * comment reading "a lint that reaches no string cannot fail"), `PUBLIC_SURFACES`, and W23's
 * `LANDING_RULES`.
 *
 * Declared legitimately empty, because emptiness is the DESIRED state: the three acceptance
 * registers. Each says what an acceptance must carry, which over zero acceptances is vacuously true
 * and correct — and `CONSOLE_ACCEPTED_FINDINGS` has a founder gate whose answer empties it, so a
 * floor there would make answering a gate break the suite. Wrapping all eleven mechanically would
 * have been worse than leaving them, which is exactly why O196 refused to do that at scale.
 *
 * The remaining 112 are the same ordinary work: `src/matching` 20, `src/demo` 10, `src/design` 9,
 * `src/quality` 8, `src/platform` 8, then a long tail.
 */
export const UNGUARDED_REMAINDER = 91;

export const LEGITIMATELY_EMPTY: readonly LegitimatelyEmpty[] = [
  {
    file: "src/quality/size-census.test.ts",
    test: "lists the gains still to bank, if any, as entries the register accepts",
    why: "Iterates bankable(measured, RATCHET) — the measures now under their floor. U14's law is that the floor IS the number, so the list is empty in the state the ratchet aims for: every floor banked to the tree's exact figure. Forcing it non-empty would assert that unbanked gains exist, which is the opposite of the register's goal; the over-floor direction is asserted separately over every measure.",
  },
  {
    file: "src/matching/known-fps.test.ts",
    test: "every FIXED entry no longer exhibits it, so a fix cannot silently regress",
    why: "Iterates KNOWN_FALSE_POSITIVES.filter(e => e.fixedBy) — the entries somebody has already fixed. It is empty exactly when nothing has been fixed yet, which is a real and unremarkable state of the register. Forcing it non-empty would assert that a fix exists, which is not this test's claim: its claim is that fixes do not regress, and over zero fixes that is vacuously true AND correct.",
  },
  {
    file: "src/matching/refused-cues.test.ts",
    test: "an owned phrase really is live on the facet that owns it",
    why: "Iterates REFUSED_CUES.filter(x => x.ownedBy) — refusals that name another facet as the phrase's owner. A refusal register whose entries all stand on their own reasons, with none claiming an owner, is a legitimate register; the check exists to stop an OWNERSHIP claim hiding a re-add, and with no ownership claims there is nothing that could hide.",
  },
  {
    file: "src/matching/refused-cues.test.ts",
    test: "never counts a founder-blocked aspiration as open work",
    why: "Iterates REACH_CORPUS.filter(x => x.awaitingFounder). Zero is the DESIRED end state — it is what the corpus looks like on the day the founder answers the last gated aspiration. A floor here would make answering a founder gate break the suite, which would be this tree's own founder-gate protocol turned upside down.",
  },
  {
    file: "src/matching/known-fps.test.ts",
    test: "gives every acceptance a reason, because one without is indistinguishable from not looking",
    why: "O212. Iterates acceptedFalsePositives() — the false positives somebody has decided to live with rather than fix. Empty is the DESIRED end state: it is what the register looks like on the day every known false positive has been fixed instead of accepted. A floor here would mean the suite breaks when the matcher gets better, which inverts the register's purpose. Four are accepted today; the check is that each carries a rationale, and over zero acceptances that is both vacuous and correct.",
  },
  {
    file: "src/matching/needs.test.ts",
    test: "scores a clinician only on facets they declared",
    why: "O212, and MEASURED rather than argued. The roster loop is guarded; the inner loop is over matchEvidence(clinician, 'titration and a longer first appointment'), which returned 2 needs for the first clinician and 0 for the second when this was written. A clinician who declares neither titration nor longer appointments producing no evidence is the matcher scoring only what was declared — precisely the property this test asserts — so eachOf here would fail the suite on correct behaviour. The guarded outer loop still asserts scoreAgainst() >= 0 for every clinician, so the test is not vacuous overall.",
  },
  {
    file: "src/matching/edge.test.ts",
    test: "never says anything back that is not in the closed vocabulary, whatever comes in",
    why: "O212. Both outer loops (the junk queries, the roster) are guarded; the inner loop is over the evidence junk produces, and junk producing NO evidence is the whole point of the test's subject. A floor would assert that gibberish, markup and pasted script tags DO reach facets. The block's other assertions — that the composed reason contains no '<script>' and no '{{' — run once per query per clinician over the two guarded loops, so the case that matters is checked whether or not any evidence comes back.",
  },
  {
    file: "src/privacy/record-classes.test.ts",
    test: "treats 'derived' as a reviewed answer, not an exemption",
    why: "Iterates RECORD_CLASSES.filter(x => x.handling === 'derived'). A privacy register in which no class is derived — every one erased at its source — is a stricter register, not a broken one, and the day that happens this check correctly has nothing to say. The claim is about what a derived class must explain, not that any must exist.",
  },
  {
    file: "src/compliance/console-honesty.test.ts",
    test: "every entry names a console screen that exists, a rule the sweep applies, and both arguments",
    why: "Iterates CONSOLE_ACCEPTED_FINDINGS. Empty is the DESIRED end state, and there is a founder gate whose whole purpose is to produce it: `console-honesty-wording-review` asks whether 'Best Practice' and 'specialist' remain the right words on staff screens, and answering it either way empties this register. Forcing it non-empty would mean answering a founder gate breaks the suite — the exact inversion O196 named when it declared REACH_CORPUS.awaitingFounder legitimate. The claim here is what an acceptance must carry, which over zero acceptances is vacuously true AND correct.",
  },
  {
    file: "src/compliance/cdss-boundary.test.ts",
    test: "keeps the acceptances narrow — no rule is switched off anywhere",
    why: "Iterates ACCEPTED_COPY_FINDINGS. Its claim is that no acceptance is a wildcard — a property OF acceptances, not a claim that any exist. An education-copy linter with nothing accepted is a stricter linter, not a broken one, and it is what this register looks like on the day every accepted string has been reworded. A floor would require a live acceptance to exist before the narrowness check could be non-vacuous, which is the wrong shape: the check exists to stop a rule being switched off, and zero acceptances switches nothing off.",
  },
  {
    file: "src/compliance/public-surfaces.test.ts",
    test: "accepts by exact path, rule AND matched text — never a rule in general",
    why: "Iterates ACCEPTED_FINDINGS, and the same argument as its console and education siblings applies: the claim is about the SHAPE an acceptance must take, which zero acceptances satisfy correctly. This register also cannot go empty unnoticed — the sibling test in this file pins its exact contents as a named set, so emptiness fails there loudly — which makes a floor here redundant as well as wrong.",
  },
  {
    file: "src/design/dead-css.test.ts",
    test: "declares no exception for a class the sheet no longer styles",
    why: "Iterates DEAD_CSS_EXCEPTIONS, which O200 left EMPTY because it deleted all 92 dead classes rather than excepting any. Empty is the desired end state: an entry here means a class styled deliberately without appearing in this tree's source, which today is nothing. A floor would require such a class to EXIST before the census could be non-vacuous, which is the wrong shape — the sibling assertion that the dead list is empty carries the real claim, and it is proven non-vacuous by a planted fixture instead.",
  },
  {
    file: "src/design/hover-gate.test.ts",
    test: "declares no exception for a selector the sheet no longer carries",
    why: "Iterates HOVER_EXCEPTIONS, which O199 left EMPTY on purpose: all 37 ungated hover rules were fixed rather than pinned as a remainder, because unlike this module's own 146 vacuous assertions they were mechanical and fully classified before the first edit. Empty is the desired end state, and a floor here would mean the census could only pass while at least one rule was still excepted — a check that requires a violation to exist in order to be non-vacuous. The register is kept so a future genuine exception has somewhere to be ARGUED, and the sibling assertion that the count of ungated rules is zero is the one carrying the real claim.",
  },
  {
    file: "src/audit/store.test.ts",
    test: "holds no visit under a practice id no console mints",
    why: "Iterates getAudit().visits on a store the test does not seed. It is an anti-regression pin whose subject is a SHAPE — any id outside the console's `prac-${n}` minting — and an empty audit store trivially holds no such id. Recorded here rather than floored because seeding the store to satisfy the counter would test the seed rather than the defect, and W26 makes minting a privileged path this test must not exercise.",
  },
];
