# ADHD.ME — DESIGN.md

This is the visual system that ships from `app/globals.css`, re-derived on 2026-09-01 after the
product-wide redesign. It is a contract for extending the product, not a moodboard. The source
direction is also embedded as inert JSON in `app/layout.tsx` under
`#adhdme-design-direction`; the reproducible concept seed is `f009e50c`. This capture supersedes
the earlier O223 reskin description: it is written from the shipping code, not aspiration, and
records inconsistencies rather than papering over them.

## Direction: daylight wayfinding

ADHD.ME should feel like a calm route-planning instrument: a person describes the GP they are
looking for, sees how the listed routes relate to those words, and chooses the next handoff. It
should not look like a generic health dashboard, a cream editorial template, or an assessment
scorecard.

The visual world is daylight on porcelain with a deep-blue route system. Orange identifies the
next consequential decision. Periwinkle carries progress, selection, and navigational state.
Ink and hairlines do the rest. The landing page may use a large inverted route field; working
surfaces remain light and quiet.

There is one literal light theme. The dark-blue bands are intentional inverted surfaces, not a
second theme. Do not add a cosmetic dark-mode toggle without deriving and testing a complete
token set.

## Colour roles

One role-based token palette, expressed consistently across light working surfaces and deliberate
inverted route fields:

**The base palette** (`:root`) — porcelain ground, navy neutrals, one burnt-orange action accent:

| Token | Value | Role |
|---|---|---|
| `--ink` / `--ground` | `#172033` | Primary type and deepest inverted ground |
| `--muted` | `#565f70` | Secondary prose and operational context |
| `--faint` | `#626b7b` | Small labels that still clear the AA floor |
| `--paper` | `#f7f8fc` | Main porcelain page ground and browser theme colour |
| `--stone` | `#edf0f6` | Recessed workspace and inset surfaces |
| `--line` | `#d8deea` | Hairlines, table rules, and neutral boundaries |
| `--accent` | `#a14f19` | Consequential action and current decision |
| `--accent-soft` | `#faebe0` | Quiet action/error context, never a decorative wash |
| `--route` | `#5065a6` | Route and selection state |
| `--route-strong` | `#334679` | Inverted route fields, persistent app state |
| `--hero-blue` | `#6679b9` | Supporting route geometry and progress |

Colour is functional:

- Orange means “act here” or marks the current departure point. It does not decorate every
  eyebrow, number, and border.
- Periwinkle means route, selection, progress, or active workspace state.
- Dark blue is an inverted field, not a default button colour.
- Status meaning must also be written in text. No result, alert, or identity depends on colour
  alone.
- Use tokens or `color-mix()` from tokens. Raw component hex remains a failing design gate except
  for the explicitly registered generated-image surfaces.

Contrast is mechanical: the source token census, rendered contrast sweep, and axe WCAG 2.2 AA
suite must all stay green. Never lighten muted text by eye.

## Typography

- **Inter Variable** is the product voice: navigation, actions, data, console headings, and most
  public-page structure. Use deliberate weight and spacing before adding a container.
- **Newsreader Variable** is reserved for reflective care language, patient questions, and short
  human claims. It is not the default style for every marketing heading.
- The pairing is the full family count. Do not add a third font.
- Large headings use tight tracking and short line lengths; body copy uses `text-wrap: pretty`.
  Avoid six-line display headlines and centred paragraphs longer than two lines.
- Small text still carries normal readable contrast. A tiny label is not permission to make it
  faint.

## Composition by surface

### Public story and practice pages

Public chrome is one thin, translucent porcelain bar with direct routes to examples, questions,
practices, and the finder. The home hero is a two-column departure field: the claim and three
route stops on the left, an inspectable map/instrument on the right. Long pages alternate fields,
rules, and type scale; cards are used only for discrete objects.

The content width is approximately 1160–1280px. Mobile collapses to one reading order with the
action before the map. The footer is a dark route terminus shared across public surfaces.

### Patient finder

