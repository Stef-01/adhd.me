# Matching overhaul — week-by-week execution plan

Executes the findings of `docs/MATCHING-APPRAISAL.md` (F1–F10) as eight one-week units,
O1–O8, on the branch `claude/matching-algorithm-review-wy2z5f`. Companion to
`docs/MATCHING-PLAN.md`, which owns the finder's architecture options; this document only
schedules the repairs the appraisal found against it.

**Ordering is by dependency, not by the appraisal's own priority list.** The appraisal ranks
reciprocity (F5) and normalisation (F1) as the two most important borrowings; they are weeks
4 and 2 here because the score's *semantics* must settle before anything is defined over score
differences, and the pipeline must be unified before the score is renormalised. Concretely:
O1 (one pipeline) → O2 (one score) → O3 (ties defined over that score) → O4–O5 (new signals
into a now-stable frame) → O6–O7 (M2 and reader hardening, independent) → O8 (review gate).

Every unit obeys the standing constraints without restatement: `pnpm verify` green before
commit; W213's explainability floor (every ranking input renderable as one closed-vocabulary
sentence); G7 (no classification of the patient); C2/C3 (no per-clinician coefficients, no
learned desirability); gate 4 (synthetic/declared data only). None of these units require a
founder gate; F9 (pool ordering, MATCH-1) is deliberately NOT scheduled — it is recorded as
the founder's decision and no unit here touches `src/engine/pool.ts`.

---

## O1 — Languages into the one pipeline (F2) — Week 1

**The hole:** `matchEvidence` appends language signals that `rankClinicians`/`scoreAgainst`
never see, via a raw-substring matcher (`query.toLowerCase().includes(...)`) — the mechanism
W222 removed from the lexicon for cause. A language-only query renders "unmatched" while the
card prints "Tamil-speaking" as evidence: an explanation of a ranking that never happened.

**The change:**
- `NeedSignal` gains a `{ kind: "language"; language }` facet; `facetKey` covers it.
- `languageNeeds(text, spoken)` in `needs.ts`: roster languages matched over the same
  stemmed-token pipeline as every other cue (inflection-safe, word-boundary-safe).
- `needsFor(query)` in `clinicians.ts` = lexicon needs + roster-language needs; consumed by
  `rankClinicians`, `matchQuality`, `matchEvidence`, and the console's `matchAudit`, so the
  one-computation guarantee holds in **both** directions again.
- The substring matcher `languageAsked` is deleted.

**Verify:** existing suites green; new tests pin (a) a language query ranks the speaker and
is `informed`, (b) score ≡ sum of evidence weights with no lexicon-only carve-out, (c) a
language nobody speaks reaches nothing.

## O2 — Rarity discount and declaration breadth (F1) — Week 2

**The hole:** `scoreAgainst` is a raw sum over declared facets, monotone in declarations —
at a self-declaring roster of fifty, ticking every interview box is the dominant strategy.

