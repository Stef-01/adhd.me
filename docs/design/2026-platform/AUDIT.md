# Latest-app evidence for the platform redesign

Captured 6 September 2026 from commit `8569e79dd2eeb851ae190758fff027c3e8b49c78` in the isolated `codex/2026-platform-redesign` checkout. The comprehensive proposal is [PLAN.md](PLAN.md).

## Inspection method and limits

- Fetched `origin/main` from `https://github.com/Stef-01/adhd.me.git` and created a new worktree. The old checkout remains at `d83dabf` with its existing work.
- Read the latest README, PRODUCT, CONTEXT, ROADMAP, AESTHETIC, route layouts, navigation, learning content/progress, main stylesheet, and relevant browser tests. Historical statements in these files were treated as project context rather than a replacement for the user's new design brief.
- Installed the unchanged lockfile with Node 22 and pnpm 10.33.0. The machine's default Node 24 / pnpm 11 initially failed the repository's engine check; the supported runtime completed installation.
- Ran the latest checkout locally through Next development mode and headless installed Chrome using Playwright. Captured at 1440×900, 1280×720, and 390×844 with reduced motion requested and fonts settled.
- Captures are full-page images from the document top. Their height can exceed the browser viewport. A fixed navigation bar therefore appears at its initial viewport position within the full-page image.
- These captures include the Next development issue indicator; that badge is development chrome and is not scored as a production design defect. The underlying development warning was not diagnosed as part of this design-plan task.
- Several result portraits were blank in the captured local session. This remains an asset/network/loading observation, not a confirmed production defect. The implementation plan includes loaded and unavailable-image states.
- All eight captures were opened for visual inspection. This was a targeted patient-surface audit, not a complete browser or console review. No application edits or full-suite pass are claimed.

The repeatable capture script remains at `qa/_runs/redesign-2026/audit.mjs` in this checkout. The preserved measurement data is [baseline/audit.json](baseline/audit.json).

## Captures

| Surface and state | Viewport | Evidence |
|---|---|---|
| Find, first visit with consent | 1440×900 | [Home](baseline/home-1440-first-visit.png) |
| Learn library, consent acknowledged | 1440×900 | [Library](baseline/learn-library-1440.png) |
| What ADHD is, first reading step | 1440×900 | [Desktop lesson](baseline/learn-lesson-1440.png) |
| Myth or fact, first question | 1440×900 | [Quiz](baseline/learn-quiz-1440.png) |
| Profile/preferences | 1440×900 | [Profile](baseline/profile-1440.png) |
| Results after a synthetic test search | 1280×720 | [Short-laptop results](baseline/results-1280-720.png) |
| Learn library | 390×844 | [Mobile library](baseline/learn-library-390.png) |
| What ADHD is, first reading step | 390×844 | [Mobile lesson](baseline/learn-lesson-390.png) |

## Confirmed structural findings

### 1. A style collision breaks the reading layout

`app/learn-modules.tsx` uses `.learn-card` both for catalogue buttons and for reading articles; quiz question surfaces also inherit the card presentation. At line 10156 in `app/globals.css`, the later catalogue-card definition makes `.learn-card` a horizontal flex container. The reading article's eyebrow, title, paragraph, and details consequently become side-by-side flex items.

In the 390px mobile capture:

| Measurement | Value |
|---|---:|
| Reading-card visible width | 346px |
| Reading-card internal scroll width | 474px |
| Paragraph width | 86.16px |
| Paragraph height | 867.89px |
| Reading-card height | 907.89px |
| Card overflow | `hidden` |

The document width is still 390px. A page-level overflow assertion would pass while information inside the lesson is clipped. This is why the implementation needs distinct module-tile, lesson-step, quiz-question, and completion scopes, plus a reading-content check.

### 2. Desktop space is controlled by a floating window

The 1440px home capture has a 1040px shell starting at x=200. Learn uses the same width in its library and changes to 780px, starting at x=330, when a module opens. The dark surrounding ground, rounded outer frame, and changing width are current implementation choices, not requirements of the product's matching or learning engines.

