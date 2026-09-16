# Lives gameplay and subtle strategy learning: staged upgrade plan

Status: proposed implementation specification; not implemented by this document.
Audit baseline: main `0d9743a`, reviewed 2026-09-15.

## 1. Decision and scope

Upgrade all eight standalone Lives into coherent, stateful, character-led games. Each contains an engaging challenge, a recoverable emotional turning point, an enacted strategy, and a second opportunity to experience that strategy working. Leo is the reference for causal continuity, not a template to copy eight times.

Preserve direct entry: select a character and the scene is playable. No difficulty form, launch wizard, tutorial carousel or second Play button. Preserve the site palette, domain colours inside games, minimal HUD and actual Learn liquid glass. Build, QA, commit, merge and push one coherent game at a time. Route availability and working buttons are necessary but not evidence of engaging gameplay.

Scope: eight standalone stories, all 32 arcade entries, and 20 legacy learning runs. These have different purposes: stories carry depth; arcade rounds offer short mechanical play; learning runs provide optional context and reflection. Do not force every playful four-second diversion to teach a strategy. Provider/finder redesign and real multiplayer are outside this programme.

## 2. Critical appraisal

Method: code/content inspection of `src/lives/journeys.ts`, `app/lives/journey.tsx`, Leo/Theo controllers, shared engines/scenes, all 32 entries in `src/lives/games.ts`, and the 20-run `src/learn/runs.ts` catalogue, with closer reading of conflict, listening, commitments, household and sleep. Previous release evidence includes 44 production E2E checks, 76 Lives unit tests, responsive screenshots and GPU glass verification. This is not a new patient observation study or a fresh manual playthrough of every legacy round. Judgments below are qualitative design findings, not measured usability or clinical scores.

### Systemic weaknesses

1. Six journeys use the same `playing -> result -> practice -> complete` shell. Engines remount between rounds; earlier choices rarely persist into later situations. Different sprites and palettes do not create different gameplay loops.
2. `LifeJourney.practice` consists of binary questions with a `correct` index. Distractors such as “Add fourteen more messages” make these compliance checks rather than exploration.
3. Strategy choices change text and a sprite, not the problem's mechanics. No second encounter proves the strategy's effect.
4. Character mood mostly follows phase/outcome. Shared scene stakes often follow elapsed progress, rather than a causally modelled emotional state. A timer filling does not mean the character is upset.
5. Short isolated rounds repeatedly interrupt tension. There is little room to anticipate, change tactics, recover and experience consequences.
6. Several engines end on a single error. Failure screens dominate feedback instead of recovery inside the scene.
7. Reduced motion currently also disables timing. Keep that safe default but separate motion, sensory and pacing policies internally, without adding a launch form.
8. Nina's standalone textarea overrides a registry entry still described as a trace engine. The content model misrepresents the implemented mechanic in that mode.
9. Relationship themes exist in legacy copy but barely influence standalone mechanics. Other people are usually absent or represented by text rather than agents with needs.
10. The earlier `games-to-leo-standard.md` is partly stale: other games now have drawn worlds. Its assertion that the difference is entirely presentation misses persistent causality, agency, pressure/recovery rhythm and enacted learning.

### Eight-game appraisal

“Teaching” here means learning through observable consequences, not the existence of a strategy link.

| Game | Strength today | Gameplay depth | Emotional causality | Enacted teaching | Priority deficiency |
|---|---|---|---|---|---|
| Leo | Waves, movement, cumulative noise, distress, same-room bedtime routine | Strong | Strong | Strong relative to others | Fixed ending sequence implies one prescribed routine; no next-night proof or equally valid alternatives |
| Theo | Bespoke packing, detours, door gate, touch drag | Partial/strong | Weak | Partial | Ends at result and link; never builds/reuses tomorrow's setup or communicates changed arrival |
| Maya | Physical tracing and wiping | Partial | Weak | Weak | Repeated wipes; eliminating everything substitutes for managing inputs and expressing needs |
| Arjun | Filter/sort/hold variety | Partial | Weak | Weak | Disconnected tasks; holding stands in for listening; no conversational repair or shared outcome |
| Zoe | Recognisable messaging situation | Weak/partial | Weak | Weak | Avoid sending, then delete drafts; suppression rather than regulation, expression and repair |
| Mia | Concrete objects and cues | Partial | Weak | Weak | Repeated finding/sorting; no commitment, interpersonal impact or functioning shared system |
| Jax | Incoming distractions and protecting a goal | Partial | Weak | Weak | Every non-list item is wrong; no legitimate substitution, resource tradeoff or delayed choice |
| Nina | Actual private first-line editor | Partial | Weak | Partial | Useful typing surrounded by generic choices; uncertainty, feedback and help-seeking do little |

