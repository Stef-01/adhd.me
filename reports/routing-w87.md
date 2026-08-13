# Routing simulation — 26 weeks, routing off vs on (synthetic)

Both arms are the SAME seeded run (20260808), so every difference below is the routing layer and not a different random world.

Floor for this comparison: 510 attended visits (this run's median per clinician), no credential required. 5 of 10 clinicians sit below it. The floor is derived from the run rather than hard-coded, because a floor everyone clears makes the two arms identical and the comparison meaningless.

| Measure | Routing off | Routing on |
|---|---|---|
| Decisions | 3614 | 3614 |
| Patients moved from their usual GP | 0 | 0 |
| Share moved | 0.0% | 0.0% |
| Usual-GP share of visits | 100.0% | 100.0% |

The continuity guardrail HELD THIS PLAN BACK — would_breach_share_floor, would_exceed_routed_ceiling. Nothing moved, and continuity is unchanged. This is the guardrail working, not a failure.

Unexplained decisions: 0. Every decision, routed or kept, renders a reason (W86).

Invariants: held — checked with the same checkInvariants() the fleet run uses.

Synthetic data only. Experience is derived from this run's attended visits; no clinical content is involved in the floor, which counts visits and nothing else.
