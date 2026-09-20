# My ADHD Map: the plan

> **Superseded in part, 2026-09-20.** The screen specifications in §3 and the visual rules in §8
> are replaced by **[MAP-PRD.md](MAP-PRD.md)**, which integrates the founder's *Calm Clarity*
> design system from Stitch: a six-axis radar on the hub instead of five lanes of cells, one
> click-through per aspect of functioning, and the measured evidence that the lived-in tab renders
> 336 words. §1 (what the tree already holds), §4 (the matrix reading), §6, §7 and §10 of this
> document still stand. Read the PRD first.

Founder direction (2026-09-19): the data model can be complex while the interface feels almost
empty. A person should never feel they are managing a clinical dashboard. The central object is a
visual skills-by-life-area map that starts mostly blank and fills in as they learn, answer short
questionnaires and try modules. Provider matching and a one-tap GP summary emerge from the map.
Everything lives inside the My ADHD tab, which is itself to be re-cut into a hub with click-throughs
rather than one long screen.

This document is the plan: what the tree already holds (most of the model), what is new, the
information architecture, the data reading, the copy budget for every screen, the phases, and the
decisions the founder still owns. Laws this plan holds to: `CLAUDE.md` (a screen is 20 to 60 words,
40 in the middle; delete words, do not hide them), `.claude/skills/adhdme-taste/SKILL.md` (one idea
per screen, no eyebrows or labels on a patient screen, one container per idea, 44px targets), the
no-score line `app/my-adhd.tsx` and `src/wellness/map.ts` already hold, and nothing personal in a
URL, a log line or an event.

## 1. What already exists, and what the brief maps onto

The brief reads as a new product. Most of it is a re-reading of what PR #3 and Phase A shipped.
Build on these; do not duplicate them.

| The brief | What exists | Where |
| --- | --- | --- |
| Four things per need: pattern, impact, priority, confidence | `Need` already carries `signalStrength` + `persistence` (pattern), `functionalCost` (impact), `userPriority` (priority), `confidence`. Derived on every read, never stored. | `src/model/needs.ts:38-60` |
| Five life areas | `DOMAINS` minus `understand`: work-study, relationships, daily-life, mind-emotions, sleep-body, with labels | `src/model/layers.ts:104-115` |
| Skills (starting, sustaining, remembering, regulating, organising) | Not as a vocabulary. The 25 subdomains are finer than the brief's five columns and map onto them (§4) | `src/model/layers.ts:34-60` |
| Quick questions inside a module | Resonance: often / sometimes / rarely, cost, priority, plus the relate beat in Play | `src/model/store.ts:23-32`, `record.relates` |
| Learn more: 6 to 10 questions in a domain | Five topic surveys, 8 to 12 questions, scored to a friction, amplifier, contributors, strengths, cost, contradictions. No total. | `src/learn/surveys.ts`, `src/model/surveys.ts`, `/survey?id=` |
| Go deeper: 10 to 20 questions, only when wanted | Not built. The offer rule exists (offered, never launched, fatigue-gated) | `src/model/offer.ts`, `src/model/fatigue.ts` |
| Strengths per domain | Every module declares one `strength`; surveys attach strengths to options; needs collect them | `src/learn/interactive.ts:81`, `Need.strengths` |
| Strong pattern, not a problem, no provider suggestion | `userPriority: "no"` and a low cost already sink `priorityScore`; `escalationEligible` refuses escalation | `src/model/needs.ts:255-262`, `src/model/recommend.ts:65` |
| Need → intervention types → professions → providers | `professionsFor(need)`, the profession entries, `EXPERTISE_FOR` per subdomain, problem fit reordering allied providers by declared expertise | `src/model/recommend.ts:52`, `src/support/professions.ts`, `src/support/problem-fit.ts` |
| "Why this match" chips on a provider card | `fitTags` returns the matched expertise tags in order; the card renders only the one-sentence `fitReason` | `src/support/problem-fit.ts:63-78`, `app/care-finder.tsx:183,786` |
| Strengths alter recommendations | Not built. Strengths are shown, never read by `recommend` or problem fit | — |
| GP summary | The referral brief: five editable fields, copied to the clipboard | `app/support-path.tsx:192-232` |
| Export PDF / docx | `docx` is a dependency, used for the practice one-pager and the weekly report; no patient-side document | `src/collateral/one-pager.ts`, `src/report/weekly.ts` |
| Share securely | Needs a record that outlives the device. Not built; argued and undecided | `docs/adr/0008-accounts-and-sync.md` |
| A map that fills in | Two maps already: the nine-axis wellness radar with rung words, and the care map of 25 nodes. Neither is domain × skill, neither shows a status word per cell | `app/my-map.tsx`, `src/wellness/map.ts`, `app/care-map.tsx` |
| Home: Today, one focus, one thing to try, "View my map" | `TodayContent` is one card and one control, rendered inline at the top of My ADHD; `/today` redirects to `/my-adhd` | `app/today.tsx`, `app/(app)/today/page.tsx` |
| Four tabs: Today · Learn · My Map · Support | Three tabs: Support · Learn · My ADHD; range is 3 to 5; the icon union already has `Sun` | `src/app-shell/tabs.ts:18-43` |

