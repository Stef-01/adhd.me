# Zoe: implemented conversation slice

22 September 2026. Public route: `/lives/play/zoe-before-you-send`.

The standalone route now uses `ZoeWorldGame` and the pure `zoe-world` reducer instead of the legacy three-round inhibition/hold/tap adapter. The arcade variants remain separate and have not been rebuilt by this change.

## Implemented

- Direct entry, no difficulty selector. Three replay scenarios: a late change, missed call and assumed household task.
- Assemble fact/uncertainty, need and request fragments. Revise them in any order. Inspect the calendar or ask for missing information.
- Rae has independent time availability and limited late-evening capacity. Incompatible proposals are declined without resetting work. Naming uncertainty and clarifying first are both viable routes.
- A saved draft is a real snapshot, restored independently of subsequent edits. A sharp reply requires acknowledgment before the negotiation continues.
- Strategy practice follows agreement: choose a check-in owner, then place the plan in a calendar or phone reminder. The next encounter reads the same plan, owner and cue.
- A changed message supports both rescheduling and keeping separate plans. Completion links to the existing Pause Before Send learning module. Another situation rotates the scenario and clears fictional state.
- No audio, timer or precision input requirement. Keyboard, touch and reduced-motion paths share the same reducer. Hidden tabs pause; pause preserves the draft. The exit remains above the scene when scrolling.
- Fictional gameplay stays in component memory. No symptom score, diagnosis, clinical severity or message text is written into the personal model.

## Validation

Nine model tests cover feasible tactics, capacity, correction, repair, draft snapshots, pause, phase guards and strategy carryover. Fifteen browser cases across Chromium, WebKit and Firefox cover the actual library link, full gameplay, touch/keyboard, 320px phones, landscape, desktop, accessible names/contrast and the scrolled exit. Screenshot inspection covered the phone composition. The full 91-screen text audit passed its ceiling on all 77 app screens. A final targeted measurement after restoring the learning link measured Zoe at 20–32 words across the six later states, including 28 at completion. The merged production build and strict typecheck passed, along with all 45 related Zoe/Theo/Leo model tests.

## Remaining quality gates

This is a first playable standalone implementation, not a claim that engagement has been validated with patients. Co-design observation and continuous play-recording review remain pending. The current interaction uses select-and-place message fragments, not free typing or gesture-driven dragging. Do not imply that it is real messaging, that Rae represents another user, or that a successful fictional exchange assesses communication ability. Future work should test whether fragment assembly has enough strategic depth before adding more visual effects.

Mia is the next implementation in the production order; her asset kit is ready. Keep her spatial mechanics independent from Zoe's dialogue model.
