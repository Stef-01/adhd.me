# Mia — Remember why

Implemented 22 September 2026 at `/lives/play/mia-remember-why`.

A spatial route puzzle using the original Mia asset kit. Players move through connected rooms, carry at most two objects, set objects down and retrieve those same objects later. Charging the laptop, preparing the parcel with its keys, and an optional book delivery have actual location dependencies. The hall connects every room. Three replay layouts change where objects begin.

Sam interrupts after two room changes. Accepting the request adds a real delivery; asking Sam to collect is an equally valid outcome. The plan stays inspectable. There is no timer, speed score or irreversible failure. Pause preserves objects and room state, and hiding the tab pauses play.

After the first encounter the player assigns homes to the charger, parcel and keys, chooses a portable or hallway cue, and agrees who brings the book. The revisit reads these exact choices. A portable cue follows Mia; a threshold cue resurfaces the plan when she crosses the hall. The cue can be moved during the revisit. The ending reports room changes and links to the existing external-cue module; it does not infer a clinical deficit from fictional gameplay.

## Implementation

- `src/lives/mia-world.ts`: pure reducer, object identity, room topology, carrying capacity, request ownership and phase guards.
- `app/lives/mia-world/player.tsx`: accessible room controls, separate inspectable inventory, responsive native SVG scene, reduced-motion support and focus management.
- `app/styles/mia-world.css`: yellow navigation, lilac room world, independent layout and reachable sticky exit. Room controls preserve their positioning transform when pressed.
- Static public route replaces the previous generic Mia journey; library links enter directly.
- No new dependencies, external requests, personal-health writes or local-storage inference.

## Validation

11 reducer tests cover all replay layouts, recoverable carrying limits, object continuity, hallway routing, delivery dependencies, interruption, both cue types, repositioning, pause and phase guards. 15 browser checks across Chromium, WebKit and Firefox cover direct library entry, full encounter/setup/revisit, accepted book delivery, touch-only play, persistent exit, overflow at 320×568 / 390×844 / 844×390 / 1440×900, and automated accessibility checks at all four phases. Production build includes TypeScript validation.

Text audit: 98 screens measured, all 84 bounded app screens within their ceiling. Mia's audited states contain 22–35 words (entry 30, request 31, home setup 24, cue 22, owner 23, revisit 35, completion 24).

These checks establish functional behaviour, not clinical effectiveness or patient engagement. Patient co-design review and observed playtesting remain necessary. Replay variants currently change object placement, rather than introducing three entirely different narratives.
