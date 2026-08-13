# Specialist-supervision hooks — design only (W89, G5-gated)

**Nothing in this document is built, and nothing in it may be built without a founder G5
ruling.** It exists so that when supervision *is* built, the shape is already argued out and
the gates are already placed — not designed under delivery pressure by whoever picks up the
unit. The ledger rows it implies are recorded as `blocked` for the same reason.

## What "supervision" would mean here, and what it must not

Meherr's Y3–Y4 direction is GPs building focused practice around conditions they see
often, with specialist input available. The supervision hook is the seam where a specialist's
judgement enters a GP's workflow.

The thing to be careful about is what that seam implies about **responsibility**. A GP is
independently responsible for their patient. Software that appears to place a specialist
between the GP and the decision does two harmful things at once: it invites the GP to defer
on a decision that remains theirs, and it exposes a specialist to responsibility for a
patient they have never seen. Neither is fixed by a disclaimer.

So the design rule, which every hook below is a consequence of:

> **A supervision hook may make specialist knowledge available. It may never make a
> specialist a party to an individual patient's care unless that specialist has explicitly
> accepted that patient.**

Those are different products, and the second one is not what any of the units W79–W88 are
building toward.

## Three hooks, in increasing order of what they commit

### 1. Content authorship (already built, unused)

W69's authoring workspace. A specialist drafts and reviews condition content; the founder
signs it off; the content becomes usable. The specialist's relationship is to the **content**,
never to a patient — they are an author, and the audit trail records exactly that.

This is the only hook that exists in code today, and it ships with nothing signed off.

**Gate**: G5, already enforced in `src/registers/authoring.ts`.

### 2. Cohort-level review (design only)

A specialist reviews **de-identified aggregate** patterns for a condition across a practice —
"of the 40 patients on this register, 12 have had no review in 18 months" — and comments on
the *pathway*, not on people.

Two constraints make this safe, and both need to be structural rather than procedural:

- **The specialist never sees an identifier.** Not a name, not a patient id, not a
  free-text field that could carry one. The W33 `patientRef` one-way hash is the existing
  mechanism; a cohort view would be built from counts, not rows.
- **The output attaches to the register, not to a patient.** A comment lands on the
  condition's pathway record (W69 content), where it goes through review and sign-off like
  any other clinical content. It cannot land on a patient's record, because there is no
  route for it to.

**Gate**: G5 for the content produced; G2 for anything touching real patient data.

### 3. Named-patient consultation (design only, and deliberately last)

A GP asks a specialist about a specific patient. This is the hook that crosses the line
above, and therefore the one that changes what Meherr is: it is a referral-adjacent
clinical service, not scheduling software.

If it is ever built it needs, at minimum:

- explicit specialist acceptance of that patient, recorded, before any clinical detail is
  shared — acceptance is an act, never a default or a setting;
- the patient's informed consent to a third clinician seeing their information, which is a
  collection-and-disclosure question under APP 6, not a UI checkbox;
- professional indemnity arrangements for the specialist that Meherr has verified rather
  than assumed;
- a defensible answer to whether the resulting artefact is a medical record, and whose.

**None of that is a software problem, which is the point.** Recording it here is what stops a
future unit from arriving at hook 3 by incremental extension of hook 2 — the path where each
step looks small and the destination is a regulated clinical service nobody decided to build.

## What this means for the units around it

| Unit | Relationship |
|---|---|
| W69 | Hook 1, built, empty. The workspace is the supervision surface that exists. |
| W84–W87 (routing) | Routes **within** a practice's own panel. Nothing here routes to a specialist, and the design rule above is why that boundary is worth keeping explicit in the routing code's comments. |
| Y3 Q11 (GP-to-GP referral rails) | The closest existing plan item to hook 3, and it is GP-to-GP rather than GP-to-specialist. Whoever takes it should read this document first: the same responsibility question applies, and the answer there is that a referral **transfers** care explicitly rather than blurring it. |
| Y4 Q14 (specialist-agreement sampling) | Cohort-level, so hook 2. It measures whether GP decisions agree with specialist judgement in aggregate; it must not become a mechanism for specialists to review named patients. |

## Blocked rows this implies

Recorded so they exist as rows rather than as an assumption:

- **Cohort-level specialist review (hook 2)** — blocked on G5. Buildable as a de-identified
  aggregate view whose output is register content; not buildable as anything patient-linked.
- **Named-patient consultation (hook 3)** — blocked on G5 **and** a founder decision that is
  not really about clinical content at all: whether Meherr is willing to become a party to
  individual clinical care. That is a company-direction question, and it should be answered
  as one rather than discovered through a feature.

## Verification

This unit's gate is "docs + blocked rows", which is what it delivers: the design above, and
the two rows recorded in `BUILD-STATE.md` as blocked with their reasons. No code ships, no
schema changes, and the existing G5 enforcement in `src/registers/authoring.ts` is unchanged.
