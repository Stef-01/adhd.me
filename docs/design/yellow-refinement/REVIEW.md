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

## Follow-up refinement

The second pass makes the result set faster to scan on a phone without changing the finder model
or the visual world. Interpreted-request chips now remain on one horizontally scrollable row,
provider rows always name their type, and the mobile row rhythm fits more clinicians above the
fold. Portrait frames carry a warm loading ground instead of briefly reading as missing assets.

The gradient and liquid-glass environments remain scoped to voice and game experiences. A design
integrity test now guards those authored layers from being flattened by future shared-brand work,
and `qa/yellow-refinement-2/` includes a representative gradient game at both target widths.
