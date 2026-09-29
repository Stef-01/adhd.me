# My ADHD Map: integration plan

Status: written 2026-09-20 against `main` at `6d78392`, when nothing of it was built. Kept as the record of the plan: the My ADHD hub, the map that fills in after a survey, the map-driven entry into support and the GP summary export have since shipped (`e2e/my-adhd.spec.ts`, `e2e/my-adhd-fills.spec.ts`, `docs/design/my-adhd-map/`).

Goal: bring the "My ADHD Map" loop (question → map → insight → education → experiment → map →
support → GP summary) into the app **entirely inside the My ADHD tab**, and at the same time
break today's single 14-section `/my-adhd` screen into a hub with click-throughs.

Principle: complex underneath, obvious on the surface.

## 1. What already exists (so we extend, not rebuild)

| Brief asks for | Already in tree |
|---|---|
| Pattern / Impact / Priority / Confidence per need | `Need` in `src/model/needs.ts:36` has `signalStrength`, `functionalCost`, `userPriority`, `confidence`, plus `strengths`, `contributors`, `strategies`. Derived, never stored. |
| Short domain questionnaires that yield strengths and contributors | Five topic surveys in `src/learn/surveys.ts`, engine `app/topic-survey.tsx`, scoring `src/model/surveys.ts`. Options already carry `signals`, `strength`, `contributor`, `claims`. |
| Quick "does this happen to you?" | `resonance` on the record, asked inside Learn modules. |
| Need → professions → providers | `src/support/professions.ts` (11 professions), `app/support-path.tsx`, rosters in `src/demo/*`. |
| "Why this match" | `src/lib/matching/rationale.ts`: concept labels and declared facts only. |
| A map | `/my-map`: nine NWIA dimensions as a radar, words not numbers. |
| Brief for a clinician | `ReferralBrief` in `app/support-path.tsx:192`; clipboard copy in `app/match/prep.tsx:115`. |

What is genuinely missing: the **domain × skill cell grid**, the **fill animation after a
survey**, **map-driven entry into support**, **provider chips traceable to cells**, a
**one-page printable summary**, and a **navigable My ADHD**.

## 2. Decisions this plan makes

1. **Three tabs stay.** The brief's Today / Learn / My Map / Support becomes: Support, Learn,
   My ADHD. "Today" is the top card of the My ADHD hub (it already redirects there); "My Map"
   is the hub's main click-through. No new tab, no new global chrome.
2. **Everything new nests under `/my-adhd/…`.** `activeTab()` is longest-match, so nested
   routes keep the tab lit without touching the `also` list. `/my-map` becomes a redirect.
3. **One map, not two.** The five-lane grid replaces the radar as the primary map. The nine
   NWIA dimensions fold into the lanes (sleep, movement, nutrition → Sleep & Body; social →
   Relationships; and so on), so `nwiaBalance` and the profession hand-off survive.
4. **Words, never scores.** The standing rule in `app/my-adhd.tsx:3` ("no graphs, no score")
   and `e2e/my-map.spec.ts` stay. A cell has one of five states, shown by tone and named in
   text for screen readers: Not explored · Working well · Worth improving · Needs more
   support · Strength. No red. No "deficit".
5. **A cell's state comes from what the person said about impact and priority, not from
   symptom weight.** "Needs more support" requires the person to have said it costs them and
   that they want it changed. This is what keeps the map on the right side of the
   no-symptom-triage law in `PRODUCT.md:44`.
6. **The 60-word screen law shapes every sub-page.** The brief's domain screen is ~75 words;
   it is split into two screens rather than folded, because the law says delete, do not hide.
7. **Export is print-to-PDF from a print stylesheet.** No PDF library, no server. "Share
   securely" is out of scope: the record lives on one device by law (`src/model/store.ts:1`)
   and a share link would break that. Flagged for a founder decision, not built.

## 3. Information architecture

```
/my-adhd                    Hub                      ~40 words
  /my-adhd/map              Five lanes               ~35
  /my-adhd/map/area?d=work  One domain               ~50
  /my-adhd/map/know?d=work  What we know / helps / still learning   ~55
  /survey?id=…&from=map     Existing survey, returns to the map with the fill animation
  /my-adhd/help?need=…      Who could help → best fit   ~55
  /my-adhd/summary          One-page summary, preview and export (LONG_FORM)
  /my-adhd/kit              Manual · Adjustments · Medication · What I've tried
  /my-adhd/data             Your data, delete everything
```