### Content corrections before enrichment

- Remove absolutes including “On a list they would hold every time,” “Every ADHD difficulty is larger,” and “The pause is the whole skill.” Strategies are options whose usefulness varies.
- Represent intent, impact and accountability together. ADHD must neither excuse hurtful behaviour nor make one person solely responsible for relationship problems.
- Do not turn a partner into an unpaid supervisor. Use agreed ownership and shared tools.
- Do not frame a frightened partner as an ordinary reciprocal disagreement that perfect phrasing resolves. Separate safety/support from the everyday conflict scenario.
- Review sleep content rewarding a five-hour night or universal bedtime/wake-time rules. Do not gamify sleep deprivation, medication changes, restriction or exercise punishment.
- Headphones/background noise are optional preferences, not guaranteed interventions. A quiet alternative must work equally well; do not describe brown noise as a proven ADHD treatment.

## 3. New experience standard

Initial story target: approximately 2–4 minutes, adjusted after observation, never enforced waiting. Untimed play retains equivalent decisions. Players can leave, pause or proceed to recovery without having to fail first.

1. Enter a place with one objective and one available action, already in play.
2. Learn the interaction through a low-pressure first event and immediate feedback.
3. Build pressure through two or three authored beats with competing demands, not merely faster targets.
4. Reach a turning point: a setback, overload, disagreement or successful-but-effortful completion.
5. Change the situation through 3–5 physical/social actions in the same world; no right-answer quiz.
6. Revisit the challenge briefly using those changes. Benefits are visible but do not guarantee perfection or forgiveness.
7. Leave with the changed scene and one optional existing strategy link; no forced survey, streak or diagnosis.

Every story needs two viable actions at a meaningful decision point, a reversible error, contrasting pressure/recovery, a strategy that changes simulation, a second opportunity to use it, and event-driven character reactions. Distinctive skills should vary: spatial prioritisation, conversation repair, prospective memory, resource tradeoffs, composition and temporal planning. Waiting alone is not a compelling core mechanic.

## 4. Emotion and relationships as mechanics

### Fictional simulation, not patient measurement

Internally separate `load`, `activation`, `availableCapacity` and `recoveryMomentum`. These are invented balance parameters, never estimates of a player's brain or ADHD severity. Show at most one understandable state indicator alongside posture/scene cues. Anger is not a failure. A person need not become calm to set a boundary.

Authored events change demand: overlapping notifications, an ambiguous message, losing a plan, uncertainty or a missed commitment. Actions change causes: reduce an input, externalise a thought, clarify, take space, agree a return, reduce scope. Recovery unfolds visibly without compulsory breathing or a “tap calm” cure.

Prototype fixed-step integration at 20Hz with values clamped to [0,1] and hysteresis for emotion poses. Rates live in scenario configuration, tested deterministically and tuned through play. Never expose thresholds as clinical cutoffs.

### Social state

Use observable facts rather than love/trust/empathy scores:
`topic`, `speaker`, `pendingRequest`, `acknowledgedImpact`, `boundary`, `returnAgreement`, `nextActionOwner`, `nextActionCue`.

The other person has agency and constraints. They can disagree or need time. A respectful response does not guarantee forgiveness. Both people can request space. Repair includes impact and a concrete next action, not just an ADHD explanation. Revisit whether an agreement was kept, renegotiated or missed again.

Use authored dialogue nodes, deterministic branch conditions, short utterances and bounded simultaneous bubbles. No player emotion inference, sentiment analysis, camera/microphone observation or LLM interpretation of personal drafts. Perspective changes reveal relevant information without forcing lengthy text or grading empathy.

## 5. Complete standalone game briefs

### 5.1 Zoe — A message lands badly: first vertical slice

**Scene:** Zoe at a kitchen table, phone and another person's thread. An ambiguous message changes a plan. Goal: find a workable next step while expressing frustration and respecting boundaries.

**Gameplay:** three authored beats add notifications and reply fragments to a limited visible workspace. Player can capture a thought privately, ask a clarifying question or send a short response. Sending everything adds demands; some straightforward messages legitimately benefit from a quick answer. Do not teach that replying immediately is always wrong.

