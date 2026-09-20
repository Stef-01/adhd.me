# My ADHD Map — technical PRD

**Status:** BUILT. Phases 1 to 6 are implemented on `claude/adhd-map-ui-integration-45wjok`; §19 records what the build changed about this plan and why. Founder sign-off still open on the two decisions in §16 that remain. **Supersedes** the screen specifications in
[MAP-PLAN.md](MAP-PLAN.md) §3 and §8; MAP-PLAN remains the strategy note and the map of what the
tree already holds. **Sources reconciled here:** the founder brief of 2026-09-19 (the skills ×
life-area map, progressive questionnaires, matching from the map, one-tap GP summary) and the
**Calm Clarity** design system authored in Stitch the same evening
(`projects/3007208472686763697`, design system `assets/20907de9ca2f4fb49c329bb9e5a182e4`).

Where those two disagree with the tree's standing law, §3 names the conflict and decides it.

---

## 1. Why: the measured problem

The My ADHD tab is one screen of fourteen stacked cards. Measured on 2026-09-20 with the repo's
own instrument (`measure()` from `scripts/text-budget-lib.mjs`, 390×844, chrome excluded), seeded
with a record representing about three weeks of ordinary use:

| Route | State | Words | Ceiling | Verdict |
| --- | --- | --- | --- | --- |
| `/my-adhd` | empty | 21 | 60 | target |
| `/my-adhd` | lived in | **336** | 60 | **5.6× over** |
| `/today` | lived in (redirects to `/my-adhd`) | **336** | 60 | **5.6× over** |
| `/support` | lived in | **527** | 60 | **8.8× over** |
| `/manual` | lived in | **156** | 60 | **2.6× over** |
| `/my-map` | lived in | 56 | 60 | within |

The lived-in hub renders **8,014 px tall at 390 px wide — about nine and a half screenfuls**.
Evidence is committed alongside this document:

| File | What it shows |
| --- | --- |
| `docs/design/my-adhd-map/before/01-my-adhd-empty.png` | the empty hub, 21 words, the only state anything ever measured |
| `docs/design/my-adhd-map/before/02-my-adhd-lived-in.png` | the same route at 336 words and 8,014 px |
| `docs/design/my-adhd-map/before/03-my-map-radar.png` | the existing nine-axis radar, its polygon reading olive |
| `docs/design/my-adhd-map/before/04-support-path.png` | the support path at 527 words |
| `docs/design/my-adhd-map/before/05-survey-work-study.png` | a topic survey question |
| `docs/design/my-adhd-map/before/06-my-adhd-lived-in-desktop.png` | the hub at 1280, one column, unchanged |

### 1.1 The instrument has a hole, and it is the same hole as last time

`docs/design/text-budget-postmortem.md` records that the budget once measured above the fold
rather than the screen, and seventeen routes rather than all of them. The same class of error is
live now: `scripts/text-budget-lib.mjs` walks each route **in its empty state**, and `EXTRA`
carries a lived-in state for exactly one personal screen (`/my-map`, `map-lived`). Every other
screen in this tab is measured with no record in `localStorage`, which is the one state a
returning user never sees. The gate has been green over a 336-word screen for as long as that
screen has existed.

Closing that hole is **P0 of this work and ships in Phase 1**, before any redesign, so that the
redesign is measured against a truthful baseline. See §13.

---

## 2. Product intent, in one paragraph

A person opens My ADHD and sees a single picture of themselves that is mostly empty at first and
fills in as they play, answer and try things. Every filled part of that picture was put there by
something they did, and the picture never shows a number about them. From the picture they can
reach exactly three things: what one aspect of their functioning looks like across their life,
one useful next step, and a one-page summary they can hand to a GP. Underneath sits the full
needs model — pattern, impact, priority, confidence, contributors, strengths, strategies — and
none of it surfaces unless they ask.

---

## 3. Conflict register: Calm Clarity against the tree's standing law

Both documents are founder-authored. Calm Clarity (2026-09-19) is the newer, and it is the
artefact this work was told to integrate. Each conflict is decided below; each decision names the
rule id in `.claude/skills/adhdme-taste/SKILL.md` and its twin in `src/design/taste-register.ts`,
because changing a rule there without updating both is a build failure, not a review finding.

| # | Calm Clarity says | The tree says | Decision |
| --- | --- | --- | --- |
| C1 | "Simulated lighting, drop shadows and glassmorphic blurs are prohibited." | `{#type.glass-chrome}` — founder, 2026-09-08, twice: "implement liquid glass for all UI". | **Calm Clarity wins, scoped.** The My ADHD tab opts out of the glass tier. Play keeps its `[data-liquid]` scope untouched; the WebGL ground in `app/glass/liquid-glass.tsx` is unaffected. The rule text gains an explicit exception naming this tab, and the register entry is updated in the same commit. |
| C2 | "Primary action: solid charcoal fill `#1F2937`." | `{#type.no-dark-blocks}` — "No black or near-black fill as a block, a pill or a button on a patient screen." | **No real conflict; resolve by token.** `DESIGN.md` already makes the one primary an ink pill. Charcoal maps to `--ink`. The rule's intent is *no dark blocks*, not *no ink pill*; the register entry gains that clarification. One primary per screen stays. |
| C3 | Cool grey neutrals: `#F9F9F9`, `#E5E7EB`, `#111827`, `#6B7280`. | Warm neutrals: `--paper #fafaf7`, `--line #e8e6df`, `--ink #1a1c1c`, `--faint #5f5e59`; `{#type.palette-tokens}` forbids raw hex in components. | **Structure from Calm Clarity, values from the tree.** Every Stitch colour maps to an existing token (§4). Only genuinely new roles are added to `:root`. No component carries a hex. |
| C4 | Coral polygon `#E05338` / `rgba(242,106,79,.58)`. | The 2026-09-19 brief: "Avoid red." `--signal #ff4d2e` is the one warm red in the mark. | **Adopt the coral, constrained.** Calm Clarity is explicit that the coral "steers entirely clear of emergency red", and it is reserved to one object: the radar polygon. It may never carry a status, a warning or a word. It also fixes a defect `DESIGN.md` already admits — "nothing is filled with the deep gold; as a fill it reads olive" — which is exactly what the current radar does (`before/03`). Measured 3.68:1 on paper, 3.84:1 on white: passes the 3:1 floor for a graphical object. |
| C5 | Six-axis radar on the My ADHD hub. | `/my-map` is a nine-axis NWIA radar, founder-directed 2026-09-11, with `src/wellness/map.ts`, `e2e/my-map.spec.ts` and ADR 0005 behind it. | **The hub radar is the one the tab shows.** `/my-map` still exists and still passes its tests, but nothing links to it any more — the hub radar supersedes it. Retiring it deletes founder-directed work, so it waits on D2. |
| C6 | "Maximum 3 Current Focus chips", "never cluster more than 3". | `{#layout.five-then-rest}` — "a chooseable few with the remainder one tap away". | **Compatible.** Three is the few; the remainder is the aspect page. |
| C7 | Radar axis labels around the perimeter. | `e2e/controls.spec.ts` holds every control to 44 px; the current radar is `aria-hidden` with chips as the real controls, after a gate caught 17 px targets. | **Both, by width.** The comp puts the labels around the perimeter as buttons; at 390px six of those cannot be readable and 44px at once. One list of six controls, positioned two ways: a grid under the chart on a phone, absolutely around it from 768px. Same DOM, so the words are written once and counted once. The chart itself stays `aria-hidden`. §7.4. |

