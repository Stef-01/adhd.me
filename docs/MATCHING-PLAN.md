# Patient → clinician matching: options, choice, and the road out

> **REFERENCE.** Architecture options and the clinician-interview spec. It holds no units — consult it, do not execute it. Index: [`PLAN.md`](PLAN.md).

The finder's job is to take what somebody said, in their words, and put the GP who fits it in
front of them. This prices the ways of doing that, picks one for MVP, and says what replaces it
later and on what trigger. It also specifies the clinician interview, because **the interview is
the data acquisition step for the matcher** — thirty minutes with a GP has to leave the product
able to match them, and everything below is downstream of that being true.

Written against the constraints already in the tree, not around them.

---

## 1. The constraints, first, because they eliminate most of the option space

These are not preferences. Each is enforced somewhere in the tree and would have to be
deliberately unpicked, in public, to build the thing it forbids.

| # | Constraint | Where it lives | What it kills |
|---|---|---|---|
| C1 | **No free-text clinician bio.** Focus is `ScopeStatement[]`, linted by W114. | `src/directory/profile.ts` `REFUSED_PROFILE_FIELDS.bio` | Any design that embeds or LLM-reads a doctor's prose. **There is no prose.** |
| C2 | **No score, rating or ranking published about a clinician.** | `REFUSED_PROFILE_FIELDS.score`, `.rating` — "a score ranks clinicians against each other, which W83 already refused internally" | Showing match percentages. Ordering may exist; a published score may not. |
| C3 | **Explainability floor.** Every ordering decision renders its reason as one sentence from a closed vocabulary. | W213, `src/matching/explain.ts` | Learned-to-rank, collaborative filtering, any ranker that cannot say why in words a person recognises. |
| C4 | **Reason over the clinician's declared attributes, never infer the patient's clinical need.** | G7 / `docs/GATE-DOSSIER-Q17.md` | Anything that classifies the patient's symptoms. The finder is a preference matcher, not a triage tool. |
| C5 | **Declared, not checked.** NSW training and focus areas are what the clinician *says*, and every surface says so. | W193 | Inferring capability from anything other than a declaration. |
| C6 | **G6 gates publication.** `SHIPPED_DIRECTORY_PROFILES` is empty and pinned empty. | `src/directory/profile.ts` | Nothing here ships to the public directory without the Ahpra advertising review. The demo roster is the MVP surface. |

**C1 is the one that reframes the brief.** "Match patients to doctor bios" cannot be built as
stated, because the product deliberately does not hold a bio. What it holds is a set of
declarations, and the matcher's quality is therefore a function of **how good the declarations
are** — which is why the interview matters more than the algorithm.

---

## 2. The options

### A. Per-clinician hand-weighted keywords — *what ships today*

`rankClinicians` holds a `focusSignals` map keyed by clinician id: roughly 25 `[phrase, weight]`
pairs per doctor, hand-authored.

- **Explainable?** Yes, but the explanation is authored separately in `getPersonalizedMatch`, and
  the two lexicons have already drifted apart — they use different phrase lists for the same idea.
- **Scales?** No, and this is the wall. Every new clinician is an engineering task: somebody
  reads the doctor and invents weights for them. At fifty GPs it is not just impractical, it is a
  private editorial judgement about named people with no audit trail.
- **Verdict:** correct for two clinicians, wrong for the next ten. It is the thing to replace.

### B. Shared lexicon → closed facets → deterministic overlap — **chosen for MVP**

One lexicon, owned centrally, mapping phrases a patient might use onto a closed vocabulary of
facets. Clinicians declare the same facets. Score is weighted overlap of what was asked for
against what was declared.

- **Explainable?** Structurally. The reason sentence is composed from the same facets that
  produced the score, so the explanation cannot drift from the ranking — they are one computation.
- **Scales?** Linearly and for free. A new clinician declares facets in the interview and is
  immediately matchable. No per-doctor tuning exists to write or to get wrong.
- **Cost:** one lexicon to curate. That is a real cost, but it is *one* artifact reviewed once,
  not N private judgements about N doctors.
- **Weakness:** misses paraphrase the lexicon has not seen. Addressed by C and D below.

### C. B, plus a semantic normaliser over the *patient's* words — **the next step, not MVP**

