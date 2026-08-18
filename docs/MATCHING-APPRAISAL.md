# Matching architecture: critical appraisal against the established field

A review of every matching surface in the tree, appraised against the published techniques the
matching industry actually runs on — dating apps foremost, because they are the largest deployed
two-sided preference matchers in existence — and against the open-source implementations of the
underlying algorithms. Written as a review document: it changes no code, and where it finds a
defect it names the file and line rather than fixing it, because several findings touch decisions
(weights, capacity, published copy) that are not a reviewer's to make unilaterally.

Companion to `docs/MATCHING-PLAN.md` §6a, which appraised the finder against its own probe corpus.
This document appraises the *architecture* against the outside world.

---

## 1. What the tree actually contains: three matchers, not one

Any appraisal has to start by noticing that "the matching algorithm" is three separate systems
with different jobs, different constraints, and different maturity:

| # | System | Files | Job | Shape |
|---|---|---|---|---|
| M1 | **Patient → clinician finder** | `src/matching/needs.ts`, `read.ts`, `clarify.ts`; `src/demo/clinicians.ts` (`rankClinicians`, `scoreAgainst`, `matchQuality`, `rankCliniciansNear`) | Take a patient's own words, rank the roster | Sparse lexical reader → closed facets → weighted overlap against declarations |
| M2 | **Candidate ↔ slot assignment** | `src/matching/match.ts`, `explain.ts` | Assign offered appointments to candidates | One-sided greedy bipartite matching, fewest-options-first, behind an explainability floor |
| M3 | **Invitation pool ranking** | `src/engine/pool.ts` (`rankCandidates`), `src/registers/ranking.ts` | Decide who is contacted first when capacity opens | Fixed comparator: chronic-care first, longest-overdue, gap-aware partition |

In dating-app terms: M1 is the *recommender* (who do we show you), M2 is the *market-clearing
mechanism* (who actually gets the scarce thing), and M3 is the *feed eligibility ranker* (who gets
surfaced at all). Dating platforms treat these as different disciplines with different literatures
— recommendation, matching-market design, and feed ranking — and the tree, correctly, has kept
them separate too. That separation is the architecture's single strongest property and it should
be defended: Tinder's original sin was collapsing all three into one desirability score.

---

## 2. Where the field is, briefly, so the comparison is against reality