---

## 4. Design token contract

`:root` in `app/globals.css` stays the single owner of palette values. The table is the complete
mapping; a component that needs a Calm Clarity colour uses the token in the right-hand column.
Contrast measured 2026-09-20 against `--paper #fafaf7` unless stated.

### 4.1 Colours that already exist

| Calm Clarity | Hex | Tree token | Contrast | Note |
| --- | --- | --- | --- | --- |
| Header yellow | `#F5B731` | `--brand` `#f1bc31` | ink on brand 9.76:1 | Surface only, never text. |
| Header deep | `#E5A922` | `--brand-deep` `#e5b026` | — | Header hairline and hover step. |
| text-primary | `#111827` | `--ink` `#1a1c1c` | 16.37:1 | Stitch value measures 16.96:1; the tree's warm ink is kept for consistency with every other screen. |
| Tertiary / charcoal | `#1F2937` | `--ink` | white on ink 17.12:1 | Primary pill fill and focus ring. |
| text-secondary | `#4B5563` | `--muted` `#55534d` | 7.35:1 | |
| text-muted | `#6B7280` | `--faint` `#5f5e59` | 6.21:1 | Stitch value is 4.62:1, marginal; the tree's is better and warmer. |
| Canvas `#FAFAFA` | | `--paper` | — | |
| surface-card `#FFFFFF` | | `--surface-raised` → `--stone`, or white where a card must separate from stone | — | |
| border-subtle | `#E5E7EB` | `--line` `#e8e6df` | 1.19:1 | Hairline only. Never the sole carrier of a boundary that matters; focus and control edges use `--ink`. |

### 4.2 Colours that are new, and why each is needed

Four tokens are added to `:root`. Each has a role nothing existing can fill.

```css
/* The radar polygon. One object, one colour; never a status, never a word. (C4) */
--map-poly:        rgba(242, 106, 79, 0.58);  /* fill   */
--map-poly-line:   #e05338;                   /* stroke, 1.5px, 3.68:1 on paper */
--map-guide:       rgba(31, 41, 55, 0.16);    /* concentric guides and spokes  */

/* Strength chips. Sage is the only green in the product and says one thing: this works. */
--chip-strength-bg:   #dcfce7;
--chip-strength-ink:  #166534;                /* 6.49:1 on its own fill        */
```

`chip-sky` (`#E0F2FE` / `#0369A1`, 5.17:1) is **not** adopted. Calm Clarity offers it as an
alternative strength chip; a second strength colour would be a distinction without a meaning, and
`{#type.accent-live-tokens}` reserves colour for the value that changes. One strength colour.

**Chip fill is never the only carrier of meaning.** Sage on paper measures 1.05:1 as a boundary,
which fails the 3:1 graphical floor. It passes WCAG 1.4.1 because every chip carries its own
words; a test asserts no chip renders without a text label.

### 4.3 Type and space

Calm Clarity's scale is Plus Jakarta Sans throughout. The tree uses Plus Jakarta Sans for the
interface and **Newsreader** for display (`{#type.serif-display}`, `DESIGN.md`). Resolution: the
h1 on each screen in this tab stays Newsreader, as every other screen's does; everything Calm
Clarity calls `headline-md` and below is Plus Jakarta Sans and adopts its metrics verbatim.

The spacing scale lands as tokens in `app/styles/platform.css`, not as raw rem in components:

```css
--sp-xs: .25rem; --sp-sm: .5rem;  --sp-md: 1rem;
--sp-lg: 1.5rem; --sp-xl: 2.5rem; --sp-2xl: 3.5rem;
--gutter-mobile: 1rem;  --margin-mobile: 1.5rem;
--gutter: 1.5rem;       --margin: 2.5rem;
--map-radius-mobile: 320px;  /* Calm Clarity: 300–340 */
--map-radius-desktop: 460px; /* Calm Clarity: 420–480 */
--shell-max: 1140px;
```

---

## 5. Information architecture

Three tabs stay (D1). The My ADHD tab becomes a hub with one kind of click-through.

```
/my-adhd                 hub: the radar, what stands out, ≤3 focus chips, strengths, one step
/my-adhd/[aspect]        one aspect of functioning across the five life areas   (6 routes)
/my-adhd/share           take this to my GP: audience → preview → export
/my-adhd/history         strategies tried, insight verdicts                     (off the hub)
/today                   one card, one control                (stops redirecting)
/manual /medication /adjustments /start                        unchanged
/my-map                  retires into the hub radar           (D2)
```

