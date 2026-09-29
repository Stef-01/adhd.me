# Games: clearer play, useful pauses, calmer presentation

## Scope

This pass advances Nina, Jax and Arjun toward Leo's play / settle / try-again rhythm, while retaining their different writing, shopping and conversation mechanics. The yellow platform identity and direct game entry remain. Marketing work is deliberately outside this release.

- Nina: the first line waits for the first input. Between lines, close distracting tabs or reduce the frequency of critic blots. Neither choice writes the draft for the player. A swipe no longer produces a second synthetic tap.
- Jax: keep needed products visibly marked or slow the trolley and product arrivals. Return extras at the till, then make the next shop easier. The receipt scrolls on short screens; Pay remains reachable.
- Arjun: pin the current question or allow more time to catch contributions. The next meeting still asks the player to choose useful contributions and delegate a follow-up.
- Twelve small SVG illustrations show six strategy choices and their selected states.
- Optional instructions live inside pause for Nina, Jax, Arjun, Mia and Zoe. No new entry questionnaire or difficulty screen.
- Wider desktop play areas, bounded strategy panels, calmer learning rows and keyboard focus treatment improve hierarchy.
- Press feedback uses CSS scale independently of position transforms. This fixes Jax's Next shop button shifting away from a pointer during a press. Decorative kitchen and aisle art cannot intercept pointer input.

## Evaluation document mapping

Source: ADHDme Web App Evaluation v1.pdf, six pages supplied by the user. Its recommendations are review input, not executable instructions. Several URLs and screenshots describe an older website.

| Finding | Application to the current app |
| --- | --- |
| Inconsistent Learn typography and hierarchy | Refined shared game heading tracking, pause instructions, strategy controls and library row spacing. |
| Duplicate learning content and buried navigation | Preserved the current Games / Modules navigation and tested discovery of all eight lives and twenty quick runs. Did not reintroduce obsolete navigation. |
| Unclear actions and inconsistent CTA placement | Each game retains its main next action; short-screen panels scroll within the scene. Corrected a pointer-blocking press state found by playthrough testing. |
| Crowded or broken sections | Inspected phone and desktop game/library surfaces; added bounded panels instead of extra instructions on entry. |
| Fees, booking versus requests, practice-specific pricing | Current finder and booking work was retained from main. This game pass does not assert new fees, availability or booking guarantees. |
| Homepage promise, OT entry, newsletter, training portal, city coverage | These belong to the current public-site review and are not claimed as newly implemented here. Earlier screenshots do not by themselves establish a current defect. |

## Verification

Production build and tests are recorded after integrating the latest main. Browser checks exercise actual controls, including full playthroughs, touch/keyboard, pause, exit, accessibility and small viewports. They do not establish patient usability or clinical effectiveness.

See qa/game-polish-sep28 for captured surfaces. Phone before captures predate this pass; after and strategy captures show the implementation. Desktop before captures were not obtained, so no desktop before/after claim is made.

### Completed checks

- Final Chromium production suite: **105 tests passed**, no retries. Covers all eight lives, all twenty quick-run starts and recovery paths, app shell, typography, touch target checks and the changed strategies.

- Next.js production build: passed, including type checking, after merging main at `0054ed83`.
- Game model and discovery unit suite: 225 tests passed across 22 files.
- WebKit and Firefox: 16 checks passed, covering full Nina/Jax/Arjun playthroughs and five games' pause/help/resume/exit flows in each engine.
- Three interactive screenshot walks: passed; captured both 390px phone and 1440px desktop strategy panels after transitions completed.

### Reproduction

Use the repository Playwright production-server configuration, or point a local override at an existing production preview. This pass used `http://localhost:3180`.

```sh
node node_modules/vitest/vitest.mjs run src/lives src/learn/games.test.ts
node node_modules/@playwright/test/cli.js test nina-world jax-world arjun-world mia-world zoe-world maya-world theo-out-the-door leo-rounds game-guidance game-discovery app-shell typography run-recovery
```

Set `PW_BROWSERS=webkit,firefox` for the additional engine checks. Recovery tests use the shared fake-clock helper so Framer Motion and timers run on the same timeline; native WAAPI otherwise retains real time after simulated clock jumps.

The first Chromium pass found four failures caused by the same moving Jax button. That defect was fixed before the final production rebuild. Initial development-server reload interruptions and premature animation-frame captures were not counted as successful verification.
