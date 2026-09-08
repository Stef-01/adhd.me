---
name: adhdme-taste
description: ADHD.ME's own design law for building or reviewing any UI in this tree. Use before writing or changing patient- or clinician-facing screens, CSS, motion, or copy layout — and when asked for a "taste", minimalism, polish, or design review. Complements web-design-guidelines (generic rules) with this product's specific commitments; where they conflict, this file and the tree's compliance laws win.
---

# ADHD.ME taste

The product is used by people who are tired, possibly older, possibly low-vision, describing
a health worry. Every rule below exists because its violation was found and fixed in this
tree once already. The record lives in `docs/DESIGN-QA.md` and `qa/`.

Each rule below carries a stable id in `{#...}` at the end of its bullet. `src/design/taste-register.ts`
is this law's machine-readable twin — one register entry per id, checked against this file in both
directions by `src/design/taste-register.test.ts` (AR1). Adding, removing or renumbering a rule here
without updating the register is a build failure, not a review finding.

## Layout

- **One idea per screen.** A screen states one thing; controls live inside the statement
  (the mix hero pattern), never beside it competing. {#layout.one-idea}
- **The fold is governed** (`W167` register): nothing above the fold that is not the idea;
  a fold may never cut a tied band or separate a claim from its qualifier. {#layout.fold-governed}
- **Related facts share a row** — a label and its evidence, a name and its distance. If the
  reader must scan two regions to join one fact, the layout is wrong. {#layout.shared-row}
- **Five, then the rest.** Long lists show a chooseable few with the remainder one tap away.
  Never render an unbounded list as the default state. {#layout.five-then-rest}
- **The game bleeds to the edge** (founder, 2026-09-08: "it should feel immersive"). In Play
  the stage is the screen: its ground runs to the viewport edges, the scene runs edge to edge
  on a phone, and there is no card drawn around it. There is zero header while a run is open:
  the shell's header is gone, the stage starts at the top edge, an X at top left backs out,
  and the progress sits beside it in one slim housing (`.play-hut`) over the stage — the only
  chrome the game carries. {#layout.full-bleed-play}
- **No boxes inside boxes.** One container per idea. A border, a radius or a shadow says
  "separate object" and is spent once per screen; a window inside a window inside a shell is
  never the answer. {#layout.one-container}

## Type & colour

- Serif (`Newsreader`) at display scale for statements; the sans carries controls and body. {#type.serif-display}
- Accent colour is reserved for **live tokens** — the value that changes, the word that
  matters. If everything is accented, nothing is. {#type.accent-live-tokens}
- `tabular-nums` wherever numbers change or align. Curly quotes, real ellipses (`…`),
  non-breaking spaces inside names and units. {#type.numeric-typography}
- Palette tokens only (`--ink`, `--muted`, `--accent`, `--paper`…); no raw hex in
  components. {#type.palette-tokens}
- **Minimal darkness** (founder, 2026-09-08). Ink is for text. No black or near-black fill as
  a block, a pill or a button on a patient screen; a control sits on paper, stone or the accent.
  Drawn props are mid-tone, never a dark silhouette. {#type.no-dark-blocks}

## Interaction

- **44px minimum touch target** (O14). Decorative smaller visuals may render smaller but
  the hit area meets the floor. {#interaction.touch-44}
- Hover styles gated behind `@media (hover: hover)`. `touch-action: manipulation` on
  controls. Visible `:focus-visible` ring — never `outline: none` without a replacement. {#interaction.hover-focus}
- Errors are plain sentences with a way out ("…or type instead"), never error-code
  language on a patient surface. {#interaction.errors-plain}

## Motion (`motion/react`)

- Motion must **carry meaning**: a value resolving, an order re-sorting, an object staying
  itself across screens (`layoutId`). Nothing that merely draws the eye. {#motion.carries-meaning}
- `prefers-reduced-motion` is fully honoured — every effect has a static equal, checked at
  the hook (`useReducedMotion`), not just in CSS. {#motion.reduced-motion}
- Indefinite autoplay needs a stop: pause on hover, stop on engagement. {#motion.autoplay-stop}
- Consult `react-view-transitions` for shared-element and route transitions before
  reaching for bespoke animation. {#motion.consult-view-transitions}

## Honesty gates (design-level compliance)

- A claim renders only when it is earned: "ranked on what you asked for" only when the
  order is informed; counts stand alone otherwise. {#honesty.claim-earned}
- No testimonials, ratings, or "specialist/specialise" anywhere a patient reads. {#honesty.no-testimonials}
- Copy about a clinician is their declaration, never our characterisation. {#honesty.clinician-declaration}
- Every new/changed screen ships with a `qa/` capture and a `docs/DESIGN-QA.md` entry. {#honesty.qa-capture}

## Review procedure

1. Screenshot the surface at 390×844 and desktop (Playwright against the prod build). {#review.screenshot-both-viewports}
2. Walk the checklists above; fix in place, smallest diff. {#review.walk-fix-smallest}
3. Re-capture, record the before/after in `docs/DESIGN-QA.md`, keep captures in `qa/`. {#review.recapture-record}