**Turning point:** a rushed message can hurt, or Zoe can notice rising activation before sending. Both paths lead to repair/clarification. Preserve unsent feelings in the draft tray rather than requiring deletion.

**Enacted ending:** put the phone down; signal a need for space with a return cue; change one controllable input; return; assemble an editable reply from intention/need/request fragments. Several respectful formulations work. The other person contributes a constraint. Put the agreed next step on a shared visual card.

**Proof:** a fresh message arrives. Draft tray, notification boundary and return card persist. Reuse one to complete or renegotiate the plan. Ending is an agreement or respectful boundary, not “calm equals good.”

**Implementation:** `zoe-conversation` scenario, dialogue reducer, draft tray with pointer/keyboard transfer, plan card, return cue and two-character poses. Keep current slug/strategy IDs. Replace the standalone inhibition/hold/shred sequence; derive short arcade encounters separately.

**Acceptance:** pre-send and post-send paths; disagreement; boundary without mandatory apology; missed-return repair; no draft persistence; no perfect-sentence guessing. Mashing controls alone cannot repair the relationship.

### 5.2 Mia — The promise needs somewhere to live

**Scene:** living room and hallway; Mia agrees to bring an item or book something. A call and a room transition compete with the intention.

**Gameplay:** carry two or three intentions between rooms using objects. Transitions obscure cues; interruptions add tasks. The player may capture the intention before moving, rather than being forced to fail a memory test. Search is only part of the loop.

**Turning point:** the other person explains a missed commitment's practical impact. Mia's embarrassment appears in posture/thought clutter, not a penalty for forgetfulness. The other person's frustration is not a target to delete.

**Enacted ending:** acknowledge what did not happen; choose a realistic next action; place it on a shared board with owner and cue; put the needed object at the point of use; confirm the revised plan. The other person does not become Mia's reminder service.

**Proof:** revisit the transition with another interruption. The chosen cue stays visible and supports the action. Allow repositioning an inconvenient cue: tools sometimes need adjustment.

**Implementation:** room-transition state, portable inventory, `Commitment` records, semantic placement zones and continuous object state. At least two useful cue positions with different affordances.

**Acceptance:** object continuity, bad placement recovery, revisit uses actual placement, no forced partner takeover, no cloud-sharing implication for a purely fictional board.

### 5.3 Arjun — Find the thread together

**Scene:** meeting table, two colleagues, agenda and a shared decision. Tangents are plausible ideas, not just cartoon animals.

**Gameplay:** brief conversational beats introduce relevant information, an interesting thought and an interruption. Pin an anchor, park a thought, request a repeat or contribute. Speaking is not a millisecond timing test. Missing a beat creates uncertainty; clarification addresses it without shame.

**Turning point:** Arjun interrupts or loses the question. Hand the turn back, reflect a heard point and check the next step. A colleague can shorten their request or provide a written cue: accommodation is reciprocal.

**Enacted ending:** park a persistent thought, highlight the current agenda item, ask for the question again, and capture a shared action/owner on the table.

**Proof:** another tangent during the next agenda item. The parked idea remains retrievable; the action card supports returning. End on a shared decision artifact.

**Implementation:** turn queue, bounded dialogue history, agenda anchors, thought parking that reduces competing load without deleting the idea. All information remains available without audio.

**Acceptance:** interruption repair, no penalty for clarification, no eye-contact requirement, no endurance hold as listening, screen-reader announcements only on meaningful changes, final artifact matches the conversation.

### 5.4 Maya — Make room for one thing

**Scene:** busy indoor concourse/cafe with a friend and a destination. Move the regulation lesson away from traffic; do not imply headphones are a crossing-safety strategy.

**Gameplay:** navigate while announcements, phone badges and conversation arrive in bursts. Choose a quieter alcove, silence the phone or ask for one instruction at a time. Each changes a different demand. Removing every stimulus is not the goal.

**Turning point:** Maya misses part of a request or becomes overloaded. Friend initially misreads silence; a short needs signal changes the communication style. No diagnosis disclosure is required.

**Enacted ending:** move to a manageable place, reduce one source, ask for a single next step, pin it to the route, and rejoin or choose a quieter exit. Hearing protection only appears in an appropriate safe environment.

**Proof:** another announcement occurs, but the agreed cue persists and the friend waits for a signal. Some background activity remains compatible with success.

