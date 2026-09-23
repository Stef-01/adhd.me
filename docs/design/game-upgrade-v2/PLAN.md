# Lives v2: game production plan

Date: 20 September 2026. Status: production specification and generated asset pack; **not a claim that the games below have been implemented**. The current yellow platform identity remains in place. Build and validate one game at a time.

Build prompts, one per game with sound and music, are in `PROMPTS.md` beside this file.

## Scope and honest appraisal

The repository has eight Lives characters, 32 arcade rounds and 20 learning runs. Six standalone journeys still lean on shared short activities and explicit strategy choices. Changing their colours or adding motion will not create depth. Leo is a stronger reference because a noisy room has causes the player can change, and its ending lets the player do something useful. Theo's locally rebuilt morning introduces travel, carrying capacity, parallel charging and a changed revisit, but it needs its final release checks.

The upgrade must give every character a distinct world, meaningful decisions, recoverable mistakes and an ending that changes the next encounter. Each game must support at least two viable tactics. A strategy is an action with a causal effect, not the answer to a quiz. Emotional regulation affects attention, choices and recovery inside the scene. Other characters have their own needs and can disagree. Neither a fictional stress meter nor a fast completion becomes a score about the patient's ADHD.

### Production order

1. Finish and release Theo's rebuilt morning; establish the standard for route planning and persistent strategy setup.
2. Rebuild Leo's public game around readable insect waves, controllable sources and a complete bedtime/revisit loop. Reconcile the public and laboratory versions so there is one authoritative model.
3. Zoe: reciprocal communication and repair. This is the largest gap in the current relationship content.
4. Mia: spatial memory, intention cues and shared ownership.
5. Arjun: maintaining a thread and contributing to a meeting.
6. Jax: shopping tradeoffs, substitutions and a considered wish list.
7. Nina: producing an actual first draft and returning to it.
8. Maya: navigating a changing sensory environment with agency.
9. Complete the ten standalone playful arcade rounds and the cross-game integration audit.

Upgrade each character's arcade adapters and associated learning runs when its core model passes, rather than rebuilding all 32 rounds concurrently. Estimate implementation time after that game's mechanical prototype; the phases and acceptance gates below determine completion.

## Visual and interaction system

Keep the current platform tokens: paper `#FAFAF7`, stone `#F6F4EE`, ink `#1A1C1C`, yellow `#F1BC31`, yellow edge `#E5B029`, pale yellow `#F7CF63`. Use Plus Jakarta Sans for UI and Newsreader only where the current design system calls for it. The game worlds may be colourful: Leo lavender/night; Theo warm amber; Zoe rose/plum; Mia lilac; Arjun periwinkle; Jax sage/market; Nina butter/paper; Maya sky blue.

Preserve the existing bean silhouettes and canonical character colours from `app/lives/bean.tsx`. The new Theo room uses a fern-coloured character while the shared cast defines Theo as cyan: resolve this deliberately during integration, using the canonical identity throughout the selected game and its library thumbnail. Do not silently introduce a third Theo. Legacy Alex, Jordan, Sam and Priya remain available for learning runs. New Ari, Noor and Rae are supporting characters, not substitutes for that cast.

The asset pack uses original editable SVG artwork, matching the repository's code-native illustration system. It does not copy Headspace or Dumb Ways to Die art. Named groups separate body, face, arms and legs. Scene layers keep furniture separate from interactive props. Do not bake text, scores, buttons or personal data into artwork. Use the provided static expressions for reduced motion; do not require animated distortion to understand a state.

Movement communicates game facts: travel shows a route; a hand settles on an object after collection; a thought returns to its saved place; a room visibly changes after a boundary is set. Decorative movement must not move hit targets, delay input, hide consequences or restart on every render. Use existing Motion, not another animation library. Keep the public shell calm and minimal; the asset gallery is a development review surface, not a new patient screen.

## Shared engineering contract

### Model and ownership

Give each game a pure typed model in `src/lives/<character>-world.ts` with adjacent tests, and a renderer under `app/lives/<character>-world/`. Share clock, sound, focus and persistence infrastructure only after two games demonstrate the same need. Do not force eight worlds through one configurable multiple-choice engine.

State envelope: `version`, `seed`, `phase`, `paused`, `paceMode`, `elapsed`, `world`, `intent`, `events`, `recovery`, `strategySetup`, `revisitSnapshot`. World state is game-specific. Phases are encounter, complication, setup, revisit and complete; recovery happens inside the encounter rather than resetting it. The reducer alone changes facts. Audio, haptics, focus and announcements are declarative effects of accepted events, never sources of simulation state. Duplicate clicks, stale target IDs and late transition callbacks must be harmless.

