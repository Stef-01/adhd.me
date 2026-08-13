# Meherr — DESIGN.md

The visual system as it actually exists in `app/globals.css`, captured 2026-08-10 so units
built by the loop extend one language instead of inventing a ninth. Register: **product**
(design serves the task). Written from the code, not aspiration — where the code is
inconsistent this says so rather than papering over it.

## Theme

Light, warm-neutral, editorial. The physical scene that justifies it: a patient on a phone,
often at night, deciding whether a stranger will understand them; and a practice manager on a
desktop mid-shift. Both need calm and legibility, neither needs drama. Dark mode is not
implemented and should not be added casually — every token below is single-theme today.

## Color

| Token | Value | Role |
|---|---|---|
| `--ink` | `#191a17` | Primary text, primary button fill |
| `--muted` | `#6e706a` | Secondary text, quoted examples |
| `--faint` | `#6b6c67` | Smallest labels (darkened in W49 from `#a3a49f`, which failed AA at 11px) |
| `--paper` | `#fbfaf7` | Page ground |
| `--stone` | `#eeece5` | Raised/inset surfaces |
| `--line` | `#dfddd6` | Hairlines and dividers |
| `--sage` | `#66774a` | The single accent: counters, eyebrows, affirmative states (darkened in W49 from `#728356`, which failed AA as body text) |
| `--sage-soft` | `#eef1e8` | Sage-tinted surface wash |

**Strategy: restrained** — tinted neutrals plus one accent well under 10% of surface. Do not
introduce a second accent hue without a stated reason; the calm is the point.

**Contrast is a hard gate, not a preference.** W49 ships an axe sweep at WCAG 2.1 AA with zero
violations enforced over every public route, and two of the tokens above exist in their current
form *because* the sweep failed them. Never lighten `--muted`, `--faint` or `--sage` for
elegance; fix contrast at the token, since each is a text colour in many places and the sweep
only reaches routes it knows about.

**Known tension, stated honestly:** warm near-white + sage + serif display is a saturated
"calm healthtech" family — the first-order category reflex. It is the founder's selected
direction (`design/careyield-selected-direction.png`), so identity preservation wins over
novelty. If the aesthetic is ever revisited, the move is a committed ground (a saturated brand
surface or a true off-white at chroma 0), not another warm-neutral variant.

## Typography

- **Display:** Newsreader Variable (serif), weight ~430, `letter-spacing: -0.035em`,
  `line-height: 0.99` on the finder's h1. Used for questions asked *of* the patient.
- **UI/body:** Inter Variable. Everything functional.
- Pairing is on a genuine contrast axis (serif display + geometric-humanist sans). Do not add a
  third family.
- Display clamp ceiling in use: `clamp(42px, 11vw, 54px)`. Stay at or under ~96px anywhere.
- Use `text-wrap: balance` on headings, `pretty` on prose.

## Layout & composition

- The patient finder renders inside a **fixed ~520px app shell** shared by every stage
  (welcome → listening → review → type → booking). This is the single most important layout
  constraint in the codebase and it is easy to miss: **viewport-keyed media queries do not
  describe this component's available width.** A two-column desktop layout was attempted in D1
  and reverted for exactly this reason. Use container queries; widening the shell is a
  cross-stage change deserving its own unit.
- Group related content so free space falls *around* a composition, never *inside* it. The D1
  defect was `margin: auto` on one child claiming all slack and splitting one idea in two.
- Cards are not the default. The finder uses hairline-bounded bands, which suit it better.

## Motion

`motion` (v13) drives stage transitions and the archetype switcher. Entrances are short
(~0.2s) opacity+offset crossfades, directional on the switcher so it reads as travel through a
list. Reveals enhance already-visible content — never gate visibility on a transition, since
the a11y sweep screenshots settled frames and a gated reveal ships blank. Reduced-motion
alternatives are required.

## Copy constraints (design-relevant, non-negotiable)

Patient-facing surfaces carry **no clinical language**: the compliance linter blocks "overdue",
urgency, deterioration, diagnosis, test-result bait, benefit claims and check-up prompting; the
register console additionally bans "needs", "at risk", "requires", "should be seen". No
testimonials or ratings anywhere. Copy is scheduling language about availability, never advice.
`docs/COMPLIANCE-DOSSIER.md` maps every surface to the rule that governs it.
