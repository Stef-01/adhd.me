# Play: the modules as a run of micro-games

Founder direction (2026-09-08): "Make the modules have much less text and much more interactive.
Make it gamified and follow the aesthetic of Dumb Ways to Die, and feel exactly like that
structure-wise for the modules."

This is the plan. It replaces the nine-stage, text-led module format of PR #3 with a run of
micro-games, keeps everything the personal model needs (resonance, personalisation answers,
strategy, insight, next action), and stays inside the laws this tree already has: no punitive
gamification (PRD §34), patient copy that passes the linters, 44px targets, reduced motion with
a static equal for every effect, nothing personal in a URL or an event.

## 1. What "Dumb Ways to Die" is, structurally

Not its artwork or its song — those are Metro Trains Melbourne's and stay theirs. Its structure:

1. **A run**, not a lesson. You are dropped into a sequence of micro-games with no menu between them.
2. **One instruction, one gesture, a few seconds.** "Don't touch the wires." A tap, a swipe, a
   hold, a drag. A timer bar drains. Success or failure is instant and unmistakable.
3. **Failure is funny and short**, and you are straight into the next game. The lesson is the
   pattern you notice after a few rounds, not a paragraph.
4. **Tempo ramps.** Games get a little faster; the run has a rhythm you can feel.
5. **Characters are the reward.** Rounded, bright, expressive beans; you collect them by playing.
6. **Score is discovery**: how far you got, what you unlocked — not a leaderboard.

What this app keeps of it: 1–6. What it changes: failure never costs a life or a streak (§34 —
"never use punitive streaks", no energy depletion). A miss is a beat: the bean reacts, one line
says why, the run goes on. Rounds, not lives.

## 2. A module, as a run

Target 3–5 minutes. Every screen ≤ 14 words of instruction. No paragraph anywhere in a run.

```
Title card         2s   the module's name, its bean, "Tap to play"
Round 1..N        6–8   micro-games (§3), 5–8 seconds each, ramped tempo
Recognition round  1    "Is this you?" as a game: tap the bean that is you (often / sometimes / rarely)
                        + a drag scale for how much it costs + yes/maybe/no — the PRD §19 resonance,
                        as three taps
Insight card       1    one sentence about you, from your rounds; That's me / Partly / Not really
Try card           1    one strategy, three steps, "I'll try this" — the micro-experiment (§30)
Next               1    one primary action (§12 stage 9)
```

The explanation lives INSIDE the rounds: each round's result line is the teaching ("The task did
not change. The deadline did."). Long-form reading stays available as the existing read modules
on the Learn shelf — the runs are not a summary of them, they are the thing people play.

## 3. Micro-game catalogue

Twelve mechanics, each with a reduced-motion equal (the timer becomes a button; nothing moves
on its own), a keyboard equal (every gesture has a key), and a 44px target. A module composes
6–8 of these with its own copy and props.

| # | Mechanic | Gesture | What it teaches (example) |
| --- | --- | --- | --- |
| 1 | **Tap the right thing** | tap one of 2–4 | "Which task can Maya start?" — the one with a first physical action |
| 2 | **Don't tap** | resist a tempting target for the timer | the notification that clears the table |
| 3 | **Hold to focus** | press and hold while distractions fly | attention as a thing that is pulled, not lacking |
| 4 | **Swipe away** | swipe distractions off before the bar drains | interruption cost |
| 5 | **Drag to capture** | drag a request onto the note before it fades | working memory outside your head |
| 6 | **Order the steps** | tap three steps in order | first physical action → threshold |
| 7 | **Timing tap** | tap when the deadline bar enters "now" | time sense: now / not-now |
| 8 | **Recall after** | 4 items, an interruption, tap what was on the list | the simulation, as a game |
| 9 | **Sort into layers** | drag a cause to brain / body / environment / people | the eco-bio-psychosocial map |
| 10 | **Flip perspective** | tap Jordan, tap Sam; then tap "both are true" | relationship modules |
| 11 | **Pause meter** | hold until the heat bar drops, release before it overflows | conflict: the agreed pause |
| 12 | **Pick your bean** | tap the bean whose thought matches yours | personalisation as a game (writes an answer) |

Every mechanic emits the same events (`MODULE_STEP_COMPLETED` with `kind`, `MODULE_BRANCH_SELECTED`
with the option), and a `hit` / `miss` flag that is never shown as a score against the person.

