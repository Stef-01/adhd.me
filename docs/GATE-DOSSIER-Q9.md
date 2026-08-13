# Q9 gate dossier (W117) — the G6 position on credential visibility

> **FOUNDER ACTION REQUIRED, and it is time-ordered.** This is a narrow dossier: it does not
> refresh every gate (`docs/GATE-DOSSIER-Y2.md` still holds for G0–G5 and G7, and Q9 changed
> none of them). It exists because Q9 built a credential registry and **Q11 W133 routes
> referrals on it** — and the plan's own verification for that unit is "never crosses G6".
> A unit cannot verify that it never crosses a line nobody has drawn.

## Why this is a unit and not a paragraph in the Y3 dossier

Q9 built eight modules that hold, verify and describe clinicians' qualifications. Nothing
serves any of it outside the practice today. The decision is therefore free to make right now,
and it stops being free the moment Q11 begins: **W131's referral document model determines
what a referral can carry**, and if it carries a credential field because the model was
written before anybody ruled, the ruling has been made by default and reversing it means
migrating documents rather than deleting a line.

This is the same argument the Y2 dossier made about G7 and the care-finder — "the boundary is
easier to rule on now than after that iteration exists" — applied to a case where the
iteration is scheduled, not hypothetical.

## G6 status: unchanged, CLOSED, and Q9 did not move it

| | |
|---|---|
| **Definition (plan §4)** | Network/directory public launch (Ahpra advertising review) |
| **Status** | CLOSED. Q9 added no public surface and no route serves credential data at all |
| **Code-level enforcement** | W109's vault requires a grant only `authorize()` can mint, and clinicians cannot obtain one; W113 scopes reads to the subject; W115's report is rendered by no route; W114 refuses "specialist"; nothing under `app/` imports the vault, asserted by a test |
| **Unchanged from Y2** | The patient-facing finder at `/` and `/finder` remains **unassessed for advertising**. Q9 did not touch it and did not fix it |

**The thing to notice is that these two facts are one risk.** An unassessed patient-facing
directory exists. A credential registry now exists. Neither is connected to the other, and the
connection is the single change that would turn a prototype directory into a regulated
advertising surface displaying practitioners' qualifications — the most heavily governed form
there is. No unit is scheduled to make that connection. That is worth writing down precisely
because nobody is planning it: unplanned connections are how the Y2 dossier's "status changed
materially without a decision" happened the first time.

## What the code currently assumes, so the founder can overturn it deliberately

Three positions were taken in Q9 by build units. Each was chosen to be safe under any ruling,
and each is the founder's to ratify or reverse:

1. **Meherr carries no specialist titles at all** (W114). "Specialist" is refused in every
   scope label, which is stricter than s 133 requires — the law permits the title where the
   practitioner holds specialist registration, a fact on the Ahpra specialist register that
   W111 can read and W114 cannot rule on. The refusal copy says so.
2. **A clinician cannot read evidence documents, including their own** (W109, restated by
   W113). Role-based access was refused because "clinician" is the role every clinical user
   holds, so granting it there grants everyone everyone else's file. Subject access to one's
   own scans is a real right and was deferred to this dossier rather than improvised.
3. **Credential expiry is absolute and re-attestation is on a three-year default for
   unstated expiries** (W112). Administration rather than clinical content, so not a G5 item,
   but a policy the founder owns; the default errs short because the asymmetry is one-sided.

## The decision Q11 needs: what may cross a practice boundary?

W133 routes a referral to an extended-scope GP, in-network only, honouring W82's capability
floor. To do that the referring side must know *something* about the receiving clinician. The
question is how much, and the three answers have materially different regulatory footings.

### Option A — capability presence only; credentials never leave the practice

The referring GP sees what W83's panel view already shows: presence and freshness, no detail.
"This clinician meets the capability floor for this pathway", with no issuer, no document, no
label.

- **Advertising exposure**: none. There is nothing to review because nothing describes anyone.
- **W133's "never crosses G6" verification**: trivially satisfied.
- **Cost**: a referring GP cannot see *why* the receiving GP is suitable, which is a real
  reduction in the referral rail's clinical value and may simply push the conversation to the
  phone — where it is unrecorded.

### Option B — credential detail practice-to-practice, inside a consented network

