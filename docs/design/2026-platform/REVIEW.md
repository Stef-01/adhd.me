# Redesign review

Specification: PLAN.md. Visual authorities: the six supplied reference images in `references/`.
Implementation baseline: `8569e79dd2eeb851ae190758fff027c3e8b49c78`.

## Reference comparison findings

1. **Images 1–2: navigation and controls.** The implemented app uses one full-width white desktop header, labelled Phosphor navigation with blue active states, restrained borders and consistent control sizing. Phone navigation remains labelled at the bottom of browsing screens. Focused learning uses an explicit All modules control and hides the mobile tab bar.
2. **Image 3: learning collections.** Module covers now occupy a two-column desktop grid and a single-column mobile stack, with original topic-specific illustrations, solid amber/green/lilac/orange surfaces, clear titles and readable duration metadata. The original small sticker assets were replaced with coherent scenes using the same character cast.
3. **Image 4: focused activity.** Open lessons have their own readable page layout and progress indication. Quiz selection, explanation and completion remain functional. The new layout removes the old horizontal-flex text collision. Learning characters provide continuity between the library and lesson pages.
4. **Image 5: interactive learning.** Everyday strategies includes a selectable example explorer that changes both the illustration and explanation: a visible reminder, a first small step, and working beside someone. Finding a GP includes a three-layer interactive care diagram, with each selected layer explaining a part of the route. Every module now has distinct topic artwork, and quizzes have correct/reflect/completion reactions. These use original vector artwork and public educational examples; they do not create a personal support-network record.
5. **Image 6: desktop composition.** The dark framed window and floating desktop dock have been removed. The finder uses a search column and supporting guide; profile controls use the available desktop width; results use aligned provider rows with unclamped availability details. Public navigation and console primitives share the typography, blue controls and surface treatment.

## Defects found and addressed during visual review

- Reading text was compressed by the library-button `.learn-card` class. Reading/quiz articles now use `.learn-lesson` with an independent layout.
- Historical navigation and ambiguous card selectors fought the new layout. A PostCSS migration removed 53 obsolete selectors while retaining unrelated selectors from shared rules.
- The old acknowledgement text was white on the new light background. Its text colour now uses the measured muted ink.
- Settings occupied a redundant header row. The existing settings trigger now portals into the shared header, preserving the finder's existing settings content.
- A screenshot was captured before the lesson transition completed. Capture automation now waits for the visible lesson and example heading.
- Mobile navigation obscured part of focused lesson reading. It is hidden during a lesson, with explicit navigation within the module.
- The first production build identified strict indexed-access errors in the new example components. Bounded fallback selection now satisfies the compiler.

## Validation status

- Unit tests: **234 files, 3,742 tests passed**.
- TypeScript: passed after the indexed-access correction.
- Impeccable detector on new visual components/styles: no findings.
- Full production browser regression run: **284 of 287 passed**. The three findings were an outdated serif assertion, a duplicate visually hidden wordmark counted as an unreachable control, and excess mobile profile spacing. All three passed subsequent targeted reruns.
- The affected 42-test run passed 41 checks, including public/console/finder accessibility, keyboard controls, compare and profile layout. Its quiz completion cursor race was corrected. The final production shell/learning run passes **25 of 25 tests**, including the new restart-versus-resume and reading-completion coverage. No second full browser suite is claimed.
- Final production screenshots: 1440px and 390px Find, Profile, Learn, lesson, quiz, care explorer, results, public FAQ and sign-in captures saved in `implemented/`.
- Responsive matrix: **38 route/viewport states; zero document or measured lesson-content horizontal overflow**. Widths include 320, 390, 430, 768, 844 landscape, 1024, 1280, 1440 and 1920 pixels. This is Chromium evidence.
- The clickable `comparison.html` pairs each of the six original references with actual production screenshots.
- Final focused learning accessibility scan: **20 scans, zero WCAG 2.1 AA automated findings** across everyday reading, finding-care reading, the first quiz question and reading completion, at 390px and 1440px. Evidence: `implemented/learning-check.json`; completion screenshots are saved alongside it.

### Duration reassessment

The final rendered Everyday strategies module contains 356 visible words over four steps; Finding a GP contains 289 over three steps. Using a planning assumption of 180 words per minute plus approximately 40–60 seconds to explore the optional three choices supports retaining the three-minute estimates on both cards. The alternative choice explanations are short and fit that exploration allowance. These are approximate content estimates, not measured participant completion times; no user timing study is claimed.

## Review limitations

Raster generation was unavailable because the workspace reported exhausted credits. No generated raster assets are claimed. An independent source/screenshot review subsequently completed and found bullet spacing, authentication width, lesson focus, URL synchronization and consent-focus/safe-area defects; all have received code fixes. The reviewer also identified the need for topic-specific art, now implemented as original inline vectors. The later art implementation agent stopped after writing its file, so root inspected and typechecked the delivered source. Safari, Firefox, physical-device keyboard and safe-area behaviour require their own browser/device evidence before cross-browser completion can be claimed.

## Final review corrections

- Provider rows use smaller portraits, gutters and arrows on mobile to preserve room for names and complete availability notes.
- Lesson headings receive focus on each step; the scroll position follows the new content.
- Search-parameter subscription keeps the Learn tab, direct links and browser Back synchronized with the visible library/module.
- Consent includes safe-area padding and blue keyboard focus outlines.
- The single-field sign-in form retains a constrained desktop measure.
- Learning bullets reserve their own space; illustrated examples now change their visual explanation.
- Finder stages use container-relative width, replacing an inherited fixed width that overflowed at 768 and 1280 pixels.
- An independent final standards review identified competing internal navigation and URL restoration. Explicit card/Continue actions now own their step; only external URL changes restore saved progress. Follow-up source review found no remaining blocker.
- Reading Finish now returns to an illustrated completion panel with the module's final takeaway and a Read again action. Completion remains explicit and device-local.
- A deeper lesson accessibility scan found inherited quiz list semantics overridden by a generic group role. Removing that override preserves the answer list's native semantics.

## Scope of the delivered redesign

The six references informed the implemented platform and learning system. Public and console work updates shared visual primitives; it is not a complete route-by-route workflow redesign. The two-column desktop library is an intentional adjustment to the plan's initial three-column wide-screen sketch, preserving the reference's horizontal illustrated covers. No personal support-network storage or new clinical workflow is introduced. Cross-browser/device checks and the repository PR merge gate remain required before production release.
