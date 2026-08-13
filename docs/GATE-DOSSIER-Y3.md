> **G5 IS NOW THE PRODUCT'S SINGLE LARGEST DEPENDENCY.** In the Y2 dossier it was one ruling
> among three asks. Year 3 built two quarters of machinery on top of it, and every piece of
> that machinery ships empty by design. This dossier's job is to make the consequences of the
> ruling legible: what unblocks, in what order, and what happens if the answer is no.

# Y3 gate dossier (W130) — G5 traced through every blocked row

Supersedes nothing. `docs/GATE-DOSSIER-Y2.md` still holds for G0–G4 and G7, and
`docs/GATE-DOSSIER-Q9.md` holds for G6 and credential visibility — this dossier does not
restate either, because a document that repeats unchanged gates trains its reader to skim.

## What changed in Y3

Q9 built a credential registry. Q10 built a pathway definition engine. Both are complete
mechanisms with **zero content**, and that is not an accident of scheduling — it is the W68
posture applied eight times, plus one founder list that is empty for its own reason:

| Empty by design | Unit | What it holds when the ruling comes |
|---|---|---|
| `SHIPPED_INTERVALS` | W56 | Guideline recall intervals |
| `SHIPPED_SAFETY_RULES` | W68 | Red-flag routing rules per condition |
| `SHIPPED_WORKSPACE` | W69 | Authored clinical content awaiting review |
| `SHIPPED_SCOPE_STATEMENTS` | W114 | What a credential covers, per condition |
| `SHIPPED_PATHWAYS` | W118 | The pathway catalogue itself |
| `SHIPPED_ATTESTATIONS` | W119 | Who reviewed and signed off each version |
| `SHIPPED_ESCALATION_RULES` | W121 | What an escalation means and who is told |
| `SHIPPED_BINDINGS` | W123 | Which clinicians a pathway may be offered under |
| `MEHERR_STAFF` | W105 | (Not G5 — a founder list, empty for a different reason) |

