# The care plan, on the map

Founder direction, 2026-09-20: integrate "the chronic health care plan inclusion ability", recommend
key providers so a person "completely uses up their 10 entitlements", and hold it as their plan in
the My ADHD tab — minimalist, impeccable, as little text as possible.

This is the technical PRD, kept current with what shipped. One card on `/today`, one sheet under it,
up to four provider rows, one new section in the GP summary, and nothing else. Every screen budget
below is a hard number, and the whole feature adds **two words** to a screen.

**Built, 2026-09-21**, phases 1 to 6, behind D2: no screen names an entitlement count, an item number
or an eligibility rule, because the numbers are the person's own. §6 records the one thing the build
changed its mind about — the card is on `/today`, not the hub — and why that is a founder's question
rather than a budget accident.

Read with [MAP-PRD.md](MAP-PRD.md) (the tab this lives in), [MAP-CONNECTIONS.md](MAP-CONNECTIONS.md)
(C1 and C2, which constrain the recommendation), and `src/directory/fees.ts` (the refusals).

---

## 1. What a person actually gets, and the premise worth correcting first

A GP-written chronic condition management plan is the mechanism that turns "you should see an OT" into
subsidised sessions. The founder's brief calls it ten entitlements. That figure is, as far as this
document can establish, **two numbers added together that do not both apply here**:

- **Individual allied health services: five per calendar year.** The general entitlement, and the one
  that matters for this cohort.
- **Group allied health services: five, for type 2 diabetes.** Diabetes-specific in the scheme as
  this document understands it, and therefore not available to a person whose plan is written for
  ADHD.

So the realistic figure for an ADHD plan is **five individual services per calendar year, not ten**.
It also moved recently: the GP Management Plan and Team Care Arrangements were replaced by a single
GP chronic condition management plan in July 2025, and the referral entitlement carried across.

**The design does not depend on any of that being right, and that is deliberate.** The app does not
know how many services a person has. Their plan does, because their GP wrote it on it. So the
allowance is DATA the person confirms — "my plan allows five", "my plan allows ten" — and the app's
job is only to help them spend what they have. A hard-coded 5, or 10, is a number that goes stale
the next time the MBS changes and is wrong for somebody the day it ships.

**Nothing in this feature's copy may state an entitlement count, an item number or an eligibility
rule until a clinician has confirmed it against the current MBS.** That is decision **D3** below,
tracked the same way as the NSW/QLD pathway claim in `README.md`.

---

## 2. Three refusals this feature inherits

Each is already law in the tree, with a test behind it. This feature is the place each one gets
tempting again, so they are restated as the shape of the build rather than as warnings.

**No money. Not a rebate, not a gap, not a saving.** `src/directory/fees.ts` refuses
`outOfPocketCents` and `rebateCents` by construction — "what we charge is a fact, what you will pay
is not, and this product will not say it" — and the stated reason for refusing a rebate is that it
"is a fact about the patient's Medicare entitlement rather than about the practice". This feature is
made of facts about the patient's entitlement, so the line has to be drawn precisely rather than
inherited by vibe:

> A **count of services remaining on a person's own plan** is their own record, and this feature may
> hold it. A **sum of money** — a rebate, a gap, a total saved, "five sessions is worth $N" — is the
> arithmetic `REFUSED_FEE_FIELDS` exists to prevent, and no screen, type or export here may contain
> one. `CarePlan` has nowhere to put a cent value, and its test says why.

**No eligibility claim.** Whether a person's ADHD qualifies for a plan is their GP's clinical
judgement. The app may say what a plan IS and what a person may ask about. It may never say "you are
eligible", "you qualify", or "you can get five free sessions". The copy asks a question of a GP; it
does not answer one.

**No clinical prose.** `src/model/summary.ts` already holds the rule for the GP export: "this app
writes no clinical prose, so the document is section headings, rows the record already held, and the
person's own words. Nothing here composes a sentence about anybody." The care-plan section obeys it —
it is a heading and rows, not a drafted request letter.

---

## 3. What the app holds

