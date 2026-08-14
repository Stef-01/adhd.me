# W216 — Q17 gate dossier: the learned-ranking question, priced

Narrow, like its predecessors. `docs/GATE-DOSSIER-Y2.md` holds G0–G7 with their code-level
enforcement, and `src/privacy/automated-decisions.ts` (W201) holds the published ADM notice this
question collides with. **This one does one thing: it prices the decision W208 flagged the day it
planned Year 5 — whether ADHD.ME may order patients by anything a model learns.** It restates
neither G7's definition nor the ADM notice; it names the collision and takes no position.

## The finding, stated first: the contradiction is already live, not hypothetical

The forward unit is W217 — *learned ranking of patients* — `blocked` from day one. But the reason
it is blocked does not wait for anyone to build it. It is already in the tree, as a recorded
latent finding, and the honest thing to say first is that **the published notice and the live code
disagree today.**

`rankCandidates` in `src/engine/pool.ts` orders the live invitation pool by `chronicCare` first and
then by time since last visit — its own comment reads *"older date = longer overdue = first"*. It
has done so since W5 and it still feeds the invitation pool. W201's published ADM notice says, in
its *never automated* list:

> No ordering of patients by need or by how unwell they are

A patient flagged for ongoing care, ordered ahead of one who is not, and then by how overdue they
are, **is** an ordering by need — under one description. This is `MATCH-1`, recorded by W214 in
`src/quality/latent-findings.ts` and still open. W213 saw the same lines of code; reading them
against the notice is what turns a reasonable-looking sort into a contradiction.

**The one thing that keeps it from being a live harm rather than a live contradiction**: nothing
has ever been sent. G1/G2/G3 are shut and W174 is blocked, so the invitation pool has never run
against a real person — no patient has actually been ordered by anything. The notice is published;
the ranker has never fired in earnest. `MATCH-1`'s trigger fires the day W214's matcher becomes a
live path, which is the day the disagreement stops being on paper.

## The two collisions, stated precisely

### The ADM notice (W201) — and the distinction the founder must rule on

The notice does not only deny an ordering. It also **describes** the one the product performs. Its
automated-decisions list says of ranking:

> Patients already found eligible are put in an order using simple, explainable factors — whether
> your practice has flagged you for ongoing care, and how long since your last visit. It decides
> the order of offers, never who is more unwell.

So the notice draws a line between *the order of offers* (declared, permitted) and *who is more
unwell* (never automated). **The whole decision is whether that line holds.** `MATCH-1`'s position
is that "flagged for ongoing care, then most overdue" and "who is more unwell" are one fact wearing
two descriptions, and no sentence separates them. The notice's position is that ordering *whose
turn it is to be offered an appointment* is not the same act as ranking *who is sickest*, even when
the inputs overlap. Both readings are defensible from the same code, which is exactly why it is a
founder decision and not a build one.

A learned ranker (W217) removes the ability to hold that line at all. W213's explainability floor
requires every ordering decision to render its reason as one sentence from a closed vocabulary; a
model that *learns* an order over patients cannot, and "the algorithm decided who to offer an
appointment to first" is the sentence both the notice and G7 exist to prevent.

### G7 — the CDSS boundary

`docs/GATE-DOSSIER-Y2.md` records G7 as *any feature that could constitute TGA-regulated CDSS*,
with the posture holding structurally in the register chain and the one open question being the
finder's matching, "because it matches on *clinician* attributes even though the patient's input
mentions their health." A learned ranking of **patients** sits closer to the line than the finder
does: it orders people by a learned function of their own clinical data, which is "who most needs
to be seen" under the name "who to offer an appointment to first." The finder reasons over a
clinician's declared attributes; a patient ranker reasons over the patient. That is the direction
G7 watches.

## What a ruling would release

**Directly: exactly one unit, W217.** It is the only `blocked` row in the ledger that names this
decision as its blocker. The count is derived from `BUILD-STATE.md` and pinned by
`src/quality/gate-dossier-q17.test.ts`; if a future unit lands blocked on the same decision, the
test fails and this line is wrong.

**It also resolves `MATCH-1`** — not a blocked ledger row but an open entry in the latent-findings
register, which a ruling closes in one of two directions (below). This is why the decision matters
before W217 is ever scheduled: the contradiction it settles is already in the code.

**It releases nothing else.** The rest of Q17 — the response graph and deterministic matching
(W213/W214, done; W218–W220) — ships without this ruling. W208 built Q17 so that its buildable half
proceeds and only the learned-ranking half waits. This dossier does not hold anything else up.