Use a bounded fixed simulation step and monotonic elapsed time. Suspend simulation, scheduled cues and audio when paused, hidden or unmounted. Resume without a catch-up burst. Render important state at a modest rate; animate coordinates without committing the entire game tree every frame. Avoid allocating a new audio node on every tick. Seed scenarios for reproducible tests, then select between at least three authored variations. Randomness may change the situation, not secretly punish a good decision.

### Input, pacing and access

Enter the game directly. No difficulty slider, preparatory questionnaire or second Play screen. The first meaningful target must be apparent from the scene. Keep pause available. Optional sound and pacing settings live in pause and preserve progress. Dragging always has select-and-place and keyboard equivalents. Handle pointer cancellation and release capture on exit. Use stable generous interaction bounds (aim for 48 CSS pixels), visible focus, useful accessible names and an intentional focus destination after an object disappears.

Reduced-motion mode retains the same choices and resource costs, using discrete action advances where continuous time would otherwise punish reading. No mandatory rapid tapping, long pressing or precision tracking. Audio starts only after explicit consent and always has a visual counterpart. Never use colour alone for inventory, stress or success. Avoid flashes and involuntary loud surprises. A timer is appropriate to Theo's train; it is not the default challenge for every game.

### Challenge and feedback

Challenge comes from competing resources, uncertain information that can be clarified, planning, changing constraints and other people's needs. Every encounter needs: a readable goal, an inspectable world, an early low-cost experiment, a complication, two viable approaches, a recoverable mistake, a physical strategy setup and a changed revisit. Feedback identifies what changed, not whether the player is a good person.

Design hypotheses to validate with play: first useful action within five seconds; perceptible accepted-input feedback within 200 ms; two to four meaningful decisions per minute; a core story loop around two to four minutes without filler. These are tuning targets, not evidence of engagement. Record exploratory, efficient, distracted, keyboard-only and low-stimulation play. A beautiful screenshot does not pass the gameplay gate.

### Data and continuity

Keep existing public slugs and strategy identifiers, with explicit migration if a model changes. Fictional performance never writes symptom severity, diagnosis, adherence or relationship quality to My ADHD. Any personal reflection is optional, untimed and explicitly submitted. Do not store message drafts that could contain private real-world material by default. If resume is added, version and expire snapshots and reject incompatible saves safely.

## Game specifications

### 1. Theo — Out the door

**Signature:** a small route-planning simulation with parallel processes. Goal: leave with essentials and shoes before a train, while choosing what can wait.

The current rebuild has a four-room graph and hall, two carrying slots, keys/phone/water, a bag in the hall, real travel costs, 16-second phone charging and a 70-second initial train. The player can charge first while collecting elsewhere, or stage essentials before the charging detour. Optional laundry, plant and email interruptions compete for time. A spill offers an explicit clear-now versus longer-route tradeoff. Do not turn chores into required completion.

Ari has plans too: one update can buy a limited later departure, while Ari may go ahead. Missing the train keeps inventory and charging progress. Overwhelm is shown in posture and recoverable planning friction; a pause or parked task costs time rather than magically fixing the room. Three layouts should change the best route, not just object colours.

**Strategy ending:** place actual essentials in selected homes, prepare water and charging, and set a usable departure cue. **Revisit:** use those exact homes and preparations with rain adding an umbrella. Compare the player's actual journeys, not a canned claim that the strategy worked. Complete at least two different successful arrangements.

**State/tests:** node/edge progress, carried and deposited IDs, charge state, tasks, spill, train, Ari update, prepared homes. Assert item conservation, capacity, no teleporting, action idempotence, pause continuity, missed-train recovery and real saved-layout reuse. Existing 13 model tests and 21 browser cases form the starting baseline; the final WebKit timing correction is included in release verification.

### 2. Leo — One tiny sound

**Signature:** defend a bedroom while discovering that prevention changes the encounter. Mosquitoes have readable approach, cruise and resting states; swarms arrive through a visibly open window. Catching all active insects before a countdown is one challenge, but closing the window must actually stop new ingress. Never invisibly spawn replacements to negate prevention.