Every one is pinned at zero by its own test, so none can be filled without a deliberate commit.
**One is not empty and should be checked**: `SHIPPED_TRIGGERS` (W88's supervision escalation)
carries a single trigger — a patient replying in free text routes to their usual GP. That is a
routing rule about a message, not clinical content about a condition, which is why it was
allowed to ship. It is listed here so the founder can disagree while it is one line.

## G5 — clinical pathway content sign-off

**Status: CLOSED, and now load-bearing across two quarters.**

### What the ruling actually unblocks, in dependency order

1. **W56's interval values** (`in-progress`, container shipped). The loader exists and refuses
   incomplete provenance; the values are the ruling. Unblocking this alone makes the register
   chain do something rather than nothing.
2. **The pathway catalogue** (W118–W128). The whole of Q10 is a governance chain around content
   that does not exist. On the ruling, authoring the first pathway exercises: versioning,
   two-person attestation, criteria evaluation, escalation routing, capability binding, consent,
   the audit trail, and the sign-off dashboard. **Every one of those is already built and
   tested against synthetic content.** This is the largest single unlock in the plan.
3. **SUP-1** (cohort-level specialist review). G5 plus nothing else. Buildable as a
   de-identified aggregate whose output is register content.
4. **SUP-2** (named-patient specialist consultation). G5 **plus a company-direction decision**
   that is not a clinical-content question: whether Meherr is willing to become a party to
   individual clinical care. Ruling on G5 does **not** unblock this, and treating it as though
   it did would answer the harder question by accident.

### What happens if the answer is no, or not yet

This is the part a gate dossier usually omits, and it is the part that matters for planning.

- **Nothing breaks.** Every empty constant is read through a function that behaves correctly
  when it is empty, and several were designed so that empty fails *closed*: W123 returns
  `no_binding` (nobody may deliver a pathway) rather than an empty eligible list; W121 returns
  every escalation as `unrouted` rather than silently doing nothing. The product in its current
  state is not a broken version of the product with content — it is a coherent product that
  does less.
- **Q11 does not depend on it.** GP-to-GP referral rails carry structured referrals between
  practices; they do not require a signed pathway. Q11 can proceed in full while G5 is closed.
- **What does degrade is confidence in the machinery.** Eight mechanisms have been built and
  verified against synthetic content only. The Q9 hardening's scoping sweep already recorded
  four capabilities built ahead of their consumers, and the honest reading is the same here:
  the quarter that first authors real content is where two quarters of design get tested for
  real. The longer that is deferred, the more machinery accumulates behind an untested
  assumption.

### The inconsistency the Y2 dossier recorded is still open

Y2 flagged that `/clinicians` ships walkthrough copy describing a care pathway while W56's
intervals are blocked as clinical content. Nothing in Y3 changed it. It is still the case that
the strictest reading of G5 is not applied uniformly across the tree, and the founder ruling
should cover both or explicitly say why they differ.

## G6 — see the Q9 dossier, and one thing has not moved

`docs/GATE-DOSSIER-Q9.md` sets out the credential-visibility question and its six founder
actions. One is worth escalating here rather than leaving in a quarter dossier:

**The Ahpra advertising review of `/` and `/finder` has now been asked for in three consecutive
dossiers** (Q3, Y2, Q9) and has not been actioned or declined. That is not a criticism of
prioritisation — it is a fact about a control that everyone assumes someone else is tracking.
If the answer is "prototype only, not shipping", one line in `BUILD-STATE.md` closes it
permanently and it stops appearing here.

**Action 1 of the Q9 dossier is now the closest thing to time-critical in the whole plan**: the
A-or-B ruling on whether credential detail may cross a practice boundary, needed before W131's
referral document model fixes what a referral can carry. W131 can be built to the safe
intersection of both answers — a document with no credential field is valid under either — and
if it is built that way, the deadline moves to W133. That is a reprieve, not a resolution.

## G7 — unchanged posture, one new reinforcement

Y3 strengthened the TGA boundary rather than testing it. W120 is the relevant unit and the
argument is worth recording because it generalises: **the boundary is about direction.** A
function taking facts about a patient and returning a pathway is clinical decision support; a
function taking a pathway you have already chosen and reporting whether its recorded criteria
are met is bookkeeping. The module never returns a pathway, has no fact source a symptom could
be recorded under, and an export-list test guards both.

The open question from Y2 is unchanged: the care-finder takes a patient's free-text description
of their care needs and ranks clinicians against it. Still my reading that this sits inside
G7's stated default, still true that "tell us your symptoms and we'll find the right doctor"
would not, and still cheaper to rule on now.

## Founder actions

| # | Action | Blocks | Note |
|---|---|---|---|
| 1 | **Rule on G5** — clinical content sign-off, covering W56's intervals and the pathway catalogue together | W56 values, SUP-1, the entire Q10 content layer | The single largest unlock in the plan. Eight mechanisms are built and waiting |
| 2 | **Rule A or B on credential visibility** (Q9 dossier action 1) | W131's model, W133, W137 | Time-critical unless W131 is built to the safe intersection |
| 3 | **Decide SUP-2's company-direction question** — is Meherr willing to be a party to individual clinical care? | SUP-2 | Explicitly NOT a clinical-content question. Ruling on G5 must not be read as answering it |
| 4 | **Resolve the `/clinicians` inconsistency** — the same G5 standard, or a stated reason they differ | Nothing; it is a coherence problem | Open since Y2 |
| 5 | **Commission or decline the Ahpra advertising review** of `/` and `/finder` | G6 | Asked in three consecutive dossiers. "Prototype only" is a complete answer |
| 6 | **Confirm `SHIPPED_TRIGGERS`' one live rule** is a routing rule rather than clinical content | Nothing | Cheap to disagree with while it is one line |

Nothing else in Y3 is gate-blocked. Everything else unbuilt is simply unbuilt.

## Verification

Dossier complete against the unit's terms — every G5-blocked row traced to what the ruling
releases, in dependency order, with the no-answer case stated as well as the yes case.
Cross-checked against `BUILD-STATE.md` (blocked rows: W56 values, SUP-1, SUP-2), the ten
`SHIPPED_*` constants read from the tree rather than from memory, `docs/GATE-DOSSIER-Y2.md`,
`docs/GATE-DOSSIER-Q9.md`, `docs/SUPERVISION-HOOKS-W89.md` and `docs/HARDENING-Q9.md`.