Query params follow the `/survey?id=` precedent, which avoids `DYNAMIC_ROUTE_PLAN` entries.
Values are closed enum ids only, never free text (the URL law in `store.ts`).

### The hub (`/my-adhd`)

Replaces all 14 sections with four objects:

- **Your focus**: `summary.need.label`
- **8 min**: the one recommended module (from `TodayContent`)
- **Try this**: the one experiment
- **View my map**: a lead card with the five-lane miniature (dots only)

Below, two quiet rows: **My kit** and **My data**. Nothing else.

Where today's sections go:

| Today on `/my-adhd` | New home |
|---|---|
| TodayContent, biggest friction, current goal | Hub |
| What contributes, what helps, also in the picture | `map/know` for that domain |
| NWIA balance line | `map` (lane coverage says it) |
| Insight yes/partly/no cards | `map/know`, one at a time |
| SurveyOffer | `map/area` as "Understand my … patterns · 8 questions · 2 min" |
| Manual, Adjustments, Medication, Strategy history | `kit` |
| Your data | `data` |

### The map (`/my-adhd/map`)

Five vertical lanes of small rounded cells: Work & Study, Relationships, Daily Life, Mind &
Emotions, Sleep & Body. Rows are the five skills (Starting, Sustaining, Remembering,
Regulating, Organising) but row labels are not printed; a cell's name appears when it is
focused or tapped. The SVG/grid is `aria-hidden`; five lane buttons with a text summary
("Work & Study, 3 of 5 explored") are the real controls, same pattern as `my-map.tsx`.
A `Share` text link top right leads to `/my-adhd/summary`.

### Domain (`map/area`) and knowledge (`map/know`)