Each active insect contributes to a clearly fictional sensory-load model. Phone notifications and light are separate sources with separate controls. Two viable tactics: catch the early wave then secure the room, or secure the room immediately and handle the remaining insects. Tune wave size, warning time, landing duration and source combinations, rather than simply accelerating tiny moving hitboxes. Give touch players stable landing opportunities and keyboard users reachable target controls.

A bookmark keeps the place when reading is interrupted. A household quiet request is optional; it may be deferred. Headphones change the audio environment but do not remove insects. Brown noise is an optional preference, with silence equally valid; do not describe it as an established ADHD treatment.

**Strategy ending:** close the window, put the phone away, choose quiet or headphones, park a thought if useful, find the bookmarked page and dim the light. Respect real dependencies but allow flexible order. **Revisit:** carry those boundaries forward; introduce a different manageable nuisance and let the player retrieve the reading place. Avoid automatic victory or reopening the window behind the player's back.

**State/tests:** insect identities and trajectories, ingress, source intensities, load, room controls, reading marker, routine choices. Check duplicate catches, source-specific effects, bounded spawn counts, stable hit bounds, pause/audio cleanup, optional headphones, routine persistence and reachable completion without sound.

### 3. Zoe — Before you send

**Signature:** resolve a shared plan using manipulable facts, private drafts and a reciprocal conversation. The goal is a workable next step, not selecting the nicest sentence.

An agreed time changes without a known reason. Inspect the calendar, separate known facts from assumptions, keep a private emotional draft, ask about an unknown and compose a message from fact/need/request fragments. The other person has availability and preferences; they may decline a proposal. Two viable approaches: clarify before proposing, or acknowledge impact and make a concrete proposal while openly naming uncertainty. A sharp message has consequences but repair remains possible.

Activation affects pacing and the temptation to act, not an objective relationship score. Pausing preserves the draft. The game must never teach that the player's feelings should be deleted or that responsibility always belongs to the ADHD character. Three scenarios: a late change, a missed commitment and an assumed household task.

**Strategy ending:** negotiate an actual owner, time and return cue; a respectful separate plan or deferred conversation can be a valid outcome. **Revisit:** a related new message uses that saved commitment, so the player can follow through or renegotiate. Forgiveness is not a reward automatically granted for correct wording.

**State/tests:** ordered events, known facts, assumptions, private draft, commitments, each actor's capacity, turn, activation and return cue. Test feasible proposals, independent partner responses, repair after escalation, no invented facts, draft preservation, keyboard composition and no private-text telemetry.

### 4. Mia — Remember why

**Signature:** carry intentions through connected rooms while building an external memory system. A goal remains inspectable; this is not an exam that hides the list.

Search for a charger, deal with a parcel, and receive a shared request. Carry two objects and one cue. Put a cue at the point of action, group a route, or renegotiate a request with an owner and time. A portable cue and threshold cues are both viable; neither gets an arbitrary superior score. Interruptions move the current intention, not the physical objects. Three variations change the requested objects, interruption location and shared ownership.

Embarrassment and frustration appear through the character and a recoverable loss of thread. Sam is not cast as an endless reminder service. Both people can own tasks and ask for clarification.

**Strategy ending:** establish useful object homes, a point-of-action cue and an explicit shared commitment. **Revisit:** introduce a new interruption while preserving those exact cues; the player retrieves the intention from the environment.

**State/tests:** room graph, persistent items, intentions, owners, cue locations, carrying and requests. Assert object permanence, conservation, visible intent access, correct cue triggering, genuine shared ownership and equivalent drag/tap/keyboard routes.

### 5. Arjun — Hold the thread

**Signature:** construct a useful decision from a changing meeting. Capture a fact or question, connect it to an agenda anchor, ask for a repeat and contribute when it matters. A limited working board creates a real organisation problem; it must not simply punish slower reading.

The agenda changes, one detail is ambiguous and multiple proposals are viable. One tactic is to anchor the agenda and clarify a missing fact; another is to park an idea, capture a question and retrieve the idea at the relevant decision. Waiting silently forever is not the correct answer. Respectful interruption can be useful. Noor has an independent contribution and constraints.

Three scenarios vary the decision, missing information and change in priority. Let the player acknowledge losing the thread and request what they need rather than rewarding masking.

**Strategy ending:** produce a decision with owner, next step and unresolved follow-up cue. **Revisit:** use the saved record and a parked idea when a new constraint appears. The board must contain the player's actual choices.

