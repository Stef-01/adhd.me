# Next three Lives games: production asset handoff

Status: **assets and review surface, not implemented games**. 21 September 2026.
Sequence follows `docs/design/game-upgrade-v2/PLAN.md`: Zoe → Mia → Arjun.
Preserve the yellow platform shell. Each world has its own spatial grammar, inputs and consequences.

## Delivered files

`public/games/next-three/manifest.json` is the authoritative inventory: 75 new original SVG files plus 104 explicit reusable character, prop and audio references. Reused files are intentionally referenced rather than duplicated. `review.html` previews all four moments in both orientations, with inspectable props and placement controls. It is an internal art-review surface, not a patient game or evidence of finished gameplay.

Per game: ten purpose-drawn props; three new acting poses; desktop and phone backgrounds, furniture, complication layer, strategy setup, revisit layer and static composition preview (25 files). Existing twelve-pose rigs cover both the main and supporting cast. Arjun includes both Noor and Rae. No text, scores or personal messages are baked into art.

All new illustrations are editable, original SVG geometry consistent with the canonical bean cast. No raster image generation, external artwork, imitation character sprites or new runtime dependency was needed. Deterministic source: `scripts/generate-next-three-assets.py`. Validation: `scripts/validate-next-three-assets.py`. Browser review: `scripts/qa-next-three-assets.mjs`.

## Distinct gameplay and asset contracts

| | Zoe: Before you send | Mia: Remember why | Arjun: Hold the thread |
|---|---|---|---|
| Genre | Conversation assembly and negotiation | Spatial cue and route puzzle | Collaborative information-board puzzle |
| Camera | Side-on two-person evening, private workspace | Connected rooms and meaningful thresholds | Top-down meeting table with three working slots |
| Main input | Inspect, compose, hold, propose, revise | Select/carry/place, move rooms, retrieve cue | Pin, link, park/retrieve, hand back turn |
| Scarcity | Available information and mutually feasible plans | Two objects plus one cue; meaningful cue positions | Three working slots; agenda relevance |
| Challenge | Uncertain intent, incompatible availability, repairing impact | Interruption changes intention while objects persist | Missing information, competing proposals, changing agenda |
| Never substitute | Nicest-answer quiz, partner approval meter | Hidden-list memory test, another timed packing game | Speed-click dialogue, hold-to-listen endurance |
| Enacted strategy | Keep draft; negotiate owner/time/return cue or separate plans | Place point-of-action cues and agree task ownership | Anchor current question, park a thought, record action and owner |
| Revisit proof | Saved agreement constrains a new message | Exact player-placed cues survive another interruption | Parked idea returns and the action card supports the decision |

Zoe's art uses rose, parchment and muted plum; Mia uses lilac with distinct room materials; Arjun uses periwinkle, teal information pieces and ochre ideas. Identity is not conveyed by colour alone: envelopes, tags, ribbons, puzzle tiles and pockets have different silhouettes. Preserve canon colours in the shared rigs.

### Zoe: object-to-state mapping

- `draft-envelope`: private draft persists through pause and repair. Never publish its contents automatically.
- `fact-fragment`, `unknown-fragment`: distinguish known information from an assumption; an unknown can become a fact only through an authored response.
- `need-fragment`, `request-fragment`: separate feelings/needs from a concrete proposal. Render their actual content as accessible DOM text.
- `calendar-open` → `calendar-agreed`: only after both actors accept a feasible arrangement. A decline keeps the calendar open; no forced forgiveness.
- `boundary-ribbon`: a valid separate plan or deferred conversation, not a failure emblem.
- `return-cue`: stores when to return to the conversation; revisit reads the actual commitment record.
- `agreement-link`: depicts a mutually accepted connection; never an emotional health score.
- Acting: `hold-draft`, `set-boundary`, `offer-plan`. Use existing upset/thinking/relieved poses in response to authored scene events, not as a correct-answer reward.

Scenarios: late change (clarify why or openly propose an alternative); missed commitment (acknowledge impact and renegotiate); assumed household task (clarify ownership and allow separate responsibilities). Each scenario supports two valid routes and a repair after a sharp reply. Rae retains independent availability and preferences.

### Mia: original object-to-state mapping

Implementation update, 22 September: user review rejected the room-and-inventory design as too similar to Theo. The replacement is a rotating thought-network puzzle. `MIA-IMPLEMENTATION.md` supersedes this section for gameplay; the original room assets remain available but are no longer used by the public Mia game.