The referring GP sees scope statements and verification provenance, never evidence documents.
Communication between health practitioners about a patient's care is not advertising to the
public, so the Ahpra advertising guidelines are not the governing instrument — **provided**
all of these hold, and they are engineering requirements, not aspirations:

- no patient-facing surface renders any of it, enforced the way W109 enforces vault access
  rather than by page-level discipline;
- it is not searchable or enumerable by anyone outside the network;
- it makes no comparative claim — W115 already refuses to rank, and that property would have
  to hold across the boundary too;
- each clinician has consented to appear, per the point below.

- **Advertising exposure**: low, but not nil, and the boundary is behavioural: a "network" that
  any practice can join on request is a directory with a sign-up form.
- **Cost**: the consent, isolation and non-enumerability requirements are real work in Q11,
  and they must be in W131's model rather than bolted on at W133.

### Option C — a public directory including credentials

**Already closed, and not presented as live.** CLAUDE.md law 4 lists "no public directory
copy" as an absolute founder gate, and G6 governs the launch itself. Recorded here only so the
option set is complete and nobody re-derives it as new.

**This dossier does not choose between A and B.** Both are defensible; the choice depends on
how much of the referral rail's value the founder judges to sit in the receiving clinician's
detail, which is a product judgement and not a compliance one.

## Founder actions

Numbered by when they block something, not by size.

1. **Rule A or B, before W131 starts.** This is the only genuinely time-critical item in this
   dossier. W131 is the referral document model; a credential field added there before the
   ruling makes the ruling by default. *Blocks: W131, W133, W137.*
2. **If B: decide whether network appearance requires clinician consent, and at what
   granularity** — per clinician, or per practice on their clinicians' behalf. W83 already
   treats a clinician's own capability record as theirs; a practice consenting on their behalf
   would be a departure from that and should be a decision rather than an inheritance.
   *Blocks: W123, W133.*
3. **Rule on subject access to evidence documents.** A clinician cannot currently see the
   scans held about them (W109/W113). Deferred deliberately, not overlooked. If access should
   exist, the constraint is already written down: it must be scoped to the subject, never
   granted to the `clinician` role. *Blocks: nothing today; an APP 12 question that grows
   sharper as G2 approaches.*
4. **Ratify or overturn the W114 specialist position.** Meherr refusing specialist titles
   entirely is a product decision a build unit made. It is safe, and it may be wrong for a
   practice with a genuinely specialist-registered GP. *Blocks: nothing; cheap to change now,
   expensive once practices have authored labels around it.*
5. **Commission or explicitly defer the Ahpra advertising review of `/` and `/finder`.**
   Carried forward unchanged from the Y2 dossier, where it was already the third ask. It has
   now been open for a full year of build. If the answer is "prototype only", saying so in
   `BUILD-STATE.md` closes it — the Y2 dossier said the same and nothing was written down.
   *Blocks: G6 itself.*
6. **Ratify the W112 re-attestation default** (three years for an unstated expiry, ninety
   days' notice). *Blocks: nothing; a number someone should own.*

## What this dossier deliberately does not do

- It does not refresh G0–G5 or G7. Q9 changed none of them, and a dossier that restates
  unchanged gates trains its reader to skim.
- It does not rule on G5. The G5 ruling still holds W56's interval values, SUP-1 and SUP-2,
  and Q10 is G5-load-bearing throughout — that is the Y3 dossier's subject (W130), and it is
  the larger ask.
- It does not decide A or B, because that is the founder's call and a build unit pre-empting it
  is precisely the failure this unit exists to prevent.

## Verification

Dossier complete against the unit's terms: G6's current status, its code-level enforcement,
what Q9 changed (nothing, stated as a finding rather than an absence), the decision Q11 needs,
the option set with its regulatory footing, and six named founder actions each with what it
blocks. Cross-checked against `docs/GATE-DOSSIER-Y2.md` (G6 status and the carried-forward
finder question), `docs/FIVE-YEAR-PLAN.md` §4 and Q11's unit list, `BUILD-STATE.md` (blocked
rows: W56 values, SUP-1, SUP-2 — all G5, none G6), and `docs/HARDENING-Q9.md` (the four Q9
capabilities built ahead of their consumers, of which three are the subject of action 1).
