# W194 — Q15 hardening

Scope: W183–W193, the directory (`src/directory/*`, seven modules), W191's dermatology vertical
and W192's public sweep. Run with the review skills per CLAUDE.md law 5.

## Verdict

**Two findings, both mine, and both of a shape a per-unit test cannot reach.** Neither is live —
G6 keeps `SHIPPED_DIRECTORY_PROFILES` and `SHIPPED_MEMBERSHIPS` empty, so no profile has ever been
published — but the first one would have stopped a real clinician being listed, and the second was
making a control look larger than it is.

Gate at HEAD: 2220 tests / 169 files, build, `audit:gate` PASS.

## Q15-1 — a clinician with the wrong surname could be published but not rendered (MEDIUM) — FIXED

`W184`'s `lintProfile` lints a profile's FIELDS and excludes a short list of surnames that collide
with the marketing rules, so **Dr Sarah Best passes**. `W187`'s `renderProfile` lints the COMPOSED
lines — the sentences a template makes out of several fields, which no per-field check sees — and
reached the `heading` line through the unfiltered `lintDirectoryText`. The heading *is* the name.
So **Dr Sarah Best was refused**, with `no-superlatives` and `no-benefit-claims` on her own surname.

Verified before it was written up:

```
Dr Sarah Best     | W184 lintProfile: []  | W187 renderProfile: refused (no-superlatives: "Best")
Dr Michael Leading| W184 lintProfile: []  | W187 renderProfile: refused (no-superlatives: "Leading")
Dr Jane Smith     | W184 lintProfile: []  | W187 renderProfile: ok
```

**Neither half was wrong.** W184 was right that a surname is not a superlative. W187 was right that
composed lines need linting and that the primitive is the thing to call. The defect is that they
were *separately* right about one publication path, which is why no test in either unit could have
caught it: each passes its own.

The direction of the disagreement is the part worth stating. It does not leak anything or publish
anything false — it stops a real person being listed, and the workaround a practice would reach for
is to misspell her name in a public directory entry that carries her registration number.

**Fix.** The exclusion becomes a function, `lintName`, instead of a filter living inside one
caller. Both paths call it, so there is one definition of "the rules that apply to a name". W190's
correction path already used `lintProfile`, so it inherits the fix and a third disagreement is
closed with it — a clinician could otherwise have corrected their name successfully into a profile
that would not render.

**The control is the AGREEMENT, not either half.** `src/directory/publication-agreement.test.ts`
runs the same profiles through both and requires the same answer, driven from `NAME_WORD_EXCLUSIONS`
itself so adding a surname without teaching the render path fails. Mutation-checked: reverting the
one-line fix fails four of its ten cases.

## Q15-2 — a dead entry in the surname exclusion list (LOW) — FIXED

Found by mutation-checking Q15-1's fix, which is the only way it could have been found: reverting
the fix failed the `best` and `leading` cases and **did not fail `top`**. No rule matches the bare
word — `no-superlatives` carries "top-rated", not "top" — so the entry excluded nothing.

A dead exemption is the stale-register-entry class this tree keeps catching (W102 stale rows, W167
stale fold sites, W178's own corpus check). It is not harmful in itself; it makes the list look
like it is doing more than it is, and the next reader trusts its size rather than its contents.

**Fix.** Removed, and the register is now checked in both directions: every entry must be a word
some rule would otherwise have caught. An exclusion that excludes nothing now fails the suite.

## Confirmed clean

Checked and found sound, listed so the next reviewer knows what was looked at rather than guessing:

- **`membership.ts` cannot read the referral rail.** Zero imports, asserted. The `REFUSED_BASES`
  list holds the four derivations that were considered and refused, each with a reason.
- **`search.ts` (W189)** orders by declared attributes and does not select a clinician. Its own
  suite pins the ordering and the refusal.
- **`disclosure.ts` (W193)** enumerates what leaves the tenancy.
- **The specialist path is refused at render, by name.** W183's type makes the bad shape
  unwritable and W187 refuses a specialist profile outright rather than emitting copy that fails
  its own linter downstream — the reason a reader is given is the real one.
- **G6 holds everywhere it should.** `SHIPPED_DIRECTORY_PROFILES` and `SHIPPED_MEMBERSHIPS` are
  both empty and both pinned empty by their own tests.
- **W192's accepted findings are narrow.** Path, rule and matched text each, with a review date,
  and the sweep checks both directions so an acceptance for a finding a page no longer produces
  fails rather than lingering.

## Method note, and it is the finding behind the findings

Q10 ended with "for any module that folds a collection, test two of the thing in both orders". Q11
found that rule applied to one dimension and not every dimension that can tie. Q15 adds the next
turn of the same screw:

> **When two modules check the same thing for different reasons, test that they AGREE.** A
> per-module test cannot find a disagreement, because each module passes its own. The defect is not
> in either one; it is in the pair, and nothing owns the pair unless somebody writes a test that
> does.

This tree now has three instances. W154: the education console had a gate and did not call it.
W192: `/clinicians` had a rule that was never applied to it. Q15-1: two rules applied to one path,
disagreeing. All three are the same question asked at different distances — **is the check that
exists the check that runs, and is it the only one?**

## Verification

`pnpm verify` green at HEAD: typecheck, 2220 tests / 169 files, build, `audit:gate` PASS
(2 accepted advisories, 0 unaccepted). Both fixes mutation-checked.
