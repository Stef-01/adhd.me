# Zoe — Before you send

Rebuilt 23 September 2026 at `/lives/play/zoe-before-you-send`. The fragment-assembly slice (pick a
fact, need and request chip, then propose) read as a form next to Leo and is replaced.

## The game

A phone held at night fills the frame. Rae's message arrives; Zoe's first reply types itself into a
live draft bubble, phrase by phrase, while a send fuse burns along the composer and the Send button
swells. Sharp phrases glow with a heat underline: tapping one turns it into what Zoe means
("Whatever." becomes "Oh, that's a shame.") and drops the original into a jar on the shelf, kept,
not deleted. **Breathe** holds the typing and the fuse for a moment, then needs a moment to return.
Send early once the draft is clean, or let the fuse send whatever is there.

A sharp send is not a reset: Rae's hurt reply arrives, **Say sorry** sends a short repair, and the
conversation goes on. Three messages rise in pace and in sharp phrases: a late change, a missed
call, an assumed chore (three scenarios rotate on replay).

**Setup (untimed, in the chat):** agree who checks in and when; Rae cannot do Thursday, Saturday
works. Put it in the calendar and keep the jar. **Revisit:** "Still on for our plan?" The reply now
carries the agreed plan in its own words ("Saturday at 7."), with one last sharp phrase to catch.

## Implementation

- `src/lives/zoe-world.ts`: pure reducer. 12 Vitest cases: every scenario to completion, typing and
  fuse timing, cooling into the jar, guards on untyped and calm phrases, fuse send into repair,
  breathe hold and cooldown, send gating, the Thursday decline and setup gating, the plan in the
  revisit reply, still mode, pause and replay.
- `app/lives/zoe-world/`: phone, jar and room drawn in code; shared kit, A-minor score that
  tightens as the fuse runs with sharp words left, key-tap, zip, buzz and notification cues.
- At the player's pace the whole reply appears at once and nothing sends by itself.

## Verification

Six Playwright cases: library entry through three replies, setup, the revisit and replay; a sharp
send repaired with the feeling kept; keyboard-only with sound on; real typing, breathe, pause and
the fuse sending; 320 to 1440 px including landscape with axe scans of four phases; no message text
in storage. Text budget: 16 to 34 words.

Function is tested; engagement is not. Observed playtesting remains outstanding.