The user requested a coherent desktop platform. The plan replaces the outer-window treatment with full-width chrome and layout-specific content widths.

### 3. Fixed controls overlap working content

At 1440×900, the desktop dock sits at approximately y=781–839. The Learn library's information cards continue through that area. The Profile capture shows the dock and a separate fixed action among live preference controls. At 1280×720, the dock sits at approximately y=605–663 over result rows.

The home consent bar occupies approximately y=695–769 at 1440×900, immediately above the dock. The first screen makes room through several route-dependent offsets. The new shell should allocate actual space for visible chrome instead of stacking independent offsets.

This audit does not claim that every fixed element makes every obscured item permanently unreachable. It confirms visual overlap in the captured viewport, which is contrary to the requested platform quality.

### 4. Learning expression stops at the catalogue

The library has seven coloured tiles with small sticker-like illustrations. The opened lesson and quiz switch to a plain white card with dense text and no comparable contextual illustration. The learning reference, especially image 5, calls for a more integrated activity environment.

The library also uses its long explanatory sentence as the page's small visible heading. A clear Learn title, topic choice, and readable progress would give the area a stronger hierarchy.

### 5. Shared shell and footer need an ownership boundary

The root layout injects `AcknowledgementOfCountry` after all route content. The current home document is 1184px tall at a 900px viewport, even though its central task is small. The decorative band is also present after library, lesson, quiz, and Profile content. The proposal keeps the acknowledgement available while giving task screens a compact, coherent app footer/About treatment.

`app/(app)/layout.tsx` already keeps navigation mounted across the three patient destinations. Preserve that useful foundation. `app/console/layout.tsx` currently returns its children after scheduling dashboard warming; console navigation is built elsewhere. The console's eventual shared shell must preserve that behaviour and its permissions.

## Source map

All paths below are relative to this latest checkout and were read during planning.

| Source | What it establishes |
|---|---|
| `src/app-shell/tabs.ts` | Find, Profile, Learn identities and routes |
| `app/(app)/layout.tsx` | Existing persistent patient navigation boundary |
| `app/(app)/approach/page.tsx` | Learn route, header, and entrypoint |
| `app/learn-modules.tsx` | Library, reader, quiz, progress controls, artwork and state |
| `src/learn/scenes.ts` | Seven modules, sixteen reading scenes, eleven quiz questions, two shelves |
| `src/learn/progress.ts` | Completion-only local storage, version 1, graceful storage failure |
| `app/globals.css` | 10,828-line cascade, 1040px desktop shell, 780px reader, shared card rule |
| `app/layout.tsx` | Global acknowledgement/consent and previous design-direction metadata |
| `app/profile-view.tsx` | Preferences and current-search presentation |
| `app/finder-stages/*` | Care-finder UI, map, profile, compare, results and booking |
| `app/console/console-navigation.tsx` | Current operational navigation groups and role filtering |
| `e2e/app-shell.spec.ts` | Patient navigation and a complete quiz, but not the reader collision |
| `e2e/education.spec.ts` | Separate professional education workflow |
| `src/demo/roster.ts`, `CONTEXT.md` | Real listed clinicians versus example profiles |

## Original work preserved

The original checkout had changes in these ten files before this task:

```text
app/app-tabs.tsx
app/finder-stages/nearby-map.tsx
app/finder-stages/results-stage.tsx
app/globals.css
app/privacy-consent.tsx
app/profile-view.tsx
e2e/app-shell.spec.ts
e2e/consent.spec.ts
e2e/place.spec.ts
src/tenancy/rollout.test.ts
```

They were not stashed, reset, overwritten, or committed. The implementation plan calls for reviewing their useful fixes against the latest baseline before carrying any into the redesign. The new worktree is locally excluded from the original checkout's untracked-file listing.

## Reference provenance

The six PNGs in `references/` are exact copies of the user's supplied images, named in the original order. They are design evidence, not shipping product artwork. The screenshots in `baseline/` were captured locally from the verified latest checkout. No real person's likeness was generated or edited.
