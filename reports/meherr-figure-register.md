# Meherr sales collateral — figure register

Every number in `meherr-sales-deck.pptx` and `meherr-one-pager.docx` appears
below with its source. Generated from `src/collateral/figures.ts`; a test asserts each
computed figure still equals what the code produces, so the assets cannot quote a stale
number.

| Figure | Shown as | Source |
|---|---|---|
| Net annual benefit for a 10-GP practice | $45,029 | computed — `src/economics/roi.ts` (computeRoi(BRIEF_ASSUMPTIONS) — every input stated on the assumptions slide) |
| Return on the Meherr subscription | 4.8× | computed — `src/economics/roi.ts` (incremental revenue ÷ subscription cost, same model) |
| Incremental attended appointments a year | 711 | computed — `src/economics/roi.ts` (incremental only — displaced organic attendance is excluded) |
| Practice size used in the worked example | 10 | assumption — the worked example is a ten-GP practice; the ROI calculator takes the practice's own number |
| Share of appointment capacity unfilled | 8% | assumption — modelling assumption used throughout the build; a pilot measures the real figure per practice |
| Share of generated visits that are genuinely incremental | 60% | assumption — conservative modelling assumption; the holdout measures it for real once a practice runs |
| MBS item 23 patient rebate | $43.90 | published — MBS item 23, effective 2025-07-01 |
| All-in bulk-billed Level B, metro | $69.56 | published — MBS bulk-billing incentives incl. 12.5% practice program, effective 2025-11-01 |

## Not claimed — needs a citation before it may appear

These are the claims a sales asset would usually make and this build cannot source.
They are deliberately absent from both assets.

- Australian market size: number of GP practices and clinicians addressable.
- Industry-wide unfilled-appointment rate (the 8% above is our modelling assumption, not a measured market figure).
- Benchmark DNA rates for Australian general practice.
- Any competitor comparison or win-rate claim.
