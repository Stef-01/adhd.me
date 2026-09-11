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
| §27 My Manual | Editable personal knowledge | **Done**, pulled forward from Phase B (2026-09-08) | `app/manual.tsx`, `src/model/manual.ts`, `/manual` |
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
| PRD v2 ADHD Lives (engine, renderer, results, modules, Toolkit) | Phase L | **L0–L5 done**; L6 balancing, sound and audio assets next | `src/lives/`, `app/lives/` |
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
- [ ] Accounts and sync — the first thing that needs a backend. **Argued 2026-09-10 in ADR 0008**
      (three options, a recommendation: sync without identity behind the matching journal's two
      variables, a recovery code instead of an email); the decision is the founder's.

### Phase L — ADHD Lives (PRD v2, `docs/adhd-lives/PRD-v2.md`, ADR 0006)

The founder's second PRD: eight lives, a Chaos Run on a session director with lives, score and
FASTER, and a learning layer that surfaces after play through "this is me". Built on this web app
with a renderer-independent engine (`src/lives/`), so a Skia renderer can take the same engine on
native later. Mapped from the PRD's phases 0–6:

- [x] **L0–L1 Engine** (PRD §99–§100): types in design coordinates; seeded randomness (§90);
      difficulty as eight dimensions (§58); score, three lives, FASTER every four (§59–§61);
      the session director's eight constraints with a rejection log for the lab (§57); the run
      reducer (§85–§86). `src/lives/`, unit tests. (2026-09-08)
- [x] **Registries as data** (§23–§26, §46, §96): eight characters with patterns, mechanics,
      domains and "things they are trying"; twenty-two games as engine configurations (the six
      of the vertical slice, eight signature games, eight fun games); sixteen strategies with
      claims and review status; sixteen modules as block lists, four full (Meeting Anchor, Why
      Am I Here?, Pause Before Send, Lower the Sensory Floor) and twelve at the same shape.
      `validate:content` fails the suite on a broken reference (§110). (2026-09-08)
- [x] **Recommendation engine and profile** (§31–§35, §63–§65, §108): deterministic weights with
      a reason per row; resonance signals as the only basis for personalisation; the Toolkit,
      the Learn Later queue, goals and high score on the device. (2026-09-08)
- [x] **L2 The games, playable** (§97, §101): `src/lives/layout.ts` lays every engine out in
      design coordinates from the seed (entities, routes, taunts, timing windows, hold cues), held
      by `layout.test.ts` across every game × difficulty × ten seeds — inside the box, at the
      48px floor, deterministic, one safe route. `app/lives/engines.tsx` renders the ten engines;
      `app/lives/run.tsx` drives the beats on one clock — intro, active, resolution, FASTER,
      transition — with the HUD (three beans, the score, the draining bar) after Dumb Ways to
      Die 2's structure (`docs/adhd-lives/DESIGN-dwtd2.md`). Under reduced motion there is no
      clock and every beat ends on a button; the one engine without a natural wrong choice offers
      "Skip this one (costs a life)". `/lives/play?seed=` replays a run (§90). (2026-09-08)
- [x] **L3 Results and Toolkit** (§5–§7, §36, §102): `app/lives/results.tsx` — score, new high
      score, moments survived, AGAIN, then "Anything feel familiar?" with This is me / Sometimes /
      Not me per character met, then up to three strategies with Try now / Save / Not for me.
      `/lives/toolkit`: your tools (Trying / Useful / Not for me, a note, remove) and the saved
      queue. `/lives/lab` is §106–§107: the recommendation debugger with raw scores and reasons,
      the director's rejection log for a seed, every module as JSON, reset. (2026-09-08)
- [x] **L4 ModuleRenderer** (§25, §103): `app/lives/module-renderer.tsx` — one renderer over the
      ten block types, one block a card, the meeting-anchor practice as the first activity, the
      last action plan as MAKE IT YOURS (§39) writing the personal configuration; the strategy
      lands in the Toolkit as Trying. `/lives/learn` is §28's home (For you, two-minute tools,
      six shelves); `/lives/characters` is §41; `/lives` is §82 with §83's optional goals.
      `e2e/adhd-lives.spec.ts` drives §98's journey end to end. (2026-09-08)
- [x] **L5 Content** (§104): thirty-two games as engine configurations (ten more: a game per
      life across every engine, two more fun ones; fun stays a quarter of the roster), and all
      sixteen modules full — recognise, understand, try, personalise, one action — with the
      validator and the suite refusing a stub. Every new game is linked from its strategies so
      the score screen can bring it back. (2026-09-09)