**OkCupid** is the closest published relative of M1. Its match percentage is weighted
question-overlap: each user answers questions, states the answers they will accept, and rates the
question's *importance* (irrelevant = 0, a little = 1, somewhat = 10, very = 50…). Satisfaction is
computed in both directions and combined with a geometric mean, precisely so that mutual mediocrity
beats one-sided perfection ([HackerEarth breakdown](https://www.hackerearth.com/practice/notes/okcupids-matching-algorithm-1/),
[AMS: the math behind online dating](https://blogs.ams.org/mathgradblog/2016/06/08/okcupid-math-online-dating/)).
Three ideas matter here: **user-stated importance**, **bidirectional satisfaction**, and
**normalisation** — the score is a percentage of what could have been satisfied, not a raw sum.

**Hinge** ("Most Compatible") runs the **Gale–Shapley deferred-acceptance algorithm** over
learned mutual-preference estimates ([TechCrunch](https://techcrunch.com/2018/07/11/hinge-employs-new-algorithm-to-find-your-most-compatible-match-for-you/),
[9to5Mac](https://9to5mac.com/2018/07/12/ai-dating-app-hinge/)). Gale–Shapley is the 1962
stable-marriage mechanism; its industrial-strength descendant is **Roth–Peranson**, which has run
the US **National Resident Matching Program** since 1997 — the canonical *healthcare* deployment
of matching theory, assigning ~40k doctors to hospital programs a year with capacity constraints
(the hospitals/residents variant). Reference implementations are commodity:
[daffidwilde/matching](https://pypi.org/project/matching/) (JOSS-published Python library covering
stable marriage, hospital–resident, stable roommates),
[vishnuravi/stablematch](https://github.com/vishnuravi/stablematch),
[jonathandandries/hospitals-residents](https://github.com/jonathandandries/hospitals-residents),
[lovasoa/gale-shapley-rs](https://github.com/lovasoa/gale-shapley-rs). The properties that made
deferred acceptance the standard: **stability** (no doctor–hospital pair would both rather have
each other than what they got) and **strategyproofness for the proposing side** (truthfully
stating your preferences is optimal — you cannot game the mechanism by lying about what you want).

**Tinder** ran an **Elo desirability score** — every profile rated by who swiped on it — and
retired it in 2019 after it produced a rigid attractiveness hierarchy that new and average users
could not climb out of ([Global Dating Insights](https://www.globaldatinginsights.com/featured/tinder-changes-algorithms-and-removes-elo-scores/),
[Tinder's own FAQ](https://www.help.tinder.com/hc/en-us/articles/7606685697037-Powering-Tinder-The-Method-Behind-Our-Matching)).
The current system is behavioural/recsys-driven and deliberately unpublished.

**The reciprocal-recommendation literature** (dating-app academia) starts with **RECON**
([Pizzato et al.](https://www.researchgate.net/publication/221140972_RECON_A_reciprocal_recommender_for_online_dating)),
a *content-based* reciprocal recommender: match users on declared categorical attributes, in both
directions, which is also the standard answer to cold start — a new user is matchable from their
declarations alone, before any behavioural data exists. Later work went behavioural and two-sided
([matching-theory-based recsys at RecSys '22](https://dl.acm.org/doi/abs/10.1145/3523227.3547406),
[fair reciprocal recommendation in matching markets](https://arxiv.org/pdf/2409.00720)), and a
consistent finding is that reciprocal settings need **congestion control**: recommending everyone
the same most-desirable counterpart makes the market worse for both sides.

**Conversational preference elicitation** is the literature behind M1's clarifier: ask the
attribute question whose answer most changes the recommendation
([dynamic elicitation strategies](https://arxiv.org/html/2607.06765),
[usage-related questions, ACM TORS](https://dl.acm.org/doi/full/10.1145/3629981)).

**Open-source dating apps** exist ([Duolicious](https://en.wikipedia.org/wiki/Duolicious) — AGPL,
Python/TypeScript, OkCupid-style question matching;
[goktugercedogan/dating-app-microservices](https://github.com/goktugercedogan/dating-app-microservices);
[topics/dating-app](https://github.com/topics/dating-app)) but are architecturally thin on the
matching itself — mutual-like detection over swipe events, not preference matching. The serious
reference material is the matching-market libraries and the reciprocal-recsys papers above, and
this review leans on those.

**And for M2**, the algorithmic baseline is **maximum bipartite matching** — Hopcroft–Karp,
`O(E√V)`, shipped in [NetworkX](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.bipartite.matching.hopcroft_karp_matching.html)
and [SciPy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.maximum_bipartite_matching.html)
(NetworkX seeds Hopcroft–Karp *with a greedy pass* — the tree's greedy is literally the standard
algorithm's warm-up phase).

---

## 3. The verdict on the architecture, before the findings

**The chosen shape — declared facets, deterministic overlap, closed-vocabulary explanation — is
not a naive design; it is RECON's content-based reciprocal core with the reciprocity removed and
an explanation layer the literature does not have.** The pipeline split in `MATCHING-PLAN.md`
(understanding pluggable, ranking fixed) is the same split hybrid-retrieval systems use, and the
decision to fix the mechanical sparse matcher (W222) before reaching for embeddings is the
correct order — the hybrid-retrieval literature says the same. The refusals hold up outside this
codebase too:

- **Refusing a learned desirability ordering (C2/W83) is vindicated by Tinder's Elo retirement.**
  The industry's biggest player built exactly the thing W83 refused, watched it produce a frozen
  hierarchy, and publicly abandoned it. The tree refused it for explainability and fairness
  reasons; Tinder abandoned it for product reasons. Same conclusion, independent derivations.
- **Refusing collaborative filtering (option F) is what the fairness literature now recommends**
  for matching markets in sensitive domains — behavioural recommenders in reciprocal settings
  concentrate exposure and cannot explain themselves
  ([fair reciprocal recommendation](https://arxiv.org/pdf/2409.00720)).
- **The clarifier (W225) is exactly what the elicitation literature prescribes**: ask the
  attribute question with the highest expected order change. Ordering candidates by
  evenness-of-split over the roster *is* maximum information gain for binary attributes. This is
  the most modern component in the tree.
- **The explainability floor (W213) has no published equal.** The reciprocal-recsys explanation
  work ([explanations in reciprocal environments](https://arxiv.org/pdf/1807.01227)) generates
  post-hoc explanations of opaque scores; W213 makes the explanation and the score the same
  computation and makes unexplained decisions unrepresentable. That is ahead of the field, not
  behind it.

The architecture's real gaps, found by holding it against the field, are below — ordered by how
much they matter, each with the borrowed technique that addresses it.

---

## 4. Findings

### F1 — The score is an unnormalised sum, and nothing defends against declaration inflation

`scoreAgainst` (`src/demo/clinicians.ts:297`) is `Σ weight` over asked-and-declared facets. A
clinician's score is monotone in what they declare: **declaring more facets can only ever raise
your rank, for every query, forever.** At a roster of two, with founder-relayed declarations,
this is invisible. At fifty self-declaring GPs it is the dominant strategy — tick every box in
the thirty-minute interview and rank first for everything. The interview's read-back is the only
control, and it checks accuracy, not restraint.

OkCupid solved this structurally: the match is a **percentage of possible satisfaction**, not a
raw sum, and the geometric mean punishes one-sided breadth. The IR field solved it with IDF:
a term everybody has separates nobody. Both fixes are available without breaching C2 or C3:

- **Normalise or discount by commonality, not by clinician.** A facet declared by most of the
  roster contributes less *separation* than a rare one — "few of the GPs listed say they do
  this" is a sentence a practice manager can read, so an IDF-style discount stays inside W213's
  floor. Note `clarifiers()` already computes exactly this quantity (`heldBy` /
  `roster.length`, `src/matching/clarify.ts`) for questions; the ranker just doesn't use it.
- **Keep the interview's three-state answer** ("often / sometimes / not me",
  `MATCHING-PLAN.md` §5) **in the type.** `Clinician.careAreas` is a flat array today; the
  planned distinction between often and sometimes is the honest cap on inflation ("sometimes"
  should cost the declarer something relative to "often"), and it is currently unrepresentable.
- **Surface declaration breadth** on the profile ("declares 15 of 17 areas") so inflation is at
  least visible while undiscounted.

### F2 — Language evidence is shown but never ranked on: the "one computation" guarantee has a hole

`matchEvidence` (`src/demo/clinicians.ts:412`) is documented as "ONE COMPUTATION, TWO CONSUMERS
… the page cannot rank somebody first for a reason it then fails to print." But it appends
`languageAsked()` signals that `rankClinicians` → `scoreAgainst` never sees, because the ranking
reads `readNeeds(query)` alone (`src/demo/clinicians.ts:277`). Consequences, both real:

- Somebody who asks only "a GP who speaks Tamil" gets `matchQuality === "unmatched"` ("this is
  everyone we list rather than an order"), an unranked roster — and a Tamil-speaking clinician's
  card printing "Tamil-speaking" as match evidence. The page explains a ranking that did not
  happen. This is the *inverse* of the drift the module removed (ranked for a reason not given:
  now given a reason not ranked on), and the needs-test asserts only the original direction.
- `languageAsked` matches with `query.toLowerCase().includes(...)`
  (`src/demo/clinicians.ts:434`) — raw substring, the exact mechanism W222 tore out of the
  lexicon for cause. It cannot see "Tamil-speaking GP please" vs "tamil" inflections the way the
  tokenised path can (it happens to work), but more importantly it is a second, weaker matching
  pipeline living beside the one the tree just unified.

Fix direction: lift language into the `NeedSignal` path (a `pref`-like dynamic facet produced by
`readNeeds` given the roster's language set, or a second stage that `rankClinicians` and
`matchEvidence` both consume), so the unity property is restored and the substring matcher goes.

### F3 — `matchQuality` is roster-global, so "informed" can dress an arbitrary top-of-list

`matchQuality` (`src/demo/clinicians.ts:376`) returns `informed` when *any* two clinicians'
scores differ. On a sixteen-entry roster, "one GP scored 24 and fifteen scored 0" is `informed`
— and positions 2–16 are then an arbitrary founder-behind/file-order tie presented under a
banner that only disclaims `tied`/`unmatched`. The integrity fix (say when the order is not
earned) is right; its granularity is one roster too coarse. OkCupid's answer is per-pair
percentages — every adjacency's tie is visible. The closed-vocabulary equivalent: compute the
quality *of the boundary the reader acts on* (is the #1 separated from #2? is the shown-above-
the-fold set separated from below?), or render rank bands ("these four answered equally") rather
than a single roster-level verdict. The banded rendering also repairs F4.

### F4 — The geo band is measured in rank positions over ties it cannot see

`rankCliniciansNear` (`src/demo/clinicians.ts:443`) lets distance reorder only within
`COMPARABLE_FIT_BAND = 4` *rank positions*. But rank positions inside a score tie are arbitrary
(stable sort = file order, after the founder rule). On an `unmatched` query with an origin —
"a GP near Parramatta" — all sixteen score 0, fit ranks 1–16 are file order, and the nearest
clinician at file position 13 cannot rise past the band even though *no preference information
exists at all*. The band exists to stop distance overriding fit; here it protects an ordering
that isn't fit. The band should be defined over **score difference** (comparable fit = equal or
near-equal score), not index difference — at which point an unmatched query becomes fully
distance-sortable, which is exactly what the reader asked for, and an informed query keeps its
preference order. Dating apps get this right by construction: distance is a hard ranking input
*within* preference-feasible candidates (Tinder's stated primary factors are age, gender,
distance), never a post-hoc shuffle bounded by list position.

### F5 — The finder is one-sided: capacity and acceptance never touch the rank

The central lesson of every reciprocal-recommendation paper since RECON: **in a two-sided
market, recommending by one side's preference alone fails both sides.** A match must be feasible
for the counterparty, and exposure must respect the counterparty's capacity — otherwise you
congest the desirable few (the failure Hinge's Gale–Shapley move and the fairness literature
both address). In this tree, `acceptingNewPatients` exists on the record, is filterable in the
directory (`src/directory/search.ts:100`), and is *invisible to `rankClinicians`*: a perfect-fit
GP whose books are closed ranks #1 with nothing on the card saying the match is unactionable.
That is the dating-app anti-pattern of recommending profiles that never swipe back.

This does not need learned mutual-preference estimation (C3/C4 forbid it, and G7 forbids
clinician preferences *about patients*). The clinician side of reciprocity here is **declared
capacity**, which is already data: at minimum, `acceptingNewPatients === false` should cost rank
or annotate the card ("their books are closed — shown because they fit what you asked"); when
M2's slot capacity becomes live, expected wait is the honest reciprocal signal. Both are facts,
renderable in one sentence, inside the floor.

### F6 — Central lexicon weights are the product's guess at the reader's priorities; OkCupid asks

The weights in `needs.ts` (30/20/12, honestly documented as coarse) encode *how much any asker
cares about titration vs sleep* — a judgement the product makes identically for every reader.
OkCupid's deepest design insight is that **importance is the user's datum, not the platform's**:
the same question is worth 0 to one user and 50 to another, stated, not inferred. The tree
already has the mechanism to collect this without a form: the clarifier. An answered clarifier
is the reader *saying* a facet matters — today the answer re-enters `readNeeds` and earns the
same lexicon weight as an unprompted mention. Letting a confirmed facet carry a stated-importance
lift ("you told us this was the main thing") keeps every sentence sayable — the evidence is
still the reader's own words — and moves the one genuinely indefensible number in M1 (a central
guess at someone else's priorities) toward the reader who owns it. The clarifier could equally
ask importance directly on tap ("is this the main thing, or one of several?"), which is the
attribute-elicitation pattern from the conversational-recsys literature.

### F7 — Clarifiers never ask about the preferences that separate the roster hardest

`clarifiers()` builds its candidate set from `declaredKeys` = care ∪ manner
(`src/matching/clarify.ts`). Access preferences — woman GP, telehealth-first, bulk billing —
are absent, yet they are hard filters/strong lifts with high roster variance: "do you want a
woman GP" splits any mixed roster and is the single most-stated preference in real directory
search. The elicitation principle the module itself states ("a question earns its place only if
the answer changes the order") selects *for* these questions; the implementation excludes them
by construction. Extending the candidate set to preference facets (with `heldBy` computed from
gender/telehealth/billing data) is mechanical.

### F8 — M2's greedy is defensible, but its distance from optimal is asserted, not measured — and its one gameable edge is unstated

`matchSlots` (`src/matching/match.ts`) refuses augmenting paths because a reassignment chain
cannot be one sentence. That trade is legitimate — but the *price* is currently a claim in a
comment ("would sometimes offer one more appointment"). The field's baseline makes the price
measurable for free: Hopcroft–Karp is ~40 lines with no dependency (or a test-only port of the
[NetworkX implementation](https://networkx.org/documentation/stable/_modules/networkx/algorithms/bipartite/matching.html),
whose first phase *is* this greedy), and a property test can assert
`greedy_size ≥ maximum_size − k` over generated instances, with the observed gap logged. If the
gap is rare and small, the explainability trade is cheap and now evidenced; if it is common, the
copy for `fewer_slots_than_candidates` is quietly overstating scarcity, which is a truthfulness
problem this tree cares about. Measure it in the suite; keep the greedy in production.

Second, the mechanism-design point the NRMP literature would raise immediately:
**fewest-options-first makes narrow availability an advantage.** A candidate whose recorded
availability admits one slot outranks everyone for that slot. Deferred acceptance was adopted by
the NRMP precisely because truth-telling must be the best strategy for the proposing side; this
mechanism rewards (recorded) scarcity instead. Today availability is recorded by practice staff,
never by the patient, so the strategic surface is minimal — but that assumption is what makes
the mechanism safe, it is stated nowhere, and a future patient-facing "set your availability"
screen would silently turn it into an incentive to under-declare. Worth a sentence in the module
note and a latent-finding row with exactly that trigger (the W210 pattern the tree already has).

Third, when slots stop being interchangeable (clinician attached, patient continuity with
`usualClinicianId`), one-sided greedy stops being adequate and **hospitals/residents deferred
acceptance is the drop-in successor** — capacity-aware, stable, and with a per-person
explanation that fits the floor's shape ("every slot you preferred went to someone who…"). The
reference implementations to borrow from at that point:
[daffidwilde/matching](https://pypi.org/project/matching/) (`HospitalResident`),
[vishnuravi/stablematch](https://github.com/vishnuravi/stablematch). Not needed now; named so
the successor is chosen deliberately rather than grown.

### F9 — M3 is the known contradiction, and this review's only note is that it is also the field's oldest lesson

`rankCandidates` (`src/engine/pool.ts:25`) ordering by `chronicCare` then overdue-time against
W201's published "no ordering of patients by need" is recorded (MATCH-1), priced (W216), and the
founder's to resolve — not relitigated here. One observation from the comparison: this is
structurally Tinder's Elo — a single fixed global priority score over people, invisible to them,
compounding (the longer overdue you are, the higher you rank, the sooner you're invited — or the
inverse for whoever the comparator disfavours). The industry verdict on that shape is that it was
retired even where the stakes were dating. Whichever way MATCH-1 resolves, the mechanism M2
already demonstrates (position from operational facts only, ties broken arbitrarily and said so)
is the shape the field converged on for defensible ordering.

### F10 — Smaller notes, recorded so they are not rediscovered

- **`stem()` conflations are untested as properties** (`src/matching/read.ts:64`): the bespoke
  stemmer is the right call vs Porter for this vocabulary size, but pairs like
  "assessed"→`asses` vs "assessment"→`assessment` mean cue/word pairs that share a root can
  still miss. A table test pinning stem behaviour over the lexicon's own vocabulary (every
  phrase token, asserted stable) would catch a stemmer edit silently unhooking cues.
- **`MAX_GAP` windows can still bridge clauses** (`read.ts:107`): "heart … safe" was caught and
  fixed at gap 3→2; sentence-boundary tokens (".", "but") are deleted before matching, so a
  two-content-token bridge across a full stop remains representable. Cheap fix if it ever
  probes true: keep a sentence-break marker token that no cue can cross.
- **`clarifiers` count `heldBy` over the full roster while the reader sees a filtered list**
  (`clarify.ts:154` vs `care-finder.tsx:708`): passed `matches` (currently the whole roster) —
  fine today, silently wrong the day the finder filters before clarifying.
- **`reach.test.ts` ratchet is healthy** and is the control the lexicon needs; extend the corpus
  with clarifier-answer sentences (they are re-read by `readNeeds` and must keep reaching their
  facet — today nothing pins e.g. `"my dose needs titration and follow-up"` → `care:titration`,
  so a lexicon edit could orphan a clarifier answer invisibly).

---

## 5. What to borrow, in priority order

1. **Reciprocity-as-capacity (F5)** — the one structural idea dating apps exist to teach.
   Declared capacity into the finder's rank or card copy. Small, honest, inside every constraint.
2. **Normalisation against declaration inflation (F1)** — OkCupid's percentage-of-possible /
   IDF's rarity discount, before the roster grows past a handful. This is the finding with a
   deadline: it is invisible at 2 GPs and load-bearing at 20.
3. **Restore the one-computation guarantee for languages (F2)** and band-by-score for geo (F4),
   plus top-separation `matchQuality` (F3) — three faces of the same repair: ties must be
   visible wherever they are, not only roster-globally.
4. **User-stated importance via the clarifier (F6, F7)** — OkCupid's importance weights,
   collected conversationally; extend clarifier candidates to preference facets.
5. **Hopcroft–Karp as a test oracle for M2 (F8)** — measure the greedy's optimality gap; state
   the narrow-availability incentive and its trigger.
6. **Hospitals/residents deferred acceptance as M2's named successor (F8)** — when slots gain
   clinician identity, adopt the NRMP mechanism, not a wider greedy.

What *not* to borrow, affirmed after looking: Elo/desirability scores (retired by their
inventor's market), behavioural collaborative filtering (unfair and unexplainable in matching
markets), learned mutual-preference estimation (C3/C4/G7 forbid it and the product's trust story
is better without it), and embeddings-before-measurement (the W222 result — mechanical fixes
first — matches the hybrid-retrieval field's own ordering; option C's trigger stays "measured
synonymy misses", not fashion).

---

## 6. Sources

- OkCupid algorithm: [HackerEarth](https://www.hackerearth.com/practice/notes/okcupids-matching-algorithm-1/) · [AMS blog](https://blogs.ams.org/mathgradblog/2016/06/08/okcupid-math-online-dating/) · [JSTOR Daily critique](https://daily.jstor.org/dont-fall-in-love-okcupid/)
- Hinge / Gale–Shapley: [TechCrunch](https://techcrunch.com/2018/07/11/hinge-employs-new-algorithm-to-find-your-most-compatible-match-for-you/) · [9to5Mac](https://9to5mac.com/2018/07/12/ai-dating-app-hinge/)
- Tinder Elo retirement: [Global Dating Insights](https://www.globaldatinginsights.com/featured/tinder-changes-algorithms-and-removes-elo-scores/) · [Tinder FAQ](https://www.help.tinder.com/hc/en-us/articles/7606685697037-Powering-Tinder-The-Method-Behind-Our-Matching)
- Reciprocal recommenders: [RECON (Pizzato et al.)](https://www.researchgate.net/publication/221140972_RECON_A_reciprocal_recommender_for_online_dating) · [Matching-theory recsys, RecSys '22](https://dl.acm.org/doi/abs/10.1145/3523227.3547406) · [Fair reciprocal recommendation](https://arxiv.org/pdf/2409.00720) · [Explanations in reciprocal environments](https://arxiv.org/pdf/1807.01227)
- Preference elicitation: [Dynamic elicitation strategies](https://arxiv.org/html/2607.06765) · [Usage-related questions, ACM TORS](https://dl.acm.org/doi/full/10.1145/3629981)
- Matching-market implementations: [daffidwilde/matching (PyPI/JOSS)](https://pypi.org/project/matching/) · [vishnuravi/stablematch](https://github.com/vishnuravi/stablematch) · [jonathandandries/hospitals-residents](https://github.com/jonathandandries/hospitals-residents) · [lovasoa/gale-shapley-rs](https://github.com/lovasoa/gale-shapley-rs)
- Bipartite matching: [NetworkX hopcroft_karp_matching](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.bipartite.matching.hopcroft_karp_matching.html) · [SciPy maximum_bipartite_matching](https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.maximum_bipartite_matching.html)
- Open-source dating apps: [Duolicious](https://en.wikipedia.org/wiki/Duolicious) · [dating-app-microservices](https://github.com/goktugercedogan/dating-app-microservices) · [github.com/topics/dating-app](https://github.com/topics/dating-app)
- Patient–provider matching research: [Assortment optimisation for patient–provider matching](https://arxiv.org/html/2502.10353)

---

## 7. Delta — what the overhaul shipped against each finding (O1–O8, 2026-08-18)

Executed on `claude/matching-algorithm-review-wy2z5f` per `docs/MATCHING-OVERHAUL-PLAN.md`.
Commit hashes are in that plan's status ledger.

| Finding | Disposition | Where |
|---|---|---|
| F1 | **Fixed** — rarity discount `(N−heldBy+1)/N` in `needsFor`; three-state declaration (`careAreasSometimes`, half weight); breadth in the console audit | O2 |
| F2 | **Fixed** — `{kind:"language"}` facet via the tokenise-and-stem pipeline; `needsFor` is the one entry point for ranking, quality, evidence and audit; substring matcher deleted | O1 |
| F3 | **Fixed** — `rankBands` (exact-score groups) + `topTieNote` at the boundary the reader acts on; the fold never cuts a tied band | O3, O8 |
| F4 | **Fixed** — comparable fit = exact score tie; unmatched+origin is fully distance-sorted; reorder is structural (positional swap within ties), not a pairwise comparator | O3, O8 |
| F5 | **Fixed** — capacity breaks ties (never scores, never filters); `CLOSED_BOOKS_COPY` on row and profile; capacity before kilometres inside a tie | O4 |
| F6 | **Fixed** — clarifier-confirmed facets carry 1.5× (marker detection on our own appended answer sentences) | O5 |
| F7 | **Fixed** — `holdsPreference` in one place; `PREF_PROMPTS` for woman-GP / telehealth / bulk-billing; a preference nobody holds is never asked | O5 |
| F8 | **Measured & tripwired** — test-only Kuhn oracle, gap pinned (≤1 slot, ≤10% of a fixed 400-instance corpus); MATCH-2 latent finding fails the build if `availableSlotIds` reaches `app/`; deferred acceptance named as successor | O6 |
| F9 | **Untouched by design** — MATCH-1 remains the founder's decision; no unit modified `src/engine/pool.ts` | — |
| F10 | **Fixed, and the pins found three live defects** — self-reach pin (caught the degenerate "a plan i can" cue and the all-stopword "in and out"), clarifier-answer pin (caught the structured answer landing on the wrong facet), explicit first-claim dedup ("overwhelmed"), clause-boundary token, stemmer edge recorded | O7 |

The review pass (O8) ran `/code-review` at high effort (eight findings, all fixed: roster
threading, float-stable scores, comparator transitivity, `careAreasSometimes` completeness,
breadth double-count, render-time recompute, fold-vs-band) and `/security-review` (no findings).
