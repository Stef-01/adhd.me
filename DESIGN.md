# ADHD.ME — DESIGN.md

The visual system as it actually exists in `app/globals.css`, re-captured 2026-09-01 (O223)
after the founder-directed reskin session (O216–O222) — the 2026-08-10 capture still described
the sage accent, two accents and one brand system ago. Register: **product** (design serves the
task). Written from the code, not aspiration — where the code is inconsistent this says so
rather than papering over it.

## Theme

Light, warm-neutral, editorial, with ONE brand-gradient chrome carrying every page. The
physical scene that justifies it: a patient on a phone, often at night, deciding whether a
stranger will understand them. Dark mode is not implemented; every token below is single-theme
(`color-scheme: light` at `:root`), and AR18's census governs the deliberate dark BANDS the
light theme contains.

## Color

Two layers, and the distinction is the system:

**The base palette** (`:root`) — paper ground, warm-olive neutrals, one amber accent:

| Token | Value | Role |
|---|---|---|
| `--ink` / `--ground` | `#191a17` | Primary text; the dark pill and band ground (`--on-ground` white) |
| `--muted` | `#696b65` | Secondary text (O157: AA on paper, stone AND white) |
| `--faint` | `#6a6b66` | Smallest labels (AA at 11px) |
| `--paper` | `#fbfaf7` | Page ground; the manifest's launch frame mirrors it |
| `--stone` | `#eeece5` | Raised/inset surfaces, tags |
| `--line` | `#dfddd6` | Hairlines |
| `--accent` | `#8A5A16` | THE amber accent (+ `--on-accent`, `--accent-soft/-mid/-tint`) |
| `--on-band` | `#E0A458` | The accent's voice on dark bands (7.2:1 on `--s-dark`) |
| `--chart-*` | 7 tokens | The dashboard chart's validated categorical palette |

**The brand scheme** (O216, ported VERBATIM from the network deployment — never re-derive
here): seven hues `--hero-glow → --hero-dusk` composed into four definitions that are the only
way any surface may paint the brand:

| Definition | Carries |
|---|---|
| `--band-gradient` + `--band-scrim` | The ACROSS band: `.site-nav`, `.story-header`, the finder header's 2px hairline (`::after` — a gradient on a text ancestor lies to the contrast sweep) |
| `--band-fall-upper` | `.site-footer`, `.story-footer` |
| `--band-fall-lower` | `.aoc-band` — the Acknowledgement's ground; its ARTWORK is never retinted |

Every band rule pairs an opaque `--ground` base with a same-rule light foreground — that is
what the contrast sweep measures and the AR18 census pins, selector by selector.

**The accent law is enforced, not advisory** (`type.accent-live-tokens`, cap 2 meanings per
route, swept by `e2e/accent-discipline.spec.ts`): the accent marks the value that changes and
the word that matters. On the landing that is exactly two things — the claim's drawn underline
and the live stat. Eyebrows and signposts are muted; actions are ink pills; a dark band's
accent is `--on-band`. The story page's scoped `--s-*` tokens resolve to this same amber
family; `.story-chapter-tint` and the Acknowledgement's earth tones are deliberate non-tokens.

**Contrast is a hard gate, not a preference** — measured at the token (O157, three grounds),
at the rendered pixel (the e2e sweep), and at the dark-ground census. Never lighten a text
token for elegance.

## Typography

- **Display:** Newsreader Variable (serif), weight ~430, tight tracking. Questions asked *of*
  the patient, statements, figures. `--font-serif` in `@theme` maps Tailwind's `font-serif`
  here in the network tree; this tree sets the stack per rule.
- **UI/body:** Inter Variable. Everything functional.
- No third family. `text-wrap: balance` on headings, `pretty` on prose. `tabular-nums`
  wherever numbers change (AR21, pinned in `type-scale.ts` alongside the px-exception
  register — inline px exists only where Satori renders with no stylesheet).
- Measure: 45–75 characters; `ch` under-measures this face (~56ch renders ≈66 chars — measure,
  don't reason from the unit).

## Layout & composition

- The finder renders inside the **one shell width** (`--shell-w`: 520px, 640px ≥820px) shared
  by every stage; viewport-keyed media queries do not describe this component's width.
- Group related content so free space falls *around* a composition, never *inside* it.
- Cards are not the default; hairline-bounded bands suit the finder better.
- 44px touch floor everywhere (`interaction.touch-44`); a label's box is the checkbox's target.
- Safe areas: `env(safe-area-inset-bottom)` on pinned bars; Phase 1b of
  `docs/STANDALONE-APP-PLAN.md` owes the standalone-display completeness pass.

## Motion

**A named vocabulary (O218, ported from the network's O197/O239/O252) — three events, three
durations, four curves.** `--dur-tap` 150ms (feedback under the finger), `--dur-move` 180ms (a
nudge that returns), `--dur-enter` 240ms (arriving/leaving); `--ease-ui` for presses,
`--ease-spring` (a sampled `linear()` with real overshoot) ONLY for something arriving or
released, `--ease-soft` for large slow things. `motion` (v13) drives stage transitions;
entrances enhance already-visible content — never gate visibility on a transition. The story
page's choreographed timelines are a declared exclusion, not vocabulary. Reduced-motion parity
is global and includes delays.

## The app surface (O220)

The finder installs: `app/manifest.ts` (standalone display, paper launch frame — its two
literals must EQUAL `--paper`, the same law as `viewport.themeColor`) and `app/brand-mark.tsx`,
the ONE copy of the icon art (the band carrying the serif initial), which both icon routes
call. Never a binary icon, never a face.

## Copy constraints (design-relevant, non-negotiable)

Patient-facing surfaces carry **no clinical language**: the compliance linter blocks urgency,
deterioration, diagnosis, test-result bait, benefit claims and check-up prompting. No
testimonials or ratings anywhere. "Specialist" never appears beside a niche scope. Invented
example profiles (O217) are labeled by `ExampleProfileTag` and their copy passes the same W23
rules as real profiles — invented is not exempt. `docs/COMPLIANCE-DOSSIER.md` maps every
surface to its rule.
