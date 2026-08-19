# ADHD.ME — a preventative health proposal to the Minister for Health and Ageing

16 slides. Same design system as the Bond Transformer deck (`../`); a policy proposal to a
federal department, not a startup pitch.

**Live in Figma:** https://www.figma.com/slides/ZPi89QFNGBV0o9DjirqH02 (adhd team,
`vikram.ganeshalingam@student.bond.edu.au`) — native text and vectors.

> Filenames here still say `715` / `closing-the-gap`. Deliberate: renaming them would break the
> published artifact URL. The subject is Aboriginal and Torres Strait Islander ADHD; Closing the
> Gap is one slide inside it (05).

| File | What it is |
|---|---|
| `ADHD-ME-Closing-the-Gap-Proposal.pdf` | Send/present version, 1600x900 |
| `715-closing-the-gap-proposal.html` | Self-contained; fonts and images inlined |
| `ctg.src.html` + `build-ctg.mjs` | Source. Edit these, run the builder, never hand-edit the HTML |
| `slides/`, `figma-import/` | Per-slide PNGs; the second set is 3840x2160 for dropping into Figma |

Rebuild: `node docs/pitch/closing-the-gap/build-ctg.mjs`, run from the repo root.

## The argument, in order

1. **The paradox (02).** Aboriginal children show clinically significant hyperactivity at 15.8%
   against 9.7% of other children — and where both parents are Aboriginal, are *two-thirds less
   likely* to receive stimulant treatment. Higher need, less care. This is the whole deck in one
   slide.
2. **Why (03).** Five barriers, every one system-side: no validated symptom norms for most
   Aboriginal and Torres Strait Islander groups; fear tied to eugenics and the Stolen
   Generations, in living memory; racism suppressing help-seeking; under-identification in health
   records; stigma around labelling.
3. **What happens instead (04).** Classroom to cell — 8.6% of enrolments but ~25% of suspensions;
   a 98% jump in disciplinary absences between Year 6 and 7; 89% of assessed children in youth
   detention with severe neurodevelopmental impairment, mostly undiagnosed; 31% adult ADHD among
   Aboriginal prisoners against 10% of non-Aboriginal. The behaviour a child is suspended for is
   the diagnostic criteria nobody applied.
4. **Closing the Gap (05).** One slide. Justice targets going backwards.
5. **What treatment does (06).** Lichtenstein et al., NEJM 2012 — 32%/41% fewer convictions,
   measured within the same individuals.
6. **ADHD.ME (08–10).** The model, then the barrier list inverted point by point, then the
   randomised holdout that lets the program report zero.

## Non-negotiables

Structural, not stylistic. Removing any of them makes the deck weaker with this audience.

- **Slide 07 disclaims causation.** ADHD does not cause incarceration; the drivers are
  structural and the slide names them. Without it the deck reads as medicalising an injustice.
- **Slide 13 admits the pilot cannot measure incarceration.** Twelve months measures assessment,
  treatment initiation and retention.
- **Slide 09's first row is the strongest defence in the deck**: ADHD.ME carries no
  questionnaire, so it cannot inherit an instrument normed on the wrong population. Keep it
  first.
- **Matching is on clinician attributes, never patient symptoms** — the G7 boundary, pinned in
  code by `reach.test.ts :: SYMPTOM_NONREACH`.
- **The absence of an ACCHO partner is stated** (11), and Phase 0 is securing one.
- **The team slide leaves a seat visibly empty.**
- **No Aboriginal visual motifs.** No ochre, no dot or line-work. Without an Aboriginal artist or
  community mandate that is appropriation, and this audience reads it as tokenism.

## Before this is sent

1. **Contact address** — slide 16 still reads "add contact email before sending".
2. **Partnership sequencing** — the deck asks the Department for an introduction to NACCHO.
   Approaching the Minister before the sector inverts the order the deck itself argues for.
3. **Verify every figure against its primary source.** All cited on-slide, none checked from this
   repo. Priorities: the WA Aboriginal Child Health Survey hyperactivity figures and the
   stimulant-prescribing cohort study; the AADPA guideline's 31%/10% NSW prison figure; Bower et
   al. 2018; Lichtenstein et al. 2012; the suspension data (which mixes national and Queensland
   reporting across 2021–2023); and the Report on Government Services cost figures.
4. **The pipeline slide mixes jurisdictions and years.** It is labelled as indicative of stages
   rather than one cohort followed through. Keep that caveat.
