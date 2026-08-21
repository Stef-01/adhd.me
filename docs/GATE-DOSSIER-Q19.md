# W245 — Q19 gate dossier: G10, the payer question, priced

Narrow, like its predecessors. `docs/GATE-DOSSIER-Y2.md` holds G0–G7 with their code-level
enforcement; `docs/GATE-DOSSIER-Q17.md` prices the learned-ranking question. **This one does one
thing: it prices G10 — payer and insurer data flows — which has been PROPOSED since W208 and has
never been put to the founder as a decision with its cost attached.** It takes no position.

Every count below is derived from the ledger by `src/quality/gate-dossier-q19.test.ts` and bounded
to the units that existed when this was written. None is typed from memory.

## The cheap half, stated first because it is the half that misleads

**G10 blocks exactly two units: W240 and W241.** Both are Q19 rows, both are `blocked` from the day
they were planned, and nothing else in the plan depends on either.

So the cost of leaving G10 unratified is two units of a five-year plan. That is small, and **a
dossier that stopped there would be making this decision look easier than it is** by measuring only
what is convenient to measure. The interesting number is not what a shut gate costs. It is what an
open one admits.

## Why a payer is not a commissioner

G9 already governs disclosure to a third-party organisation, and the obvious question is why a
payer needs its own gate rather than falling under it. The plan answers that at the point it
proposes G10:

> a payer differs from that in the way that matters: it has a financial interest in the individual
> patient's care and in whether that care happens at all

A commissioner wants the service delivered — its interest and the patient's point the same way. A
payer's interest can run the other way on the same patient, on the same day, about the same
appointment. **No gate in this tree distinguishes those two relationships**, which is exactly why
G10 was proposed rather than folded into G9.

That is the whole substance of the decision. Everything else in this document is scaffolding around
it.

## What ratifying G10 would release

| Unit | What it is | What it would then be |
|---|---|---|
| W240 | Payer/insurer integration model | Buildable behind the gate, as W202/W203 are behind G9 |
| W241 | Payer claim-status read | Buildable behind the gate |

Both are written to be buildable *behind* it — the same posture W147's model adapter and W203's
delivery adapter take. Ratification does not build them; it makes them claimable.

## What ratifying G10 would **not** release

This is the half a gate dossier usually omits, and it is where a reader is most likely to be wrong.
A founder who reads "payer flows are approved" and expects an integration would be four gates short
of one.

| Still shut | What it governs | Why G10 does not touch it |
|---|---|---|
| **G1** | real PMS/booking API credentials | A payer ruling says nothing about connecting to practice software. `src/interop/credentials.ts` refuses on G1 alone. |
| **G2** | real patient data of any kind | Everything in this tree runs on synthetic records. G10 governs *whether a flow may exist*, not whether real data may enter the product. |
| **G8** | third-party model processing | Proposed and unratified separately. A payer is not a model vendor. |
| **Q9 action 1** | whether credential detail may cross a practice boundary | Recorded in `docs/GATE-DOSSIER-Q9.md`, still open, and the reason W133 is blocked. Nothing about payers answers it. |

## What the founder is actually deciding

Four things, which the plan's own wording names and this document does not add to:

1. **The counterparty** — which payer or insurer, by name.
2. **The direction of flow** — out only, or both ways.
3. **The minimum data set** — what is the least that could be sent and still be useful.
4. **The patient's own consent to that specific exchange** — which is a different consent from
   anything already recorded. `src/interop/disclosure-consent.ts` (W243) holds the model: consent is
   to a named recipient, and consent to one recipient is not consent to another.

The fourth is the one with machinery already waiting for it. The first three are commercial and
clinical judgements this product has no view on.

## What this dossier does not do

- **Recommend a ruling.** Out of scope, deliberately, and the same posture W216 took on the
  learned-ranking question.
- **Estimate revenue.** No figure in this tree is cited for payer integration, and W46's register
  holds none. Inventing one to make the decision feel quantified would be worse than leaving it
  qualitative.
- **Assume the answer is yes.** W240 and W241 stay `blocked` whatever this document says. A dossier
  that pre-committed the decision would be the loop deciding it, which the plan forbids in the
  same sentence that proposes the gate.
