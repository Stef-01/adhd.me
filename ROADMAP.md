# Roadmap

No gates, no ledger, no units register — those were deleted on 2026-09-03 on purpose. This is a
working checklist, not a law. Check items off as they land; rewrite sections freely as the product
changes underneath them. If a line stops being true, delete it rather than explaining it away.

Baseline (what exists today, post-strip): a Next.js 15 / React 19 finder (`app/finder-stages/*`) —
welcome, listening (voice + typed), scenarios, type, profile, nearby-map, compare, results, booking
— backed by a matching engine and a synthetic 15-archetype clinician roster (`src/demo/`), a Gold
Coast gazetteer (`src/geo/`), and a large practice-facing console (`app/console/*`) covering intake,
capability, capacity, credentials, matching, outcomes, referrals, reporting, and more. Public pages
cover the founder story, clinician walkthrough, practices, examples, FAQ, privacy, terms.

## Q3 2026 (Sep–Nov) — make the redesign real

The founder's words were "optimise and redesign from the ground up." Read literally: don't just
polish the existing shell, question it.

- [ ] Full-app aesthetic pass — see `AESTHETIC.md`. Every screen gets looked at with fresh eyes,
      not just the ones that were mid-refinement when the ledger was deleted.
- [ ] Re-walk the finder end to end (welcome → listening → profile → compare → results → booking)
      as a first-time user on a phone, at night, tired. Cut anything that costs a decision without
      earning it back. "Delete before you shrink" — the prior design ethos was right; keep it.
- [ ] Console information architecture review: 25+ subsections under `app/console/*` is a lot of
      surface for a demo. Decide what's load-bearing for the practice-side story vs. what's
      speculative breadth that dilutes the demo. Consolidate or cut, don't just reskin.
- [x] **Tracked** (2026-09-03) — each open founder decision from `README.md` §"What needs a founder
      decision before this goes live" now carries the live in-tree anchor where it is actually
      declared, and that section is stated to be the single index. A sixth was added: whether
      `/clinicians` should publish clinical guidance to GPs at all. The strip had quietly broken
      this — the section claimed the flags were "recorded in the suite as well", and they are not:
      `PRODUCT_FLAGS`/`STANDING_FLAGS` lost their tests and nothing imports them. No test was added
      back, because that is the deleted apparatus wearing a new name; the README is the tracking.
- [ ] **Resolve them** — and this one is not an engineering task, which is why it is split from the
      line above. Ahpra review of the *name*, Dr Saxena's confirmation of his own listing, source
      confirmation for the indicative figures and the NSW/QLD pathway claim, opening and checking
      the AADPA/NICE/TGA links, the founder portraits, and whether `/clinicians` should publish
      clinical guidance at all. Every one is a founder or legal call. **Nothing in this repo may
      answer one, and an agent working this roadmap must not tick this line.** It stays open until
      a human with the standing to decide has decided, and the decision is written down here.
- [x] Re-establish a green baseline (2026-09-03) — `pnpm verify` is green on `main`. It was red:
      `src/tenancy/rollout.test.ts`'s non-vacuity probe failed *only* under full-suite load, because
      its n=50 timing sample was ~31µs, shorter than a scheduler quantum, so parallel workers
      inflated the small sample and compressed the ratio through the bound. The harness now derives
      its repeat count from the size (equal items per sample), which puts both sizes in the same
      timer regime and makes the smallest sample milliseconds. Bound and margins unchanged.
      `pnpm e2e` confirmed green on the same tree: **260 passed in 6.8m**, no flakes. (The
      `fault fixture: the render error` lines in that run are an intentional fixture, not a
      failure.) So both halves of the baseline are green as of 2026-09-03.
- [ ] Keep it green. No new ledger; just don't leave `main` broken overnight. If a timing test
      starts flaking again, read the harness note in `src/tenancy/rollout.test.ts` first — the
      failure mode there was a sample too short to measure under parallel-worker load, and it will
      look like a real regression rather than an instrument problem. Standing item, never ticked.
      Last confirmed green 2026-09-03 after the focus-ring and map-marker CSS: `pnpm verify` at
      3686 tests over 225 files, `pnpm e2e` at 260 passed in 6.8m, no flakes.

## Q4 2026 (Dec–Feb) — depth over breadth

- [ ] Matching engine: make the "why this order" explanation (Product Principle #1 — "start with
      the person's words, then show how those words affected the order") legible in the UI, not
      just correct underneath.
- [ ] Practice console: pick the 3–4 modules that best carry the demand-matching/shared-care story
      (likely `matching`, `capacity`, `outcomes`, `referrals`) and bring those to real depth —
      empty states, loading states, error states, keyboard access — before touching the rest.
- [ ] Geo: decide if Gold Coast stays the flagship regional demo or if a second region should exist
      to prove the gazetteer generalises. Don't add a third without a reason.
- [ ] Voice input (`src/voice/speech.ts`): verify it degrades honestly (visible, non-blocking
      fallback to typed input) on browsers/devices without speech support.

## Q1 2027 (Mar–May) — growth surface

- [ ] Learn modules (`app/learn-modules.tsx`) and the two knowledge quizzes: audit against current
      AADPA/NICE/TGA guidance (README flags these links as never actually opened from this tree —
      open them, confirm they still resolve and still say what the copy implies).
- [ ] Public pages (story, practices, examples, FAQ) get an SEO and share-surface pass — this is
      where a prospective practice or a person searching at 2am actually lands first.
- [ ] Examples page (`app/examples/page.tsx`) — make sure the six-plus example personas actually
      demonstrate range (care area, language, reach), not just repeat the same shape.

## Q2 2027 (Jun–Aug) — scale-readiness

- [ ] Accessibility re-sweep against WCAG 2.1 AA (PRODUCT.md's own bar) — this rots quietly as
      screens change; don't assume the last sweep still holds.
- [ ] Performance: re-baseline bundle size and route weight now that `perf:gate` no longer runs
      automatically. Know the numbers even without an enforced budget.
- [ ] Revisit whether the console needs real auth/tenancy hardening if it's ever shown to an actual
      practice, vs. staying a synthetic-data demo indefinitely — that's a founder call, not an
      engineering default.

## Explicitly not doing (until someone asks)

- Rebuilding `BUILD-STATE.md`, the O-numbered unit ledger, gate dossiers, or any founder-facing
  registers. That apparatus was removed on purpose; resurrecting it under a new name defeats the
  point.
- Adding production credentials, live SMS, symptom-based triage, testimonials, or ratings —
  PRODUCT.md rules these out explicitly.
- Generating a face for any real person (Dr Saxena, Dr Anusha Saxena, the founders). Synthetic
  profiles stay typographic monograms.
