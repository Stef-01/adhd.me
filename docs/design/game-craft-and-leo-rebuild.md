# Game craft correction and Leo rebuild

**2026-09-18 sequencing update:** The user explicitly prioritised Theo after finding the old object-packing round too easy. His public route now receives the house/route/dependency rebuild in [Theo implementation](./theo-morning-rebuild.md). This supersedes the earlier Zoe-next order; it does not imply Leo's pending patient review or the other characters are finished.

Status: first complete Leo L1/L2 candidate implemented on an isolated review route; L3 acceptance remains pending. See [implementation and QA record](./leo-room-implementation-qa.md). This document takes precedence where the earlier gameplay roadmap preserves Leo's core loop or starts with Zoe.

Founder feedback: the shipped games are too basic and do not meet the expected quality of a polished contemporary app. Do not interpret a request for more depth as a request for more particles, more quiz screens, more targets, or more shared-template content.

## 1. What was misjudged

The previous release proved routes, controls, accessibility and deterministic behaviour. It did not prove that the games were compelling. Calling the journeys complete without that distinction overstated the result.

Leo is the strongest existing example of scene continuity. It is not an adequate gameplay ceiling. Code confirms that the active round principally offers catching and optional audio; source control and wind-down actions only appear after it finishes. The seeded waves vary positions/speed but not the central decision. Its ending follows a fixed list of five buttons. Those limits cannot be solved by polishing animation alone.

The earlier plan also risked replacing thin arcade exercises with thin branching conversations. A draft tray and two conversation options do not automatically make an engaging game. Every story needs a system the player can understand, influence and get better at using.

Revised order: prove a deeper Leo first; then build Zoe to test whether the quality bar transfers to emotional and relationship play. Only after both pass should the remaining games proceed sequentially. Completion claims must distinguish implementation, technical QA, observed playability and observed strategy understanding.

## 2. Hard acceptance rules

These are delivery gates, not marketing adjectives.

1. **A meaningful loop:** describe what the player observes, decides, does and changes. “Tap the highlighted thing” is insufficient as the whole loop.
2. **Legible decisions:** before a consequence occurs, the player has enough information to make a reasonable choice. Surprise is allowed; arbitrary punishment is not.
3. **Interaction between systems:** the player can change a cause, not merely clear symptoms. Those changes persist.
4. **Recovery:** mistakes create a playable situation, not repeated modal result screens. No deliberately unwinnable first round to force a lesson.
5. **Mastery:** a second attempt can improve through understanding, not only faster fingers or memorising answers.
6. **Authored variation:** another attempt can require a different priority. Random coordinates or universally faster objects do not count as a new encounter.
7. **An enacted ending:** props and people respond to choices; the next encounter demonstrates the changed conditions. No quiz glued onto the result.
8. **Bespoke composition:** a world with character blocking, meaningful props and continuity. No generic rectangle containing a sprite above a button stack.
9. **Interaction finish:** anticipation, contact, consequence and recovery are distinguishable. Controls remain responsive while effects finish.
10. **Equivalent access:** normal, still/untimed, keyboard and touch play retain meaningful decisions. Accessibility cannot reduce the game to choosing the explicitly correct answer.

Keep the primary visible vocabulary small: normally one objective and two or three available action types. Depth should come from their interactions, not a toolbar with ten powers and four meters. Optional complexity is introduced in the scene through a readable event, not a setup screen.

Explicitly rejected shortcuts: cosmetic reskins of the same engine; endless health drain; faster waves as the sole progression; hidden rules; forced failure; achievements standing in for content; procedural chaos; decorative camera shake; copying a mobile game frame onto desktop; declaring quality from test counts.

## 3. Leo: a living bedroom, not a target field

### Fantasy and objective

Help Leo reclaim his evening while a small bedroom keeps asking for attention. The player manages the room as well as the mosquitoes. Leo has agency and readable reactions; he is not a health bar attached to a bed.

One-click entry starts with the room already alive. No introduction carousel or difficulty selector. A low-pressure first nuisance teaches catching. The window, phone and bedside objects are usable from the beginning. The player is never prevented from noticing and fixing the source early.

Working title: **One tiny sound**. Keep the existing slug. The primary objective during the challenge is to create a manageable room before a clearly fictional countdown ends. The routine that follows is untimed. A short challenge is about 45–75 seconds as an initial prototype range; final length depends on play rather than an engagement quota.

### Three coupled systems

**A. Intrusion and movement.** Mosquitoes come through a visible open window or are already inside. Each has a simple readable behaviour: a circulating scout with a resting pause; a bedside hoverer whose position makes it urgent; or a paired arrival with staggered perches. Behaviour is communicated by path, silhouette/pose and a brief anticipation cue. Do not require identifying tiny colours or hearing a pitch. Start with two behaviours in the prototype; add a third only if it changes decisions.