Keep B's ranking exactly. Insert a step that maps unmatched patient phrasing onto the closed
facet vocabulary using sentence embeddings against facet exemplars, above a confidence floor.

- "I lose my thread when someone rushes me" → `unhurried`, without that sentence being in the
  lexicon. This is the "magically understands me" part of the brief.
- **Stays inside C3 and C4** because the model only ever normalises the *patient's own words* onto
  a vocabulary a human wrote. It never scores a clinician and never classifies a symptom. The
  ranking below it is unchanged and still renders its reason from the closed vocabulary.
- **Fails safe:** below the floor, the phrase is simply unmatched, which is exactly B's behaviour.
- Ship behind a flag with the lexicon path as the fallback, and log which facets were reached
  semantically so the lexicon can absorb them.

### D. LLM extraction of facets — *deferred, and not for MVP*

An LLM reads the patient's text and returns facets as structured output.

- Best paraphrase handling by a distance, and it could ask one clarifying question.
- **Deferred on three grounds, in order:** it puts patient health text through an external service
  (a privacy posture change that needs its own dossier and a change to the ADM notice); it is
  nondeterministic, and the suite pins exact first matches; and it is latency on the one
  interaction that must feel instant.
- Revisit when there is a reason to, with a privacy assessment first. Not a build decision.

### E. Learned-to-rank from outcomes (bookings, completions)

**Ruled out, and not by preference.** `docs/GATE-DOSSIER-Q17.md` prices this exact question and
the honest counter-argument it records — that refusing a learned order while shipping a heuristic
one draws the line on explainability rather than principle — is answered there: explainability
*is* the principle. A model that learns an order cannot render W213's one sentence. Additionally,
outcome data would rank clinicians against each other, which C2 refuses in public and W83 refused
internally.

### F. Two-sided / collaborative filtering ("patients like you chose…")

**Ruled out.** It is a testimonial with the names stripped off, it needs a volume of patient
outcome data the product does not have and should not want here, and it cannot explain itself.

---

## 3. The decision

**MVP: option B.** One shared lexicon, closed facets, deterministic overlap, explanation derived
from the same evidence as the ranking.

**Next: option C**, behind a flag, once the lexicon's miss rate is measurable.

The architecture that makes this a road rather than two rewrites:

```
    patient's own words
            │
    ┌───────▼────────┐   pluggable, may improve
    │  UNDERSTANDING │   B: lexicon   →   C: lexicon + embeddings   →   D: LLM
    └───────┬────────┘
            │  NeedSignal[]  — closed vocabulary, always
    ┌───────▼────────┐   fixed, deterministic, explainable
    │    RANKING     │   weighted facet overlap + hard preferences
    └───────┬────────┘
            │
      order + one-sentence reason
```

**Understanding is pluggable; ranking is not.** Every future improvement lands in the top box and
inherits the explainability of the bottom one. That is the whole design.

---

## 4. What ships in MVP

The interface does not change. Same single input, same results list, same profile. The work is
underneath.

1. **`src/matching/needs.ts`** — the one lexicon. `readNeeds(text) → NeedSignal[]`, where a
   `NeedSignal` is `{ facet, label, weight, matched }`. `label` is the closed-vocabulary phrase
   the reason sentence is built from.
2. **Facets** — `CareArea` (17, exists) plus `MannerTrait` (new, closed: how a clinician works,
   not what they treat) plus hard preferences (language, gender, telehealth-first, billing).
3. **`rankClinicians` derives from `readNeeds`.** `focusSignals` is deleted. No per-clinician
   weights remain anywhere.
4. **`getPersonalizedMatch` derives from the same call**, so explanation and ranking are provably
   the same evidence. A test asserts they cannot disagree.
5. **Tie-breaks stay arbitrary and disclosed** — the founder-behind rule stands.

**The manner vocabulary converged from two directions, which is worth recording.** This unit
introduced `MannerTrait` and a parallel session introduced `EIQuality` in
`src/demo/emotional-fit.ts` — the same idea, arrived at independently: declared interpersonal
qualities matched against expressed preferences, with the same G7 boundary argument. Theirs is
better grounded (the four MSCEIT branches plus the plain qualities that decide whether an ADHD
consult goes well) and carries a reader-facing label per quality, so it won. `MannerTrait` is now
an alias for it, `needs.ts` reads its cues rather than restating them, and `structured` was added
to it — a way of ORGANISING care rather than a way of being with somebody, and the one thing the
MSCEIT frame does not cover that a GP on the roster leads with. **Two overlapping manner lexicons
would have been the same defect this unit removed from the ranker.**

