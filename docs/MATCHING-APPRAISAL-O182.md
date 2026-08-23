# The matching system, appraised — O182 (2026-08-22)

> **REFERENCE, not a schedule.** Findings F1–F10 and the founder gates; Q-M in [`MATCHING-YEAR-PLAN.md`](MATCHING-YEAR-PLAN.md) is what schedules them. Index: [`PLAN.md`](PLAN.md).

**Commissioned by the founder:** "an extremely thorough critical appraisal on the matching system,
and advance it so that it is actually much more effective."

**Method.** The pipeline was read end to end (`readNeeds` → `needsFor` → `scoreAgainst` →
`rankClinicians` → `matchEvidence` → `matchQuality` → `clarifiers`), every claim in this document is
either a measurement run against the tree or a quotation from it, and five independent appraisals
were run under deliberately distorted frames — regulator, mechanism design, information retrieval,
the patient at 11pm, and strict-minimalist — with no shared context between them, then reconciled.
Where two frames disagree, both are recorded and the disagreement is named. Where a frame's
recommendation is refused, the refusal is argued rather than omitted.

**The one-sentence verdict.** The pipeline's *structure* is unusually good — one closed vocabulary,
one evidence computation feeding both the ranking and the explanation, honest non-rankings, and a
refusal to author clinical claims — and its *arithmetic* has three defects that all have the same
shape: **the same idea is computed differently in different places, and the gap between the
computations is where the harm lives.**

---

## Part 1 — What is already right, and must not be lost

Recorded first because an appraisal that only lists faults invites a rewrite, and a rewrite here
would cost more than it bought.

1. **One computation, two consumers.** `matchEvidence` feeds the ranking and the explanation, so a
   clinician cannot be ranked for a reason the page then declines to give. Most directories cannot
   say this.
2. **The closed vocabulary.** Every point of score is a facet with a label a patient can read
   (W213). This is what makes every finding below *arguable* rather than a matter of taste.
3. **Honest non-rankings.** `matchQuality` distinguishes "we could not read you" (`unmatched`),
   "we read you and nobody listed answers it" (`unserved`), and "we read you and they are equal"
   (`tied`). Very few products will say any of these.
4. **No per-clinician coefficients.** A new GP is added by declaring facets, never by an engineer
   inventing weights for them (C2).
5. **The refusal register.** `REFUSED_CUES` records cues that were tried and rejected *with the
   sentence that broke them*. It is why this appraisal could measure decisions instead of re-taking
   them.

---

## Part 2 — The findings

Ordered by harm. Each carries how it was measured.

### F1 — The rarity discount does not do what its own comment says it does

`separation()`'s doc comment ended: *"Without this, `scoreAgainst` is monotone in declarations and
ticking every interview box is the dominant strategy the day the roster self-declares."*

**That sentence is false.** The function discounts **popular facets**. It does not penalise **broad
declarers**. Nothing in the formula reads how many facets a clinician declared, so `scoreAgainst`
*is still* monotone in declarations: ticking one more box never costs anything, and ticking a **rare**
box collects full weight. The discount is weakest exactly where box-ticking pays best — and a false
claim on a rare facet is the most harmful kind, because a rare facet is the one nobody else can
serve if the claim is untrue.

**Status: comment corrected in O182, mechanism NOT changed.** The instrument that would actually
price breadth is a *declaration budget* (Part 3), and that is a change to what the onboarding
interview asks, not to how an answer is weighed. What could not be left standing was the comment: a
justification that overstates what the code does is worse than none, because the next reader builds
on it — this tree's own rule, from `src/matching/match.ts`.

### F2 — Declaring "sometimes" halved a rival's facet at half the cost — FIXED in O182

`heldBy` counted a boolean (`answers()`, true for both grades) while scoring paid `declarationFactor`
(1 for "often", 0.5 for "sometimes"). Two halves of one idea, disagreeing.

Measured, two clinicians, one facet, one request:

