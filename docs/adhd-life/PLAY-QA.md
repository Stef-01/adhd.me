# Play QA — how a run earns its place (founder, 2026-09-08: "a strong QA process to make the games enjoyable")

A run ships when it passes four gates. The first two are code and run on every commit; the
third is a look; the fourth is people.

## 1. The gates in code (`src/learn/play.test.ts`)

- **Variety.** Every run uses at least `MIN_MECHANICS` (4) distinct mechanics across its game
  rounds and has at most `MAX_TAPS` (3) plain tap rounds. A run that is mostly tapping fails.
- **Games, not questions.** At least six game rounds per run; one "pick your bean" round.
- **Budgets.** Fourteen words of instruction, sixteen per result line, a ten-word tagline, four
  to twelve seconds a round. Every string passes the patient-copy rules.
- **Contracts.** Each mechanic carries what it plays with (a tap has a right answer, a catch
  has things to catch, a balance has a steadying move, a flip has two sides with thoughts).
- **Answers the model reads.** A round that writes an answer writes a question the module asks.
- **Structure.** Title, rounds, recognition, insight, (reflect), strategy, next.

## 1b. The sense gate (founder, 2026-09-08)

"The text on the screen and the general premise of the game must make sense." The founder's
example: a timing round that said *tap the moment it crosses into now* over a bar with no time
on it — nothing told the person the bar was a deadline approaching, or that waiting was the
point. So:

- **Every mechanic states its rule on screen**, in one line under the scene (`RULES` in
  `src/learn/play.ts`): what the bar is, what the tap does, and what waiting means. A round
  that needs the rule explained elsewhere fails.
- **A timing round carries a scale** — the marks along the line, ending on the moment to act —
  and a verb on the bean ("Start", "Walk out"). Held by the contract test.
- **A round with a right answer carries a clue** (`needsClue`, founder 2026-09-08: "it's
  impossible to guess"): the line on the scene that makes the hit inferable, the clone's sparking
  wire. Held by the contract test. The premise check reads the clue as part of the screen.
- **The relate beat follows every result** ("how much is this you?", buttons or slider): a round
  that does not ask about the person is not survey delivery. Held by the contract test.
- **Nothing moves position, and no card carries a label** (§14, the tester who dropped the
  phone): a screenshot of any card shows no kicker, no count, no rule line unless "?" is on; the
  only motion on a round is the clock draining and the bean's reaction to the result.
- **The premise check, per round, on the review sheet:** read only what is on screen. Can a
  stranger say (1) what the bar means, (2) what to do, (3) what counts as a hit, within two
  seconds? If any answer is "no", the round goes back before it ships.

## 2. The gates in the browser (`e2e/adhd-life.spec.ts`)

- A full run under reduced motion, by buttons and by keyboard.
- The clock-driven round with motion on; the hidden tab pauses it.
- Each new mechanic played once under reduced motion (catch, balance).
- The a11y sweep at desktop and phone width (WCAG 2.1 AA) on the Learn page.

## 3. The look (`qa/play/`, the review sheet)

Every step of every run is captured at 390px on every change to the runs or the player
(`qa/play/<run>-<step>.png`), and read as filmstrips on the review sheet. What the reader checks,
per round: the instruction reads in one glance; the bean is doing something; the control is the
thing the instruction names; nothing is boxed inside a box; nothing is a dark block; the hit line
and the miss line both teach. A round that reads as a form goes back.

## 4. People (the pilot)

Five to eight people play three runs each, thinking aloud. Recorded per round: did they laugh or
say "oh"; did they know what to do within two seconds; did the miss feel like a beat or a
loss; did they want the next round. The tempo (`RAMP_PER_ROUND`, `RAMP_FLOOR`, each round's
seconds) is tuned from this, not from us. The §78 targets (start > 70 %, completion > 65 %)
are read off `MODULE_STARTED` / `MODULE_COMPLETED` / `MODULE_STEP_COMPLETED`.

## The fun rubric, per round

One verb. One surprise (the thing that falls, the marker that tips, the bean that reacts). One
truth in the result line. Nothing to read before playing. If a round needs a paragraph, it is a
scene for the read shelf, not a round.