**The manner facet is the piece that was missing.** "I get rushed every time" is not a care area; it is
a fact about how a clinician works. Today only a hand-written weight on Dr Yadav's name expresses
it. As a declared facet it is something any clinician can state in thirty minutes, and it is
the half of "understands my needs" that clinical scope cannot carry.

---

## 5. The clinician interview: thirty minutes to matchable

**The rule that makes the interview designable: every question maps to exactly one facet the
matcher consumes.** No question that does not change a match, no facet with no question. That is
what keeps it to thirty minutes and what guarantees the output is sufficient.

### Budget

| Block | Minutes | Produces |
|---|---|---|
| Identity and registration | 4 | name, AHPRA number, practice, location |
| Scope: what you see often | 8 | `CareArea[]` — multi-select from 17, "often / sometimes / not me" |
| Manner: how you work | 6 | `MannerTrait[]` — the same shape |
| Access and practicalities | 6 | languages, telehealth-first, appointment length, billing, accessibility |
| Declarations | 4 | NSW/QLD training (declared), conflicts, publication agreement |
| Read-back and sign-off | 2 | the clinician confirms the profile in their own words |
| **Total** | **30** | a complete `ClinicianMatchProfile` |

### Design rules

- **Multi-select over free text, everywhere.** C1 is not an inconvenience to route around; a
  free-text answer would be an unlinted paragraph about a named clinician. The interview form is
  the enforcement point, not a linter downstream of it.
- **Three-state, not binary.** "Often / sometimes / not me" carries real information: a GP who
  *sometimes* sees co-occurring autism should rank below one who sees it often, and above one who
  does not see it at all. Binary throws that away.
- **Declared, and it says so.** Every screen that later renders a facet says the clinician
  declared it. The interview must state this to the clinician while they answer, so they know
  what they are signing.
- **Read-back is not a formality.** The last two minutes render the profile as the patient will
  see it and ask "is this you?". It is the cheapest possible check on the whole pipeline.
- **The interview is the only place facets are authored.** No admin editing weights afterwards.
  If a match is wrong the fix is a better question or a better lexicon, never a thumb on a scale
  for one doctor.

### What the interview must NOT collect

- A biography. (C1)
- Anything about a patient.
- Certificates or evidence of the NSW/QLD training — W193's reasoning holds: there is no public
  register to check it against, so holding evidence invites publishing it.
- Availability. That lives with the practice's booking platform (Healthengine), not here.

---

## 6. Sequencing

| Step | What | Gate |
|---|---|---|
| 1 | `needs.ts` lexicon + `MannerTrait`; rank and explain both derive from it; `focusSignals` deleted | — ships now |
| 2 | Interview instrument as data, with the facet map asserted complete in both directions | — ships now |
| 3 | Interview UI at `/clinicians/join`, reusing the existing form | needs a design pass, not a decision |
| 4 | Lexicon miss-rate logging on the finder | needs a privacy note: log the *facet reached*, never the patient's text |
| 5 | Semantic normaliser (option C) behind a flag | opens when step 4 has numbers |
| 6 | Public directory profiles | **G6** — Ahpra advertising review, founder |

Steps 1 and 2 are built in this unit. Steps 3–5 are engineering. Step 6 is not ours.

---

## 6a. Critical appraisal of what shipped, measured

The MVP was probed with seventeen first-person queries, half written deliberately **without**
lexicon vocabulary — "I can never get a word in", not "unhurried". A corpus written by reading the
lexicon measures only that somebody can copy a list.

**The first result was bad, and it is the finding that matters most:**

| | Before | After |
|---|---|---|
| Queries reaching **no** facet | **9/17 (53%)** | 3/16 (19%) |
| Unearned orders shown as rankings | **10/17 (59%)** | **0** |
| Paraphrase reaching no facet | 7/9 | 1/8 |

**Option B alone does not "understand" anybody.** It is a keyword matcher with good hygiene. Over
half of realistic phrasing reached nothing, and — worse — *the product still rendered a ranked
list in every one of those cases*, ordered by the founder-behind tie-break. Ordered by nothing,
presented as ordered by something. `"I think I might have ADHD"`, the likeliest sentence anybody
types, scored 12–12 and put one of two real doctors first for no reason. That is the same class of
defect as the fabricated `nextAvailable`: the reader spends trust on a signal that is not there.