**State/tests:** agenda, fact IDs, speakers, drafts, parked ideas, board capacity, proposal constraints, decision and follow-up. Test that no fact appears magically, at least two decisions can work, turns cannot softlock, untimed input can advance speakers, and a parked idea is actually retrievable.

### 6. Jax — Just the list

**Signature:** a small shopping economy with meal coverage, substitutions and wanted extras. Prices use explicit integer tokens. The goal is an affordable useful basket; considered extras are allowed.

An item is out of stock, a bundle has a different unit price and a shared request arrives. Compare substitutions, inspect the budget, move items between basket and wish list, and review an exact receipt. One tactic saves through a substitution and buys a wanted extra; another covers the essentials and saves the wish for later. Neither is morally superior. Three scenarios vary stock, budget and household needs.

Disappointment remains legitimate. Shared money has an explicit owner and agreement; the character is not labelled irresponsible for wanting something.

**Strategy ending:** retain a wish with a reason and return cue, keep a visible useful list and put food where it will be used. **Revisit:** changed stock or price prompts a fresh decision; buying the saved wish can be valid.

**State/tests:** budget, stock, integer prices, basket, meal coverage, constraints, wish list, receipt and shared request. Test no accidental double purchase, exact arithmetic, receipt parity, undo, multiple affordable solutions and no hidden moral score.

### 7. Nina — The first line

**Signature:** build an actual small draft from an incomplete brief. Writing any word is not sufficient gameplay. Clarify a missing requirement or make a reversible assumption, arrange a rough outline, produce a paragraph and connect it to the purpose.

The player can use structured blocks or optional typing to create the same meaningful artifact. Research and polishing are available but consume attention without secretly becoming mandatory. A changed reader or scope affects one part of the draft. Interruption preserves work and a return marker. Two tactics: outline and clarify, or draft a small paragraph then adjust scope. Three scenarios vary audience, scope and interruption.

Self-criticism is acknowledged without making low standards the universal lesson. Sometimes the brief really does need clarification; sometimes a small imperfect piece is enough to start.

**Strategy ending:** save the actual draft, name a concrete next action, leave a re-entry marker and prepare the needed material. **Revisit:** reopen the same artifact and use new information to add a useful second piece.

**State/tests:** brief constraints, typed blocks, history, unknowns, questions and marker. Test content survives interruption, undo works, the second piece uses the first, keyboard/IME input remains intact, structured input is equivalent, and private writing is not sent to analytics.

### 8. Maya — One thing at a time

**Signature:** navigate a changing public interior while choosing sensory boundaries and a useful route. Use a station, university building or community venue; do not imply that blocking traffic sounds is a safe crossing strategy.

Preview routes, reduce optional phone input, find a quieter path, ask directions, stop at a bench or retain a destination cue. A queue changes and a companion has a different pace. A short busy route with one source reduced and a longer quiet route with a clear goal cue must both work. Splitting up with a meeting point can be valid. The environment is not a test of how much discomfort someone can endure.

**Strategy ending:** keep a destination cue, controllable boundary, meeting point and known quiet option. **Revisit:** preserve that plan while changing a queue or entrance so the player adapts it.

**State/tests:** accessible navigation graph, source channels, destination, queue, quiet nodes and companion agreement. Test reachable routes, source-specific effects, independent companion choices, no forced exposure, no sound-only clue and a safe treatment of the crossing arcade adapter.

## Arcade migration: all 32 rounds

Short rounds inherit tested mechanics from their parent world, with a shorter scenario and an actual consequence. They do not need to contain the entire strategy ending, but must link to it without a second setup screen.

