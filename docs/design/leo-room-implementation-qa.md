# Leo room rebuild: implementation and review record

Date: 2026-09-16. Scope: one complete playable Leo candidate. The other seven story rebuilds remain in the staged plan.

## What exists

The isolated review route is `/lives/lab/leo-room`. It enters directly into play, with no difficulty screen. It is unlinked from the patient library and carries noindex metadata. The existing public Leo route remains the current library entry. This makes the complete candidate reviewable without presenting it as an accepted replacement.

The candidate has an authored room, a timed intrusion phase, recovery in the same scene, a physical wind-down sequence, a following evening, and three replay starting conditions. It is the first L1/L2 implementation, not an L3 release or patient-validated experience.

## Causal model

- Catching removes one existing mosquito and its sound. An open window can still admit later arrivals.
- Closing the window blocks scheduled ingress and preserves insects already inside. Closing it immediately is a valid strategy; the game does not secretly reopen it.
- Parking the phone stops its future authored interruptions. It does not remove mosquitoes.
- Multiple live insects and phone demands affect a fictional regulation value and Leo's pose. Reaching the deadline or overload enters recovery without resetting props or removing the work still present.
- Reading before the room is manageable keeps the current place but cannot advance the page. Once the room is manageable, a short reading sequence leaves a bookmark.
- Headphones are an optional comfort choice. With sound enabled they add a quiet brown-noise bed; silent play can reach the same ending.
- The next evening retains the window, phone, headphones and bookmark. Two mosquitoes remain outside, notifications are held, and one mosquito already inside still needs attention. Reusing the bookmark completes the second evening.
- Replay rotates through an open window, an already-secured window with more indoor insects, and an open window with phone interruptions already waiting.

There is no score written to the patient profile. The simulation has no network calls or persistent emotional data.

## Implementation

`src/lives/leo-room.ts` is a pure reducer with authored event times, six occupancy slots, duplicate-input rejection, deterministic bounded trajectories, immutable state transitions and explicit modes. Unit tests cover causality, endings, still-mode events, queued arrivals, replay and stale inputs.

`app/lives/leo-room/use-bedroom.ts` owns one animation frame loop and integrates fixed 50 ms steps. Motion values update positions independently from the React HUD, which publishes at approximately 8 Hz or on a meaningful event. Hidden tabs pause. Cleanup cancels the loop and removes the listener.

`player.tsx` composes the physical props, native buttons, a focus-managed native pause dialog, one meter, timer and contextual line. Pointer and keyboard catches have separate focus behavior. Still mode advances authored events by meaningful actions rather than a passive deadline; both OS reduced-motion and the optional pause-menu setting are supported.

`art.tsx` contains original vector room/prop/character art. The book moves onto the bed; the window sash closes; the phone enters its dock; Leo's pose and headphones respond to state. Animation completion never controls game logic.

`audio.ts` starts only after a sound gesture. It caps the mix at six insect voices, fades removed voices, creates an optional filtered brown-noise loop, and disposes resources on exit. Audio startup has a bounded wait. Failure offers quiet play and does not permanently obscure subsequent game feedback.

Desktop uses the room's width. Small landscape uses the left side for the objective and the right for the scene. Short phones use smaller, still touch-sized targets and tighter flight ranges. Props and flight areas have separate reserved space.

## Internal review and fixes

Internal scripted play covered early prevention, interrupted reading, inactivity and recovery, quiet/headphone endings, still-mode causal events, preserved arrangements, and replay. A continuous normal-speed recording includes first entry, increasing intrusion, reading interrupted by buzzing, recovery, enacted bedtime, and the next evening. This is engineering/visual evidence, not observation of an unaided participant.

Defects found and corrected:

1. Mouse catches inherited keyboard focus handling and froze the next target. Focus transfer now happens only for keyboard activation.
2. Ending controls retained action labels despite being disabled. The sleeping scene now describes the state: lights out, phone parked, bookmark kept.
3. The mobile phone label touched the screen edge. Its placement now leaves space.
4. Full occupancy overlapped the lamp; the phone/book hit areas also intersected. Perches and lower props were repositioned, with a regression check for all enabled target pairs.
5. Opening the book caused an additional short-phone intersection. The book's reading position now reserves space above the headphones.
6. Manual still mode could pause an entrance at its initial position. It now removes decorative animation.
7. Audio failure could mask later gameplay messages. It clears on the next game action, and failed startup releases resources.
8. Scene height changed when the next-evening button appeared. Footer space is reserved across the transition.
9. The shared platform heading selector overrode game typography and pushed a short-landscape ending into the toolbar. Game heading/paragraph rules now have explicit component scope; the small-landscape ending keeps its objective in the existing footer instead of repeating it.

The visual direction follows the supplied references through a single coloured scene, an expressive character, object-based interaction, short labels and restrained application chrome. It preserves the current lavender/blue family. No site-wide palette or Learn glass changes are included.

## Evidence and limits

- Production build and TypeScript: passed. The final responsive correction is verified against built assets.
- Lives unit suite: 91 passed, including 15 new room tests.
- Full-site text measurement: 67 screens measured, zero over their ceilings. Leo active: 32 words; reading: 33; rest: 27; next evening: 33; completion: 27; pause: 16.
- Browser coverage: 27 cases across Chromium, WebKit and Firefox. The initial run passed 22; the corrected recovery, sound and collision rerun passed all nine selected cases, covering the five original failures. No skipped tests. The final built-asset regression run passed all nine layout, full-occupancy collision and accessibility cases across those three engines. Layout checks cover eight viewports from 320 x 568 and 568 x 320 through 1920 x 1080, across active play, rest, revisit and completion.
- One local headless Chromium sample at 1440 × 900, normal motion and no CPU throttling: 241 frames in four seconds, 16.7 ms median frame interval, 16.8 ms p95, no observed long tasks. This small desktop sample is not a mobile-device performance claim.
- Headless WebKit on this machine exposes neither `AudioContext` nor `webkitAudioContext`. Its sound check verifies the quiet fallback. Native audio lifecycle is checked on engines that expose Web Audio; actual Safari-device audio still needs device review.

Local run artifacts are in `qa/_runs/`: production build log, unit log, text measurement, browser reports, state screenshots, performance sample, and `leo-room-playthrough.webm`.

## Remaining acceptance work

The candidate needs patient co-design observation, unaided strategy-comprehension review, actual mobile-device sound/performance review, and gameplay tuning. In particular, whether the two flight behaviors and three authored starting conditions create enough interesting replay has not been established by automated tests. The fast source-first path is intentionally valid, but its satisfaction and the pacing of the short reading ending need people to judge them.

L3 remains pending. Do not replace the library entry or use Leo as an accepted quality reference for Zoe until the craft review accepts the whole experience. Do not mark all Lives games complete from this implementation.

## Reported Try action: 2026-09-17

Status: not reproduced. The reported wording was “Try something”; no control with that exact label exists on the Leo preview. Its ending link is “Bring it into your day”.

The live preview was played through both evenings and into Lower the Sensory Floor, through the action plan, then into the Toolkit. This passed with reduced motion and with normal-motion touch input in Chromium and WebKit, with no page errors. The score-screen “Try now” link and the finder example-search flow also responded during the preceding investigation.

The committed regression now exercises Leo's entire handoff with normal motion and touch input, chooses a plan, opens its Toolkit entry and reloads to verify persistence. It passes in Chromium, WebKit and Firefox. Earlier Leo tests stopped at game completion and did not cover this downstream action. No functional application fix is claimed: the remaining diagnostic input is the exact nonresponsive control or the state in which it stops responding.