The one honest gap in the model is the **matrix reading**: a closed set of five skills, a table
from subdomain to skill, and a status word per (area, skill) cell derived from a `Need`. Everything
else is a screen problem.

## 2. What is wrong with the My ADHD tab today

`app/my-adhd.tsx` is one screen carrying Today, the biggest friction, contributors, the balance
line, what helps, the manual, adjustments, medication, the goal, the survey offer, other needs,
insight cards, strategy history and the delete control: fourteen sections, every one a card. The
instrument measures it at 19 words because it only walks the empty state; nobody has measured it
lived in, and a lived-in record renders well over a hundred words. That is the dashboard the brief
says a person must never feel they are managing.

## 3. The information architecture

Three tabs stay (see §9 for the fourth-tab decision). The My ADHD tab becomes a hub and five
click-throughs, plus one door to sharing. Every route is a server `page.tsx` with metadata and a
client component in `app/`, the shape `/manual` and `/medication` already use, and each path is added
to the tab's `also` list so the tab stays lit (`src/app-shell/tabs.test.ts` enforces the route
exists).

```
/my-adhd                    the hub: the map, one line, three names
/my-adhd/[area]             one life area: work-study | relationships | daily-life | mind-emotions | sleep-body
/my-adhd/share              Take this to my GP: audience, preview, export
/my-adhd/history            strategies tried and insight verdicts (moved off the hub)
/today                      Today: one card, one control, "View my map" (no longer a redirect)
/my-map                     the wellness radar, unchanged, reached from the hub by one word
/manual /medication /adjustments /start   unchanged
```

`[area]` is a closed set, so the page uses `generateStaticParams` over the five domain ids and
`notFound()` otherwise. It is listed in `e2e/site-routes.ts`'s `DYNAMIC_ROUTE_PLAN` with a sample,
and in `scripts/text-budget-lib.mjs`'s `EXTRA` with a lived-in state, the way `/my-map` is.

### 3.1 The hub, `/my-adhd` (target 30 words, ceiling 40)

```
My ADHD.

[ the map: five lanes, one per life area, each a row of small rounded cells ]

Work & Study      ● ● ● ○ ○
Relationships     ● ○ ○ ○ ○
Daily life        ● ● ○ ○ ○
Mind & emotions   ○ ○ ○ ○ ○
Sleep & body      ● ○ ○ ○ ○

Tap an area.

Balance · Manual · Share
```

- Each lane is one `<a>` to its area page, a 44px row: the area name and five cells. A filled
  cell carries its status colour; an empty one is stone. No words on the cells, no numbers
  anywhere on the page (an e2e regex holds that, as `e2e/my-map.spec.ts` does for the radar).
- The screen reader text of a lane is the area name and the count of things learned, in words:
  "Work and study, three things learned". That is the `●●●` of the brief said honestly.
- Before onboarding the map is entirely stone and the one line under it is the door: "Two
  minutes so this can be about you." with the Start control. That replaces the current lead card.
- The three names at the foot are the only other controls: **Balance** opens `/my-map`, **Manual**
  opens `/manual`, **Share** opens `/my-adhd/share`. Medication appears as a fourth name only when
  onboarding said medication is in the picture; Adjustments moves onto the Work & Study area page
  where it belongs. The delete control moves into the settings sheet (`app/app-settings.tsx`)
  under "Your data", where a person expects to find it.
- Today's card leaves the hub. `/today` stops redirecting and becomes the Today screen the brief
  describes (§3.4).

### 3.2 An area, `/my-adhd/[area]` (target 40 words, ceiling 60)