**Implementation:** input-channel model, semantic route nodes, partial channel suppression, persistent friend communication mode. Retain one short wipe only for a specific chosen source.

**Acceptance:** success without eliminating all stimuli, no mandatory sound/flashing, rejoin and leave both valid, keyboard route equivalence, no unsafe traffic teaching.

### 5.5 Theo — Leave now, make tomorrow easier

**Scene/gameplay:** retain the existing hallway, essentials, detours, packing and door gate. Add a departure commitment and someone awaiting an update. Distinguish a necessary safety task from a nonurgent detour.

**Turning point:** depart as intended, or recognise the original arrival is unrealistic. An in-scene message updates the estimate; the other person may adjust or keep their boundary. Lateness is a planning problem, not a worth score.

**Enacted ending:** return to the hallway in the evening. Place essentials in labelled homes, build a short backward sequence from a departure cue, and park an unfinished nonurgent task away from the door.

**Proof:** next morning objects begin where placed. Gathering is easier; a new detour can still arise. Leave or renegotiate instead of requiring perfect punctuality.

**Implementation:** extend `TheoPractice` beyond success/failure into setup/revisit; reuse current drag and door logic. Session object-home state determines tomorrow's positions. Arrival timings are fictional, not travel advice.

**Acceptance:** valid/invalid drops, pointer cancellation, essentials never lost, estimate branch, actual setup changes revisit, coherent backward dependencies.

### 5.6 Jax — A want can wait without disappearing

**Scene:** supermarket, short list, fictional spending tokens and a shared meal. Wants are not inherently wrong.

**Gameplay:** inspect, substitute, protect essentials and save a tempting item for later. Three beats: sale, unavailable essential, shared-plan update. At least one unlisted purchase is reasonable. No speed pressure on arithmetic.

**Turning point:** an impulse uses resources needed elsewhere. Put it back, substitute or discuss a different meal. No shame effect or catastrophic financial punishment.

**Enacted ending:** move a want to a wish shelf; inspect available tokens; revise the shared plan; leave with essentials or a workable alternative. A partner's permission is not required for personal autonomy.

**Proof:** another offer appears after a fictional time jump. The saved want is accessible but no longer occupies the trolley. No enforced real-time waiting period.

**Implementation:** inventory/receipt, category substitutions, immutable transactions/refunds, wish shelf and seeded offers constrained for solvability. Tokens with optional numbers; no actual buying or financial recommendation.

**Acceptance:** conservation/refunds, substitutions, solvable basket, no food moralisation, valid outcomes with and without an optional purchase.

### 5.7 Nina — Start without knowing everything

**Scene:** retain desk and private draft editor; add an ambiguous request and pressure to polish prematurely.

**Gameplay:** expose a first action, park attractive preparation tasks, make a rough fragment, and distinguish genuinely missing information from repetitive checking. Asking one clarifying question is a productive action.

**Turning point:** editing loops or feedback increase pressure. Nina can reduce the next action, use a starter template or invite a fictional quiet companion. Company is optional, not a cure or real multiplayer.

**Enacted ending:** keep the rough draft, attach a next-action note, park unnecessary research, and close at a usable stopping point. Session-only text by default.

**Proof:** reopen after interruption. Draft and next step persist; add a fragment or ask a useful question. Success does not depend on prose quality.

**Implementation:** explicit `draft_composition` engine instead of trace override; local buffer, intent-based completion, template alternative, no NLP grading and no draft analytics.

**Acceptance:** whitespace not progress, template/typing equivalence, IME and mobile keyboard, no submit during composition, interrupted session retains draft, restart clears it.

### 5.8 Leo — Preserve the benchmark, improve agency

Keep the tested three-wave swarm, motion, optional per-mosquito buzz, cumulative disruption and bedroom continuity. Do not rewrite a working swarm to demonstrate the new architecture.

Replace the prescribed ending sequence with a small routine graph: close window; put phone away or choose an appropriate notification boundary; choose quiet or optional sound/headphones; choose a calming activity such as reading; adjust light. Some actions commute; real prerequisites remain. Show a settled scene without promising immediate sleep.

Add a short next-night proof: a mosquito stays outside the closed window and the phone cue is handled using the arrangement. Permit moving directly into the routine when the challenge is distressing. No compulsory headphones, brown noise or universal bedtime.

Implementation: retain `leo-swarm.ts`; version room state; replace numeric-only routine stepping with an authored action graph; audio remains gesture-gated and disposed on pause/exit. Acceptance: window prevents entry, quiet/audio alternatives equivalent, no background buzz leak, both outcomes reach recovery.

