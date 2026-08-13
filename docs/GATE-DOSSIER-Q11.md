> **THE DECISION THIS DOSSIER ASKED FOR IN Q9 IS NOW A BLOCKED LEDGER ROW.** W117 said the
> A-or-B ruling on credential visibility was the closest thing to time-critical in the plan and
> that building W131 to the safe intersection would move the deadline to W133. That is exactly
> what happened. W133 is `blocked`, and this dossier is the accounting.

# Q11 gate dossier (W143) — the G6/G7 position on GP-to-GP routing

Narrow, like its predecessors. `docs/GATE-DOSSIER-Y2.md` holds G0–G5, `docs/GATE-DOSSIER-Q9.md`
sets out the credential-visibility question, and `docs/GATE-DOSSIER-Y3.md` traces G5. This one
covers what Q11 changed and nothing else.

## What Q11 built, and what it deliberately did not

Eleven units of GP-to-GP referral rail: a structured document, a return report, an acceptance
protocol, status tracking, loop closure, a both-sides console, a compliance linter, a scoping
sweep and analytics. **W133 — routing a referral to a named clinician at another practice — was
not built, and is the only unit in the quarter that was not.**

| | |
|---|---|
| **G6 status** | CLOSED, unchanged. Q11 added no public surface |
| **G7 status** | CLOSED posture holds; Q11 tested it in a new place and it held |
| **New in the tree** | A rail that moves patient-linked records between two practices, entirely inside the console |

## G6 — why W133 has no safe intersection, when everything else did

The pattern of this whole year has been to find the gate-safe subset and build that. W56 shipped
a loader with no values. W114 shipped scope-statement machinery with no statements. W131 shipped
a referral document with no credential field. W137 shipped a console that shows no credential
detail. Each is valid whichever way the founder rules, so each unblocked its chain without
pre-empting a decision.

**W133 is the one where that move does not exist, and it is worth being precise about why.**
The unit's content *is* the decision:

- Under **option A** (capability presence only), routing shows "this clinician meets the floor"
  and nothing else. Buildable — but if the founder wanted B, the referring GP never sees why a
  receiving clinician is suitable, and the rail's clinical value is materially reduced. Building
  A and later switching to B is not an addition; it changes what a referral carries and what
  every already-sent referral meant.
- Under **option B** (detail inside a consented network), routing carries credential provenance
  across a practice boundary. Buildable — but shipping it *before* the ruling is shipping
  cross-boundary credential visibility that nobody authorised, in the exact quarter the Q9
  dossier said to decide it first.

There is no third thing that is true under both. A referral either shows a receiving clinician's
credentials or it does not, and the unit exists to make that choice.

**What Q11 preserved for the founder.** Because the surrounding units were built to the
intersection, the ruling is still free to make:

- `ReferralDocument` (W131) carries no credential field **and names no receiving clinician at
  all** — only a receiving practice. A source-reading test asserts the omission is documented,
  so it reads as a decision rather than a gap.
- The console (W137) shows no credential or capability detail and says so on the page.
- W123's capability binding, which is where "who may be offered this" already lives, is
  practice-scoped and untouched by the rail.

So option B remains implementable without migrating documents. That was the point of the
intersection work, and it held.

## G7 — the boundary tested in a new place

Q11 is the first quarter where the product moves a patient's care between two organisations, and
the TGA question that arises is different from Q10's: not "does software decide the pathway" but
**"does software decide who provides the care"**.

The posture that emerged, recorded because it generalises:

- **The product never selects a clinician.** W123 answers "may this clinician be offered this
  pathway" — a yes/no per clinician, deliberately not W82's ranking, because an ordered list of
  clinicians for a clinical pathway is a recommendation about who is better.
- **The product never decides that care transferred.** W134 requires an explicit recorded
  acceptance; there is no timeout, no assumed handover, and no state in which nobody is watching.
- **The product never concludes from silence.** W135 reports `unknown` rather than inferring, and
  reports disagreements between its two state machines rather than resolving them.
- **The product writes no clinical text.** W131 and W139 draw the line: G5 governs content
  *Meherr* publishes; a GP writing about their own patient is professional communication this
  product neither generates nor edits.

**My reading is that this sits inside G7's stated default**, because every clinical judgement in
the rail is made and recorded by a person, and the software's outputs are all statements about
the record. The founder should sanity-check that reading, but nothing here needs a ruling to
proceed.

## What is NOT covered and should be, before Q12

Two things the rail assumes and does not yet enforce, recorded now rather than discovered later:

1. **There is no agreement between the two practices.** The rail moves patient-linked records
   across an organisational boundary on the strength of one practice typing another's id. In a
   real deployment that needs a data-sharing arrangement, and APP 6 (use and disclosure) applies
   to the disclosing practice. Synthetic today, so it is theoretical — but it is the same shape
   as the Y2 dossier's note about the interest register, which was also theoretical until it was
   not.
2. **Meherr's own position is documented but not contractual.** W138 states the responsibility
   and indemnity posture in code and copy. Whether the pilot agreement says the same thing is a
   founder question, and a mismatch between what the product says and what the contract says is
   worse than either alone.

## Founder actions

| # | Action | Blocks | Note |
|---|---|---|---|
| 1 | **Rule A or B on credential visibility** | W133, and nothing else now | Third dossier asking. The intersection work means the ruling is still free — but W133 is the one unit with no way around it |
| 2 | **Confirm the G7 reading above** | Nothing | Cheap now; the rail is built and the reasoning is written down while it is fresh |
| 3 | **Decide whether a practice-to-practice data-sharing arrangement is a Q12 unit or a pilot-agreement clause** | Nothing today; G2 when it opens | It is one or the other, and currently neither |
| 4 | **Check W138's posture against the pilot agreement** | Nothing | A mismatch between product copy and contract is worse than either alone |

Carried forward unresolved from earlier dossiers, unchanged and not restated here: G5 (Y3
dossier), and the Ahpra advertising review of `/` and `/finder`, now asked in four consecutive
dossiers.

## Verification

Dossier complete against the unit's terms: the G6 position on GP-to-GP routing stated with the
reason W133 has no safe intersection when every neighbouring unit did; the G7 position stated as
four properties the rail actually enforces, each traceable to a unit and a test; what Q11
preserved for the founder; two uncovered assumptions recorded; four named actions. Cross-checked
against `BUILD-STATE.md` (W133 blocked, reason recorded in the row), `docs/GATE-DOSSIER-Q9.md`,
`docs/GATE-DOSSIER-Y3.md`, `docs/SUPERVISION-HOOKS-W89.md` and `docs/HARDENING-Q11.md`.