## 4. Aesthetic

- **Beans.** The five characters redrawn as beans: one rounded body, two dot eyes, a mouth, feet.
  Same colours as today. Big — a bean fills a third of the screen. Props are single flat shapes.
- **Flat, bright, inside the tokens.** The learn palette (amber, coral, lilac, forest, slate,
  saffron) as full-bleed round backgrounds; no gradients, no shadows, no small type.
- **Rhythm.** Every round has the same four beats: instruction (0.4s in), play (5–8s), result
  (0.6s: bean reacts, one line), advance (0.3s). Springs, not eases. Under reduced motion each
  beat is a static state with a button.
- **The timer bar** is the one clock: drains across the top; in reduced motion it is a "Go" button
  and a "Done" button.
- **Sound: none.** Not in P0. A song is Metro's; ours would be a decision, not a default.
- **Type.** Newsreader for the one instruction line; the sans for everything else; ≤ 14 words.

## 5. Gamification (discovery, never punishment)

- **Rounds cleared**, shown on the module card ("6 of 7 rounds"), never "lives left".
- **Beans collected**: finishing a module unlocks that module's bean in a pose (the cast on the
  Learn page fills in). Twelve poses; no random loot, nothing to buy.
- **Insight cards** (already exist) become the run's trophy: the one sentence you confirmed.
- **Replay is free** and never resets anything the model holds.
- Nothing decays, nothing is lost, nothing is public. (§34.)

## 6. Engine

- `src/learn/play.ts` — the types: `Run` (id, title, bean, tint, rounds, recognition, insight,
  strategy, next), `Round` (mechanic, instruction ≤ 14 words, seconds, props, options, result lines
  for hit and miss, optional `writes` — an answer id the round records), and the catalogue of
  mechanics as a closed union.
- `src/learn/runs.ts` — the fifteen modules as runs (content only).
- `app/play/run-player.tsx` — the player: title → rounds → recognition → insight → try → next.
  One component per mechanic under `app/play/mechanics/`. Writes to `src/model/store.ts` exactly
  as the current player does (resonance, answers, insights, experiments, completion).
- `app/play/beans.tsx` — the bean drawings and the collection.
- `LearnModule.kind` gains `"run"`; the Learn list, cursor and progress read it like any other.
- The current nine-stage player stays for one release behind the same ids (`?module=…&long=1`) so
  a link still resolves, then goes.

## 7. Phases

Status (2026-09-08): **P1, P2 and the collection half of P3 done** on PR #4 — the engine, twelve mechanics, the beans, all
fifteen modules as runs (two carry the reflect beat, which is where the safety pathway lives), the
nine-stage player kept for one release behind `?module=…&long=1`. P3 and P4 open.

**Phase P1 — engine + three runs (this branch).** Types, the twelve mechanics, the player, the
beans, three modules converted (`context`, `starting`, `working-memory`), the Learn list showing
runs, tests: every round ≤ 14 words and passes the copy linters, every mechanic has a reduced-
motion path, a run writes the same record fields a module did; e2e: play a run end to end at 390
with and without reduced motion, keyboard only.

**Phase P2 — all fifteen converted.** Content pass on the remaining twelve; the read/quiz modules
untouched; the long-form player retired.

**Phase P3 — collection and rhythm.** Bean collection on the Learn page; tempo ramp tuned by
watching real people (5–8 users, PRD §76: did it feel patronising, could you say what it taught).

**Phase P4 — pilot instrumentation.** Round-level completion is in the analytics taxonomy
(`MODULE_STARTED` / `MODULE_COMPLETED` with `format: "run"`, `MODULE_STEP_COMPLETED` with the
mechanic and the hit); the §78 targets (start > 70 %, completion > 65 %) are measured on runs
in the pilot.

## 8. Acceptance (tests)

- No round instruction over 14 words; no result line over 16; every string passes `lintLandingCopy`.
- Every run: 6–8 rounds, exactly one recognition, one insight, one strategy, one next.
- Every mechanic renders under `prefers-reduced-motion` with no timer and completes by buttons.
- Every mechanic is operable by keyboard (Tab, Enter/Space, arrows for drag).
- Playing a run writes resonance, the answers its rounds declare, the insight verdict and the
  experiment — the same record the model reads today; `deriveNeeds` sees no difference.
