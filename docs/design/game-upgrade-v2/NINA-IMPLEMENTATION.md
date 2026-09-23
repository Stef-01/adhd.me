# Nina — The first line

Built 23 September 2026 at `/lives/play/nina-the-first-line`, replacing the journey's borrowed
arcade rounds (`nina_start_small`, `nina_first_line` stay as arcade games) and the typed textarea.

## The game

An evening desk: rain on the window, a lamp pool, and a lined page that is the board. A pen nib
travels the page on its own, one cell at a time; the player turns it with the arrow keys, the
on-screen pad, a swipe, or a tap toward where it should go. Phrases from the brief sit on the page:
passing through one writes it into its place in the line above, so the line is always in order
whatever order the phrases were collected in. Three lines make a real small draft.

Red critic blots multiply while the pen wanders (up to six). Running into one stalls the pen for
under a second and never takes a written word. Rabbit-hole tabs ("Check 12 fonts", "Perfect logo?")
slow the pen for a while. The edge of the page stops it; nothing ends a line early. Line two changes
scope, either the moment the soon-to-change phrase is written or after a while: the old phrase is
struck from the line and its replacement appears ("Sam: it's Sunday now"). The pace rises by line.

**Setup (untimed):** the whole draft is on paper. Save it, leave a marker where the pen stopped,
and choose a concrete next step. **Revisit ("Tomorrow"):** the pen reopens at the marker, new
information arrives, and a fourth line is written onto the same draft. Completion shows all four
lines and the chosen next step.

Three scenarios: a garden flyer, an email asking for more time, a note for a job application.

## Implementation

- `src/lives/nina-world.ts`: pure reducer on a 5 × 7 grid with deterministic placement. 11 Vitest
  cases: every scenario to completion, slot order independent of collection order, blots stall
  without erasing, blot growth and cap, rabbit-hole slowing, the page edge, the scope change,
  setup gating and the marker carrying into the revisit, still mode, pause and replay.
- `app/lives/nina-world/`: desk, blot and nib drawn inline; the ink trail is an SVG line. The
  shared kit shell, loop and cast, and the B♭ major 7 score with rustle, key-tap and thud cues.
  Screen readers get a live list of the phrases still needed and where they are from the pen.
- Short landscape puts the pad beside the page; the kit now collapses its caption into the title
  bar on screens under 460 px tall, which also fixes Arjun and Jax in landscape.

## Verification

Five Playwright cases: library entry through three lines, setup, the revisit on the same draft and
replay; keyboard-only with sound on; real-time travel, swipe steering and pause; 320 to 1440 px
including 844 × 390 landscape with the pad on screen, reachable exit and axe scans of four phases;
the draft never written to storage. Text budget: 22 to 43 words (the upper figure is the draft).

Function is tested; engagement is not. Observed playtesting remains outstanding.
