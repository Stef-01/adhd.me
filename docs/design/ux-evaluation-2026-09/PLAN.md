# UX evaluation upgrade plan (2026-09-26)

The lead UX designer's evaluation, `ADHDme.app_UX_Evaluation.pdf` (8 annotated screens, 24 notes),
turned into a build plan for this tree. Every note is traced to the code that renders it, checked
against the build as it ships today, and given a specific change, its copy, its word cost, the
tests it touches, and how we know it is done.

Read in this order: §1 what was checked, §2 what changed since the review, §3 the rules every fix
must pass, §4 the decisions only the founder can make, §5 the register of findings, §6 the
workstreams, §7 the order of work, §8 the definition of done, §9 the audit log.

## 1. Source and method

- **Review:** 8 screens (Support home, results, Learn games, care map, Learn modules, a module page,
  My ADHD, Urgent help), 24 numbered notes. Each note is quoted in short in §5.
- **Tree:** `claude/git-clone-cleanup-ijrxqo` at bde8b3c, which contains the latest `main` (87ad1dc)
  plus PR #36. Where PR #36 changes a reviewed screen, §2 says so.
- **Code audit:** three read-only traces (Support and Urgent help; Learn, care map and module page;
  My ADHD and the data model), each finding pinned to file and line.
- **Build audit:** a production build served locally and captured at 390×844 and 1440×900 on every
  reviewed screen, plus one reproduction: choose the goal "Focus" in Learn, then open My ADHD.
