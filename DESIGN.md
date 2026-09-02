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

The results screen carries a **nearby map** once the place resolves: an in-tree SVG projected from
the gazetteer (no tile host, no coordinate leaves the device), with distance rings at true radius
and one route-blue stop per consulting suburb keyed to the rows below. The keys are list positions,
never ranks, and they render only while the map does. Pins and keys are route blue; the accent is
still reserved for the row.

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

## Interaction and motion

Motion follows a Jakub-primary / Emil-secondary standard: spatial continuity first, polish
second. It must explain where an object or state went.

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
