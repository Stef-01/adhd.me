# DESIGN.md: Dumb Ways to Die 2 — The Games (structure, for the Lives player)

## Source
- URL: https://www.crazygames.com/game/dumb-ways-to-die-2-the-games
- Capture date: 2026-09-08
- Evidence: Firecrawl scrape (markdown, branding, full-page screenshot) of the CrazyGames page; the game's cover art and page copy ("How to play", "Features"). The captures live in `.firecrawl/` (gitignored: third-party pages). The game itself is Metro Trains Melbourne's; nothing of its art, characters, sound or copy is taken. What is taken is the **shape**, which is what the founder asked for, and it is recorded here so the DOM player can be checked against it.

## Design Summary
A portrait arcade of five-second microgames. The page says it plainly: "Most challenges require you to take action quickly, and as you manage to complete more successfully, the timer goes even faster. Every time you die … you lose one of the three lives you were given when you entered the challenge. Once it's over, you get a total score and a star rating." The cover is a flat cartoon world — saturated greens, rounded bean characters with dot eyes, a bold condensed display face, a big yellow PLAY pill.

## Structural tokens (observed on the page; the game's interior is inferred from its copy)

### Screen order
1. **Title** — world behind, the name large and centred, one PLAY pill (observed: cover + "PLAY").
2. **Map / hub** — "different areas each with unique challenges", "high scores for each area" (observed in copy). Ours: the home screen is the hub, with one PLAY; areas become the eight lives on `/lives/characters`.
3. **Microgame loop** — instruction shouted, the timer bar drains, one gesture, instant success or failure, straight into the next (copy: "think fast", "take action quickly"). ~5 s.
4. **FASTER** — the ramp is explicit ("the timer goes even faster"); one-word card between games.
5. **Game over** — total score, "a star rating out of 3", high score per area (copy). Ours: score, moments survived, AGAIN — stars refused (PRD v2 §62 wants discoveries, not a grade).

### HUD (inferred from the genre and the copy; PRD v2 §60–§61 confirms)
- Instruction: top-centre, uppercase display face, one to three words.
- Timer: a bar directly under the instruction, full → empty, the one clock.
- Lives: three marks top-left; a lost life greys out.
- Score: top-right, tabular digits, climbs on success.
- Scene: everything below, edge to edge; the character in it; the things to tap are big.

### Colours (page branding, observed) — NOT ours; recorded for contrast only
- CrazyGames chrome: primary #6842FF, background #0C0D14, Nunito 16px, 30px radius pills.
- Cover art: grass green, sky blue, pink/blue beans, cream display type, yellow PLAY.
- Ours stays inside the app's tokens (`--accent`, `--paper`, `--route-soft`, `--accent-soft`); the beans are the eight lives' own colours (`app/lives/bean.tsx`).

### Typography
- Observed: a bold condensed display face for the title; Nunito for the page.
- Ours: Newsreader for the shout and the big score (the app's display face), the sans for the rest. Uppercase on the shout only.

### Shape language
- Rounded everything: beans, pills, 30px radii. Ours: 999px pills, 20px scene radius on desktop, full bleed on a phone.
- Big targets: the copy's "use the left mouse button" games are one-tap; targets read as at least a thumb. Ours: 48px floor at design scale (`MIN_RADIUS` in `src/lives/layout.ts`).

## Components (as built in `app/lives/`)
- `Hud` (`run.tsx`): lives left as three small beans, score right, in the play housing.
- `.lives-shout`: the instruction line.
- `.lives-clock`: the draining bar.
- `.lives-scene` + `.lives-field`: the 390×560 design box; things placed by percentage.
- `.lives-faster`: the one-word card, accent background.
- `Results` (`results.tsx`): score → AGAIN → familiar → try.

## Page Patterns
- Portrait, 390 design width (PRD v2 §87), scales up to 640 on desktop with the scene rounded.
- No bottom navigation inside a run (PRD v2 §27); the X top-left leaves.

## Content Style
- Shouted imperatives, ≤ 3 words: SWAT! · LOCK IN! · DON'T! · JUST MILK!
- Comedic failure lines, one sentence, in the character's life: "Sent. All fourteen of them."
- Never a grade, never a diagnosis; the score is entertainment.

## Agent Build Instructions
1. Keep the four beats on one clock: intro (≤ 0.8 s) → active (2.5–7 s) → resolution (≤ 1.5 s) → transition (≤ 0.35 s).
2. The instruction is the only text inside a microgame; everything else is a thing to touch.
3. Every difficulty step changes count, similarity, radius or path width, not only time (PRD v2 §58).
4. Under reduced motion there is no clock and every beat ends on a button; the QA and the browser suite drive that path.
5. Before any learning: the score, then AGAIN, then a rule. Learning never visually outweighs AGAIN.

## Measured with clone-site (2026-09-08, `--analyze-only`)

The `clone-site` skill (cth9191/site-clone) was run on the page with its probe bundle preloaded
(surface map, motion probe, tokens at 1440/768/390), and the game was driven in-frame to its
hub, an area and two minigames. The full `TEARDOWN.md` and probe JSON are in the session's
scratch output (third-party page; not committed). What it settled, with the skill's tags:

- **The host page is DOM; the game is an opaque canvas** in two nested cross-origin iframes
  (992×558 at 1440). No GPU canvas on the host, no GSAP, no Lenis; transitions only — CONFIRMED.
  Every claim about the game's interior below is OBSERVED from screenshots, not read from a
  runtime.
- **Title → hub map → area card → minigames → between-game card.** Five areas on a map, each
  with a three-star arch; the area card lists its four minigames by name, shows "Your Best",
  and has one PLAY pill — OBSERVED. Ours: home → run; the eight lives stand in for the areas,
  and stars are refused (PRD v2 §62).
- **The timer is the top edge**: a dark strip along y=0 that shrinks from the right — OBSERVED.
  Ours: the same single clock, as a rounded bar directly under the shout.
- **Two-line instruction**: the game's name large in a bold serif ("Tie the rope"), the verb in
  small caps under it ("JOIN THE STRANDS"), pause top-right, nothing else on screen during play
  — OBSERVED. Ours shouts the verb (PRD v2 §4) and shows the title small above it on the intro
  beat only.
- **Lives and score are drawn between games**, on a "LEVEL COMPLETE" card with the score large
  and the three characters in lockers — OBSERVED. Ours keeps a small HUD during play (PRD v2
  §60–§61) and says "One life gone" on the resolution beat.
- **Failure is a picture**: the character in the water, then on — OBSERVED. Ours: a line and a
  dip, then on (§61).
- **Host tokens** (for contrast only, not adopted): Nunito 400/700/800/900; 16/24 body; 16px
  card radius, 30px pills; primary #6842FF on #0C0D14 — CONFIRMED.

## Rerun Inputs
workflow: firecrawl-website-design-clone
source_url: https://www.crazygames.com/game/dumb-ways-to-die-2-the-games
target_stack: Next 15 / React 19 / CSS (this app)
output: docs/adhd-lives/DESIGN-dwtd2.md
