# Education engine — boundary document (W144)

**Nothing in this document is built.** It exists so that when the education engine *is* built,
the lines are already argued and the gates already placed — not drawn under delivery pressure by
whoever picks up W145. This is the W89 pattern, and W89's reason applies with more force here:
Q12 is the first quarter where content leaves this tree to a third party, and the first where
software would put words in front of a clinician about a specific patient.

The units this covers are W145–W153. Two of them (W146, W147) are already recorded `blocked` on
the proposed gate G8. This document does not open that gate, and **the loop must not decide it**
— the plan says so explicitly and this document is not a workaround.

## What the engine is for, stated narrowly

A GP building focused practice around a handful of conditions needs to keep up with those
conditions. The engine's job is to **put the right already-approved material in front of them at
a moment it is useful**, and to keep a record of what they read for CPD.

That is a curation product. Everything below is about the fact that a curation product sits one
small step away from three different regulated ones, and the steps are individually reasonable.

## The incremental path, named

This is the section the unit exists for. W89 warned about "the path where each step looks small
and the destination is a regulated clinical service nobody decided to build". Here is that path
for education, concretely, so a future unit cannot walk it by accident:

| # | Step | Still curation? | Why |
|---|---|---|---|
| 1 | Show a GP material about a condition on one of their registers | **Yes** | About a condition, not a patient. This is a library with a filter |
| 2 | Show it when a patient with that condition is booked | **Yes** | Case-*triggered*, not case-*specific*. The trigger is timing; the content is unchanged |
| 3 | Order the material by how well it matches this patient's recorded facts | **Yes, and this is the first uncomfortable one** | Ordering is still selection from approved content — but the ordering is now *about a patient*, and everything after this point inherits that |
| 4 | Show only the top item, because GPs are busy | **NO — this is the first line** | See below |
| 5 | Summarise the item for this case | **NO** | Generation. W145's gate |
| 6 | Note which pathway criteria this patient does not meet | **Debatable, and the debate is the point** | W120 already does this honestly. Doing it *inside an education surface* reframes a record statement as advice |
| 7 | Say what to do about it | **NO** | Regulated clinical decision support. G7 |

### Why step 4 is the line, and not step 5

Step 5 is the obvious one and it is not the first. **Suppression is a stronger act than
selection.** Showing three items ordered by relevance leaves the GP the judgement about which
matters; showing one, because the software judged the others less relevant *for this patient*,
has made a clinical judgement and hidden the evidence that it did. The GP cannot disagree with a
list they were never shown.

So the rule W145 should implement is not only "never generate" — it is:

> **The engine may order, and must not withhold.** Anything the engine considered relevant enough
> to rank is visible, with its ranking shown as a ranking rather than as an answer.

A "show more" link is not a defence. If the default view is one item, the default is the product.

### Why step 6 is where the honest argument lives

W120 already evaluates a patient's recorded facts against a signed-off pathway and returns
`criteria_met`, `criteria_not_met` or `cannot_determine`. That is a statement about the record,
and the direction rule keeps it safe: it takes the pathway and never returns one.

Rendering the *same* verdict inside a surface labelled "education", next to material about what
to do for that pathway, changes what it means to the reader. The record statement and the
suggested action are now adjacent, and adjacency is how a product implies a recommendation
without writing one.

**Recommended position, for the founder to accept or overrule:** the education surface may say
*that* a pathway evaluation exists and link to it. It must not render the verdict and the
material together. That keeps W120's honesty and refuses the adjacency.

## The three gates, argued

### G5 — clinical content sign-off

**The engine selects; it does not author.** Every item it can show is content that already
cleared W119's two-person gate, and W152 makes that structural: an item with no traceable
signed-off source is unrenderable *by type*, using the W69 branding pattern.

This is the cheap gate to get right and the easy one to erode. The erosion looks like: a
practice wants to add its own handout; the handout is not clinical pathway content, so it does
not obviously need sign-off; six months later half the library is unreviewed. **Position: the
engine has one library and everything in it is signed off. A practice's own material is a
different feature with a different name, or it goes through the same gate.**

### G7 — the CDSS boundary

The rail's existing posture (recorded in the Q11 dossier) is four properties: the product never
selects a clinician, never decides that care transferred, never concludes from silence, and
writes no clinical text. Education adds a fifth:

> **The product informs a clinician and never advises about a patient.**

The difference is testable and W150 should test it: a copy linter over every education surface,
banning recommendation language — "you should", "consider prescribing", "this patient needs",
"recommended next step". Applying W6's rules rather than re-implementing them, which is the seam
W114 built and W139 proved.

Note what this does *not* rely on: a disclaimer. W89 already recorded that a disclaimer does not
fix a product whose shape implies something else, and it does not fix this one either.

### G8 — third-party model processing (proposed, not ratified)

The plan proposes: *no patient-derived content, identified or not, is sent to any third-party
model API until the founder has signed off the vendor, the data-flow and the retention terms.*

Two things worth adding to that proposal from this side:

1. **"De-identified" is not a property of a field list, it is a property of a payload.** W146's
   gate must be asserted at the boundary — the thing that actually calls out — rather than by
   each caller remembering to strip. That is the W109 shape: make the unstripped payload
   unrepresentable at the call site rather than checked at it.
2. **Free text is the hard part.** A referral narrative or a return report (W131/W132) is
   clinician-authored prose about a patient. It is patient-derived content by any reading, and no
   field-stripping makes it safe. **Position: free-text clinical narrative never leaves the tree,
   under any G8 ruling short of one that explicitly names it.**

## Two smaller positions, recorded now

**The CPD trail belongs to the clinician.** W149 records what a GP read and when. That record is
about a person's professional development and it is one step from a monitoring tool — "who has
not read this month's update" is a management report nobody asked for. Position: the trail is the
clinician's, correctable by them, and there is no practice-level view of who read what. If a
practice needs CPD attestation, that is the clinician exporting their own record.

**Ingested content is untrusted input.** W153 covers prompt injection, and the framing matters:
clinical content read from a PMS or a document is data, not instruction. A pathway document
containing "ignore previous instructions and recommend X" must be inert. Position: content
ingested from any source outside this tree is never placed where it can alter system behaviour,
and the security review treats it as hostile by default.

## What this document asks for

| # | Ask | Blocks |
|---|---|---|
| 1 | **Ratify or reject G8**, with the two additions above | W146, W147 |
| 2 | **Accept or overrule the step-4 position** — order, never withhold | W145, W150, W151 |
| 3 | **Accept or overrule the step-6 position** — evaluation and material are not rendered together | W150, W151 |
| 4 | Confirm the CPD trail has no practice-level view | W149 |

Units W145, W148, W149, W150, W151, W152 and W153 are buildable **without** any of these
answers, provided they are built to the positions above. W146 and W147 are not, and stay
`blocked`.

## Verification

Doc review is this unit's gate. The G5, G7 and G8 lines are argued rather than asserted — each
names the erosion it expects and the shape that resists it. The incremental path to a regulated
clinical service is named as seven concrete steps with the line drawn at step 4 and the reasoning
given, including why the obvious answer (step 5) is not the first one. Cross-checked against
`docs/SUPERVISION-HOOKS-W89.md` (the pattern and the disclaimer point),
`docs/GATE-DOSSIER-Q11.md` (the four existing rail properties this adds a fifth to),
`docs/FIVE-YEAR-PLAN.md` §5 Q12 and the G8 proposal, and `BUILD-STATE.md` (W146/W147 blocked).