```
← My ADHD

Work & Study.

Starting work seems to be your biggest friction.

What we know
  Unclear tasks are harder to begin.
  Urgency makes starting easier.

What helps
  Another person nearby.
  A clear first action.

Still learning
  Whether perfectionism plays a part.

Understand my work patterns · 8 questions, 2 min      ← Learn more
Get more help                                          ← only when eligible
```

- The heading sentence is the area's top need by `priorityScore`, said as friction; with no need
  in the area, the sentence is "Nothing here yet." and the one control is the survey.
- **What we know**: at most three lines, from `need.contributors[].note` and confirmed insight
  headings. Each line is a 44px control that opens the three verdict chips (That's me / Partly /
  Not really) in place, so insight cards no longer need their own section.
- **What helps**: at most two lines, from `summary.helps` and `need.strengths`. A strength carries
  the Sparkle mark the existing screen uses.
- **Still learning**: one line, from what the model is least confident about in this area (a
  contributor with one source, or the `worthExploring` reading). Absent when there is nothing.
- **Learn more** is the offer: the area's topic survey when uncompleted, otherwise the next
  module targeting the area's subdomains (`INTERACTIVE_MODULES` filtered by `domain`, minus
  `record.completed`). Copy is always the survey's own title as a verb phrase plus its question
  count and minutes, never "complete assessment".
- **Get more help** appears only when `escalationEligible(need, record)` is true, and goes to
  `/support`, which already walks problem → professions → providers. The support path gains the
  "Who could help?" reading (§6).
- Cells for this area are repeated across the top as five named chips only on the area page,
  where there is room for one word each: Starting · Sustaining · Remembering · Regulating ·
  Organising, each carrying its status colour and, on tap, its status word and what put it there.
  That is where "Working well / Worth improving / Needs more support / Still learning" is said.

### 3.3 Share, `/my-adhd/share` (§7)

### 3.4 Today, `/today` (target 25 words)

```
Today.

Starting work before it becomes urgent.        ← the top need, as the focus

8 min · Why deadlines switch your brain on     ← rec.action when it is a module
Try this: make the first step concrete         ← rec.action when it is a strategy

View my map
```

This is `TodayContent` with the recommendation engine's one card, re-cut to the brief's four
lines. The safety screen and the waiting checkpoint keep replacing it as they do now. Nothing
else is on the screen.

## 4. The matrix reading: `src/model/matrix.ts`

One new file, pure, tested in node, derived on read like `needs.ts`. Nothing is stored; the record
already holds everything the matrix needs.

```ts
export const SKILLS = ["starting", "sustaining", "remembering", "regulating", "organising"] as const;
export type Skill = (typeof SKILLS)[number];
export const SKILL_LABELS: Record<Skill, string>;            // Starting · Sustaining · Remembering · Regulating · Organising

/** Which skill a subdomain is evidence about. Closed; a subdomain that is context, not a skill, is absent. */
export const SKILL_OF: Partial<Record<Subdomain, Skill>> = {
  activation: "starting", "deadline-design": "starting",
  attention: "sustaining", switching: "sustaining", noise: "sustaining",
  memory: "remembering",
  "emotional-regulation": "regulating", inhibition: "regulating", sleep: "regulating", energy: "regulating", movement: "regulating", appetite: "regulating", "medication-experience": "regulating",
  time: "organising", structure: "organising", workload: "organising", "living-environment": "organising", "study-context": "organising", "workplace-context": "organising",
  // partner, family, manager, teachers, peers, clinicians: people are context on a cell, never a cell.
};

export const AREAS = ["work-study", "relationships", "daily-life", "mind-emotions", "sleep-body"] as const;   // DOMAINS minus "understand"

export type CellStatus = "unexplored" | "still-learning" | "working-well" | "worth-improving" | "needs-support";
export const STATUS_LABEL: Record<CellStatus, string>;      // the four consumer words; "unexplored" renders as nothing

export interface Cell {
  readonly area: Area; readonly skill: Skill;
  readonly status: CellStatus;
  readonly strength: string | null;                          // a strength named here, if any
  readonly because: string;                                  // what put it there, as an act: "You said starting costs you 8 of 10."
  readonly needs: readonly Need[];                           // the needs that fed it
}

export function matrix(record: ModelRecord): Cell[];         // always 25 cells, in lane order
export function lane(record: ModelRecord, area: Area): { cells: Cell[]; learned: number; top: Need | null };
export function diff(before: ModelRecord, after: ModelRecord): Cell[];   // cells whose status changed: the "your map just got clearer" set
```