**B. Room control.** Securing the window prevents later entries, but does not erase mosquitoes already inside. Parking the phone prevents another authored notification, but does not solve the insect problem. These are visible causes, not magic reductions to a generic difficulty number. A player may prioritise an immediate bedside nuisance, close the source, or remove a competing phone demand. Actions take the player's attention, creating natural opportunity cost without an invented stamina tax.

**C. Recovery and winding down.** A quieter interval allows Leo's posture and breathing to settle gradually. Headphones can be a chosen comfort prop; they do not remove insects, grant invulnerability or automatically induce sleep. Quiet is equally valid. Reading starts a small continuation activity once the room is manageable; a new disruption can interrupt the page marker, but preserves progress. The player can address it and return rather than restart the whole routine.

The existing regulation indicator remains readable during challenge, with text/pose equivalents. It represents the fictional scene, not a test of the player. Keep one meter plus the countdown at most. Do not add public emotion scores, combo incentives for staying calm, or shame feedback when it drops.

### The actual decision loop

1. Notice what is happening now and one sign of what may happen next.
2. Decide whether to relieve the immediate disruption, prevent another, or continue a small wind-down action.
3. Act on a physical object or mosquito.
4. Observe a direct effect: a source is shut, a mosquito is caught, a notification is parked, a page is held, Leo settles.
5. Reassess under changed conditions.

The game must not secretly reopen a secured window to sustain difficulty. If the player solves the source immediately, reward that insight. A short, effective run is valid. Interesting replay comes from different initial conditions and interruption patterns, not invalidating a successful strategy.

### First encounter storyboard

| Beat | What happens | Player possibilities | Consequence |
|---|---|---|---|
| Immediate entry | Leo follows a nearby mosquito with his eyes; open window and resting insect are visible | Catch it, inspect/close window, act on phone | Action responds immediately; no tutorial overlay |
| First choice | Another insect approaches the window; one already inside moves toward bedside | Source control versus immediate relief | Closed window blocks entry; catching reduces current disturbance |
| Competing demand | Phone displays one authored badge; another insect rests on a clear landmark | Park notification, catch resting insect, finish securing source | Changed sources alter future events; no simultaneous popup storm |
| Pressure peak | Remaining nuisances interact with Leo's attempt to wind down | Prioritise, recover, change tactic | Readable pose changes, recoverable interruption, still reachable controls |
| Room becomes manageable | Longer quiet spaces emerge | Start reading, choose quiet/comfort, adjust light | Wind-down props remain where put; no hard scene cut |
| Deadline if reached | Challenge pressure ends; room state remains | Continue recovery without a ticking clock | No reset, loss-of-worth message or denied strategy |
| Next evening | Same arrangement, a changed authored nuisance | Reuse or adjust the setup | Window prevents entry; phone boundary persists; not an autoplay victory movie |

Author exact initial insects, positions, events and safe perches before adding procedural variation. At most one new demand introduced at a time in the first encounter. Forewarning lives in the world: silhouette outside the window, a phone badge, a mosquito's resting pose. Do not put flashing red arrows over targets.

### Physical interaction rules

- Catch: tap/click with a satisfying short response; focus moves a flying target to a stable accessible perch. Visual motion does not escape a keyboard user.
- Window: direct target on the latch/sash; select then close is an equivalent to a short drag. Immediate confirmation in the actual latch and outside insects.
- Phone: move to its bedside home or activate its in-scene boundary. No destructive or real-device action. The authored next notification is visibly held.
- Reading: open book and retain a page marker through interruption; progress is a small authored action, not a forced real reading timer or rhythmic accuracy gate.
- Lighting/comfort: player-adjustable scene state, optional equivalent quiet path; no compulsory headphone purchase or audio playback.

Feedback vocabulary should be distinct: catch has a snap/settle; window has resistance and a latch; phone docks; paper turns and stays; blanket/shoulders loosen. Do not apply the same spring-scale effect to every object.

### Replay and difficulty

Use three authored encounter families: open-window arrival, already-inside search/prioritisation, and a mostly quiet room with competing device interruption. The last can be a short recovery-focused encounter, not secretly inflated with more insects. Keep first-play composition predictable; later seeds vary safe positions and order within bounds.

No launch difficulty slider. No opaque adaptation from clinical/profile data. If support is needed, offer it in-scene or through the existing pause/settings path. Untimed still mode uses player-driven event beats and preserves source-control decisions; it is not the old wave count with the clock removed.

Evaluate both “catch first” and “source first” policies. Their value can vary with initial room state. If one action trivialises every authored scenario, revise scenario composition rather than adding an arbitrary cooldown or making the strategy ineffective.

## 4. Visual and audio craft specification