## 6. Technical architecture and migration

### Proposed boundaries

- `src/lives/story/types.ts`: scenario, encounter, object, action, dialogue and accessibility contracts.
- `src/lives/story/reducer.ts`: pure transitions and typed effects; no browser/React imports.
- `src/lives/story/clock.ts`: injectable fixed-step clock with pause/hidden-tab behaviour.
- `src/lives/story/director.ts`: authored beats and constrained variation; no patient profiling.
- `src/lives/story/scenarios/{character}.ts`: content, transition graphs and balance constants.
- `app/lives/story/story-player.tsx`: lifecycle, scene routing, focus, navigation and optional resume.
- `app/lives/story/scene-action.tsx`: pointer, keyboard and select-then-place equivalents.
- `app/lives/story/{character}-scene.tsx`: bespoke compositions and interactions.
- Shared `dialogue.tsx`, `cue-board.tsx`, `strategy-prop.tsx` only where behaviour actually matches.

Keep `Engine`, `SceneArt`, `LifeBean`, `LeoMosquito` and `TheoGame` behind adapters. Migrate one route at a time. Build only the shared pieces required by Zoe first; do not create a speculative general-purpose game engine.

### Contract sketch

```ts
type StoryPhase = 'encounter' | 'recovery' | 'rehearsal' | 'ending';
type PauseReason = 'player' | 'hidden' | 'interrupted' | null;
interface StoryState {
  schemaVersion: 1;
  scenarioVersion: string;
  storyId: string;
  seed: number;
  phase: StoryPhase;
  beatId: string;
  simTimeMs: number;
  pauseReason: PauseReason;
  scene: SceneState; // discriminated union by story
  regulation: RegulationState; // fictional balance values only
  relationship?: RelationshipState;
  strategiesUsed: string[];
  completedActionIds: string[];
}
type StoryAction =
  | { type: 'TICK'; dtMs: number }
  | { type: 'INTERACT'; objectId: string; intent: string }
  | { type: 'PLACE'; objectId: string; zoneId: string }
  | { type: 'DIALOGUE'; nodeId: string; choiceId: string }
  | { type: 'PAUSE'; reason: Exclude<PauseReason, null> }
  | { type: 'RESUME' }
  | { type: 'RESTART' };
// reduceStory(state, action, scenario) -> { state, effects }
// Invalid/stale actions are no-ops. Effects never mutate state independently.
```

Separate encounter outcome from learning completion. Completed, unresolved and recovered encounters can all reach strategy practice. Ending validity depends on enacted world changes and a rehearsal opportunity, not a flawless score. Never write recognition/profile responses from game performance.

A strategy action declares `preconditions`, `apply`, `visibleEffect`, `accessibleEffect` and `rehearsalCheck`. For example, Mia's placement alters available cues during the next transition. A caption change alone cannot pass the rehearsal check. Model required dependencies as a graph; allow legitimate alternative strategies/orderings. Reject cycles, nonexistent objects and unreachable endings in tests.

### Timing, rendering and input

One authoritative scheduler per story. Fixed simulation steps are independent of refresh rate. React handles meaningful state changes; motion values/CSS transforms handle high-frequency positions. Avoid whole-tree React updates on every frame. Clamp long-frame catch-up; hidden tabs pause rather than catch up to failure. Audio and scheduled events obey the same pause state. Guard duplicate pointer/click events and repeated animation callbacks.

Use normalized scene coordinates and measured transforms for hit testing. Interactive targets minimum 44px, preferably 48px, with non-overlapping effective hit areas. Specify pointer capture/cancellation. Every drag supports select-then-place and keyboard control. Reserve space for subtitles, enlarged text, mobile keyboards and safe areas. Check hidden-overflow clipping, not only document scroll width.

Motion should communicate anticipation, action, consequence and settling. Initial tuning ranges: short reactions 120–250ms, larger transitions 250–450ms. Do not delay input for decorative sequences or require `animationend` to progress. Reduced motion removes displacement/loops, preserves causal state changes and defaults to untimed. Independent pacing/sensory controls belong in existing settings or pause, never a difficulty launch screen.

Sound off by default and started by a gesture; bounded gain, voice limits, clean release/disposal. Every sound cue has a visible equivalent. No success criterion depends on hearing. Actual background-noise playback requires clear volume/off controls and review of associated claims.