One record, on the device, beside the model it already keeps (`src/model/store.ts`). No new backend;
ADR 0008 still owns that question.

```ts
// src/model/care-plan.ts
export interface CarePlan {
  /** What the person's own plan allows. Their GP wrote it; this app never infers it. */
  readonly allows: number;
  /** Services already used. Never inferred from bookings the app cannot see. */
  readonly used: number;
  /** The calendar year the allowance belongs to, so a new year reads as a new allowance. */
  readonly year: number;
  /** When the person last confirmed these numbers, because a count is perishable. */
  readonly confirmedOn: string;
}
```

Derived, pure, tested, no UI:

```ts
export function remaining(plan: CarePlan): number;           // max(0, allows - used)
export function spent(plan: CarePlan): readonly boolean[];    // the dot row, length `allows`
export function lapses(plan: CarePlan): number;               // the year it resets. A fact, said once.
export const CLAIMABLE: readonly Profession[];                // §5, one array and one test
export function claimable(kind: Profession): boolean;         // §5
export function suggestFor(record: ModelRecord, plan: CarePlan): readonly Suggestion[];  // §4
```

There is no `rebateCents`, no `valueCents`, no `estimatedSaving`. `care-plan.test.ts` asserts it over
the record's keys, the module's exports and every suggestion's fields against
`/cent|dollar|price|fee|rebate|gap|saving|cost|worth|\$/i`, and that a suggestion carries no number at
all — the same structural way `REFUSED_FEE_FIELDS` is tested. A prose rule nobody reads is not a rule,
and `fees.ts`'s own method note is that a scan whose subject matter is the thing it bans will match
the sentence doing the banning.

---

## 4. The recommendation, from the map the person already has

No new taxonomy. The tab already turns answers into needs and needs into provider kinds, and this
reuses that whole chain rather than inventing a parallel one:

