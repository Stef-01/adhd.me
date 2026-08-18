# Matching: the next twelve months (O20)

**Goal (founder, 2026-08-18):** a year-long refinement plan that makes matching much more
powerful and robust, learning from established open-source work, with continued refinement of
how visibly a doctor's fit is explained.

**Where it starts from.** The overhaul (O1–O17, merged) left one pipeline: `needsFor` reads a
request into a closed vocabulary; rarity discounts, stated-importance lifts and declaration
factors weight it; ranking, explanation, quality verdict and console audit all read the same
evidence; ties are said out loud; clarifiers ask only questions that reorder the roster.
Standing constraints that no quarter may bend: explainability floor (W213 — every point of
score sayable in closed vocabulary), no per-clinician hand weights, no symptom-based triage
(TGA boundary, Q17 dossier), synthetic data until the founder gates lift, and honesty about
non-rankings.

## Q1 (Sep–Nov 2026): reach and evidence — make the reader hear more, provably

1. **Reach corpus at scale.** Extend O13's plain-name sweep into a standing corpus of ~500
   real-shaped requests (synthetic, founder-authored + paraphrase variants). Gate: reach
   percentage per facet tracked in CI; any drop fails the build. This is the matching
   equivalent of a golden-file suite. It must test FALSE positives as hard as misses: first
   seed found while building O22's reach-gap feed — "my rooms are above the pharmacy" reached
   `manner:culturally_attuned` through the cue "in the room with me", which stopword-stripping
   had collapsed to the single token [room]. Fixed in O25 (cue re-authored to keep two content
   tokens; the full set of one-token collapses frozen in reach.test.ts so it can shrink but
   never grow silently). A follow-up probe (O25) showed the rest of the frozen list fires the
   same way — "next door to the chemist" → unhurried via [door]; "the practice name is on the
   sign" → sense-making via [name]; "school on the edge of town" → steadying via [edge] — AND
   why they cannot be reworded one by one: the intended patient sentences strip to the same
   single token ("I can never get a word in" → [never, word]), so precision and recall are
   coupled at the stopword layer. The Q1 deliverable is therefore matcher-level: a collapse-
   aware rule (e.g. one-token cues demand clause-level co-occurrence with another same-facet
   cue, or a kept function-word skeleton) designed against the corpus, not cue whack-a-mole.
2. **Onboarding-driven lexicon growth (O22 loop).** Every doctor interview's "sentences that
   proposed nothing" feed lexicon review — the clinician side discovers patient-side gaps.
3. **Morphology upgrade.** Replace the suffix-stemmer's worst misses (found by the corpus)
   with explicit inflection tables per cue where needed. Study: `natural` (github.com/
   NaturalNode/natural) for its Lancaster/Porter trade-offs — borrow test cases, not the
   dependency.
4. **Negation clauses.** "I don't want medication changes" currently risks reaching
   `titration`. Extend clause rules with a small negation-scope pass; pin both directions.
   Study: negspacy's NegEx implementation for scope conventions (rule lists, not the model).

## Q2 (Dec–Feb): robustness — the ranking under adversarial and degenerate input

5. **Property-based testing.** fast-check (github.com/dubzzz/fast-check) over the pipeline:
   determinism, permutation-invariance of roster order, monotonicity (adding a declared facet
   never lowers that clinician), rounding stability, band coherence. These are the invariants
   the O-units asserted by example; properties assert them for all inputs.
6. **Fuzz the reader.** Random token soups, emoji, mixed scripts, 10k-word essays; budget the
   reader (time-boxed, input-capped) so no request can stall the finder.
7. **Capacity truthfulness (F5 follow-through).** Closed-books and slot data age; add a
   staleness rule — declarations older than N days demote to "sometimes"-grade confidence
   with console nudges to reconfirm. The matching-market lesson (deferred-acceptance systems
   like NRMP) is that stated capacity drifts from real capacity and the mechanism must price
   that in.
8. **Tie-quality metric.** Track, per synthetic corpus run, how often the top band ties at
   size >3 — the "clarifier failed to separate" rate. It becomes the KPI clarifier work moves.

## Q3 (Mar–May): the roster grows — matching as a market, not a list

9. **Reciprocity, properly (F9/MATCH-1 heir).** With >5 clinicians, adopt the reciprocal-
   recommender frame dating platforms converged on: a match score is a function of BOTH
   directions — patient-need fit AND clinician-capacity/case-mix fit. Study: RECON
   (reciprocal recommendation literature), and Hinge's published Gale–Shapley "Most
   Compatible" write-ups; our Hopcroft–Karp oracle (O6) already gives the assignment
   upper bound to evaluate against.
10. **Clarifier policy at scale.** With twenty clinicians the evenness sort (clarify.ts) has
    real choices; evaluate question order by expected order-change (information gain over the
    band structure), not just split evenness. This stays explainable: the question shown is
    still one of the fixed prompts.
11. **Semantic assist, behind the explainability floor.** Embedding similarity (MiniLM-class
    sentence-transformers, or pgvector on the existing Supabase stack) as a CANDIDATE
    GENERATOR ONLY: it may suggest which lexicon facets a sentence is near, for the console
    reach-report and clarifier choice — it may never add score. Score without a sayable cue
    stays banned, which is the line between "powerful" and "unexplainable".

## Q4 (Jun–Aug 2027): learning, evaluated honestly

12. **Outcome signal, gated.** Once real bookings exist (post-gate), the only learnable label
    the boundary allows: "did the person contact the practice shown first". No diagnosis, no
    symptom data, no per-patient profile.
13. **Weight fitting inside the sayable structure.** Fit the LEXICON's per-facet weights (the
    same numbers now hand-authored) against that signal — learning-to-rank in the smallest
    possible hypothesis space. Study: LightGBM's LambdaMART for method; but the deliverable is
    ~40 fitted scalars in `needs.ts`, reviewable in a diff, not a model artifact.
14. **Interleaved evaluation.** Compare ranker variants by team-draft interleaving on synthetic
    corpus + (post-gate) live sessions, which detects preference with far fewer sessions than
    A/B. Everything ships behind the verify gate's reach and property suites.
15. **Year-end appraisal.** Re-run the F1–F10 appraisal against the year's state; publish
    MATCHING-APPRAISAL-2027 with the same severity honesty.

## Explaining the fit, continuously (runs all year)

- O21 shipped provenance on the profile ("from your words: …"). Next increments, one per
  quarter: (Q1) unmatched asks named per-clinician, not just globally; (Q2) "what would
  change this order" — surfacing the top clarifier ON the profile; (Q3) side-by-side compare
  of two clinicians' evidence; (Q4) the same provenance view inside the console so a doctor
  sees exactly what patients are told about them.

## The targeting-levels audit (O23)

docs/MATCHING-TARGETING-AUDIT.md judges the matcher against the advertising hierarchy
(demographic → remarketing). Its conclusion shapes this plan: the growth path is stated-
psychographic vocabulary breadth (Q1 corpus, O22 interview loop) and contextual clarifier
policy (Q3) — behavioural, programmatic and remarketing capability are standing refusals,
not backlog.

## What is deliberately NOT in the plan

- **Collaborative filtering / behavioural profiles** — requires per-patient histories the
  privacy posture refuses.
- **LLM-generated match reasons** — W213: reasons compose from the closed set; generation
  reintroduces unverifiable claims on a health surface.
- **Engagement-optimised ranking** (the dating-app Elo lineage) — optimising for time-on-site
  is the opposite of this product's promise; the only fitness function is "reached the right
  door".