**Status from a need**, in this order, first match wins:

| Status | Rule |
| --- | --- |
| `unexplored` | no need in this area with `SKILL_OF[subdomain] === skill`, and no contributor there |
| `still-learning` | the best need has `confidence === "low"`, or only a contributor touches the cell |
| `working-well` | `userPriority === "no"`, or `functionalCost <= 3`, or a strength is named and cost is under 5. This is "strong pattern, not currently a problem" |
| `needs-support` | `functionalCost >= 7` and `userPriority === "yes"` and `confidence !== "low"` |
| `worth-improving` | everything else |

A module whose `domain` is `understand` feeds cells through the area the onboarding named
(`record.onboarding.affects`, or the `where` answer in the context module), falling back to
work-study. That table is one function and one test, so the six "understand" modules still move
the map.

`learned` for a lane is the count of cells not `unexplored`. It is said in words on the hub and
never as a digit.

The four consumer words are consumer words only. `CellStatus` ids, the `Need` fields and the
events taxonomy keep their current names; `src/model/events.ts` §68 already refuses labels that
read as pathology and a test pins that no status word contains "deficit", "impairment" or
"disorder".

## 5. The questionnaire loop: give data, receive insight

The three levels exist. What changes is what a person sees at the end of one.

1. **Quick** (inside a module or a run) is unchanged: resonance and the relate beat.
2. **Learn more** (`/survey?id=`): the result screen currently renders four cards (friction,
   amplifier, contributor, strength). It becomes the map moment:
   - `TopicSurveyScreen` snapshots the record when the survey starts (in memory, never stored).
     On finish it computes `diff(before, after)`.
   - The result opens on the area's lane, cells that changed fill one at a time (the `motion`
     dependency, 240ms each, honouring reduced motion with an immediate state), then one line:
     "Your map just got clearer." Then the one sentence the survey earned, from
     `SurveyResult.friction` against `frictions[1]`: "Your work difficulties look more about
     **starting and structuring** than sustaining attention once you are in." That sentence is a
     template per survey in `src/learn/surveys.ts` (`insightFor(result)`), so it is authored, not
     generated.
   - One control: "Explore this · 8 min" to `result.exploreNext`, and a text link back to the area.
   - Every `insightFor` sentence and every status word is education copy and passes
     `lintLandingCopy` and `lintEducationCopy` in the unit suite, the way the surveys' text does.
   - Budget: the result screen is 40 words with the sentence; the four cards go.
3. **Go deeper** (new, Phase 6): `TopicSurvey` gains an optional `deeper: SurveyQuestion[]` of
   10 to 20 questions using the same option shape. `offerSurvey` gains a fourth rule,
   `would.drive`: the area's survey is complete, the need's cost is 7 or more, confidence is high,
   and no deeper set is complete. Copy on the area page: "We know quite a lot about this now. Want
   to understand what may be driving it? · 14 questions, 4 min". Fatigue gates it like the rest.
   Content for two areas first (work-study, relationships); the other three follow.

## 6. Support emerges from the map

- **The area page's "Get more help"** carries the need in the finder's existing device state (the
  filters and the record; nothing in the URL) and lands on `/support`, whose first step becomes
  "Who could help?": the professions from `professionsFor(need)`, each with the one-line reason
  the profession entry already holds, then "Best fit for you" from the finder's ranked list with
  problem fit applied.
- **Chips on a provider card**: `fitTags(provider, need)` already returns the matched expertise
  tags in order. `care-finder.tsx` renders the first three as chips under "Why this match?", using
  `EXPERTISE_LABELS`. They are the same tags that filled the person's cells, which is what makes
  the match traceable.
- **Strengths alter the ranking**: a new `strengthFit(provider, need)` in `problem-fit.ts` adds one
  point when a need's strengths include an accountability strength ("Another person nearby",
  "External accountability helps") and the provider's profession works with check-ins (coach,
  OT), and produces the second sentence on the card: "Because accountability works for you, regular
  check-ins may suit you better than a self-directed approach." One table, one test, no free text.
- `escalationEligible` stays the gate. A cell at `working-well` never reaches a provider.
- The bidirectional GP match (`/match`, `src/lib/matching/`) is untouched in these phases. The
  glue from `Need[]` to its `StructuredSignals.careAsks` is a later, separate change.

## 7. Share: take this to my GP

`/my-adhd/share`, two screens.

**Audience** (target 20 words):

```
Take this to…

My GP · A psychologist · Work or university · Myself
```

