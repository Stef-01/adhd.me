# Register simulation — 26 weeks, registers off vs on (synthetic)

Same seed (20260808) run twice, changing only whether the care-gap register is active,
so every difference below is the register layer and not a different random world. Both
arms keep their holdout, so each figure is measured per docs/ATTRIBUTION.md rather than
compared raw.

## What this does NOT show

The interval driving the register is a FIXTURE citing a placeholder source, because the
real guideline values (W56) are blocked pending a founder G5 ruling. This compares the
MECHANISM — what narrowing and reordering do to sending — and makes no clinical claim.
A 12-month fixture cadence is not a recommendation that
anything be reviewed every 12 months.

It also shows no benefit, and cannot. The synthetic world models NO relationship between
having a care gap and responding to an invitation — response rate is drawn identically for
every patient. So the register arm should not be expected to convert better here, and any
difference between the two incrementality figures is sampling noise, not evidence. In
particular a negative on-arm figure means the narrowed arm is too small for its holdout
comparison to resolve, not that registers harm patients. Whether care-gap patients actually
respond differently is an empirical question a pilot answers (G4), never this simulation.

## Arms

| Measure | Registers off | Registers on | Delta |
|---|---|---|---|
| Invitations sent | 2474 | 412 | -2062 |
| Booked | 515 | 82 | -433 |
| Attended (generated) | 486 | 76 | -410 |
| Conversion | 20.8% | 19.9% | -0.9 pts |
| Opt-outs | 27 | 2 | -25 |
| Expired offers | 1916 | 329 | -1587 |

## Measured incrementality (holdout-based, each arm on its own)

| Measure | Registers off | Registers on |
|---|---|---|
| Incremental attended / 1,000 arm patients | 71.2 | -33.8 |
| Incremental attended | 231.6 | -110.1 |
| Naive generated count (contrast only, never impact) | 486 | 76 |

Register configuration: 30.0% of the panel flagged,
care gap required to invite.

Sample-size warning: the register arm sent 412 messages against
2474 — 17% of the unnarrowed volume. Read its incrementality figure
with that in mind; a point estimate on a small arm is a wide interval reported as a number.

Invariants: held in both arms — each run replays from its own event spine.
