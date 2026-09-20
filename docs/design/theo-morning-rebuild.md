# Theo: a morning with consequences

The public Theo route is replaced at the user's request. This takes priority over the previous Zoe-next ordering. The shared arcade mini-game stays intact.

## Direction

A playable cutaway house, warm amber (#f8d889), paper (#fff6dc), terracotta (#d98c62), fern (#80b6a0), deep green (#284b40), and evening blue (#425674). The current yellow brand surrounds the scene: cream #FAFAF7, ink #1A1C1C, yellow #F1BC31 and Plus Jakarta Sans for controls; the scene headline uses Newsreader. The signature is continuity: Theo crosses the house, carries objects, fills a bag, and returns to the same home after arranging it that evening.

## Challenge and learning

- Seventy seconds to the train. Walking and doing tasks consume time. The phone charges independently, so task order and overlapping work matter.
- Two hands, three essentials, a bag in the hall, and shoes to put on. Routes and batching matter; clicking everything cannot finish instantly.
- Optional chores arrive during the morning. A spill changes travel cost. Clearing it and taking the longer route are both viable.
- Unresolved demands and changing direction affect Theo's fictional agitation. A short pause or parking tasks is a recovery action, with a time trade-off.
- Missing the train keeps the world intact. Updating Ari changes the shared plan; Ari can go ahead and meet inside. There is no relationship score or automatic forgiveness.
- At night, the player assigns actual homes to essentials, charges the phone, fills the bottle, and can set an earlier cue and a later note. The next morning uses that arrangement, with rain adding a new requirement.
- The ending compares actual travel, with an optional handoff to the existing launch-pad module. No personal or clinical data is recorded.

## Implementation

A deterministic state machine in src/lives/theo-morning.ts owns routes, finite tasks, object conservation, charge, demands, deadlines, social state and saved arrangements. The standalone React scene consumes it; the old arcade engine remains unchanged. A 100 ms simulation step bounds work and React rendering. Transforms interpolate the character between room nodes. Retargeting completes the current corridor segment, preventing teleportation. Pausing and hidden tabs freeze the simulation. Reduced motion runs the same action costs on demand, with no time pressure while reading.

## Acceptance

Test feasible and inefficient routes, charge overlap, hand capacity, early exit, interruption recovery, single-use plan updates, setup persistence, rain, replay reset, pause and hidden tabs. Exercise the actual public route with keyboard, touch, reduced motion and ordinary timing across Chromium, Firefox and WebKit. Inspect phone and desktop screenshots; measure all screens with the text-budget script. Production deployment and a live route check follow commit/merge/push. Passing automation is implementation evidence, not patient validation.

## Implementation and QA record — 2026-09-18

- Integrated main `6d78392` before release, including the yellow brand, Plus Jakarta Sans and the upstream fake-clock helper. Game artwork retains its amber/fern world as DESIGN.md explicitly allows.
- Added 13 deterministic simulation tests. The complete Lives suite passes 104 tests; the shared arcade Theo implementation is preserved.
- The public-route suite covers entry from Learn, keyboard actions, real task costs, charging overlap, two-hand capacity, retargeting, missed-train recovery, one-time arrival updates, pause/hidden tabs, stored object homes, earlier cues, rain, replay and absence of personal-model writes.
- Responsive checks cover 320×568, 390×844, 768×1024, 1440×900, 1920×1080, 844×390 and 568×320. Each supported next-morning arrangement is physically clicked at 320px. Short viewports scroll naturally; the house does not crop controls to force a one-screen fit.
- Axe checks cover the house, evening and completion. Fixed the initial inventory contrast and an invalid generic-element ARIA label.
- Browser QA caught and fixed a hall object being covered by the bag. The regression completes all three home arrangements. The pause assertion now explicitly checks hidden disabled controls; WebKit's simulated-minute checks have enough runner time without skipping timer ticks.
- A normal-speed Chromium recording caught the train in 55 seconds with nine crossings and no page errors. The final room placement keeps Theo's feet on the floor rather than over furniture.
- All 73 measured screens are within their applicable ceiling. Theo: entry 39, competing demands 40, pause 27, departure 24, evening 29, revisit 37, complete 29 words. Screen-state traversal is part of the permanent text-budget gate.

The game's pressure and timings are fictional. This evidence demonstrates technical behavior and observed local playability; patient engagement and strategy understanding have not been measured in this change.