**Preview**: the summary as a document, one section per line of the brief, each section with a
44px "Remove" toggle; then **Copy**, **Print** and **Word**.

`src/model/summary.ts` produces it, pure and tested:

```ts
export interface GpSummary {
  priority: string;                    // the top need's area and label
  highestImpact: string[];             // up to three needs by priorityScore with cost >= 5
  context: string[];                   // need.context + contributors notes
  helps: string[];                     // summary.helps + strengths
  tried: string[];                     // experiments by outcome
  otherAreas: string[];                // the other lanes' top need, one line each, with "low priority" when userPriority is no
  goal: string | null;
  supports: Profession[];              // professionsFor(top), only when escalationEligible
  matched: { name: string; profession: string }[];   // optional, from the finder's held results, off by default
}
export function gpSummary(record: ModelRecord, audience: Audience): GpSummary;
export function summaryText(s: GpSummary, removed: Set<keyof GpSummary>): string;
```

The audience changes emphasis, not truth: the psychologist version leads with the mind-emotions
lane and the perfectionism/anxiety reading; the work version leads with the adjustments track
(`src/model/adjustments.ts`) and omits medication; "Myself" keeps everything including strengths.

**The rule the summary lives under.** `src/referrals/document.ts` states the tree's gate: no
clinical text that ADHD.ME authors, templates or generates. The summary therefore contains no
narrative and no template sentence about the person. Every line is one of three things: a
structured row the record already holds (a need's label, cost, priority, confidence, its
contributors' notes, a strategy and its outcome, a profession name the app already showed the
person), the person's own words verbatim (`manualText(record)`, the medication note, the goal), or
a section heading. `summaryText` joins rows with line breaks; it has no sentence templates, and a
test asserts that every output line is either a heading, a row from the record, or the person's
own text. The one-pager in `src/collateral/` is the rendering pattern, not the content pattern.

- **Copy** is the clipboard, as the brief does today.
- **Print** is `window.print()` with a print stylesheet for the preview: that is the PDF, made by
  the browser, without a dependency or a server.
- **Word** builds a `.docx` on the device with the `docx` package the tree already uses in
  `src/collateral/one-pager.ts`, following that file's shape, and downloads it as a Blob. It is
  loaded with a dynamic import so the hub pays nothing for it.
- **Share securely** is not built. It needs a record that outlives the device, which is the
  founder decision in ADR 0008. The screen does not offer it; nothing leaves the device, and the
  privacy copy stays true.
- Budget: the audience screen is 20 words. The preview is a document a person is about to hand
  over, and it is measured as one: registered in `LONG_FORM` with a reasoned ceiling of 120 in
  `CEILING`, the way the finder's results carry their results. Nothing else on the screen but the
  three controls.

## 8. Visual and motion rules for the map

- Five lanes, five cells each, cells 24px with a 44px row; no spreadsheet, no gridlines, no
  headings on the columns on the hub. Column names appear on the area page only.
- Colour from the palette tokens only: unexplored is stone with a line; still-learning is paper
  with a line; working-well is the callout wash (`--accent-soft`); worth-improving is the accent
  tint (`--accent-tint`); needs-support is the accent mid (`--accent-mid`) with ink text where
  there is text. No red, no green; a strength is the Sparkle mark on the cell, not a hue. Two
  categorical chart colours stay untouched.
- The map is an `<ol>` of lanes, each lane an `<a>`, so it is keyboard-walkable and needs no SVG.
- Fill animation is a scale from 0.6 and opacity, 240ms, staggered 60ms, only on the survey
  result and only for the cells that changed; `prefers-reduced-motion` renders the end state.
- No eyebrows, no kickers, no `life-eyebrow` on any new screen. A heading, at most one line under
  it, and the control.
- The hub and every area page keep the ink primary and the accent text link idioms; a fold is the
  existing fold.

## 9. Decisions for the founder

Each of these changes the work materially. The plan proceeds on the default in bold; a different
answer is a one-line change to a phase, not to the model.

1. **A fourth tab.** The brief wants Today · Learn · My Map · Support. **Default: three tabs stay;
   `/today` becomes a real screen reached from the hub and from the Support tab's door**, and the
   tab test's label list is untouched. If a fourth tab is wanted, `APP_TABS` gains
   `{ href: "/today", label: "Today", icon: "Sun" }` first, `tabs.test.ts:27` and
   `e2e/app-shell.spec.ts` follow, and the hub loses nothing.
