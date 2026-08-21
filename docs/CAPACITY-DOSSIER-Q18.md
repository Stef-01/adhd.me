# W232 — Q18 dossier: what a forecast implies operationally, priced

Q18 has seven modules that say how full a practice's sessions run and what a range of them would
be. This document does one thing those cannot: it says **what a practice has committed to the
moment it believes one**, and what that costs in either direction.

Narrow, like the gate dossiers. It restates none of the lane's reasoning and takes no position on
whether any practice should act. Every figure below is derived from W46's figures register or from
the simulated practice and is pinned by `src/quality/capacity-dossier-q18.test.ts`; none is typed
from memory.

## The finding, stated first: nothing in this product fills the slots it encourages you to open

A practice acting on *"if 2 more slots were opened on Thursday, between 1 and 2 filled"* opens
capacity. A clinician is rostered, a room is held, reception plans around it.

**Then nothing in this product fills it.**

- W231's forecast→invitation-volume coupling **ships off**, and is pinned off.
- Underneath it, the invitation rail has never sent anything to anybody. G1, G2 and G3 are all
  unresolved and W174 is `blocked` for the same reason.

So the filling is entirely the practice's own work — its recall list, its reception, its phone.
That is a perfectly reasonable arrangement, and it is not the arrangement a reader of the capacity
console would assume. **Opening slots you have no mechanism to fill is worse than not opening
them**: the practice carries the roster cost and this product supplied the confidence.

This is not a criticism of the forecaster. The forecaster is honest and says only what the record
shows. The gap is between what it says and what the product can currently do about it, and the
gap belongs in front of anybody who demos this lane.

## What the forecast is actually worth, in slots

Over a six-week run of the simulated practice:

- **8,393 slots offered**, of which **260 went unfilled** — 3.1%.
- At the register's all-in bulk-billed Level B, metro figure of **$69.56**
  (`mbs.bulk-billed-level-b-metro`, published, effective 2025-11-01), those 260 slots are
  **$18,085.60** of consulting that did not happen.

That single number is both the size of the prize and the size of the exposure. Filling them is
worth $18,085.60; opening the same number again and filling none of them costs the same.

The rebate figure is what a patient receives, not what a practice earns, and the register holds
both: `mbs.item23` is **$43.90**. The larger figure is used above because the operational question
is what the session hour returns, not what the patient is rebated.

## The range's width is the decision, not its midpoint

"Between 4 and 6 will fill" is not a number to act on. It is a question about **which end you
staff for**, and the two errors are not the same error:

| You staff for | It fills | What happened |
|---|---|---|
| the high end (6) | 4 | Two slots of clinician time idle. At $69.56 a slot, **$139.12** per occurrence. |
| the low end (4) | 6 | Two people turned away who would have booked. No cost on the ledger and a cost to them. |

Which of those a practice would rather be wrong about is a fact about that practice — its staffing
model, whether the clinician is salaried or billing, and whether the turned-away patient comes back
next week or goes elsewhere. **This product does not know any of those and must not choose.**

How wide are the ranges in practice? Over the simulated practice's 70 recurring sessions, asked
about six slots:

- **21 sessions** produce a range of width **0** — the record says the same number every week.
- **46 sessions** produce a range of width **1**.
- **3 sessions** produce a range of width **2**, the widest in the practice.

So for the large majority the staffing question is nearly free: the two ends differ by at most one
slot, or $69.56. It is the three widest sessions where the decision has a real shape, and those are
exactly the sessions the console makes findable.

## What changes on the day, in order

1. **A roster commitment is made.** This is the irreversible half. Everything downstream is
   reporting; this is a person's time.
2. **The practice's own filling work starts**, because nothing here does it. See the finding above.
3. **The forecast becomes checkable.** W224 scores every range against what actually happened, so
   the next week's forecast rests on a track record that includes this decision — including its
   failures. A practice that acts on forecasts is also, without doing anything further, running
   the experiment that says whether the forecasts were worth acting on.
4. **W228 starts watching for drift**, and will report it rather than quietly recalibrating. If the
   practice's world changes because of the decision it just took, that shows up as a disagreement
   between two halves of its own record — not as a silently improved forecaster.

## What this dossier does not price

- **Whether opening slots is a good idea for any practice.** Out of scope by design, and the
  reason W225 makes the practice supply the number of slots rather than choosing one.
- **The value of a filled slot beyond the consultation itself.** Continuity, a diagnosis brought
  forward, a patient retained — real, unmeasured here, and not something this tree will assert
  without a source.
- **Dollar figures for anything the register does not hold.** The two figures above are the two
  that are cited. There is no third.
