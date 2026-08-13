# Q10 hardening (W129) — code review, security review

Quarter under review: **W118–W128**, the pathway definition engine. Versioning, approval,
criteria evaluation, escalation routing, diffing, capability binding, simulation, consent, the
audit trail, the sign-off dashboard and withdrawal.

**Result: two findings, both fixed, both mine. Zero criticals remaining — but read the first
one before accepting that.**

## Findings

| # | Severity | Unit | Finding |
|---|---|---|---|
| 1 | **Critical as designed** | W125 (mine) | A withdrawn consent read as `given` depending on array order |
| 2 | High | W126 (mine) | The audit trail's state model omitted `superseded`, so a replaced version still read as in force |

### 1. A withdrawn consent could read as given (critical as designed, now fixed)

`consentFor` took the record with the greatest `decidedAt` and checked *that record's*
`withdrawnAt`. But `withdrawConsent` returns a **new record with the same `decidedAt`** — which
is not a misuse, it is the documented and intended way to use it, chosen so that withdrawal
does not erase the period during which the consent stood.

So a record set holding both the original and the withdrawn copy — the natural contents of an
append-only consent store — resolved by **array order**. Stored one way, the patient's
withdrawal was honoured. Stored the other way, it read as `given`.

Two things about this are worth stating plainly rather than softening:

- **It was reachable through the module's own documented usage.** Nothing exotic was required.
  The unit's tests passed because every one of them held exactly one copy of the record.
- **The failure direction was the worst available.** W125's whole argument is that consent must
  never be inferred and that absence is not permission. A withdrawal silently reading as
  agreement is the precise inverse of the property the unit was written to guarantee, and it
  shipped inside the unit that argues for it most loudly.

Not live — W125 has no store and no consumer yet, so no consent was mishandled. That is timing,
not design, and it is the only reason this is written up as "critical as designed" rather than
as an incident.

**Fixed** by stating the rule over the whole record set instead of over one row: **a withdrawal
suppresses every decision made at or before it.** That is order-independent, needs no
deduplication, and leaves re-consent working, because a decision dated *after* the withdrawal is
not suppressed. A re-consent dated the same day as a withdrawal now reads as withdrawn —
day-granularity dates cannot order two events within a day, and refusing to guess is the safe
direction for consent. Five tests pin it, including both array orders explicitly.

### 2. The audit trail disagreed with the thing it audits (high)

W126's `VersionState` had three members — `drafted`, `published`, `withdrawn`. W118's
`PathwayVersionState` has four; `superseded` was missing. Publishing version 2 therefore left
version 1 reading as `published` in the audit trail while the pathway model correctly showed it
superseded.

**An audit trail that disagrees with the system it audits is worse than no audit trail.**
Somebody reconciling an incident would take "v1 was in force" from the trail — the document
specifically written to be the authoritative account — while the code said otherwise.

**Fixed** by *deriving* supersession during replay rather than adding an event kind: publishing
a version supersedes whichever version of the same pathway was in force. Deriving it means
nobody has to remember to record it, which is the same reasoning W112 used for expiry. Three
tests pin it, including that withdrawing the current version does **not** resurrect the previous
one — bringing an old version back is a fresh publication, not an automatic fallback.

## What was checked and found clean

- **W128's withdrawal, against the rest of the chain.** Builder-B's unit correctly resets both
  attestation stages on withdrawal and distinguishes `attested_before_withdrawal` from
  `not_reviewed` — the case where signatures exist on screen but predate the withdrawal, which
  would otherwise read as a bug. Nothing to add.
- **Version-hash pinning, everywhere.** Attestations (W119), escalation rules (W121), bindings
  (W123) and consent (W125) are all keyed to the content hash, and each distinguishes "written
  against another version" from "absent" with different remedial copy. Checked as a set rather
  than individually, because the value is in their agreeing.
- **Fail-closed on absence.** W120 `cannot_determine`, W121 `unrouted`, W123 `no_binding`, W125
  `not_recorded`. Each was re-read against the question "what does this return when the data is
  missing", and none returns a permissive answer.
- **The G7 direction rule.** No module in Q10 exports a function returning a pathway, and no
  fact source could hold a symptom. W120's export-list test covers its own module; the sweep
  confirmed no sibling introduced one.
- **No patient identity outside consent.** The audit trail, the registry, bindings, escalation
  rules and the simulation carry none. Consent does, by necessity, and is deliberately absent
  from the audit trail for that reason.
- **Determinism.** W124's simulation and W122's diff are both pure and order-stable; the
  simulation's independence from prior runs is asserted rather than assumed.
- **Advisories.** `audit:gate` green, two accepted, neither past review.

## Method note, and it is the same one Q9 recorded

Q9's hardening observed that its two worst findings were invisible to every test in the suite
because they were about the *file* and the *units of a number* rather than about behaviour. Q10
repeats the shape with a different mechanism: **both findings were invisible because every test
exercised a single instance of the thing.**

W125's tests each held one consent record, so the ordering question never arose. W126's tests
each covered one version, so supersession never arose. Neither gap was carelessness in the
individual test — each was a reasonable test of the case it described. The gap was that no test
asked what happens when there are *two*.

That is now a habit worth naming: **for any module that folds a collection into one answer, test
two of the thing, in both orders.** Four of the six Q9/Q10 findings would have been caught by
that one rule.

## Verification

`pnpm verify` green. Full e2e re-run.
