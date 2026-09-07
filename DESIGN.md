# ADHD.ME platform design

The 2026 redesign follows the six user-supplied references and the requirements in [PLAN.md](docs/design/2026-platform/PLAN.md). Implementation and comparison evidence live in `docs/design/2026-platform/`.

## Shared visual language

The patient app uses a bright full-width shell, white surfaces, a cool grey canvas, blue actions and labelled navigation. Learning adds friendly flat characters, generous coloured covers and interactive explanations. Reading uses a constrained text measure even when the workspace uses the whole desktop.

| Token | Value | Use |
|---|---|---|
| Canvas | `#F7F9FC` | Page background |
| Surface | `#FFFFFF` | Header, inputs, lessons and provider rows |
| Ink | `#182230` | Main content |
| Muted | `#586579` | Supporting copy |
| Action | `#155EEF` | Primary actions, active navigation and focus |
| Divider | `#E4E8EF` | Non-interactive separation |
| Control border | `#AAB7C9` / `#B3BED0` | Input and secondary-control boundaries |
| Learning colours | `#FFD340`, `#FF873C`, `#157C50`, `#C2A3E0` | Collection identities and examples |

Plus Jakarta Sans is self-hosted and used for platform UI. Primary page headings are 30–44px; lesson headings 26–36px; body copy 16–17px; metadata 12–14px. Controls use 10–14px corner radii, provider rows 16px, learning covers 20px, feature/lesson panels 24px. Main interactive targets are at least 44px high.

## Component ownership

- `app/platform-header.tsx`: persistent brand/navigation/help/settings destination.
- `app/app-tabs.tsx`: one route register, accessible active states and filter badge.
- `app/styles/platform.css`: patient shell geometry, header, consent reservation and mobile browsing navigation.
- `app/styles/finder.css`: desktop search composition and provider/profile refinements.
- `app/styles/learning.css`: learning library, lesson pages, examples and responsive focus treatment.
- `app/styles/platform-surfaces.css`: public navigation and operational console primitives.
- `app/learning-scene.tsx`: original vector cast, seven topic-specific scenes, quiz reactions and educational example interactions.
- `src/learn/cursor.ts`: validated device-local reading position, separate from v1 completion records.

Library buttons use `.learn-card`; lesson and quiz pages use `.learn-lesson`. Never share those two layout classes again. New navigation rules must stay in the platform stylesheet; obsolete navigation selectors were removed from `globals.css`.

## Responsive and interaction rules

Desktop navigation is in normal flow at the top. Mobile browsing uses bottom tabs; focused lessons use All modules/Back/Next/Finish. Content scrolls naturally. A ResizeObserver measures consent height, reserving space and positioning mobile navigation above it without fixed guessed offsets.

Module URLs contain public module identifiers only. Reading position and completion are separate records. Quiz answers and scores stay in memory; reopening a quiz restarts it. Only Finish marks completion. Storage failures leave the current visit usable. Browser Back returns through module navigation.

Artwork is decorative unless it forms part of an explicitly labelled interactive example. The examples use real buttons, selected states and status text. Reduced motion disables decorative transitions; controls retain visible state feedback.

Each module has its own cover scene. Everyday examples update both a labelled illustration and explanatory status text. Quiz feedback uses the same cast to acknowledge a correct answer, reflect on a misconception, or mark completion. Step changes focus the new lesson heading; navigation observes App Router search parameters so the desktop Learn tab and browser history agree with the displayed content.

## Scope and evidence

The patient shell and learning system have the deepest visual changes. Public and console work updates shared navigation/primitives while preserving existing workflows and route content. Consult [REVIEW.md](docs/design/2026-platform/REVIEW.md) for validation, reference matches and remaining gaps; a screenshot alone is not proof of cross-browser behaviour.