**Composition:** a complete bedroom stage with foreground bedside props, midground bed/Leo and background window. At desktop width, extend the room composition; do not enlarge targets with viewport width or display a phone-shaped game floating beside a giant heading. On portrait, recompose landmarks while maintaining the same state and hit semantics.

**Palette:** retain the established lavender/navy world. Initial tokens: wall `#C5C6ED`, shadow/floor `#ABAED9`, ink `#3A355F`, paper `#FFFAF0`, lamp/quilt accent `#E7BB73`, phone cool light `#8FA9DD`. Lighting may shift locally; text contrast stays checked. No new site-wide theme.

**Type:** existing Inter variable for objective and labels; tabular numerals for the clock. No giant dashboard heading occupying a quarter of the game. Reading illustration can use existing Newsreader, without turning game instructions into ornamental serif text.

**Character:** author separate poses for noticing, tracking, irritation, overload, seeking support, resettling and resting. Include body/eyes/hands/blanket changes where possible, not solely mouth replacement. Expressions must read at 390px and in reduced motion. Overload is not a comic punishment.

**Assets required:** bedroom composition; open/moving/secured window; phone active/parked; book closed/open/bookmarked; lamp states; headphones worn/aside; per-behaviour insect poses; three catch/escape reactions; next-evening continuity. Produce an asset/state contact sheet before final integration. No emoji placeholders in accepted release captures.

**Motion:** authored target trajectories with pauses and anticipation; local character reactions; genuine prop transitions. No blanket looping bob on every object. Reduced motion uses stable poses and instant/short-opacity consequences. Never animate the whole room to signal an error. Effects cannot intercept clicks or block new input.

**Audio:** optional composed room sound and differentiated insect voices with a capped mix; adding insects must not make volume keep rising. Spatial/readability cues remain visual. Mute/pause/exit terminate or suspend voices correctly. Do not simulate dysregulation by making playback unpleasantly loud.

## 5. Prototype and production engineering

Proposed new modules: `src/lives/leo-room/{types,reducer,director,scenarios}.ts`, `app/lives/leo-room/{player,scene,props,character}.tsx`, and scoped CSS. Names are provisional until implementation. Reuse trusted input/audio utilities; do not couple the new story state to `EngineResult`'s success/failure binary.

```ts
interface BedroomState {
  scenarioId: string;
  seed: number;
  mode: 'challenge' | 'recovery' | 'revisit' | 'rest';
  elapsedMs: number;
  remainingChallengeMs: number;
  paused: boolean;
  window: 'open' | 'secured';
  phone: 'available' | 'parked';
  book: { open: boolean; marker: number };
  lamp: 'reading' | 'dim' | 'off';
  comfort: 'quiet' | 'headphones';
  insects: InsectState[];
  pendingEvents: ScheduledRoomEvent[];
  activation: number; // fictional balance parameter, never patient data
  quietMs: number;
}
```

Simulation actions are semantic (`SECURE_WINDOW`, `CATCH`, `PARK_PHONE`, `OPEN_BOOK`, `TURN_PAGE`, `SET_LIGHT`, `PAUSE`, `RESUME`, `TICK`). Event source conditions are checked when an event would fire: closing the window cancels pending ingress without erasing existing insects. Derive emotional presentation from actual accumulated demands/support, not remaining time alone.

Keep the clock/scheduler pure and injected. Integrate at a fixed step; cap catch-up and object count. Use a spatial mapping layer so input positions are independent of responsive CSS. Time-critical render positions use motion values/transforms, while low-frequency game facts use React state. All completion paths idempotent. Offscreen/hidden/unmounted scenes cannot continue draining regulation or emitting audio.

Keep the prototype on an isolated review route, or behind a disabled implementation flag. The first candidate uses the unlinked, noindex `/lives/lab/leo-room` route so the founder can review the deployed build directly. Committing and pushing work does not mean exposing an unpolished replacement to patients. Keep the current public game until the complete replacement clears the gate. No half-finished experimental controls appear on the production library.

### Three staged deliverables

**L1: playable systems prototype.** A rough but coherent room with catch, source prevention and persistent object states; two encounter families; timed and still equivalents; a recoverable deadline. It must already answer whether decisions are interesting. Automated tests prove causality, while hands-on play judges rhythm. No claim of production polish.

**L2: complete experience slice.** Bespoke art/poses, phone interruption, uninterrupted transition into enacted routine, next-evening proof, sound, all inputs and screen sizes. Remove any mechanic that adds workload without a meaningful choice. Do not add the third insect behaviour unless it materially changes priorities.

**L3: tuning and release.** Repeated play, patient co-design, strategy understanding, content review, performance profiling, accessibility, live deployment verification. Only now enable the replacement and use it as the craft reference for Zoe.