**One kind of click-through.** Everything on the hub that is tappable leads to an aspect page: the
six radar chips, and the three focus chips (a need's subdomain maps to exactly one aspect). The
five life areas are not routes; they are the rows *inside* an aspect page. This is the matrix read
one column at a time, and it is why there is no second navigation idiom.

Each route is a server `page.tsx` carrying `metadata` (canonical + `ROBOTS_META` from
`@/security/robots`) that renders a client component in `app/`, the shape `/manual` and
`/medication` already use. Every path joins `also` on the My ADHD tab in `src/app-shell/tabs.ts:37`
so the tab stays lit; `src/app-shell/tabs.test.ts:30-40` already fails if a listed path is not a
real route.

`[aspect]` is a closed set of six: `generateStaticParams` over the ids, `notFound()` otherwise. It
is registered in `e2e/site-routes.ts`'s `DYNAMIC_ROUTE_PLAN` with a sample, and in `EXTRA` with a
lived-in state (§13).

---

## 6. The data layer: `src/model/matrix.ts`

One new file. Pure, derived on read, node-testable with a fake storage host, in the style of
`src/model/needs.ts`. **No new `localStorage` key and no new vocabulary**: the record already holds
everything. `readModel` tolerates absent fields without a version bump (the `checkpoints`
precedent, `src/model/store.ts:176`), so nothing here forces `MODEL_VERSION` past 1.

### 6.1 The six aspects

**Resolved against the comp (2026-09-20).** The founder's My ADHD screen names its six axes, and
they are not the tidy taxonomy this plan first guessed at:

**Starting · Focus · Organisation · Emotional regulation · Relationships · Sleep & energy**

Three are aspects of functioning, one is a subdomain and two are areas of a life. That mixture is
the right call for a person reading it: these are the six words somebody would use about their own
week. `Remembering` is a column in the founder's written matrix and not an axis in the drawn one,
so `memory` sits under Organisation — which is the comp's own reading, its Organisation panel
saying "admin and household filings create prospective memory fatigue".

```ts
export const ASPECTS = ["starting","focus","organisation","emotional-regulation","relationships","sleep-energy"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const ASPECT_LABELS: Readonly<Record<Aspect, string>> = {
  starting: "Starting", sustaining: "Sustaining", remembering: "Remembering",
  regulating: "Regulating", organising: "Organising", connecting: "Connecting",
};

/** What each aspect is, in the person's language. Shown on the aspect page, never on the hub. */
export const ASPECT_MEANINGS: Readonly<Record<Aspect, string>>;
```

Every one of the 25 subdomains in `src/model/layers.ts` maps to exactly one aspect. The table is
total by construction — a `Record<Subdomain, Aspect>`, so a new subdomain is a type error, not a
silent gap:

```ts
export const ASPECT_OF: Readonly<Record<Subdomain, Aspect>> = {
  activation: "starting", "deadline-design": "starting",
  attention: "sustaining", switching: "sustaining", noise: "sustaining",
  memory: "remembering",
  "emotional-regulation": "regulating", inhibition: "regulating",
  sleep: "regulating", energy: "regulating", movement: "regulating",
  appetite: "regulating", "medication-experience": "regulating",
  time: "organising", structure: "organising", workload: "organising",
  "living-environment": "organising", "study-context": "organising",
  "workplace-context": "organising",
  partner: "connecting", family: "connecting", manager: "connecting",
  teachers: "connecting", peers: "connecting", clinicians: "connecting",
};
```

### 6.2 The five life areas

`AREAS` is `DOMAINS` from `src/model/layers.ts:110` minus `understand`, which is the education
domain and not a part of a life. A need whose domain is `understand` is attributed to the area the
person named at the door (`record.onboarding.affects`, then the context module's `where` answer,
then `work-study`). That rule is one exported function with its own test, so the six "understand"
modules still move the map.

```ts
export const AREAS = ["work-study","relationships","daily-life","mind-emotions","sleep-body"] as const;
export type Area = (typeof AREAS)[number];
export function areaOf(need: Need, record: ModelRecord): Area;
```

### 6.3 Status: the five consumer words

The comp uses **five**, not the brief's four. The extra one is **Mostly supported**, and it earns
its place: it is the difference between "there is nothing here" and "there is something here and
you have it handled", which is a thing somebody built and the map should say so.

```ts
export type CellStatus =
  | "unexplored" | "still-learning" | "working-well"
  | "mostly-supported" | "worth-improving" | "needs-support";
```

The comp renders `Needs support` in the error container (`#ffdad6` / `#93000a`), which its own
colour rules forbid — "emergency red indicators, crimson warnings and danger alerts are strictly
forbidden". The build uses an ink outline instead, per §4.

Resolved against the best need in the cell, first match wins:

| Status | Rule |
| --- | --- |
| `unexplored` | no need and no contributor touches this (area, aspect) |
| `still-learning` | only a contributor touches it, **or** the best need has `confidence === "low"` |
| `working-well` | `userPriority === "no"`, **or** `functionalCost <= 3`, **or** a strength is named and cost < 5 |
| `needs-support` | `functionalCost >= 7` **and** `userPriority === "yes"` |
| `mostly-supported` | a strategy here worked, at a bearable cost |
| `worth-improving` | everything else |

`needs-support` deliberately outranks `mostly-supported`: worked at and still costly is the
strongest care-navigation signal the product has, and softening it would hide the person who most
needs the next screen.

`working-well` is the row that makes the brief's "strong pattern, not currently a problem" true:
someone who reports constant hyperfocus at zero cost gets a filled cell that reaches outward and
generates no provider recommendation, because `escalationEligible` (`src/model/recommend.ts:65`)
never sees it.

**No status word may read as pathology.** A test asserts no label matches
`/deficit|impair|disorder|abnormal|severe|risk/i`, mirroring the refusal in `src/model/events.ts`
§68. `CellStatus` ids are internal; only `STATUS_LABEL` reaches a screen.

### 6.4 The exported surface

```ts
export interface Cell {
  readonly area: Area;
  readonly aspect: Aspect;
  readonly status: CellStatus;
  /** A strength named here by a module or a survey option. Null unless something is finished. */
  readonly strength: string | null;
  /** What put it on this status, said as the act the person took. Empty when unexplored. */
  readonly because: string;
  /** The needs that fed it, strongest first. */
  readonly needs: readonly Need[];
}

export interface AxisPoint {
  readonly aspect: Aspect;
  /** 0–1, what the polygon draws. Derived from evidence, NOT from cost. See 6.5. */
  readonly reach: number;
  /** True when the model has too little to place this axis: dotted spoke, polygon detaches. */
  readonly stillLearning: boolean;
  readonly status: CellStatus;
  readonly strength: string | null;
}

/** 30 cells, always, in (area, aspect) order. */
export function matrix(record: ModelRecord): Cell[];
/** Six points, always, in ASPECTS order. The radar's only input. */
export function axes(record: ModelRecord): AxisPoint[];
/** One aspect across the five areas, plus what the aspect page needs. */
export function aspectView(record: ModelRecord, aspect: Aspect): {
  cells: Cell[]; top: Need | null; helps: string[]; strengths: string[]; learning: string | null;
};
/** The hub's three focus chips: the top needs by priorityScore, deduped by aspect. */
export function currentFocus(record: ModelRecord, limit?: number): Array<{ need: Need; aspect: Aspect }>;
/** The hub's one sentence. Authored per aspect, chosen by evidence — never generated. */
export function standsOut(record: ModelRecord): string | null;
/** Cells whose status changed between two records — the "map just got clearer" set. */
export function diff(before: ModelRecord, after: ModelRecord): Cell[];
```

### 6.5 Reach is evidence, not severity

This is the load-bearing decision of the whole visual, and getting it backwards would invert the
product's meaning.

Calm Clarity: *"outward dimensional sprawl signifies stability and ease, framing ADHD
characteristics around resilience and environmental fit rather than pathology."* A polygon that
reaches far because a person is struggling would say the opposite — a big shape would mean a big
problem, which is a severity chart, which is the thing both this tree and that design system
refuse.

So **reach is how much the person has built and confirmed on that axis**, exactly the ladder
`src/wellness/map.ts` already established and proved with tests:

| Reach | Meaning | Rung it inherits |
| --- | --- | --- |
| 0.08 | nothing here yet | `unmapped` — and the spoke is dotted |
| 0.34 | you have named something here | `named` |
| 0.56 | you went through a run here | `explored` |
| 0.78 | you are carrying a strategy from here | `kept` |
| 1.00 | you said a strategy here worked | `working` |

`RUNG_REACH` in `src/wellness/map.ts:66` holds these five numbers already. `matrix.ts` imports
them rather than restating them; a test pins the two readings together in both directions, the
same guard `dimensionsOf` has today.

`status` and `reach` are therefore **orthogonal and both true**: reach says how much you have
built, status says how it is going. A cell can be `needs-support` with a long spoke (you have
worked at this and it is still hard — the strongest care-navigation signal in the product) or
`working-well` with a short one (you mentioned it once, it is fine, nothing to do).

`stillLearning` is `reach <= 0.08 || confidence === "low"`, and it is what draws the dotted spoke
and detaches the polygon, per Calm Clarity's "Axis Confidence States". That is the honest rendering
of *unasked*: the absence sits on the app, not on the person.

---

## 7. The radar component

`app/my-adhd-radar.tsx`, a client component. It replaces the geometry in `app/my-map.tsx:32-43`
and keeps that file's two hard-won solutions (§7.4).

### 7.1 Geometry

```ts
const N = 6;                     // axes
const SIZE = 320;                // mobile viewport; 460 at ≥1024px via a prop
const CENTRE = SIZE / 2;
const R = SIZE / 2 - 28;         // 28px perimeter reserve for axis labels
const RINGS = [0.25, 0.5, 0.75, 1];   // four concentric guides, Calm Clarity says 4–5
const NODE_R = 4;                // "smooth circular nodes with 4px radii"
const angle = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;  // first axis at 12 o'clock
```

With six axes the guides are regular hexagons, not circles: `ring(k)` returns the six points at
`RINGS[k]` and closes the path. Stroke `--map-guide` at 1px.

### 7.2 The polygon, and how it detaches

**The comp settles this, and more simply than this plan proposed.** The polygon stays ONE closed
shape; at an axis the model cannot place it pulls in to near the centre and the knot is drawn
hollow and dotted instead of solid. "Detach" means the shape visibly declines to claim a position
there, not that the path breaks. One path, one fill, no run-splitting.

```
polygon  → always closed, fill --map-poly, stroke --map-poly-line 1.75px, linejoin round
node     → r=3.5 filled; at an unplaced axis r=3, fill none, dashed stroke
spoke    → at an unplaced axis, stroke-dasharray 3 4
reach    → floored at 0.1 so an unplaced knot is still visible off centre
```

A dotted spoke renders `stroke-dasharray: 3 4` on `--map-guide`, and its node renders as a hollow
4px circle rather than a filled one. No gradients anywhere (`"Never apply interior gradients"`).

### 7.3 Motion

The only animation in this tab. On the survey result screen (§9), each newly confident axis
animates its node from `r=0` and the polyline segment interpolates from the previous reach to the
new one: **240 ms per axis, 60 ms stagger, `cubic-bezier(.2,.7,.3,1)`**, at most two axes animated.
Everything else is an opacity change. Under `prefers-reduced-motion: reduce` the end state renders
immediately with no transition — not a shortened one. No scale bounce, no confetti, no badge
(`{#interaction.hover-focus}`, and Calm Clarity's "Zero scale bounces, confetti, or gamified
animations").

### 7.4 Accessibility, carried over from the existing radar

Two things `app/my-map.tsx` learned the hard way and this component must not relitigate:

1. **The chart is `aria-hidden`.** Six perimeter labels cannot be readable *and* be 44 px targets
   at 390 px. `e2e/controls.spec.ts` caught 17 px targets on the current map.
2. **The chips below are the real controls and the text equivalent.** Six `<button>`s (or `<a>`s
   to the aspect route), each ≥44 px, each carrying its aspect label and its status word, in a
   `<ul>` with `grid-template-columns: minmax(0, 1fr)` — the literal fix for the 168 px sideways
   scroll `e2e/viewports.spec.ts` caught at 320 px.

Axis labels still render inside the SVG for sighted users, capped at two lines on mobile per Calm
Clarity, positioned by quadrant so no label overlaps a neighbour.

---

## 8. Screen specifications

Copy is given verbatim. Word counts are what `measure()` will count (visible text, chrome
excluded); the ceiling is 60 and the target 40, per `CLAUDE.md`.

### 8.1 `/my-adhd` — the hub

Comp: Stitch `0fd5362adc6546dfb346cf872bef9d2d` ("My ADHD Mobile Hub"), desktop
`fb9d425dc582479fa2da2db303b132e6`.

**Mobile stack**, in Calm Clarity's order: header → radar → what stands out → ≤3 focus chips →
strengths → exactly one next step.

```
My ADHD.                                                        2

[ 320px six-axis radar; Regulating and Connecting dotted ]      0  (aria-hidden)
  Starting · Sustaining · Remembering ·
  Regulating · Organising · Connecting                          6  (the six chips)
  each chip carries its status word                            ≤12

What stands out                                                 3
Starting is where most of the friction is.                      8

Current focus                                                   2
Starting work · Deadlines · Remembering plans                   5

Working for you                                                 3
Deep focus once you start · Short deadlines                     7

Make the first step concrete                                    5
3 min · Open →                                                  3
                                                        total  ≈56
```

Budget: **target 45, ceiling 60.** The chips' status words are the variable cost, so the lived-in
state is measured, not the empty one. If a real record pushes past 60 the cut is the strengths
line to one chip, never the sentence.

**States**

| State | Render |
| --- | --- |
| no record yet | `<p role="status">` one line while the device is read, as today |
| record, onboarding incomplete | radar all-dotted at 0.08; one line "Two minutes so this can be about you."; the Start control. This replaces today's lead card. |
| onboarding done, no needs | radar all-dotted; "Nothing here yet."; one control to the first module |
| lived in | as above |
| safety event standing | `SafetyScreen` replaces the whole body, unchanged behaviour |

**Everything that leaves the hub.** Today's card moves to `/today`. Insight cards move into the
aspect pages as inline verdict chips. Strategy history moves to `/my-adhd/history`. The Manual,
Adjustments and Medication cards become three words in the footer row (Medication only when
onboarding said so; Adjustments moves onto the Work & Study rows of the aspect pages where it is
actually relevant). **The delete control moves into the settings sheet** (`app/app-settings.tsx`)
under "Your data" — a destructive control belongs where a person looks for it, not under their
picture of themselves.

**No digit anywhere.** `e2e/my-adhd.spec.ts` asserts `not.toMatch(/\d/)` on `main` after stripping
the wordmark, exactly as `e2e/my-map.spec.ts:38` does today. This is why cost never renders here.

### 8.2 An axis, opened in place — **a sheet, not a route**

The founder's comp opens a domain in a drawer over the map rather than navigating away, and it is
right to: it keeps the hub as the single object a person is looking at, which is the "minimalist
end-state" the brief asks for. So `/my-adhd/[aspect]` is **not built**. `app/my-adhd-sheet.tsx`
reuses `app/sheet.tsx`, so an axis has the same grabber, detents, focus trap and Escape as every
other modal in the product. The tab therefore has one kind of click-through and no new routes.

```
← My ADHD                                                       2

Starting.                                                       1
Hardest at work, easier at home.                                6

Work & Study        Needs support                               4
Daily life          Worth improving                             4
Relationships       Still learning                              4
Mind & emotions     Still learning                              4
Sleep & body        Working well                                4

What helps                                                      2
Another person nearby.  ·  A clear first action.                7

Understand my work patterns                                     4
8 questions, 2 min →                                            4
                                                        total  ≈46
```

Ceiling 60. Five area rows at four words each is 20 of the budget and they are the screen's point,
so the sentence and the helps lines are what get cut if a longer status word pushes it over.

- Each area row is a 44 px row. Tapping it discloses that cell's `because` line in place — one
  line, no navigation, and it collapses on second tap. An `unexplored` row shows no status word at
  all and its disclosure offers the module that would fill it.
- **Status pills** use §4: `needs-support` is `--ink` outline on paper, `worth-improving` is
  `--accent-tint` fill, `still-learning` is a dotted `--line` outline, `working-well` is the sage
  chip. No traffic light, no red, no dots, no numbers.
- **What helps** draws from `summarise().helps` and `Need.strengths`, two lines maximum.
- **Learn more** is the offer: the area's topic survey when uncompleted, else the next
  `INTERACTIVE_MODULE` targeting this aspect's subdomains minus `record.completed`. The label is
  always the survey's own title as a verb phrase plus its question count and minutes — never
  "complete assessment".
- **Get more help** renders only when `escalationEligible(need, record)`, as a quiet secondary
  link to `/support`.
- **Insight verdicts** appear here, inline: where a confirmed insight fed this aspect, its heading
  is a row with the three chips (That's me / Partly / Not really) already wired to `recordInsight`.

### 8.3 `/today`

```
Today.                                                          1
Starting work before it becomes urgent.                         6
Why deadlines switch your brain on                              6
8 min · Open →                                                  3
View my map                                                     3
                                                        total  ≈19
```

`TodayContent` moves here whole. The safety screen and the waiting checkpoint keep replacing it.
Target 25.

### 8.4 `/my-adhd/share` — take this to my GP

Comp: Stitch `bc0db3fad57c4985b6e50dedeb517068`.

Two steps. **Audience** (target 20):

```
Take this to…                                                   3
My GP · A psychologist · Work or university · Myself            9
```

**Preview**: the summary rendered as the document it is, each section with a 44 px remove control,
then `Export` (ink pill), `Copy`, `Print`. One muted line: "Nothing leaves your device until you
send it." Budget §13.3.

### 8.5 `/my-adhd/history`

Strategy history grouped by outcome, and the insight verdicts not shown on an aspect page. Ceiling
60; it is a list of the person's own strategy titles, so it is measured lived-in and the grouping
headings are the only prose.

---

## 9. The questionnaire loop: give data, receive insight

Three levels already exist (`MAP-PLAN.md` §1). What changes is the end of one.

Comp: Stitch `c78d0fb412f04ec8a82928e44816f0c4` ("Your map just got clearer").

1. `TopicSurveyScreen` snapshots the record in memory when the survey starts. Never stored.
2. On finish it computes `diff(before, after)` and `axes()` for both.
3. The result screen opens on the radar at its **previous** state, then animates only the axes
   that changed (§7.3), then reveals:

```
Your map just got clearer.                                      5
Your work difficulties look more about starting and
structuring than about holding attention once you are in.      17
Why deadlines switch your brain on                              6
8 min · Open →                                                  3
Back to my map                                                  4
                                                        total  ≈35
```

The sentence is **authored, never generated**. `TopicSurvey` gains:

```ts
/** The one sentence the result earns, chosen by which frictions ranked 1st and 2nd. */
readonly insights: ReadonlyArray<{
  readonly when: { first: Subdomain; against?: Subdomain };
  readonly sentence: string;
}>;
export function insightFor(result: SurveyResult): string | null;
```

Chosen by `result.frictions[0]` against `frictions[1]`, falling back to a per-survey default. Every
sentence passes `lintLandingCopy` and `lintEducationCopy` in the unit suite, as the surveys' text
does today (`src/model/surveys.test.ts`).

This replaces the result screen's current four cards (friction, amplifier, contributor, strength),
which is a net deletion of words, not an addition.

**Go deeper** (Phase 6): `TopicSurvey.deeper?: SurveyQuestion[]`, 10–20 questions in the same option
shape, offered by a fourth rule in `src/model/offer.ts` — `would.drive`: the area's survey is
complete, cost ≥ 7, confidence high, no deeper set complete, fatigue not high.

---

## 10. Support and matching, emerging from the map

- **`/support`'s first step becomes "Who could help?"**: `professionsFor(need)` with each
  profession's own one-line reason from `PROFESSION_ENTRIES`, then "Best fit for you" from the
  finder's ranked list with `orderByProblemFit` applied. This is a re-cut of what the screen
  already renders, and it is the 527-word screen's diet: the referral brief's five textareas leave
  entirely, replaced by one link to `/my-adhd/share`.
- **"Why this match" chips.** `fitTags(provider, need)` already returns the matched expertise tags
  in taxonomy order (`src/support/problem-fit.ts:63`); today only the one-sentence `fitReason`
  renders (`app/care-finder.tsx:183,786`). Render the first three as chips under "Why this match?"
  using `EXPERTISE_LABELS`. These are the same tags that filled the person's cells, which is what
  makes the match traceable rather than an ad.
- **Strengths enter the ranking.** New in `problem-fit.ts`:

```ts
/** +1 where a need's strengths say accountability works and the provider's profession works that way. */
export function strengthFit(provider: Fittable, need: Need | null): number;
/** "Because accountability works for you, regular check-ins may suit you better than a self-directed approach." */
export function strengthReason(provider: Fittable, need: Need | null): string | null;
```

  One closed table from strength phrase to profession trait, one test, no free text. It rides
  `orderByProblemFit` as a tiebreak so no GP moves.
- `escalationEligible` stays the only gate. A `working-well` cell never reaches a provider.
- The bidirectional GP service (`src/lib/matching/`, ADR 0007) is **untouched** by this work.
  Mapping `Need[]` into `StructuredSignals.careAsks` is a later, separate change.

---

## 11. The GP summary

`src/model/summary.ts`, pure and tested; `src/collateral/gp-summary.ts` for the `.docx`, following
`src/collateral/one-pager.ts`'s pattern (build an object, render from it, golden-test the render).

```ts
export type Audience = "gp" | "psychologist" | "work" | "self";
export interface GpSummary {
  priority: string;
  highestImpact: string[];      // ≤3 needs by priorityScore with cost ≥ 5
  context: string[];            // contributors' notes + need.context
  helps: string[];              // summarise().helps + strengths
  tried: Array<{ title: string; outcome: ExperimentOutcome | "pending" }>;
  otherAreas: string[];         // one line per other area, marked low priority where userPriority is "no"
  goal: string | null;
  supports: Profession[];       // only when escalationEligible
  matched: Array<{ name: string; profession: string }>;  // opt-in, default off
  ownWords: { manual: string; medication: string | null };  // verbatim
}
export function gpSummary(record: ModelRecord, audience: Audience): GpSummary;
export function summaryText(s: GpSummary, removed: ReadonlySet<keyof GpSummary>): string;
```

**The rule this lives under.** `src/referrals/document.ts` states the tree's gate: *no clinical text
that ADHD.ME authors, templates or generates.* So the summary contains no narrative and no
sentence about the person. Every line is one of three things:

1. a structured row the record already holds (a need's label, its contributors' notes, a strategy
   title and its outcome, a profession name the app already showed the person),
2. the person's own words verbatim (`manualText(record)`, the medication note, the goal they set),
3. a section heading.

`summaryText` joins rows with line breaks and has no sentence templates. **A test asserts every
output line is a heading, a record row, or the person's own text** — the machine-checkable form of
the rule.

Audience changes emphasis, never truth: the psychologist version leads with the mind-emotions rows,
the work version leads with `ADJUSTMENT_TRACKS` and omits medication, "Myself" keeps everything
including strengths.

Export: **Copy** to clipboard, **Print** via `window.print()` with a print stylesheet scoped to the
preview (that is the PDF, made by the browser, no dependency, no server), **Word** via a dynamic
`import("docx")` so the hub pays nothing for it. **Share securely is not built** — it needs a record
that outlives the device, which is the open decision in ADR 0008. The screen does not offer it and
the privacy copy stays true.

---

## 12. Telemetry

`src/model/events.ts` refuses free text by construction and holds a closed event list. Four events
are added, carrying closed vocabulary only — an aspect id, an area id, a status id, a rule id.
Never a need label, never a cost, never a survey answer.

| Event | Payload | Fires |
| --- | --- | --- |
| `MAP_VIEWED` | `{ filled: number }` count of confident axes | hub mount |
| `MAP_AXIS_OPENED` | `{ aspect }` | aspect page mount |
| `MAP_CLARIFIED` | `{ aspect, changed: number }` | survey result, after the animation |
| `SUMMARY_EXPORTED` | `{ audience, format }` | export, copy or print |

`filled` and `changed` are counts of axes, not measurements of a person, which is the line
`events.ts` §68 draws.

---

## 13. The budget instrument

### 13.1 Lived-in states (P0, Phase 1)

`scripts/text-budget-lib.mjs` gains a `seed` recipe in `reach()` that writes a canonical
`adhdme.model.v1` before navigating, and `EXTRA` gains:

```js
{ path: "/my-adhd",                 state: "model-lived", name: "My ADHD, lived in" },
{ path: "/my-adhd/starting",        state: "model-lived", name: "An aspect, lived in" },
{ path: "/my-adhd/share",           state: "model-lived", name: "GP summary, preview" },
{ path: "/my-adhd/history",         state: "model-lived", name: "History, lived in" },
{ path: "/today",                   state: "model-lived", name: "Today, lived in" },
{ path: "/support",                 state: "model-lived", name: "Support, lived in" },
{ path: "/manual",                  state: "model-lived", name: "My manual, lived in" },
{ path: "/survey",                  state: "survey-result", name: "Your map just got clearer" },
```

The seed record lives in one place shared by the instrument and the e2e suite — `e2e/support/`
already holds fixtures, and `e2e/my-map.spec.ts:15` has a `LIVED` constant that should become that
shared export rather than a second copy.

**This will turn the gate red on landing**, at 336, 527 and 156 words. That is the point: Phase 1
lands the measurement, Phase 2 and Phase 5 land the screens that pass it. The gate is allowed to be
red for exactly the window between them, and `e2e/text-budget.spec.ts` carries a dated comment
saying so, naming the three routes and this PRD.

### 13.2 No new exceptions on patient screens

`CEILING` gains nothing for the hub or the aspect pages. They fit.

### 13.3 One reasoned raise, for the GP preview

The preview is a document a person is about to hand to a clinician; measuring it as a screen would
be measuring the wrong object, the same error the postmortem records. It joins `LONG_FORM` with a
`CEILING` of **120**, reasoned in the same comment block as the finder's 72, and the *audience*
step before it stays at 20 words with no exception.

---

## 14. Test matrix

| Layer | File | What it holds |
| --- | --- | --- |
| unit | `src/model/matrix.test.ts` | `ASPECT_OF` is total over `Subdomain`; every aspect is reachable; each status rule has a case; "strong pattern, no problem" resolves `working-well`; reach imports `RUNG_REACH` and agrees in both directions; `diff` returns exactly the changed cells; no status label matches the pathology regex; `areaOf` attributes every `understand` module |
| unit | `src/model/summary.test.ts` | every `summaryText` line is a heading, a record row or the person's own words; audience changes order not facts; `matched` is absent unless opted in |
| unit | `src/learn/surveys.test.ts` (extended) | every `insightFor` sentence passes `lintLandingCopy` and `lintEducationCopy`; every survey has an insight for its top two frictions; `eachOf` proves the loop ran |
| unit | `src/support/problem-fit.test.ts` (extended) | `strengthFit` never reorders a GP; `strengthReason` returns null rather than a guess |
| unit | `src/design/taste-register.test.ts` | the C1 and C2 rule amendments exist in both the skill and the register |
| e2e | `e2e/my-adhd.spec.ts` (new) | empty hub is the door; lived-in hub has no digit; six chips ≥44 px; a chip opens its aspect; the aspect page names the friction and five rows; a row discloses in place; the settings sheet deletes; axe clean on both |
| e2e | `e2e/my-map.spec.ts` (rewritten) | the radar moves because the person did something; two dotted axes detach the polygon; a run makes one solid; reduced motion renders the end state |
| e2e | `e2e/share-summary.spec.ts` (new) | audience → preview; remove a section and it leaves the copied text; Word downloads a non-empty `.docx`; print stylesheet applies |
| e2e | `e2e/text-budget.spec.ts` | every screen within its ceiling, lived in |
| e2e | `controls`, `viewports`, `a11y`, `app-shell` | 44 px everywhere; no sideways scroll 320→1440; axe clean; the tab stays lit on all six aspect routes |

---

## 15. Phases

Each phase is independently shippable, runs `pnpm typecheck && pnpm test` plus the e2e specs it
touches, and puts the text-budget table in the commit message.

| Phase | Lands | Done when |
| --- | --- | --- |
| **1. Truth** | lived-in states in the instrument (§13.1); `matrix.ts` + tests; `summary.ts` + tests. No UI. | the gate reports the real numbers; unit suite green |
| **2. The hub** | `app/my-adhd-radar.tsx`; `/my-adhd` rewritten; six aspect pages; `/today`; `/my-adhd/history`; delete into settings; tokens in `:root`; C1/C2 register amendments | hub ≤60 lived in, aspect ≤60, Today ≤40; no digit; axe clean; `e2e/my-adhd.spec.ts` green |
| **3. The map moment** | `insightFor`; survey result rewritten around `diff`; the animation | the lane fills and the sentence reads, in e2e, with and without reduced motion |
| **4. Share** | `/my-adhd/share`; print stylesheet; `gp-summary.ts`; the referral brief's five textareas deleted from `/support` | `.docx` downloads; `/support` drops below 60 lived in |
| **5. Support from the map** | "Who could help?" first; `fitTags` chips; `strengthFit` | chips match the person's cells, in e2e |
| **6. Go deeper** | `deeper` sets for work-study and relationships; the fourth offer rule | fatigue tests green |

**End-to-end walk, on a 390 viewport, as acceptance for Phase 5:** Start → one module → the hub
shows one confident axis → tap it → the aspect page names the friction across five areas →
Understand my work patterns → the axis fills and the sentence reads → Explore this → Get more help
→ the chips on the provider card match the cells → Take this to my GP → Print.

---

## 16. Decisions the founder owns

The plan proceeds on the **bold** default. Each is a small, named change if the answer differs.

**D1 — A fourth tab.** The brief's IA is Today · Learn · My Map · Support.
**Default: three tabs stay**; `/today` becomes a real screen reached from the hub. `TAB_COUNT_RANGE`
already allows up to five, and the `Sun` icon is already in the union, so adding it later is one
entry in `APP_TABS` plus the label assertion at `tabs.test.ts:27`.

**D2 — One radar or two. STILL OPEN, and the only thing blocking a tidy tree.** The hub radar
(six axes, coral, confidence-dotted) and `/my-map` (nine NWIA dimensions, rung words,
founder-directed 2026-09-11) are the same idea at different granularity. As built, the hub radar
is the one the tab shows and **nothing links to `/my-map` any more**: it is reachable only by
typing the URL, and it is dead weight in that state. On a yes it retires — the route redirects to
`/my-adhd`, `src/wellness/map.ts` keeps only `RUNG_REACH` (which `matrix.ts` imports), and
`e2e/my-map.spec.ts` goes. ADR 0005 and the NWIA attribution stay in `src/wellness/nwia.ts`
either way. On a no, it gets one word in the hub's footer row and the hub is re-measured.

**D3 — The six axes. RESOLVED 2026-09-20** against the comp's own markup, which the founder
supplied: Starting · Focus · Organisation · Emotional regulation · Relationships · Sleep & energy.
Built. Nothing outstanding.

**D4 — The tab's name.** **Default: "My ADHD" stays**, and the map is its first screen.

**D5 — The GP preview's budget.** **Default: `LONG_FORM` with a reasoned ceiling of 120.**

**D6 — Secure sharing.** **Default: out of scope** until ADR 0008 is decided.

---

## 17. What could not be verified, and why — CLOSED

The Stitch project's rendered screens and their HTML are served from `lh3.googleusercontent.com`
and `contribution.usercontent.google.com`. Both are **denied by this environment's egress policy**
(`403` on CONNECT, recorded in the proxy's own failure log). The API host `stitch.googleapis.com`
is allowed, so everything in §3, §4 and §7 is taken from the design system's machine-readable
tokens and its full style guidelines, which are authoritative and complete.

**Closed 2026-09-20.** The founder pasted the rendered HTML of four comps into the thread, which
is everything the images would have shown and more: the axis names, the five status words, the
exact radar geometry (`viewBox 0 0 500 500`, centre 250, R 180, four rings, first axis at twelve
o'clock), the polygon's real detach behaviour, the 7/5 desktop split and the drawer. D3 is
resolved, §7.2 is corrected, and the build follows the markup rather than a reading of the
guidelines. The two hosts remain blocked, which only matters now for looking at future comps.

## 18. Appendix: Stitch references

Project `3007208472686763697` ("Minimalist ADHD Tab Design"), design system
`assets/20907de9ca2f4fb49c329bb9e5a182e4` ("Calm Clarity").

| Screen | Id | Device | Origin |
| --- | --- | --- | --- |
| My ADHD | `97006aae7d2b46ee842e970a729d328d` | desktop | founder |
| ADHDme Support & Map Prototype | `a01650b50fe145c2b3ff92b32bcf10b7` | desktop | founder |
| Smart Recommendations Results | `754d927383f84a15b40ad51a6328cf4e` | desktop | founder |
| Clinician Finder Landing | `c608037c43fc47d4beb1bb8fa5618d57` | desktop | founder |
| Clinician Profile — Dr Leila Haddad | `f950d2594ba4476a96505ec6724d7272` | desktop | founder |
| PRD_My_ADHD_Tab.md | `17459769496146058480` | — | founder, uploaded |
| **My ADHD Mobile Hub** | `0fd5362adc6546dfb346cf872bef9d2d` | mobile | generated for this PRD, §8.1 |
| **Starting Detail** | `eebb4727df47457dabb85d2f2687e4fe` | mobile | generated for this PRD, §8.2 |
| **Your map just got clearer** | `c78d0fb412f04ec8a82928e44816f0c4` | mobile | generated for this PRD, §9 |
| **Take this to my GP** | `bc0db3fad57c4985b6e50dedeb517068` | mobile | generated for this PRD, §8.4 |
| **My ADHD Desktop Hub** | `fb9d425dc582479fa2da2db303b132e6` | desktop | generated for this PRD, §8.1 |

The five generated comps were produced against the Calm Clarity design system from the copy in §8
and §9 of this document, so the comps and the build specify the same strings.

---

## 19. What shipped, and what the build changed about this plan

Implemented on `claude/adhd-map-ui-integration-45wjok`. Where the build differs from §5 to §9 as
first written, the reason is always the same: the founder supplied the comps' own markup on
2026-09-20, and the markup is a better source than a reading of the guidelines.

| Planned | Shipped | Why |
| --- | --- | --- |
| Six aspects incl. a coined "Connecting" | The comp's own six | D3, resolved from the markup |
| Four status words | Five, with "Mostly supported" | The comp uses five, and the fifth is a real distinction |
| `/my-adhd/[aspect]` routes | A sheet over the hub | The comp opens a drawer; it keeps the hub the single object, and it adds no routes |
| `/my-adhd/share` route | A sheet, opened from "Share" top right | Same, and the brief puts Share at the top right |
| Polygon splits into polylines to detach | One closed polygon that pulls in, with a hollow dotted knot | The comp's own behaviour, and simpler |
| Reach only, for "your map just got clearer" | Reach **or** the word | Counting reach alone made the reward silent for the person who had earned it most — see `movedAxes` |
| Five area rows as routes | Five area rows inside the sheet | The matrix, one column at a time |

### 19.1 What the gates caught that review did not

1. **The class names collided.** `.map-axes`, `.map-axis`, `.map-chart`, `.map-ring`, `.map-you`
   and `.map-foot` already belonged to `/my-map`'s nine-axis radar. The new rules repainted that
   page, and at 1280 an absolutely positioned axis seat landed on top of the wordmark.
   `e2e/controls.spec.ts` found it as "a control something is painted over"; every new selector is
   scoped under `.map-screen` now.
2. **The sheet kept its blur.** The map's sheets portal to `document.body`, so the flat scope
   could not reach them and Calm Clarity's "scrim without blur filters" was quietly violated.
   Fixed with `:has(.map-sheet)`.
3. **The manual's own headings leaked into the GP summary.** `manualText()` wraps a person's words
   in this app's section titles, so "What helps me" appeared in a document whose rule is that
   every line is a heading, a record row, or the person's own words. `summary.test.ts` failed on
   exactly that line. The summary reads the three raw fields now.

### 19.2 Files

| Area | Files |
| --- | --- |
| The reading | `src/model/matrix.ts`, `src/model/summary.ts`, and their tests |
| The screens | `app/my-adhd.tsx`, `app/my-adhd-radar.tsx`, `app/my-adhd-sheet.tsx`, `app/my-adhd-share.tsx`, `app/my-adhd-history.tsx`, `app/today-screen.tsx` |
| Routes | `app/(app)/my-adhd/history/page.tsx`, `app/(app)/today/page.tsx` |
| Style | `app/styles/map.css`, four tokens in `app/globals.css` |
| The loop | `insightFor` + `SURVEY_INSIGHTS`, the rewritten result in `app/topic-survey.tsx` |
| Level 4 | `WORK_DEEPER`, `RELATIONSHIPS_DEEPER`, the `would.drive` rule in `src/model/offer.ts` |
| Support | `strengthFit`/`strengthReason` in `src/support/problem-fit.ts`, chips in `app/finder-stages/profile-stage.tsx`, the rewritten `app/support-path.tsx` |
| Instrument | `LIVED_RECORD` and eight lived-in states in `scripts/text-budget-lib.mjs` |
| Law | the glass exception and the ink-pill clarification in `.claude/skills/adhdme-taste/SKILL.md` |
| Tests | `e2e/my-adhd.spec.ts`, plus additions to the matrix, summary, survey and problem-fit suites |
