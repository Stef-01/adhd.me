# ADHD.ME platform design

The 2026 redesign follows the six user-supplied references and the requirements in [PLAN.md](docs/design/2026-platform/PLAN.md). Implementation and comparison evidence live in `docs/design/2026-platform/`.

## Shared visual language

The founder's direction on 2026-09-10 returned the app to the blue scheme of the early-September
platform build ("a blue version that was present many versions ago was much better"). The app uses
cool paper and stone, a navy ink for content, primary controls and dark bands, a readable blue for
active states and links, and one orange-to-periwinkle signature band. Learning keeps its topic
palettes on neutral covers; each game keeps the palette of its own world
(`docs/design/games-to-leo-standard.md`). Reading uses a constrained text measure even when the
workspace uses the whole desktop. The warm brand's board and evidence remain in
`docs/design/warm-brand/` as the record of the version this replaced.

| Token | Value | Use |
|---|---|---|
| Paper | `#F7F8FC` | Page ground |
| Stone | `#EDF0F6` | Inset and raised surfaces |
| Ink | `#172033` | Main content, primary controls and dark bands |
| Muted / faint | `#565F70` / `#626B7B` | Supporting copy and small labels |
| Blue | `#4C5F9C` | Active states, links and focus; 5.8:1 on paper |
| Blue deep / mid / tint / soft | `#334679` / `#647BBF` / `#C9D3EF` / `#E9EDF8` | The accent ramp; the console's amber utilities read it |
| Line / strong line | `#D8DEEA` / `#B9C2D6` | Dividers and visible boundaries |
| Band | `#D47839` to `#6679B9` | The signature band, defined once in `:root`; `--on-band` `#FFD9B8` |

Blue is a detail in the platform shell, under 10% of a surface. The colourful educational stages,
the meditation player and the games are the exceptions: each uses its own readable palette while
the surrounding library and navigation stay cool and restrained. The two categorical chart colours
are unchanged. Chart greys use the neutral ramp. Text on dark uses paper; the band's text uses
on-band.

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
