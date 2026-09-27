# Lives: September 27 polish pass

Baseline: fresh clone of main at `87ad1dc4`. This checklist updates, rather than replaces, PLAN.md. The newer main already contains eight standalone worlds; do not rebuild them from the older shared-journey specification.

## Release in this pass: Maya

The concourse needs timing and recovery, not another item-collection objective. Preserve three increasingly complex crossings, physical strategy setup, and a changed revisit. Add:

- Three original illustrated settings: station, library, market. Floors, destinations and benches change together. Six crowd silhouettes and dedicated strategy props replace generic UI icons in the scene.
- Explicit wait action. In player-paced mode it advances the simulation by 900 ms without commanding movement, allowing gaps to open and load to recover. Waiting in a crowd remains a decision with consequences.
- A 1.2-second recovery window after crowd contact prevents consecutive hits from trapping Maya. A visible protective ring explains this temporary state. Recovery does not remove speakers or messages.
- Short footstep trail, crowd-direction marks and a pre-announcement warning. The scene communicates the next decision with minimal text.
- Headphones are visible on the revisit. Quieter-route selection still reduces actual crowd density; do-not-disturb still removes incoming pings. Keep these causal effects in the reducer.
- Captured pointer gestures consume their following click. Cancelled gestures do not move the player. Direction buttons and keyboard remain equivalent alternatives.
- Reject invalid time deltas and bound long frames; substep real-time collisions at 50 ms.

Asset source: `scripts/generate-maya-polish-assets.py`. Output: `public/games/maya-journey/`, 24 SVGs and a SHA-256 manifest. Original vector artwork; no licensed reference screenshots embedded. No text baked into images. The game keeps its existing muted-by-default sound system.

## Next releases, one game at a time

| Game / current distinct mechanic | Gameplay work to prototype | Assets needed for that work | Release gate |
| --- | --- | --- | --- |
| Leo / active bedroom swarm | Make approach, landing and ingress legible; compare catching-first and prevention-first; preserve settle choices after rounds | Insect approach/land silhouettes, window seal states, reading bookmark and routine prop states | Both tactics complete; closing a source stops that source; no tiny mandatory moving targets; routine visibly changes revisit |
| Theo / morning route and carrying | Route-cost preview, clearer parallel charging, optional chores visually subordinate to essentials; tune recovery before adding pressure | Three distinct room layouts, staged essentials, wet-weather path cues | Two successful routes per layout; miss the train without losing progress; exit always reachable |
| Zoe / live message reflex | Make timing about holding a draft and checking context, not simply faster taps; show reciprocal needs and repair after a sharp reply | Draft/held/sent envelope states, other person's availability, shared commitment timeline | Repair works after escalation; private draft retained; partner can decline; player-paced parity |
| Mia / connection routing | Add authored alternate network solutions and a disruption that changes a connection, while maintaining a recoverable cue | Node families, reconnection paths, anchored intentions, interruption vignettes | Two valid routes; no Theo-like collect-and-carry loop; cue remains useful in revisit |
| Arjun / meeting thread and pins | Competing speakers and a changed owner/time create prioritisation; allow clarification rather than guessing | Speaker turn cues, ownership pins, corrected note states | Wrong assumption can be corrected; evidence remains inspectable; full keyboard pinning |
| Jax / three-lane shopping | Make substitutes and later wishes meaningful budget choices; tune readable arrival windows and recoverable extras | Product variants, stock gaps, wishlist pockets, till return animations | Required needs remain obtainable; extras return before payment; two viable baskets; no financial assessment from tokens |
| Nina / pen steering and draft assembly | Keep uninterrupted writing satisfying; ensure revising a brief does not erase work; experiment with less repeated steering between meaningful decisions | Ink trails, draft layers, critic blots, return markers, three distinct paper environments | Real draft assembled; changed brief handled; no work deleted by a collision; pause/player-paced complete |
| Maya / crossing with sensory sources | After this pass, test alternate paths and environmental planning with users before raising crowd density | More event-specific platform/lift/market props if playtest finds navigation unclear | At least two effective approaches; waiting and recovery understood without a tutorial |

## Engineering and QA contract

Keep pure models game-specific; share the shell, clock, audio and input conventions. Do not turn every game into the same configurable puzzle. Reject duplicated actions, stale targets and invalid timing; release captures on cancel; freeze on pause/hidden; restore focus deliberately. Images are decorative companions to real controls, never the only source of instructions.

For each release: unit-test causal strategy effects and recovery; complete normal and player-paced play; test touch, keyboard, sound-off and reduced motion; inspect 320×568 and short landscape as well as desktop; audit accessibility in play/setup/revisit/complete; check asset decode, browser errors and game discovery. Measure patient copy with the repository text-budget script.

Automated success establishes functional coverage, not enjoyable or therapeutic gameplay. Observe exploratory and hesitant players: first useful action, confusing collisions, repeated unproductive actions, whether they can explain the strategy effect, and whether they choose to replay. Tune from that evidence before calling the experience finished. Never write gameplay speed or fictional load as symptom severity into the health profile.
