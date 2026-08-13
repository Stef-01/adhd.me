# Design QA checklist — practice console (W11)

Applies to every console surface (`/console/*`) and the patient booking page (`/book/*`).
Re-run this checklist whenever a console surface is added or restyled; it stands in for the
impeccable/taste-skill pass when those skills aren't installed in the building session
(note which in the ledger row).

## Checklist (W11 pass: 2026-08-08, builder-B — all items checked manually)

### Consistency
- [x] One type scale: page titles `text-2xl font-semibold tracking-tight`, section heads `font-medium`, body `text-sm`.
- [x] One palette: stone neutrals only; amber reserved for validation notes; no ad-hoc colors.
- [x] Shared primitives used (`app/console/ui.tsx`) — no page-local button/input styling.
- [x] Same header on every console page; sign-out always visible when signed in.

### Forms
- [x] Every input has a visible `<label>` (associated — Playwright drives pages via `getByLabel`).
- [x] Numeric constraints mirrored client-side (`min`/`max`/`required`) and enforced server-side (store validation).
- [x] Validation failure shows a visible, non-blaming note and loses no other page state.
- [x] Primary action is a single, obvious button; no competing calls to action.

### Copy (compliance posture — mirrors the W6 linter)
- [x] No clinical claims, urgency, or "overdue" framing on any surface.
- [x] No testimonials, ratings, or "specialist" anywhere.
- [x] Settings explained in plain English (e.g. holdout: "never invited, so incremental impact stays measurable").

### Accessibility (screening level — full WCAG pass is W49)
- [x] Focus states visible on all interactive elements (`focus:ring`).
- [x] Text contrast ≥ 4.5:1 (stone-900/-700/-500 on white/stone-50; checked against WCAG AA table).
- [x] All pages usable keyboard-only (forms are native HTML; no custom widgets).

### States
- [x] Signed-out access to any console page redirects to sign-in (e2e-verified).
- [x] Console with no practice routes to onboarding, not an empty dashboard (e2e-verified).
- [x] Booking page renders a designed state for every invitation status (offer/booked/expired/opted-out/invalid).

## Landing page (W23) — public B2B marketing site (`/`)

Pass 2026-08-09, builder-B — all items checked manually (taste-skill unavailable in loop env).

### Positioning & audience
- [x] Audience is general-practice owners/managers — B2B throughout; no patient-directed copy.
- [x] Positioning per venture brief §Phase 1: measured filling of unused appointment capacity.
- [x] Measurement (holdout, incremental-per-1,000) is a first-class section, not a footnote.

### Copy compliance (regulated-advertising exposure = zero)
- [x] No clinical/therapeutic claims, no condition targeting — enforced by `lintLandingCopy` (src/compliance/landing.ts), gated in CI via the copy bundle test.
- [x] No testimonials or ratings anywhere (CLAUDE.md law 6) — linter-enforced.
- [x] No superlatives, guarantees, urgency, or "specialist" — linter-enforced.
- [x] Footer states the B2B scope explicitly ("Not patient medical advice").

### Design & accessibility
- [x] One type scale and stone palette shared with the console; single primary CTA per section.
- [x] Semantic landmarks (`header`/`nav`/`main`/`footer`), ordered list for the steps, in-page anchors.
- [x] Focus-visible on all links/buttons; text contrast ≥ 4.5:1; responsive (single-column on mobile).
- [x] Public — renders with no auth; CTAs route to /demo and /console/signin (e2e-verified).

## Results page (W42) — practice-facing incrementality, `/console/results`

Pass 2026-08-09, builder-B. v1 (`/console/dashboard`) is unchanged and remains the
detailed measurement view; this page restates the same arithmetic for a practice
manager. Consolidating the two views is a follow-up (W49/W51), not this unit.

### Comprehension checklist — the W42 verification artifact

A practice manager should answer each of these correctly after ~60 seconds on the page.
Each is asserted in `e2e/results.spec.ts`, so the checklist cannot rot.

| # | Question they must be able to answer | Element that answers it |
|---|---|---|
| 1 | How many extra appointments did we get? | "Extra appointments" tile — a whole number, with "about N a week" underneath |
| 2 | Is anything going wrong? | Status line above the tiles, plain sentence + dot, before any number |
| 3 | Why is that smaller than the bookings Meherr generated? | "Why the smaller number is the real one" card: prose, split bar, and the explicit "counting all N would let us claim $X" sentence |
| 4 | What is it worth? | "Extra billings, estimated" tile, with its per-visit assumption stated on the tile |
| 5 | How many patients asked us to stop? | "Patients who asked us to stop" tile, as a count and a percentage of messages |
| 6 | Which weeks were good or bad? | Two-group chart + the week-by-week table (same data, either route) |
| 7 | How is this measured, if I want to check? | "How this is measured" details block, closed by default |

### Copy compliance (linter-enforced)
- [x] Copy lives in `src/compliance/`-adjacent data (`src/console/results-copy.ts`) and is linted by `lintCopyBundle` — the same gate the public landing copy passes (no clinical claims, no testimonials/ratings, no superlatives, guarantees or urgency).
- [x] Measurement jargon is banned by test: no "incrementality", "holdout", "per 1,000", "attribution", "arm" — asserted in unit tests AND against the rendered page in e2e.
- [x] The raw generated-booking count never gets a headline tile (ATTRIBUTION v1 says it is never headlined); it appears only inside the card that explains why it is not the impact figure.
- [x] Continuity is described as a rule that held, never as a result — it is 100% by construction under usual-GP-only eligibility, so presenting it as an outcome would be a fabricated win.
- [x] Demonstration data is labelled as such, in neutral stone (nothing is wrong), not an alarm colour.

### Dataviz method (skill-conformant)
- [x] The headline is a **hero number, not a chart** — the anti-pattern catalog's most common miss is spending a chart on a one-number story.
- [x] Two-series categorical palette `#2a78d6` / `#eb6834` validated with `scripts/validate_palette.js`: light — CVD ΔE 24.7, normal 33.6, contrast ≥3:1; dark (`#3987e5` / `#d95926`) — CVD ΔE 26.8, normal 31.8. All six checks PASS in both modes.
- [x] Colour follows the entity: the two slots are fixed in the shared component, never repicked per page.
- [x] Single axis; no dual-axis chart anywhere.
- [x] Legend present for both series, plus direct end labels; identity is never colour-alone.
- [x] Hover layer (crosshair + tooltip) inherited from the shared chart; tooltip states both groups and their difference in the page's own unit.
- [x] Table view is the accessible equivalent of the chart, with a `<caption>` and scoped column headers.

### Design & accessibility
- [x] Shared `ConsoleShell`, type scale and stone palette — consistent with every other console surface.
- [x] Semantic structure: `h1` → `h2` sections, `figure`/`figcaption`, `table`/`caption`/`th[scope]`, `dl` for the method summary, `details`/`summary` for progressive disclosure.
- [x] Numbers use `tabular-nums` so columns align.
- [x] Null-safe: a practice with no comparison group renders an em dash, never a zero or the raw count dressed up as impact (unit-tested).
- [x] Signed-out access redirects to sign-in (e2e-verified).
