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
   **The rule is DONE — O45, 2026-08-19** (`collapsedCueSatisfied` in read.ts: a collapsed cue
   also needs an adjacent, in-order authored-word pair with stopwords kept, content word
   included, same clause; the three named false positives are pinned dead and every intended
   sentence preserved in reach.test.ts §O45). Building it also caught the corpus propping
   itself up: the cardiac-safety sentence was "reached" only by "what is going on" firing on
   "…not GOING to…", and now reaches honestly through new structured-facet heart cues. The
   REMAINING Q1 item-1 work is the corpus at scale (~500 requests, per-facet reach percentage
   in CI). **The corpus infrastructure and first tranche are DONE — O47, 2026-08-19**
   (`src/matching/corpus.ts`, W231): ~100 requests as data, each pinning what it MUST reach,
   MUST NEVER reach (incl. the G7 rule that symptom descriptions are intentional non-reaches,
   carried as data), or ASPIRES to (the measured gap list — 14 entries, the lexicon's
   to-do list); per-facet heard-counts gated against measured floors, and a met aspiration
   fails the build until promoted in the same commit. Growth to ~500 continues across Q1 in
   the same format; founder-authored entries welcome. **Tranche two DONE — O53, 2026-08-19**:
   ~95 further entries (≈200 total), which caught one real reader defect (the "no medication"
   cue drifting across insertions — fixed with the tight determiner-negator rule in findCue,
   pinned both directions) and two more stemmer warts for the O50 table (kids under the
   length floor; dismissed/dismiss split by trimDouble); floors re-measured across all 25
   facets. **First aspiration sweep DONE — O49,
   2026-08-19**: 16 entries promoted after G7-reviewed cue widening across nine facets
   (want-phrasings only), floors raised in the same commit, one over-loose cue removed after
   the corpus caught it shadowing another facet's cue inside its claimed span. Three attuned
   aspirations stay open deliberately — their phrasings read distress rather than a want, and
   authoring cues for them needs a founder-side judgment call.
2. **Onboarding-driven lexicon growth (O22 loop).** Every doctor interview's "sentences that
   proposed nothing" feed lexicon review — the clinician side discovers patient-side gaps.
