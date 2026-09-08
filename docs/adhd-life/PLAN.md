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
| §20 Progressive surveys, four levels | Micro → precision | **Done** — level 1 in modules; levels 3–4 as topic surveys, offered by rule and never launched | `src/model/offer.ts` |
| §21 Survey fatigue | Score and rules | **Done** | `src/model/fatigue.ts` |
| §22–§23 Topic surveys (five) | Work & Study, Relationships, Daily Organisation, Sleep, Emotional Wellbeing | **Done** — 8–12 questions each, §23 result shape, contradictions named | `src/learn/surveys.ts`, `src/model/surveys.ts`, `/survey` |
| §24 Personal ADHD model (Need) | Domain, cost, priority, confidence, contributors… | **Done**, derived on read | `src/model/needs.ts` |
| §25 Eco-bio-psychosocial model | Four layers, subdomains | **Done** + the care map screen | `src/model/layers.ts`, `app/care-map.tsx`, `/approach/map` |
| §26 My ADHD screen | Friction, contributors, pattern, helps, goal, worth exploring | **Done** | `app/my-adhd.tsx` |
| §27 My Manual | Editable personal knowledge | **Deferred (P1)** | — |
| §28 Reflection | Type / voice / select / skip | **Done** | player, `app/voice-reflection.tsx` |
| §29 Reflection interpretation | Suggested reading, user confirms | **Done** — a closed lexicon on the device, no language model; only a confirmed reading enters the model | `src/model/interpret.ts` |
| §30–§32 Strategy → experiment → outcome → history | | **Done** | store, Today, My ADHD |
| §33–§34 Gamification | Discovery, no streaks | **Done** — completion, insight cards; no streaks or points | — |
| §35–§36 Support engine, priority model | Seven actions, rule-based | **Done** | `src/model/recommend.ts` |
| §37 Marketplace flow | Problem → … → providers | **Done** | `app/support-path.tsx`, `/support` |
| §38 Professional categories | Six P0 + five P1 | **Done** | `src/support/professions.ts` |
| §39–§40 Provider model, expertise taxonomy | | **Done** (`profession`, `expertise` on `Clinician`) | `src/demo/roster.ts` |
| §41 Provider match card | "Why you're seeing X", Best for | **Done** — reasons from the engine, Best for on profile | finder stages |
| §42 Matching requirements | Problem fit, scope, preferences | **Done** — problem fit on declared expertise orders allied providers, reason on the card; scope is a filter | `src/support/problem-fit.ts` |
| §43 Booking | Option A external | **Done** already (Healthengine handoff) | — |
| §44 Referral brief | Editable, never auto-shared | **Done** | support path |
| §45–§47 Institutional navigation, support-person sharing, medication experience | `/adjustments`, share a run, `/medication` | **Done** | `app/adjustments.tsx`, `app/play/share-run.tsx`, `app/medication.tsx` |
| §48–§50 Safety | Rules as data, interrupts, no gamification | **Done** | `src/model/safety.ts`, `app/safety-screen.tsx` |
| §51 AI architecture | P0 deterministic | **Done** (no generative AI) | — |
| §52–§54 Stack, services, tables | RN/Expo, Supabase, CMS | **Not adopted** — see ADR 0004 | — |
| §55 Privacy | Consent, delete, no reflection text in analytics | **Done** for a device-local app (delete on My ADHD; `track()` refuses text); no accounts to encrypt | — |
| §56 Accessibility | WCAG AA, reduced motion, captions | **Done** for what exists (a11y sweep green; no audio to caption) | `e2e/a11y.spec.ts` |
| §57 Offline | Cache, queue, sync | **N/A** — device-local by construction | — |
| §58 Analytics taxonomy | | **Done** (constants + guarded `track`) | `src/model/events.ts` |
| §59 Fifteen modules | | **Done** | `src/learn/interactive.ts` |
| §60 Five topic surveys | | **Done** | `src/learn/surveys.ts` |
| §61 30–50 curated providers | | **Partly** — 2 real GPs, 20 example GPs, 10 example allied | — |
| §62–§63 Admin portal, content governance | | **Open**; content is code-reviewed via PR for now | — |
| §64–§65 Explainability | Stored record + "Why am I seeing this?" | **Done** | recommend, `app/life-shell.tsx` |
| §66–§74 Tests | Unit, integration, e2e, safety, quality, fairness | **Done** for what exists | `src/model/model.test.ts`, `e2e/adhd-life.spec.ts` |
| §75–§76 Usability tests | Real users | **Open** — needs the pilot | — |
| §77–§80 Targets, outcomes | | **Open** — measured in the pilot | — |