### Persistence and privacy

Start session-only. Later optional resume stores versioned story ID, seed, beat and safe object placement. Exclude draft text, personal relationship answers and inferred emotional states. Validate snapshots and gracefully handle old versions. Keep simulated regulation outside the clinical/profile model. Saving a real-life strategy is a separate explicit existing profile action.

If existing consent permits, events are IDs/versions and coarse timing: `story_started`, `encounter_finished`, `strategy_action_used`, `rehearsal_finished`, `story_exited`. No raw drafts, dialogue content or emotional traces. Completion rate is usability evidence, not treatment efficacy.

### Compatibility and rollback

Preserve all public slugs and strategy/module IDs. Route registry chooses old/upgraded player per story behind a default-safe feature flag. Do not show duplicate library cards. Existing arcade IDs remain stable; add explicit mode/adapters where mechanics differ. Retain reversible previous implementation for one release cycle after enablement. Update old roadmap documents so contradictory completion claims do not persist.

## 7. All 32 arcade entries: disposition

“Story” dependencies below mean the compact mechanic is derived from that character's upgrade. Short playful interludes do not need clinical explanations. Keep the existing 20–30% interlude intent only if playtests support the mix.

| ID | Upgrade / decision | Dependency |
|---|---|---|
| wasps | Telegraph approach paths; protect picnic; recover from misses | Arcade polish |
| maya_crossing | Keep safe crossing diversion; standalone regulation lesson moves indoors | Maya |
| arjun_lock_in | Plausible agenda/tangent competition and persistent anchor | Arjun |
| zoe_dont_send | Draft/clarify/brief response; remove passive waiting as sole win | Zoe |
| mia_why_here | Intention across room transition with optional cue | Mia |
| pancake | Readable catch arc/zone and recovery bounce | Arcade polish |
| leo_mosquito | Preserve tested swarm and lifecycle/audio behaviour | Leo |
| theo_get_out | Preserve packing/door signature, compact strategy-aware encounter | Theo |
| jax_just_milk | Wish shelf and competing goals, not delete every want | Jax |
| nina_start_small | Physically expose first action from task stack | Nina |
| zoe_keyword | Capture keyword and return conversational turn | Zoe/Arjun |
| theo_backwards | Concrete departure sequence with dependencies | Theo |
| mia_list | Externalise intention and revisit after interruption | Mia |
| maya_layers | Choose one controllable channel, not full-screen repeated wipe | Maya |
| leo_lights_out | Adjust room when ready; remove universal 10pm target | Leo/content review |
| arjun_parking | Park then retrieve thought, not simply right bin | Arjun |
| pigeons | Protect snack through telegraphed waves | Arcade polish |
| toast | Read browning; generously signalled timing window | Arcade polish |
| bubbles | Low-pressure rhythmic popping, no clinical claim | Arcade polish |
| spider | Move-away/observe alternative; avoid forced-exposure framing | Arcade/content review |
| rogue_blender | Readable short bursts; tap-toggle alternative to hold | Arcade polish |
| office_chair | Route with recoverable bumps and stable keyboard path | Arcade polish |
| maya_turn_it_down | Needs signal/quiet-space action, not duplicate wipe | Maya |
| leo_one_more | Put phone away and establish return cue | Leo |
| arjun_hold_thread | Ask/repeat/anchor instead of holding to listen | Arjun |
| zoe_drafts | Preserve/organise useful drafts; stop deleting feelings | Zoe |
| theo_shower | External transition cue, no universally ideal duration | Theo |
| mia_the_list | Place and retrieve player's own cue | Mia |
| jax_checkout | Substitutions and receipt tradeoffs | Jax |
| nina_first_line | Explicit draft composition type, template alternative | Nina |
| sneeze | Catch with a tissue; remove “hold it in” instruction | Early content correction |
| ducks | Visual/label sorting; sound never mandatory | Arcade polish |

Do not turn relationship mistakes into lost lives or clinical scores. Compact relationship encounters reward useful action/repair without a “good partner” grade. Arcade score remains separate from profile and story progress.

## 8. All 20 legacy learning runs: consolidation

Do not delete these in bulk or duplicate new stories. After each story ships, connect relevant learning content to its enacted scene and retain useful optional reflection. Preserve strategy IDs and explicit profile writes. Separate fictional play from personal questions; disclosures are never timed.

