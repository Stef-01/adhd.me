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

The unit ledger (`BUILD-STATE.md`), the five-year plan, the gate dossiers and the founder-facing
registers were **deleted on 2026-09-03** at the founder's instruction ("delete all rules for this
app, keep it as nothing, we need to optimise and redesign from the ground up"). Comments throughout
`src/` still cite them by filename — those citations are history, and the reasoning they carry is
worth keeping even though the documents are gone. Current planning lives in `ROADMAP.md` and
`AESTHETIC.md`, and nowhere else.

## What needs a founder decision before this goes live

**This section is the index. It is the only place all six are listed together.** Each one carries
the live anchor in the tree where the constraint is actually enforced or declared, so a reader can
get from the question to the code without a search.

Until 2026-09-03 this list said "these are recorded in the suite as well as here". That is no
longer true and the sentence is gone rather than reworded: the strip removed the register tests,
and `PRODUCT_FLAGS` / `STANDING_FLAGS` in `src/compliance/public-surfaces.ts` are now prose with no
test reading them. Re-erecting a gate around them would be rebuilding the apparatus the founder
just deleted, so the honest answer is that this README is the tracking, and it has to be read.

**None of the six is resolved. Every one is a founder or legal call, and nothing in this tree may
answer one on their behalf.** The first five below were always on this list; the sixth was open in
the code and had never been surfaced here.

1. **The name asserts a diagnosis.** "ADHD.ME" puts a condition in every page title, URL and
   sentence naming the product, which is condition-targeting by construction. It needs an Ahpra
   advertising review of the *name*, separately from the copy. See the header of
   `src/compliance/landing.ts` and `PRODUCT_FLAGS` in `src/compliance/public-surfaces.ts`.
2. **Dr Saxena is a real person in his own company's directory.** His listing carries a founder
   disclosure (`disclosedInterest` / `disclosedInterestLabel` on his entry in `src/demo/roster.ts`;
   `src/demo/clinicians.ts` re-exports the roster and is what consumers import), and his profile
   details — suburb, languages, availability, care areas — were written here and need his
   confirmation. No registration number or qualification has been invented for him.
3. **Every figure on the public pages is indicative.** `COST_NOTE` in `app/story-landing.tsx` and
   `evidenceNote` in `src/compliance/landing-copy.ts` both say so on the page, and both are written
   as ranges precisely because none has been confirmed against its source by anybody in this repo.
   Anchors: the AADPA Australian evidence-based clinical practice guideline for ADHD (2022) and the
   2023 Senate inquiry into ADHD assessment and support services. `COST_NOTE` carries a second
   unconfirmed claim beyond the figures — that NSW and Queensland now let a GP carry the whole
   pathway — which needs checking against each state's current guidance separately.
4. **The learning links need checking.** The `resources` list in
   `app/clinicians/clinician-walkthrough.tsx` links out to AADPA, NICE and the TGA rather than
   restating their content. The URLs are landing pages rather than deep links, and none has been
   opened from this tree.
5. **Only subject-supplied portraits are used for real people.** The roster includes supplied
   portraits for Dr Anubhav Saxena and Dr Anusha Saxena (`realPerson` entries in
   `src/demo/roster.ts`), and the team register in `app/about/team.ts` holds supplied founder
   portraits. Synthetic profiles always use typographic monograms, or a credited stock photograph
   registered in `src/demo/portrait-credits.ts`; nothing in this tree generates or substitutes a
   face for a real person.

A sixth question is open in the code but has never been in this list, so it is added here rather
than left to whoever next reads that file: whether ADHD.ME should publish clinical guidance to
GPs *at all*. `/clinicians` names real clinical territory — differential diagnosis, pre-stimulant
cardiac screening, titration review. Linking out instead of restating narrowed it; it did not close
it. See the `/clinicians` entry in `STANDING_FLAGS` (`src/compliance/public-surfaces.ts`).

## Layout

- `app/` — the finder (`/`, rendered by `app/(app)/page.tsx` with the stages in
  `app/finder-stages/*`), the founder story (`/story`), the GP walkthrough (`/clinicians`), the B2B
  page (`/practices`) and the practice console (`/console/*`)
- `src/demo/` — the ADHD care-area vocabulary, the fifteen archetypes and the clinician roster
- `src/compliance/` — the copy linters and the public-surface sweep
- `ROADMAP.md`, `AESTHETIC.md` — the whole of the planning surface

Synthetic data only, except where marked: `realPerson` in `src/demo/roster.ts` flags the two entries
that describe actual clinicians.

Verify gate: `pnpm verify` (`typecheck && test && build` — the `audit:gate`, `perf:gate` and
`gate:accounting` steps went with the strip and no longer exist). End-to-end: `pnpm e2e`, or
`E2E_PORT=<port> pnpm e2e` if 3100 is busy. `pnpm gate` runs both.