**Three fixes shipped in response, in order of importance:**

1. **`matchQuality` — the finder says when the order is not earned.** `informed` / `tied` /
   `unmatched`, computed and surfaced in one line that only appears when it has something to
   correct. It is a fact about whether a comparison happened, not a confidence score, so it can be
   said in one sentence like every other reason. **This is the integrity fix and it would matter
   even if reach were perfect.**
2. **`unservedAsks` — a care area nobody declares is named as our gap.** Nine of seventeen areas
   are declared by neither GP, which is expected at a roster of two; saying nothing is what makes
   it a defect. Same posture as the Gold Coast answer: name the gap, put it on the directory,
   never let the reader conclude it is about them.
3. **The lexicon was widened against the measured misses**, not against imagination. Each new
   phrase family is one the probe proved unreachable.

**`src/matching/reach.test.ts` makes this a standing control.** The corpus and a ratchet ceiling
live in the suite, because a paraphrase lexicon regresses *silently* — every other test passes,
the ranking still works, and it quietly stops hearing anybody. The ceiling is to be lowered as
reach improves and never raised to make a red build green.

### What this changed about the roadmap, and how that turned out

**W221 concluded: "Option C is promoted from 'next' to required."** The argument was that the 19%
residual could not be curated away, because "my brain has never let me finish anything" misses the
cue "never finish anything" by three words and only normalisation fixes that class.

**The diagnosis was right and the prescription was wrong, which is worth leaving on the record
rather than quietly editing.** The failures were real and they were *mechanical* — insertion and
inflection — not semantic. What they needed was a competent sparse matcher, and what W221 had
shipped was `String.includes`. W221 stemmed the tokens and matched cues as an ordered subsequence
within a two-token window:

| | W221 | W221 |
|---|---|---|
| Hard corpus (paraphrase, inflection, insertion) | 3 misses / 10 | **0 / 10** |
| Soft corpus | 3 / 16 | **2 / 16**, both `"help"` and `"I don't know where to start"` |
| False positives on neutral queries | — | **0 / 9** |

The two remaining misses *should* miss: they express no need, and the product says so.

**So option C is back to "next", not "required", and the reason to reach for it has changed.** It
is no longer needed to fix a broken matcher. It would be for genuine synonymy — "can't focus" and
"my attention goes everywhere" share no stem and no order, and no curation reaches that. That is a
real limit and it is much further out than a 19% miss rate implied.

**What actually answered "does it understand me" was not a model.** It was W225: when the words do
not separate the roster, ask one question whose answer *would*. The commonest sentence in the
product — "I think I might have ADHD" — used to end at "this is not a ranking". It now offers three
questions, and one tap changes who is first. A clarifier is worth more here than a better
embedding, because it makes the reader's own next sentence the thing that resolves the ambiguity,
and the finder can still say "you said this".

**Where this stands, honestly:** explainable, scalable, truthful about its own confidence, no
longer defeated by ordinary English, and still not perceptive. The next real gain is synonymy, and
the next real risk is a roster large enough that three clarifying questions is no longer enough to
separate it.


---

## 7. What this plan deliberately does not do

- It does not rank patients. That is `docs/GATE-DOSSIER-Q17.md`'s question and it stays shut.
- It does not publish a score. Order is expressed as order, and the reason is a sentence.
- It does not infer anything clinical from what the patient typed. Every facet it reads is a
  *preference about care*, and where a phrase could be read either way the lexicon takes the
  preference reading.
- It does not claim the matching is good. It claims it is explainable, scalable and honest about
  being built from declarations. Whether it puts the right GP first is measured in step 4.

---

## 9. What shipped, end to end

The pipeline the plan described now runs from a conversation to a ranked list. Each piece is a
commit with its reasoning in the message.

