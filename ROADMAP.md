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
- [ ] Resolve or explicitly punt (with a written reason) each open founder decision from
      `README.md` §"What needs a founder decision before this goes live": product-name Ahpra
      review, Dr Saxena's listing confirmation, indicative-figures sourcing, learning-link checks,
      founder portraits. These are real legal/ethical flags, not busywork — don't fabricate
      resolutions, just make sure each one is visibly tracked somewhere findable.
- [ ] Re-establish a green baseline: `pnpm verify` (typecheck, test, build) and `pnpm e2e` passing
      on `main` at all times. No new ledger — just don't leave `main` broken overnight.

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
