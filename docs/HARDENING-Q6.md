# Meherr Q6 hardening (W78)

Review sweep over the Q6 condition-targeting work: W66 condition lint, W67 template approval,
W68 clinical-safety rails, W69 G5 authoring workspace, W70 condition guardrails, W71 recall
coexistence, W72 condition attribution, W73 escalation triggers, W74 patient contact
preferences, W75 multi-condition simulation, W76 practice reporting v2, W77 dossier update.

**Outcome: zero criticals outstanding.** One MEDIUM tenancy finding fixed, one LOW hardened
pre-emptively, four observations recorded without change. Gate green at the close.

## Reviewer's note on independence

Seven of the twelve Q6 units are builder-B's own (W70–W76 less W77), and this sweep was run by
builder-B. That is a real weakness in the review and worth stating rather than glossing: the
same blind spots that produced the code are reviewing it. Two mitigations were used —
prioritising the bug *classes* that a different session (W65) had already found in this
author's code rather than hunting freely, and requiring every finding to come with a failing
test before a fix. The first finding below was found precisely because W65 had found its twin
twice; it would likely have been missed by free-form self-review.

## Findings

### Q6-1 — MEDIUM (fixed): contact preferences were not scoped by practice

`RailStore.contactPreferences` (W74) was keyed by patient id alone. Two practices holding a
colliding patient id would share one preference record.

The impact is worse than the read-leak it looks like. Preferences govern *when a patient may be
contacted*, so a collision could impose one practice's patient's quiet hours on another
practice's patient — suppressing or widening contact for someone who never expressed that
preference — and reveal that a preference had been set at all.

This is the third instance of one bug class. W65 found it in W71 (`reconcileWithRecalls`
ignored `PracticeRecall.practiceId`) and W64 (`closuresFromAppointments` did not filter by
practice); both were builder-B's code, and so is this.

**Fixed**: keyed by `practiceId::patientId`; the write path takes the practice from the
invitation's own `practiceId`, so a signed token can only ever write inside its own practice.
Regression tests in `src/booking/preferences-store.test.ts` pin the collision case in both
directions.

### Q6-2 — LOW (hardened): condition metrics had the same unscoped shape

`conditionMetricsFrom` (W70) split invitations into per-register metrics with no practice
filter. Not exploitable today — every caller passes a single practice's run — but it is the
same shape as Q6-1 and would fail the same way the moment a fleet-wide caller exists.

**Hardened**: takes an optional `practiceId`, mirroring the convention W65 established on
`closuresFromAppointments` ("required to scope; omit only for single-tenant data"). Offered
before a fleet-wide caller exists rather than after.

## Checked and clean

| Control | Evidence |
|---|---|
| Unauthenticated write path (W74 `saveContactPreference`) | Writes only against the patient the signed token names — the patient id is read from the verified invitation, never from the form. A caller cannot target another patient by supplying an id. |
| Redirect construction in that action | `redirect("/book/" + token)` interpolates a token that has already passed HMAC verification, so it is constrained to base64url with no `/`; path traversal and open redirect are both unreachable. |
| Input handling on the preference form | `Number()` on a missing or malformed field yields `0`/`NaN`, both refused by `validatePreferences`; an invalid window is rejected without overwriting the patient's previous good answer. |
| Server-action authorization (W60 `toggleRegister`) | `authorize(...)` runs inside the action, not only the page (W13), on the existing `edit_rules` grant; unknown register codes are refused rather than recorded as phantom state. |
| Error surfaces | Every Q6 redirect carries an error KEY, never a message built from input (W41). |
| Clinical-content boundaries | W73 escalations are staff-facing only and have no field for advice, severity or cause; observations pass the advice linter, and a trigger that fails it is dropped rather than emitted. W68 rails ship empty pending G5. W60's catalogue is placeholder-only and tested to name no real condition. |
| G7 / TGA boundary | Register membership remains non-inferential by schema (W55 CHECK + union type); W70's per-register signal is about which register triggered a send, not about a patient's condition, and never reaches patient copy (W66 settled that). |
| Determinism | W75's multi-register layer is hash-based and RNG-free, so adding registers does not shift the sim stream; a same-seed reproduction test pins it. |

## Observations recorded, no change made

1. **W74's preferences are not yet honoured in a live send path.** `planContact` is correct and
   tested, but nothing calls it during sending, because the send path itself is not wired
   (the same standing gap as W28/W29/W36). The preference is captured and stored honestly; it
   will not actually protect anyone until wiring lands. Flagged so the capability is not
   mistaken for an active control.
2. **Per-register opt-out attribution undercounts, by construction.** A patient who sends STOP
   after their invitations have resolved leaves nothing to attribute. W70 documents this and
   asserts per-register totals never exceed the practice-wide figure; W16 remains the authority
   on the total. Not a defect — a limit on what the per-register view can claim.
3. **Register cohorts overlap and must never be summed.** Enforced in the report copy (W76) and
   reported as `overlapCount` (W72), but nothing structurally prevents a future caller adding
   the rows up. A typed "not summable" wrapper was considered and rejected as heavier than the
   risk; the report says it in words instead.
4. **Slicing a healthy practice by register surfaces a register above threshold.** Found while
   writing W75, and left as-is: it is what W70 exists to reveal, not a false alarm. Worth the
   founder knowing that per-register guardrails will be noisier than the practice-wide one, and
   that this is the intended trade.

## Gate at close

`pnpm verify` green — typecheck, unit suite, build, `audit:gate` (2 accepted advisories, both
`image-size` via `pptxgenjs`, expiring 2026-11-09) — plus the full Playwright suite.