`area`: the lane enlarged, one sentence ("Starting work seems to be your biggest friction
right now."), one primary: **Learn more** (next survey tier or module), and a link to
`know`. If any cell is "Needs more support", a secondary **Get more help** → `help?need=`.

`know`: three short lists, **What we know**, **What helps**, **Still learning**. Every line
traces to an answer (existing `contributors`, `strengths`, `claims`). Max three lines each.

### Survey return: the signature interaction

`/survey` gains `from=map`. On finish it routes to `/my-adhd/map?filled=<cell ids>` instead
of its own result screen. The map plays, cell by cell (stagger ~250 ms, `motion/react`,
instant under reduced motion), then shows one card: **Your map just got clearer.** plus the
one-sentence insight from `scoreSurvey` and **Want to explore this? · 8-minute module**.

### Three question tiers

- **Quick**: existing resonance inside modules. No change except it now fills a cell.
- **Learn more**: existing 8–12 question surveys, relabelled "Understand my … patterns".
- **Go deeper**: new optional 10–20 question sets, offered on `area` only once the lane's
  confidence is `medium`+. These ask about drivers (clarity, anxiety, perfectionism,
  environment), which is what lets one surface need route to different professions.

### Help (`/my-adhd/help`)

Reuses `support-path.tsx` parts rather than linking out to the Support tab, so the person
never leaves My ADHD. Two beats on one screen: **Who could help** (top two professions with
the existing `inAWord` line) and **Best fit for you** (one provider, three chips, View
profile / Book). Chips are cell names from the person's own map, so the match is visibly
traceable. Providers from `expanded-care-roster.ts` stay labelled as example profiles
(CONTEXT.md:82) until real allied listings exist.

### Summary (`/my-adhd/summary`)

One tap from the map's Share link. Opens straight on the **GP** version as a one-page
preview; a small switch offers Psychologist · Work or university · Myself (same data,
different section order and wording). Every section has a remove toggle. One primary:
**Export**, which calls `window.print()` against `@media print` styles. A secondary copies
plain text, reusing the `prep.tsx` clipboard pattern and its fallback.

Sections: current priority · highest-impact needs · context · what appears to help ·
strategies already tried · other areas · the person's goal · professions that commonly work
on this. Matched providers are off by default.

Copy law for this page: it reports **what the person said**, in third person, with no
diagnostic or severity language, and carries a footer saying so. "Potential supports for
clinician consideration" is worded as "Professions that commonly work on these areas",
sourced from `professions.ts`, so the document never recommends treatment. Registered in
`LONG_FORM` in `scripts/text-budget-lib.mjs` as a document, like the other long documents.

## 4. Data model

New module `src/map/` (pure, unit-tested, no storage of its own):

```ts
type MapDomain = "work" | "relationships" | "daily" | "mind" | "body";
type MapSkill  = "starting" | "sustaining" | "remembering" | "regulating" | "organising";
type CellState = "unexplored" | "fine" | "improve" | "support" | "strength";

interface MapCell {
  domain: MapDomain; skill: MapSkill; label: string;   // "Remembering commitments"
  pattern: "often" | "sometimes" | "rarely" | "unknown";
  impact: "high" | "some" | "none" | "unknown";
  priority: "yes" | "maybe" | "no" | "unknown";
  confidence: Confidence;
  state: CellState;          // derived from the four above
  sources: string[];         // survey / module ids, for traceability
}
personalGrid(record): MapCell[]      // 25 cells, derived on read like deriveNeeds
```

- `cells.ts`: the closed table mapping existing `Subdomain`s and NWIA dimensions onto
  (domain, skill). This is the one new piece of vocabulary; add it to CONTEXT.md.
- `state.ts`: the rule. strong pattern + no impact → `fine` with the note "Strong pattern,
  not currently a problem" and **no** support prompt. high impact + priority yes + medium
  confidence → `support`. A survey `strength` on that cell → `strength`.
- **Stored additions to `ModelRecord`** (one migration-free optional field each):
  `priorities: Record<cellId, "yes"|"maybe"|"no">` and `impacts: Record<cellId, …>`, asked
  as one extra tap at the end of a survey ("Does this cause problems?" / "Want to change
  it?"). Everything else is derived.

Support routing, `src/map/pathways.ts`:

```
need → intervention types → professional competencies → providers
```

A table of intervention types per skill (task decomposition, environment redesign,
accountability, perfectionism work…), each tagged with the professions that offer it and
the **driver claims** that raise it (`clarity-helps`, `deadlines-help`, anxiety claims from
the Mind survey). Ranking = person's declared drivers × declared strengths ("accountability
works for me" lifts providers who declare check-in style). Output feeds the existing
expertise-tag match; rationale strings go through `rationale.ts` rules (labels only, never
the person's sentences). Weights are global and declared, per the matching laws.

## 5. Phases (each is one PR through `pnpm gate`)

| # | PR | Contents | Proof |
|---|---|---|---|
| 1 | **Hub and click-throughs** | Split `app/my-adhd.tsx` into hub, `kit`, `data`. No new features. `/today` still redirects. | text-budget numbers for 3 screens in the commit; `app-shell.spec`, a11y sweep green |
| 2 | **Grid model** | `src/map/*` with tests: mapping table is total, state rule cases, "strong pattern, no impact → no support prompt". | vitest |
| 3 | **Map screens** | `map`, `map/area`, `map/know`; `/my-map` redirect; NWIA profession hand-off preserved; update `e2e/my-map.spec.ts` (still asserts no number about anybody). | e2e + a11y at 390×844 |
| 4 | **Survey loop** | `from=map`, impact/priority taps, fill animation, insight card, relabelled offers. Register the `?filled=` state in text-budget `EXTRA`. | new `e2e/map-loop.spec.ts`, reduced-motion path |
| 5 | **Help inside My ADHD** | `pathways.ts`, `help` screen, traceable chips. | unit tests: same need + different drivers → different profession order; copy lints |
| 6 | **Summary and export** | `summary` with four audiences, remove toggles, print CSS, clipboard fallback. | e2e asserts print layout is one page and contains only kept sections; compliance lint on the template |
| 7 | **Go deeper** | Driver question sets, gated on confidence. | vitest + budget |

Phases 1–3 are safe to ship alone and already deliver the navigability fix. 5 and 6 need
the founder decisions below first.

## 6. Risks and founder decisions

1. **Triage boundary.** A map that says "needs more support" and then shows an OT is close
   to the no-symptom-triage line. The mitigation is rule 5 in §2 (state comes from the
   person's declared impact and priority) plus profession wording that describes what a
   profession does rather than what the person should do. Wants an explicit founder/Ahpra
   read before phase 5 ships.
2. **GP summary wording.** Same read for the template in phase 6, especially the
   professions section.
3. **Example providers.** Allied rosters are synthetic. "Best fit for you · Book" on an
   example profile is misleading; until real listings exist the card says "Example profile"
   and Book is absent.
4. **Share securely.** Not built; needs a server and a decision to move data off-device.
5. **Four tabs.** The brief's four-tab nav is deliberately not adopted here, per the
   instruction to keep this inside My ADHD. Revisit once the loop has usage data.
6. **Radar retirement.** `docs/design/your-map.md` argued for the radar; this supersedes it
   and should say so in that file when phase 3 lands.
