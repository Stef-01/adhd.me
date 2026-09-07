# ADHD.ME — platform redesign plan and specification

Date: 6 September 2026, America/Los_Angeles. Status: planning complete; proposed implementation, not a shipped redesign.

## 1. Brief and source of truth

Make ADHD.ME feel like a polished contemporary application across desktop, tablet, and mobile. Use references 1–2 for interface and icon quality, references 3–5 for learning, with **reference 5 the strongest learning direction**, and reference 6 for desktop composition and finish. This deliverable covers the requested comprehensive plan and understanding of the requirements and specifications; application implementation is described below.

The current user request sets the redesign requirements. Text inside reference images is example content, not an instruction to implement those products' features. Historical directions, approvals, and completed checklists in the repository describe earlier work; they do not override this brief. In particular, the old centred-window desktop treatment and fixed narrow finder are allowed to change. No retired governance machinery needs to be recreated to do this work.

### Verified baseline

| Item | Verified state |
|---|---|
| Repository | [Stef-01/adhd.me](https://github.com/Stef-01/adhd.me) |
| Remote baseline | `origin/main`, fetched during this task |
| Commit | [`8569e79dd2eeb851ae190758fff027c3e8b49c78`](https://github.com/Stef-01/adhd.me/commit/8569e79dd2eeb851ae190758fff027c3e8b49c78), dated 2026-09-06 |
| Original checkout | `codex/latest-main-polish` at `d83dabf`, 49 commits behind this baseline; ten pre-existing modified files preserved |
| Latest working checkout | `.worktrees/2026-platform-redesign`, branch `codex/2026-platform-redesign` |
| Runtime | Repository requests Node 22 and pnpm 10.33.0; installed with the frozen lockfile using those versions |
| Resolved app stack | Next 15.5.23, React 19.2.8, Tailwind 4.3.3, Motion 13, Phosphor icons, self-hosted Plus Jakarta Sans and Newsreader |
| Current app destinations | Find `/`, Profile `/profile`, Learn `/approach`; `/finder` redirects to `/` |
| Patient learning | Seven modules: five reads containing sixteen scenes, and two knowledge quizzes containing eleven questions |
| Practice learning | `/console/education` is a separate professional resource and reading-record workflow |

The verified baseline means latest remote `main` at the time of the fetch, not a claim about the currently deployed Vercel build. The redesign does not require a framework upgrade.

### Audience and outcome

Patients are Australian adults exploring ADHD information and looking for a suitable, reachable GP, often with limited attention or energy. They should understand the next action quickly, use their own words to search, inspect the resulting options, and leave with a clear next step. Learn should make existing educational material inviting and easy to work through. Practice teams need a desktop workspace for demand, referrals, capacity, and outcomes.

Patient task surfaces are primarily for doing; lessons are for understanding and trying a concept. The practice console favours scanability and reliable controls. Public explanatory pages share the brand without becoming the app's front door.

### Working assumptions

- Redesign the whole visual system, with patient Find, Learn, and Profile as the first release slice. Extend it to public pages and the practice console in the same programme.
- Keep the current audience, product name, routes, matching behaviour, booking destinations, and underlying data model unless a specific change below requires a small extension.
- An optional scope question was presented about interactive lessons versus presentation-only changes. Until corrected, this proposal uses **interactive lessons and small activities built around the existing content**. That is a proposal, not a recorded user approval of every new feature.
- Keep the three primary destinations and their present order for the initial migration. A fourth destination is unnecessary for the existing scope.
- Existing medical-information caveats, real-versus-example identity, and booking-handoff truth remain accurate. Visual references do not supply ratings, availability, clinical claims, or a new anxiety-treatment product.

## 2. What each reference means for ADHD.ME

| Reference | Adopt | Concrete application |
|---|---|---|
| [1 — app UI and navigation](references/01-app-ui.png) | Crisp line icons, legible labels, purposeful blue selection, clean spacing | Consistent icon family, clear active navigation, strong input and button states |
| [2 — discovery UI](references/02-discovery-ui.png) | Well-composed search, filters, readable provider information, clear list/map relationship | Desktop finder toolbar, structured clinician rows, coordinated map and details |
| [3 — learning collection](references/03-learning-collections.png) | Strong colour blocks, illustration integrated with content, quick topic recognition | Distinct module covers with real space for artwork, title, duration, type, and progress |
| [4 — guided learning experience](references/04-guided-experience.png) | Focused activity mode, one task at a time, warm feedback and completion | A dedicated lesson player, readable progress, obvious exit and next action |
| [5 — primary learning reference](references/05-interactive-learning.png) | A visual activity chooser, recurring characters, contextual scenes, tappable visual explanations | Modules feel like small guided experiences; diagrams and choices actively explain a concept |
| [6 — desktop platform](references/06-desktop-platform.png) | Stable masthead, aligned workspace, controlled density, deliberate use of desktop width | Full-width app chrome, useful content columns, predictable scroll and header behaviour |

The design combines these roles into one product. Phone frames, reference-product logos, proprietary characters, fitness bookings, live group counts, and the source screenshots' cropped edges are not deliverables. Create original ADHD.ME learning artwork. Reference 5's interaction pattern matters more than reproducing its dated gradient masthead or exact subject matter.

## 3. Baseline audit and priorities

Eight new browser captures were taken from the isolated latest checkout: desktop Find, Learn library, a reading lesson, a quiz, Profile, short-laptop results, and mobile library and lesson. See [the evidence record](AUDIT.md). These are development-build observations, not a production certification or an exhaustive audit of every route.

| Priority | Finding | Consequence and required change |
|---|---|---|
| P0 | Library tiles and reading/quiz surfaces reuse `.learn-card`; the later tile rule sets a horizontal flex layout | The mobile reading card is 346px wide but contains 474px of horizontal content. Its paragraph is about 86px wide. Split tile, lesson, question, and completion components/styles before extending Learn |
| P1 | Desktop app width is capped at 1040px, and opening a lesson shrinks the frame to 780px | A 1440px screen becomes a floating window with large dark margins. Give the shell the viewport and constrain only content that needs a reading measure |
| P1 | Fixed desktop dock crosses content in Learn, Profile, and results captures | Move primary desktop navigation into the masthead. Put page actions in a reserved layout region |
| P1 | The global decorative acknowledgement band follows every working screen | The app looks like a website embedded inside another website and adds substantial page height. Keep the acknowledgement available in the app's About/footer treatment and on public pages, with a quieter app presentation |
| P1 | Learn opens with a small explanatory sentence rather than a clear page title; colour/characters mostly stop at the library | Give Learn a recognisable title, topic choice, optional resume item, and an illustrated lesson interior |
| P1 | Long availability notes are truncated in result rows | Keep consequential availability/access text visible; only secondary descriptive text may use a deliberate preview |
| P2 | Header typography, padding, and rules vary between Find, Learn, and Profile | Use one shared header, typography scale, and navigation implementation |
| P2 | `app/globals.css` is 10,828 lines with multiple historical styling layers | Migrate affected surfaces into clear component scopes; remove superseded rules as each surface moves |
| P2 | Existing Learn browser coverage exercises a quiz but does not catch the reading-layout collision | Add reading and long-content geometry coverage alongside meaningful interaction checks |

No horizontal overflow at document level was found in the eight captured states. That alone is insufficient: a parent can hide overflowing lesson content while the document itself still fits. Acceptance must inspect content containers and visibility as well as the page width.

## 4. Proposed visual system

### Direction

**A clear, bright care platform with a warm, character-led learning world.** The shell should feel calm and precise. Saturated colour and playful expression belong primarily in learning scenes. The memorable element is a recurring cast explaining a concept through an action, rather than a small decorative sticker beside text.

The desktop shell is a continuous surface with a proper masthead. Search, reading, and operational pages have different compositions within it. Large outer shadows, the navy desktop backdrop, orange rules across every header, and the floating desktop dock leave the patient shell.

### Starting tokens

These are proposed values to validate together in the first design proof; they are not asserted to be current production tokens.

| Role | Value | Use |
|---|---|---|
| Canvas | `#F7F9FC` | Full app background |
| Surface | `#FFFFFF` | Controls, rows, content panels |
| Primary ink | `#182230` | Headings and body text |
| Secondary ink | `#586579` | Supporting text and metadata |
| Action blue | `#155EEF` | Primary actions, selected controls, navigation, map selection |
| Divider | `#E4E8EF` | Quiet separators; not the sole indication of an input boundary |
| Learning amber | `#FFD340` | Understanding concepts; dark ink |
| Learning orange | `#FF873C` | Everyday activities; dark ink |
| Learning green | `#157C50` | Knowledge/play modules; white ink |
| Learning lilac | `#C2A3E0` | Vocabulary and reflection; dark ink |

Calculated starting contrast pairs: blue/white 5.41:1; secondary ink/canvas 5.60:1; white/green 5.21:1; primary ink/amber 11.18:1; primary ink/lilac 7.33:1; primary ink/orange 6.70:1. These calculations cover those pairs only. Every rendered state, including disabled controls, selected options, and text over art, still needs inspection. Interactive boundaries and focus receive a stronger dedicated token where needed.

### Type, space, shape, and icons

- Keep self-hosted **Plus Jakarta Sans** for application headings, copy, controls, and data. Use weight and scale for hierarchy. Reserve Newsreader for optional public-story passages; avoid changing between serif and sans for the same app role.
- Start with page titles 32–40px desktop / 28–32px mobile; section titles 22–26px; lesson titles 28–36px; body 16px with 1.5–1.65 line height; secondary metadata 13–14px. Consequential helper and error copy should remain comfortably readable.
- Use a 4/8/12/16/24/32/48/64px spacing scale. Desktop content gutters 32–48px, tablet 24px, mobile 16–20px. Give headings more space above than below.
- Controls approximately 10–12px radius; panels 16px; learning covers 20–24px. Pills are for topic filters, segmented selection, and badges, not every component.
- Use the existing Phosphor family consistently: 20px utility icons, 24px navigation icons, regular weight normally and filled weight for active navigation. Optical alignment matters more than adding a new icon library. Keep text labels on navigation.
- Use shadows for hierarchy, menus, and genuine elevation; ordinary rows can rely on spacing and a divider. Avoid decorative gradients across the application chrome.
- A component's contract covers default, hover, focus, pressed, selected, disabled, loading, error, and success states as applicable.

### Illustration brief

Create three or four original simple characters with soft geometric bodies, expressive posture, and a consistent face/stroke language. They should feel friendly to adults. Associate a character or scene with a module's concept, not with a diagnosis or a category of person. Use the same cast on covers, inside activities, and at completion.

Initial asset set: seven coordinated covers; three reusable activity scenes; small feedback poses; one completion scene; a visual pathway; and a reusable explainer diagram. Use SVG for scalable authored illustration where suitable, or optimised raster assets with fixed aspect ratios and dimensions. Meaningful art needs an accessible explanation; decorative art is hidden from assistive technology. Animation assets load with the module that needs them.

## 5. Desktop and responsive specification

### Navigation and shell

At 1024px and above, use an approximately 72px masthead spanning the viewport: ADHD.ME left, Find / Profile / Learn in a stable central or adjacent group, settings/help right. The same masthead remains mounted across these routes. Three destinations do not need a permanent patient sidebar. The practice console can use a sidebar because its navigation is substantially larger.

At 768–1023px, retain compact labelled top navigation when it fits; reduce gutters and collapse secondary columns. Below 768px, use a compact header and a safe-area-aware bottom navigation bar. On focused lesson/voice screens, keep an explicit back/exit path and reserve any bottom controls' space. Route changes must not lose the current search or lesson position unexpectedly.

The main workspace fills the width available beneath the masthead. Large displays may use a 1600px content maximum to control density; the shell and background still fill the screen. Reading text stays around 55–70 characters per line. Full-screen UI means coherent use of the viewport, not forcing all content into one screenful.

### Desktop compositions

Finder/results:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ADHD.ME          Find   Profile   Learn                       Help Settings │
├────────────────────────────────────────────────────────────────────────────┤
│ Find a GP                                                                 │
│ [ Your words / edit search                         ] [ Place             ] │
│ [Language] [Access] [Billing] [Telehealth] [All filters]     [List | Map]    │
│                                                                           │
│ Matches and a concise explanation                Map / contextual panel   │
│ ┌──────────────────────────────────────┐         ┌───────────────────────┐ │
│ │ Portrait · name · location           │         │                       │ │
│ │ Declared fit · availability · action │         │ Selected GP and place │ │
│ ├──────────────────────────────────────┤         │                       │ │
│ │ Next clinician                      │         │                       │ │
│ └──────────────────────────────────────┘         └───────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

Learn library:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Shared masthead                                                           │
├────────────────────────────────────────────────────────────────────────────┤
│ Learn                                                                     │
│ Understand a little more, one activity at a time.                          │
│ [ Continue last module, only when there is real progress                ] │
│ [All] [Understanding ADHD] [Finding care]                                  │
│                                                                           │
│ ┌────────────────────┐ ┌────────────────────┐ ┌───────────────────────┐    │
│ │ Illustration/scene │ │ Illustration/scene │ │ Illustration/scene    │    │
│ │ Module title       │ │ Module title       │ │ Module title          │    │
│ │ 4 min · read/try   │ │ 3 min · activity   │ │ 2 min · quiz           │    │
│ └────────────────────┘ └────────────────────┘ └───────────────────────┘    │
│ Additional modules grouped by their actual topic                          │
└────────────────────────────────────────────────────────────────────────────┘
```

Learning player:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Back to Learn         Everyday strategies                     Step 2 of 4 │
├───────────────────┬────────────────────────────────────────────────────────┤
│ Module outline    │ One clear idea                                         │
│                   │ Short explanation                                      │
│ 1. Notice         │                                                        │
│ 2. Try            │ [Character and interactive scene / explainer]          │
│ 3. Understand     │ [Choice] [Choice] [Choice]                              │
│ 4. Take away      │                                                        │
│                   │ Feedback appears here after an action                  │
├───────────────────┴────────────────────────────────────────────────────────┤
│ Back                                                   Continue / Finish  │
└────────────────────────────────────────────────────────────────────────────┘
```

The outline is illustrative structure, not additional curriculum. Derive each outline from the module's real steps. On mobile it becomes a compact progress/disclosure control, and the activity and copy form one vertical column.

### Layout behaviour

| Width / situation | Required behaviour |
|---|---|
| 320–767px | One column; reachable bottom actions; no page-level horizontal scroll; titles and controls wrap deliberately |
| 768–1023px | Two library columns when each card fits; compact masthead; secondary panels become drawers or inline disclosures |
| 1024–1279px | Full desktop shell; two library columns; results prioritise the list; map can be switched into view |
| 1280–1599px | Two or three library columns according to card minimum width; results can show list plus map when both remain readable |
| 1600px+ | Three library columns and generous but bounded spacing; useful workspace up to 1600px; readable text measure stays bounded |
| Short laptop / landscape phone | Compact sticky chrome; natural document scroll; action footer never conceals the remaining lesson |
| 200% text enlargement / 400% desktop zoom | Reflow into fewer columns; every action remains reachable; controls grow with their labels |

Use one main vertical scroll owner by default. A map or wide data table can have its own explicitly labelled interaction area. Use `minmax(0, 1fr)` and `min-width: 0` where intrinsic content otherwise widens a grid. Let content determine height; use dynamic-viewport minimums only where needed. Do not fix overflow by hiding it on the whole page.

Reserve space for sticky headers, mobile navigation, lesson actions, and consent through shared layout regions or measured dimensions. Remove stacks of unrelated hard-coded bottom offsets. A consent notice should occupy a dedicated region while visible, including when its copy wraps. Focus and anchor destinations need appropriate scroll offsets.

Desktop filter chips wrap within the toolbar. A deliberately scrollable mobile chip row needs an obvious affordance and keyboard access; essential options cannot simply disappear past a clipped edge. Keep menus inside the usable viewport and allow long menus to scroll.

## 6. Screen-by-screen product requirements

| Surface | Resulting experience | Behaviour to retain |
|---|---|---|
| Find welcome | Clear page title, concise invitation, large words/voice input, obvious search action, useful example prompts; coherent desktop composition | Typed input, Shift+Enter, Enter search, voice fallback, existing example behaviour |
| Listening and review | A focused recording surface with readable transcript, clear stop/edit controls, predictable transition to results | Existing permission, unsupported-browser, error, and retry paths |
| Results | Aligned rows with portrait, identity, location, declared fit, availability, and next action; useful filter toolbar and optional map | Matching explanation, ties, no-result states, real/example distinction, geospatial meaning |
| Map | Consistent markers, clear selected state, a coordinated row/details view, fitting controls | Current Leaflet data and gazetteer; textual results remain usable when tiles fail |
| Clinician details | Identity and useful details lead; grouped access/billing/location information; one clear booking handoff | Supplied portraits, declared information, disclosures, comparison and external destinations |
| Compare | Readable comparison across the same attributes; aligned names; mobile attribute-by-attribute presentation | Existing tie/choice semantics; no manufactured endorsement |
| Booking handoff | Clear destination, what happens next, and how to return | Genuine external booking behaviour; honest terminal state for an example profile |
| Profile | Page title reflects preferences held on this device; settings grouped by task; current-search summary separated from filters | Existing location, language, access and session semantics; forget/reset controls |
| Learn library | Title, topic choice, larger authored module art, duration/type, real completion, conditional resume | Seven module identities, current categories, local completion state |
| Lesson / quiz | One coherent learning stage with illustration, short copy, interaction, feedback, and a stable next action | Educational meaning, quiz explanations, manual progression, completion |
| Settings / sheets | Shared menu, drawer, and modal conventions; clear title and close path | Escape, focus trap where modal, focus restoration, privacy controls |
| Public routes | Shared typography, icons, spacing, useful navigation and reading measure | `/story`, `/practices`, `/clinicians`, `/faq`, `/about`, `/examples`, privacy/terms content and route behaviour |
| Practice console | Shared tokens, stable sidebar/header, coherent table/list/detail patterns, credible empty and loading states | Existing route access, roles, forms, workflow data, exports and synthetic-demo behaviour |

The console navigation already groups Run care, Configure, Measure, Govern, and Demonstrate. Use that vocabulary as a starting point. Audit representative dashboard, matching, capacity, referrals, outcomes, and results pages first, then migrate all remaining console patterns. Hiding or deleting entire workflows is a separate product decision and is not required for this visual redesign.

## 7. Learning experience specification

### Module catalogue and transformation

| Existing module | Current content | Proposed experience |
|---|---|---|
| What ADHD is | 4 reading scenes, about 4 minutes | A character-led concept journey; one scene per idea; optional tap-to-reveal explanations |
| Everyday strategies | 4 reading scenes, about 3 minutes | A small activity chooser; try a memory aid or break a fictional task into visible steps; retain the explanatory reading |
| Myth or fact? | 6 questions, about 2 minutes | Big clear choices; character reaction; explanatory reveal; no automatic jump to the next question |
| Words you'll hear | 5 questions, about 2 minutes | Illustrated term/definition interactions followed by the existing knowledge checks |
| Finding a GP | 3 reading scenes, about 3 minutes | A visual route through preferences, finding options, and a booking handoff, grounded in the existing material |
| Time, money, distance | 2 reading scenes, about 2 minutes | A visual explanation of the questions to consider; present existing indicative figures with their existing qualification |
| What changed | 3 reading scenes, about 2 minutes | A clear visual pathway and NSW/Queensland comparison using the current content; source-sensitive claims stay qualified |

Adding activities changes duration. Re-measure the final modules and update the displayed estimate; the values above describe the current app, not promised redesign timings.

### A lesson's sequence

1. **Orient:** module title, what it covers, approximate duration, Start or Continue.
2. **Understand:** a short explanation with one illustrative idea.
3. **Try:** a tap/click/keyboard activity, where it improves understanding. Reading-only steps remain available.
4. **Get feedback:** explain what the choice demonstrates; feedback is inline and announced appropriately.
5. **Continue:** the learner chooses the next step; Back and exit remain available.
6. **Finish:** clear completion and a practical takeaway drawn from the module; return to the library or replay.

For example, an Everyday strategies scene could show a fictional character holding several reminders. The learner chooses one of the memory supports already described in the lesson, and the scene shows where the reminder now lives. The interaction explains the existing concept. It does not assess the learner or require personal symptom information.

Reference 5's concentric diagram can inform a tappable explainer or visual module map, with an equivalent labelled list. A persistent personal support network, emergency plan, symptom tracker, or new therapy programme would be additional scope. The first redesign does not silently create those products.

### Component and content model

Separate `ModuleTile`, `ModuleLibrary`, `LessonPlayer`, `LessonStep`, `QuizQuestion`, `ActivityStep`, `LessonProgress`, and `LessonCompletion`. Tile presentation must never target lesson content through a shared generic class. Display semantics and interaction semantics belong to the component, not to position in the stylesheet.

Keep content in `src/learn`. Evolve steps into a typed representation for reading, knowledge questions, simple choices, and explainers as needed. Each step needs an ID, title, explanatory copy, optional artwork/accessible description, and an appropriate response/feedback shape. An activity definition contains only the fields needed by that activity, rather than optional fields for every possible widget.

Retain the existing sixteen scenes and eleven questions during migration. Audit their presentation first; any substantive content rewrite should be distinguishable from visual editing. Keep general educational language and knowledge feedback separate from assertions about the reader.

### Progress, routing, and recovery

- Current persistence is version 1 completion IDs in `adhdme.learn.v1`; scores and answers are not persisted. Maintain existing completion records.
- Add resumable position using a separate versioned cursor or an explicit migration. Persist module/step identifiers only for this first release; keep activity inputs and quiz answers session-local.
- Completion still occurs through the Finish action. Opening the last step alone must not mark a module done.
- A learner can resume, restart, replay a completed module, or leave. If storage is unavailable, all activities still work for the current visit.
- Support direct navigation to a module using a public module identifier while retaining `/approach`. Browser Back should leave the module before unexpectedly leaving Learn; refresh should restore a valid public location or offer resume.
- Invalid module/step IDs fall back to a useful library or module start. Existing completion records survive content additions. Removing or renaming IDs needs a deliberate migration.
- Keep a clear Reset learning progress action with accurate scope. No account, cross-device sync, streak, notification system, or saved score is implied.

### Learning acceptance

All seven modules open, every step is readable, both quizzes can be completed, feedback is visible, navigation works by keyboard, and completion survives reload. A long reading step must remain readable at 320px and at text enlargement. Artwork cannot replace the text equivalent. All activity controls have a click/tap/keyboard path; drag-only interactions are out of scope.

## 8. Interaction, accessibility, and performance

### Motion

Use the existing Motion dependency. Start around 120–180ms for direct control feedback, 200–260ms for panels/step changes, and short deliberate illustration responses. Motion should explain selection, continuity, progress, or feedback. Avoid repeated ambient movement around reading content. Honour reduced-motion preferences with immediate/static equivalents and preserve visible content before hydration.

Move focus deliberately to a new page/lesson heading after navigation where appropriate, restore focus when a dialog closes, and avoid trapping focus in inactive animated steps. Use live announcements for consequential state changes rather than announcing every decorative transition.

### Accessibility and resilience

Set WCAG 2.2 AA as the redesign target. The practical layout requirements include reflow at a 320 CSS-pixel equivalent and preventing author-created sticky UI from hiding focus. The project's product target is stronger than the latter's minimum: the complete focused control should remain visible. See [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and [W3C Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

Use semantic headings, one main landmark, visible keyboard focus, explicit form labels, and a minimum 44px target for primary controls. Selected state must not rely on colour alone. Validate contrast on the actual background. Support long names, long translations, expanded copy, unavailable images, blocked storage, map failure, microphone rejection, and long loading states. Preserve browser zoom and selection.

For all sticky elements, check both visual overlap and keyboard scrolling. A page-width test that passes while a lesson clips internally is a failure.

### Performance and honest data

Reuse self-hosted fonts and installed icon/motion libraries. Load map and heavier lesson assets on demand. Give images explicit dimensions, avoid layout jumps on font/asset arrival, and verify the initial page stays responsive. Compare build/route size and interaction measurements with the verified baseline; do not add a large animation runtime to obtain small decorative effects.

Use actual roster/fixture data during design. Keep supplied portraits for real people and visible example identity for synthetic profiles. Check missing portrait behaviour separately from successful image loading. Do not invent availability, ratings, patient outcomes, or appointments to fill a mockup. Existing launch-content questions in README remain separate from the work needed to improve the demo's appearance.

## 9. Implementation plan and dependencies

Each phase has a visible deliverable and a practical exit condition. These phases are implementation work to follow this planning deliverable.

| Phase | Work and likely files | Exit condition | Depends on |
|---|---|---|---|
| 0. Baseline and layout repair | Preserve original diff; latest worktree; separate tile/lesson/question styles in `app/learn-modules.tsx` and `app/globals.css`; examine local fixes for overlap | Reading and quiz content are fully readable at desktop/mobile; useful changes in the original checkout have a reconciliation decision | Latest baseline, completed here |
| 1. Design proof | Show desktop Find/results, Learn library, a real interactive lesson, and mobile equivalents using real content; establish token and asset samples | All three reference roles are visible: precise app UI, character-led learning, full desktop composition | 0 |
| 2. Foundation and shell | `app/(app)/layout.tsx`, `app/layout.tsx`, `app/app-tabs.tsx`, settings/sheet/consent/acknowledgement components; introduce scoped tokens and shell styles | Stable shared header, responsive navigation, natural scroll, and no header/footer/control collisions | 1 |
| 3. Find and Profile | `app/finder-stages/*`, `app/profile-view.tsx`, shared rows/forms and map styling | Typed and voice flows, filters, results, details, comparison, and booking work in the new layout | 2 |
| 4. Learning | `app/(app)/approach/page.tsx`, split learning components, `src/learn/scenes.ts`, progress cursor/migration, original assets | Seven modules feel like designed experiences; core activity patterns work; resume/completion are reliable | 2; asset proof from 1 |
| 5. Platform consistency | Public route families and `app/console/*`; shared table/list/form/empty-state patterns | Representative console workflows and all remaining route families use the coherent system | 2–4 patterns proven |
| 6. Verification and finish | Focused feature tests, full required checks, batched responsive captures, accessibility and content review | Acceptance criteria below pass; remaining limitations are named with evidence; implementation documented | 3–5 |

After phases 3 and 4, the patient app should be a complete reviewable vertical slice. Continue through the public and console work to complete the whole-platform scope. Avoid mixing a redesigned library with an unfinished lesson player.

### Proposed organisation

| Existing source | Proposed implementation boundary |
|---|---|
| `app/globals.css` | Retain global reset/Tailwind and cross-app foundations; move changed shell and component styles into scoped files or CSS modules |
| `app/(app)/layout.tsx` | Shared patient shell and persistent navigation |
| `app/app-tabs.tsx`, `src/app-shell/tabs.ts` | One navigation data source with desktop and mobile render treatments |
| `app/learn-modules.tsx` | Thin composition entrypoint over proposed `app/learn/` components |
| `src/learn/scenes.ts`, `src/learn/progress.ts` | Content/step data and versioned local progress; no visual concerns |
| `app/finder-stages/shared.tsx` | Reusable clinician row, identity and finder control primitives without changing matching decisions |
| `app/privacy-consent.tsx`, `app/sheet.tsx` | Explicit overlay/layout contracts and focus behaviour |
| `app/console/console-navigation.tsx` | Shared desktop operational navigation; retain permission filtering |

Remove superseded styles as each component migrates. Do not solve the redesign by appending a final override section to the existing stylesheet. Update exact-copy or obsolete-geometry assertions to the intended new requirements while retaining behaviour tests. Do not delete tests just because they reveal a regression.

At implementation completion, document the actual tokens/components in one durable design source and reconcile the old inline design-direction metadata and design notes. Today this document remains the proposed specification.

## 10. Verification matrix and definition of done

### Viewports and states

| Test group | Required coverage |
|---|---|
| Desktop | 1280×720, 1440×900, 1920×1080; both normal and long content |
| Tablet | 768×1024 and 1024×768; column transition and navigation fit |
| Phone | 320×568, 390×844, 430×932; a landscape case; virtual keyboard/manual device check where available |
| Accessibility | Keyboard-only, reduced motion, 200% text enlargement, 1280-wide desktop at 400% zoom/equivalent 320px reflow |
| First visit | Consent visible, empty local preferences, no learning progress |
| Returning visit | Existing filters, existing v1 completion, resumed module, replay and reset |
| Content bounds | Long GP names and locations, wrapped filter labels, long reading step, multiline feedback, empty/full lists |
| Recovery | Storage blocked/corrupt, image failure, map unavailable, microphone unavailable/denied, loading/error/retry |

Run a browser sweep against Chromium, with responsive behaviour checked in WebKit and Firefox before claiming cross-browser completion. A Chromium development capture alone is not evidence for Safari keyboard/safe-area behaviour.

### Existing checks to extend or preserve

- `e2e/app-shell.spec.ts`: navigation, settings, current quiz flow, and module completion; add meaningful read/resume coverage or extract it to a patient-learning spec.
- `e2e/profile-layout.spec.ts` and `e2e/preferences.spec.ts`: clinician-detail layout and preference behaviour.
- `e2e/consent.spec.ts`, `e2e/keyboard-focus.spec.ts`, `e2e/a11y.spec.ts`: first-visit layout, unobscured focus, sheets, and semantics.
- `e2e/finder-flow.spec.ts`, `e2e/place.spec.ts`, `e2e/compare.spec.ts`, `e2e/booking.spec.ts`: retain the full care-finder flow and map/booking behaviour.
- `src/learn/progress.test.ts`: completion compatibility, malformed/unavailable storage, and resume migration when added.
- `e2e/education.spec.ts` belongs to professional console education; it is not coverage of the patient Learn reader.
- Required repository commands remain `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm e2e` using the supported runtime. `pnpm verify` runs the first three; `pnpm gate` also runs e2e.

Verification should be proportional: relevant flow checks during each slice, then required full checks before declaring the completed redesign ready. No application code was changed or full test-suite pass claimed during this planning task.

### Acceptance checklist

- [ ] The app opens directly into the working finder and uses the full desktop shell.
- [ ] Find, Profile, Learn, and the console visibly share typography, icon discipline, spacing, and controls.
- [ ] Desktop has a stable masthead; mobile navigation remains reachable and correctly padded.
- [ ] No heading, paragraph, chip label, availability note, dialog, or focused control is unintentionally clipped or covered.
- [ ] Content remains readable at the width/zoom matrix above; necessary tables/maps have explicit containment.
- [ ] All seven learning modules have coordinated artwork and a coherent player; at least the Everyday strategies pilot demonstrates reference 5's activity-led quality.
- [ ] Both quiz flows retain explanations and usable completion; long reading content also passes geometry and interaction checks.
- [ ] Existing progress survives migration; resume, restart, replay, invalid IDs, and blocked storage work.
- [ ] Search, voice, filters, map/list, clinician details, compare, and booking handoff preserve their behaviour and truthful data.
- [ ] Loading, empty, disabled, error, first-visit, and returning states look intentional.
- [ ] Required checks pass, new screenshots are opened and inspected, and differences from the approved visual proof are resolved or specifically reported.

## 11. Decision record and remaining choices

Settled by the user: redesign this repository; use the latest version; materially improve aesthetics; use references 1–2 for UI/icons, 3–5 for learning with 5 strongest, and 6 for desktop quality; eliminate awkward clipping/header/layout behaviour; produce a comprehensive plan.

Proposed here: bright neutral canvas and action blue; keep Plus Jakarta Sans; horizontal desktop navigation; larger authored learning scenes; interactive adaptations of the current seven modules; local resume; patient app first, then the remaining platform. These are concrete reviewable design decisions, not assertions that the user selected exact hex values or a new storage feature.

Choices that can be resolved from the first design proof: illustration personality, exact visual balance between blue chrome and warmer learning colours, and preferred density of desktop module covers. They do not prevent defining or preparing the work.

Scope boundary to revisit if requested: persistent personal support tools, new clinical curriculum, accounts/sync, live appointment inventory, a new practice-console information architecture, or production publication. None is required to deliver the visual and responsive redesign described above.
