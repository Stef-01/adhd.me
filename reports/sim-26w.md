# Meherr 26-week simulation report (W12)

Deterministic run — seed 20260808, 4000 synthetic patients,
10 clinicians, 26 weeks from 2026-08-08.
Synthetic data only (founder gate G2); SMS via mock adapter only (G3).

## Loop totals

| Metric | Value |
|---|---|
| Sessions pooled | 533 |
| Invitations sent | 2952 |
| Booked | 609 (20.6% of sent) |
| Expired on fill | 2297 |
| Opt-outs | 34 (1.2% of sent) |
| Generated visits attended | 582 |
| Generated DNA | 27 (4.4% of generated bookings) |
| Organic visits (both arms) | 5049 |

## Attribution (definitions: docs/ATTRIBUTION.md v1)

| Arm | Patients | Attended | Per 1,000 |
|---|---|---|---|
| Invite | 3254 | 4654 | 1430.2 |
| Holdout | 746 | 977 | 1309.7 |

- **Incremental attended appointments: 392.4** (120.6 per 1,000 invite-arm patients)
- Naive "generated bookings" count: 582 — contrast figure only; the gap vs incremental is displacement.

## Invariants

All invariants held.

- Holdout arm never invited: pass
- Contact-frequency caps respected: pass
- Event spine verifies + full replay matches: pass
- Every generated visit traces to a booked invitation: pass
- Compliance linter on every send: enforced at render (throws on violation)
