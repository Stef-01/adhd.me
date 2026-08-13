# W169 — Q13 gate dossier: what G5 now costs, priced

Narrow, like its predecessors. `docs/GATE-DOSSIER-Y2.md` holds G0–G7 with their code-level
enforcement, `docs/GATE-DOSSIER-Q9.md` sets out credential visibility, `docs/GATE-DOSSIER-Y3.md`
traces G5 through Year 3, and `docs/GATE-DOSSIER-Q11.md` covers GP-to-GP routing. **This one
does one thing: it prices G5.** Nothing here restates a gate's definition or re-argues a
position already recorded.

The Y3 dossier said G5 had gone from "one ask among three" to holding two quarters of work.
That framing has stopped being useful, because it counts units rather than saying what the
company does not have. This dossier answers three questions instead: **which units unblock, in
what order, and what the product gains on the day the ruling lands.**

## The price, stated plainly

**Nine modules ship a complete, tested mechanism over an empty catalogue.** Not stubs — each has
its gate, its refusals and its tests, and each is empty because the thing it would hold is
clinical content nobody has signed off.

| Module | Empty catalogue | Tests behind it |
|---|---|---|
| `src/registers/intervals.ts` | `SHIPPED_INTERVALS` | 7 |
| `src/registers/authoring.ts` | `SHIPPED_WORKSPACE` | 13 |
| `src/registers/safety-rails.ts` | `SHIPPED_SAFETY_RULES` | 11 |
| `src/pathways/versioning.ts` | `SHIPPED_PATHWAYS` | 18 |
| `src/pathways/escalation.ts` | `SHIPPED_ESCALATION_RULES` | 13 |
| `src/pathways/binding.ts` | `SHIPPED_BINDINGS` | 15 |
| `src/education/triggers.ts` | `SHIPPED_TRIGGERS` | 14 |
| `src/credentials/scope.ts` | `SHIPPED_SCOPE_STATEMENTS` | 17 |
| `src/verticals/store.ts` | no vertical assembled | 9 e2e |

Around those sit the modules that are not themselves empty but have nothing to act on:
`pathways/approval` (12), `pathways/evaluation` (17), `education/curation` (16),
`education/provenance` (12), `verticals/model` (17), `verticals/completeness` (15),
`verticals/binding` (17).

**So the price is not "some units are blocked". It is that an assembled machine is inert.** A
practice signing in today can reach a vertical console, a pathway console, an education library
and a credential registry, and every one of them correctly renders a zero state explaining that
nothing has been signed off. That is the product working exactly as designed, and it is also the
product doing nothing.

## Which units unblock, in what order

The order is forced by the dependency chain, not chosen. Each step needs the one above it.

**1. `W163` — interval values (and `W56`, the same question at register scale).**
The cheapest ruling and the one everything else waits behind. These are transcribed published
cycle-of-care intervals with a citation and a retrieval date; the container has been shipped and
tested since Q5 and holds exactly nothing. Unblocking it makes `W58`'s care-gap detection produce
gaps, which makes registers produce offers, which is the Year 2 engine's whole output.

**2. `W161` and `W162` — cardiometabolic and early-CKD pathway content.**
These need `W119`'s two-person sign-off recorded, so they need a specialist reviewer engaged, not
only a founder decision. They are the first real content the pathway engine has ever held.

**3. `W157`'s verticals become assemblable.**
A vertical requires every member usable. With 1 and 2 done, the cardiometabolic vertical has
pathways, intervals and content, and `W158`'s completeness report is the instrument that says
what is still missing — per vertical, grouped by who has to act. That report exists precisely to
make this step measurable rather than a judgement call.

**4. `W186` — dermatology content**, and the Q15 vertical that depends on it.

**5. `SUP-1`** (cohort-level specialist review) becomes buildable as a de-identified aggregate.
`SUP-2` does **not** — it needs a company-direction decision as well, and `docs/SUPERVISION-HOOKS-W89.md`
says why that is not a clinical-content question and should not be answered as one.

## What the product gains on the day

Stated as capability, not as unit count.

- **Registers start producing offers.** Today the Y2 engine can detect a care gap only if an
  interval exists to detect it against. Step 1 alone turns the entire condition-yield loop from
  a tested mechanism into a running one.
- **A vertical can be offered to a practice.** `W160`'s binding, `W164`'s console and `W158`'s
  completeness report all currently operate on an empty set. After step 3 a practice can read a
  cardiometabolic vertical, accept a specific version, and stay on it.
- **The education library stops being empty.** `W152` makes an item renderable only if its source
  is signed off, so today nothing renders by construction. Signed-off content is the switch.
- **`W153`'s prompt-injection posture and `W144`'s boundary start mattering.** Both are written
  and tested against content that does not exist yet.

## What it does NOT unblock, and should not be sold as unblocking

- **G3 (live SMS), G1 (PMS credentials), G2 (real patient data)** are untouched by a G5 ruling.
  The send path is still unwired (`W28`/`W29`/`W36`), which the Y2 audit recorded and which
  remains the largest gap between "modelled" and "operative".
- **G6** still gates the directory and cross-practice routing (`W133`).
- **Proposed G8 and G9** are unrelated decisions about third-party model vendors and third-party
  organisational reporting respectively, and neither is helped by a G5 answer.

## The honest counter-argument

A ruling has a cost on the other side, and this dossier would be advocacy if it did not say so.
Signing off clinical content makes Meherr the publisher of that content, engages the founder's
and the reviewing specialist's professional exposure, and starts a maintenance obligation that
does not stop: guidance changes, and `W118`'s versioning exists because a published pathway has
to be re-reviewed rather than edited. **The empty catalogue is not only a cost — it is also the
only state in which none of that applies.** Choosing when to leave it is the decision, and
"the machinery is ready" is an argument about readiness, not about whether to.

There is also a live inconsistency, unchanged since the Y2 dossier raised it and worth restating
once because it bears directly on the price: `/clinicians` already ships real clinical guidance,
while `W56` has held the entire register chain for transcribing published intervals — which is
less clinically consequential. Both positions are defensible; they are not simultaneously
defensible.

Re-checked for this dossier rather than carried forward on trust, because a claim about another
surface is exactly the kind that rots. The content is still there and still names conditions and
drug classes: `app/clinicians/clinician-walkthrough.tsx` carries Rotterdam criteria, COCP
suitability and metformin titration. Worth noting for anyone looking: `app/clinicians/page.tsx`
is now five lines that delegate to that component, so a grep of the page finds nothing and the
inconsistency can look resolved when it is not.

## What is asked, concretely

1. **Rule on `W163`/`W56` first** — transcribed published intervals with citation and retrieval
   date. It is the cheapest decision and the largest unlock.
2. **Say whether a specialist reviewer is being engaged**, and if so when. `W161`/`W162` cannot
   proceed on a founder decision alone; `W119` requires two people and refuses self-review.
3. **Resolve the `/clinicians` inconsistency** in the same breath, either way.

Nothing in this dossier asks the loop to be unblocked. It asks for the price to be visible when
the decision is made.