| Roster | Facet weight after discount | Scores |
|---|---|---|
| A declares anxiety **often**, B declares nothing | **24** | A 24, B 0 |
| A declares anxiety **often**, B declares it **sometimes** | **12** | A 12, B 6 |

B halved A's facet by making a claim B is paid half for — 2:1 leverage handed to the least committed
declarer. The cheapest way to compete on a facet you do not really do was to say you *sometimes* do
it. **Fixed:** rarity now sums the same quantity scoring pays out (`declaredMass`), so dilution costs
exactly what it buys.

### F3 — W221's protection ran out of material, and file order took over — FIXED in O182

W221's rule: a clinician with a disclosed interest sorts *behind* one without. It worked because
Dr Yadav had no interest to declare. He left on 2026-08-22; **both remaining clinicians are
disclosed**, the comparator returns 0 for every pair, the sort falls back to stable, and the first
record in `roster.ts` takes first place on every unspecific request. That record is the owner of the
partner clinic.

**The defect W221 was written to kill came back by subtraction**, without anybody editing the rule,
and no test caught it because every test asserted *the rule* rather than *the outcome*.

**Fixed:** the comparator chain no longer ends at file order. It ends at a hash of the clinician's id
mixed with the reader's own request — arbitrary by construction, order-independent, uneditable into a
favour, and varying by request so no clinician is structurally first. **This is a floor, not an
answer**; the answer is F4.

### F4 — Ranking a disclosed interest last is a tax on disclosure

The mechanism-design frame's sharpest point, and it survived challenge from the other four: **the
rational response to a penalty attached to a voluntary statement is to stop making the statement.**
W221's rule puts a cost on candour and none on concealment, which is backwards — the teeth belong on
the *undisclosed* interest discovered later.

It is also now a *list-level* fact wearing a *record-level* mechanism. 100% of listings carry a
declared interest in the directory's owner. The regulator frame reached this independently and named
the precedent: **ACCC v Trivago** — a ranked list presented as impartial comparison, ordered by
something aligned with the operator's revenue, was misleading conduct *regardless of the disclaimer
on the page*. "The first record in the file happens to be the owner of the partner clinic" is the
same fact pattern as an artifact rather than a rule, which is worse to explain, not better.

**Not fixed here. This is a founder decision** (Part 4), because every available answer changes
either what the product claims to be or where its money comes from.

### F5 — Two definitions of "this clinician answers this need"

`answers()` (scoring) counts `careAreasSometimes` at half weight. `cliniciansMatchingArchetype`
(eligibility) ignores it entirely. **So a clinician can rank FIRST for a journey they are formally
ineligible for** — which two archetypes did, before O179 withdrew them.

Not fixed in O182 **on purpose**: the two predicates may have diverged deliberately (a strict gate
exists so a demo journey cannot dead-end), and collapsing them inside a roster edit would have been
tuning the definition of "eligible" until the demo passed. The direction has to be chosen — widen
eligibility, or make scoring respect eligibility — and that choice is Q-A item 2.

### F6 — A surface and the ranker disagree about the same fact

`holdsPreference(…, "longer-appointment")` reads the `unhurried` **manner facet**. Dr Anubhav's
profile displays `appointmentLength` = *"Long first appointment, scheduled reviews"*. So the page
advertises a longer first appointment while the matcher correctly grades that exact request
`unserved`. One field is displayed, another is matched, and nothing holds them together.

### F7 — The quality metric rises when the product gets worse

Tie-quality separation went **0.557 → 0.622** when the roster shrank from three to two, and
`partialTie` fell to a **structural zero** — with two clinicians the category cannot exist. At N=2,
"separated" means *one GP was placed above one other GP*: the easiest possible separation and the
least useful one to a reader who has a choice of two. A KPI that improves when the roster shrinks is
measuring the wrong thing at this size.

### F8 — `informed` is satisfiable by a single facet

`matchQuality` returns `informed` when **any two scores differ**. At N=2 one facet does it. The grade
that tells a reader "this order was earned" is the weakest possible claim about the order.

