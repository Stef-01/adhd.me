# ADHD.ME

ADHD assessment you can actually reach. A patient-facing finder that matches people to GPs who do
ADHD assessment — on care area, language and whether the practice is one they can physically get to
— plus a practice-facing console for the demand-matching and shared-care side of it.

Co-founders: **Vikram Ganeshalingam**, **Dr Anubhav Saxena** and **Stefan Thottunkal**.

## Provenance

This repository is a fork of the Meherr / CareYield tree, reoriented from PMOS (formerly PCOS) and
perinatal women's health to ADHD assessment. The engine — registers, pathways, referrals, capability,
credentials, tenancy, the compliance linters — carried over unchanged; the clinical domain, the
public copy and the founder story were rewritten.

`BUILD-STATE.md` is the original unit ledger and is kept as a record. **Entries in it describe the
product as it was when each unit shipped**, so its clinical examples are PMOS ones. It is history,
not a description of this tree — the reorientation is the commits from `Baseline: exact copy` onward.

## What needs a founder decision before this goes live

These are recorded in the suite as well as here, because a note in a README gets read once.

1. **The name asserts a diagnosis.** "ADHD.ME" puts a condition in every page title, URL and
   sentence naming the product, which is condition-targeting by construction. It needs an Ahpra
   advertising review of the *name*, separately from the copy. See the header of
   `src/compliance/landing.ts` and `PRODUCT_FLAGS` in `src/compliance/public-surfaces.ts`.
2. **Dr Saxena is a real person in his own company's directory.** His listing carries a founder
   disclosure (`founderInterest` in `src/demo/clinicians.ts`), and his profile details — suburb,
   languages, availability, care areas — were written here and need his confirmation. No
   registration number or qualification has been invented for him.
3. **Every figure on the public pages is indicative.** The hero card in `app/story-landing.tsx` and
   the evidence block in `src/compliance/landing-copy.ts` are written as ranges precisely because
   none has been confirmed against its source by anybody in this repo. Anchors: the AADPA Australian
   evidence-based clinical practice guideline for ADHD (2022) and the 2023 Senate inquiry into ADHD
   assessment and support services.
4. **The learning links need checking.** `app/clinicians/clinician-walkthrough.tsx` links out to
   AADPA, NICE and the TGA rather than restating their content. The URLs are landing pages rather
   than deep links, and none has been opened from this tree.
5. **Only subject-supplied portraits are used for real people.** The roster includes supplied
   portraits for Dr Anubhav Saxena and Dr Anusha Saxena, and the gated team register holds supplied
   founder portraits. Synthetic profiles always use typographic monograms; nothing in this tree
   generates or substitutes a face for a real person.

## Layout

- `app/` — the finder (`/finder`), the founder story (`/`), the GP walkthrough (`/clinicians`), the
  B2B page (`/practices`) and the practice console (`/console/*`)
- `src/demo/` — the ADHD care-area vocabulary, the fifteen archetypes and the clinician roster
- `src/compliance/` — the copy linters and the public-surface sweep
- `docs/FIVE-YEAR-PLAN.md` — build plan (unit definitions §5)

Synthetic data only, except where marked: `realPerson` in `src/demo/clinicians.ts` flags the one
entry that describes an actual clinician. Founder gates G1–G7 per plan §4.

Verify gate: `pnpm verify` (`typecheck && test && build && audit:gate && perf:gate && gate:accounting`). End-to-end:
`pnpm e2e`, or `E2E_PORT=<port> pnpm e2e` if 3100 is busy.