- `charger-loose` → `charger-docked`: player places the needed object at a chosen useful home; retain its ID and location.
- `parcel-sealed` → `parcel-ready`: confirm the action on the parcel rather than treating finding it as completion.
- `portable-cue`: occupies the cue slot, travels with Mia and remains inspectable.
- `threshold-cue`: stays where placed; entering that semantic zone presents its content without forcing an action.
- `object-home`: a persistent destination with object identity, not an inventory deletion effect.
- `shared-board`, `owner-token`: task, owner and return cue must be explicit. Sam is not a permanent reminder service.
- `intention-thread`: brief visual connection between cue and next action; reduced motion uses a static connection and status.
- Acting: `place-cue`, `recall`, `share-task`; existing walking/carry poses serve spatial movement.

Scenarios: charger across a room transition; parcel interrupted by a call; shared request interrupted by another room task. Portable cues and threshold cues are both legitimate. A badly placed cue can be moved without resetting. The goal remains inspectable throughout.

### Arjun: object-to-state mapping

- `agenda-anchor`: pin current question; changing agenda does not erase the previous anchor.
- `fact-tile`, `question-tile`, `idea-tile`: distinct information types. Actual statements belong in DOM text and remain available without audio.
- `parking-pocket`: stores an idea ID; retrieval must restore the exact item rather than spawning a replacement.
- `turn-token`: depicts current turn/hand-back. Respectful interruption and clarification are both allowed; no eye-contact task.
- `repeat-token`: request missing information without penalty.
- `decision-bridge`: links evidence to a proposal; an unsupported link can be undone.
- `action-card`, `connection-pin`: final shared artifact with action, owner and return cue. It must match the accepted decision.
- Acting: `offer-turn`, `pin-anchor`, `retrieve-idea`. Noor and Rae contribute independently.

Scenarios: choose a meeting location under access/capacity constraints; choose an event format with one missing requirement; assign a shared next step after the agenda changes. Use fictional neutral facts. Anchor-and-clarify and park-and-retrieve remain viable tactics. Three board slots create organisation decisions, not a deadline for reading.

## Rendering and interaction

- Desktop viewBox: 1200 × 760. Phone: 390 × 700. Reflow DOM controls around the world; do not shrink the entire desktop game into a phone.
- Render background → furniture → phase overlay → interactive props → characters → DOM controls. Theo's fix applies here: character visuals are above props with `pointer-events: none`; navigation remains independently reachable.
- `anchors` in each furniture entry are scene coordinates. Divide by the viewBox to get relative positions. They identify semantic locations, not collision geometry. Define model hit regions explicitly; minimum 48 CSS pixels after scaling.
- Props have 128 × 128 viewBoxes and pivot [64,112]. Characters use 160 × 176 and pivot [80,158]. Keep hit targets stable while visual rigs move.
- IDs in new rigs preserve `body`, `face`, `arms`, `legs`. Inline SVG only when animating named groups; multiple inline instances require unique ID prefixes. External SVG images work for static poses.
- Text, private drafts, captions, counts, owner names and card statements must be native accessible DOM. Labels in SVG titles are authoring metadata, not a substitute for control names.
- `composition-preview` is a flattened arrangement for review only; gameplay uses separate layers and props. The gallery's placement action is deliberately not game logic.
- Accepted feedback: 140 ms; placement settle: 220 ms; scene transition: 320 ms. Use existing Motion. Reduced motion uses static poses and immediate placement, preserving all facts. Never move hit targets with decorative motion.
- Audio reuses the project's faded PCM cues, off until consent: Zoe paper/notification/place/exhale; Mia footsteps/pickup/place/door; Arjun paper/place/pickup/completion. Keep it quiet and optional, with a visible equivalent. Do not loop notifications or voice synthetic dialogue without separate review.

## Coverage and remaining implementation gates

Art covers encounter, complication, untimed strategy practice and changed revisit in both layouts. Additional completion art is intentionally unnecessary: finish in the changed world with the real saved artifact. Do not add a generic trophy screen.

The asset pack does not make these games complete. Build Zoe first, then Mia, then Arjun. Before release for each: pure reducer tests; two viable tactics; recovery without reset; causal strategy carryover; continuous play recordings; keyboard/tap equivalents; pause/hidden/exit cleanup; short-screen controls; accessible dynamic content; and observed co-design playtesting. Review comprehension, challenge and replay interest with actual participants. Do not infer clinical deficits from performance.

## Verification

The validator checks every new SVG parses, every SHA matches, all referenced files exist, scene anchors stay inside their viewBoxes, both orientations have every layer, and there is no embedded script, external raster or baked text. Browser QA visits all 24 game/layout/phase combinations, checks image decoding, overflow and preview interaction, and captures six compositions. Screenshots are development evidence under `qa/_runs/next-three/`; generated imagery is not patient validation.