## What it would cost

Two mutually exclusive shapes, both consequential, and the asymmetry between them is the useful
part.

**(a) Change the published notice.** Patients have been shown a legal transparency statement that
says the software does not order them by need. Editing it to say the software *may* order them by a
learned function of their health data is a public change to a commitment already made. W193 and
W177 argued that a published surface cannot be recalled; a published notice is the same — "we
changed the notice back" does not reach whoever read it. This is the cost of ruling **yes** on
W217.

**(b) Change who gets invited.** Remove the `chronicCare`/overdue ordering from `rankCandidates`.
This makes the *existing* notice true without building anything, at the cost of changing the
product's behaviour for every practice that has registers turned on — the invitation order becomes
neutral where today it favours the flagged-and-overdue. This is the cost of ruling that `MATCH-1`
is a real contradiction.

The asymmetry: **(b) is available today, is cheap in code, and settles the live contradiction
without any new capability.** (a) is the opposite direction — it is only needed if the founder
wants *more* ordering, not less, and it is the more expensive of the two because it touches a
published notice rather than a private sort. A founder can take (b) and rule W217 shut in the same
decision, or take neither and accept the current order as consistent with the notice — but the one
thing the loop must not do is choose, because either choice changes who is offered care or what the
public notice says.

## The honest counter-argument

The case for a learned ranker is stronger than "we want a better model," and it is worth stating
plainly. The current order — chronic-care first, then most overdue — is *itself* an ordering by
need. It is a hand-built heuristic, but it is not neutral. If the founder is comfortable with that
order (and the notice, as written, describes and permits it), then "learned" is a difference of
**method**, not of **kind**, and refusing a learned order while shipping the heuristic draws the
line in a place that cannot be defended on principle — only on explainability.

The answer, which this dossier records without endorsing: explainability *is* the principle here.
W213's floor is not a nice-to-have bolted onto the matcher; it is the thing that lets the product
say, truthfully, why a given person was offered an appointment before another. A learned order
cannot make that statement, and once it cannot, the difference of method has become a difference of
kind — the product now orders patients by a function nobody can render in a sentence, which is the
exact shape the ADM notice and G7 are written against. Whether that is decisive is a judgement
about the product's posture, not a technical fact, and this dossier does not make it.

## What is asked, concretely

Numbered by what they settle, not by size.

1. **Rule whether the current `rankCandidates` order is consistent with the published notice.**
   This is answerable today, blocks no unit, and is the contradiction already live in the tree
   (`MATCH-1`). If it is *not* consistent, the fix is option (b) — remove the clinical-attribute
   ordering — and it is a small, reversible code change made before anything is ever sent.
   *Settles: `MATCH-1`.*
2. **Rule whether the product may order patients by a learned function.** This is W217. Ruling
   **yes** requires the notice to change (option (a)) and should not proceed until it has. Ruling
   **no** keeps W217 blocked and is free. *Blocks: W217.*
3. **If the answer to (2) is no, write it in `BUILD-STATE.md`.** W217 stays blocked either way, but
   a recorded refusal closes the question rather than leaving it open forever — the same ask Q15
   made of G6, and Y2 made of the Ahpra review, where a decision left unwritten stayed open across
   quarters. *Blocks: nothing; closes a question.*

## What this dossier deliberately does not do

It does not decide. It does not restate G7's definition, which is in `docs/GATE-DOSSIER-Y2.md`. It
does not re-derive the ADM notice, which is in `src/privacy/automated-decisions.ts`. Where it
quotes either, it quotes the live source so that a reader can check the words against the tree
rather than against this document's memory of them.

## Verification

Every claim above was checked against the tree at the time of writing rather than read from a
ledger row: the two quoted notice strings from `src/privacy/automated-decisions.ts`
(`NEVER_AUTOMATED` and `AUTOMATED_DECISIONS`), the live ordering from `rankCandidates` in
`src/engine/pool.ts`, `MATCH-1`'s status from `src/quality/latent-findings.ts`, and W217's
`blocked` status and its stated blocker from `BUILD-STATE.md`. The counts and the currency of the
quoted notice are pinned by `src/quality/gate-dossier-q17.test.ts`, which bounds its ledger read to
`Q17_LAST_UNIT` so it prices the decisions outstanding when it was written rather than a moving
target (`DOSSIER-1`).
