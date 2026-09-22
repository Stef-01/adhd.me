# Mia — Keep the thread

Rebuilt 22 September 2026 at `/lives/play/mia-remember-why` after user review identified that the original room-and-inventory game repeated Theo.

## What changed

The room scene, object collection, carrying slots and delivery tasks are removed. Mia now uses a four-by-four rotating connection network: rotate stable tiles, send a pulse, inspect its path and repair a loose end. Three authored networks increase in length from eight to ten to twelve connected pieces. Replay changes starting rotations. No timer or reading-speed penalty is used.

Interruptions are coupled to interaction, not a background clock. Every fifth rotation can nudge a different connection, with a maximum of two nudges per thread. The affected tile changes colour and the new thought is visible. Parking that exact thought stops further nudges in the current thread. Players may also continue without parking; recovery remains possible. At completion the saved thought labels return, rather than disappearing behind a count.

After the three networks, the player chooses writing the next action or saying it aloud, then pins a connection in the completed route. A new interruption follows. The selected connection retains its actual orientation and is protected from both rotation and interruption, while other connections start scrambled. This is a game metaphor for returning to an external cue, not a model of neurological function or evidence that cueing treats a condition. The existing external-cue module provides the practical follow-on.

## Deliberate contrast with Theo

| | Theo | Rebuilt Mia |
|---|---|---|
| Main verb | Move, collect, prepare | Rotate, trace, reconnect |
| Challenge | Chores, interruptions, departure | Network topology and displaced connections |
| Composition | A furnished house and action panel | One centred abstract thought-board |
| Visual treatment | Warm yellow, illustrated rooms | Deep plum, lilac connections, mint pulse, amber anchor |
| Ending practice | Evening routine and object homes | Capture a thought and pin a return cue |

The platform navigation remains yellow. Mia keeps its canonical character artwork. The board is functional SVG geometry rendered inside accessible buttons, with native text and visible direction-based accessible names. Motion rotates the inner path, not the hit target. Reduced motion removes rotation animation and staggered highlights. Exit and pause remain independent of board state.

## Verification and limits

Pure reducer tests cover all networks and eight replay seeds, bounded disturbances, parking identity, recoverable failed pulses, both cue choices, retained anchor orientation, phase guards and pause. Browser tests exercise library entry, every thread, setup and revisit, touch and keyboard parity, accessible states, small screens and exit hit targets. The text audit traverses all changed states.

This supersedes the previous spatial-room implementation and its QA notes. Automated functional tests do not establish engagement or clinical effectiveness. Observed playtesting and patient co-design review remain outstanding. The two cue choices use the same protected-connection game mechanic, with different practical prompts; there is no microphone recording or speech assessment.

Measured text: Mia entry 17 words, interruption 19, setup 22, cue selection 19, revisit 20, completion 37. All 83 bounded app screens in the 97-screen audit are within their ceiling. A continuous browser playthrough was recorded under `qa/_runs/mia-thread-video/`, alongside desktop, anchor and ending screenshots.

Final verification: production build passed; all 10 reducer tests passed; all 12 browser checks passed across Chromium, WebKit and Firefox, including the four-phase accessibility scans. Final-build text recheck confirmed 17–37 words. Desktop comparison against Theo and phone screenshot review were completed.