| Run ID | Upgrade / destination |
|---|---|
| context | Same task across conditions; change one condition and observe rather than guess explanation |
| starting | Nina first-action/draft scene; remove “try harder” straw-person choices |
| working-memory | Mia room/cue scene; support memory rather than grade capacity |
| more-than-attention | Distinct emotional, social and executive scenarios; do not imply all apply to everyone |
| deadlines | Theo timeline/Nina next cue; make time visible without rewarding crisis work |
| hyperfocus | Save re-entry marker and use a transition cue; preserve useful engagement |
| ambiguity | Ask for missing information through Nina's clarification branch |
| interruption | Arjun/Zoe turn repair; preserve contribution rather than suppress speech |
| perfectionism | Nina rough draft/return; no diagnosis inferred from gameplay |
| not-listening | Arjun clarify/reflect plus reciprocal communication changes |
| forgotten-commitments | Mia shared commitment; intent, impact and ownership together |
| conflict | Zoe repair in household context; remove fear-as-ordinary-conflict and perfect-pause grading |
| household | Shared board, ownership and visible definition of done; partner not reminder system |
| sleep | Leo routine with choices; review blanket sleep/wake claims |
| exercise | Accessible movement opportunity and preparation cue; no calories or symptom-cure score |
| eating | Practical food preparation/cues; avoid restriction, moralised food and universal nutrition claims |
| gut | Content review first; no invented ADHD-gut treatment game; approved support/symptom-note route only |
| money | Jax wish shelf/plan, fictional tokens and reversible choices |
| mornings | Theo evening setup and morning reuse |
| screens | Leo/Zoe boundary and return cue; purposeful device use remains valid |

## 9. Phased delivery

Estimates are focused engineering/art/content effort, not calendar promises. Re-estimate after Zoe; clinician/patient availability is additional. Initial envelope approximately 35–65 working days. Work sequentially per user requirement, not multiple partially completed games in parallel.

| Phase | Work | Estimate | Exit gate |
|---|---|---|---|
| 0 | Freeze baseline; inventory; representative recordings; correct overclaims/unsafe framing; learning-objective map | 2–3 days | Baselines and reviewed objectives, no misleading absolutes in touched content |
| 1 | Only state/clock/action primitives Zoe needs; grey-box first encounter/repair | 3–5 days | Deterministic state, pause safe, keyboard path, one strategy changes world |
| 2 | Complete Zoe, branches, enacted ending, revisit and all inputs | 4–6 days | Full story and co-design gate; no moral quiz; QA/commit/merge/push |
| 3 | Mia transitions, commitments and cue system | 3–5 days | Placement changes revisit; impact and ownership; individual release |
| 4 | Arjun dialogue, agenda and parking | 3–5 days | Reciprocal communication and retrieval; individual release |
| 5 | Maya channels, environment and needs signal | 3–5 days | Multiple valid recovery paths; safe framing; individual release |
| 6 | Theo setup, arrival update and tomorrow | 2–4 days | Existing packing regressions green; setup affects next morning |
| 7 | Jax resources, substitutions, wishes and shared plan | 3–5 days | Solvable choices with more than one valid basket |
| 8 | Nina draft engine, clarification and re-entry cue | 2–4 days | Typing/template equivalence; privacy and keyboard geometry |
| 9 | Leo routine alternatives and next-night proof | 2–3 days | Swarm regressions green; quiet option; visible prevention |
| 10 | Finish compact arcade adapters/interludes and incremental legacy consolidation | 5–10 days | All 32/20 IDs accounted for; no stale duplicate teaching |
| 11 | Cross-game polish, performance, accessibility, formative learning tests, staged rollout | 3–5 days | Release criteria passed; rollback exercised and evidence recorded |

Per-game sequence: storyboard/state graph -> playable grey-box -> prove strategy causality -> art/feedback -> all input modes -> branch QA -> patient/clinical review where required -> final polish -> commit/merge/push. Do not polish art around a loop that still amounts to answer selection.

Artifacts per game: brief, state diagram, balance constants, branch matrix, desktop/mobile screenshots, normal/still-mode recording, test results, word count and review notes. Each brief explicitly states what a mistake does and why the ending changes the next encounter.

## 10. Verification and release criteria

### Correctness