2. **The radar.** `/my-map` was founder-directed on 2026-09-11 and has its own tests. **Default:
   keep it as "Balance", one word on the hub.** Retiring it deletes `app/my-map.tsx`,
   `src/wellness/map.ts` and `e2e/my-map.spec.ts` and moves "Who helps here" onto the area page.
3. **The name of the tab.** The brief says "My Map". **Default: the tab stays "My ADHD"** and the
   map is the tab's first screen. Renaming touches the label test, the purpose sentence and the
   public copy.
4. **The preview's budget.** A GP summary is a document. **Default: `LONG_FORM` with a 120 ceiling**,
   reasoned in the same comment block as the finder's 72.
5. **Share securely.** Out of scope until ADR 0008 is decided.

## 10. Phases, in order, each one commit with the text-budget number in the message

Every phase runs `pnpm typecheck && pnpm test`, the e2e specs it touches, and
`BASE=http://localhost:3620 node scripts/text-budget.mjs` for the screens it changes, and puts the
numbers in the commit. Text is deleted, not hidden; no new `<details>` to make a number pass.

**Phase 1: the reading.** `src/model/matrix.ts`, `src/model/matrix.test.ts`: the skill table covers
every subdomain or names it as context; every status rule has a case; "strong pattern, not a
problem" is `working-well`; a survey moves at least one cell; `diff` returns exactly the changed
cells; no status word reads as pathology. `src/model/summary.ts` and its test. No UI.

**Phase 2: the hub and the areas.** `app/my-adhd.tsx` rewritten as the hub; `app/my-adhd-map.tsx`
(the lanes); `app/(app)/my-adhd/[area]/page.tsx` and `app/my-adhd-area.tsx`; `/today` as a screen;
`/my-adhd/history`; the delete control into the settings sheet; `also` in `tabs.ts`; the
`DYNAMIC_ROUTE_PLAN` sample; `EXTRA` entries for the hub lived in, an area lived in, and Today
lived in. `e2e/my-adhd.spec.ts`: the empty hub is the door; a lived-in hub has no digit; a lane
opens its area; the area page names the friction, three lines at most under "What we know", and
the survey door; the settings sheet deletes. Axe on each. Word counts: hub ≤ 40, area ≤ 60,
Today ≤ 40.

**Phase 3: the map moment.** `app/topic-survey.tsx` result rewritten around `diff`; `insightFor`
per survey; the area page's "Learn more" is the offer; the e2e survey test asserts the sentence
and that the lane filled.

**Phase 4: share.** `/my-adhd/share`, the audience and the preview; print stylesheet; the docx
builder under `src/collateral/gp-summary.ts` beside the one-pager; `LONG_FORM` and `CEILING`
entries; e2e: audience → preview, remove a section, copy the text, and the Word download is a
`.docx` of non-zero size. The referral brief on `/support` is replaced by one link to
`/my-adhd/share`, which removes five textareas from that screen.

**Phase 5: support from the map.** "Who could help?" as the support path's first step; chips on
the provider card from `fitTags`; `strengthFit` and its sentence; the area page's "Get more help".
Unit tests on problem fit; e2e on the chips matching the person's cells.

**Phase 6: go deeper.** `deeper` question sets for work-study and relationships; the fourth offer
rule; the area page copy; fatigue tests.

Each phase is independently shippable. Phase 1 and 2 are the revamp the founder asked for; 3
through 6 are the loop that makes the map fill.

## 11. Verification, end to end

1. Unit: `pnpm test` green, with the new files' suites (`matrix`, `summary`, `problem-fit`,
   `offer`) counted in the total, and every new patient string through `lintLandingCopy`.
2. Dev server on 3620, then `BASE=http://localhost:3620 node scripts/text-budget.mjs`: every
   My ADHD screen within its ceiling, empty and lived in; the table pasted into the commit.
3. `pnpm e2e -- my-adhd my-map text-budget controls viewports a11y app-shell`: no digit on the hub,
   every control 44px, no sideways scroll at 320 to 1440, axe clean on the hub, an area, the survey
   result, Today and the share preview.
4. A walk on a 390 viewport as a first-time user: Start → one module → the hub shows one filled
   cell → the area page names the friction → Understand my work patterns → the lane fills and
   the sentence reads → Explore this → Get more help → the chips on the provider card match the
   cells → Take this to my GP → Print.
5. `pnpm build` green; `pnpm gate` before the PR leaves draft.