| Existing ID | Upgrade and acceptance condition |
| --- | --- |
| leo_mosquito | Readable insect waves and window ingress; closing the source changes future waves. |
| leo_lights_out | Separate phone/light/window controls; chosen sequence changes the room. |
| leo_one_more | Bookmark and phone boundary; leaving an activity preserves a return point. |
| theo_get_out | Short route scenario with two hands and parallel charging. |
| theo_backwards | Arrange a departure plan from a real deadline; simulate the resulting route. |
| theo_shower | Transition out of an activity using a visible cue and staged essentials, not random taps. |
| zoe_dont_send | Private draft and clarifying question with a reciprocal reply. |
| zoe_keyword | Find a missing fact in context; a keyword alone must not decide intent. |
| zoe_drafts | Preserve feeling, change a request and test a feasible next step. |
| mia_why_here | Retrieve an intention from a placed cue after a room transition. |
| mia_list | Group items along a route with the list always inspectable. |
| mia_the_list | Shared request with owner and timing; partner is not the reminder mechanism. |
| arjun_lock_in | Select an anchor and manage a limited working board. |
| arjun_parking | Park and later retrieve an idea when relevant. |
| arjun_hold_thread | Reconstruct a decision using facts and a clarifying question. |
| maya_crossing | Safe crossing decisions with visual road cues; never reward ignoring hazards. |
| maya_layers | Independently adjustable optional sensory sources with visible effects. |
| maya_turn_it_down | Choose a workable route/boundary combination, not mute everything. |
| jax_just_milk | Affordable substitutions and a considered extra. |
| jax_checkout | Exact receipt, stock and budget; undo before purchase. |
| nina_start_small | Build a useful first piece that survives interruption. |
| nina_first_line | Use a saved return marker to continue a real draft. |
| wasps | Telegraph approaching waves and resting windows; stable touch alternatives. |
| pigeons | Readable flock routes and a recoverable path choice. |
| pancake | Legible heat/flip states with a timing window and recoverable imperfect result. |
| toast | Raw/ready/burnt states, clear cues and no colour-only readiness. |
| bubbles | Optional rhythmic play with visible pulse and no sound dependency. |
| spider | Observe and move away; no forced exposure or shock animation. |
| rogue_blender | Readable toggle/control sequence; no rapid-tapping requirement. |
| office_chair | Navigate a small path with friction and recovery, keyboard equivalent. |
| sneeze | Prepare a tissue; do not teach harmful suppression of a sneeze. |
| ducks | Guide a visible group through a changing route; no punishment from hidden spawns. |

Relationship rounds must not consume lives for expressing a feeling or declining a request. For playful rounds, distinguish fictional arcade feedback from personal health outcomes.

## Learning-run integration: all 20 runs

| Run ID | Use of the upgraded worlds |
| --- | --- |
| context | Compare changed conditions across Nina, Arjun and Maya without implying one universal ADHD experience. |
| starting | Nina's first useful artifact and concrete next action. |
| working-memory | Mia's visible intention and point-of-action cues. |
| more-than-attention | Selected emotional, social and transition moments across the cast. |
| deadlines | Theo/Nina planning with visible constraints; do not reward crisis as the only way to work. |
| hyperfocus | Arjun/Nina re-entry markers and purposeful transitions. |
| ambiguity | Nina clarifies a real missing requirement. |
| interruption | Arjun/Zoe preserve a thread and repair a turn. |
| perfectionism | Nina changes scope while retaining the actual purpose. |
| not-listening | Arjun asks for a repeat; explain needs reciprocally. |
| forgotten-commitments | Mia records owner, cue and next action. |
| conflict | Zoe's mutual boundaries and repair; fear or coercion is not ordinary communication friction. |
| household | Mia's shared ownership board; neither person becomes a reminder service. |
| sleep | Leo's optional routine and environmental changes; no treatment promises. |
| exercise | Accessible opportunities in Maya's world; no calorie, cure or compliance score. |
| eating | Jax's accessible meal preparation and food availability; no food morality. |
| gut | Retain reviewed educational content; require content review before introducing a symptom-management game. |
| money | Jax's concrete budget, substitutions and considered wants. |
| mornings | Theo's preparation, parallel processes and transition cues. |
| screens | Leo/Zoe purposeful use, return cues and boundaries rather than blanket abstinence. |

These mappings are integration tasks, not permission to derive patient measurements from game performance. New health claims require a separate source/content review. The present asset pack supplies neutral objects and contexts, not clinical endorsements.

## Asset delivery and integration

The generated pack lives at `public/games/v2/`. Its manifest is the source of truth for delivered files, dimensions, hashes, scene anchors, character pivots, provenance and coverage. The development gallery is `public/games/v2/catalog.html`. The deterministic generator is `scripts/generate-lives-assets.py`; validation is `scripts/validate-lives-assets.py`.

Required families: eight principal and seven supporting/legacy characters with 12 static poses each; eight scene worlds in desktop and phone compositions, each with background, furniture and foreground layers; individual stateful props; feedback effects; original synthesised sound cues; motion contracts and reduced-motion alternatives. The generated manifest records the actual count. Every named asset must exist; no generic fallback icon masquerading as an authored prop. Text remains live HTML. Sound remains optional.