- Touch targets ≥ 44 px on every round (the existing touch-floor sweep).

## 9. Decisions (founder, 2026-09-08: "those interactive game elements should be there")

1. **The runs are the form.** The long-form player stayed hidden behind `?long=1` for one release
   (PR #4) and was deleted in the next (P5): there is no `interactive` module kind any more, every
   interactive module is a run, and `scenes.ts` refuses one that is not.
2. **Timer ramps** — five percent a round, floor seventy percent, never on a round that asks
   about you (`rampedSeconds`). Tuned against real people in P3.
3. **No sound** in P0.

## 10. Read against a Dumb Ways to Die clone (2026-09-08)

The founder pointed at `roncrisostomo/dumbwaystodieclone` (Unity 5, C#, 2015; no licence file;
bundles the Google Play Games and Soomla SDKs). Nothing in it is code we can take: it is a
different engine, and a repo without a licence grants no rights anyway. What it is useful for is
confirming the structure, and it does. Its loop is the one in §3: a mini-game on a draining
timer bar with an instruction line; a short win/lose animation; the next game. Two things it has
that we do not, and two it has that we refuse on purpose:

- **Taken — the clock pauses when the game is hidden.** The clone pauses on interruption. Ours
  measured elapsed time across a hidden tab, so switching away mid-round expired it behind the
  person's back. Fixed in `run-player.tsx`.
- **Taken (founder, 2026-09-08: "use the assets and components") — the "FASTER" card.** Between levels the clone flashes one word for under a second as
  the time limit drops (7s → 2s across six levels; ours drops five percent a round, floor seventy,
  §9). Our ramp is silent. A one-beat "Faster" card when the ramp bites (say before rounds 3 and
  6, skipped under reduced motion) is the most recognisable Dumb Ways to Die beat we lack.
  Built: `fasterBefore` shows it before every third round, never before a round that asks about
  you, never under reduced motion.
- **Taken — the instruction runs over the game.** The clone starts the timer at once and slides
  the instruction over the playing scene (0.15s in, 2s hold, 0.5s out). Ours holds a 900ms
  reading beat before the clock starts. The clone's way is more faithful; ours gives the reading
  moment PRD §33 asks for. Founder chose the clone's: the clock runs from the first frame and
  the instruction is called out over the scene for two seconds, then settles. The reading moment
  is the round's first two seconds; the seconds on each round already allow for it.
- **Not taken — the art.** The clone's sprites are Metro Trains' characters, and the repo carries
  no licence. The beans are our own; the components and structure are what we took.
- **Refused — lives and points.** Three lives, a score with random bonus names ("PITY BONUS",
  "INSULT TO INJURY") and a high score are the clone's; §3 and PRD §34 rule them out. Rounds, not
  lives; beans, not points.

## 11. Phase P5 — scene-first rounds and more game (founder, 2026-09-08: "get the game modules
created and iterated asap")

Read against the captures of every round (`qa/play/`, and the review sheet built from them): the
runs worked but read as a form with a bean above it. P5 is the answer, built in one sitting.

- **The scene.** `app/play/scene.tsx`: a full-width stage with one flat SVG prop (desk, phone,
  bill, ball, lecture, bed, kitchen, calendar, door — our own art, in the beans' style) and the
  bean standing in it. Every round has one; the instruction sits above it, the controls below.
- **The bean is the thing you touch.** Hold, pause and timing put their action on the bean
  itself (press and hold Alex to stay in the class; tap Maya the moment it becomes real). Don't-tap
  puts the tempting thing in the scene as a prop-button. The clock, the drift, the heat and the
  timing track all live inside the scene.
- **Controls fill the card.** Choices are a two-column grid of 64px buttons; a third option
  spans the row. The empty lower third is gone.
- **Less asking, more playing.** One "pick your bean" round per run — the one whose answer the
  needs engine reads — and twenty-nine new game rounds across the fifteen, favouring timing,
  sort, flip, recall, drag-capture and don't-tap, so no run is under six games. Timing, pause
  and recall now take their reduced-motion choices and decoys from the round itself.

Still open, for the pilot: props that react (the phone that lights up, the bill that slides),
and the tempo tuned against real people (§9.2).