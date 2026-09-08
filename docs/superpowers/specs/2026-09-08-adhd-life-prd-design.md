# ADHD Life PRD, implemented in this app — design

Date: 2026-09-08. Founder request: "understand this PRD and implement and merge it, understanding
we have already built out the diagnosis interface and ability but make that finder page broaden
out so it is not just GPs … ensure the eco-bio-social model based care map is implemented as a
visual map screen that you can click into on the learning page as a map icon."

Classification: architectural. The PRD describes a mobile product with a backend, a CMS and Rive
animation. This app is a Next 15 web app with no accounts and device-local state. The design keeps
the PRD's *product* — education first, progressive profiling, a personal ADHD model across four
layers, a support recommendation engine, a provider marketplace that starts from the problem —
and implements it on the stack that exists: deterministic TypeScript in `src/`, React screens in
`app/`, `localStorage` for the person's own model, the existing matching engine for providers.

## What is built

1. **Tabs** (`src/app-shell/tabs.ts`): the PRD's four destinations. `Support` is the finder at `/`
   (the marketplace; tab one stays the product), then `Today` (`/today`), `Learn` (`/approach`),
   `My ADHD` (`/my-adhd`). The filters screen (`/profile`) leaves the bar and is reached from the
   results screen, the settings sheet and the finder; the Support tab claims it as current.
2. **Onboarding** (`/start`, `app/onboarding.tsx`, `src/model/onboarding.ts`): the ten questions
   of PRD §9, one per screen, back allowed, skip where appropriate, saved on every answer. Q7's
   options derive from Q2–Q5. Completion shows "Start here" with a recommended first module and
   no score. Entry from Today, from the Learn page, and from the finder's welcome aside.
3. **Personal ADHD model** (`src/model/`):
   - `layers.ts` — the eco-bio-psychosocial vocabulary (§25): four layers, their subdomains, and
     the P0 life domains (§5).
   - `store.ts` — the device record (`adhdme.model.v1`): onboarding answers, per-module resonance
     (frequency / functional cost / priority, stored separately, §19), personalisation answers,
     confirmed and rejected insights, experiments and outcomes, reflections (device only, never
     in a URL, log or event). Pure functions over a storage host, like `src/learn/progress.ts`.
   - `needs.ts` — derives `Need` objects (§24) from the record: domain, subdomain, signal
     strength, functional cost, priority, confidence, contributors by layer, strengths, context.
   - `recommend.ts` — the rule-based priority model (§36) and next-action engine (§35):
     `priority = cost × priority × persistence × confidence`; professional escalation only after
     self-guided attempts and with interest in support; every output carries an explainability
     record (§64) and a "Why am I seeing this?" sentence (§65). Profession mapping (§38, §40).
   - `safety.ts` — `SafetyRule` records (§50) over reflection text; a trigger suppresses ordinary
     recommendations and routes to the safety screen; each §72 variant has a test.
   - `fatigue.ts` — survey fatigue score and rules (§21).
   - `events.ts` — the analytics taxonomy (§58) and a `track()` that refuses free text.
4. **Interactive modules** (`src/learn/interactive.ts`, `app/interactive-module.tsx`): a third
   module kind with the nine-stage architecture (§12): hook, experience with a choice,
   recognition (resonance), explanation (≤60 words a screen), personalisation (2–4 questions),
   strategy with a micro-experiment offer (§30), optional reflection (§28, safety-checked),
   insight, one primary next action. Step types for the simulations (§17: working memory,
   interruption, ambiguity) and perspective switching (§18). The fifteen MVP modules (§59) with
   the five characters (§15), drawn in the existing illustration system with reduced-motion
   static equivalents. Existing read/quiz modules stay as they are.
5. **Care map** (`/approach/map`, `app/care-map.tsx`): the eco-bio-psychosocial model as a
   clickable SVG map — four regions, a node per subdomain. A node opens what it means, which
   modules teach it, and — when the device holds signals — how it shows up for this person.
   Reached from a map icon on the Learn page header.
6. **My ADHD** (`/my-adhd`, `app/my-adhd.tsx`): §26 — biggest friction, what seems to contribute
   by layer, pattern, what helps, current goal, worth exploring; insight cards (§33) with
   confirm / reject (§29 — only confirmed persists); strategy history (§32); experiment follow-up
   (§31); every recommendation explains itself; delete everything.
7. **Today** (`/today`, `app/today.tsx`): the single most useful next action, or onboarding, or
   a pending experiment follow-up; the safety pathway when a reflection triggered one.
8. **Support** (`/support`, `app/support-path.tsx`): the §37 flow — problem → what may help →
   what you can try → when another person helps → which professions and why → providers. "See
   providers" writes a profession filter to the device and opens the finder. Referral brief
   (§44) built from the model, editable, copied only on the person's action; nothing is shared.
9. **Finder broadened** (`src/support/professions.ts`, `src/demo/roster.ts`,
   `src/demo/synthetic-roster.ts`, finder stages, `src/finder/filters.ts`): a closed `Profession`
   vocabulary (§38 P0), `profession` on every roster entry (the real GPs and the twenty example
   GPs are `gp`), ten example allied providers with expertise tags (§40) and problem tags, a
   profession filter, profession words read out of the sentence, and copy that says "support"
   and "provider" where it said "GP" unless the profession is known.

## What is deliberately not built

Accounts, a backend, a CMS, Rive, native booking, AI reflection summaries, My Manual, support-
person sharing, medication mapping, institutional navigation (all P1/P2 in the PRD), and
anything the PRD lists as out of scope (§90). No diagnosis, no scoring shown to the person.

## Testing

Unit: onboarding derivation, store round-trip and rejection of malformed records, needs
derivation, recommendation boundaries (§67), safety variants (§72), fatigue limits, profession
parsing, module integrity (every module carries every mandatory stage; copy passes the patient
linters), synthetic user profiles A and B (§73). E2E: onboarding → recommendation, module →
My ADHD, reject insight → not persisted, safety interrupts a module, support → providers, the
care map opens from the Learn page, reduced motion. Existing specs pinned to "GP" wording are
updated to the broadened copy.