`matrix.ts` axes → `needs.ts` (ordered by the person's own cost) → `problem-fit.ts` `fitTags` /
`bestFitFor` → a profession.

`suggestFor` is that pipeline with one filter and one cap:

1. Take the person's needs in their existing priority order.
2. Map each to a profession the way `/support` already does.
3. **Keep only the kinds a plan can pay for** (§5).
4. De-duplicate, and stop at `remaining(plan)` covered rows.

**A GP is never suggested.** `professionsFor` returns `["gp"]` as its fallback whenever no module
targets a need, which put "see a GP" straight onto a care-plan sheet — circular, since a GP writes
the plan rather than being a service under it. Skipped rather than marked "Not covered", because it
was never a thing a person was offered and then denied.

So a person with five services left and starting, organisation and sleep as their top three axes sees
at most five rows, in the order their own map put them. The plan does not decide what matters — the
map already did, and this spends against it.

**One service per kind by default.** Spreading five services across five kinds is the shape a plan is
usually written for, and stacking them on one is a clinical decision this app must not nudge. If the
person wants three OT sessions they can say so; the app does not propose it.

---

## 5. What a plan can pay for, and the coach problem

Of the eleven professions in `src/support/professions.ts`, the allied-health kinds a chronic condition
management plan can refer to are, pending D3's confirmation, **four**:

| Profession | On a plan? |
| --- | --- |
| Psychologist | yes |
| Occupational therapist | yes |
| Exercise physiologist | yes |
| Dietitian | yes |
| GP | writes the plan; not a service under it |
| Counsellor | only as a registered mental health worker — unconfirmed |
| **ADHD coach** | **no. Not a Medicare provider of any kind** |
| Psychiatrist | separate items, not this plan |
| Relationship counsellor, sleep clinician, university support | no |

**This collides with C2 and the collision is the honest finding of this document.**
`MAP-CONNECTIONS.md` measured that `adhd-coach` is the kind the map points at for 13 of the 17
subdomains whose profession card no real provider can serve. So the kind the map most often
recommends is the one kind a plan can never pay for, and this feature will frequently point somewhere
other than the map's first answer.

That is not a bug to hide behind ordering. Two things follow, and both are in scope:

- The sheet says which of its rows a plan covers and does not silently drop the rest. A person whose
  best fit is a coach needs to know the coach is worth seeing AND is not claimable — otherwise the
  app looks broken when their GP says no.
- It sharpens C1. The taxonomy has no vocabulary for what a psychologist publishes, and psychologists
  are the largest claimable kind on the roster. Until C1 moves, `suggestFor` will under-rank the kind
  a plan is most often spent on. **Named here, not fixed here** — C1 is a founder decision.

---

## 6. Information architecture

Three additions. Nothing new in the tab bar; D1 in MAP-PRD keeps three tabs and this does not reopen it.

```
/today              what to try next  + one card, 2 words
  └ care-plan sheet  a sheet, not a route — app/sheet.tsx, the axis sheet's grabber and detents
/my-adhd            the hub           + `?share=1`, so the sheet's onward action keeps its promise
/my-adhd/share      the GP summary    + one section, `carePlan`
```

The sheet, not a route, for the reason MAP-PRD gives for the axis sheet: the person stays on the
single object they are looking at, and the surface inherits the focus trap, Escape and detents every
other modal in the product has.

**WHY TODAY AND NOT THE HUB — and the decision that belongs to the founder.** The card was built on
the hub, and measured there: 53 words lived in, 58 with a step proposed, against a ceiling of 60.
Then the skill-matched practitioner card landed on the same screen and added four more
(`Task initiation`, `Jane Whitlock`), and the two features together put the step-proposed hub on
**62 — over**. Neither is individually at fault. The hub had four words of headroom and now carries
**three recommendation surfaces at once**: the contributor chips, the step card, and a named
practitioner. Whatever is added to it next will overflow it.

Today is the same tab, its question is literally "what should I understand or try next", it had 25
words of headroom, and a plan is a thing you act on rather than a thing you have learned about
yourself. It also had a large dead area below its one card, which the row now occupies. Measured
after the move: Today 37 lived in, 40 before a plan, 22 with the sheet open; the hub back to 60.

**The hub is now at its ceiling with none of this feature's words on it.** That is the thing for the
founder to look at, and it is a question about the practitioner card as much as about this one:
three recommendations stacked on one screen is an information-architecture decision, not a budget
accident. **Not resolved here.**

---

## 7. Screen specifications, with the budgets as hard numbers

The hub is at **51 words** lived in and **56** with a step proposed, against a ceiling of 60
(`qa/text-budget.json`). `BUDGET.card` is **8**. So the hub card gets five words and the feature is
designed around that number rather than apologising for it.

### 7.1 The card (on `/today`)

```
Care plan            ·  ● ● ○ ○ ○
                        3 of 5 left
```

**Two words: "Care plan".** A name and the dots. No count in words, no explanation, no lede.

The PRD drafted "3 of 5 left" and the build cut it twice. "of 5" says what five dots say. Then
"3 left" was the difference between a screen inside its ceiling and one over it — so the count is
the button's accessible name, losslessly ("Care plan: 3 of 5 services left"), and the sheet says it
in words the moment somebody taps. A sighted reader counts three hollow dots among five; nobody
else loses anything.

One trap, worth writing down: the first build put the visible words inside `aria-hidden` spans,
reasoning that the button's own `aria-label` already carried them. The text-budget instrument skips
`[aria-hidden='true']` subtrees, so the hub measured 51 and 56 — exactly as if the card were not
there. **A word on screen is a word in the budget**, whatever the accessibility tree thinks.

Empty state, before a person has a plan — **four words**:

```
Care plan            ·  ○ ○ ○ ○ ○
                        Ask your GP
```

Both states get measured. The instrument has only ever walked the hub with no plan, which is the same
hole §13.1 of MAP-PRD found for the lived-in hub, so **Phase 1 is the instrument, again.**

### 7.2 The care-plan sheet — ≤ 40 words

```
Care plan                                    ×
● ● ○ ○ ○     3 of 5 left

Occupational therapist        Starting        On a plan
Psychologist                  Emotional       On a plan
ADHD coach                    Organisation    Not covered

Resets January                          Take this to my GP →
```

- The heading is the plan. The dot row is the state.
- One row per suggestion: the **kind**, the **axis it came from**, and whether a plan covers it.
  Three cells, no sentence. The axis cell is the join that makes this the person's plan rather than a
  generic list, and it is one word because the axes are one word.
- "Not covered" is the C2 honesty in two words. It does not hide the row and it does not explain
  itself on the hub; the sheet is where a person asked.
- "Resets January" is the expiry, **said once, as a fact**. Not a countdown, not a badge, not a
  progress nag (§9).
- One way onward, which is the surface that already exists.

### 7.3 Editing the numbers — ≤ 20 words

A person's plan is theirs to state. Two steppers and a confirm, reached from the sheet:

```
My plan allows        −  5  +
Used so far           −  2  +
                            Save
```

Twelve words. No free-text, no date pickers, no "when did you have your GP appointment". The stepper
is a 44px control with `role="spinbutton"`, and typing works.

### 7.4 The GP summary section

One new `SectionKey`, `carePlan`, heading **"Care plan"**, placed before `supports` in
`SECTION_ORDER` — a plan is the mechanism the supports are reached through, so it reads first.

Rows only, the record's own values, no composed prose:

```
Care plan
  Plan allows          5
  Used so far          2
  Considering          Occupational therapist, Psychologist
```

Removable like every other section. `summaryText` picks it up with no change, because it already
renders headings and rows.

---

## 8. Aesthetic: the dot row, and why it is not a progress bar

The only new visual element is the spend row, and it is deliberately the language the radar already
speaks rather than a new one.

**A filled dot is a service used; a hollow dashed dot is one remaining.** That is exactly
`.map-node[data-learning]` — "a hollow, dotted knot instead of a solid one" — which the map already
uses for *a thing not yet placed*. A remaining service is the same idea: something real, not yet
spent. Reusing it means the tab has one vocabulary for "not yet" instead of two.

**Not a progress bar, on purpose.** A filling bar says finish me, and two of the tree's own findings
today were false-full bars that read as time up. Five discrete dots say five things, countable at a
glance, with no direction of travel implied. A person who spends two of five has not failed to spend
three.

Tokens, all existing (`app/globals.css`): `--accent` for a spent dot, `--line-strong` for the dashed
outline of one remaining, `--ink` for the count, `--muted` for the axis cell. **No new token.** The
coral of the radar polygon is not reused — that colour means "the shape of you" and a plan is not.

Motion: the dot that fills on a save does so once, 240ms, on the house scale; nothing loops. Under
`prefers-reduced-motion` the dot is simply filled. No number counts up.

Type: the count is `tabular-nums` so "3 of 5" does not shift to "4 of 5". The axis cell is
`0.75rem`/`--muted`, the same as `.map-row-word`.

---

## 9. What this feature may not become

The brief says "completely use up their 10 entitlements", and the obvious reading of that is a
completion mechanic. It must not be one. `PRODUCT.md` forbids copy that implies urgency, and the v2
games plan rejects "daily streaks or time spent as primary success metrics" for the same reason.

- No countdown to December. "Resets January" appears once, in the sheet, as a fact.
- No badge, dot or red state on the tab for unspent services.
- No notification, and nothing that reappears after a person dismisses it.
- No "you have wasted 3 services" framing at year end. The new year shows a new allowance and says
  nothing about the old one.
- No percentage. Three of five is not 60%.

The measure of success is that a person who wanted a psychologist can see that their plan covers one,
not that the dots all fill.

---

## 10. Test matrix

**Pure, no UI** (`src/model/care-plan.test.ts`)
- `remaining` floors at zero when `used` exceeds `allows`, which a person editing by hand can do.
- `spent` returns exactly `allows` entries and never a negative length.
- A new calendar year reads as a full allowance without the app editing the record behind them.
- `suggestFor` returns at most `remaining`, one per kind, in the needs' existing priority order.
- `suggestFor` marks a non-claimable kind rather than dropping it.
- **Structural refusal:** no field, export or key in the module matches `/cent|dollar|rebate|gap|saving/i`.
- Non-vacuity, in the tree's `eachOf` style: the fixture has more needs than services, so the cap is
  actually exercised.

**Browser** (`e2e/care-plan.spec.ts`)
- Hub card in both states; the sheet opens, traps focus, closes on Escape.
- The steppers work by pointer and by keyboard, and the count is announced.
- No number about the person: the whole tab's existing guard, extended — the sheet may show "3 of 5"
  and may not show a cost, a score or a percentage.
- 320, 390, 768, 1280 with the new sweep (`scripts/target-sweep.mjs`), and axe on both sheet states.
- `carePlan` reaches the GP summary, is removable, and survives print.

**The instrument** (Phase 1)
- `LIVED_RECORD` gains a plan, so the hub's lived-in states are measured with one; and
  `src/model/seed.test.ts` grows to pin the plan's kinds the way it now pins strategies.
- Hub ≤ 60 with the card in both states. Sheet ≤ 40. Editor ≤ 20.

---

## 11. Phases

Each is independently shippable, runs `pnpm typecheck && pnpm test` plus the specs it touches, and
puts the text-budget table in the commit.

| Phase | Lands | Done when |
| --- | --- | --- |
| **1. Truth** | `care-plan.ts` + tests; the plan in `LIVED_RECORD`; hub measured in both states. No UI. | the gate reports real numbers with a plan present; unit suite green |
| **2. The card** | the hub card, both states, the dot row | hub ≤ 60 in both states; no new token; axe clean |
| **3. The sheet** | the sheet, the rows, the claimable/not-covered mark | rows match the person's own axes, in e2e |
| **4. The numbers** | the two steppers | pointer and keyboard, announced, 44px |
| **5. The summary** | the `carePlan` section | in the GP summary, removable, prints |
| **6. The join** | "Take this to my GP" from the sheet; `/support` shows the covered mark | the chain walks, in one e2e |

Phases 1–2 are the whole feature at five words. If the founder stops there, the product has gained a
truthful plan counter and nothing has been claimed.

---

## 12. Decisions the founder owns

The plan proceeds on the **bold** default. None may be ticked by an agent.

**D1 — The number.** Five individual services per calendar year, or ten? §1 argues the ten in the
brief adds a diabetes-specific group entitlement to the general one. **Default: the app asks and does
not assert**, so the allowance is whatever the person's plan says and the product is right either way.

**D2 — Who confirms the scheme.** No copy naming an entitlement, item number or eligibility rule
ships until a clinician has checked it against the current MBS. **Default: blocked until confirmed**,
and Phases 1–4 are all buildable without any such copy.

**D3 — Whether to name the mechanism at all.** "Care plan" is plain; "chronic condition management
plan" is the instrument's name and is four more words and a diagnosis-adjacent framing for a person
who may not think of ADHD as a chronic condition. **Default: "Care plan" on screen**, the full name
only in the GP summary, where the reader is a GP.

**D4 — Counsellors.** Claimable only as a registered mental health worker. **Default: excluded from
claimable kinds** until confirmed, and shown as "Not covered" rather than hidden.

**D5 — The coach.** §5: the kind the map most often points at is never claimable. **Default: show it,
marked** — the alternative is a plan screen that silently disagrees with the support screen.

**D6 — Real providers.** The recommendation names kinds, not people, until the allied-provider
decision in `PLAN.md` resolves. **Default: kinds only.** A named claimable provider is worth more and
needs the real roster first.

---

## 13. What could not be verified here

The MBS figures in §1 and the claimable kinds in §5 are this document's reading and are **not
confirmed**. They are written down so the founder and a clinician have something specific to correct,
and the build in §11 is arranged so that Phases 1–4 need none of them to be right: the allowance is
the person's own data and the claimable list is one exported array with one test.

No screen in this document has been captured, because none exists yet. Every word count above is a
budget to hold, not a measurement — the measurements start in Phase 1.
