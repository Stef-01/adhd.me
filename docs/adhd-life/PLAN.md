# ADHD Life — the consolidated plan

One document for the ADHD Life PRD as it lives in this repository: what the PRD asked for, what
`claude/adhd-life-prd-implementation-x3dxir` (PR #3) shipped, what is deliberately deferred, and
the order of what comes next. `ROADMAP.md` points here; `docs/adr/0004` records the decision to
build the product on this stack rather than the PRD's; `CONTEXT.md` holds the vocabulary.

Founder direction (2026-09-08): implement the PRD, keep the assessment finder but broaden it
beyond GPs, and make the eco-bio-psychosocial care map a visual screen reached from a map icon on
the learning page.

## 1. The product in one sentence

A Headspace-style interactive ADHD learning app that progressively learns how ADHD affects a
person's brain, body, environment and relationships, helps them improve those areas through short
practical experiences, and connects them to the exact type of professional support they need when
self-guided support is no longer enough.

## 2. Principles this plan holds to (PRD §3)

Education first · progressive profiling · life problems before professions · function before
pathology · context matters (four layers) · patient agency (nothing confirmed without a "that's
me") · professional care is one output of seven, never the default. Plus this repo's own laws:
patient copy passes the linters, no diagnosis, no scoring shown, nothing personal in a URL, a log
line or an analytics event.

## 3. Status by PRD section

| PRD | What it asks | Status | Where |
| --- | --- | --- | --- |
| §6 Information architecture | Today · Explore · My ADHD · Support; profile top-right | **Done** — Support (finder) · Today · Learn · My ADHD; filters behind settings | `src/app-shell/tabs.ts` |
| §8–§10 Onboarding | Ten questions, one a screen, "Start here" output | **Done** | `src/model/onboarding.ts`, `app/onboarding.tsx`, `/start` |
| §11–§12 Learning engine, nine stages | Module as structured interactive object | **Done** as TypeScript data, not CMS | `src/learn/interactive.ts`, `app/interactive-module.tsx` |
| §13–§15 Illustration, characters | Five characters, poses, moods | **Done** in the existing SVG idiom; no Rive | `app/characters.tsx` |
| §16 First hero module | "Why ADHD can look different" | **Done** (`context`) | `src/learn/interactive.ts` |
| §17 Simulations | Working memory, interruption, ambiguity | **Done**, button-driven | `app/interactive-module.tsx` |
| §18 Perspective switching | Relationship modules | **Done** (three modules) | same |
| §19 Resonance capture | Frequency, cost, priority, stored separately | **Done** | `src/model/store.ts` |
| §20 Progressive surveys, four levels | Micro → precision | **Level 1 done** (in-module questions); levels 2–4 open | — |
| §21 Survey fatigue | Score and rules | **Done** | `src/model/fatigue.ts` |
| §22–§23 Topic surveys (five) | Work & Study, Relationships, Daily Organisation, Sleep, Emotional Wellbeing | **Open** | — |
| §24 Personal ADHD model (Need) | Domain, cost, priority, confidence, contributors… | **Done**, derived on read | `src/model/needs.ts` |
| §25 Eco-bio-psychosocial model | Four layers, subdomains | **Done** + the care map screen | `src/model/layers.ts`, `app/care-map.tsx`, `/approach/map` |
| §26 My ADHD screen | Friction, contributors, pattern, helps, goal, worth exploring | **Done** | `app/my-adhd.tsx` |
| §27 My Manual | Editable personal knowledge | **Deferred (P1)** | — |
| §28 Reflection | Type / select / skip | **Done** (voice open) | player |
| §29 AI reflection interpretation | Suggested interpretation, user confirms | **Deferred (P1)** | — |
| §30–§32 Strategy → experiment → outcome → history | | **Done** | store, Today, My ADHD |
| §33–§34 Gamification | Discovery, no streaks | **Done** — completion, insight cards; no streaks or points | — |
| §35–§36 Support engine, priority model | Seven actions, rule-based | **Done** | `src/model/recommend.ts` |
| §37 Marketplace flow | Problem → … → providers | **Done** | `app/support-path.tsx`, `/support` |
| §38 Professional categories | Six P0 | **Done**; P1 kinds open | `src/support/professions.ts` |
| §39–§40 Provider model, expertise taxonomy | | **Done** (`profession`, `expertise` on `Clinician`) | `src/demo/roster.ts` |
| §41 Provider match card | "Why you're seeing X", Best for | **Done** — reasons from the engine, Best for on profile | finder stages |
| §42 Matching requirements | Problem fit, scope, preferences | **Partly** — profession scope + existing preference matching; no problem-tag scoring yet | — |
| §43 Booking | Option A external | **Done** already (Healthengine handoff) | — |
| §44 Referral brief | Editable, never auto-shared | **Done** | support path |
| §45–§47 Institutional navigation, support-person sharing, medication experience | | **Deferred (P1)** | — |
| §48–§50 Safety | Rules as data, interrupts, no gamification | **Done** | `src/model/safety.ts`, `app/safety-screen.tsx` |
| §51 AI architecture | P0 deterministic | **Done** (no generative AI) | — |
| §52–§54 Stack, services, tables | RN/Expo, Supabase, CMS | **Not adopted** — see ADR 0004 | — |
| §55 Privacy | Consent, delete, no reflection text in analytics | **Done** for a device-local app (delete on My ADHD; `track()` refuses text); no accounts to encrypt | — |
| §56 Accessibility | WCAG AA, reduced motion, captions | **Done** for what exists (a11y sweep green; no audio to caption) | `e2e/a11y.spec.ts` |
| §57 Offline | Cache, queue, sync | **N/A** — device-local by construction | — |
| §58 Analytics taxonomy | | **Done** (constants + guarded `track`) | `src/model/events.ts` |
| §59 Fifteen modules | | **Done** | `src/learn/interactive.ts` |
| §60 Five topic surveys | | **Open** | — |
| §61 30–50 curated providers | | **Partly** — 2 real GPs, 20 example GPs, 10 example allied | — |
| §62–§63 Admin portal, content governance | | **Open**; content is code-reviewed via PR for now | — |
| §64–§65 Explainability | Stored record + "Why am I seeing this?" | **Done** | recommend, `app/life-shell.tsx` |
| §66–§74 Tests | Unit, integration, e2e, safety, quality, fairness | **Done** for what exists | `src/model/model.test.ts`, `e2e/adhd-life.spec.ts` |
| §75–§76 Usability tests | Real users | **Open** — needs the pilot | — |
| §77–§80 Targets, outcomes | | **Open** — measured in the pilot | — |

## 4. What comes next, in order

Each item is one PR-sized piece. Nothing below is started.

### Phase A — close the P0 gaps (PRD §89)

- [ ] **Five topic surveys** (§22–§23, §60): Work & Study, Relationships, Daily Organisation,
      Sleep, Emotional Wellbeing, 8–12 questions each, offered from My ADHD and the support path,
      gated by the fatigue engine, output in the §23 "Your work pattern" shape. Data in
      `src/learn/surveys.ts`; scoring in `src/model/surveys.ts` with §67's tests (valid, skipped,
      contradictory, empty, incomplete).
- [ ] **Problem-fit matching** (§42): score allied providers on `expertise` against the top
      need's subdomain, above the existing preference matching, and say the reason in the card.
      Paid placement never alters the order (there is none; write the test anyway).
- [ ] **Precision survey offer rule** (§20 level 4): offered only on explicit request, persistence,
      or when a provider match would benefit — never launched automatically.
- [ ] **Real allied providers**: the ten allied entries are examples. Curated real providers with
      declarations, on the same real-person law the two GPs hold (`src/demo/roster.ts` header).
- [ ] **Voice reflection** (§28): the finder's speech session reused for the reflect step.
- [ ] **Screenshots for the QA record** (`adhdme-taste` §honesty.qa-capture): the eight new
      screens at 390 and desktop into `qa/`.

### Phase B — P1 (PRD §91), after product-market signal

- [ ] My Manual (§27) — editable, never auto-labelled.
- [ ] Support-person sharing (§46) — a module by link, no health information unless chosen.
- [ ] Medication experience (§47) — what improved / what remains / unwanted effects → "discuss
      with your prescriber"; no dosing, no advice.
- [ ] Institutional navigation (§45) — university accommodations, workplace adjustments.
- [ ] AI reflection interpretation (§29) — only a confirmed interpretation enters the model.
- [ ] P1 professions (§38): psychiatrist, dietitian, couples therapist, sleep clinician,
      university support service.
- [ ] Accounts and sync — the first thing that needs a backend; ADR 0004 is where to argue it.

### Phase C — pilot (PRD §87–§88)

- [ ] Closed pilot, 30–50 users, 2–4 weeks: onboarding completion and median time, module
      comprehension, survey fatigue, relevance, emotional tone, matching understanding.
- [ ] Primary question: does the app genuinely help people understand themselves? North star:
      share reporting meaningful improvement in their self-chosen priority within 90 days (§79);
      secondary: share who can say what kind of help would be useful and why (§80).

## 5. Definition of done for a module here (PRD §94, applied)

Learning objective in the subtitle · script as data · illustration from `app/characters.tsx` ·
branch logic in the steps · resonance step · targets named (signal mapping) · at least one strategy
as a micro-experiment · optional reflection · every string passes `lintLandingCopy` · reduced-
motion equal · events via `track` · a place on the care map through its targets · held by
`src/learn/interactive.test.ts`. Clinical review and user comprehension tests are Phase C.

## 6. Open founder decisions

1. Whether the allied roster should carry real providers before the pilot, or examples are enough
   for demo day.
2. Whether `Support` stays the name of the first tab (the PRD's word) or returns to `Find`.
3. Whether the P1 list above is the order, or medication experience should come first given the
   GP interview's warning about medication crowding out the rest.
