# Yellow refinement review

Date: 2026-10-03

## Direction

The original `#F1BC31` yellow is again the platform's signature surface. It is concentrated in
the patient and public headers, mobile selected navigation, browser chrome, and small action
details. Warm white remains the working canvas and charcoal remains the primary action colour, so
the restored identity does not reintroduce the visual density removed by the October refinement.

The gold ramp is used only where text must remain readable: links, selected filters, focus states,
and light highlighted surfaces. No new gradient was introduced and the existing illustrated game
worlds retain their own scoped palettes.

## Evidence

The reproducible capture scripts cover the app entry screens plus the complete search-to-profile
flow at 390px and 1440px. Captures and overflow results are stored in `qa/yellow-refinement/`.

- `support`, `learn`, `modules`, `my-adhd`, and `today`: 10 captures
- search results and clinician profile: 4 captures
- every captured state reports no horizontal overflow

## Verification

- TypeScript typecheck: passed
- Production build: passed
- Vitest: 338 files, 4,915 passed, 1 skipped
- App shell and finder refinement: 30 scenarios passed after one timeout-only rerun
- Public WCAG 2.1 AA sweep: passed at desktop, 768px, 390px, and 320px
- Visual review: support, learning, dashboard, search results, and clinician profile checked at
  phone and desktop widths