- Pure reducer: same seed/actions produce same state; stale actions cannot advance; completion idempotent; restart fully resets appropriate state.
- Scheduler: pause/hidden freeze simulation/audio/events; resume cannot catch up into failure; test each phase.
- Causality: before/after assertions for blocked sources, persistent cues, preserved drafts, parked thoughts, changed spawn and written agreements. Test alternatives/orderings, not just the author-preferred path.
- Content graph: all starts reach valid endings; no missing objects/assets/dialogue, circular prerequisites or broken strategy references. Enumerate all registry IDs.
- Privacy: drafts/emotional traces never enter storage, network, logs or profile. Explicit real-world strategy save remains independent.

### E2E per-story matrix

Normal route; early strategy use; recoverable error; unresolved-but-valid ending; replay; exit mid-action; hidden tab; refresh/resume policy; audio toggle; reduced motion; untimed; keyboard; touch; screen-reader-equivalent controls. Use actual pointer drag/trace where applicable, not just dispatching events to a labelled hit target. Tests must not only prove every “correct” option is clickable.

### Visual/input QA

320x568, 390x844, 768x1024, 1280x800, 1440x900, 1920x1080; landscape; 200% zoom/text enlargement; mobile software keyboard. No clipped mandatory controls in active scenes. Optional long reflection can scroll deliberately. Check target/label overlap across deterministic seeds. Axe each meaningful state, plus manual keyboard/focus and screen-reader review. No unresolved critical/serious accessibility findings.

Review screenshots and recordings for character readability, pressure/recovery contrast, scene continuity and feedback. Maintain GPU liquid-glass verification on Learn; avoid full-screen refraction over rapid game targets. Decorative SVG separated from accessible DOM controls.

### Provisional performance budgets

Measure on an agreed lower-end device: p95 input-to-visible-response <=100ms for lightweight interactions; no sustained animation frame times above 33ms; no game/audio work after exit. Target <=100KB gzip incremental script per lazy-loaded story where feasible; first measure baseline and dependencies. Do not preload all scenes/art at launch. Effects must justify their runtime cost beyond looking impressive on a desktop GPU.

### Engagement and transfer

Two small formative co-design rounds, approximately 5–8 participants each with varied ADHD experiences and motor/sensory/relationship needs. This is qualitative product research, not clinical validation. Ask without naming the strategy: “What changed?”, “What helped the second time?”, “What might you try in a similar situation?” Observe discovery, causality and willingness to replay; ask about blame, infantilisation, stereotypes, coercion and responsibility for managing another person.

Block enablement on repeated misunderstanding of the strategy, a harmful blame pattern, inaccessible mandatory action, or most interaction time spent waiting/reading. Proposed formative target: at least four of five participants identify an enacted strategy unaided. Report actual samples and uncertainty; this is not efficacy evidence. Do not optimise repeated failure, daily streaks or time spent as primary success metrics.

## 11. Evidence boundaries and content review

Design inference: practical supports, environmental changes and relationship context justify making these situations playable. They do not establish that these games improve ADHD symptoms. Emotional dynamics and balance constants are invented for play and require plausibility review.

- [NICE NG87 recommendations](https://www.nice.org.uk/guidance/ng87/chapter/Recommendations) address environmental modifications and everyday impairment including sleep/relationships. Use as a constraint on claims, not proof that a specific strategy works universally.
- [NIMH: ADHD in adults](https://www.nimh.nih.gov/health/publications/adhd-what-you-need-to-know) describes functional/relationship difficulties and established treatment categories. Games remain educational and must not claim to replace treatment.
- [NIMH expert discussion](https://www.nimh.nih.gov/news/media/2020/nimh-expert-dr-mary-rooney-discusses-managing-adhd) discusses practical and relationship support. This supports including reciprocal context, not the efficacy of our dialogue mechanic.

Changed therapeutic copy needs ADHD-informed clinician and patient co-design review before release, especially regulation, boundaries, sleep and interpersonal impact. Include diverse relationship structures. Regulation must not mean eye contact, stillness, productivity, agreeableness or masking. Culturally specific support needs appropriate co-design rather than generic spiritual imagery or invented identity claims.

## 12. First implementation ticket

**ZOE-01: conversation plus causal draft tray.** Keep the route. Implement an ambiguous plan-change message, two accumulating thoughts, draft tray and clarification action. A parked draft remains visible and removes one competing demand. A rushed reply can land poorly; repair remains available. Add a second message that reuses the tray. No final quiz.

First tested commit: pure reducer, pointer/keyboard interaction and rough scene. Subsequent tested commits: repair, art, accessible feedback, reviewed copy and rehearsal. Do not begin Mia until Zoe's complete story, ending and transfer check pass the game gate.