## 3a. Play (2026-09-08)

The modules are being remade as runs of micro-games — much less text, much more interaction,
Dumb-Ways-to-Die structure without its artwork. The plan is **[PLAY-PLAN.md](PLAY-PLAN.md)**;
it supersedes the nine-stage module format for the interactive modules.

## 4. What comes next, in order

Each item is one PR-sized piece. Nothing below is started.

### Phase A — close the P0 gaps (PRD §89)

- [x] **Five topic surveys** (§22–§23, §60) — `src/learn/surveys.ts`, scored in
      `src/model/surveys.ts` with §67's cases; `/survey?id=…`; offered from My ADHD and the
      support path; result in the §23 shape.
- [x] **Problem-fit matching** (§42) — `src/support/problem-fit.ts`: allied providers ordered
      among themselves by declared expertise against the top need; GPs stay where the engine
      ranks them; the reason is on the row and the profile. Nothing paid exists to alter it.
- [x] **Precision survey offer rule** (§20 level 4) — `src/model/offer.ts`: offered on
      persistence, a stated wish for professional support, or high cost with low confidence;
      never launched.
- [ ] **Real allied providers**: the ten allied entries are examples. Curated real providers with
      declarations, on the same real-person law the two GPs hold (`src/demo/roster.ts` header).
- [x] **Voice reflection** (§28) — `app/voice-reflection.tsx`, the finder's speech session.
- [x] **Screenshots for the QA record** — `qa/adhd-life/*-390.png` and `*-1280.png`, nine
      screens; two findings fixed from the cold look (care-map labels clipping, the desktop tab
      label wrapping).

### Phase B — P1 (PRD §91), after product-market signal

- [x] My Manual (§27) — `/manual`, `src/model/manual.ts`: three sections the person writes
      (what helps, what makes it harder, how to work with me), device-local, copy-as-text to hand
      to a person. Suggestions come from the record — a strategy that helped, a need they named —
      and become text only when tapped; nothing is ever written for them. Pulled forward from
      Phase B on the founder's "continue advancing" (2026-09-08).
- [x] Support-person sharing (§46) — "Share this run" on every run's title card: the link
      carries the module id and nothing else, and says so. (2026-09-08)
- [x] Medication experience (§47) — `/medication`, `src/model/medication.ts`: what it seems to
      change / what it leaves untouched / anything unwanted, in the person's words, on the
      device, copy-as-text to take to whoever manages it. No dose, no timing, no verdict; the
      test refuses those words on the page. Offered from My ADHD when medication is part of the
      person's picture. (2026-09-08)
- [x] Institutional navigation (§45) — `/adjustments`: two tracks, university and work, each with
      what is commonly available, who to ask, what to bring and the order it runs in; the track
      the person's need points at leads; the support path adds a step for institutional needs;
      linked from My ADHD. Content only, the app applies for nothing. (2026-09-08)
- [x] Reflection interpretation (§29) — `src/model/interpret.ts`: a closed lexicon of cues (short on
      sleep, a vague brief, a manager, a phone…) reads a reflection into at most two readings in the
      person's own vocabulary, offered after the reflect beat as "It sounds like … was part of it";
      a yes writes the subdomain and the note as a contributor on the module's need, a "not quite"
      writes nothing, and the text never leaves the reflection. No language model: the PRD's
      "AI" is done as a rule the person can see through, and an LLM can replace the lexicon behind
      the same contract when there is a key and a reason. (2026-09-08)
- [x] P1 professions (§38): psychiatrist, dietitian, relationship counsellor, sleep clinician,
      university support service — five kinds in `professions.ts` with cues the finder reads, one
      synthetic example of each on the roster, a `regular-eating` expertise tag, and the eating,
      gut, sleep and conflict modules naming them. (2026-09-08)
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
