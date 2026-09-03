# ADHD.ME — the weekly roadmap, September 2026 to August 2027 (refinement and advancement, week by week)

> **Commissioned by the founder, 2026-09-03:** *"Create comprehensive refinement and advancement
> plan with week by week milestones for next year with extreme detail with Apple plugin and skill
> and also engineering skills."*
>
> This document answers it in three parts. **§4** is the calendar: fifty-two weeks, each with its
> dates, its units, the skills that govern them, the founder decisions falling due, and the exit
> criterion the week must meet. **§5** is the **V lane** — forty refinement units (`V1`–`V40`)
> that carry the Apple-design and engineering skills into the tree as registers, probes and
> documents, laid beside the U lane rather than inside it because they refine what the U lane
> builds. **§6** names the three founder decisions the lane adds. Everything else is context.
>
> Laid on 2026-09-03 against `ff3fabc` (O249 done, gate green @ `b924942`).
> `src/quality/weekly-roadmap.test.ts` holds §4 and §5 to the ledger on every verify: the V ids
> equal the ledger's V rows in both directions, every V unit is scheduled in exactly one week,
> every U unit not yet done is scheduled in at least one, and the fifty-two weeks run Monday to
> Monday without a gap.

## 0. How to read this roadmap

**Two lanes, one calendar.** `docs/ONE-YEAR-BUILD-PLAN.md` (ACTIVE) is the *advancement* lane:
U1–U68, the platform made durable, secure, reachable, honest and verifiable, with the refactor
R0–R5 inside it. Its scope does not change here; §4 only says *which week* each remaining U unit
is built, in the order its `Depends:` allows, with the founder decisions its blocked rows wait on
placed on the calendar as dated asks. The **V lane** is the *refinement* lane: the fluid-interface
bar, the design-quality bar and the engineering-practice bar, each turned into something the build
can fail. A V unit never widens a U unit's scope; where the two touch (V5 beside U24's style
system, V27 before U26's first `(L)`), the week says so.

**Ids and the lock.** V units are `V1`–`V40`, laid in `BUILD-STATE.md` under `## Ledger — V-series`
with the same six columns and the same claim protocol as the W, AR and U lanes. `[P]` means no
dependency inside either lane; `(S|M|L)` is a session, two, three-plus; `Depends:` names U or V
rows that must be `done` first; `→ verify:` is the gate beyond `pnpm verify` itself. Every V unit
that moves pixels appends an `ACCEPTED_DIFFS` entry naming itself; every V unit that adds a
register proves the register can fail on a plant before it is trusted (the AR9 rule).

**Weeks.** Week 1 opens Monday 7 September 2026; week 52 opens Monday 30 August 2027. Quarters are
weeks 1–13, 14–26, 27–39, 40–52, which is one week later than the U plan's calendar months at
each boundary and is stated here so nobody reconciles them by hand. A week's **Units** line is the
schedule; a unit named in two weeks is a unit that takes two weeks. A week's **Exit** is what must
be true on the Friday, and it is always a check, a capture or a ledger row — never a feeling.

**Sessions, not days.** O216–O249 ran at several units a day when the founder was present, and
the U plan was sized for one session-day a working day. This roadmap is sized the same way and
front-loads: Q1 pulls the refactor's second half (R3–R5) forward because Q1's own units are
thirteen-of-twenty-three done on the day this is laid. A week that finishes early takes the next
week's `[P]` unit; a week that runs late does not push a founder decision.

**Precedence.** `CLAUDE.md`'s compliance-is-code sections, `DESIGN.md` and the U plan's §6 gates
and §7 refusals bind every V unit. A V unit that would need a clinical claim, a rating, a
testimonial, symptom triage, a learned weight, patient text in a URL or a log, or a third-party
model call is a defect in this roadmap, not a licence.

## 1. Where this starts from, measured (2026-09-03)

- **Ledger.** U lane: 13 done (U1–U5, U7–U10, U12–U15), 44 available, 11 blocked on ten named
  decisions (U6, U11, U31, U37, U38, U43, U50, U51, U58, U65, U66). O lane: O249 done. Gate line
  green @ `b924942`: verify green (317 files / 4,635 tests), full e2e 382 passed, 1 skipped
  (`/about`, resolved by U52), 15.1 minutes.
- **Fluid-interface appraisal (O249, the apple-design skill).** Scored B+ then A− after the fixes:
  house spring ζ = 1.00 at 0.30 s response; stage exits instant with a directional arrival; the
  sheet's detent animated and its release momentum-projected; presses at ζ ≈ 1; reduced motion,
  reduced transparency and more contrast each answered; the gutter and core controls in rem.
  Two findings wait on the founder (§6: D-LEARN-THESIS, D-RESULTS-BACK). Nothing yet *pins* any
  of this — the constants can drift back without a red build. V1, V6 and V7 are the pins.
- **Design law standing.** 22 taste rules (9 enforced), 5 mutation-probe families, the AR15
  accepted-diff chain, 48 route budgets, 47 working-truth proofs, 34 classified zero-states, a
  reduced-motion register, a dark-grounds register, a dead-CSS register, a type-scale register and
  a theme-parity ratchet. What is absent: a register for motion physics, for press feedback, for
  materials, for optical sizing, for AI-generic layout patterns, and any executable trace from a
  founder decision to an architecture record.
- **Engineering practice standing.** One session-day per unit; every unit ends with a claim row, a
  green verify, a done row with a SHA; captures by ad-hoc scripts under `.data-capture/`; no
  design document precedes an `(L)` unit; no ADR exists for any of the ten open decisions; the
  suite's one known flake (`src/tenancy/rollout.test.ts`, the W98 timing check) fails on this
  machine under Node 25 and is noted in every gate line by hand.

## 2. The six lenses on this roadmap's five calls

Applied before the calendar was laid (Stefan-Brain's research skill graph; every lens had to
produce one non-obvious point or the call was re-argued).

**Call A — a refinement lane beside the refactor, not after it.**
*First principles:* refinement is measurement; a register laid before a refactor is what proves
the refactor moved no pixel and no spring. *Historical:* the AR lane (Aug 2026) was laid mid-flight
beside the matching plan and is the reason O249 could be verified in an afternoon. *Contrarian:*
two lanes tempt a session to pick the pleasant one; the guard is that a V unit is always
`(S)` or `(M)` and the week's U units come first in the Units line. *Technical:* the registers V1,
V6, V7, V19 cost under a day each and run in vitest, not Playwright, so they add seconds to
verify, not minutes. *Economic:* the value of the refactor is captured only if the product feels
the same afterwards — the pixel witness (AR15) already buys that for pixels; V1 buys it for
motion. *Geopolitical:* none; a design register has no regulator.

**Call B — the installed web app first, native only under D-NATIVE.**
*First principles:* the engine is pure TypeScript; what a native shell buys is speech and store
presence, one of which is a founder posture question. *Historical:* `STANDALONE-APP-PLAN.md`
argued this in September and nothing since has changed the posture. *Contrarian:* App Store
presence is the strongest distribution signal a health product can send; the roadmap answers by
putting D-NATIVE's three gates on the calendar (weeks 40–48) rather than deferring them.
*Technical:* U48–U50 and V34 make the installed web app indistinguishable from a wrapper on
everything but store presence, so the wrapper decision is small when it arrives. *Economic:*
Apple's review of health apps and the medical-app guideline cost a review cycle per release;
a PWA costs a push. *Geopolitical:* Australian data residency and the TGA CDSS boundary (G7)
apply identically to both; the store adds Apple's privacy questionnaire, which U39's consent
registry answers.

