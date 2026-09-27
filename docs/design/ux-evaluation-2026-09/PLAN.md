# UX evaluation upgrade plan (2026-09-26, revision 2)

The lead UX designer's evaluation, `ADHDme.app_UX_Evaluation.pdf` (8 annotated screens, 21 numbered
notes; the modules page numbers 02 and 03 together), turned into a build plan for this tree. Every
note is traced to the code that renders it, checked against the build as it ships today, and given a
specific change, its copy, its word cost, the tests it touches, and how we know it is done.

Revision 2 applies an adversarial review of revision 1 (§9). It found a second path to the "Working
well" bug, four wrong budget sums, an infeasible contrast target, a snapshot design that would have
lost data, and a phase order that left two P0 items to last. All are corrected below.

Read in this order: §1 what was checked, §2 what changed since the review, §3 the rules every fix
must pass, §4 the decisions only the founder can make, §5 the register of findings, §6 the
workstreams, §7 the order of work, §8 the definition of done, §9 the audit log.

## 1. Source and method

- **Review:** 8 screens (Support home, results, Learn games, care map, Learn modules, a module page,
  My ADHD, Urgent help). The 21 notes are split into 24 rows in §5 where one note holds several asks.
- **Tree:** `claude/git-clone-cleanup-ijrxqo` at bde8b3c, which contains the latest `main` (87ad1dc)
  plus PR #36. Where PR #36 changes a reviewed screen, §2 says so.
- **Code audit:** three read-only traces (Support and Urgent help; Learn, care map and module page;
  My ADHD and the data model), each finding pinned to file and line.
- **Build audit:** a production build served locally, captured at 390×844 and 1440×900 on every
  reviewed screen, plus one reproduction: choose the goal "Focus" in Learn, then open My ADHD.
- **Accessibility audit:** axe (the repo's tag set, WCAG 2.0 A to 2.2 AA) on every reviewed screen at
  both widths, then a read of every node axe could not measure, then contrast computed for every
  lesson colour pair.
- **Law audit:** `CLAUDE.md`, `.claude/skills/adhdme-taste/SKILL.md`,
  `docs/design/text-budget-postmortem.md`, `docs/adhd-life/MAP-PRD.md`, `docs/adhd-life/PLAN.md`,
  `docs/adr/0008-accounts-and-sync.md`, the registers in `src/compliance/`.
- **Word counts:** from `qa/text-budget.json` (2026-09-24) and a fresh measurement of the My ADHD and
  Learn states with `scripts/text-budget-lib.mjs` (`measure()` counts every visible, non-`sr-only`
  text node; a word needs a letter or digit, so a "✓" counts 0).
- **Adversarial review:** an independent reviewer re-measured the budgets, spot-checked 25 citations,
  and computed the contrast of every lesson colour. §9 records what changed.

## 2. What the review saw against what ships now

| Screen | What the review shows | What ships at bde8b3c |
| --- | --- | --- |
| Learn games | A hero with eight faces and Play, a Leo tile, a Theo tile, then 8 tiles | a8ac430 (2026-09-22, "expose all eight games") replaced them with "Play mix", "The eight lives →" (to `/lives/characters`) and an 8-name roster, then 8 tiles, then "All 20 games". 16 choices before scrolling. |
| Care map | A legend and a "Four layers, one life." panel | 4886eb3 removed both. The default panel is "Tap a part of life." with the National Wellness Institute paragraph. |
| My ADHD | A coral shape | PR #36 (branch only) turns the shape sage and draws a dashed "day one" outline under it once anything has moved. No caption, because two words did not fit the 60-word ceiling. |
| Home | "are you looking for?" highlighted in yellow | Nothing highlights part of the heading. `::selection` is brand yellow (`app/styles/brand.css:82`); the screenshot shows selected text. Not a finding. |

## 3. The rules every fix must pass

The review asks, in several places, for more words. This product has a hard law against words,
written after a failure (`docs/design/text-budget-postmortem.md`). Where the two meet, this plan
either finds a structural answer that needs no words, or pays for the words with a named cut, or
puts the conflict to the founder in §4. It never asserts that an addition complies when the law
says otherwise.

1. **Every screen at or under 60 words, 40 the target** (`CLAUDE.md`, `text-budget-lib.mjs:44`). The
   only other ceiling is the finder results list at 72, founder-reasoned and keyed by name
   (`:140-159`); this plan does not extend it. Every addition names its cut; numbers go in the commit.
2. **Delete, do not hide.** A "show more" is allowed only as `{#layout.five-then-rest}`.
3. **"No instructions, no ledes, no explanatory paragraphs: a heading and the one thing to do"**
   (`CLAUDE.md`, the one law). `{#layout.calm}` allows "at most one line under" a heading, and puts
   labels a screen genuinely needs "behind an explicit ask". Any line this plan adds under a heading
   is a statement, not an instruction, and has a row in §4.
4. **No tooltips** (`AESTHETIC.md:768`). Where the review says "label or tooltip", this plan labels.
5. **No score of a person.** My ADHD never shows a number about the person, never red, never better
   or worse (`MAP-PRD` §2 and §7, `src/wellness/map.ts:3-9`; `e2e/my-adhd.spec.ts:57` asserts no digit
   on the hub). "Compare over time" is built as a shape against a shape, named by month.
6. **Games do not measure the person.** `src/model/learning-evidence.ts`: "Scores, speed, mistakes and
   completion cannot create a need." Some games show a score (the Chaos Run behind "Play mix",
   `app/lives/run.tsx:238`; quiz results "N of 6"); none of it reaches the map.
7. **Nothing leaves the device** until the founder decides otherwise (ADR 0008, proposed, not built).
8. **Patient copy rules** (`src/compliance/public-surfaces.ts`): no "specialist", no diagnosis or
   treatment claims, no testimonials, no health-outcome promises. Every new string passes the
   existing patient-surface lints.
9. **Text alternatives are not hidden copy.** A drawing that carries information needs a text
   alternative (WCAG 1.1.1). Where this plan adds `sr-only` text, it is the alternative for a drawing,
   never a sentence moved off screen to pass the count.

## 4. Decisions for the founder

The plan proceeds on each recommendation unless the founder overrules it. Rows marked **Phase 1** are
needed before Phase 1 ships; the rest are needed before their phase.

