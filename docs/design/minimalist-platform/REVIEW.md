# Minimalist platform refinement

The shared platform now uses a neutral header and footer, quieter typography, flat charcoal
actions and restrained sage selection states. Learn has a bounded reading width, underline tabs,
an unboxed care-map link and softly tinted covers. Support has a narrower composer with one border.
The existing wordmark, serif questions and original character illustrations retain the identity.

This implements the October 2026 request against main at `a6f2b25`, which includes the game work
referenced by commit `1f925d8`. There are no new dependencies, content prompts or data migrations.
Game artwork and mechanics, clinical content, matching behavior and saved data remain intact.

## References

- [Things](https://culturedcode.com/things/features/): focused tasks with secondary details that step back.
- [Linear](https://linear.app/features): compact navigation and restrained hierarchy.

## Verification

- TypeScript: passed.
- Production Next.js build: passed, 111 static pages generated.
- Unit suite: 336 files passed; 4,896 tests passed and one existing skipped test.
- Browser checks: 57 targeted checks verified across app shell, typography/touch targets,
  learning panes, reading flows, My ADHD and game discovery. The initial run passed 55 checks;
  two expectations for the old library glass scope were updated and passed on rerun.
- The glass check now verifies a flat library and the retained tap feedback/WebGL behavior in a
  quick game. Its former Leo target no longer uses the glass scope in the current game implementation.
- All eight character-game entry paths and all twenty quick-game starts passed.
- Automated accessibility sweep of public routes passed at desktop, 390px, 320px and 768px.
  This uses the existing axe WCAG A/AA checks; it is not a manual accessibility certification.
- Text budget: 143 states measured with no errors; all 128 app states within their ceilings,
  median 33 words. Entry states: Support 18, Learn 42, My ADHD 27, Today 26.
- Production screenshots of five screens at 390px and 1440px show no horizontal overflow.
  Learning-card overlap checks also passed at 320, 390, 768, 1024 and 1440px.

Browser verification used local Google Chrome through Playwright. Safari and Firefox were not
run for this pass. The development capture run stalled on a later page load; the screenshots
committed here were recaptured successfully from the production server.

## Evidence and reproduction

`qa/minimalism/` contains ten production screenshots and measured layout results.
`qa/text-budget.json` contains the full word-count audit. `DESIGN.md` describes the new tokens.

Use Node 22 and pnpm 10, then run `pnpm verify`. With a production server running, captures use:

```sh
BASE=http://localhost:3417 node scripts/capture-minimalism.mjs after
BASE=http://localhost:3417 node scripts/text-budget.mjs
```

Set `PW_CHROMIUM_PATH` if using an existing local Chromium installation. The standard Playwright
configuration builds and starts its own server for the targeted checks:

```sh
pnpm e2e app-shell typography learn-panes learning-platform my-adhd.spec game-discovery
pnpm e2e a11y.spec --grep "public routes"
```