### F9 — Score-sum is fully compensatory

Three manner traits outrank one language. A reader who needs Hindi and gets a warm English-only GP
first has been failed in a way the arithmetic cannot see, because everything is one addition.

### F10 — "Undeclared" and "declared no" are the same number

Both contribute 0. So "this GP says they do not do that" and "this GP has not said" are
indistinguishable to the ranker — and therefore to the reader. The product cannot currently express
*we cannot tell*, only *they are equal*.

---

## Part 3 — What was shipped in O182

1. **`declaredMass`** replaces the boolean holder count (F2). Rarity and scoring now measure the same
   quantity; the dilution asymmetry is gone.
2. **A terminal tie-break that is not file order** (F3), hashed from the clinician id and the
   reader's request, order-independent and total.
3. **`separation()`'s rationale corrected** (F1) — the code's stated purpose now matches what it does,
   with the real instrument named and deferred rather than implied.
4. **Regression tests for all three**, including one that asserts the *outcome* (no clinician is
   structurally first across the corpus) rather than the rule, because asserting the rule is what let
   F3 come back unseen.

---

## Part 4 — Founder decisions, priced

None of these is an engineering choice and none is taken here.

| # | Decision | What it costs | What it buys |
|---|---|---|---|
| G-A1 | **Does commercial interest stay in the ranking at all?** | Removing it retires W221's rule; keeping it taxes disclosure (F4) | The recommended shape is: interest out of the comparator, a **list-level** state above the results ("every clinician listed has a declared interest in this service"), a neutral per-listing badge, and the penalty moved to *concealment* discovered later |
| G-A2 | **Does the finder rank at all while N=2?** | Retires the ordered list at current scale | The patient frame was unanimous and unsparing: with two conflicted listings the defensible product is a gap report with a route out, not a ranking. Every instinct that makes it *feel* like a directory makes it more misleading at this size |
| G-A3 | **An exit ramp to sources ADHD.ME does not own** | Sends acquired readers to free alternatives | The regulator frame's view: a disclosure with no alternative attached is a notice, not a disclosure. This is the single most trust-building element available, and the most commercially expensive |
| G-A4 | **Declaration budget at onboarding** (F1) | Changes the interview; a genuine generalist must now choose | The only instrument that prices breadth on the correct axis, with zero coupling between clinicians — it removes the jamming and sybil surface outright rather than patching it |
| G-A5 | **Verification tiers** — unverified "often" floored to "sometimes" | Privileges credentialed, well-resourced practice | Real separating equilibrium on *verifiable* facets. **Must not extend to manner traits** — there is no certificate for "non-judgemental", and applying it there would suppress exactly the clinicians this directory exists to surface |
| G-A6 | **Is Dr Anusha's listing telehealth?** | One line | "Books online" was removed as directed (O180); telehealth was NOT substituted, because it is a different claim she has not made |

---

## Part 5 — Refused, with reasons

- **A disclosure severity taxonomy** (grading interests as ownership > directorship > employment).
  Refused: it is a policy judgement adjudicated by the party who owns the partner clinic, and a bad
  grading is worse than none. F3's harm was the file-order fallback, not the comparator's coarseness.
- **Learned or fitted weights**, including panel-elicited isotonic fitting. Refused: W213's floor
  requires every point of score to be sayable in closed vocabulary, and "fitted from a panel" is not
  a sentence a patient can check.
- **Proper scoring rules over attribute declarations.** Refused on the mechanism frame's own
  reasoning: they need an outcome to resolve against, and *"I often see X"* never resolves. They
  apply to capacity claims (*"I can see someone within N weeks"*) and only once booking data exists —
  Q-A item 8.
- **Reputation staking or bonds.** Refused: financial stake in a patient-facing health directory is
  pay-to-rank wearing a different hat.
- **Deferred acceptance.** Not applicable and recorded so it is not proposed again: DA makes truthful
  *preference* reporting dominant; it says nothing about whether a clinician's self-described *type*
  is honest, which is this product's actual problem.
