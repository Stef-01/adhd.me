# Attribution definitions — v1

> Implemented by `src/engine/attribution.ts` (`ATTRIBUTION_VERSION = "v1"`). Code and this
> document change together; golden-fixture tests in `src/engine/attribution.test.ts` pin the
> arithmetic. Any change to these definitions is a new version, never a silent edit.

## The claim Meherr makes

**Incremental attended appointments**: the number of attended appointments in the invite arm
above what the holdout arm's organic rate predicts. Nothing else is ever presented as impact.

```
incrementalPer1000  = inviteArm.attendedPer1000 − holdoutArm.attendedPer1000
incrementalAttended = incrementalPer1000 × inviteArm.patients ÷ 1000
```

## Arms

- Arm membership is the patient's stored `holdout` flag, assigned by stable hashing (W8) at
  the practice-configured rate. Holdout patients are **never invited** (enforced in the W4
  eligibility engine as exclusion reason `holdout_arm`).
- **Intention-to-treat**: a patient stays in their arm for counting regardless of what happened
  after assignment — opted out, ignored every SMS, changed clinician. Removing "non-compliers"
  from an arm is selection bias and is forbidden.

## What counts

- Appointments with status `attended`, whose patient holds a stored arm at the counting
  practice, with a start date inside the measurement window (inclusive of both endpoints,
  practice-local dates).
- **All** attended appointments in each arm count — organic and invitation-generated alike.
  The subtraction against the holdout arm is what isolates Meherr's contribution; counting
  only "generated" bookings would ignore displacement (see below).
- Multiple attended appointments by one patient each count. The unit is appointments, not
  patients.

## What never counts

- Appointments that were not attended: `open`, `booked` (not yet occurred), `cancelled`, `dna`.
  A booking is not an outcome; an attended visit is.
- Appointments outside the measurement window, or belonging to another practice.
- Appointments whose patient is not in the counted panel (no stored arm at this practice).
- `naiveGeneratedAttended` (attended appointments flagged `generatedByInvitation`) is computed
  **only as a contrast figure**. It systematically overcounts: some invited patients would have
  booked anyway, so their "generated" visit displaced an organic one. It is never impact, never
  billed, never headlined.
- No incrementality claim exists without a holdout arm. If the practice's holdout is empty,
  `incrementalPer1000` and `incrementalAttended` are `null` — not zero, not an estimate.

## Honest-number rules

- `incrementalAttended` is an estimate and may be fractional or negative. Negative results are
  reported as computed — a negative window is information, not an error to clamp.
- Rates are per 1,000 arm patients so arms of different sizes compare directly.
- v1 is a point estimate only. Confidence intervals and multi-window aggregation are later
  units; nothing in v1 may be presented with more precision than a point estimate warrants.