Estimated first full Leo slice: approximately 8–15 focused working days, to re-estimate after L1. This replaces the earlier 2–3-day routine-only estimate; external participant availability is additional. Do not compress production art, tuning and playtesting into a single coding pass.

## 6. Every other game must have its own identity

| Game | Primary play skill | Systems that interact | What would still be an unacceptable shortcut |
|---|---|---|---|
| Zoe | Managing a conversation while keeping track of intentions | Draft workspace, ambiguous information, turn ownership, boundaries and later commitments | A sequence of correct dialogue choices with heart/anger meters |
| Mia | Prospective memory supported by spatial planning | Room transitions, portable objects, interrupted intentions, cue placement and shared commitments | Hidden-object search followed by “use a reminder” |
| Arjun | Collaborative sense-making and recovery | Agenda, conversational turns, retained ideas, clarification and a shared decision artifact | Holding a button to simulate paying attention |
| Maya | Prioritising and reshaping competing inputs | Route, input channels, needs signals, quiet spaces and destination | Wiping the screen twice while a bar refills |
| Theo | Planning and executing a departure | Object locations, task dependencies, tempting detours, changing arrival plan, tomorrow's setup | Packing the same three items faster on each replay |
| Jax | Resource decisions and postponing a want | Basket, substitutions, finite tokens, wishlist and shared meal | Swatting all non-list objects or a morality quiz about spending |
| Nina | Turning uncertainty into a workable first move | Task structure, missing information, preparation loops, actual draft and re-entry marker | Typing anything once, then selecting “start small” |

For Zoe and Arjun, authored narrative branches alone are not sufficient. The player must manipulate persistent information, track an intention, make a choice with consequences and later use what they preserved. Dialogue provides social meaning around those interactions. Both people need agency; a neat ending is not guaranteed by a correct answer.

For Mia and Theo, objects must occupy useful places in the world and remain there. For Jax, alternatives must genuinely fit different plans. For Nina, saved progress must support returning. This gives each game a learnable system while keeping the UI simple.

## 7. New quality gates and evidence

### Design tests before final art

- Describe two viable tactics and show an encounter where their priorities differ.
- Demonstrate a recoverable mistake without a result modal or reset.
- Explain why the second attempt rewards understanding, not just speed.
- Demonstrate the strategy by a state trace: source/event/action/consequence/revisit.
- Perform at least five varied internal runs, including early source control, catching-first, intentional mistake, inactivity/deadline and still mode. These are scenario coverage, not substitutes for external players.
- If the prototype is dull without its visual effects, change the loop before adding more effects.

### Leo technical cases

Secured window blocks scheduled ingress; existing insects remain; phone boundary suppresses only its own events; catching invalid/duplicate IDs is harmless; inactive/paused states cannot drain; book marker survives interruption; quiet/headphone choices both reach rest; countdown expiration retains room and enters recovery; early prevention is never punished with invisible spawns; stable keyboard targets remain reachable; DOM hit regions do not overlap ambiguously; exit leaves no audio/timer work.

### Craft review

Capture continuous play recordings, not only screenshots. Review first ten seconds, busiest ten seconds, recovery, ending and replay. Check what the player is doing versus waiting/reading; accidental target overlaps; distinctive feedback; character legibility; input responsiveness; composition at desktop and small-phone sizes. Keep a defect list with fix evidence rather than “looks polished” assertions.

### Observed player gate

Use the existing co-design partner and additional varied participants when available. Observe comprehension without coaching, strategic adjustment, voluntary replay and unaided explanation of a world change. Ask what felt repetitive, unfair, embarrassing or infantilising. Record actual findings; never label internal tests as patient validation. If external playtests have not happened, say so and keep that gate visibly pending.

Automated green checks are the engineering floor. A production claim requires the complete slice, reviewed art/motion, state/branch QA, supported input modes, meaningful strategy transfer and recorded playability findings. No game is “done” because its endpoint loads or its test count increases.

## 8. Revised sequence

1. Correct the specification and inventory the source-control gap (this document).
2. Leo L1: prototype depth and strategy causality.
3. Leo L2: complete art, encounter, ending and revisit.
4. Leo L3: tune, review and release the whole slice.
5. Zoe: prove equally strong relational play using a distinct system.
6. Mia, Arjun, Maya, Theo, Jax and Nina, one full game at a time.
7. Derive compact arcade variants and consolidate learning runs as each parent story becomes ready.
8. Final cross-game regression and evidence review.

The eight-game specification and 32/20-item inventories in the main roadmap remain useful. Its preservation of Leo's core loop, first-Zoe ticket and original programme estimate are superseded. Re-estimate the remaining programme after Leo L1 and Zoe's systems prototype; do not publish a new precise total before those unknowns are resolved.