**The change (OkCupid normalisation + IDF, inside the floor):**
- A commonality discount computed from the roster's own declarations (the `heldBy /
  roster.length` quantity `clarifiers()` already computes): a facet everyone declares
  separates nobody and contributes less; a rare one contributes more. Sayable as "few of
  the GPs listed say they do this".
- Declaration breadth surfaced in the console audit ("declares 15 of 17 areas") so
  inflation is visible where it is priced.
- The interview's three-state answer (often / sometimes / not me) becomes representable in
  the `Clinician` type so "sometimes" can cost the declarer something relative to "often"
  (data model + scoring hook; roster records stay as-declared until re-interviewed).

**Verify:** property test — adding a facet every clinician also holds never changes relative
order; a rare declared facet outranks a universal one at equal ask-weight; audit shows the
discount per row in one sentence.

## O3 — Ties visible at every boundary (F3 + F4) — Week 3

**The hole:** `matchQuality` is roster-global ("one GP scored 24, fifteen scored 0" reads
`informed` and dresses an arbitrary tail), and `rankCliniciansNear`'s geo band is measured
in rank positions over ties it cannot see — on an unmatched query with an origin, file order
defeats distance even though no preference information exists.

**The change:**
- Rank **bands**: contiguous equal-score groups computed once, rendered where the reader
  acts ("these four answered equally") — per-boundary honesty replacing the single verdict;
  `MatchQuality` stays as the roster-level summary.
- `COMPARABLE_FIT_BAND` redefined over **score difference** (comparable fit = same band),
  so an unmatched query with an origin becomes fully distance-sortable — which is what was
  asked — and an informed query keeps its preference order.

**Verify:** unmatched+origin sorts by distance; informed order never crosses a band by
geography; band copy passes the compliance linter.

## O4 — Reciprocity as capacity (F5) — Week 4

**The hole:** the one structural dating-app lesson — a perfect-fit GP whose books are closed
ranks #1 with nothing on the card saying the match is unactionable. `acceptingNewPatients`
exists, is filterable in the directory, and is invisible to the finder.

**The change:** declared capacity into the finder as fact, not inference: closed books cost
rank within the band (never silently filtered — the reader may want the waitlist) and the
card says why in closed vocabulary ("their books are closed — shown because they fit what
you asked"). No clinician preferences about patients (G7); no learned acceptance model.

**Verify:** closed-books clinician never outranks an equal-fit open one; the sentence
renders on exactly the affected cards; directory filter behaviour unchanged.

## O5 — Stated importance and preference clarifiers (F6 + F7) — Week 5

**The hole:** central lexicon weights guess every reader's priorities identically (OkCupid's
lesson: importance is the user's datum), and `clarifiers()` never asks about the access
preferences (woman GP, telehealth, bulk billing) that separate rosters hardest.

**The change:**
- Clarifier candidates extended to preference facets, `heldBy` computed from
  gender/telehealth/billing data — mechanical extension of the existing evenness ordering.
- An answered clarifier carries a stated-importance lift: the reader *said* it matters, so
  the confirmed facet weighs more than an unprompted mention — evidence still their own
  words, sentence still sayable ("you told us this was the main thing").

**Verify:** preference questions appear when the roster splits on them; a confirmed facet
reorders a previously tied roster; all new prompts/answers pass the compliance linter and
re-read to their facet (reach ratchet extended).

## O6 — Hopcroft–Karp oracle for the slot matcher (F8) — Week 6

**The hole:** M2's greedy refuses augmenting paths for explainability — legitimate, but the
price ("would sometimes offer one more appointment") is asserted in a comment, not measured;
and fewest-options-first quietly rewards recorded scarcity, an assumption safe only while
staff record availability.

**The change:** a test-only Hopcroft–Karp (~40 lines, no dependency) as oracle; property
test over generated instances asserting `greedy ≥ maximum − k` with the observed gap logged;
the narrow-availability incentive stated in the module note plus a latent-finding row (W210
pattern) triggered by any patient-facing availability input; hospitals/residents deferred
acceptance recorded in the module note as the named successor when slots gain clinician
identity. Production greedy unchanged.

**Verify:** oracle agrees with brute force on small instances; gap property holds over the
generator; no production import of the oracle (`test`-only path).

## O7 — Reader hardening batch (F10) — Week 7

Four cheap pins so the small findings stop being latent: stem-table test over the lexicon's
own vocabulary (every phrase token asserted stable); a sentence-boundary marker token no cue
window may cross; `reach.test.ts` corpus extended with every clarifier answer (a lexicon
edit can no longer orphan a prompt invisibly); a stated note + guard where `clarifiers()`
counts `heldBy` over an unfiltered roster.

**Verify:** the ratchet counts strictly more pinned phrases than before; a synthetic
cross-clause bridge case fails to match.

## O8 — Review and close-out — Week 8

The hardening-week law: `/code-review` and `/security-review` over the whole overhaul diff;
findings fixed or recorded; `docs/MATCHING-PLAN.md` §6 updated with what shipped;
an appraisal-delta section appended to `docs/MATCHING-APPRAISAL.md` (finding → disposition →
commit); PR made ready for review.

---

## Status ledger

| Unit | Findings | Status | Commit |
|---|---|---|---|
| O1 | F2 | done | 5dd0fef |
| O2 | F1 | done | 22f320b |
| O3 | F3, F4 | done | 82fac14 |
| O4 | F5 | available (needs O3 for bands) | — |
| O5 | F6, F7 | available (needs O2 weights) | — |
| O6 | F8 | available (independent) | — |
| O7 | F10 | available (independent) | — |
| O8 | review | last | — |