**Call C — provisional labels now, a panel at week 30.**
*First principles:* a harness without labels measures nothing; labels without a harness are an
opinion. *Historical:* the matching year plan's Month 2 was never built because the panel was
never engaged — the harness (U57) is scheduled first so the panel labels something that exists.
*Contrarian:* provisional labels written by a session risk fitting the ranker to its author;
the marker "NOT CLINICAL — PROVISIONAL" and the inverted test at U58 are the guard. *Technical:*
200 requests × 500 profiles is under a second; the harness runs in verify. *Economic:* two
clinical reviewers and a consumer panel are the year's largest cash item; the calendar gives the
founder twelve weeks' notice (week 18 ask, week 30 engagement). *Geopolitical:* Ahpra's
advertising rules and G7 mean no label may encode a symptom; the label schema is attributes only.

**Call D — the finder stays `noindex` until D-FINDER-PUBLIC, and that is week 49 at the earliest.**
*First principles:* a public finder is a public claim about real clinicians. *Historical:* the
synthetic-roster decision set a testing posture on 2026-09-01; nothing in this roadmap reverses
it by drift. *Contrarian:* the longer the finder is private, the less real feedback shapes it —
answered by U47's scale roster and V14's psychology review, which are the cheapest feedback that
is not a person. *Technical:* U7's robots census and the `finder-public-posture` gate make the
reversal one commit when the decision lands. *Economic:* no revenue depends on public search in
this deployment; the sibling carries the network. *Geopolitical:* privacy counsel (D-PRIVACY-
COUNSEL, week 20) and the Ahpra review (B5) are the two external clocks, and both are on the
calendar before week 49.

**Call E — third-party review tooling (Codex) as an optional gate, never a required one.**
*First principles:* a review is only as good as what it can see; the tree's registers see more
than a model reading a diff. *Historical:* `CLAUDE.md` names review skills that were never
installed and the lane was designed without them (U plan §9). *Contrarian:* a second reader
catches what the author's registers were not written for — so the roadmap schedules D-CODEX-CLI
as a decision, not a refusal. *Technical:* `codex-review` needs an authenticated CLI on the
build machine; that is a credential the founder holds. *Economic:* per-review cost is small;
the founder decides whether a second vendor's account is worth holding. *Geopolitical:* G8 (no
patient-derived content to a model API) means a review may read code, never fixtures that carry
request text; V28's verify clause says so.

## 3. The skills map — which skill governs which week