- **Accessibility audit:** axe (WCAG 2.0 A to 2.2 AA, the repo's own tag set) on every reviewed
  screen at both widths, then a manual read of every node axe could not measure.
- **Law audit:** `CLAUDE.md`, `.claude/skills/adhdme-taste/SKILL.md`,
  `docs/design/text-budget-postmortem.md`, `docs/adhd-life/MAP-PRD.md`, `docs/adhd-life/PLAN.md`,
  `docs/adr/0008-accounts-and-sync.md`, the compliance registers in `src/compliance/`.
- **Word counts:** from `qa/text-budget.json` (measured 2026-09-24). Every proposed string below
  carries its word count so the budget arithmetic can be checked by hand before it is measured.

## 2. What the review saw against what ships now

The review was taken on an older deploy. Three screens have already moved. The notes still apply,
but the fix has to be written against the current screen.

| Screen | What the review shows | What ships at bde8b3c |
| --- | --- | --- |
| Learn games | A hero with eight faces and Play, a Leo tile, a Theo tile, then 8 tiles | a8ac430 replaced the hero and the two tiles with "Play mix", "The eight lives →" and an 8-name roster, then 8 tiles, then "All 20 games". 16 things to choose from before scrolling. |
| Care map | A legend and a "Four layers, one life." panel | 4886eb3 removed both. The default panel is "Tap a part of life." with the National Wellness Institute paragraph. |
| My ADHD | A coral shape | PR #36 (branch only) turns the shape sage and draws a dashed "day one" outline under it once anything has moved. No caption, because two words did not fit the 60-word ceiling. |
| Home | "are you looking for?" highlighted in yellow | Nothing in the code highlights part of the heading. `::selection` is brand yellow (`app/styles/brand.css:82`), so the screenshot shows selected text. Not a finding. |

## 3. The rules every fix must pass

The review asks, in several places, for more words: a line under a heading, a subtitle on every
tile, a blurb beside a link. This product has a hard law against words, written after a failure
(`docs/design/text-budget-postmortem.md`). The plan does both, and it does it this way:

1. **Every screen stays at or under 60 words, 40 the target** (`CLAUDE.md`,
   `scripts/text-budget-lib.mjs:44`; the results list has its own ceiling of 72, `:159`). Every
   addition below names the cut that pays for it. Numbers go in the commit message.
2. **Delete, do not hide.** A "show more" is allowed only as `{#layout.five-then-rest}`: a
   chooseable few, the rest one tap away. Text is never moved behind a toggle to pass the count.
3. **A heading, at most one line under it, and the control** (`{#layout.calm}`). So the one-line
   explanations the review asks for are allowed, and exactly one per screen. No eyebrows, no
   kickers. Labels a screen genuinely needs live behind an explicit, labelled ask.
4. **No tooltips.** Declined in `AESTHETIC.md:768` ("a tooltip helps the one device this product is
   least used on"). Where the review says "label or tooltip", this plan labels.
5. **No score of a person.** My ADHD never shows a number about the person, never red, never
   "better" or "worse" (`MAP-PRD` §2 and §7, `src/wellness/map.ts:3-9`,
   `e2e/my-adhd.spec.ts:57` asserts no digit on the hub). Compliance bans health-outcome promises
   (`src/compliance/landing.ts`). So "compare over time" is built as a shape against a shape, named
   by month, with no delta, no percentage and no verdict.
6. **Games are not scored.** `src/model/learning-evidence.ts` ("Scores, speed, mistakes and
   completion cannot create a need"), `docs/design/leo-room-implementation-qa.md:22`. The review
   assumes games are the benchmark that gets compared over time. They are not, and §6 W4 makes the
   screen say what is.
7. **Nothing leaves the device** until the founder decides otherwise (ADR 0008 is proposed, not
   built; off-device storage brings in Australian Privacy Principles 11 to 13).
8. **Patient copy rules** (`src/compliance/public-surfaces.ts`): no "specialist", no diagnosis or
   treatment claims, no testimonials. Every new string is checked by the existing patient-surface
   lints.

## 4. Decisions for the founder

The plan proceeds on the recommendation in each row unless the founder overrules it. None of them
blocks Phase 1.

| # | Question | Recommendation | Why |
| --- | --- | --- | --- |
| D1 | The serif headline on Support home (review 1.01): intentional or stray? | **Intentional; make it a system.** Newsreader is the voice of a question asked of the person, and of a quoted voice. Apply it to every such question and quote; everything else stays sans. | The warm-brand board reserves Newsreader for "questions asked of the patient" (`docs/design/warm-brand/USER-BRAND-BOARD.txt:342`). The rule was applied to one screen only, so it read as a stray. The alternative, all sans, is a one-line change (§6 W6a). |
| D2 | Are games a measurement to compare over time (review 3.01)? | **No.** Record that a game was played and when. Never a result. | Rule 6 in §3. A timed game is not a valid measure of ADHD and a score invites exactly the comparison this product refuses. |
| D3 | Progress kept on device only (review 5.04) | **Now:** say so where answers are given, and add "Save a copy" and "Restore" to Settings. **Later:** ADR 0008 option 2 (sync by recovery code, no identity) as its own project. | Honest today with no new privacy surface. Sync is a founder act (ADR 0008:77). |
| D4 | Which non-voice crisis options (review 8.01)? | Add Lifeline Text 0477 13 11 14, Kids Helpline webchat, Beyond Blue webchat. Consider 13YARN (13 92 76) and the National Relay Service / 106 for people who cannot speak. | All listed as 24/7 on official or government sources as of 2026-09-26 (Appendix A). Each is re-verified at build time. |
| D5 | What "compare" means on My ADHD (review 7.01) | The dashed outline is a past shape, named by month ("Day one", "August"). No numbers, no arrows, no better or worse. | Rule 5 in §3, and the founder's own note that the "baseline vs now subtle separation" is the part worth keeping. |
| D6 | Rename the Learn heading (review 3.02) | "Learn about ADHD." | The reviewer did not know what "A little more understanding." referred to. |
| D7 | Should Settings → Delete also delete the Lives profile? | **Yes.** | It says "Deleted from this browser." today while `adhdme.lives.v1` survives and keeps feeding the map (N4). |

## 5. Findings register

Priority: **P0** safety, wrong information, or the product's stated purpose; **P1** clarity and
overload; **P2** polish. "Status" is what the build audit found at bde8b3c.

| ID | Screen | Review note (short) | Status | P | Where it is fixed |
| --- | --- | --- | --- | --- | --- |
| 1.01 | Home | Serif headline unlike other screens | Confirmed. `welcome-stage.tsx:78`, `brand.css:39-42` wins over `brand.css:38` | P2 | W6a |
| 1.02 | Home | One empty box, the only example is placeholder text | Confirmed. Placeholder at `welcome-stage.tsx:114` and `type-stage.tsx:74` | P1 | W6b |
| 1.03 | Home | "Try an example search" easy to miss | Confirmed. It opens a separate auto-cycling carousel (`scenarios-stage.tsx`), it does not fill the box | P1 | W6b |
| 2.01 | Results | Unlabelled sparkle | Confirmed. `button.clarify-star` "Improve my matches" (`results-stage.tsx:363-374`), unlabelled on purpose (comment O244). A second, non-interactive sparkle means something else (`:348-352`) | P1 | W6c |
| 2.02 | Results | "Start over" far from the search bar | Confirmed. `results-stage.tsx:171`, header row, 0.75rem muted | P1 | W6d |
| 3.01 | Learn games | No played/completion state | Partly. The 20 runs show "Done" (no date). The 8 character games record nothing | P1 | W7 |
| 3.02a | Learn games | "A little more understanding." is unclear | Confirmed. `app/(app)/approach/page.tsx:37` | P1 | W7 |
| 3.02b | Learn games | Why are the top ones different, do I do them all | Changed: now 8 roster names + 8 tiles, still unexplained | P1 | W7 |
| 3.02c | Learn games | Too many choices | Worse than reviewed: 16 choices above "All 20 games" | P1 | W7 |
| 3.02d | Learn games | Titles are a guessing game | Confirmed. Taglines exist but are `sr-only` (`learn-panes.tsx:231-233`) and 4 to 10 words long | P1 | W7 |
| 3.03 | Learn | "The care map" link too small | Confirmed. `page.tsx:40-43`, 14px pill, shown on both panes | P1 | W7 |
| 4.01 | Care map | "You / 1 in the picture" cryptic | Confirmed. `care-map.tsx:127`, the count of derived needs | P1 | W9 |
| 4.02 | Care map | Body and Environment labels upside down | Confirmed. `care-map.tsx:110-121`, clockwise arc across the bottom | P1 | W9 |
| 4.03 | Care map | Wheel too big, panel updates out of view | Confirmed. About 1000px square at 1440 (`life.css:177-178`), panel below, no scroll | P1 | W9 |
| 5.01 | Modules | Why these three "For you" | Confirmed. Computed from Lives goals and signals (`learn-panes.tsx:316-333`), reason never shown | P1 | W8 |
| 5.02 | Modules | About 13 rows, overload | Confirmed. For you, 8 groups, Toolkit, A quiet moment, goals | P1 | W8 |
| 5.03 | Modules | Goals CTA subtle, seems to do nothing | Confirmed, and explained: the goal does change "For you", but the chips sit at the bottom so the change happens off screen | P1 | W8 |
| 5.04 | Modules | Progress on this device only | Confirmed. localStorage only, no backup, no disclosure where answers are given | P0 | W5 |
| 6.01 | Module page | "All modules" pressed against the top | Confirmed. `platform.css:57-61` zeroes the top padding | P2 | W10 |
| 6.02 | Module page | Contrast may fail WCAG | Axe clean; smallest text on the orange card is 4.65:1, just over 4.5 (`learning-play.css:30-51`). Axe could not measure 9 to 33 nodes per Learn and map screen | P1 | W10, W11 |
| 7.01 | My ADHD | No way to compare with a past result | Confirmed. Nothing stores the map over time. PR #36's "day one" outline is reconstructed, not stored, and unlabelled | P0 | W3 |
| 7.02 | My ADHD | Start CTA unclear, cannot redo | Confirmed. No redo anywhere; revisiting `/start` jumps to the end (`onboarding.tsx:34-36`) | P1 | W4 |
| 7.03 | My ADHD | How are the six dimensions filled in | Confirmed. Never said on screen. Sources traced in W4 | P1 | W4 |
| 8.01 | Urgent help | No text or chat option | Confirmed. `src/model/safety.ts:161-166`, voice only, no verification date | P0 | W1 |

Found by the audit, not in the review:

| ID | Finding | Evidence | P | Fixed in |
| --- | --- | --- | --- | --- |
| N1 | **Choosing a goal marks that axis "Working well".** A goal is something the person wants help with; the map says the opposite. | Reproduced: goal "Focus" → My ADHD shows "Focus / Working well" before any question. `learning-evidence.ts:55-56` adds a source with no cost, `needs.ts:246` adds priority "yes", `matrix.ts:220` maps cost 0 to "working-well". | P0 | W2 |
| N2 | Eyebrows on the module page ("THE WORD", "TURN AN IDEA OVER") | Forbidden by `{#layout.calm}`. They are also the lowest-contrast text on the card. | P1 | W10 |
| N3 | Two identical sparkles with different meanings on results | `results-stage.tsx:348-352` vs `:363-374` | P1 | W6c |
| N4 | Settings → Delete leaves the Lives profile | `app-settings.tsx:88-131` clears three keys, not `adhdme.lives.v1`, which still feeds the axes | P1 | W5 |
| N5 | "Day one" is a reconstruction that includes later answers | `app/my-adhd.tsx:199-201` rebuilds it from current resonance | P1 | W3 |
| N6 | `/my-adhd/history` has no link from anywhere | Only reachable by URL | P2 | W4 |
| N7 | The contrast gate passes what it cannot see | Axe "incomplete" on SVG and gradient text is not a failure, so SVG labels and tile text are never checked | P1 | W11 |
| N8 | Care-map labels render at about 6 to 7px on a phone | 8.75 SVG units at 0.7 scale (`care-map.tsx`, `life.css:177`) | P1 | W9 |
| N9 | Resets are scattered and each clears a different set of keys | Learn reset, Lives lab reset, Settings delete (three different scopes) | P2 | W5 |
| N10 | Dead serif rules that never apply | `globals.css:10125`, `platform.css:145`, `match.css:4`, `globals.css:2037`, `:9921`, `:9803` lose to `brand.css:38` | P2 | W6a |
| N11 | `SKILL.md` cites `src/design/taste-register.ts` and its test; neither file exists | `ls src/design` is empty | P2 | W12 |
| N12 | A visible focus ring sits on the module heading on load | Programmatic focus on a `tabIndex=-1` heading (`learn-modules.tsx:68`) | P2 | W10 |

## 6. Workstreams

Each workstream lists: the change, exact copy with word counts, data, the budget ledger, the tests
to change or add, and acceptance. File paths are where the change lands.

### W1. Urgent help: a way to reach someone without speaking (8.01) · P0

**Change**
- `src/model/safety.ts`: extend `UrgentService` with `kind: "call" | "text" | "chat"`, `href`
  (`tel:`, `sms:` or `https:`), and `verifiedOn` (ISO date). `URGENT_SERVICES` becomes:

| Row | Said | When | Action |
| --- | --- | --- | --- |
| Emergency | 000 | In danger now | call |
| Lifeline | 13 11 14 | Any hour | call |
| Lifeline Text | 0477 13 11 14 | Any hour | text (`sms:0477131114`) |
| Kids Helpline | 1800 55 1800 · Chat | Up to 25 | call, chat |
| Beyond Blue | 1300 22 4636 · Chat | Any hour | call, chat |

- `app/(app)/urgent/page.tsx`: the text row uses a message icon, not the phone icon. The two "Chat"
  links are second targets on their rows, each ≥44px, opening the service's own chat page.
- Footer: "Free, any hour, from any phone." is no longer true of every row, and must be verified
  even for the calls (a 1300 number is not always free). Replace with **"Free to call."** (3 words)
  only if every call row is verified free; otherwise delete the footer.
- `SAFETY_RULES` messages that name Lifeline 13 11 14 add "or text 0477 13 11 14" (5 words), so the
  in-flow safety dialog offers the same non-voice option.
- D4 optional rows: 13YARN, and the National Relay Service for 000 without speaking. Add only after
  verification.
- **Verification process:** a `verifiedOn` date on every row; `docs/ops/urgent-services.md` lists
  each service's official source URL and the check steps; a scheduled monthly GitHub workflow (not
  PR CI, so an old date never breaks an unrelated PR) opens an issue when any `verifiedOn` is older
  than 90 days.

**Budget:** /urgent 37 → +8 (Lifeline Text row) +2 ("Chat" ×2) −6 (old footer) +3 (new footer) = 44.
Target band. Measure.

**Tests:** new unit test: every row's `href` scheme matches its `kind`; at least one row is not a
call; every row has `verifiedOn`. New `e2e/urgent.spec.ts`: an `a[href^="sms:"]` is present, all
targets ≥44px, no horizontal scroll at 320. Update `src/model/model.test.ts:144` if its regex must
accept the text number. `e2e/controls.spec.ts:58` already walks the route.

**Acceptance:** a person who cannot call reaches Lifeline Text in one tap from any screen (header
pill → row). Every number matches its official source on the day of release.

### W2. My ADHD tells the truth about goals (N1) · P0

**Change**
- `src/model/needs.ts:242-247`: a `goal:` source does not count toward confidence. A need whose only
  sources are chosen goals gets confidence `low`, so `statusFor` (`matrix.ts:218`) returns
  "Still learning", the existing word for "something points here, nothing is known yet".
- `matrix.ts:266` already says "Only one thing points here so far." for that state in the axis
  sheet, so no new copy.

**Tests:** `src/model/matrix.test.ts`: "a chosen goal alone never yields working-well"; "a goal plus
a costly module run still reaches needs-support". Update the Focus expectation wherever an e2e
seeds a goal (`e2e/adhd-lives.spec.ts:133` area).

**Acceptance:** choose any of the 7 goals with nothing else answered: My ADHD shows that axis as
"Still learning", never "Working well".

### W3. My ADHD: see the map then and now (7.01, N5) · P0

**Model** (`src/model/store.ts`, `src/model/types`)
- Add `snapshots: Array<{ on: string /* YYYY-MM-DD */; rungs: Record<AxisId, Rung>; approx?: true }>`
  to `adhdme.model.v1`. Rungs are the existing words (`unmapped`, `named`, `explored`, `kept`,
  `working`), not numbers, so a snapshot is a picture of reach, never a score.
- Write rule, as a pure function `nextSnapshots(prev, rungs, today)`:
  1. `completeOnboarding` writes the first snapshot ("day one").
  2. Whenever the current rungs differ from the latest snapshot, write one for today; a second
     change on the same day replaces today's.
  3. Keep at most 36; when over, drop the oldest after the first (day one is never dropped).
- Migration: an existing record with `onboarding.completedAt` and no snapshots gets one snapshot
  dated `completedAt`, built by today's `dayOneRecord()` and flagged `approx: true`. Remove
  `dayOneRecord()` after migration so day one stops absorbing later answers (N5).

**UI** (`app/my-adhd.tsx`, `app/my-adhd-radar.tsx`, `app/styles/map.css`)
- Keep PR #36's dashed outline: it is the "baseline vs now" separation the founder asked to keep.
  Name it. Under the radar, a small pill with the dash swatch and the name of what it shows:
  - one snapshot differs from now: **"Day one"** (2 words), static;
  - a snapshot at least 28 days old also exists: a two-option control, **"Day one" | "August"**
    (3 words), default the month. The month is the latest snapshot at least 28 days old. Month
    names only, never dates, because the hub carries no digits (`e2e/my-adhd.spec.ts:57`). A
    snapshot from the same month last year reads "Last August".
  - Nothing to compare: no pill, no outline.
- Screen readers get the comparison in words, per axis that moved: "Starting: explored now, named in
  August." (`sr-only`; this is the accessible equivalent of the drawing, not hidden copy).
- No arrows, no deltas, no colour for up or down, no "improved".

**Budget** (the busiest hub state, `model-learning`, is at 60 now)

| Change | Words |
| --- | --- |
| Move the strength line "Once started, work often goes well" from the hub into its axis sheet (`src/learn/interactive.ts:167` renders on the hub today) | −6 |
| "Starting is your biggest friction right now." → "Starting is your biggest friction." (`matrix.ts:465` and its siblings) | −2 |
| Compare pill, worst case "Day one" + month | +3 |
| "How this fills in" (W4) | +4 |
| **Result** | **59** |

`sheet-open` goes from 38 to 44 with the strength line. Measure both.

**Tests:** unit: `nextSnapshots` (first write, same-day replace, cap, day one kept, no write when
unchanged); migration from a record with `completedAt`. e2e (`e2e/my-adhd.spec.ts`): seed two
snapshots 40 days apart → the control shows two options, switching changes the outline
(`.map-then` points), no digit anywhere on `main`; seed none → no pill. Add a text-budget state
`my-adhd` / `model-compare` to `scripts/text-budget-lib.mjs` `routes()` and `reach()`.

**Acceptance:** a person who used the app a month ago opens My ADHD and sees, without reading a
sentence, the shape they had then under the shape they have now, and which month "then" is.

### W4. My ADHD: say what fills the map, and let people redo the start (7.02, 7.03, N6) · P1

**What actually fills each axis** (traced, `src/model/needs.ts:148-287`, `matrix.ts:295-303`):
1. The ten Start questions. The "improve first" answer names one need and its cost; "what makes it
   easier" answers touch Environment, People and Body contributors.
2. A short check-in on a part (topic surveys, `app/topic-survey.tsx`).
3. Games and module runs where the person says how much something costs them, or taps "this is me".
4. Goals chosen in Learn (after W2, these only ever make an axis "Still learning").
Games are never scored: speed and mistakes change nothing.

**Change**
- Start card, before onboarding: "Two minutes so this can be about you." (8) → **"Ten quick
  questions start this map."** (6) + "Start". Honest: after the questions, one axis gets a real
  word and a few more may move to "Still learning"; "fill in" would overclaim.
- A labelled explicit ask beside the radar, **"How this fills in"** (4), opens a sheet:

  > **How this fills in.** (4)
  > The ten starting questions (4) · with **"Answer again"** (2) once complete
  > A short check on any part (6)
  > Games where you tap “this is me” (7)
  > Goals you pick in Learn (5)
  > Games are never scored. (4)
  > It stays on this device. Save a copy in Settings. (10)

  About 42 words; measured as a new state `my-adhd` / `fills-open`.
- Axis sheet (`app/my-adhd-sheet.tsx`): one line naming where this axis came from, built from the
  need's sources: **"From your first answers and one game."** (up to 7). Source words: `onboarding`
  → "your first answers"; survey → "a check-in"; module run or Lives signal → "a game"; goal → "a goal
  you chose". Counts as words ("one game", "two games"), because the sheet carries no digits either.
- **Redo:** "Answer again" (in the sheet above, and on the `/start` final screen that revisits land
  on) clears `record.onboarding` and restarts `/start`. It keeps `snapshots`, so day one stays in the
  history rather than being overwritten.
- N6: link `/my-adhd/history` as the last row of an axis sheet when the person has tried something on
  that axis ("What you tried", 3). Otherwise delete the route.

**Tests:** e2e: the card copy; the fills sheet opens from a 44px labelled control; "Answer again"
clears onboarding and keeps snapshots (read `localStorage`); axis sheet source line for a seeded
record. Unit: the sources-to-words function. Update `e2e/my-adhd.spec.ts:35-48` (Start card copy).

**Acceptance:** a first-time person can answer, from the screen alone, "what do I do to build this"
and "how do I change my answers".

### W5. Where progress lives, and one honest reset (5.04, N4, N9) · P0

**Change**
- **Disclosure where answers are given:** `/start` welcome adds **"Answers stay on this device."**
  (5; `/start` 17 → 22). The W4 fills sheet carries the same fact. Settings keeps "Lives in this
  browser only."
- **Backup, no server:** Settings → Your data gains **"Save a copy"** (3) and **"Restore a copy"**
  (3). Save downloads `adhdme-backup-YYYY-MM-DD.json` with `{ schema: 1, savedOn, model, lives,
  learn, played }` (the keys `adhdme.model.v1`, `adhdme.lives.v1`, `adhdme.learn.v1`,
  `adhdme.played.v1`). Restore reads a chosen file, validates it through the existing sanitisers
  (`sanitisePlan` and siblings; reject unknown `schema`), asks once ("Replace what is on this
  device?"), then writes. A bad file gets a plain sentence with a way out (`{#interaction.errors-plain}`).
  The file never leaves the device unless the person moves it. Update `/privacy` to describe the
  My ADHD record and the backup file.
- **One reset:** Settings → Delete clears every `adhdme.*` data key, including `adhdme.lives.v1`,
  `adhdme.played.v1` and snapshots (D7). Remove "Reset learning progress on this device" from the
  Learn page (it also pays for W7's words); the Lives lab keeps its developer-facing reset.
- **Later (D3):** ADR 0008 option 2, sync by recovery code, as its own project.

**Tests:** e2e: save → delete → restore round-trip restores the map and snapshots; a malformed file
is refused with the plain sentence; Delete leaves no `adhdme.` data key (flags such as sound may
stay, list them). Update `finder-filters.spec.ts:133-149` only if filters are included (they are
not: place is a preference, not progress). Update `e2e/app-shell.spec.ts:403-404` (Learn reset).

**Acceptance:** a person can move their whole record to a new browser with two taps and a file, and
nothing on screen implies an account.

### W6. Support home and results (1.01 to 2.02, N3, N10) · P1

**W6a. One serif system (1.01, D1)**
- Recommended (serif as the question voice): keep `brand.css:39-42`; add the same `--font-display`
  rule for question headings in onboarding (`app/onboarding.tsx:98`) and topic surveys
  (`app/topic-survey.tsx:85`), the finder type screen (already serif), W8's goals question, and
  quoted voices (the care map's National Wellness Institute paragraph, scenario quotes). Statements
  and tab headings stay Plus Jakarta Sans.
- Delete the six dead serif rules (N10) so the stylesheet says what renders.
- Update `{#type.serif-display}` in `SKILL.md` to "Serif (`Newsreader`) for a question asked of the
  person and for a quoted voice; the sans carries statements, controls and body", and reconcile
  `docs/design/2026-platform/PLAN.md:102`.
- If the founder chooses all sans instead: change `brand.css:40` to `var(--font-ui)`, weight 750,
  and stop there.
- **Tests:** `e2e/typography.spec.ts`: the finder, onboarding and survey question headings compute
  to Newsreader; the three tab headings compute to Plus Jakarta Sans.

**W6b. Examples you can see and tap (1.02, 1.03)**
- Under the box, four chips that share the box's left edge (`app-shell.spec.ts:89,229,379-382`),
  each ≥44px. A tap fills the box with a full request and moves focus to the end of it; the mic turns
  into the "Find support" arrow as it already does when there is text. The person can edit before
  searching, and learns the shape of a good request.

| Chip | Words | Fills the box with |
| --- | --- | --- |
| Adult ADHD assessment | 3 | "An adult ADHD assessment, telehealth, not rushed" |
| Medication review | 2 | the `titration-and-review` archetype request |
| A woman doctor | 3 | the `woman-gp` archetype request |
| Telehealth appointment | 2 | a telehealth request the roster answers with "Matches" |

- Remove "Try an example search" (−4) and the scenarios stage with its 5.5s auto-cycle
  (`app/finder-stages/scenarios-stage.tsx`, `care-finder.tsx:318-334,688-691`). `/examples` keeps
  the long archetypes.
- **Budget:** "/" 12 − 4 + 10 = 18. Target.
- **Tests to migrate** (they click the link or "Search with this"): `finder-flow.spec.ts:31-32,209-210`,
  `matching.spec.ts:162-163`, `matching-verification.spec.ts:20-21`, `support/real-roster.ts:36-37`,
  `support/finder-stages.ts:53`, `app-shell.spec.ts:82-83` (last control above the tab bar becomes
  the last chip). New: each chip's request yields the informed "Matches" heading, not "All listed
  providers".

**W6c. Label the refine control; one sparkle, one meaning (2.01, N3)**
- The clarify button shows its label: sparkle icon + **"Improve my matches"** (3). Visible text
  equals the accessible name (WCAG 2.5.3), so drop the separate `aria-label`. Update the O244 comment.
- Delete the non-interactive `span.results-spark` (`:348-352`); the heading "Matches" already makes
  the ordering claim, and one glyph should not mean two things.
- **Budget:** results 56 → 59 of 72.
- **Tests:** `finder-flow.spec.ts:302-320`, `matching-verification.spec.ts:67-69` keep their role and
  name; add: the button's visible text is its name.

**W6d. "Start over" inside the search bar (2.02)**
- Move it into the search summary card, after the pencil: at ≥600px a text button **"Start over"**;
  under 600px a ✕ with accessible name "Start over" (the universal clear-search glyph, so no label
  is needed). Delete the header copy of it. Behaviour unchanged (`care-finder.tsx:573-580`; filters
  kept on purpose).
- **Tests:** `finder-filters.spec.ts:143`, `adhd-life.spec.ts:332` keep working by role and name.

### W7. Learn: the games pane (3.01, 3.02, 3.03, D2, D6) · P1

**Heading and one line** (`app/(app)/approach/page.tsx:37`, `app/learn-panes.tsx`)
- h1 **"Learn about ADHD."** (4, D6). Rename the Modules group "Understand ADHD" to "The basics" so the
  two do not echo.
- One line under the heading, per pane (`{#layout.calm}`). Games: **"Short scenes from everyday
  life. Play any, in any order."** (10). It answers "what are these" and "do I have to do them all".

**The care map as a real entry (3.03)**
- Replace the 14px pill with a full-width row above the tabs, on both panes (so it is always in the
  same place): map icon, **"The care map"** (3), **"See the whole picture"** (4), arrow. ≥56px tall.

**Start here, then the rest (3.02b, 3.02c, `{#layout.five-then-rest}`)**
- **"Start here"** (2): three tiles, chosen as the first three not yet played from one ordered list:
  goal-matched games first (by each game's learning links against the person's Learn goals), then a
  fixed starter order (one character game, then "Same brain, five scenes", then "Not just attention").
  Once all three are played the slot keeps rolling to the next unplayed.
- Then **"All 28 games"** (3): expands to "Short scenes" (the 20 runs, titles only) and a link row
  "The eight lives →" to `/lives`. Hints show on Start here only, so the expanded list stays a list of
  names ("Lists become names").
- "Play mix" stays as the one primary.

**Subtitles (3.02d)**
- New `hint` field, at most 4 words, on every run and every character game; title plus hint at most 8
  (`BUDGET.card`). Examples: "Same brain, five scenes / Why context matters"; "Not just attention /
  Four hidden skills"; "The blank page / Why starting stalls"; Leo "Noise / A room too loud". The
  long taglines stay as the screen-reader description.

**Played state (3.01, D2)**
- Runs: `adhdme.learn.v1` → v2 `{ v: 2, done: [ids], at: { id: "YYYY-MM-DD" } }`; migrate v1 with no
  dates (shows "✓ Played" with no day).
- Character games: new key `adhdme.played.v1` `{ v: 1, at: { journeyId: "YYYY-MM-DD" } }`, written
  when a game reaches its end screen. A separate key, so `e2e/leo-room.spec.ts:84,106` ("the Lives
  profile is unchanged") still holds and no score is written anywhere.
- A played tile shows a check and a relative day: "Played today", "yesterday", a weekday within 7
  days, "last week", then the month. Never a result, never a count, never a streak
  (`src/learn/progress.ts:5`, research doc:177).

**Budget** (`/approach`, games pane: 57 now, 60 ceiling)

| Item | Words |
| --- | --- |
| h1 | 4 |
| Care map row | 7 |
| Tabs | 2 |
| One line | 10 |
| Play mix | 2 |
| Start here | 2 |
| 3 tiles, title + hint | ≤21 |
| All 28 games | 3 |
| Played tags, worst case 3 × 2 | 6 |
| Reset link (removed, W5) | 0 |
| **Total, worst case** | **57** |

Measure `games` and new states `games-played` (three played) and `games-all` (expanded; if the 20
titles exceed 60, the expanded list takes the results screen's list ceiling of 72, recorded in
`text-budget-lib.mjs` with its reason, as the finder results already are).

**Tests:** `e2e/learn-panes.spec.ts:7-13` (8 cards → 3 + expand → 20); `e2e/game-discovery.spec.ts:8-12,
41-47` (the 8-link roster moves to `/lives`; the Learn page keeps one link to it); `e2e/app-shell.spec.ts:387`
(heading); `e2e/adhd-life.spec.ts:520-529` (a finished run is a tick, never a count: extend to the date
word). Unit: every `hint` ≤4 words and passes the patient-surface lint (`src/learn/progress.test.ts:66`);
`adhdme.learn.v1` migration; the start-here selector.

### W8. Learn: the modules pane (5.01, 5.02, 5.03) · P1

**Goals first (5.03)**
- With no goals chosen, the pane opens with the question **"What do you want help with?"** (7, serif
  per W6a), the 7 goal chips (Sleep, Focus, Getting started, Time, Relationships, Overwhelm,
  Remembering things), and **"Skip"** (1). The chips leave the bottom of the page.
- After a choice, "For you" appears directly under the question, so the effect of a goal is seen in
  the same glance as the tap. A **"Change goals"** (2) link sits beside the "For you" heading.

**Say why (5.01, `{#honesty.claim-earned}`)**
- `recommendStrategies` (`src/lives/recommend.ts:43-62`) returns the inputs that scored each pick. The
  line under "For you" names them: **"Because you chose Focus."** (4); "Because you chose Focus and
  Sleep." (6); "From the games you said were you." (7); both reasons → the goal wording only. No
  reason, no line, and no "For you" heading: the pane shows "The basics" first instead.

**Fewer rows (5.02)**
- Default: the "Get to know ADHD" hero, For you (3 rows), **"Explore all modules"** (3). The 8 shelves,
  Two-minute tools and A quiet moment sit behind that one tap. "Your toolkit" shows as a row only when
  it holds something.

**Budget** (`?pane=modules`, not measured today; add `modules-empty` and `modules-goals` states)

| State | Estimate |
| --- | --- |
| No goals: h1 4, care map row 7, tabs 2, hero 8, question 7, 7 chips 9, Skip 1 | 38 |
| Goals set: h1 4, care map row 7, tabs 2, hero 8, For you 2, Change goals 2, reason ≤6, 3 rows × 5, Explore all modules 3 | ≤49 |

The pane line is left out on Modules: the question or the reason line is its one line.

**Tests:** `e2e/learn-panes.spec.ts:16-18` (7 reads and "Two-minute tools" now behind Explore);
`e2e/support/learn.ts` (shelves closed except For you); `e2e/adhd-lives.spec.ts:133` (For you after a
character signal, now with its reason line). Unit (`src/lives/lives.test.ts:310-321`): reasons returned
per pick; the reason sentence builder.

### W9. The care map (4.01 to 4.03, N8) · P1

- **Centre (4.01):** delete "N in the picture" (`care-map.tsx:127`). The centre reads "You". The
  ringed nodes already show what is marked; a count of needs is a number about the person.
- **Labels upright (4.02):** for wedges in the bottom half (Body, Environment), draw the label arc from
  the wedge's end to its start with sweep 0, and move it outward by the cap height so the letters sit
  inside the ring. Test with `SVGTextContentElement.getRotationOfChar(0)`: every quadrant label's
  first glyph rotates between −90° and 90°.
- **Size and the panel (4.03):** at ≥1024px, two columns: the wheel capped at 560px on the left, the
  detail panel on the right, sticky to the top of the viewport, so a tap updates text beside the wheel.
  Under 1024px the wheel is `min(560px, 100%)`; after a tap, if the panel's top is below the viewport,
  scroll it into view (smooth; instant under `prefers-reduced-motion`). No focus move; the panel's
  `aria-live` already announces.
- **Legible on a phone (N8):** node labels render at ≥11px at 390 wide; raise the label size in SVG
  units and the node radius to fit, and keep `e2e/adhd-life.spec.ts:462-487` ("labels that fit")
  green. Move the raw hex `COLOURS` (`care-map.tsx:24-29`) to palette tokens while in the file.
- **Serif echo (D1):** the National Wellness Institute paragraph renders in Newsreader.
- **Budget:** `/approach/map` is long-form (82); deleting the subtitle takes 3 or 4 words off.
- **Tests:** the rotation test above; a panel-in-view test at 1440 and 390 after tapping "Sleep";
  a rendered label size test; `e2e/adhd-life.spec.ts:345-356` keeps its heading and node names.

### W10. The module page (6.01, 6.02, N2, N12) · P2

- **Room above "All modules" (6.01):** `platform.css:57-61` sets the top padding to 0 for any learn
  screen with a module bar. Restore 16px under 600px and 24px above. Test: the gap from the header's
  bottom edge to the button's top edge is ≥16px at 390 and ≥24px at 1440.
- **Remove the eyebrows (N2):** "THE WORD", "TURN AN IDEA OVER" and their siblings across all lesson
  scenes. They break `{#layout.calm}` and they are the smallest, lowest-contrast text on the card.
- **Contrast (6.02):** raise `--lesson-ink-quiet` on every lesson colour so any remaining text under
  14px reaches ≥7:1 (the house bar for a low-vision audience; AA is 4.5). Today it is #663c00 on
  #ffa000 at 4.65:1. White on #ffa000 is 2.04:1 and must never be used.
- **Focus ring on load (N12):** a heading focused by script (`tabIndex=-1`) shows no ring; keyboard
  focus on controls keeps its `:focus-visible` ring.
- **Tests:** unit: a contrast function run over every lesson colour token pair (fails under 7:1 for
  small text, 4.5:1 for body); e2e: the spacing test; `e2e/learning-play.spec.ts:23-30` unchanged.

### W11. Contrast and legibility gates that see everything (6.02, N7, N8) · P1

Axe returned zero violations on every reviewed screen, and could not measure 9 (Learn), 33 (care
map) and 9 (My ADHD) text nodes, because they sit on gradients or inside SVG. Those nodes are the ones
the reviewer looked at. Sampled by hand they pass, but nothing stops a future change from failing.

- New `e2e/contrast-sampled.spec.ts`: for every route and state in `routes()`, take axe's
  "incomplete" color-contrast nodes, screenshot the box once with the text made transparent, take the
  median background colour, compare with the computed text colour, and require ≥4.5:1 (≥3:1 for large
  text).
- New legibility check: no visible patient text under 12px at 390 (SVG labels: 11px).
- Add the screens not swept today to `routes()` states so the existing axe sweep
  (`e2e/a11y-states.spec.ts:33`) reaches them: `?pane=modules`, a module (`?module=adhd`), the care map
  after a tap, the My ADHD compare and fills states.

### W12. Housekeeping found on the way · P2

- N11: build `src/design/taste-register.ts` and its test as `SKILL.md` describes, or delete the claim.
  Recommended: build it; every rule change in this plan edits `SKILL.md`.
- Record every changed screen in `docs/DESIGN-QA.md` with a before and after capture in `qa/`
  (`{#honesty.qa-capture}`).

## 7. Order of work

Each line is one commit (or a short series), each with its text-budget numbers in the message and its
e2e changes in the same commit. Sizes: S under half a day, M one to two days, L three to five days.

**Phase 1: safety and correctness (about 3 days)**
1. W1 Urgent help text and chat rows, verification doc and schedule · M
2. W2 goals never read "Working well" · S
3. W5 part: Delete clears everything, one reset · S
4. W9 part: labels upright, centre subtitle removed · S
5. W10: spacing, eyebrows, quiet ink, focus ring · S
6. W6c and W6d: labelled refine button, one sparkle, Start over in the bar · S

**Phase 2: clarity and less to choose from (about 7 days)**
7. W6a serif system (after D1) · S
8. W6b example chips, scenarios stage removed, tests migrated · M
9. W7 games pane: heading, line, care map row, start here, hints, played state · L
10. W8 modules pane: goals first, reason line, explore all · M
11. W9 part: two-column map, panel in view, legible labels · M
12. W11 gates, run over everything above · M

**Phase 3: progress over time (about 6 days)**
13. W3 snapshots, migration, compare pill · L
14. W4 start card, fills sheet, source line, answer again, history link · M
15. W5 part: disclosure on `/start`, save and restore, privacy page · M
16. W12 register and DESIGN-QA records · S

Dependencies: W2 before W3 (snapshots must not record the wrong word); W5's reset removal before W7's
budget; W6a before W8's question styling; W11 last in Phase 2 so it measures the new screens.

## 8. Definition of done

- Every review note in §5 and every audit finding is either shipped or has a written founder
  decision against it.
- `node scripts/text-budget.mjs` against a fresh build: 0 screens over their ceiling, including the
  new states (`model-compare`, `fills-open`, `games-played`, `games-all`, `modules-empty`,
  `modules-goals`). The numbers are in each commit.
- `pnpm typecheck`, `pnpm test`, and the touched e2e specs pass locally before each push; the full
  e2e suite passes in CI.
- Axe sweep and the sampled-contrast and legibility gates pass at 320, 390, 768 and 1440.
- Captures at 390×844 and 1440×900 of every changed screen in `qa/`, entries in `docs/DESIGN-QA.md`.
- Urgent help numbers verified against their official sources on release day, with `verifiedOn` set.
- The reviewer's walkthrough repeated on the new build: every numbered pin checked off.

## 9. Audit log

**Round 1: coverage.** Each of the 24 notes mapped to a workstream (§5). Two notes in the review are
duplicates in the PDF text (7.02's "Questions" and "Recommendations" repeat 7.01's); 7.02 was
planned from its observation (unclear value, no reset). The home highlight was checked and is text
selection, not a finding.

**Round 2: the build, not the screenshot.** Captures of bde8b3c showed three screens had moved since
the review (§2). Learn games had more choices, not fewer. The goal reproduction found N1. The modules
capture showed why goals "seem to do nothing" (the change happens off screen), which changed W8 from
"make the goals button bigger" to "ask first, show the result in the same glance".

**Round 3: the law.** Every addition checked against §3. Tooltips replaced by labels; the compare
view built without numbers; subtitles capped at 4 words; every added line paid for by a named cut;
the modules pane line dropped because its question does that job.

**Round 4: the arithmetic.** Each budget ledger summed by hand against `qa/text-budget.json`. The
worst cases: games pane 57, My ADHD `model-learning` 59, results 59 of 72. All are estimates until
the instrument measures them; any that lands over is cut before it merges.

**Round 5: adversarial review.** See §9a.

## Appendix A. Crisis services, as checked on 2026-09-26

Re-verify each against its own site on release day. The build environment could not open the
services' sites directly; these come from official and government search results.

| Service | Contact | Hours, audience | Source |
| --- | --- | --- | --- |
| Lifeline Text | 0477 13 11 14 | 24/7 | lifeline.org.au/text; health.gov.au media release "Lifeline's crisis text service goes 24/7" |
| Kids Helpline webchat | kidshelpline.com.au/get-help/webchat-counselling | 24/7, ages 5 to 25 | kidshelpline.com.au |
| Beyond Blue webchat | beyondblue.org.au/get-support/talk-to-a-counsellor/chat | Support service 24/7; confirm chat hours | beyondblue.org.au, healthdirect partner page |
| 13YARN (D4 optional) | 13 92 76 | 24/7, Aboriginal and Torres Strait Islander people | 13yarn.org.au |
| National Relay Service / 106 (D4 optional) | to confirm | for people who cannot speak or hear | to confirm on accesshub.gov.au |

## Appendix B. How the audit was reproduced

```
pnpm build
ADHDME_TOKEN_SECRET=test-secret ADHDME_ENABLE_DEMO=1 pnpm exec next start -p 3620
BASE=http://localhost:3620 node scripts/text-budget.mjs
```

The goal reproduction: open `/approach?pane=modules`, open "Your goals", choose "Focus", open
`/my-adhd`. Before W2 the Focus axis reads "Working well".
