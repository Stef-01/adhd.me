# ADHD.ME platform design

The 2026 redesign follows the six user-supplied references and the requirements in [PLAN.md](docs/design/2026-platform/PLAN.md). Implementation and comparison evidence live in `docs/design/2026-platform/`.

## Shared visual language

The user's warm brand board supersedes the original redesign's colour and type choices. The app uses warm paper and stone, ink primary controls, restrained amber active states, and one orange-to-periwinkle signature band. Learning retains its original characters and interactions on neutral covers. Reading uses a constrained text measure even when the workspace uses the whole desktop. The supplied board and current evidence live in `docs/design/warm-brand/`.

| Token | Value | Use |
|---|---|---|
| Paper | `#FBFAF7` | Page ground |
| Stone | `#EEECE5` | Inset and raised surfaces |
| Ink | `#191A17` | Main content, primary controls and dark bands |
| Muted / faint | `#5A5851` / `#6C6A65` | Supporting copy and small labels |
| Amber | `#8A5A16` | Restrained active states and focus |
| Amber on dark | `#E1A459` | Accent against ink |
| Line / strong line | `#DFDDD6` / `#C4C1B7` | Dividers and visible boundaries |
| Brand blue | `#647BBF` | Graphics; readable blue uses `#4C5F9C` or darker |

Inter is self-hosted for UI and body. Newsreader is reserved for patient questions, at approximately weight 430, -.035em tracking and .99 line height; the finder uses a 54px ceiling. No third font family is introduced. Functional headings remain Inter. Controls retain the responsive redesign's geometry and at least 44px targets.

Amber is a detail in the platform shell, under 10% of a surface. The user's later request explicitly makes colourful educational stages and the immersive meditation player exceptions: these use readable topic palettes, while the surrounding library and navigation remain warm and restrained. Brand blue in the illustrations distinguishes characters by shape and scene as well as colour. The two categorical chart colours remain unchanged. Chart greys use the neutral ramp. Dark text uses paper/line; amber on dark uses on-band. The exact band stops are defined once in `:root`.

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
- `app/styles/glass.css`: integrated surface rims, glare, shadows and supported filters, using the shared warm palette.
- `src/learn/cursor.ts`: validated device-local reading position, separate from v1 completion records.

Library buttons use `.learn-card`; lesson and quiz pages use `.learn-lesson`. Never share those two layout classes again. New navigation rules must stay in the platform stylesheet; obsolete navigation selectors were removed from `globals.css`.

## Responsive and interaction rules

Four destinations—Support, Today, Learn and My ADHD—share the route register. Desktop navigation is in normal flow at the top, with a second row at 768–1023px and one row above that. Mobile browsing uses bottom tabs; focused reading lessons use All modules/Back/Next/Finish, while games retain their immersive close/progress controls. Content scrolls naturally. A ResizeObserver measures consent height, reserving space and positioning mobile navigation above it without fixed guessed offsets.

Module URLs contain public module identifiers only. Reading position and completion are separate records. Reading activities and quiz answers stay in memory; reopening a quiz restarts it. Reading/quiz Finish marks completion. The current game modules separately retain their established device-local personal-model behaviour. Storage failures leave reading usable. Browser Back returns through module navigation.

Artwork is decorative unless it forms part of an explicitly labelled interactive example. The examples use real buttons, selected states and status text. Reduced motion disables decorative transitions; controls retain visible state feedback.

Each module has its own cover scene. Everyday examples update both a labelled illustration and explanatory status text. Quiz feedback uses the same cast to acknowledge a correct answer, reflect on a misconception, or mark completion. Step changes focus the new lesson heading; navigation observes App Router search parameters so the desktop Learn tab and browser history agree with the displayed content.

## Scope and evidence

The patient shell and learning system have the deepest visual changes. Public and console work updates shared navigation/primitives while preserving existing workflows and route content. Consult the [current review](docs/design/warm-brand/REVIEW.md) and [reference comparison](docs/design/warm-brand/comparison.html) for validation and reference matches; a screenshot alone is not proof of cross-browser behaviour.
