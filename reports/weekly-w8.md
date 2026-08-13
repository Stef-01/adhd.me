# Synthetic Family Practice — weekly report, week 8

Week beginning 2026-09-27. Synthetic-data phase: every figure below comes from the
simulated practice; the measurement design (holdout arm, intention-to-treat) is the one the
live product uses.

## Incrementality

| Measure | This week | Cumulative |
|---|---|---|
| Invite arm, attended / 1,000 | 51.6 | — |
| Holdout arm, attended / 1,000 | 55.0 | — |
| Incremental / 1,000 | -3.3 | 109.1 |
| Incremental attended appointments | — | 355.0 |

Arms: 3,254 invite / 746 holdout patients.
Definitions: docs/ATTRIBUTION.md v1 — what counts, what never counts.

## Revenue estimate

**$28,403 AUD** cumulative, at the practice's configured
$80 AUD average billing per attended visit, applied to
incremental visits only.

Counting every invitation-generated booking (328 visits)
would claim $26,240 AUD — Meherr does not report that number as
impact, because it counts bookings rather than measuring them — in this window the holdout comparison came out higher, which a raw count cannot show either way.

## Guardrails

All guardrails clear: opt-out rate, generated-booking DNA, and complaints are all inside thresholds.

Loop this period: 1,709 invitations sent, 350 booked, 18 opt-outs, 22 DNA on generated bookings.
