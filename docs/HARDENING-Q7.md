# Meherr Q7 hardening (W91)

Review sweep over the Q7 capability-graph and routing work: W79 capability schema, W80 case-mix
telemetry, W81 interest capture, W82 competence floor, W83 capability console, W84 in-panel
routing, W85 continuity guardrail, W86 routing explainability, W87 routing simulation, W88
provenance + review dates, W89 supervision hooks (design), W90.

**Outcome: zero criticals outstanding.** One MEDIUM tenancy finding fixed. Gate green at close.

## Reviewer's note on independence

Eight of the twelve Q7 units are builder-B's own, and builder-B ran this sweep — the same
weakness W78 recorded, and it has not gone away by being noticed once. The mitigation is the
same and it worked again: hunt the bug *classes* already found in this author's code rather
than reading freely.

That is not a rhetorical point. **The finding below is the fourth instance of one class**, and
it was written *in the same session in which W78 hardened a third instance of it and claimed to
have caught the pattern*. Noticing a tendency did not stop me repeating it two units later. The
honest conclusion is that this class needs a mechanical check, not more author vigilance —
recorded as a recommendation rather than pretended fixed.

## Findings

### Q7-1 — MEDIUM (fixed): the competence floor ignored record provenance

`Candidate` (W82) carries `experience`, `competence` and `interest` records, and each of those
types names a `practiceId`. `clearsFloor` and `rankByCapability` never read it.

So another practice's 500 attended visits cleared this practice's floor, another practice's
credential satisfied a credential requirement, and another practice's stated interest ordered
this practice's ranking. W84 documented "the caller owns that scope" and trusted it — which is
precisely the shape of the three earlier instances.

This matters more than the earlier three because of what sits downstream: W84's entire claim is
that routing is **in-panel**. A floor cleared by foreign evidence could name a clinician this
practice's data does not support, which is the G6 boundary the unit says it never approaches.

**Fixed**: `clearsFloor` and `rankByCapability` take an optional `practiceId`; a record naming
a different practice is treated as **absent, not valid** — fail-closed, because foreign evidence
is not evidence about this panel. `routeFor` passes its own practice, so the caller no longer
has to be right about scope for the result to be right. Three regression tests pin visits,
credential and interest separately.

## Prior instances of this class

| Unit | Found by | Shape |
|---|---|---|
| W71 recalls | W65 | `PracticeRecall.practiceId` never read |
| W64 closures | W65 | appointments not filtered by practice |
| W74 preferences | W78 | keyed by patient id alone |
| **W82 floor** | **W91** | capability records' `practiceId` never read |

All four are builder-B's code. The first three were fixed one at a time; this is the fourth.

**Recommendation (not actioned here — it is a unit, not a hardening fix):** a lint or test that
fails when a function consumes a type carrying `practiceId` without either taking a `practiceId`
parameter or reading the field. Four instances is enough evidence that author attention is not
the right control.

## Checked and clean

| Control | Evidence |
|---|---|
| Provenance conflation (W79) | Three tables, three disjoint single-valued CHECKs, three TS literals; conflation fails in SQL and in the type system. Mutation-tested at W79. |
| Self-report promotion (W80) | The deriver has no input a claim could arrive through — asserted on the input key list, so the guarantee is an absence rather than a rule. |
| Own-interest only (W81) | Acting clinician resolved from the session, never the form; `saveInterest` refuses when subject ≠ actor. Identity is exact email match with no single-clinician shortcut. |
| Enthusiasm never outranks the floor (W82) | Lexicographic partition, interest not carried below the floor; mutation-tested — additive scoring fails 8 assertions. |
| Continuity default (W84/W85) | Routing off unless opted in per register; a usual GP who clears the floor is never displaced; the aggregate guard stops wholesale rather than trimming by iteration order. |
| No unexplained routes (W86) | Explanation is total over the RoutingReason union — a new reason without copy is a type error, and there is no fallback branch. |
| Clinical-claim boundary | Routing reasons, floor-failure copy and explanations are all asserted free of clinical vocabulary; the floor counts visits and nothing else. |

## Observation recorded, no change made

**W87's comparison was vacuous on first write** — a hard-coded floor left every clinician above
the line, so nothing routed and the two arms were identical. It is fixed (the floor is derived
from the run's median), but it is the second vacuous-test instance this quarter after W60's
copy scan against the wrong page. Both were caught by reading the artefact rather than by the
suite, which is worth knowing: a green test that asserts nothing looks exactly like a green test.

## Gate at close

`pnpm verify` green — typecheck, unit suite, build, `audit:gate` — plus the full Playwright suite.
