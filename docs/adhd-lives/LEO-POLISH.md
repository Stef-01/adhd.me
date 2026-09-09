# One game at a time: Leo and the mosquito

Approved direction, 2026-09-08: clone the latest app and the supplied game repository, follow the
Lives plan, and create and QA one game at a time before expanding.

## Baselines

- ADHD.ME: `e106993` (L2–L4, ten playable engines and the learning/toolkit layer).
- Reference: `roncrisostomo/dumbwaystodieclone`, `06f473fe917da967fb6a2374bcc1631283b1cd96`.
- Fresh local clones: `learning-character-games` and `dumbwaystodie-reference` beside the prior checkout.

## Reference mechanisms actually inspected

- `WaspMGSceneMaster.cs`: level-dependent target count, count remaining targets, stop input at the result.
- `Wasp.cs`: bounded flight, facing the travel direction, MOVING → PRESSED → FALLING → DISABLED;
  a short hit hold precedes falling, and movement pauses on interruption.
- `Character_Beige.anim`: four sprite poses at 0, .125, .25 and .375 seconds; an eight-frame-per-second,
  half-second loop, with a separately positioned shadow. Its sprite GUID resolves to
  `Textures/Kenney/alienBeige_walk_swim.png`, not an executable browser animation.

These mechanisms are implemented in TypeScript/React with original Leo/bedroom/mosquito artwork.
The Unity project is a reference checkout, not a shipped dependency. No SDKs, audio or Unity binaries
are imported. The source does not include a repository-wide licence; no source code is copied.

## This game's finish line

One bedroom scene, one instruction, insects as targets rather than labelled circular form controls.
Leo stays in bed; four-pose character movement and wings stop when paused or motion is reduced.
Hits leave a brief visible response before disappearing. Missed taps change the mosquito's expression,
not the instruction's position. The existing seeded layout, difficulty and session director remain authoritative.

The same engine renders in the Chaos Run and in a dedicated replayable practice at
`/lives/play/leo-mosquito`, reached from Learn and Leo's character card. Practice has an untimed option,
pause/resume, replay and an optional link to the existing sensory strategy module. Practice performance
does not write personalisation, module completion or arcade scores.

Motion weighting: Jakub's production polish first, Jhey's character expression second. Existing Calm
rules govern reading and result screens; active gameplay alone moves. The user already approved
implementation, so this records the design decision without repeating an approval interview.

## QA before the next game

- Direct navigation and replay; win and timeout; repeated taps count once; input ignored while paused.
- Mouse, touch and keyboard; reduced motion and normal motion; untimed play independently selectable.
- Pausing and hidden tabs preserve elapsed time; quitting cancels pending results.
- Phone 390×844 and 320px, tablet 768px, desktop 1440px; at least 48px targets, no cutoffs.
- Automated accessibility and no hydration/page errors; all eight difficulty levels retain bounded targets.
- Screenshots reviewed against the source's four-frame clip and pressed/falling target states.
- Type checks, relevant unit/browser tests, then CI, commit, merge and push to main.

Only Leo is in scope for this pass. A second game starts after these checks pass.

## Release and visual review, 2026-09-09

The initial game merged in PR #18 (`90b48b3`), including upstream L5/L6 through `3516959`.
CI passed 249 test files and 330 browser tests. Both supplied repositories remain separate clones.

The cold screenshot review found three issues beyond the functional checks: desktop artwork
stretched horizontally; the surrounding footer/padding broke the immersive viewport; and a
disabled Skip button remained after the result. PR #19 corrects those and freezes a keyboard-focused
mosquito at its current position. The seeded Chaos Run (`?seed=leo-qa-2`) exposed the same outer
padding problem when Next received focus, so the run container now sheds its page padding too.

Reference comparison: images 3–5 informed the flat colourful scene, expressive character and one
clear action. The newer meditation reference informed the continuous coloured viewport and quiet
surroundings. The desktop reference informed visible navigation and controls without cutoffs.
The Unity wasp mechanism informs bounded flight and pressed/falling feedback; the supplied beige
clip informs the four-pose rhythm. This is original artwork, not the reference's sprite assets.

Local production QA covers 320/390/768/1440 × 844, including a fresh visit with the privacy bar,
keyboard, touch, timed/untimed, pause, page visibility, last-moment catches, replay, accessibility,
and the Chaos Run's win-to-next-game transition. Raw before/after captures and the reproduction
scripts are in the ignored `qa/_runs/leo-release/` folder of the working clone. Real-user difficulty
balancing remains the pilot work from Phase L6, not a claim made by these automated checks.