- [ ] **L6 Balancing and the rest** (§105): balancing against real people; sound; audio
      recordings (§72) have no asset yet, though the three sessions that want them exist. Done
      2026-09-10 (later): §16's five sessions complete (the 60-second reset, before a difficult
      conversation, brain-everywhere grounding join the sleep settle and the transition reset),
      each with a visual timer, a skip and its transcript as data behind an audio block
      (`src/lives/transcripts.ts`; the renderer reads the transcript until a recording exists;
      the validator refuses an audio block without one); §76 evidence references on all nineteen
      modules, document-level citations only, the validator refusing a module without one; §37's
      one post-run reflection question. Done 2026-09-10: haptics behind a chip (`src/lives/haptics.ts`,
      off by default), reduced flashing and reduced sensory effects as device flags read by the
      run, more strategy mappings with coverage asserted, props that react in place. Done: a relaxed-timing setting (half as long again on
      every clock, the score unchanged) and larger instructions (§93), two chips under a fold on
      the Lives home, kept on the device and read by the run. (2026-09-09) Done already: character stories (§41), Learn home (§28), the §67 events with §68's
      guardrail as a test, reduced motion and keyboard equals (§93–§94).
- Known divergence, recorded rather than claimed: PRD §88 says never to drive per-frame position
  from React state, and `app/lives/run.tsx` ticks `progress` and `elapsed` through `useState` from
  a `requestAnimationFrame`, which every engine reads as props to place its things. Moving that
  to refs and CSS custom properties is a refactor across all seven engines in the most-tested
  interactive part of the app; it stays open until a measured frame-time problem on a real phone
  justifies the risk (the Leo swarm's 22 seconds are green in e2e today).
- Founder decisions still open: whether and when a native Expo build starts (ADR 0006 keeps
  the engine portable); the eight lives replacing the five beans in the existing runs.

### Phase M — bidirectional GP matching, a six-month sprint (ADR 0007, 2026-09-09)

The founder's third brief: move the matching model from one-directional search to a
bidirectional one, where GPs declare how they work and what they want proposed, patients write
or speak a narrative, a two-stage pipeline (hard filters plus cosine similarity, then deferred
acceptance) presents a top three with a reason each, and a mutual post-consult feedback loop
improves the weights. Built as a modular service under `src/lib/matching/` so it can be
generalised to another condition by changing the vocabularies. Six months, one milestone a
month, the first four landed together in this unit; the sprint runs to 2027-03-09.

- [x] **M1 (to 2026-10-09): the service.** Five entities (Patient, GP, Match, Feedback,
      DocumentChecklist) in `src/lib/matching/types.ts`; a lexical embedder with a closed concept
      layer behind an `Embedder` interface (`embedding.ts`); candidate generation with eight named
      hard filters and cosine similarity to a shortlist of ten to fifteen (`candidates.ts`);
      both-sided ranking with printed breakdowns and global weights pinned to sum to one
      (`ranking.ts`); many-to-many deferred acceptance, stable by property test
      (`deferred-acceptance.ts`); the rationale from the concept overlap (`rationale.ts`); roster
      adapters that invent nothing for a real person (`adapters.ts`); the store, registered for
      reset, erasure and export (`store.ts`); the SQL mirror (`supabase/migrations/0006`).
      Ninety-four unit tests, every patient-facing sentence through the landing linter. (2026-09-09)
- [x] **M2 (to 2026-11-09): intake and the three.** `/match`: the narrative typed or spoken
      through the finder's speech session, suburb, who it is for, appointment style, billing;
      `/match/results`: up to three GPs, each with the headline and points the pipeline wrote,
      the badges (checked on a date, or declared and not yet checked; places open; telehealth;
      training declared), and where the request stands on the GP's side; `/gp/[id]`: the public
      profile with how they work, who they see, credentials as declared and as checked, the
      availability indicator, and the one aggregate sentence with its floor of five. The request
      id lives in the tab's session storage, never the address bar. (2026-09-09)
- [x] **M3 (to 2026-12-09): the GP side.** `/console/gp` and `/console/gp/[id]`: the profile the
      matcher embeds (bio, how they approach medication, dose pace, years, AADPA and RACGP
      declarations, age groups, what they see alongside, ways of working, telehealth, taking new
      matches), the bidirectional preferences (age groups wanted, appointment styles, billing,
      complex comorbidity, the minimum fit below which nobody is proposed), the capacity slider,
      credential evidence offered by name, and the incoming requests with accept or decline (a
      reason required) as explicit acts that refuse a second answer. (2026-09-09)
- [x] **M4 (to 2027-01-09): preparation and the loop.** `/match/prep`: the checklist generated
      from the narrative's signals with a reason per item, saved ticks, the five-heading timeline
      template, and what to expect from the GP's own declarations; `/match/feedback` and the GP's
      two questions on the dashboard: recorded per match, aggregated per GP, and fed to a bounded
      learning pass over the global weights from eight records up. `e2e/matching.spec.ts` drives
      the whole loop in a real browser. (2026-09-09)
- [ ] **M5 (to 2027-02-09): wiring.** Supabase behind the store (`0006_matching.sql` is the
      shape), practice membership scoping which console account manages which GP profile, the
      evidence upload through the credentials vault with a verifier's act recording the date, and
      a dense embedder behind the `Embedder` interface evaluated against the lexical one on the
      corpus in `src/matching/corpus.ts`. **Landed early (2026-09-10):** the finder's two doors
      to `/match` (the welcome aside and a sentence under the results); the person's own
      erasure door ("Delete my request" removes the row, the matches, the feedback and the
      checklist from the GP's side too, `DELETE /api/match/patient/[id]`); the timeline headings
      as text on the clipboard; **the store behind Supabase** (`src/lib/matching/persistence.ts`:
      a journal mirrors every write over PostgREST in order and a cold instance hydrates from
      the five tables before its first read; present only with `SUPABASE_URL` and
      `SUPABASE_SERVICE_ROLE_KEY`, otherwise the store is what it was); **the dense embedder and
      its bench** (`dense-embedder.ts` behind the `Embedder` interface, primed from an
      OpenAI-compatible endpoint under `ADHDME_EMBED_URL`/`_MODEL`/`_KEY`; `embedder-eval.ts`
      ranks any embedder on twelve labelled narratives against the roster's bios and on the
      reach corpus's 451 labelled requests; lexical baseline pinned at top-1 75%, top-3 83%,
      MRR 0.804, corpus neighbour agreement 64%, its two misses named); **practice scoping**
      (`access.ts`: a practice claims a profile from `/console/gp`, its members and staff manage
      it, every action re-checks, an orphaned claim is no claim; `0007_matching_practice_scope.sql`);
      **the verifier's act** (`recordVerification`: staff only, needs offered evidence to accept,
      records who and the date; the public profile reads it back as "checked on"). What stays
      founder-gated is the document's bytes: the vault's `content` is synthetic by G2/G6 until the
      founder rules on real documents, so the upload keeps the name and date and not the file;
      and the learning loop read as a report on `/console/gp` (the
      five declared weights, the weights in use, the correlation each rests on, and the record
      count against the floor), which M6 asked for. **Known on the live site (2026-09-10):** the
      store is in memory per serverless instance, so the patient's screens keep their own copy
      in the tab and say when it came from there; a GP answering from the console reaches the
      patient only on one process. Wiring the store is what M5 is for, and this is why.
- [ ] **M6 (to 2027-03-09): the pilot.** Real GPs on their own declarations (the real-person
      law), ten to twenty matched patients, the learning loop run on real records and its weight
      shifts read as a report, the top-three explanation tested for comprehension, and the
      bidirectional evidence question the brief cites answered on this product's own numbers:
      does letting both sides declare improve fit and completion against the one-directional
      finder.
- Founder decisions opened by ADR 0007: a GP-facing evidence upload before the vault is wired;
  "felt understood" counts on a public profile under the Ahpra testimonial guidance; whether the
  finder routes to `/match` or the two coexist.

### Phase T — the text budget and the two-pane Learn (founder-directed, 2026-09-10)

- [x] **Games and modules apart.** The Learn tab is two panes with a swipe and a tab pair:
      Games (the Chaos Run's eight lives, Leo's moment, the twenty bean runs, eight tiles then
      the rest on a tap) and Modules (For you from the Lives loop, the reads and quizzes, the
      sixteen strategy modules on shelves, the Toolkit, a quiet moment, the goals). The
      `/lives/learn` library folded in; a module opened by URL returns to its own side.
      `app/learn-panes.tsx`, `e2e/learn-panes.spec.ts`. (2026-09-10)
- [x] **The walkthrough, deleted.** The first attempt hid every explanatory sentence behind a
      switch and counted the hiding as a cut. The founder called that a failure of empathy, and
      the switch, `<Explain>`, its register and its rules were deleted the same day.
      `docs/design/text-budget-postmortem.md`. (2026-09-10)
- [x] **The text budget, measured on the whole screen.** `scripts/text-budget.mjs` counts every
      visible word on every route at 390 x 844 against Headspace (38, 26, 60) and Finch (19);
      ceiling 60, target 40. Median app screen 87 at the honest baseline, 36 after five cutting
      batches, 17 of 30 app screens at the target and 23 of 30 under the ceiling before batch
      six; after batches six and seven, 32, with 20 of 31 at the target and 31 of 31 under
      the ceiling. `AESTHETIC.md` holds the account. (2026-09-10)
- [x] **The slop pass.** Em-dashes out of every visible string (225 lines), the eyebrows that
      repeated the tab, the uppercase activity labels, the meditation studio's shouting.
      (2026-09-10)
- [x] The three match screens and the GP profile at Headspace's home density (40): match
      results 10, prep 17, intake 30, the GP profile 38. (2026-09-10)

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
