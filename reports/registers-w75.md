# Multi-condition register simulation — 26 weeks (synthetic)

Three registers active at once on seed 20260808. W63 showed one register does not
break the loop; this run exists to exercise what only appears with several — patients on
more than one register, and the double-contact and double-counting that invites.

| Register | Cadence | Flagged share | Open gaps at start |
|---|---|---|---|
| placeholder_register_a | 12 months | 30% | 99 |
| placeholder_register_b | 6 months | 25% | 107 |
| placeholder_register_c | 24 months | 20% | 35 |

Register members: 2,289, of whom 32 are on more than one register. Their appointments count toward every register they are on, which is why cohort figures are never summed to a practice total.

Invitations sent: 1,177.
Opt-outs: 8. Generated bookings attended: 237.

Invariants: held — checked with the same checkInvariants() the fleet run uses, not asserted in prose.

Synthetic data only. The register fixtures carry placeholder cadences, not clinical guidance; real intervals arrive with W56 behind the G5 ruling.