| # | Question | Recommendation | Why |
| --- | --- | --- | --- |
| D1 | The serif headline on Support home (1.01). The law says "Serif (`Newsreader`) at display scale for statements", but `brand.css:38` sets every in-app `h1` sans, so today only Support home obeys it. | **Serif for a question asked of the person, and for a quoted voice; sans for statements.** Rewrite `{#type.serif-display}` to say so. | Matches the warm-brand board ("Reserved for questions asked of the patient", `USER-BRAND-BOARD.txt:342`) and keeps the screens that already read well. The alternatives are all-serif statements (a large restyle) or all sans (one line, §6 W6a). |
| D2 | Are games a measurement to compare over time (3.01)? | **No.** Record that a game was played. Show a tick. No result, no date on the tile. | §3 rules 5 and 6. A date on a tile invites a daily return (`src/learn/progress.ts:5`: "no score, no streak and no nudge"). |
| D3 | Progress kept on device only (5.04) | **Phase 1:** say it where the record is shown (My ADHD) and where answers are given (`/start`); add "Save a copy" and "Restore a copy" in Settings. **Later:** ADR 0008 option 2 (sync by recovery code, no identity). | Honest now with no server. Sync is a founder act (ADR 0008:77). |
| D4 (Phase 1) | Non-voice crisis options (8.01) | Add **Lifeline Text 0477 13 11 14**, **Kids Helpline webchat**, **Beyond Blue webchat**, and a non-voice route to **000** (National Relay Service) once its current form is verified. | Appendix A. 13YARN (13 92 76) is a voice line: add it as a call row if wanted, not as the non-voice answer. |
| D5 | What "compare" means on My ADHD (7.01) | The dashed outline is a past shape, named by month ("Day one", "August"). No numbers, arrows, better or worse. | §3 rule 5, and the founder's note that the "baseline vs now subtle separation" is worth keeping. |
| D6 | The Learn heading (3.02) | "Learn about ADHD." | The reviewer did not know what "A little more understanding." referred to. |
| D7 (Phase 1) | Settings → Delete also deletes the Lives profile and the finder's typed words | **Yes.** One delete, every data key (enumerated in W5). | It says "Deleted from this browser." today while `adhdme.lives.v1` survives and keeps feeding the map. |
| D8 | One line under the Learn heading (3.02: "add one line under the heading explaining what the games are and that you don't need to do them all") | **A statement, no instruction:** "Short scenes from everyday life." The "not all of them" answer is structural: three are offered, the rest are one tap away. | `CLAUDE.md` bans ledes and instructions; the review asked for the line. This is the smallest line that answers "what are these". |
| D9 | Subtitles on game tiles (3.02) | **On the three "Try these first" tiles only**, at most 4 words; the full list stays names. | The postmortem says "Lists become names" and "names with the hook on tap"; the review says titles are a guessing game. Three hooks where a person chooses, names where they browse. |
| D10 | The eight-name roster on Learn (a8ac430 put all eight on the page) | **Keep all eight one tap away**, as a group in "All games", not above the fold. | Reverses part of a8ac430, which was deliberate; needs a yes. |
| D11 | The practitioner card on the My ADHD hub ("Jane Whitlock / Task initiation") duplicates the axis sheet's "Who helps here" | **Move it into the sheet** (Phase 2), to pay for the compare pill and "How it fills in". | Part of the founder's comp (PR #36 §4). If kept, Phase 2 cuts elsewhere (W3 ledger lists the fallback). |
| D12 | "How it fills in" is an explanatory list, behind a labelled button | **Yes**, as the explicit ask `{#layout.calm}` allows; four short rows, no paragraph. | The review asks to "clearly explain this to users before displaying the dimension chart". |

## 5. Findings register

Priority: **P0** safety, wrong information, or the product's stated purpose; **P1** clarity and
overload; **P2** polish. "Status" is what the build audit found at bde8b3c.

| ID | Screen | Review note (short) | Status | P | Fixed in |
| --- | --- | --- | --- | --- | --- |
| 1.01 | Home | Serif headline unlike other screens | Confirmed. `welcome-stage.tsx:78`; `brand.css:39-42` beats `brand.css:38` | P2 | W6a |
| 1.02 | Home | One empty box; is it safe to open with it? | Confirmed. Placeholder at `welcome-stage.tsx:114`, `type-stage.tsx:74` | P1 | W6b |
| 1.03 | Home | "Try an example search" easy to miss | Confirmed. It opens a separate auto-cycling carousel, it does not fill the box | P1 | W6b |
| 2.01 | Results | Unlabelled sparkle | Confirmed. `clarify-star`, "Improve my matches" (`results-stage.tsx:363-374`), unlabelled on purpose (O244); a second, decorative sparkle means something else (`:348-352`) | P1 | W6c |
| 2.02 | Results | "Start over" far from the search bar | Confirmed. `results-stage.tsx:171` | P1 | W6d |
| 3.01 | Learn games | No played state | Partly. The 20 runs show "Done"; the 8 character games record nothing | P1 | W7 |
| 3.02a | Learn games | "A little more understanding." unclear | Confirmed. `app/(app)/approach/page.tsx:37` | P1 | W7 |
| 3.02b | Learn games | Why are some separate; do I do them all | Changed: roster + tiles, still unexplained | P1 | W7 |
| 3.02c | Learn games | Too many choices | Worse than reviewed: 16 before scrolling | P1 | W7 |
| 3.02d | Learn games | Titles are a guessing game | Confirmed. Taglines exist but are `sr-only` and 4 to 10 words | P1 | W7 |
| 3.03 | Learn | "The care map" link too small; does it belong on games? | Confirmed. 14px pill on both panes; its panel links modules only | P1 | W7, W9 |
| 4.01 | Care map | "You / 1 in the picture" cryptic | Confirmed. `care-map.tsx:127`, a count of derived needs | P1 | W9 |
| 4.02 | Care map | Body and Environment upside down | Confirmed. `care-map.tsx:110-121` | P1 | W9 |
| 4.03 | Care map | Wheel too big, panel out of view | Confirmed. About 1000px square at 1440, panel below, no scroll | P1 | W9 |
| 5.01 | Modules | Why these three; is anything driving it? | Driven by Lives goals and "this is me" signals (`learn-panes.tsx:316-333`); never said | P1 | W8 |
| 5.02 | Modules | About 13 rows | Confirmed | P1 | W8 |
| 5.03 | Modules | Goals subtle, seem to do nothing | Explained: the goal does change "For you", but the chips sit at the bottom so the change happens off screen | P1 | W8 |
| 5.04 | Modules | Progress on this device only | Confirmed. localStorage only, no backup, no disclosure where the record is shown | P0 | W5 |
| 6.01 | Module page | "All modules" pressed against the top | Confirmed. `platform.css:57-61` zeroes the top padding | P2 | W10 |
| 6.02 | Module page | Contrast may fail WCAG | Axe clean. Quiet ink on strong lesson fills is 4.65 to 5.79:1 (passes AA narrowly); axe could not measure 9 to 33 nodes per screen | P1 | W10, W11 |
| 7.01 | My ADHD | No way to compare with a past result | Confirmed. Nothing stores the map over time; PR #36's outline is reconstructed and unlabelled | P0 | W3 |
| 7.02 | My ADHD | Start CTA unclear, cannot redo | Confirmed. No redo; revisiting `/start` jumps to the end | P1 | W4 |
| 7.03 | My ADHD | How are the six dimensions filled in | Never said on screen. Sources traced in W4 | P1 | W4 |
| 8.01 | Urgent help | No text or chat option; verify numbers | Confirmed. Voice only, no verification date anywhere | P0 | W1 |

Found by the audit and the review round:

| ID | Finding | Evidence | P | Fixed in |
| --- | --- | --- | --- | --- |
| N1 | **An axis reads "Working well" when nothing measured it.** A chosen goal, a "this is me" tap, or a confirmed interpretation adds a source with no cost; cost defaults to 0; 0 maps to "Working well". So "I want help with Focus" and "this is me" both paint the opposite. | Reproduced (goal "Focus"). `learning-evidence.ts:45-56`, `needs.ts:218-247,262-267`, `matrix.ts:220` | P0 | W2 |
| N2 | Category eyebrows on lesson cards ("The idea" ×20, "The word", "The statement", "Everyday" ×3 …) and an uppercase activity label ("TURN AN IDEA OVER") | `{#layout.calm}` forbids them. 63 eyebrow strings in `src/learn`; the scene times ("Tuesday, 8pm") are story, not labels | P1 | W10 |
| N3 | Two identical sparkles with different meanings on results | `results-stage.tsx:348-352` vs `:363-374` | P1 | W6c |
| N4 | Delete leaves the Lives profile and finder text; the Delete row is hidden when only Lives data exists | `app-settings.tsx:88-131`, `hasSignals` (`store.ts:393-395`) reads the model only | P0 | W5 |
| N5 | "Day one" is a reconstruction that absorbs later answers | `app/my-adhd.tsx:199-201` | P1 | W3 |
| N6 | `/my-adhd/history` has no link from anywhere | Reachable by URL only | P2 | W4 |
| N7 | The contrast gate passes what it cannot see | Axe "incomplete" is not a failure, so SVG and gradient text is never checked | P1 | W11 |
| N8 | Care-map labels render at about 6 to 7px on a phone | 8.75 SVG units at 0.7 scale | P1 | W9 |
| N9 | Resets are scattered, each with a different scope | Learn reset, Lives lab reset, Settings delete | P1 | W5 |
| N10 | Six dead serif rules that never apply | `globals.css:10125`, `platform.css:145`, `match.css:4`, `globals.css:2037`, `:9921`, `:9803` | P2 | W6a |
| N11 | `SKILL.md` cites `src/design/taste-register.ts` and its test; neither exists | `src/design` is empty | P2 | W12 |
| N12 | A focus ring on the module heading on load | `learn-modules.tsx:68` focuses it by script | P2 | W10 |
| N13 | The care-map panel shows a number about the person: "you put the cost at N/10" | `care-map.tsx`, the `signal.set` line | P1 | W9 |
| N14 | Dates are UTC: before about 10am in Australia "today" is yesterday | `store.ts` `today()` | P1 | W3, W7 |
| N15 | Text under 12px at 390 outside the reviewed screens: Theo's room names at 8px, Leo's prop labels, the game shell's toolbar, Nina's chunks, Jax's tags, Mia's pocket count, and /story's route stops and pins. Found by W11's sweep in Phase 1 | `e2e/contrast-sampled.spec.ts` `LEDGER` names each | P2 | W12 |

## 6. Workstreams

Each workstream lists the change, exact copy with word counts, data, the budget ledger, the tests,
and acceptance. File paths are where the change lands.

### W1. Urgent help: reach someone without speaking (8.01, D4) · P0 · Phase 1

**One verified registry.** New `src/model/crisis-contacts.ts` holds every crisis number the product
shows: the Urgent help rows and the numbers quoted in `SAFETY_RULES` (Lifeline, Suicide Call Back
1300 659 467, Beyond Blue, Butterfly 1800 33 4673, the AOD hotline 1800 250 015, 1800RESPECT). Each
contact: `service`, `method` (`call` | `text` | `chat` | `relay`), `href` (`tel:`, `sms:`, `https:`),
`said`, `when` (per method, three words at most), `verifiedOn` (ISO date), `source` (official URL).
`SAFETY_RULES.recommendedAction` strings and `URGENT_SERVICES` are built from it, so they cannot drift.

**The page** (`app/(app)/urgent/page.tsx`). Every row stays one whole-row link, so a shaking thumb
cannot miss (`platform.css:141-143`). Rows, in order:

| Row | Right side | When | Link | Words |
| --- | --- | --- | --- | --- |
| Emergency | 000 | In danger now | `tel:000` | 5 (as today) |
| Lifeline | 13 11 14 | Any hour | `tel:131114` | 6 (as today) |
| Lifeline Text | 0477 13 11 14 | Any hour | `sms:0477131114`, message icon | 8 |
| Kids Helpline | 1800 55 1800 | Up to 25 | `tel:` | 7 (as today) |
| Kids Helpline chat | Chat | Up to 25 | service's chat page, chat icon | 6 |
| Beyond Blue | 1300 22 4636 | Any hour | `tel:` | 6 (as today) |
| Beyond Blue chat | Chat | hours as verified | chat page | 6 |
| 000 without speaking | Relay | as verified | National Relay Service page | 5, only once verified |

- The number stays visible on the text row, so a desktop, where `sms:` does nothing, can still copy it.
- Footer: "Free, any hour, from any phone." is not true of every row, and a 1300 number is not always
  free. Replace with **"Free to call."** (3) only if every call row is verified free; otherwise delete.
- `SAFETY_RULES` that name Lifeline add "or text 0477 13 11 14" (5 words) through the registry.

**Verification.** `docs/ops/crisis-contacts.md`: each contact's official source and the check steps. A
scheduled monthly GitHub workflow (not PR CI, so an old date never breaks an unrelated PR) opens an
issue when any `verifiedOn` is older than 90 days. On release day every row is checked by hand.

**Budget:** /urgent 37 → 37 + 8 + 6 + 6 + 5 − 6 + 3 = **59**; without the relay row 54. Both under 60;
above the 40 target, which the page accepts for safety rows. Measure.

**Tests:** unit (`src/model/crisis-contacts.test.ts`): every `href` scheme matches its `method`; at
least one non-voice contact; every contact has `verifiedOn` and `source`; every number quoted in
`SAFETY_RULES` comes from the registry. e2e (`e2e/urgent.spec.ts`, new): an `a[href^="sms:"]` is
present; every row ≥44px; no horizontal scroll at 320. Keep `src/model/model.test.ts:144` and
`e2e/adhd-life.spec.ts:236` ("13 11 14" in the safety dialog) green.

**Acceptance:** a person who cannot speak reaches Lifeline Text in two taps from any screen (the
header's "Urgent help", then the row). Every contact matches its official source on release day.

### W2. No measure, no "Working well" (N1) · P0 · Phase 1

**Change**
- `src/model/needs.ts`: each `Need` carries `costMeasured: boolean` (true when `d.costs.length > 0`).
- `src/model/matrix.ts` `statusFor`: "working-well" needs either `userPriority === "no"` or a measured
  cost (`costMeasured && functionalCost <= COST_LOW`, and the strength clause likewise). A need with no
  measured cost, no "no" priority and no strategy outcome returns "still-learning", whose sheet line
  already reads "Only one thing points here so far." (`matrix.ts:266`). No new copy.

**Tests** (`src/model/matrix.test.ts`): goal only → still-learning; a "this is me" signal only →
still-learning; a confirmed interpretation only → still-learning; goal + signal → still-learning; a
measured cost of 2 → working-well (unchanged); priority "no" → working-well (unchanged); goal plus a
costly run → needs-support. Re-run `matrix.test.ts:129-178` and update any expectation that relied on
an unmeasured 0.

**Acceptance:** choose any goal, or tap "this is me" on any character, with nothing else answered:
the axis reads "Still learning", never "Working well".

### W3. My ADHD: the map then and now (7.01, N5, N14) · P0 · Phase 2 (first item)

**Model** (`src/model/store.ts`, `src/model/matrix.ts`)
- `snapshots: Array<{ on: string; statuses: Record<Aspect, CellStatus>; rungs: Record<Aspect, Rung>; approx?: true }>`
  in `adhdme.model.v1`. `on` is the **local** date (`YYYY-MM-DD` from the device's own calendar, not
  UTC; fixes N14 for this field). Statuses are the words the screen shows; rungs are the reach. No
  numbers.
- Add `snapshots` to `readStoredModel`'s field list (`store.ts:170-195`), validated item by item.
  Without it every `updateModel` erases them.
- One pure function, `nextSnapshots(prev, now, today)`:
  1. If `prev` is empty, return `[now]` (this is day one).
  2. If `now` equals the latest snapshot, return `prev`.
  3. If the latest snapshot is from `today` and is **not** index 0, replace it; otherwise append.
     Index 0 is never replaced, so day one cannot absorb later answers (N5).
  4. Keep at most 36; when over, drop index 1 (never index 0).
- **Where it runs:** one guarded effect in `app/my-adhd.tsx` after the record and the Lives profile
  have loaded. It computes `now` with `axes(record)` and writes only when `nextSnapshots` returns a
  different array. The write fires `adhdme:personalisation`, the hub re-reads, `now` equals the latest,
  nothing is written again: no loop. "Then" therefore means "what this map looked like the last time
  you opened it on a different day", which is the honest reading of a device-only record.
- **Migration:** a record with `onboarding.completedAt` and no snapshots gets one snapshot dated from
  `completedAt`, built by today's `dayOneRecord()`, flagged `approx: true`. Then `dayOneRecord()` is
  deleted.

**UI** (`app/my-adhd.tsx`, `app/my-adhd-radar.tsx`, `app/styles/map.css`)
- Keep PR #36's dashed outline and name it. Under the radar, a pill with the dash swatch:
  - only day one differs from now: **"Day one"** (2), static;
  - a snapshot at least 28 days old also exists: a two-option control **"Day one" | "August"** (3),
    default the month. The month is the latest snapshot at least 28 days old, named in en-AU. Older
    than 11 months: "August last year" (3 words, 4 in the pill). Older than two years: "Two years ago".
    Never a digit.
  - nothing to compare: no pill, no outline.
- The drawing's text alternative, per axis that differs (`sr-only`, §3 rule 9), in the screen's own
  words: "Starting: Still learning in August, Needs support now."
- No arrows, deltas, colours for up or down, or "improved".

**Budget** (`model-learning`, measured 60 today; the words are listed in §9)

| Change | Words |
| --- | --- |
| Phase 1 (W5): "See it in the module" removed, the step card becomes the link | −5 |
| Phase 1 (W5): "Saved on this device." | +4 |
| Practitioner card moves into the axis sheet's "Who helps here" (D11) | −4 |
| Contributors show the top one; the rest move to the axis sheet (`{#layout.five-then-rest}`) | −3 |
| Compare pill, worst case | +4 |
| "How it fills in" (W4) | +4 |
| **Result** | **60** |

The strength line and the friction sentence are untouched (`MAP-PRD`:469: "the cut is the strengths
line to one chip, never the sentence"; "right now" stays: it makes the friction a state, not a trait).
If D11 is refused, the fallback is MAP-PRD's own cut: the strengths line to one chip.

The friction sentence differs by lead aspect (7 to 10 words; emotional regulation is 10). Add one
measured hub state per lead aspect to `text-budget-lib.mjs`, not only `starting`.

**Tests:** unit: `nextSnapshots` (first write, unchanged, same-day replace, index 0 kept on day one,
cap, local date across the UTC boundary); migration. e2e with `page.clock` fixed: two snapshots 40
days apart → two options, switching moves `.map-then` points, no digit on `main`; none → no pill.
New text-budget state `model-compare` with a fixed clock.

**Acceptance:** a person who used the app a month ago sees the shape they had then under the shape
they have now, and which month "then" is, without reading a sentence.

### W4. My ADHD: say what fills the map; redo the start (7.02, 7.03, N6, D12) · P1 · Phase 2

**What fills each axis** (traced, `needs.ts:148-287`, `matrix.ts:295-303`):
1. The ten Start questions: the "improve first" answer names one need and its cost; the "what makes
   it easier" answers touch Environment, People and Body.
2. A short check-in on a part (topic surveys).
3. The 20 game runs, where the person rates how much a scene costs them.
4. Characters the person says are like them ("This is me", "Sometimes", on `/lives/characters` and the
   Chaos Run results).
5. Goals chosen in Learn. After W2, 4 and 5 alone only ever make an axis "Still learning".
Scores never reach the map.

**Change**
- Start card, before onboarding: "Two minutes so this can be about you." (8) → **"Ten quick questions
  start this map."** (6) + "Start". This is the explanation before the chart that 7.03 asks for,
  in the one line the card already has. "Start" not "fill in": after the questions one axis gets a
  real word and a few may move to "Still learning".
- A labelled button beside the radar, **"How it fills in"** (4), opens a sheet (D12):

  > **How it fills in.** (4)
  > Your ten starting questions (4), with **"Answer again"** (2) once they are done
  > A short check on any part (6)
  > What you rate in the games (6)
  > Characters you say are like you (6)
  > Scores never change your map. (5)

  About 33 words; new measured state `fills-open`.
- Axis sheet: one line naming where this axis came from, built from the need's sources:
  **"From your first answers and one game."** (≤7). Words per source: onboarding → "your first
  answers"; survey → "a check-in"; run → "a game"; Lives signal → "a character"; goal → "a goal you
  chose". Counts in words ("one game", "two games"), because the sheet carries no digits.
- **Answer again** keeps the old answers until the new set is complete: new answers write to a
  `onboardingDraft`; completing swaps it in; leaving part way changes nothing on the map. Day one
  (snapshot index 0) is never rewritten; the next hub visit records a normal snapshot. The `/start`
  final screen, where revisits land, also offers "Answer again".
- N6: link `/my-adhd/history` as the last row of an axis sheet when the person has tried something on
  that axis ("What you tried", 3). Otherwise delete the route.

**Budget:** `sheet-open` 38 today → +6 (strength line, W3) +4 (practitioner, D11) +3 (contributors)
+7 (source line) +3 (What you tried) = **61**. Over by one in the worst case: the source line drops
its verb pair to "From your first answers." when "What you tried" shows (−3) → 58. Measure.

**Tests:** e2e: card copy; the sheet opens from a labelled 44px control; "Answer again" then leaving
part way leaves `onboarding` unchanged; completing replaces it and keeps `snapshots[0]`; the source
line for a seeded record. Unit: sources → words. Update `e2e/my-adhd.spec.ts:35-48`.

**Acceptance:** a first-time person can answer from the screen alone "what builds this" and "how do I
change my answers"; nobody loses their old answers by starting again.

### W5. Where progress lives: disclose, back up, one delete (5.04, N4, N9, D3, D7) · P0 · Phase 1

**Disclose where the record is shown and where answers are given**
- My ADHD hub: **"Saved on this device."** (4), a quiet line under the radar, always shown once the
  record holds anything. Paid for by removing "See it in the module" (5): the proposed step card
  becomes the link itself (same target, 44px+). `model-learning`: 60 − 5 + 4 = **59**.
- `/start` welcome: **"Answers stay on this device."** (5). `/start` 17 → 22.
- Learn keeps "Reset learning progress on this device" until W7 rebuilds the games pane, where the
  disclosure moves to the page foot (W7 ledger).

**Back up with no server** (Settings → Your data)
- **"Save a copy"** (3): downloads `adhdme-backup-YYYY-MM-DD.json`:
  `{ schema: 1, savedOn, model, lives, learn, played }` from `adhdme.model.v1`, `adhdme.lives.v1`,
  `adhdme.learn.v1`, `adhdme.played.v1` (once W7 exists). Before the first save, one sentence: **"This
  file holds your answers. Keep it somewhere private."** (8).
- **"Restore a copy"** (3): always rendered, including on a fresh browser. Reads the file, validates it
  field by field with real checks (the current reader is shallow casts, `store.ts:170-195`; add
  explicit validators per field; reject unknown `schema`), asks once **"Replace what is on this
  device?"** (6), then writes. A bad file gets a plain sentence with a way out: **"That file isn't a
  copy from here. Nothing changed."** (8).
- `/privacy`: describe the My ADHD record, the backup file, and that a saved file is outside what
  "Delete" can reach (`record-classes.ts:391`: "an export leaves the product, so erasure can never
  reach it").

**One delete** (`app/app-settings.tsx`)
- The row shows when any data key below holds anything (not only `hasSignals` on the model).
- It clears: localStorage `adhdme.model.v1`, `adhdme.lives.v1`, `adhdme.learn.v1`,
  `adhdme.learn.cursor.v1`, `adhdme.learn.pane.v1`, `adhdme.played.v1`, `adhdme.filters.v*`; and
  sessionStorage `adhdme.finder.v*`, `adhdme.match.v1`, `adhdme.match.view.v1` (typed health words).
  It keeps preferences that hold no answers (`adhdme.sound`, `adhdme.lives.{relaxed,large,
  reduced-flashing,reduced-sensory,haptics}`, `adhdme.play.*`, `adhdme.lives.tutored`) and the consent
  choice, and says so in the test.
- The Lives lab reset (`app/lives/lab.tsx:89`) calls the same delete, so there is one scope.

**Tests:** e2e: save → delete → restore restores the map, goals and snapshots; a malformed file is
refused with the sentence; Delete leaves none of the listed keys and keeps the listed preferences;
Restore renders on a fresh browser; the Delete row renders with only Lives data. Update the Settings
tests (`e2e/my-adhd.spec.ts:139-150`).

**Acceptance:** a person can move their whole record to a new browser with two taps and a file; the
screen that shows their record says where it lives; one delete removes all of it.

### W6. Support home and results (1.01 to 2.02, N3, N10)

**W6a. One serif rule (1.01, D1) · P2 · Phase 3**
- Keep `brand.css:39-42`. Add `--font-display` for question headings in onboarding
  (`app/onboarding.tsx:98`), topic surveys (`app/topic-survey.tsx:85`), W8's goals question, and quoted
  voices (the care map's National Wellness Institute paragraph, scenario quotes). The finder type
  screen is already serif. Statements and tab headings stay Plus Jakarta Sans.
- Delete the six dead serif rules (N10). Rewrite `{#type.serif-display}` and reconcile
  `docs/design/2026-platform/PLAN.md:102`.
- If D1 goes the other way (all sans): `brand.css:40` → `var(--font-ui)`, weight 750.
- **Tests:** `e2e/typography.spec.ts`: finder, onboarding and survey questions compute to Newsreader;
  the three tab headings to Plus Jakarta Sans.

**W6b. Examples you can see and tap (1.02, 1.03) · P1 · Phase 3**
- Is it safe to open with a box? Yes, once the box shows what goes in it: four chips under it, the
  "Urgent help" pill in the header on every screen, and the safety rules reading anything typed.
- Four chips under the box, on the box's left edge (`app-shell.spec.ts:89,229,379-382`), each ≥44px.
  A tap fills the box with a short, neutral request (never a first-person story the person did not
  tell) and moves focus to its end; the mic becomes the "Find support" arrow, as it already does when
  there is text.

| Chip | Words | Fills the box with |
| --- | --- | --- |
| Adult ADHD assessment | 3 | An adult ADHD assessment, telehealth, not rushed |
| Medication review | 2 | A review of my ADHD medication |
| A woman doctor | 3 | A woman GP for ADHD |
| Telehealth appointment | 2 | A telehealth appointment for ADHD |

- Each request must produce the informed "Matches" heading on the demo roster; if one does not, its
  wording changes until it does (tested).
- Remove "Try an example search" (−4) and the scenarios stage with its 5.5s auto-cycle
  (`scenarios-stage.tsx`; `care-finder.tsx:318-334,688-691`; `STAGES` in `src/finder/state.ts:28`,
  with a version bump of the persisted `sessionStorage` state). `/examples` keeps the long archetypes.
- **Budget:** "/" 12 − 4 + 10 = **18**.
- **Tests to migrate:** `finder-flow.spec.ts:31-32,209-210`, `matching.spec.ts:162-163`,
  `matching-verification.spec.ts:20-21`, `support/real-roster.ts:36-37`, `support/finder-stages.ts:53,141`,
  `app-shell.spec.ts:82-83`. New: each chip's request yields "Matches".

**W6c. Label the refine control; one sparkle (2.01, N3) · P1 · Phase 1**
- The clarify button shows **"Improve my matches"** (3) beside its sparkle. The visible text is the
  accessible name (WCAG 2.5.3), so the separate `aria-label` goes. Update the O244 comment.
- Delete the decorative `span.results-spark`; the heading "Matches" makes the ordering claim alone.
- **Budget:** results 56 → **59** of 72 (the button shows only when the order is not informed).
- **Tests:** `finder-flow.spec.ts:302-320`, `matching-verification.spec.ts:67-69` by role and name;
  add: visible text equals name; no `.results-spark`.

**W6d. "Start over" inside the search bar (2.02) · P1 · Phase 1**
- Move it into the search summary card, after the pencil, as a labelled text button **"Start over"**
  (2) with an arrow-counter-clockwise icon at every width; the summary text truncates to make room.
  A bare ✕ would read as "clear the text" while the action restarts the search, and would repeat the
  unlabelled-icon problem of 2.01. Delete the header copy.
- **Budget:** unchanged (the words move).
- **Tests:** `finder-filters.spec.ts:143`, `adhd-life.spec.ts:332` by role and name; add: the button
  sits inside `.results-summary`.

### W7. Learn: the games pane (3.01, 3.02, 3.03, D2, D6, D8, D9, D10) · P1 · Phase 3

**Heading and one line** (`app/(app)/approach/page.tsx:37`, `app/learn-panes.tsx`)
- h1 **"Learn about ADHD."** (4, D6). The Modules group "Understand ADHD" becomes "The basics".
- Games pane line (D8): **"Short scenes from everyday life."** (5).

**The care map as a real entry (3.03)**
- Replace the 14px pill with a full-width row above the tabs on both panes, so it is always in the
  same place: map icon, **"The care map"** (3), **"See the whole picture"** (4), arrow; ≥56px. Delete
  the hidden header icon (`approach/page.tsx:29-31`).
- It belongs on the games pane too: W9 adds the games that touch each part of life to the map's panel,
  so the map leads to games as well as modules.

**Try these first, then the rest (3.02b, 3.02c)**
- **"Try these first"** (3): three tiles, the first three not yet played from one ordered list:
  1. games that match the person's Learn goals: a run matches when one of its `targets` (subdomains)
     maps back through `LEARNING_TARGETS` to a chosen goal; a character game matches through its
     `GAME_ENTRY` key → its journey's `strategy` → that strategy's `domains`. Leo and Theo have no
     journey and match no goal;
  2. then a fixed starter order: Maya, "Same brain, five scenes", "Not just attention", Leo, then the
     rest in `INTERACTIVE_MODULES` order.
  Ties keep list order.
- **"All games"** (2): one tap opens groups, each a list of names with a tick when played:
  "The eight lives" (the eight characters, D10) and the 20 runs grouped by the existing `SHELVES`
  (`src/learn/scenes.ts:316-323`: Understand ADHD, Work & Study, Relationships, Daily Life, Sleep &
  Body). Groups open one at a time, so the largest open state is one group of names. Measured as
  `games-all` (groups closed) and `games-all-open` (the largest group open), both ≤60, with no new
  ceiling.
- "Play mix" stays as the one primary.

**Hooks (3.02d, D9)**
- New `hint`, at most 4 words, shown only on the three "Try these first" tiles; title + hint ≤ 8
  (`BUDGET.card`). Examples: "Same brain, five scenes / Why context matters"; "Not just attention /
  Four hidden skills"; "The blank page / Why starting stalls"; Leo "Noise / A room too loud". Every
  game gets one, because any game can reach the three. The long taglines stay the tile's accessible
  description.

**Played (3.01, D2)**
- Runs: keep `adhdme.learn.v1` and add an optional `at: { [id]: "YYYY-MM-DD" }` (local date). No
  version bump: a bump would empty every tick (`progress.ts:10-11`).
- Character games: `adhdme.played.v1` `{ v: 1, at: { [CharacterId]: "YYYY-MM-DD" } }`, written when a
  game reaches its end screen. A separate key, so `e2e/leo-room.spec.ts:84,106` (the Lives profile is
  unchanged by play) still holds, and no score is stored anywhere.
- A played game shows a tick "✓" (0 words) in the "All games" list and its accessible name gains
  "played". Played games leave "Try these first". No date on screen (D2).

**Where progress is kept (W5)**
- The reset link leaves the page (Settings holds the one delete); the page foot reads **"Saved on this
  device."** (4) once anything is played.

**Budget** (`/approach`, games pane; 57 today)

| Item | Words |
| --- | --- |
| h1 | 4 |
| Care map row | 7 |
| Tabs | 2 |
| Line | 5 |
| Play mix | 2 |
| Try these first | 3 |
| 3 tiles, title + hint ≤ 8 each | ≤24 |
| All games | 2 |
| Saved on this device. | 4 |
| **Worst case** | **53** |

**Tests:** `e2e/learn-panes.spec.ts:7-13` (3 tiles, then "All games"); `e2e/game-discovery.spec.ts:8-12,
41-47` (the eight are one tap away in "All games"; hrefs from `GAME_ENTRY`); `e2e/app-shell.spec.ts:387`;
`e2e/adhd-life.spec.ts:520-529` (a finished run is a tick, never a count). Unit: every `hint` ≤4 words
and passes the patient-surface lint (`src/learn/progress.test.ts:66`); the selector (goal-matched first,
played excluded, ties stable); `at` read and written with a local date.

### W8. Learn: the modules pane (5.01, 5.02, 5.03) · P1 · Phase 3

**Goals first (5.03)**
- With no goals chosen and not skipped, the pane opens with **"What do you want help with?"** (7,
  serif per W6a), the 7 goal chips (9 words), and **"Skip"** (1). Skipping is stored as
  `goalsSkipped: true` on the Lives profile (with its sanitiser). The chips leave the page foot.
- After a choice, "For you" appears directly under the question, so the effect of a goal is seen in
  the same glance as the tap. **"Change goals"** (2) sits beside the "For you" heading.
- Signals but no goals (someone who tapped "This is me" first): "For you" shows with its reason, and
  the goals question shows above it until chosen or skipped.

**Say why (5.01, `{#honesty.claim-earned}`)**
- `recommendStrategies` already returns reasons (`recommend.ts:21-39`) but only "matches a chosen
  goal". Make each reason name its goal (`goal:attention`) and its character (`character:maya`).
- One line under "For you", from the union of the picks' reasons:
  - goals only: **"From your goals: Focus, Sleep."** (3 + one or two words per goal; three goals with
    "Getting started" and "Remembering things" is 8);
  - characters only: **"From the characters you said are like you."** (8);
  - both: **"From your goals and characters like you."** (7).
  "Sometimes" counts as "like you" (the person picked it).
- No reasons, no "For you": the pane shows "The basics" first.

**Fewer rows (5.02)**
- Default: the "Get to know ADHD" hero, For you (3 rows), **"Explore all modules"** (3). The 8 shelves,
  Two-minute tools and A quiet moment sit behind that one tap. "Your toolkit" shows as a row only when it
  holds something. The hero's "Start here" button becomes "Start" so the page has one "Start here"
  family label ("Try these first" on games).

**Budget** (`?pane=modules`, not measured today; add `modules-empty` and `modules-goals`)

| State | Words |
| --- | --- |
| No goals: h1 4, care map row 7, tabs 2, hero 6, question 7, chips 9, Skip 1 | 36 |
| Goals set: h1 4, care map row 7, tabs 2, hero 6, For you 2, Change goals 2, reason ≤8, 3 rows × 5, Explore all modules 3 | ≤49 |

**Tests:** `e2e/learn-panes.spec.ts:16-18` (reads and Two-minute tools behind Explore);
`e2e/support/learn.ts`; `e2e/adhd-lives.spec.ts:133` (For you after a "Sometimes" signal, with its
reason line). Unit (`src/lives/lives.test.ts:310-321`): reasons name their goal and character; the
reason sentence builder; `goalsSkipped` sanitised.

### W9. The care map (4.01 to 4.03, N8, N13, 3.03) · P1 · Phase 1 (labels, centre, number) and Phase 3 (layout)

**Phase 1**
- **Centre (4.01):** delete "N in the picture" and "nothing yet" (`care-map.tsx:127`). The centre reads
  "You". The ringed nodes already show what is marked; a count of needs is a number about the person.
- **Labels upright (4.02):** for Body and Environment (the bottom half), draw the label arc from the
  wedge's end to its start with sweep 0, at radius `R_OUT − 3` instead of `R_OUT − 11`. A reversed arc
  puts the glyphs on its inner side, so moving the baseline out by the cap height keeps the letters in
  the same band as the top labels.
- **No number in the panel (N13):** "you put the cost at N/10" becomes words: 0 to 3 "you said it costs
  a little", 4 to 6 "you said it costs some", 7 to 10 "you said it costs a lot".
- **Tests:** every quadrant label's first glyph has `getRotationOfChar(0)` between −90° and 90°; no
  digit in `.care-map-svg` or the panel for a seeded record; `e2e/adhd-life.spec.ts:345-356` green.

**Phase 3**
- **Size and the panel (4.03):** at ≥1024px, two columns: the wheel capped at 560px, the panel on the
  right, sticky, so a tap updates text beside the wheel. Under 1024px the wheel is `min(560px, 100%)`;
  after a tap, if the panel's top is below the viewport, scroll it into view (instant under
  `prefers-reduced-motion`). No focus move; the panel's `aria-live` announces.
- **Legible on a phone (N8):** raising the label size cannot work: 11px at 390 needs about 15 SVG units,
  "Medication" would need a disc of radius about 42, and the rings sit 46 to 54 units apart. So under
  600px the nodes become dots on the wheel and the names move into a list beside each quadrant (or the
  wheel becomes four tappable quadrants that open their list). This is a design task: two options,
  captured, chosen by the founder, then built. Acceptance: no label under 11px at 390, no overlap.
- **Games in the panel (3.03):** a node's panel lists the games whose `targets` include it, beside the
  modules it lists today, so the map leads to games too.
- **Serif echo (D1):** the National Wellness Institute paragraph in Newsreader.
- Raw hex `COLOURS` (`care-map.tsx:24-29`) → palette tokens.

**Budget:** `/approach/map` is long-form (82); the centre loses 3 or 4 words.

### W10. The module page (6.01, 6.02, N2, N12) · P2 · Phase 1

- **Room above "All modules" (6.01):** scope the fix to `.me-screen.learn-screen:has(.learn-module-bar)`
  (`platform.css:57-61`): 16px top padding under 600px, 24px above. Test: header bottom to button top
  ≥16px at 390, ≥24px at 1440.
- **Category eyebrows go (N2):** delete the eyebrow on every `explain` card ("The idea" ×20, "The word",
  "The statement", "Everyday" ×3, "What …" and the like) from the data (`src/learn/*.ts`; make
  `eyebrow` optional on `explain`), and the uppercase activity label ("TURN AN IDEA OVER",
  `learning-activities.tsx:56`; the "0 / 3 explored" count stays). Scene eyebrows that carry the story's
  time or place ("Tuesday, 8pm", "9:04am", "The night before") stay, rendered in sentence case at body
  size in the reading ink: they are content, not labels. The "Question N of 10" counters in onboarding
  and surveys stay: they are progress, not labels. Every one of the 63 strings is listed in the commit
  with its fate.
- **Contrast (6.02):** AA everywhere. No text under 14px sits on a strong lesson fill (`composition-0`);
  deleting the eyebrows removes most of it, and anything left moves to the soft fill or grows to 14px.
  Reading ink on strong fills stays at its measured 6.5 to 6.9:1. White on #ffa000 (2.04:1) is never
  used. (Revision 1's 7:1 target is infeasible: pure black on coral, lilac, forest, slate and night
  reaches only 7.1 to 7.5:1.)
- **Focus ring on load (N12):** a heading focused by script (`tabIndex=-1`) shows no ring; controls keep
  `:focus-visible`.
- **Tests:** unit: contrast over every lesson token pair (≥4.5:1 for text under 18px, ≥3:1 above); e2e:
  the spacing test; no text node under 14px on `.composition-0` at 390; `e2e/learning-play.spec.ts:23-30`
  green.

### W11. Gates that see everything (6.02, N7, N8) · P1 · built in Phase 1, extended each phase

Axe returned zero violations on every reviewed screen and could not measure 9 (Learn), 33 (care map)
and 9 (My ADHD) text nodes, because they sit on gradients or in SVG. Sampled, they pass; nothing stops
a future change from failing.

- `e2e/contrast-sampled.spec.ts`: for every route and state in `routes()`, take axe's "incomplete"
  color-contrast nodes, screenshot each box once with the text made transparent, take the median
  background, compare with the computed text colour; require ≥4.5:1 (≥3:1 large).
- Legibility: no visible patient text under 12px at 390 (SVG labels 11px; the care map is exempt until
  its Phase 3 redesign, and the exemption names that item).
- `routes()` gains the screens not swept today: `?pane=modules`, `?module=adhd`, the care map after a tap;
  each later phase adds its states (`model-compare`, `fills-open`, `games-all`, `games-all-open`,
  `modules-empty`, `modules-goals`) in the same commit that builds them.

### W12. Housekeeping · P2 · Phase 3

- N11: build `src/design/taste-register.ts` and its test as `SKILL.md` describes, since this plan edits
  `SKILL.md` (D1, and N2's reading of `{#layout.calm}`).
- Every changed screen: a before and after capture in `qa/` and an entry in `docs/DESIGN-QA.md`
  (`{#honesty.qa-capture}`).
- N15: raise each game's small labels to 12px or redraw them, one game per commit, and delete its
  line from the sweep's `LEDGER` in the same commit. The sweep logs a ledger line it no longer sees.

## 7. Order of work

Each line is one commit or a short series, with its text-budget numbers in the message and its e2e
changes in the same commit. S under half a day, M one to two days, L three to five days.

**Phase 1: safety, truth and where the record lives (about 5 days)**
1. W2 no measure, no "Working well" · S
2. W1 crisis registry, Urgent help rows, safety-rule text option, verification doc and schedule · M
3. W5 disclosure on My ADHD and `/start`, one delete, Save and Restore, privacy page · M
4. W9 phase 1: labels upright, centre subtitle and panel number removed · S
5. W10 spacing, eyebrows, small text off strong fills, focus ring · M
6. W6c and W6d: labelled refine button, one sparkle, Start over in the bar · S
7. W11 gates for the screens that exist · M

**Phase 2: progress over time (about 6 days)**
8. W3 snapshots, migration, compare pill, per-aspect hub states · L (needs D11)
9. W4 start card, fills sheet, source line, Answer again, history link · M

**Phase 3: clarity and fewer choices (about 8 days)**
10. W6a serif rule (needs D1) · S
11. W6b example chips, scenarios stage removed · M
12. W7 games pane (needs D8, D9, D10) · L
13. W8 modules pane · M
14. W9 phase 3: layout, phone design task (founder picks an option), games in the panel · L
15. W12 register and DESIGN-QA records · S

Dependencies: W2 before W3 (snapshots must not record the wrong word). W5's step-card link before W3's
ledger. W4's "Save a copy" line after W5 builds it (Phase 1 before Phase 2). W6a before W8's question.
W7 before W5's Learn disclosure moves. W11 grows with each phase.

## 8. Definition of done

- Every review note in §5 and every audit finding is shipped or carries a written founder decision.
- `node scripts/text-budget.mjs` against a fresh build: 0 screens over their ceiling, including every new
  state, with a fixed clock where a state depends on the date. Numbers in each commit.
- `pnpm typecheck`, `pnpm test`, and the touched e2e specs pass locally before each push; the full e2e
  suite passes in CI.
- Axe, sampled-contrast and legibility gates pass at 320, 390, 768 and 1440.
- Captures at 390×844 and 1440×900 of every changed screen in `qa/`; entries in `docs/DESIGN-QA.md`.
- Every crisis contact verified against its source on release day, `verifiedOn` set.
- The reviewer's walkthrough repeated on the new build, every numbered pin checked off.

## 9. Audit log

**Round 1: coverage.** Each note mapped to a workstream (§5). 7.02's "Questions" and "Recommendations"
repeat 7.01's in the PDF; 7.02 was planned from its observation (unclear value, no reset). The home
highlight is text selection.

**Round 2: the build, not the screenshot.** Three screens had moved since the review (§2). Learn games
had more choices, not fewer. The goal reproduction found N1. The modules capture showed why goals "seem
to do nothing".

**Round 3: the law.** Tooltips replaced by labels; compare built without numbers; every added line paid
for.

**Round 4: arithmetic** by hand against `qa/text-budget.json`.

**Round 5: adversarial review of revision 1.** An independent reviewer re-measured the states on a
fresh build, spot-checked 25 citations (all correct), computed every lesson colour's contrast, and
raised 29 issues. What changed:

| Issue | Revision 1 | Revision 2 |
| --- | --- | --- |
| "Working well" bug | Goals only | Any need with no measured cost: goals, "this is me", confirmed interpretations (W2) |
| Played state | Tags on tiles that, by the selection rule, were never played | Ticks in "All games"; played games leave "Try these first"; no date (W7, D2) |
| `games-all` | Claimed ≤72 | The 20 titles alone are 71 words; now grouped, one group open at a time, ≤60, no new ceiling |
| Snapshots | Not in the reader (erased on every write); same-day rule could overwrite day one; no call site | Reader field; index 0 never replaced; one guarded effect; local dates (W3) |
| Restore | Inside a row hidden on a fresh browser | Always rendered; Delete shows for any data key (W5) |
| Contrast | 7:1 house bar | AA; no small text on strong fills (W10) |
| 5.04 | Disclosure behind a sheet and on `/start`, in Phase 3 | Visible on My ADHD, on `/start`, on Learn after W7; backup in Phase 1 |
| Copy | "Games are never scored"; "tap this is me" | "Scores never change your map"; sources named as they are |
| For you reason | Overclaimed, one reason for all | Reasons name goals and characters; union line (W8) |
| Goal-matched games | Named a mapping that does not exist | Mapping specified per game type (W7) |
| Eight lives | Linked to `/lives`; roster dropped silently | `/lives/characters`; D10 |
| Learn progress | v2 key (empties every tick) | v1 plus optional `at` |
| My ADHD cuts | Moved the strength line, trimmed "right now" | Both kept (MAP-PRD:469); cuts from the module link, the practitioner card (D11), contributors |
| Care map on a phone | "Raise the label size" | Infeasible; a design task with two options |
| Dates | UTC; "last August" ambiguous | Local dates; en-AU months; "August last year" |
| Answer again | Cleared answers at once | Draft, swapped in on completion; day one kept |
| Crisis | Voice-only 000; chat as a second target in a link row; `SAFETY_RULES` numbers unverified | Relay row; chat rows as whole-row links; one registry for every number |
| Law conflicts | Asserted compliance | D8, D9, D12, D1 each put to the founder; §3 rule 9 for text alternatives |
| Order | P0 items in Phase 3; W4 before W5 | Phase 1 holds the P0 truth and storage items; Phase 2 progress; Phase 3 clarity |
| Delete scope | "Every adhdme.* key" | Keys enumerated, finder and match session text included, lab reset unified |
| Care map | Centre count only | Panel "N/10" too (N13); games in the panel answers "does it belong on games" |
| Citations | `AxisId`, 24 notes, `adhd-lives.spec.ts:133` as a goal test | `Aspect`, 21 notes in 24 rows, a "Sometimes" test |

The reviewer confirmed, and this revision keeps: N1 and its reproduction; the goals-off-screen
diagnosis; the budgets for /urgent, home, `/start`, results and the fills sheet; the label-arc geometry;
D2; no tooltips; compare as shape against shape; a backup with no server; verification outside PR CI;
the older-deploy finding.

## Appendix A. Crisis contacts, as checked on 2026-09-26

Re-verify on release day against each service's own site. The build environment could not open the
services' sites; these come from official and government search results.

| Contact | Method | Hours, audience | Source |
| --- | --- | --- | --- |
| Lifeline Text, 0477 13 11 14 | text | 24/7 | lifeline.org.au/text; health.gov.au media release "Lifeline's crisis text service goes 24/7" |
| Kids Helpline webchat | chat | 24/7, ages 5 to 25 | kidshelpline.com.au/get-help/webchat-counselling |
| Beyond Blue webchat | chat | Support service 24/7; confirm chat hours | beyondblue.org.au/get-support/talk-to-a-counsellor/chat |
| National Relay Service (000 without speaking) | relay | confirm current method | accesshub.gov.au |
| 13YARN, 13 92 76 (optional) | call | 24/7, Aboriginal and Torres Strait Islander people | 13yarn.org.au |

## Appendix B. Reproducing the audit

```
pnpm build
ADHDME_TOKEN_SECRET=test-secret ADHDME_ENABLE_DEMO=1 pnpm exec next start -p 3620
BASE=http://localhost:3620 node scripts/text-budget.mjs
```

The N1 reproduction: open `/approach?pane=modules`, open "Your goals", choose "Focus", open `/my-adhd`.
Before W2 the Focus axis reads "Working well".

The `model-learning` hub today (60 words): "My ADHD." · Share · six axis names and their words · "Starting
is your biggest friction right now." · "Activation for ambiguous tasks" · "External accountability helps"
· "Once started, work often goes well" · "Try this: the first physical action." · "Before opening email
tomorrow." · "See it in the module" · "Jane Whitlock" · "Task initiation".
