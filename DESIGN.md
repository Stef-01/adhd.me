# ADHD.ME platform design

The 2026 redesign follows the six user-supplied references and the requirements in [PLAN.md](docs/design/2026-platform/PLAN.md). Implementation and comparison evidence live in `docs/design/2026-platform/`.

## Shared visual language

The October 2026 refinement makes the platform quieter. Warm white replaces the saturated
header, flat charcoal controls carry the main action, and sage is reserved for selected content.
The brand mark, serif questions and original learning characters retain the app's identity.

References: [Things](https://culturedcode.com/things/features/) for focused tasks and secondary
details that step back; [Linear](https://linear.app/features) for compact navigation and restrained
hierarchy. These inform the shared shell rather than introduce new workflows.

| Token | Value | Use |
| --- | --- | --- |
| Paper | #FBFBF9 | Canvas, header and browser chrome |
| Stone | #F4F4F0 | Quiet inset surfaces and active navigation |
| Ink | #272925 | Content and primary controls |
| Muted / faint | #62655F / #666A63 | Supporting copy and labels |
| Accent | #53604E | Selected content, links and field focus |
| Accent deep / soft / mid / tint | #3F4C3B / #F0F2EC / #A7B19E / #DCE2D5 | Sage selection ramp |
| Line | #E6E7E0 | Structural dividers |
| Signal | #B77762 | Small mark detail |

Plus Jakarta Sans sets the interface; Newsreader sets patient questions and quoted voices.
Page headings use a quieter 600 weight. Navigation retains icons, labels, a filled active icon
and aria-current. Desktop tabs sit directly on the header; mobile tabs retain their fixed bottom
position, consent offset and safe-area padding.

Main controls have an 8px radius, library cards 12px, and the search composer has a single border.
Learn uses a bounded 1080px workspace, underline tabs, an unboxed care-map link and pale covers.
Its browsing surface no longer opts into liquid glass. Game scenes, lesson palettes, chart
semantics, route behavior and stored personal data keep their existing contracts.

The public header and footer share the neutral surfaces. The marketing story and immersive games
retain their scoped artwork and brand colors. Hover feedback is subtle; focus stays explicit;
reduced-motion preferences are respected. No product copy is added for this visual pass.

## Component ownership

- `app/platform-header.tsx`: persistent brand/navigation/help/settings destination.
- `app/app-tabs.tsx`: one route register, accessible active states and filter badge.
- `app/styles/platform.css`: patient shell geometry, header, consent reservation and mobile browsing navigation.
- `app/styles/finder.css`: desktop search composition and provider/profile refinements.
- `app/styles/learning.css`: learning library, lesson pages, examples and responsive focus treatment.
- `app/styles/platform-surfaces.css`: public navigation and operational console primitives.
- `app/styles/brand.css`: the shared neutral cross-surface colour/type treatment; `:root` in globals.css owns palette values.
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

On a phone, a pushed screen hides the tab bar the way a native push does: a clinician's profile pins its own booking bar to the bottom edge, and Back is the way out. The filters screen keeps the bar and pins its one action above it, offset by the bar's own height token rather than a guessed number, in the bar's bleed so the strip reaches both edges. The 404 and the route error boundary wear the public header and footer like every other public page, so the mark and the exits are where they always are; the welcome question is left-aligned at every width, on one edge with the box and the example link.

A fold is a fold everywhere on the app screens: accent, bold, and a + that turns to − when open, whether it is "More about how they work" on a GP page, "About" on a character card, "Your goals" on the Lives home or "How the microphone works" on the intake. A text link that leads somewhere is accent, bold, with a caret ("Try an example search", "Not sure? Two questions"); muted underlined lines are for footnotes. The care map's nodes are discs sized to their longest label on three rings, so no word spills into a neighbour at any width. On a desk the Today lead card is two columns, words and the one act left, the scene right.

Between the screens the same rules hold: the example searches give the sentence the whole width on a phone, with the two arrows under the card, and their button is the ink primary; the settings sheet is a centred panel on a desk and a bottom sheet on a phone; a forward button says Skip only when the question can be skipped, and a disabled Next otherwise; the bars that are in flow in the app shell carry no glass blur.

Module URLs contain public module identifiers only. Reading position and completion are separate records. Reading activities and quiz answers stay in memory; reopening a quiz restarts it. Reading/quiz Finish marks completion. The current game modules separately retain their established device-local personal-model behaviour. Storage failures leave reading usable. Browser Back returns through module navigation.

Artwork is decorative unless it forms part of an explicitly labelled interactive example. The examples use real buttons, selected states and status text. Reduced motion disables decorative transitions; controls retain visible state feedback.

Each module has its own cover scene. Everyday examples update both a labelled illustration and explanatory status text. Quiz feedback uses the same cast to acknowledge a correct answer, reflect on a misconception, or mark completion. Step changes focus the new lesson heading; navigation observes App Router search parameters so the desktop Learn tab and browser history agree with the displayed content.

## Scope and evidence

The patient shell and learning system have the deepest visual changes. Public and console work updates shared navigation/primitives while preserving existing workflows and route content. Consult the [current review](docs/design/warm-brand/REVIEW.md) and [reference comparison](docs/design/warm-brand/comparison.html) for validation and reference matches; a screenshot alone is not proof of cross-browser behaviour.