3. **Morphology upgrade. DONE — O50, 2026-08-19.** The `INFLECTIONS` table in read.ts,
   applied as stem()'s last step so cues, sentences and O45 raw skeletons unify identically.
   Three corpus-named wart families bridged: irregulars (taken/took→take, seen→see), the
   length-guard edge (sees, seeing→see), and e-droppers stranded by ed/es-stripping
   (believ→believe, judg→judge, minut→minute). Deliberately not Porter — every entry needs a
   real sentence in the tests the suffix rules demonstrably cannot bridge; `natural` was
   studied for test cases, not imported. Pinned: stem-equivalence per family + two
   previously-deaf corpus phrasings now reaching ("nobody ever believes me", "quick to
   judge"), non_judgmental floor raised with them.
4. **Negation clauses. DONE — O40, 2026-08-19.** `negatedWant` in read.ts, NegEx's convention
   scaled to this reader: explicit desire-negation phrases ("don't want", "not looking for",
   "don't need", "no interest") — never bare negators — with scope forward to the clause
   boundary, applied to care and preference cues only. Manner is exempt BY DESIGN and pinned:
   "I don't want to feel rushed" IS the unhurried ask. Also pinned: "my GP won't do titration"
   (complaint = want) and "never had an assessment" (history ≠ refusal) still reach. Both
   directions in reach.test.ts §O40.

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

## UI refinement & motion, continuously (runs all year)

The founder's standing directive (2026-08-18): every surface a minimalist, modern 2026-grade
piece — no clutter anywhere, things very clear — with motion treated as an innovation track,
not decoration. The product already uses `motion/react` (Framer Motion's successor); the work
is to use it the way the mix hero does: motion that carries MEANING (a value resolving, an
order re-sorting, a proposal arriving) and nothing that merely draws the eye.

- Cadence: at least one UI-refinement unit per week from the hourly build loop, each with a
  before/after capture in `qa/` and a `docs/DESIGN-QA.md` entry. The declutter audit
  (qa/ui-o24/) is the baseline record.
- Motion innovations queued, hardest constraint first (`prefers-reduced-motion` always fully
  honoured — every effect has a static equal): shared-layout transitions between the finder's
  screens (`layoutId` from result row → profile, so the chosen GP visibly *is* the same
  object); the results list re-sorting with `layout` animations when a clarifier answer
  reorders it (the order changing is the product's whole argument — show it) — **SHIPPED,
  O52 (2026-08-19)**; the match
  evidence weights drawing in as the score line settles; scroll-linked reveal on the story
  landing kept within one viewport of intent.
- Guardrails: 44px touch floor (O14), fold discipline (W167 register), no motion on patient
  error paths, and the taste rules recorded in `docs/DESIGN-QA.md` stand in for the
  taste-skill wherever the loop session lacks it.

## Standing debts from the founder's asks (audited 2026-08-18)

Everything asked across this arc that is still outstanding or thinner than the ask deserved,
so the loop cannot lose it. Build-loop units unless marked FOUNDER:

1. **The mix hero doesn't yet keep its promise mechanically — LARGELY CLOSED by O26
   (2026-08-18).** `desiredMixPercent` now rides the application when — and only when — the GP
   actually set it (join-experience.tsx owns the state; the store validates 10–50 step 10 and
   refuses the rest; absent means undeclared, never defaulted). The condition is not captured
   by design: it rotates as an invitation and the GP never chooses one — the form's care areas
   are the chosen work. REMAINING: no console surface renders applications yet, so the declared
   mix has no reader; when an applications view is built, the mix renders as stated preference.
2. **Onboarding interview build-out (O22 items 2–4) — item 2 CLOSED by O30 (2026-08-18).**
   `/console/interview` is the working instrument: editable transcript (i:-prefixed interviewer
   turns are never read), live proposals from both readers, each carrying the doctor's sentence
   and the structured interview's OWN question, and often/sometimes/not-me recorded with the
   interviewer's name into the W226 draft store (`frequency` kept beside the review status).
   Item 3 CLOSED by O36 (2026-08-18): the gap sweep — every facet the transcript has not
   reached, rendered as the structured interview's own question with the same three-state
   record; the count falls as the doctor talks; an unanswered question is recorded nowhere.
   Item 4 CLOSED by O38 (2026-08-18): the reach report — patient-side silent sentences ride
   the W226 save beside `unread`, and the matching console renders the per-onboarding feed
   (latest save per clinician, two silences kept apart because they grow different cue lists).
   **DEBT CLOSED — the O22 loop is now standing infrastructure; what remains is Q1's ongoing
   review of what the feed surfaces, which is the year plan's work, not a debt.**
3. **iPhone speech: field verification.** O18's retry + honest copy + `?debug=1` shipped, but
   no confirmation yet from the actual failing device. FOUNDER: retry on the phone; if the
   banner shows, send the bracketed code. Build side: keep the raw-code path first-class in
   any speech change.
4. **Speech is en-AU only.** "Kind Hindi speaking" as a *query* works, but a person who wants
   to *speak* Hindi to the mic cannot — `recognition.lang = "en-AU"`. Unit: language picker
   or auto-follow of a detected language ask, within the same disclosure rules.
5. **Privacy policy is still titled "draft".** Deliberate while the product is a demo;
   FOUNDER decision to finalise wording before any real-patient launch (gates plan §4).
6. **Google Analytics is wired but dark.** `NEXT_PUBLIC_GA_ID` is unset in production.
   FOUNDER: set the env var in Vercel when tracking should start; nothing to build.
7. **px→rem migration** (O14 low-vision audit follow-up). FOUNDER accepted the risk note;
   still the right migration — schedule as a mechanical unit with visual-regression captures.
8. **MATCH-1/F9 reciprocity finding** stays open until Q3's reciprocal-matching work closes
   it in the latent-findings register, not just in prose.
9. **Vercel free-tier deploy quota** keeps blocking previews/production for hours at a time.
   FOUNDER: either upgrade the plan or accept batched deploys; the loop should batch pushes
   (one push per verified unit, no pixel-only pushes between) either way.
10. **Finder desktop composition** (build unit, from D1's reverted attempt): the ~520px shell
    is shared by every finder stage, so a real desktop layout needs the shell widened for all
    stages at once — its own unit, not a media query (rationale in globals.css).

## Explaining the fit, continuously (runs all year)

- O21 shipped provenance on the profile ("from your words: …"). Next increments, one per
  quarter: (Q1) unmatched asks named per-clinician, not just globally — **DONE, O51
  (2026-08-19)**: `missedAsks` partitions the reader's care/manner asks against the same
  `needsFor` read as the evidence, and the profile says "you also asked for X — not something
  they declare" in W193's declaration framing, capped at two, only beside existing evidence; (Q2) "what would
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