The finder is one state machine inside a **fixed ~520px content shell / ~640px outer frame**. Its
eight stages must not resize the shell per stage. Viewport media queries do not describe the
component's actual width; use the existing shell/container boundary.

O234: the shell width is one token, `--shell-w` on `:root` (520px, 640px from 820px), and every
fixed surface of the app reads it — the finder shell, the tab bar, the bottom sheet, the consent
notice and the Profile tab — so the app's chrome is never wider than the app. `--shell-gutter`
(22px) is the one inset text and controls sit on inside it: the welcome question, the compose box
and the example link share that edge as one vertically centred group.

The results screen carries a **nearby map** once the place resolves (O235): Leaflet over the
OpenStreetMap standard tiles, loaded as a client-only chunk the first time a suburb is recognised,
with one route-blue marker per consulting suburb keyed to the rows below, a "you" marker on the
typed suburb, the app's own 44px zoom controls and OpenStreetMap's attribution restyled into the
app's type. The keys are list positions, never ranks, and they render only while the map does.
Markers and keys are route blue; the accent is still reserved for the row. The tile host is the
one third-party origin the CSP admits, for images alone, and the privacy page says what it learns.

The results screen (O236–O238) is the summary card (the words, a button that reopens the box),
the earned headline when there is one, the clarifier chips when the words reached nothing, and the
list. The place is set on the Profile tab or carried by a link; there is no field for it here, and
no verdict sentence — the list heading reads "Matches" when the words produced an order and "All
listed GPs" when they did not. The map sits behind one control on the list header, closed by
default; the row keys render only while it is open.

The **Learn tab** (O239) is three modules on the app's shell: calm tiles with a mark, a title and a
length, one card at a time inside with a dot rail and Back/Next/Finish, finished modules remembered
on the device. The cards are the story's eight scenes word for word.

The **Profile tab** holds the person's standing filters — where they are, woman GP, telehealth,
bulk billing, longer appointments, wheelchair access, open books, languages, distance — as switch
rows, chips and a segmented control on the same shell. They are applied to the roster before
ranking and said on the results screen as a strip with Edit and Clear.

The persistent top rule communicates progress. Orange marks the available next action; route
blue marks the current stage and selected state. Results remain a comparison list, not a card
gallery. Profile and row portraits are the same motion object.

### Clinician pathway

The clinician walkthrough is a focused practice instrument, not another marketing page. It keeps
its four-step shell, declaration-first language, and fixed reading width. Selectable care areas,
range controls, case material, and progress all use the same route/action roles as the finder.

### Practice console

The console uses a persistent application shell across every `/console/*` route:

- a 1440px header field with session controls;
- five direct destinations (Home, Queue, Referrals, Results, Setup);
- one route-aware “All tools” map exposing the complete workspace;
- an 1180px working area with compact operational cards, tables, and forms.

Do not reintroduce isolated console pages. Diagnostic surfaces such as matching, allocation, and
interview live inside the same shell. On phones the primary destinations scroll horizontally and
the workspace map becomes a bounded, vertically scrollable panel.

## Minimalism, operationalised (O247)

Researched after the founder's correction ("you clearly have no idea what minimalism means"):
Rams' "less, but better", Nielsen Norman on flat design's signifier problem, Apple's clarity and
deference, and Wispr Flow's invisible-until-needed overlay. The rule this tree now applies to
every screen, in order:

1. Name the screen's one job and its one primary action. Everything else is demoted — to a text
   control, an icon, or the sheet — or deleted.
2. Delete before you shrink. A sentence that explains the UI is a defect in the UI.
3. Then make the residue tiny and faint: what must legally stay is one line at 0.625–0.7rem in
   `--faint`, at the bottom, out of the reading path.
4. Whitespace and tint do the grouping, not hairlines and boxes. Cards only for discrete objects.
5. The one primary control still looks pressable (filled, 44px); text controls still read as
   controls. Outline buttons are for secondary actions, and few.