| Unit | What it does | Where |
|---|---|---|
| W221 | Facets, weights, the reason a patient reads; `matchQuality` so an unearned order is never shown as a ranking; `unservedAsks` so a gap in the listing is named as ours | `src/matching/needs.ts`, `src/demo/clinicians.ts` |
| W221 | Stemmed, ordered-subsequence cue matching. Contractions preserved — splitting on the apostrophe had been destroying the commonest negator in English for both the patient matcher and the transcript reader | `src/matching/read.ts` |
| W221 | A 30-minute transcript read into proposals, each carrying the clinician's own sentence. Reads only their turns; refuses to propose from a denial; keeps what it could not read as the lexicon's to-do list | `src/onboarding/transcript.ts` |
| W221 | The console: audit totals pinned against the ranker, roster tags, the assembled bio | `app/console/matching/` |
| W224 | The review editor. Facets are editable in both directions; the bio is the read-out and cannot be typed into | `app/console/matching/background-editor.tsx` |
| W225 | One question when the words did not separate anybody, chosen only if the answer reorders the roster | `src/matching/clarify.ts` |
| W226 | Persistence. Append-only, latest-wins, every save kept as the audit trail; refuses an accepted facet that names nobody | `src/onboarding/background-store.ts` |
| W227 | The save action, closing the loop from interview to gate | `app/console/matching/actions.ts` |

**The 30-minute claim, checked against what exists.** An interview using the instrument produces a
transcript; the transcript produces proposals with quotes; a reviewer accepts, rejects and adds in
one pass; the clinician reads the assembled bio back and confirms; the save records who decided
what. That is one sitting, and the output is durable and auditable.

**What it does not yet do:** publish. `SHIPPED_DIRECTORY_PROFILES` is empty behind founder gate G6,
and nothing in this pipeline can set a published status — there is no such status to set. What the
pipeline produces is the evidence that gate would be opened on.

### The overhaul against the field (O1–O8, 2026-08-18)

`docs/MATCHING-APPRAISAL.md` held this pipeline against the published matching industry —
dating apps, the reciprocal-recommendation literature, the NRMP — and its ten findings were
executed as `docs/MATCHING-OVERHAUL-PLAN.md`, all units done, on the appraisal's branch.
The delta table in the appraisal's §7 maps every finding to its disposition and commit. What
changed in this plan's terms:

| Unit | What it does | Where |
|---|---|---|
| O1 | Languages are scored, not just printed: one `needsFor()` entry point for ranking, quality, evidence and audit; the substring language matcher is gone | `src/matching/needs.ts` (`languageNeeds`), `src/demo/clinicians.ts` |
| O2 | Breadth has a price: rarity discount over roster declarations, three-state declarations (`careAreasSometimes`, half weight), breadth visible in the console | `src/demo/clinicians.ts`, `src/onboarding/background.ts` |
| O3 | Ties visible at every boundary: `rankBands`, `topTieNote`, geo comparability = exact score tie | `src/demo/clinicians.ts`, `app/care-finder.tsx` |
| O4 | Declared capacity breaks ties and says so on the card (`CLOSED_BOOKS_COPY`) | `src/demo/clinicians.ts`, `app/care-finder.tsx` |
| O5 | Preference clarifiers (woman GP / telehealth / bulk billing) and the stated-importance lift — W225's question set finally covers what separates rosters hardest | `src/matching/clarify.ts`, `src/matching/needs.ts` (`holdsPreference`) |
| O6 | The W214 greedy's optimality gap is measured against a test-only maximum-matching oracle and pinned; MATCH-2 tripwires patient-facing availability | `src/matching/match.oracle.test.ts`, `src/quality/latent-findings.ts` |
| O7 | The reader pinned against itself — self-reach and clarifier-answer pins (which caught three live lexicon defects), explicit cue claiming, a clause boundary no cue can cross | `src/matching/read.ts`, `src/matching/needs.ts`, `src/matching/reach.test.ts` |
| O8 | The review gate: /code-review (8 findings, fixed and pinned) and /security-review (none) over the whole diff | throughout |

**What this changed about §2's options:** nothing structural — option B remains the shipped
architecture, and the appraisal's verdict was that B is RECON's content-based core with an
explanation layer the field does not have. The overhaul closed the gaps *within* B (one
pipeline, normalisation, tie honesty, reciprocity-as-capacity, user-stated importance) rather
than reaching for C/D/E/F, and affirmed the refusals: Tinder retired the Elo that C2/W83
refused, and the fairness literature now recommends against the collaborative filtering that
option F declined. Option C's trigger is unchanged: measured synonymy misses, not fashion.
