# Arjun — Hold the thread

Implemented 22 September 2026 at `/lives/play/arjun-hold-the-thread`.

## Gameplay

A shared meeting table with three working spaces. Ask Noor about access and Rae about time, then choose which facts to keep in view. An idea initially competes for a space: either park it or return it to the available notes. All information remains inspectable; an incompatible proposal produces a specific response and leaves the board intact.

Three scenarios cover meeting location, joining format and review format. Options are authored constraints rather than positive/negative answer labels. A real capacity limit matters in the joining scenario. Replay changes the subject, evidence, options and answer position.

After the first agreement, pin the question, retain the idea, and negotiate who will confirm the plan and when. Rae can decline today; agreeing tomorrow or choosing Noor are both valid. The model stores an explicit task, option, owner and time.

The revisit keeps that agreement and parked idea. Timing becomes unknown until Rae supplies the update. The previous option offers the new time but lacks the feature needed by the idea, so changing the time alone cannot complete the meeting. Retrieve the exact saved idea, replace a working card, and select a plan that meets access, capacity, time and the new feature. Completion updates the option while preserving the negotiated owner and time. Nothing is booked or sent externally.

## Distinct presentation and implementation

An open cream page with a pale blue meeting table, paper evidence cards, amber idea card and three participants. This uses the prepared Arjun prop and acting assets. It has no room navigation, object inventory, timed tapping or rotating connection grid.

`src/lives/arjun-world.ts` holds the pure reducer. The client component owns the inspectable People/Options panel and accessible controls. Card entry motion is brief and respects reduced motion. Navigation is sticky and independent of board layout; decorative characters cannot intercept input. Hiding the page pauses play. There are no clinical inferences or patient-profile writes.

## Discovery

All eight character games now have direct cards on Learn → Games. `src/lives/entry-points.ts` is shared with the character library so public destinations stay consistent. The twenty quick games remain accessible from the expanded existing library, and Play mix retains the Chaos Run entry.

## Validation

- 10 reducer tests: every scenario through both organisation tactics; insufficient information; three-space recovery; wrong-plan feedback; owner/time negotiation; exact idea retrieval; changed requirements; actual capacity restriction; pause and replay.
- 12 Arjun browser checks across Chromium, WebKit and Firefox: full playthrough, negotiation, recovery, touch and keyboard controls, small screens, reachable exit and four-phase accessibility scans.
- 16 Chromium discovery/library/existing-journey checks: direct entry and pause/resume for every character game; all twenty quick games opened and started; separated responsive cards; full Maya, Jax and Nina journeys and their practical endings.
- Production build passed. Continuous real-click Arjun video and desktop/phone/options/completion screenshots captured under `qa/_runs/`.

These checks establish functional behaviour and entry coverage. They do not establish clinical effectiveness, enjoyment, or full branch coverage for every pre-existing quick game. Observed co-design playtesting remains outstanding.

Final text audit: 105 screens measured, all 91 bounded app screens within their ceiling. Arjun states contain 20–42 words; the main Games page contains 57. Two additional Leo/Theo public-entry regression tests passed after their links moved into the shared roster.
