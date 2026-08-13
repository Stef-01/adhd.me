# W207 — Year-4 gate dossier: every outstanding founder decision, priced

The quarter dossiers each price one gate: `Q9` credential visibility, `Q11` GP-to-GP routing,
`Q13` G5, `Q14` G3, `Q15` G6. **This one does the arithmetic across all of them** — what is
still waiting on a person, how long it has waited, and how many units each answer releases.
Nothing here re-argues a position already recorded; where a quarter dossier settled something,
this points at it.

## The finding, stated first: the gate labels do not track urgency or cost

Sorting the outstanding decisions by what they release, and separately by how long they have been
open, produces two different orders — and the tree's own labelling matches neither.

| Decision | Units released | Open since | Numbered? |
| --- | --- | --- | --- |
| **G5** — clinical content sign-off | **7** (W161, W162, W163, W186, SUP-1, SUP-2, and W56's values) | Y3 Q13 | yes |
| **Q9 action 1** — may credential detail cross a practice boundary | 1 blocked (W133), and the usefulness of W131/W137 | **Y2 Q9** | **no** |
| **G9** (proposed) — third-party organisational reporting | 2 (W202, W203) | Y4 Q16 | proposed, never ruled |
| **G8** (proposed) — third-party model processing | 2 (W146, W147) | Y3 Q12 | proposed, never ruled |
| **G6** — public directory launch | **1** (W185) | **Y2**, via the Ahpra review ask | yes |
| **G3** — live SMS | 1 (W174), and nothing without G1/G2 | Y1 | yes |

Three things fall out of that table, and each is a reason to read this document rather than the
quarter dossiers separately.

**The decision open longest releases the fewest units.** The Ahpra advertising review has been
asked for in the Y2 dossier, the Q9 dossier, the Q15 dossier and now this one — more than a year
of build. It unblocks exactly one unit, W185, and W195 established that W185 still needs pages
nobody has written. G6 is the cheapest gate to open and the least urgent to.

**The most time-critical decision has no gate number.** Q9 called its action 1 "the only
genuinely time-critical item" in that dossier. It is not G-anything. W133's row carried
`FOUNDER GATE G6` for two quarters — a label that is simply wrong, since W133 routes in-network
and renders nothing public — and W195 corrected it. **A decision with no number was invisible to
every sweep that looks for `FOUNDER GATE G\d`**, including W168's own ledger-integrity check,
which required that pattern and so was *enforcing* the mislabel. That check now accepts a named
decision pointing at a dossier.

**Four of the thirteen blocked units wait on gates nobody has ruled on.** G8 and G9 were both
PROPOSED by build units — W104 and W156 — because the loop reached a boundary no existing gate
covered and correctly refused to decide it. Neither has been ratified or rejected. That is a
different state from "closed": a closed gate is a decision, and these are the absence of one.
Units built behind an unratified gate are units built behind a guess about what the founder would
want.

## G5 — clinical content sign-off

**Releases seven units, and it is the only gate whose cost is mostly other people's time.**

W169's dossier priced this and nothing has changed the analysis. What has changed is the
scaffolding around it: Y4 added W157's vertical model, W158's outstanding-work report and W191's
dermatology assembly, so the day content arrives it has somewhere to go and the tree can say
exactly which member is missing and who has to act on it.

W191 is worth reading before scheduling this. It declares the dermatology vertical and refuses
it, naming five members and the gate each waits on — two pathways needing W119's
reviewer-then-signatory chain, one content record needing the founder signature, one education
item needing only an author and no gate at all, and one interval waiting on the W56 values
ruling. **One of five members needs no founder decision whatsoever**, which is the sort of thing
a flat "blocked on G5" hides.

**W56 is the shape to copy.** Its container shipped with an empty catalogue — zero intervals is
zero clinical content, so it cannot breach G5 — and the loader enforces the gate rather than the
values doing it. The row is explicitly marked *not a decision*. Nine registries now ship empty on
the same argument.

## G6 — public directory launch

**Releases one unit. Priced in full in `docs/GATE-DOSSIER-Q15.md`; three points carried here.**

G6 does not open specialist titles. W114 ruled separately that Meherr publishes none at all, and
W187 made the consequence concrete: `renderProfile` refuses a specialist profile outright,
because any honest wording contains the protected word. That survives G6 untouched and is Q9's
action 4.

G6 does not produce a directory. Seven modules, ~3,200 lines, 133 tests, and **zero consumers** —
no page in the tree imports `src/directory/`. W185 is where the pages get built.

The ask is unchanged and is now in its fourth dossier: **commission the Ahpra advertising review,
or write "prototype only" in `BUILD-STATE.md` and close it.** The Y2 dossier said exactly this and
nothing was written down, which is why it is still here.

## G9 (proposed) — third-party organisational reporting

**Releases two units, and W204 found that opening it reverses a decision already made.**

Q16 built the reporting model, the suppression rules and a console the practice reads about
itself — deliberately with no recipient parameter, no delivery and no send control, because G9 is
unratified. W199's page says so on the page, and an e2e walks every control asserting none offers
to send.

**The consequence to price, which is not in any quarter dossier:** today nothing is stored,
because a report is recomputed from live rails and storing one would create a copy erasure cannot
reach. The day G9 opens, **a disclosure log becomes mandatory rather than optional** — accountable
disclosure requires knowing what was disclosed, and a product that recomputes cannot answer "what
did we tell them in Q2?". The retention posture that is safest while nothing is sent is the wrong
posture the instant something is.

W204 proposes seven years, matching the tree's health-records posture, and names the question it
declines to settle: **does the log hold the FIGURES that were sent, or only the fact of sending?**
The first answers the question fully and makes the log a lasting copy of practice-identifiable
data. The second is cheap and half-useful. That is bundled with the G9 ruling.

## G8 (proposed) — third-party model processing

**Releases two units (W146, W147), proposed at W104, never ruled.** Carried unchanged; no Y4 unit
touched it and nothing new is known. It is listed here only because a proposed gate that nobody
has ratified in four quarters is easy to mistake for a settled one.

## G3 — live SMS

**Releases one unit and, as `docs/GATE-DOSSIER-Q14.md` established, opens nothing on its own.**
G3 is the third of three gates on the same path: you need a real patient (G2), a real record of
who they are (G1), then permission to text them. The honest ask remains "decide whether G1/G2 are
being pursued at all", not "open G3".

## What is asked, in the order the arithmetic suggests

1. **Rule A or B on cross-boundary credential visibility** (Q9 action 1). Open since Y2, called
   time-critical then, mislabelled as G6 for two quarters, and still the answer W133 waits on.
   *Releases: W133; makes W131/W137 useful.*
2. **Ratify or reject G8 and G9.** Four units wait on gates that are neither open nor closed. The
   loop proposed both and must not decide either. If the answer is "not this year", saying so
   converts four blocked units from *pending* to *decided*, which is worth more than it sounds.
   *Releases: W146, W147, W202, W203 — or closes them.*
3. **Engage clinical reviewers for G5.** Largest by units and the longest lead time, because it
   needs people rather than a decision. W191 shows exactly what dermatology needs and which
   member needs nobody. *Releases: seven.*
4. **Commission or explicitly defer the Ahpra advertising review** (G6). Fourth dossier.
   *Releases: W185, which then needs pages built.*
5. **Decide whether G1/G2 are being pursued**, which is the real question behind G3.
   *Releases: nothing until answered; W174 waits on it.*
6. **Ratify or overturn the W114 specialist position** (Q9 action 4). Still cheap, still a product
   decision a build unit made, now with a concrete consequence attached by W187.
   *Releases: nothing; costs more later.*

## What this dossier deliberately does not do

It does not re-price G5, G3 or G6 — `docs/GATE-DOSSIER-Q13.md`, `Q14` and `Q15` do that and are
unchanged. It does not argue for or against any gate opening. It does not carry the founder
actions from the quarter dossiers verbatim; where an item is unchanged it says so and points at
the original, so a founder reading both does not have to work out whether the wording drifted.

## Verification

Every unit count above was derived from `BUILD-STATE.md` by listing rows with status `blocked`
and reading the gate each names, not from the quarter dossiers — and the counts are pinned by
`src/quality/gate-dossier-y4.test.ts`, which re-derives them so the document cannot quietly go
stale.

The pin is **row by row on the table above**, not "every blocked id appears somewhere in the
document". That distinction was found by breaking it: deleting SUP-2 from the G5 row left the
first version of the test green, because SUP-2 is still named in the prose below. Mentioned is not
counted, and this document exists only for the counting. The table's rows must now name exactly
the units the ledger attributes to each decision, and every blocked row must appear in exactly one
of them — so a unit can no longer be dropped from a total, or paid for twice.

That test earned its place before this dossier shipped. The first draft said **eleven** blocked
units; it is **thirteen**. The count came from a grep requiring the `**FOUNDER GATE` bold prefix,
and SUP-1 and SUP-2 name their gate mid-sentence — so two units waiting on G5 were missing from
the arithmetic of a document whose entire purpose is the arithmetic. The same test also caught a
matcher that read W195's *"corrected this attribution FROM G6"* as an attribution TO G6, which is
the mislabel the correction removed, reappearing in the tool built to check for it. The G6
figures come from `docs/GATE-DOSSIER-Q15.md`, whose own claims are pinned by
`src/directory/dossier-claims.test.ts`. The claim that W133 is not blocked on G6 is
`docs/GATE-DOSSIER-Q9.md`'s, quoted there and pinned by the same test file.
