# Arjun — Hold the thread

Rebuilt 23 September 2026 at `/lives/play/arjun-hold-the-thread`, after founder review found the
card-board version "not even a game" next to Leo. It replaces the ask/pin/select board entirely.

## The game

A live meeting drawn as a room: window, wall clock, a table in perspective, Noor, Sam and Rae seated
behind it and Arjun in front. Remarks leave the speakers and drift across the room at one steady
speed in two lanes (they rise on phones). The player taps what answers the question on the heading;
each catch springs onto a three-card board. An aside that is tapped takes a card too and must be
cleared. Arjun's own ideas drift past as thought clouds: tapped, they are parked in his notebook;
missed, Arjun drifts (his face changes, the room's words blur for three seconds) and the thought
comes back later. A missed fact always comes round again, and **Ask again** brings it back at once.

Three rounds rise in pace (8.2, 7.2, 6.4 s crossings). In round three the agenda changes mid-round:
cards for the old question turn stale and have to be cleared. The wall clock's hand is the stake.
If the meeting ends first, it becomes a **recap**: the missing remarks wait still until pinned.
Nothing resets.

**Setup (untimed, in the scene):** pin the next question to the board, keep the first idea in the
notebook (already done if it was parked), and hand the follow-up to Noor or Rae by tapping them. Rae
cannot do today; tomorrow works. **Revisit:** next week's meeting starts with the pinned question,
and remarks that answer it carry a pin badge, which is the anchor made visible. Mid-meeting Sam says the
main room is booked; the notebook glows and **Use the saved idea** puts Arjun's own idea into the
stream. Without it, the idea still returns, later. Completion shows the decision and who follows up.

Two tactics work: catch everything relevant as it passes, or let the stream go and use Ask again.
Parking ideas versus ignoring them changes how much of the room Arjun can read.

## Implementation

- `src/lives/arjun-world.ts`: pure reducer, fixed 50 ms steps, three authored scenarios (a meet-up,
  a community garden, a group project). 15 Vitest cases cover every scenario to completion, first
  useful remark under a second, board capacity, duplicate/stale catches, no-stall repeats and
  recap, ask-again, drift, parking, the agenda change, setup negotiation, the revisit retrieval
  and its fallback, still mode, pause and replay.
- `app/lives/kit/`: the shared frame the live worlds use (`shell.tsx`, `use-loop.ts`, `cast.tsx`).
  Beans are drawn inline; nothing under `public/games/` is loaded.
- `app/lives/sounds.ts`: one synthesised Web Audio engine, muted by default and persisted in
  `adhdme.sound`. Arjun's D-dorian score gains layers with the stream; remarks tick, pins stamp,
  parked ideas scribble, decisions resolve.
- Reduced motion (or **Play at my pace** in pause) makes the meeting move one remark per action.

## Verification

Five Playwright cases: library entry through three rounds, setup, revisit and replay; keyboard-only
with sound on; live motion, pause freeze and the recap recovery; 320 to 1440 px widths with 44 px
targets, reachable exit and axe scans of four phases; no storage writes. Text budget: 17 to 38
words across the meeting, decided, setup, revisit and complete states.

Automated checks establish function, not engagement. Observed playtesting remains outstanding.