**Apple design (`~/.claude/skills/apple-design`, from karak-claude-plugin's karak-design).** The
seventeen sections are the rubric every quarter is re-scored against (V35–V38). Specific
sections govern specific units: §1 response and §10 gesture details → V6; §3 interruptibility and
§7 spatial consistency → V8, V3; §4 springs and §5–§6 momentum → V1, V2; §11 frame smoothness →
V10; §12 materials → V7, V4; §13 multimodal feedback → V9; §14 reduced motion → V7, V12; §15
typography → V5; §16 the eight principles → V14–V17, V23, V24; §17 process → V33 (prototype and
capture before judgement).

**karak-design.** `hifi-design-quality` → V20 (the Learn modules' dimension checklist) and every
week that touches a new screen; `ux-psychologist` (47 laws) → V14, then V15 and V16; `garrett-
ux-analysis` (Strategy / Scope / Structure / Skeleton / Surface) → V17; `frontend-aesthetics`
(the AI-generic pattern list) → V19; `icon-design` → V11; `design-system` (sixty reference
systems) → V18; `mobile-auth-screen-design` → V13; the `ui-designer` agent is the second reader
on every V unit that moves pixels.

**karak-engineering.** `google-design-docs` → V27 (a design document before every `(L)` unit,
and retroactively for U17, U24, U26, U28, U35, U44, U55, U57, U66); `codex-review` → V28 under
D-CODEX-CLI; `nodejs-backend` → U35, U36, U38 (the SQL adapter, PGlite in tests, `pg` in
deployment); the `code-refactorer` agent reads every R-stage unit's diff; the
`quality-assurance-manager` agent writes the week's exit check into the ledger note.

**karak-architecture.** `adr-architect` (MADR) → V25, one ADR per open decision, updated the week
the decision lands; `write-c4-diagram` → V26; `architecture-principles` (the five-layer diagnosis
and delivery measures) → V30; `thoughtworks-radar-ref` → V29 beside U33; the `system-designer`
agent reviews U17, U20, U35, U55 before they are claimed.

**karak-product.** The `requirements-analyst` agent writes the acceptance criteria into every V
unit's `→ verify:` clause before it is claimed; the `agile-project-manager` agent runs the four
quarter re-plans (weeks 13, 26, 39, 52) and may re-order weeks inside a quarter, never across a
founder decision. `record-learning-candidate` (karak-meta) fires at every session end beside
`knowledge-graph-logger`.

**Local engineering skills.** `tdd` and `test-driven-development` on every register (the plant
first, then the rule); `systematic-debugging` before any change to a red test; `verification-
before-completion` before any done row; `writing-plans` and `executing-plans` for the `(L)` units;
`code-review` on every week's diff; `minimalist-ui`, `animation-vocabulary` and `review-
animations` on every motion change; `ios-design-review` and `ios-qa` in week 34 (D-IOS-DEVICE);
`design-review` at every quarter close; `compound-engineering`'s `ce-review` on the Friday of
every week; `superpowers`'s `brainstorming` before V14 and V17 only.

## 4. The calendar — fifty-two weeks

Each week: **Units** (U first, then V; a unit named in two weeks spans them), **Skills**,
**Decisions** (asks sent to the founder, or decisions due), **Exit** (true on the Friday).

### Q1 — weeks 1–13: the refactor's foundation, the fluid-interface pins, the second half pulled forward

### Week 1 — 7 September 2026
**Theme:** the lint floor and the motion floor, laid the same week.
**Units:** U16, U17 · V39, V1
**Skills:** apple-design §4–§6; tdd; code-refactorer; adr-architect (read only, for V25's shape).
**Decisions:** D-CI-BILLING asked (opens U6): resolve the account-level Actions billing or name another runner. D-WEBKIT-RUNNER asked (opens U11, U50).
**Exit:** `pnpm lint` and `pnpm knip` in `verify` with a pinned baseline (U16); U17's `KeyedStore` contract suite green on the in-memory adapter; `src/design/fluid.ts` pins every spring's ζ and response and goes red on a planted ζ = 0.6 tap spring (V1); V39's test green in this commit; the roadmap's PLAN.md row present.

### Week 2 — 14 September 2026
**Theme:** the storage contract finished; feedback and materials become law.
**Units:** U17, U6 · V6, V7
**Skills:** apple-design §1, §10, §12, §14; tdd; verification-before-completion.
**Decisions:** D-CI-BILLING due — the first green Actions run since 2026-08-21 recorded by URL (U6), or the row stays blocked with the date the founder gave.
**Exit:** the 17 `globalThis` stores are thin modules over one adapter and `store-reads`, `isolation`, `zero-states` green unedited (U17); every interactive class has pointer-down feedback in both directions with the markup census (V6); blur exists only where content passes beneath a surface and each such surface has a reduced-transparency answer (V7).

### Week 3 — 21 September 2026
**Theme:** the record registry, the decision record, the capture script.
**Units:** U18, U19 · V25, V33
**Skills:** adr-architect (MADR); google-design-docs (U19's file adapter is the first design-doc'd unit); nodejs-backend.
**Decisions:** D-PRIVACY-COUNSEL brief sent (`docs/PRIVACY-COUNSEL-BRIEF.md`, B1–B4) with week 20 named as the answer date.
**Exit:** `src/domain/records.ts` holds every persisted record type once with zod, version, class, scope and retention, both directions with `DOMAIN_TABLES` (U18); `docs/adr/` carries one MADR per open decision and a test holds the set to §6 of both plans (V25); `pnpm captures <tag>` writes the 390/1280/130% set that O249 produced by hand (V33).

### Week 4 — 28 September 2026
**Theme:** the file adapter lands; the sheet and the stage change get their proofs.
**Units:** U19, U20, U11 · V2, V8
**Skills:** apple-design §3, §5–§7; systematic-debugging; tdd.
**Decisions:** D-WEBKIT-RUNNER due — a machine that runs `pnpm e2e --project=webkit`, or the row's date.
**Exit:** crash-mid-write leaves the previous JSONL intact and `e2e:visual`'s three-run protocol agrees (U19); `project()` and the detent choice have unit tests and a Playwright drag with velocity proves a flick just short of the threshold dismisses (V2); an e2e asserts a Back arrival's first frame carries a negative y (V8).

### Week 5 — 5 October 2026
**Theme:** actions, fixtures and limits through one seam; the chrome's edge; the flake named.
**Units:** U20, U21, U22 · V4, V31
**Skills:** apple-design §12 (scroll-edge effects); nodejs-backend; systematic-debugging (the W98 timing check).
**Decisions:** none due.
**Exit:** `defineAction()` wraps all 13 action files and a planted action outside the registry is red (U20); mock routes 14 → 1 plus the alias (U21); every mutating action and route declares a limit and a cross-origin POST is refused (U22); the tab bar and the profile header fade content into their material instead of ending on a hairline while the 2 px band stays (V4); the rollout timing check carries a machine-aware threshold and the gate line no longer names it by hand (V31).

### Week 6 — 12 October 2026
**Theme:** the auth seam; the app's icon; the map's last polish.
**Units:** U23 · V11, V21
**Skills:** icon-design; apple-design §16.7 craft; minimalist-ui.
**Decisions:** D-AUTH-PROVIDER asked (opens U37) with the U plan's constraints (Australian residency, passkeys, magic link, no social login, a sandbox).
**Exit:** the mock provider refuses to construct in production and a revoked session is refused on the next request (U23); maskable PWA icons, the iOS touch icon and the favicon regenerated from one source with a test that the manifest names each (V11); the zoom stack clears suburb labels, markers press with the house spring, the credit is the tiny control (V21).

### Week 7 — 19 October 2026
**Theme:** R3 begins — one style system, with typography measured before it moves.
**Units:** U24 · V5
**Skills:** apple-design §15; adhdme-taste; frontend-design token rule; impeccable.
**Decisions:** none due.
**Exit:** the type-scale register gains per-size tracking and `font-optical-sizing` rules and is red on a fixed `letter-spacing` across sizes (V5) *before* U24 moves any rule; U24's first half: tokens as `@theme`, the AR15 hash unchanged.

### Week 8 — 26 October 2026
**Theme:** the style system finished; the generic-pattern register.
**Units:** U24, U25 · V19
**Skills:** frontend-aesthetics; react-best-practices; composition-patterns.
**Decisions:** none due.
**Exit:** `globals.css` lines and rules down ≥50%, unused selectors 0, the contrast, focus and touch sweeps green, the manifest hash unchanged or every moved cell attributed (U24); `src/design/generic-patterns.ts` names the AI-generic layouts (centred hero with three icon cards, purple-to-blue gradient, a lone accent pop on near-black, emoji section markers) and a rendered-fixture test fails on each plant while every public page passes (V19).

### Week 9 — 2 November 2026
**Theme:** the client boundary to the leaves; the design-doc rule before the first `(L)` of R3.
**Units:** U25, U27 · V27
**Skills:** google-design-docs; react-best-practices; verification-before-completion.
**Decisions:** none due.
**Exit:** client files ≤10, every route budget lowered, hydration warnings zero (U25); the story and public primitives at five or fewer with zero pixel change (U27); `docs/design-docs/` holds a design document per `(L)` unit already done or scheduled and a test holds the set to the ledger's `(L)` rows in both directions (V27).

### Week 10 — 9 November 2026
**Theme:** console page kinds; the sign-in screen against the mobile-auth checklist.
**Units:** U26 · V13
**Skills:** mobile-auth-screen-design; hifi-design-quality; keyboard-focus sweep.
**Decisions:** D-DORMANT asked (opens U31): does this deployment carry the W lane's gated product code.
**Exit:** the 31 console routes still exist, the 34 zero-states derive from the page specs (U26, first half); `/console/signin` passes the five-area checklist — keyboard occlusion on iOS and Android emulations, safe areas, 44 px targets on the toggle and the submit, plain error copy, no social buttons — with an e2e per area (V13).

### Week 11 — 16 November 2026
**Theme:** console kinds finished; one walk; the architecture drawn from the tree.
**Units:** U26, U28 · V26
**Skills:** write-c4-diagram; architecture-principles; system-designer agent on U28.
**Decisions:** none due.
**Exit:** `app/console` lines down ≥40% (U26); the guarantee register pinned before U28's collapse begins; `docs/architecture/c4-context.puml` and `c4-container.puml` exist and a test holds every container name to a top-level module of `src/` and `app/` in both directions (V26).

### Week 12 — 23 November 2026
**Theme:** the walk finished under a wall-time budget; census primitives.
**Units:** U28, U29 · V32
**Skills:** tdd; code-refactorer; quality-assurance-manager writes the exit.
**Decisions:** none due.
**Exit:** 252 `goto` calls → ≤60, the guarantee register equal before and after, e2e ≤8 min at `workers: 1` (U28); `src/quality/e2e-budget.ts` pins the suite's wall time from the run's own JSON report and is red above 12 min (V32); U29's `bothDirections`, `nonVacuous`, `pinned` primitives in place with the `expect(` count not fallen.

### Week 13 — 30 November 2026
**Theme:** quarter close — the module-reasons register executed, the first re-appraisal.
**Units:** U29, U30 · V35
**Skills:** apple-design (all seventeen sections re-scored); design-review; agile-project-manager (Q2 re-plan inside the quarter's weeks only).
**Decisions:** D-DORMANT due (opens U31 in week 14).
**Exit:** every `gated:<G>` module under `src/gated/` with its tests and 0 non-law modules unreached outside it (U30); `docs/design-qa/` (or `DESIGN-QA.md` until U32) carries the Q1 fluid-interface re-appraisal with each section's score and delta from O249 and the three lowest sections named as V-lane work for Q2 (V35).

### Q2 — weeks 14–26: R5, durability, the psychology of the funnel

### Week 14 — 7 December 2026
**Theme:** the ledger split; delivery measured from the ledger itself.
**Units:** U31, U32 · V30
**Skills:** architecture-principles (Measure layer); adr-architect (D-DORMANT recorded).
**Decisions:** D-DORMANT executed if decided (U31); otherwise its row keeps the date.
**Exit:** `BUILD-STATE.md` under 1,500 lines with every ledger-reading test re-pointed through `src/quality/ledger.ts` and row counts equal (U32); `pnpm delivery` prints lead time (claim → done) and throughput per week per lane from the ledger's own timestamps and a test pins the parser on a fixture (V30).

### Week 15 — 14 December 2026
**Theme:** dependency reasons, with the radar beside them.
**Units:** U32, U33 · V29
**Skills:** thoughtworks-radar-ref; knip.
**Decisions:** none due.
**Exit:** every dependency carries a reason and the unit that would remove it, knip at zero unused (U33); each dependency's radar ring (Adopt / Trial / Assess / Hold, or "not on the radar") recorded in the same register with the volume consulted, and a Hold-ring dependency is red until a reason names why it stays (V29).

### Week 16 — 21 December 2026
**Theme:** the closing simplicity audit; feedback that earns its place.
**Units:** U34 · V9
**Skills:** apple-design §13 (causality, harmony, utility); minimalist-ui.
**Decisions:** D-AUTH-PROVIDER due (opens U37 in week 22).
**Exit:** `docs/SIMPLICITY-AUDIT.md` re-derived on every verify with every §2.5 target met or its miss recorded (U34); the profile switches and the quiz answer fire one short haptic on the same frame as their visual change, only where `navigator.vibrate` exists, never under reduced motion, and a test proves no other control vibrates (V9).

### Week 17 — 28 December 2026
**Theme:** the light week — reading the funnel through forty-seven laws.
**Units:** V14
**Skills:** ux-psychologist; brainstorming (superpowers) for the divergent pass only.
**Decisions:** none due.
**Exit:** `docs/UX-PSYCHOLOGY-NOTE.md`: the finder funnel (welcome → listening/typing → results → profile → booking) and the Learn loop diagnosed against the 47 laws, each finding a location and a law, the two that matter most opened as V15 and V16 with their `→ verify:` clauses written by the requirements-analyst agent.

### Week 18 — 4 January 2027
**Theme:** the SQL adapter begins; the results moment.
**Units:** U35 · V15
**Skills:** nodejs-backend; supabase (if installed by then); apple-design §16.8 delight.
**Decisions:** D-EVAL-PANEL asked (opens U58): two clinical reviewers and a consumer panel, engagement by week 30.
**Exit:** the U17 contract suite green on the SQL adapter under PGlite (U35, first half); the results arrival — the summary card and the first row — is one composed moment (peak-end): a single spring, the count and the map control settling last, no stagger longer than 120 ms, and an e2e asserts the arrival's frame count (V15).

### Week 19 — 11 January 2027
**Theme:** the adapter finished and isolated at the policy layer; Learn's pull.
**Units:** U35, U36 · V16
**Skills:** nodejs-backend; security-review posture (the policy-removal probe); ux-psychologist (goal gradient, Zeigarnik).
**Decisions:** D-PRODUCTION-STORE asked (opens U38): where the SQL adapter runs (Sydney region, PITR, an on-call name).
**Exit:** `supabase/migrations/0006_policies.sql` written from the W209 scope kinds and every practice-scoped function refuses a cross-practice read at the SQL layer, the removal probe red per policy (U35, U36); Learn's hero shows progress as a gradient toward the next unfinished module and the module-end card offers exactly one next step, never about the person, with the copy linted (V16).

### Week 20 — 18 January 2027
**Theme:** consent and retention across every record class; the profile through five layers.
**Units:** U39, U40 · V17
**Skills:** garrett-ux-analysis; adr-architect (D-PRIVACY-COUNSEL's answer recorded).
**Decisions:** D-PRIVACY-COUNSEL due (opens U43 in week 25).
**Exit:** a consent record class with export, delete-everywhere and retention driven from the registry, a planted record class red until handled (U39); the interest register's ceiling, erasure and APP 5 notice (U40); `docs/PERSONALISATION-NOTE.md`: the profile's filters read Strategy → Surface, with the one structural finding (what personalisation is *for* in a testing-posture product) turned into a `→ verify:` for O248's successors (V17).

### Week 21 — 25 January 2027
**Theme:** tamper evidence; the database connected if decided; references pinned.
**Units:** U41, U38 · V18
**Skills:** design-system (sixty references); nodejs-backend.
**Decisions:** D-PRODUCTION-STORE due (U38 executes if decided).
**Exit:** the audit trail hash-chained, a planted edit red, the console sentence "chain intact to entry N" passing the honesty sweep (U41); `/api/health` reports the SQL adapter and a console write survives a redeploy, recorded by SHA pair (U38, if decided); `adhdme-taste` gains three named references (NHS App, Apple Health, Headspace) with the specific deltas this product keeps and refuses, pinned as prose the taste-register test reads (V18).

### Week 22 — 1 February 2027
**Theme:** the real provider behind the seam; Learn to hi-fi quality.
**Units:** U37, U42 · V20
**Skills:** hifi-design-quality; mobile-auth-screen-design (the provider's screens); nodejs-backend.
**Decisions:** none due.
**Exit:** the provider contract suite green on the real provider's sandbox with no credential in the tree (U37, if decided); the two console-honesty acceptances re-argued before 2027-02-25 (U42); Learn's modules pass the hi-fi dimension checklist — spacing scale, state coverage, iconography weight, density, motion — with each dimension a captured cell in the AR15 matrix (V20).

### Week 23 — 8 February 2027
**Theme:** the provider finished; the voice screen hears itself.
**Units:** U37 · V22
**Skills:** apple-design §11, §14; review-animations; the privacy posture (level only, never audio).
**Decisions:** D-RESULTS-BACK and D-LEARN-THESIS asked (open V23, V24) with the O249 appraisal's findings 11 and 14 as the brief.
**Exit:** the mic's bars follow the real input level through an `AnalyserNode` that reads amplitude only, with a static equal under reduced motion and a test proving no audio buffer leaves the node (V22); the fake recogniser drives the level in e2e.

### Week 24 — 15 February 2027
**Theme:** the layout under a larger text setting.
**Units:** V12
**Skills:** apple-design §15 (Dynamic Type); touch-floor sweep.
**Decisions:** none due.
**Exit:** captures at 130% and 160% text for every finder stage, the profile, Learn and the sheet; the touch floor holds at 160%; every wrap that breaks a control is fixed in rem, with the AR15 manifest gaining the two text-size dimensions (V12). Spare capacity takes the next `[P]` U unit of Q3 (U44 or U45).

### Week 25 — 22 February 2027
**Theme:** the privacy policy out of draft; two founder calls executed.
**Units:** U43 · V23, V24
**Skills:** adr-architect; apple-design §16.6 simplicity and wayfinding.
**Decisions:** D-RESULTS-BACK and D-LEARN-THESIS due.
**Exit:** "(draft)" gone from the policy with the APP entity, ABN and ceiling stated and every stored consent marked pre-dating (U43, if counsel answered); the results header's "Start over" either becomes "Back" with a history-driven return or stays with the reason recorded (V23); the Learn thesis line either renders once at list level or is demoted to the hero eyebrow, or stays pinned with the reason (V24).

### Week 26 — 1 March 2027
**Theme:** quarter close and the second re-appraisal.
**Units:** V36
**Skills:** apple-design (re-score); design-review; agile-project-manager (Q3 re-plan inside its weeks).
**Decisions:** D-IOS-DEVICE asked (opens U51): a physical iPhone and its iOS version, for week 34.
**Exit:** the Q2 re-appraisal recorded with deltas from V35, the delivery metrics (V30) for Q1–Q2 in the same note, and Q3's `[P]` units confirmed claimable (V36).

### Q3 — weeks 27–39: the finder at scale, the installed app, the engine as a package

### Week 27 — 8 March 2027
**Theme:** a ranking that can say no; frames counted.
**Units:** U44 · V10
**Skills:** apple-design §11; writing-plans (U44 is `(L)`, design-doc'd by V27); tdd (the property test first).
**Decisions:** none due.
**Exit:** U44's property test written and red before any tier code; `e2e/support/frames.ts` measures long frames (>32 ms) across a stage change with `PerformanceObserver` and pins ≤2 per change at the 390 viewport, red on a planted 60 ms main-thread stall (V10).

### Week 28 — 15 March 2027
**Theme:** the tiers ship and arrive well.
**Units:** U44, U45 · V3
**Skills:** apple-design §7–§8 (hint in the direction of the gesture); animation-vocabulary.
**Decisions:** none due.
**Exit:** three explained tiers, an honest empty top tier, no default match, ranking under 50 ms at 500 profiles (U44); tiers arrive top-first with the house spring and the collapsed tier telegraphs its direction, a static equal under reduced motion, the AR15 cells attributed (V3).

### Week 29 — 22 March 2027
**Theme:** every Australian locality; locales from the roster.
**Units:** U45, U46
**Skills:** nodejs-backend (the data file's loader); code-review.
**Decisions:** none due.
**Exit:** the open-data gazetteer resolves every roster suburb, every capital, a misspelling and a postcode, the licence test both directions with the runbook (U45); the offered mic locales derive from the active roster and the F1 failure-mode row is closed (U46).

### Week 30 — 29 March 2027
**Theme:** the examples at scale; the second reader.
**Units:** U47 · V28
**Skills:** codex-review (if D-CODEX-CLI decided); code-review otherwise.
**Decisions:** D-EVAL-PANEL due (engagement confirmed for week 47 labels); D-CODEX-CLI due.
**Exit:** a generated roster of configurable size behind the mock guard with the counts law untouched and the disclosure on every generated profile (U47); Codex reviews the week's commits with fixture text excluded by the runner's own allowlist, or the row records the decision's date (V28).

### Week 31 — 5 April 2027
**Theme:** the offline shell.
**Units:** U48
**Skills:** apple-design §16.3 responsibility (never cache a session); systematic-debugging.
**Decisions:** none due.
**Exit:** `/finder` reaches results offline, a console route offline shows the browser's own failure, the worker versioned by the build SHA and a planted fetch of a mock route refused (U48).

### Week 32 — 12 April 2027
**Theme:** installed-mode chrome and the moment of installing.
**Units:** U49 · V34
**Skills:** apple-design §16.4 familiarity; ios-design-review (the standalone chrome).
**Decisions:** none due.
**Exit:** an in-app back control on every stage in standalone mode, safe-area padding top and bottom, the touch floor green installed (U49); the install prompt is one sentence and one control shown once, after a completed search, never on arrival, and never again once dismissed, with an e2e over `beforeinstallprompt` (V34).

### Week 33 — 19 April 2027
**Theme:** the iOS speech branch and the stages in every sweep.
**Units:** U50, U52
**Skills:** apple-design §14; ios-qa; the WebKit project (D-WEBKIT-RUNNER).
**Decisions:** none due.
**Exit:** MIC failure modes B2 and A3 handled in code with the fake-recogniser seam exercising both branches in WebKit (U50, if the runner exists); every sweep subscribes a check to every finder stage, the `/about` skip resolved, zero skipped tests (U52, first half).

### Week 34 — 26 April 2027
**Theme:** the real device.
**Units:** U51, U52
**Skills:** ios-qa; ios-design-review; verification-before-completion.
**Decisions:** D-IOS-DEVICE due — the founder's iPhone, its iOS version, the walk recorded.
**Exit:** `docs/MIC-FAILURE-MODES.md`'s device row filled with date, device and iOS version and every failure found opened as a row (U51); U52 finished with `gate:accounting` green.

### Week 35 — 3 May 2027
**Theme:** fonts and portraits shipped properly.
**Units:** U53
**Skills:** apple-design §15 (the system font default, overridden with a reason); frontend-design.
**Decisions:** none due.
**Exit:** Newsreader and the UI face as `next/font/local` with licences recorded, no third-party font request in the network capture, every portrait under 120 KB at its largest rendered size, the `image-size` register empty of past-due acceptances (U53).

### Week 36 — 10 May 2027
**Theme:** the perf gate on real numbers; the package boundary begins.
**Units:** U54, U55
**Skills:** react-best-practices; writing-plans (U55 is `(L)`, design-doc'd); system-designer agent.
**Decisions:** none due.
**Exit:** compressed transfer sizes and Web Vitals thresholds in the gate, the lightest route under 250 KB raw and 90 KB compressed, the planted heavy import red (U54); `packages/core` created with the import-boundary test red on a planted deep import (U55, first third).

### Week 37 — 17 May 2027
**Theme:** the engine as a package, continued.
**Units:** U55
**Skills:** code-refactorer; architecture-principles.
**Decisions:** D-NATIVE asked (opens U66): G-APP-1, G-APP-2, G-APP-3 in order, answers by week 48.
**Exit:** the matching engine, roster types, linter and honesty layer imported by `app/` only through `@adhdme/core`; the census unchanged or lower (U55, second third).

### Week 38 — 24 May 2027
**Theme:** the package finished; the clarifier measured at scale.
**Units:** U55, U56
**Skills:** tdd; the TGA boundary register review.
**Decisions:** none due.
**Exit:** `pnpm verify` green with the workspace and the finder e2e green through the package (U55); the clarifier's trigger and tie numbers re-derived on the pinned scale roster in `docs/MATCHING-EVIDENCE.md`, the question set unchanged or reduced (U56).

### Week 39 — 31 May 2027
**Theme:** quarter close and the third re-appraisal.
**Units:** V37
**Skills:** apple-design (re-score); design-review; agile-project-manager (Q4 re-plan).
**Decisions:** none due.
**Exit:** the Q3 re-appraisal with deltas from V36, the installed app scored on every section for the first time, the delivery metrics for Q3, and Q4's `[P]` units confirmed (V37).

### Q4 — weeks 40–52: evidence, enforcement, the store question, the reckoning

### Week 40 — 7 June 2027
**Theme:** the labelled-evaluation harness.
**Units:** U57
**Skills:** writing-plans (`(L)`, design-doc'd); tdd; the compliance linter over every request.
**Decisions:** none due.
**Exit:** ≥200 synthetic real-shaped requests with slices, provisional labels marked NOT CLINICAL, metrics per tier re-derived on every verify (U57, first half).

### Week 41 — 14 June 2027
**Theme:** the harness finished; the honesty-pair probe.
**Units:** U57, U59
**Skills:** tdd; the AR9 mutation rule.
**Decisions:** none due.
**Exit:** the report pinned so a ranking change has to explain its delta (U57); a testimonial and a rating planted on a real route make the sweep and the linter red, and `AUDIT-AR`'s unprobed count drops in the same commit (U59).

### Week 42 — 21 June 2027
**Theme:** three mechanisable detectors.
**Units:** U60
**Skills:** design-review; adhdme-taste.
**Decisions:** none due.
**Exit:** `layout.five-then-rest`, `type.serif-display` and `motion.autoplay-stop` enforced with probes, the AR15 hash unchanged (U60).

### Week 43 — 28 June 2027
**Theme:** the remaining probes.
**Units:** U61
**Skills:** review-animations; tdd.
**Decisions:** none due.
**Exit:** zero enforced rules without a probe in `AUDIT-AR`, the reduced-motion note corrected in the register diff (U61).

### Week 44 — 5 July 2027
**Theme:** the linter reaches every sentence.
**Units:** U62
**Skills:** compliance-is-code (`CLAUDE.md`); code-review.
**Decisions:** D-FINDER-PUBLIC asked (opens U65): B1 answered, B5 the Ahpra review of every profile sentence, and the examples-toggle posture; answer by week 49.
**Exit:** the reviewed vocabulary with a source per term, `/demo` linted, rendered-output fixtures for inline prose, a planted inline clinical claim red (U62).

### Week 45 — 12 July 2027
**Theme:** registers into tests; a threat model whose mitigations are tests; the sibling measured.
**Units:** U63, U64
**Skills:** security-review posture; architecture-principles; adr-architect.
**Decisions:** none due.
**Exit:** `docs/THREAT-MODEL.md` with every mitigation naming a test that exists and is not skipped (U63); `scripts/sibling-census.mts` reports divergence against a pinned fixture pair (U64).

### Week 46 — 19 July 2027
**Theme:** every weight written down.
**Units:** U68
**Skills:** tdd; the W217 gate (no fitting).
**Decisions:** none due.
**Exit:** `src/matching/weight-provenance.ts` both directions with `needs.ts`, the ±25% sensitivity table re-derived on the pinned set, no weight changed (U68).

### Week 47 — 26 July 2027
**Theme:** the panel's labels arrive.
**Units:** U58
**Skills:** the harness (U57); inter-rater agreement.
**Decisions:** D-EVAL-PANEL labels due (engaged week 30).
**Exit:** the panel's labels under the unchanged harness with disagreement per request and the provisional-marker test inverted (U58, if the panel delivered; otherwise the row keeps the date).

### Week 48 — 2 August 2027
**Theme:** the store question, answered in order.
**Units:** U58, U66
**Skills:** ios-design-review; apple-design §16.3 (the store's privacy questionnaire from U39's registry).
**Decisions:** D-NATIVE due: G-APP-1 (stores at all), G-APP-2 (Capacitor wrapper by default), G-APP-3 (sweep parity before any native surface).
**Exit:** U58 closed; U66 begins only if all three gates are decided — the wrapper over the shipped web app on `packages/core` and the offline shell, the e2e suite pointed at its webview.

### Week 49 — 9 August 2027
**Theme:** the finder's public posture.
**Units:** U65, U66
**Skills:** adr-architect (the decision recorded); the robots census.
**Decisions:** D-FINDER-PUBLIC due.
**Exit:** `noindex` reverted, `/finder` in the sitemap and the `finder-public-posture` gate flipped with its source (U65, if decided); the wrapper passes the e2e suite through its webview on the WebKit project (U66, continued).

### Week 50 — 16 August 2027
**Theme:** the wrapper's parity proof.
**Units:** U66
**Skills:** ios-qa; the honesty, compliance, a11y and touch sweeps inside the wrapper.
**Decisions:** none due.
**Exit:** store metadata carries no claim the linter would refuse and no native surface exists that the web app lacks (U66, if decided; otherwise the week takes any remaining available U unit).

### Week 51 — 23 August 2027
**Theme:** the year's reckoning begins.
**Units:** U67
**Skills:** the AR34 method (every number re-derived); requirements-analyst on the rubric.
**Decisions:** none due.
**Exit:** `docs/ONE-YEAR-APPRAISAL-2027.md` drafted with §1's numbers re-derived beside the originals and the U ledger reconciled (U67, first half).

### Week 52 — 30 August 2027
**Theme:** the reckoning closed; the refinement lane accounted for; the last re-appraisal.
**Units:** U67 · V38, V40
**Skills:** apple-design (final re-score); design-review; agile-project-manager (the recommendation on a second year, not a plan).
**Decisions:** none due — the year's recommendation is the founder's to read.
**Exit:** `one-year-appraisal.test.ts` re-derives every number and the U ledger's counts equal the document's (U67); the Q4 re-appraisal with the year's four scores side by side (V38); the appraisal's refinement section lists every V unit with its measured effect and the registers it left standing, and the V ledger has no available row (V40).

## 5. The refinement lane — forty units

Sizes and marks as in §0. Every unit that adds a register proves it can fail on a plant in its
first commit. Every unit that moves pixels names itself in `ACCEPTED_DIFFS`.

### Fluid interface (the apple-design skill, made law)

- **V1** [P] (S) — The fluid-interface register.
  `src/design/fluid.ts` reads every `type: "spring"` constant in `app/` (stiffness, damping,
  mass) and derives ζ and response; pins each site with its role (tap, arrival, sheet, flick);
  a tap or arrival spring below ζ 0.9 or above 1.15, or a response outside 0.2–0.45 s, is red;
  a flick spring may sit at 0.75–0.9. Both directions with the markup census of `transition=`.
  → verify: the register equals the tree's spring sites in both directions; a planted
  `damping: 20` on a `whileTap` is red; `pnpm verify` runs it.

- **V2** (M) — The sheet's physics under test.
  Unit tests for `project()` (Apple's decay form, not v²/2a) and for the detent choice from a
  projected rest; a Playwright drag with velocity (mouse steps) proving a flick short of the
  offset threshold dismisses and a slow drag past it can settle; the sheet's spring after a drag
  at ζ ≈ 0.8, after a tap at ζ ≈ 1.
  → verify: both e2e cases green; the two damping values pinned in V1's register by role.

- **V3** (M) — Tier arrival motion. Depends: U44.
  U44's three tiers arrive top-first with the house spring, the collapsed tier telegraphing its
  direction; a static equal under reduced motion; no stagger longer than 120 ms in total.
  → verify: the reduced-motion register sees the new file; the AR15 cells attributed; V10's
  frame budget holds across the arrival.

- **V4** (S) — Scroll-edge effects.
  Where content passes beneath the tab bar and the profile header, a short gradient mask fades
  it into the material instead of a hairline; the 2 px band idiom stays exactly where it is.
  → verify: the dark-grounds and contrast sweeps green; an e2e proves the mask exists only while
  content overlaps the chrome (scrolled) and not at rest.

- **V5** (M) — Optical sizing and per-size tracking.
  The type-scale register gains a rule that tracking is size-specific (negative above 1.5 rem,
  near zero for body, positive for caps under 0.8 rem) and that `font-optical-sizing: auto` is
  set wherever a variable face with an `opsz` axis is loaded.
  → verify: a planted fixed `letter-spacing` across two sizes is red; every display and caps
  site passes; the AR15 hash unchanged.

- **V6** [P] (S) — The press-feedback census.
  Every interactive class in the markup census carries pointer-down feedback (`:active` or
  `whileTap`), both directions with the CSS and the motion sites; feedback is a spring or a
  transition ≤160 ms.
  → verify: a planted button class with no `:active` and no `whileTap` is red; the register
  covers the tab bar, the chips, the rows, the sheet's controls and the map's controls.

- **V7** [P] (S) — The materials register.
  Every `backdrop-filter` site is named with the surface content passes beneath; each site has a
  `prefers-reduced-transparency` answer; a site without a content-passes-beneath reason is red.
  → verify: both directions between the CSS and the register; a planted blur on a card is red.

- **V8** (S) — Directional arrival, proved.
  An e2e that reads the arriving screen's first-frame transform after a forward move (positive y)
  and after Back (negative y), in both reduced-motion states (static in `reduce`).
  → verify: the spec in `gate:accounting`; the history hook's direction pinned by a unit test
  over popstate index pairs.

- **V9** (S) — Haptics where they earn their place.
  The profile switches and the quiz answer vibrate once (≤15 ms) on the same frame as the
  visual change when `navigator.vibrate` exists and reduced motion is off; nothing else vibrates.
  → verify: a test walks every control class and asserts the vibrate call sites equal the two
  named; the causality rule (the toggle flips, then the pulse) asserted by call order.

- **V10** (M) — Frames counted.
  `e2e/support/frames.ts` measures long frames (>32 ms) across a stage change with
  `PerformanceObserver` and pins ≤2 per change at 390 px; a planted 60 ms stall is red.
  → verify: the budget in `gate:accounting`; the plant removed in the same commit's second step.

- **V11** [P] (S) — The icon set.
  Maskable PWA icons, the iOS touch icon and the favicon from one SVG source with the
  `icon-design` platform specs; the manifest names each; no raster hand-edited.
  → verify: a test holds the manifest's icon entries to the files (both directions) and each
  file to its declared size.

- **V12** (M) — The layout under a larger text setting.
  Captures at 130% and 160% for every finder stage, the profile, Learn and the sheet; the touch
  floor at 160%; wraps that break a control fixed in rem; the AR15 manifest gains the two
  text-size dimensions.
  → verify: `pnpm captures` produces the set; the touch-floor sweep runs at 160%; every moved
  cell attributed.

### Design quality (karak-design)

- **V13** (M) — The console sign-in screen against the mobile-auth checklist.
  Keyboard occlusion on iOS and Android emulations, safe areas, 44 px targets on the toggle and
  the submit, plain error copy, no social buttons; one e2e per area.
  → verify: the five e2e cases green; the working-truth proof for `/console/signin` unchanged.

- **V14** (M) — The funnel through forty-seven laws.
  `docs/UX-PSYCHOLOGY-NOTE.md`: the finder funnel and the Learn loop diagnosed against the
  `ux-psychologist` law set, each finding a location and a law; the two that matter most opened
  as V15 and V16.
  → verify: every finding names a file and line; the note's two openers equal V15 and V16's
  scopes (a test greps the ids).

- **V15** (M) — The results moment. Depends: V14.
  The summary card and the first row arrive as one composed moment (peak-end): a single spring,
  the count and the map control settling last, no stagger over 120 ms.
  → verify: an e2e asserts the arrival's frame count; the AR15 cells attributed; V1 sees no
  new spring outside the register.

- **V16** (M) — Learn's pull. Depends: V14.
  The hero's progress as a gradient toward the next unfinished module; the module-end card
  offers exactly one next step; never about the person; copy linted.
  → verify: the Learn e2e proves the next step follows the module order; the linter reaches the
  new copy.

- **V17** (S) — The profile through five layers.
  `docs/PERSONALISATION-NOTE.md`: the filters read Strategy → Scope → Structure → Skeleton →
  Surface; the one structural finding turned into a `→ verify:` for the next personalisation
  unit.
  → verify: the note exists and names one structural finding with a location; nothing in the
  product changes in this unit.

- **V18** (S) — References pinned.
  `adhdme-taste` gains three named references (NHS App, Apple Health, Headspace) with the
  specific deltas this product keeps and refuses, in prose the taste-register test reads.
  → verify: the taste register's test sees the three names; no rule changes.

- **V19** (M) — The generic-pattern register.
  `src/design/generic-patterns.ts` names the AI-generic layouts (centred hero with three icon
  cards, purple-to-blue gradient, a lone accent pop on near-black, emoji section markers, Inter
  as the display face) and a rendered-fixture test fails on each plant while every public page
  passes.
  → verify: five plants red; the public sweep green; the register pinned in `AUDIT-AR`'s
  enforced count.

- **V20** (M) — Learn to hi-fi quality.
  The modules pass the hi-fi dimension checklist — spacing scale, state coverage, iconography
  weight, density, motion — each dimension a captured cell.
  → verify: the checklist as a table in `docs/design-qa/` with a capture per row; the AR15
  cells attributed.

- **V21** (S) — Map polish.
  The zoom stack clears suburb labels; markers press with the house spring; the credit is the
  tiny control; the caption chip only when a GP is unplaced.
  → verify: the map e2e green; V6 sees the markers' feedback; the AR15 map cell attributed.

- **V22** (M) — The waveform hears itself.
  The mic's bars follow the real input level through an `AnalyserNode` reading amplitude only;
  a static equal under reduced motion; the fake recogniser drives the level in e2e.
  → verify: a test proves no audio buffer leaves the node (the only reads are
  `getByteFrequencyData` into a local array); the voice e2e green.

- **V23** (S) — **BLOCKED D-RESULTS-BACK.** The results screen's way out.
  "Start over" becomes "Back" with a history-driven return that keeps the filters, or stays with
  the reason recorded in `founder-gates.ts`.
  → verify: the finder-history e2e walks the control; the copy linted.

- **V24** (S) — **BLOCKED D-LEARN-THESIS.** The Learn thesis line.
  Rendered once at list level, or demoted to the hero's eyebrow, or kept pinned with the reason
  recorded; the working-truth proof updated in the same commit.
  → verify: the working-truth register agrees with the page; the public sweep green.

### Engineering practice (karak-engineering, karak-architecture, karak-product)

- **V25** [P] (S) — The decision record.
  `docs/adr/NNNN-<decision>.md` (MADR) for every open decision in the U plan's §6 and this
  roadmap's §6, status `proposed`, updated to `accepted`/`rejected` the week the decision lands.
  → verify: a test holds the ADR set to the two §6 lists in both directions; a decision without
  an ADR is red.

- **V26** (M) — The architecture drawn from the tree.
  `docs/architecture/c4-context.puml` and `c4-container.puml`; container names held to the
  top-level modules of `src/` and `app/`.
  → verify: both directions between the diagram's container names and the module list; the
  diagrams render (a PlantUML syntax check in the test).

- **V27** (S) — A design document before every `(L)`.
  `docs/design-docs/<unit>.md` in the Google form (context, goals, non-goals, design,
  alternatives, cross-cutting concerns) for every `(L)` unit done or scheduled; a `(L)` row may
  not move to `claimed` without one.
  → verify: both directions between `docs/design-docs/` and the ledger's `(L)` rows.

- **V28** (S) — **BLOCKED D-CODEX-CLI.** The second reader.
  `codex-review` over each week's commits with fixture text excluded by the runner's allowlist;
  findings become rows, never silent edits.
  → verify: the runner's allowlist test proves no file under `e2e/support` or `src/demo` is
  sent; the week's review recorded in the ledger note.

- **V29** (S) — The dependency radar. Depends: U33.
  Each dependency's radar ring recorded in the dependency-reasons register with the volume; a
  Hold-ring dependency is red until a reason names why it stays.
  → verify: both directions with `package.json`; the ring field non-empty for every entry.

- **V30** (M) — Delivery measured from the ledger.
  `scripts/delivery-metrics.mts`: lead time (claim → done) and throughput per week per lane from
  the ledger's own timestamps; `pnpm delivery` prints it; the quarter notes quote it.
  → verify: the parser pinned on a fixture ledger; a row with a done SHA and no timestamp is
  reported, not skipped.

- **V31** [P] (S) — The flake register.
  The W98 timing check carries a machine-aware threshold (calibrated once per run against a
  known-linear workload) and `src/quality/flakes.ts` names every test allowed to depend on
  timing; the gate line stops naming the flake by hand.
  → verify: the check green ten runs in a row on this machine; a planted quadratic workload
  still red.

- **V32** (S) — The suite's wall-time budget. Depends: U28.
  `src/quality/e2e-budget.ts` pins the suite's wall time from the run's JSON report; red above
  12 minutes; lowered when U28 lands.
  → verify: the budget read from the report file, not typed; `gate:accounting` names it.

- **V33** [P] (S) — Captures as a script.
  `pnpm captures <tag>` produces the 390/1280/130% set for every finder stage, the profile, Learn
  and the sheet against a production build, replacing the ad-hoc scripts under `.data-capture/`.
  → verify: the script's output set held to a manifest; `docs/DESIGN-QA.md` entries cite files
  the manifest names.

- **V34** (S) — The moment of installing. Depends: U48.
  One sentence and one control after a completed search, never on arrival, never again once
  dismissed; the choice remembered on the device only.
  → verify: an e2e over `beforeinstallprompt`; the copy linted; the zero-states register sees
  the dismissed state.

### The quarter's re-appraisals and the reckoning

- **V35** (S) — Q1 re-appraised.
  The seventeen sections of the apple-design skill re-scored against the Q1 tree with the delta
  from O249's appraisal; the three lowest sections named as V-lane work for Q2.
  → verify: the note lists seventeen scores and three unit ids; the ids exist in the ledger.

- **V36** (S) — Q2 re-appraised.
  As V35, with V30's delivery metrics for Q1–Q2 in the same note.
  → verify: as V35; the metrics quoted equal `pnpm delivery`'s output on the day.

- **V37** (S) — Q3 re-appraised.
  As V36, with the installed app scored on every section for the first time.
  → verify: as V36; an installed-mode capture per section that needs one.

- **V38** (S) — Q4 re-appraised.
  The year's four scores side by side; the sections that never reached A named with the reason.
  → verify: as V37; the four notes cross-linked.

- **V39** [P] (S) — The roadmap held to the ledger.
  `src/quality/weekly-roadmap.test.ts`: the V ids equal the ledger's V rows in both directions;
  every V unit scheduled in exactly one week; every U unit not yet done scheduled in at least
  one; fifty-two Monday-dated weeks in order; every blocked V unit names a decision defined in
  §6 of either plan.
  → verify: the test green on every verify; red on a planted V41 in the doc with no row.

- **V40** (S) — The refinement reckoning. Depends: U67.
  A section of `docs/ONE-YEAR-APPRAISAL-2027.md` listing every V unit with its measured effect
  and the registers it left standing; the V ledger with no available row.
  → verify: `one-year-appraisal.test.ts` extended to the V counts; the section's ids equal the
  ledger's.

## 6. The decisions this roadmap adds

Three, each recorded where the tree records decisions (`src/design/founder-gates.ts` with its
source-asserting test) and each with a MADR under V25. The U plan's ten decisions are not
restated; §4 places them on the calendar.

- **D-RESULTS-BACK** — does the results header offer "Back" (a history-driven return that keeps
  the filters) instead of "Start over"? Constraints: the finder-history model (U8) is the only
  state; no second state in the URL. Asked week 23, due week 25. Opens V23.
- **D-LEARN-THESIS** — where does the Learn thesis line live: once at list level, as the hero's
  eyebrow, or pinned as it is? Constraints: the working-truth proof for `/approach` and the
  SEO register (O241) must agree with the page. Asked week 23, due week 25. Opens V24.
- **D-CODEX-CLI** — is an authenticated Codex CLI held on the build machine for a second reader
  on each week's commits? Constraints: G8 — no fixture or request text leaves the machine; the
  runner's allowlist is tested. Asked week 30, due week 30. Opens V28.

## 7. What this roadmap will not do

- It does not re-scope a U unit. A week may reorder inside its quarter; a unit's bullet in the
  U plan stays the scope.
- It does not add a lane for the sibling deployment. U64 measures divergence; D-SIBLING-PORT is
  the founder's.
- It does not schedule a founder decision as if it were made. Every blocked row keeps its date
  until the decision lands, and the week says "if decided".
- It does not let a V unit outrun its U unit. V5 waits for U24's week; V3 for U44; V34 for U48;
  V29 for U33; V32 for U28; V40 for U67.
- It inherits every refusal of the U plan's §7 verbatim.

## 8. Definition of done for the roadmap

On the Friday of week 52: every V row `done` or `blocked` with its decision named and dated;
every register the lane laid (V1, V5, V6, V7, V10, V19, V25, V27, V29, V31, V32) standing in
`pnpm verify` with a proven plant; four quarterly re-appraisals recorded with the year's scores
side by side and every section at A or its reason named; `pnpm delivery` reporting the year's
lead time and throughput per lane from the ledger; and `weekly-roadmap.test.ts` green on the
tree the year closed on.
