# ADHD.ME platform design

The 2026 redesign follows the six user-supplied references and the requirements in [PLAN.md](docs/design/2026-platform/PLAN.md). Implementation and comparison evidence live in `docs/design/2026-platform/`.

## Shared visual language

The founder's direction on 2026-09-17 moved the app to the colour scheme of
[Stef-01/revamped-adhd.me](https://github.com/Stef-01/revamped-adhd.me), the static marketing site:
cream paper and stone, warm near-neutral greys, charcoal ink for content, primary controls and the
footer, a saturated yellow field carrying the header and the mark with ink type on it, deep gold
where the brand has to be text, and the reference's own link blue and sky tints for route and
state. Learning keeps its topic palettes on neutral covers; each game keeps the palette of its own
world (`docs/design/games-to-leo-standard.md`). Reading uses a constrained text measure even when
the workspace uses the whole desktop. The blue scheme of 2026-09-10 and the warm brand before it
remain in `docs/design/2026-platform/` and `docs/design/warm-brand/` as the record.

| Token | Value | Use |
|---|---|---|
| Paper | `#FAFAF7` | Page ground |
| Stone | `#F6F4EE` | Inset and raised surfaces |
| Ink | `#1A1C1C` | Content, primary controls, the footer; 16.4:1 on paper |
| Muted / faint | `#55534D` / `#5F5E59` | Supporting copy and small labels; 7.3:1 and 6.2:1 on paper |
| Brand | `#F1BC31` | The header field, the mark, selection, the active tab on a phone; a surface, never text |
| Brand edge / pill / deep | `#E5B029` / `#F7CF63` / `#E5B026` | The header hairline, the nav container, the hover step |
| Accent (gold) | `#785A00` | The brand as text: links in the accent, eyebrows, focus, the italic word; 6.2:1 on paper |
| Accent deep / mid / tint / soft | `#5B4300` / `#E5B026` / `#FDE7A5` / `#FFF8E6` | The accent ramp; the console's amber utilities read it |
| Route | `#1D64C2` | Text links and state; 5.5:1 on paper. Soft `#DCEDFA`, line `#B9D6EE`, strong `#24487A` |
| Line / strong line | `#E8E6DF` / `#D9D5C9` | Dividers and visible boundaries |
| Signal | `#FF4D2E` | The one warm-red dot in the mark |

Yellow is the ground of the header and nothing else on a screen, so the field reads as identity
rather than decoration; the one exception is the landing's throughline band, a marketing beat on a
marketing page. The mark is the reference's: ADHD small and letter-spaced over "me", the warm-red
point after it, one component (`app/brand-wordmark.tsx`) inside every wordmark link whose
accessible name stays ADHD.ME. Type is the reference's too: Plus Jakarta Sans for the interface and
Newsreader for display and editorial serif. The landing has no navy: its dark beats are the ink of
the footer, its chapters the paper, the stone and the yellow wash. The Learn library's covers are
pastel tints under ink, the reference's card family; the colour lives inside a module. The one
primary on a screen is an ink pill with a yellow glyph and a soft shadow that lifts under a pointer;
the microphone is that pill. Nothing is filled with the deep gold; as a fill it reads olive. Focus is
an ink ring on light surfaces and a yellow one on ink. Two selected states, by role: navigation and
pressed filters are the ink pill; a chosen segment inside content (a module step, an adjustments
tab, a map chip, the library's Games and Modules) is the yellow wash under a gold hairline. A callout
is one hairline and a wash, never a coloured side tab. The finder's filters are one row of pills
under the search, the kind of support first; the row wraps on a desk and scrolls sideways on a
phone. A monogram is the callout wash with deep-gold initials, never a second hue. An empty list
names what emptied it and offers each filter that would bring it back, with the count.
Captures from the production build are in `docs/design/yellow-scheme/`. The colourful educational stages, the meditation player and the games are
the exceptions: each uses its own readable palette while the surrounding library and navigation
stay quiet. The two categorical chart colours are unchanged. Chart greys use the neutral ramp.
Text on dark uses paper; the band's text uses ink.

## Component ownership

- `app/platform-header.tsx`: persistent brand/navigation/help/settings destination.
- `app/app-tabs.tsx`: one route register, accessible active states and filter badge.
- `app/styles/platform.css`: patient shell geometry, header, consent reservation and mobile browsing navigation.
- `app/styles/finder.css`: desktop search composition and provider/profile refinements.
- `app/styles/learning.css`: learning library, lesson pages, examples and responsive focus treatment.
- `app/styles/platform-surfaces.css`: public navigation and operational console primitives.
- `app/styles/brand.css`: the supplied brand's cross-surface colour/type treatment; `:root` in globals.css owns palette values.
- `app/styles/learning-play.css`, `app/learning-activities.tsx`: colourful educational compositions, discovery, sequence, collection and timeline activities.
- `app/site-motion.tsx`: shared route reveals and public/console pointer feedback; reduced-motion users get immediate states.
- `app/meditation-studio.tsx`, `src/learn/meditation.ts`: personal monotonic timers and server-synchronised shared sessions. No fabricated attendance or human host.
- `app/learning-scene.tsx`: original vector cast, seven topic-specific scenes, quiz reactions and educational example interactions.
- `app/play/`, `src/learn/runs.ts`: the twenty immersive game modules integrated from current main; their scenes, clocks, clues and personal-model callbacks remain independent of the reading activities.
- `app/styles/glass.css`: liquid glass, inside a `[data-liquid]` games scope only — the ground the bubbles bend, the rim, the warm/cool dispersion split, the Fresnel ring and the press that compresses them, using the shared warm palette. `app/glass/glass-pointer.tsx` moves the specular under the finger for all of them at once; `app/glass/liquid-glass.tsx` draws the WebGL ground where the machine can, and the CSS washes stand down when it does.
- `src/learn/cursor.ts`: validated device-local reading position, separate from v1 completion records.

Library buttons use `.learn-card`; lesson and quiz pages use `.learn-lesson`. Never share those two layout classes again. New navigation rules must stay in the platform stylesheet; obsolete navigation selectors were removed from `globals.css`.

## Responsive and interaction rules

Four destinations—Support, Today, Learn and My ADHD—share the route register. Desktop navigation is in normal flow at the top, with a second row at 768–1023px and one row above that. Mobile browsing uses bottom tabs; focused reading lessons use All modules/Back/Next/Finish, while games retain their immersive close/progress controls. Content scrolls naturally. A ResizeObserver measures consent height, reserving space and positioning mobile navigation above it without fixed guessed offsets.

Module URLs contain public module identifiers only. Reading position and completion are separate records. Reading activities and quiz answers stay in memory; reopening a quiz restarts it. Reading/quiz Finish marks completion. The current game modules separately retain their established device-local personal-model behaviour. Storage failures leave reading usable. Browser Back returns through module navigation.

Artwork is decorative unless it forms part of an explicitly labelled interactive example. The examples use real buttons, selected states and status text. Reduced motion disables decorative transitions; controls retain visible state feedback.

Each module has its own cover scene. Everyday examples update both a labelled illustration and explanatory status text. Quiz feedback uses the same cast to acknowledge a correct answer, reflect on a misconception, or mark completion. Step changes focus the new lesson heading; navigation observes App Router search parameters so the desktop Learn tab and browser history agree with the displayed content.

## Scope and evidence

The patient shell and learning system have the deepest visual changes. Public and console work updates shared navigation/primitives while preserving existing workflows and route content. Consult the [current review](docs/design/warm-brand/REVIEW.md) and [reference comparison](docs/design/warm-brand/comparison.html) for validation and reference matches; a screenshot alone is not proof of cross-browser behaviour.
