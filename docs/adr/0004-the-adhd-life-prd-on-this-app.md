# 4. The ADHD Life PRD is implemented on this app, device-local and deterministic

Date: 2026-09-08

## Status

Accepted.

## Context

The founder brought a separate product's engineering PRD — "ADHD Life", a Headspace-style
interactive ADHD education and precision-support platform — and asked for it to be implemented
and merged here, with two constraints: the assessment finder that already exists stays, but
broadens beyond GPs; and the eco-bio-psychosocial care map becomes a visual screen reached from a
map icon on the Learn page.

The PRD describes React Native, Supabase, a CMS, Rive animation, accounts and an admin portal.
This repository is a Next 15 web app with no accounts, whose only persistent state is on the
person's own device.

## Decision

1. **The product, not the platform.** The PRD's product — education first, progressive profiling,
   a personal model across four layers, a rule-based support engine, a marketplace that starts
   from the problem — is built. The platform it names is not: no backend, no accounts, no CMS, no
   Rive. Content is TypeScript data (`src/learn/interactive.ts`); the model is `localStorage`
   under one versioned key (`src/model/store.ts`); illustration is the existing SVG idiom.
2. **Deterministic and explainable, as the PRD's P0 demands.** No generative AI. Every
   recommendation carries the rule that fired, the inputs it read and a version, and renders
   "Why am I seeing this?" (PRD §64–§65). Safety rules are data with one test each (§72).
3. **Four tabs, the PRD's.** `Support` (the finder, still `/`, still tab one), `Today`, `Learn`,
   `My ADHD`. The filters screen leaves the bar for the settings sheet and the results screen,
   per the PRD's "profile behind the top-right control".
4. **The finder broadens by declaration, not by inference.** Every roster entry carries a
   `profession`; ten invented allied providers join on the same terms as the twenty example GPs;
   a sentence that names a profession narrows the roster; the support path sets a profession
   filter. Nothing reads a person's *need* out of their sentence — that stays the model's, from
   what they answered.
5. **The copy laws stay.** All new copy passes the patient linters. One regex changed: the
   name of a registered profession, "occupational therapist", is exempted from the therapeutic-
   claims rule by lookbehind; "therapy" and "therapist" alone still fire.

## Consequences

- Fifteen interactive modules, five characters, three simulations and three perspective-switching
  modules exist as data, held to the PRD's stage list by test.
- Two synthetic people (PRD §73 A and B) are pinned to get different recommendations; a fairness
  test holds the recommendation constant across stage, depth and medication answers.
- Anything the PRD marks P1/P2 — AI reflection summaries, My Manual, sharing, medication
  mapping, institutional navigation, native booking — is not built, and nothing here pretends to.
- The roster's coverage claims are unchanged: the listed clinicians are still two real GPs.