6. Type does the hierarchy: one display serif statement, one body size, one tiny residue size.
7. Motion carries meaning only, with a static equal.
8. Secondary tools live behind one icon and open in the app's one sheet idiom.

If more than three elements survive above the fold besides the content itself, it is not minimal.

## Fluid interfaces, checked (O249)

The tree was appraised against Apple's fluid-interface talks (the apple-design skill) and the
gaps closed. The rules that now hold, with the constants that prove them:

- **Springs at ζ ≈ 1 for anything tapped; ζ ≈ 0.8 only after a flick.** `STAGE_SPRING` is
  380 / 36 / 0.85 (ζ = 1.00, response 0.30 s). Presses use `PRESS_SPRING`. Nothing overshoots on
  a tap that carried no momentum.
- **The next screen exists on the next frame.** Stage exits are instant; only the arrival
  animates, from the side the person is moving from (the history hook's `direction`).
- **A release goes where it was going.** The sheet projects its rest with Apple's decay curve
  (`project(v) = v/1000 · d / (1 − d)`, d = 0.998) and chooses from the projection.
- **Detents move.** The sheet's height is animated, never set.
- **Three accessibility signals, not one.** Reduced motion, reduced transparency and more
  contrast each have a CSS answer.
- **Layout scales with the words.** The gutter and the core controls are in rem.

## Interaction and motion

Motion follows a Jakub-primary / Emil-secondary standard: spatial continuity first, polish
second. It must explain where an object or state went.

O240: the house motion is a **spring** (`STAGE_SPRING` in `app/finder-stages/shared.tsx`:
stiffness 380, damping 36, mass 0.85) with a short opacity tween beside it, never a blur. Stages
settle on it; results rows stagger on it; the map panel unfolds on it; Learn cards slide in from the
side they were asked for on it; the tab bar's one marker travels between tabs on a stiffer spring
through a shared layout id. Every effect checks `useReducedMotion` at the hook and has a static
equal.

- `--dur-tap` acknowledges a press; `--dur-move` handles a short reversible move;
  `--dur-enter` handles an arriving state.
- Use the shared strong out-ramp or spring token. Do not scatter default `ease` transitions.
- Do not animate more than two major regions at once, and do not add ambient loops.
- Server-rendered content starts legible. Motion may enhance visible content but never gate it.
- `prefers-reduced-motion: reduce` removes travel, parallax, and non-essential transitions.

## Accessibility and installed display

- Every interactive target has a 44px minimum hit area.
- Keyboard focus must visibly differ from the resting state; do not suppress the outline without
  a same-site replacement.
- All public and console routes must fit a 390px viewport without horizontal document scroll.
- The safe-area tokens protect sticky actions and chrome in standalone display mode.
- Manifest, browser theme colour, generated icons, Apple icon, and Open Graph art must stay in
  palette parity.
- `app/brand-mark.tsx` is the one source of generated app-icon artwork; both metadata routes call
  it at their required size so the installed and Apple icons cannot drift.
- `viewportFit: "cover"` lets the brand field paint through a device notch while safe-area
  padding keeps controls clear in portrait and landscape.
- The app is installable through its manifest, but it does not promise offline operation; there
  is no service worker.

## Copy constraints (design-relevant, non-negotiable)

Patient-facing surfaces carry no clinical judgement: the compliance linters block urgency,
deterioration, diagnosis/test-result bait, benefit claims, and check-up prompting. No testimonials,
ratings, or invented credentials. Finder explanations say what words reached a declared fact;
they do not grade a person or claim a complete clinical fit. `docs/COMPLIANCE-DOSSIER.md` maps
every surface to its governing rule.

## Readiness boundary

The interface, responsive shell, manifest assets, navigation, accessibility, and production build
are app-ready. The runtime is still a synthetic demonstration: console authentication is a demo
flow, stores are process-memory fixtures, live SMS is founder-gated, and practice SSO/persistence
are not wired. Visual readiness must never be described as clinical or operational launch approval.
