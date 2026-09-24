# Maya — One thing at a time

Built 23 September 2026 at `/lives/play/maya-one-thing-at-a-time`, replacing the journey's borrowed
arcade rounds (`maya_crossing`, `maya_layers`, `maya_turn_it_down` stay as arcade games).

## The game

A station concourse seen from above. Crowds flow along lanes at different speeds; Maya steps one
square at a time (arrows, the pad, a swipe, or a tap toward where she should go) from the entrance
to the marked gate. A crowd reaching her square bumps her back a row and raises a fictional
"room to think" meter; nothing ends the crossing. An announcement speaker pulses and only lands if
she is close. From the third crossing the phone pings, piling up cards over the view until they
are dismissed. Benches recover the meter fastest, calm rows slowly, crowd lanes not at all. When it
empties she will not step forward until she has recovered somewhere calmer; sideways and back work.

Three crossings rise in pace and add the speaker and the phone. **Setup (untimed):** quiet the phone,
choose headphones or the quieter way, and agree to meet Ari by the clock. **Revisit:** next week the
usual gate has a queue and the platform has moved; do-not-disturb stops the pings, headphones soften
the announcement, the quieter way thins every crowd. Completion: Ari finds her.

At the player's pace (reduced motion or the pause toggle) the crowds move one step each time Maya
does, and dashed outlines show where each crowd will be after the next step.

## Implementation

- `src/lives/maya-world.ts`: pure reducer on a 5 x 7 concourse, three authored scenarios (station,
  university building, market). 12 Vitest cases: every scenario with both eases to completion,
  crowd bumps, bench versus calm recovery, the full-load forward block, speaker range, pings,
  walls and the gate, setup gating, each boundary's revisit effect, still mode, pause and replay.
- `app/lives/maya-world/`: crowds, benches, speaker, gate and queue drawn inline; the shared kit,
  E-flat mixolydian score, footsteps, chime and phone-buzz cues. Muted by default.

## Verification

Five Playwright cases: library entry through three crossings, setup and the changed revisit with
the pad; keyboard-only with sound on; real-time flow, a bump that is not a failure, pause; 320 to
1440 px including landscape, reachable exit and axe scans of four phases; no storage writes.
Text budget: 10 to 22 words.

The legacy `e2e/lives-journeys.spec.ts` is retired: every journey it drove is now a live world
with its own suite. `app/lives/journey.tsx` and the `[journey]` route are left in place.

Function is tested; engagement is not. Observed playtesting remains outstanding.