The pack is a production baseline for the specified mechanics. Generated assets are not automatically integrated or player-validated. Additional props discovered during an individual mechanical prototype are added through the same generator and review gates. Keep runtime integration status explicit rather than calling every game complete because its art exists.

For runtime use, import static SVGs as images, and inline named groups only where articulation is required. Avoid loading every pose and scene on the learning index. Load the current world and next small state, pool sound voices, and keep clickable geometry separate from decorative artwork. Metadata hit bounds are source-space guidance, not final CSS target size. Match scene anchors to the model's node names. Derive animation from accepted reducer events; do not infer game state from a CSS animation ending.

## Staged implementation gates for every game

### A — Baseline and contract

Record the existing route, first action, completion path, keyboard path and known defects. Pin public IDs, current save behaviour and baseline bundle size. Specify two viable tactics, one recoverable mistake and a strategy-to-revisit causal trace before production UI work.

### B — Playable mechanical prototype

Implement the typed model and deterministic scenarios. Demonstrate both tactics, consequence, recovery and persistence with placeholder-free domain state. Reject prototypes that can be won by clicking every target in arbitrary order. Tests exercise invariants and changed outcomes, not snapshots of implementation details.

### C — Scene and controls

Integrate the appropriate asset family, direct entry and stable targets. Test 390px phone, 768px tablet and 1440px desktop, keyboard focus, tap alternatives, reduced motion, silence and pause. Keep patient screens around 40 words and below 60. Long explanations belong in these docs, not overlays.

### D — Gameplay craft

Tune anticipation, feedback, difficulty and pacing from five recorded play styles. Eliminate decorative waits, invisible randomness and moving-target frustration. Ensure the complication changes the decision rather than merely adding more clicks. Review whether the emotional and social beat changes the world. Do not claim engagement is proven without player feedback.

### E — Strategy and changed revisit

Make the ending physically enact a strategy and save the exact choices. Start the revisit with that configuration and a new constraint. Test two different setups and the no-change path. Integrate the character's arcade adapters and learning runs only after this loop works.

### F — Technical and access QA

Run model invariants, seeded scenarios and browser interaction tests in Chromium, Firefox and WebKit. Cover duplicate input, stale IDs, pointer cancel, keyboard-only completion, visibility suspension, pause/resume, navigation/unmount cleanup, sound off, reduced motion and failed/recovered attempts. Audit focus, contrast, live announcements and non-colour feedback. Inspect screenshots rather than trusting overflow assertions alone.

Measure incremental initial route JS (initial target under 35 KB gzip beyond the existing shell; investigate rather than hide a miss), asset loads, long tasks and frame behaviour on a modest-phone profile. No global game-pack preload. Capture actual route word counts with the repository tool and include them in the commit.

### G — Review and release

Run typecheck, relevant tests, production build, text-budget audit and diff hygiene. Review the public route, not only a lab route. Commit a coherent tested game, integrate current main, push main and verify the deployed route when available. Preserve unrelated work. Record what was verified, any limitations and the next game. Do not close a game at phase C.

## Risks and completion definition

Reject these shortcuts: eight reskins of one quiz; a timer added everywhere; an emotion bar framed as patient quality; one-sided relationship responsibility; a strategy ending that does not affect the revisit; sound-only clues; precise moving targets required on touch; effects that hide hit areas; decorative assets with no mechanical role; silent loss of previous work.

Assets are complete for this specification when the manifest resolves every file and game/run mapping, SVGs parse, WAV headers and peaks validate, generator output is repeatable, and the gallery's actual rendered poses, layered scenes and props have been inspected at phone and desktop sizes. Runtime readiness is a separate gate.

The all-games upgrade is complete only when every game passes A–G on its public route, all 32 arcade adapters and 20 learning-run integrations are accounted for, and remaining content/player-review limitations are documented. This document and asset pack establish the production foundation; they do not replace that work.


## Required game sequence — September 21 direction

Every public game must begin with its playable challenge. Settling/support strategies become available after the encounter ends, whether the player clears it or reaches recovery. The ending is an untimed interactive scene: the player performs useful actions, sees their consequences, then carries the setup into a changed revisit. Do not expose the whole strategy menu before the initial challenge or replace the ending with a lecture. Keep direct entry, reduced-motion equivalents and an accessible route to recovery. Leo uses three mosquito rounds (3, 4, 5), followed by window, phone, optional headphones, reading and light controls. Other worlds must apply this sequence to their own mechanics, not copy Leo's bedtime actions.
