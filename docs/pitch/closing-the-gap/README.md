# 89% — a preventative health proposal to the Minister for Health and Ageing

14 slides. Same design system as the Bond Transformer deck (`../`); a policy proposal to a
federal department, not a startup pitch.

**Live in Figma:** https://www.figma.com/slides/ZPi89QFNGBV0o9DjirqH02 (adhd team,
`vikram.ganeshalingam@student.bond.edu.au`) — native text and vectors.

> Filenames in this folder still say `715` / `closing-the-gap`. That is deliberate: renaming
> them would break the published artifact URL. The deck's subject is now neurodevelopmental
> health and incarceration; Closing the Gap is one slide inside it.

| File | What it is |
|---|---|
| `89-Percent-Preventative-Health-Proposal.pdf` | Send/present version, 1600x900 |
| `715-closing-the-gap-proposal.html` | Self-contained; fonts and images inlined |
| `ctg.src.html` + `build-ctg.mjs` | Source. Edit these, run the builder, never hand-edit the HTML |
| `slides/`, `figma-import/` | Per-slide PNGs; the second set is 3840x2160 for dropping into Figma |

Rebuild: `node docs/pitch/closing-the-gap/build-ctg.mjs`, run from the repo root.

## The argument

Nine out of ten children assessed in an Australian youth detention centre had a severe
neurodevelopmental impairment, and most had never been diagnosed. ADHD runs at around 30% in
youth custody, roughly five times the general population. Treating it measurably reduces
offending — 32% in men and 41% in women in a Swedish national cohort, measured *within the same
individuals*, on medication versus off it. Meanwhile a year of one child in detention costs
$1.3m, which is about nine hundred ADHD assessments.

So: the assessment happens today, but it happens after sentencing. Move it years earlier, to a
contact point that already exists and is already funded, and measure the result against a
randomised holdout.

Closing the Gap is deliberately condensed to a single slide (03) — the justice targets going
backwards — rather than framing the whole deck.

## Non-negotiables in this deck

Structural, not stylistic. Removing any of them makes the deck weaker with its actual audience.

- **Slide 6 exists to disclaim causation.** "ADHD does not cause incarceration." The drivers are
  colonisation, poverty, over-policing, bail laws and the age of criminal responsibility, and
  the slide says so. Without it, the deck reads as medicalising a structural injustice, and an
  informed reader will dismiss everything else on that basis.
- **Slide 11 admits the pilot cannot measure incarceration.** Twelve months measures assessment,
  treatment initiation and retention. Claiming a justice outcome the design cannot observe would
  be the single easiest thing for a department to shoot down.
- **Slide 4 names the missing evidence.** No Australian Aboriginal and Torres Strait
  Islander–specific ADHD prevalence study exists. The deck says so rather than implying the
  international figures are local.
- **The absence of partners is stated, not hidden** (slide 10), and Phase 0 is securing one.
- **The team slide leaves a seat visibly empty**, labelled as a condition of proceeding.
- **The pilot is deliberately unpriced** until co-designed.
- **No Aboriginal visual motifs.** No ochre, no dot or line-work, no Country-inspired imagery.
  That iconography without an Aboriginal artist or community mandate is appropriation, and this
  audience reads it as tokenism. The restrained system is the respectful choice; keep it.

## Before this is sent

1. **Contact address** — slide 14 still reads "add contact email before sending".
2. **Partnership sequencing** — the deck asks the Department for an introduction to NACCHO.
   Approaching the Minister before the sector inverts the order the deck itself argues for.
   Going to NACCHO or a state affiliate first, and presenting jointly, is stronger.
3. **Verify every figure against its primary source.** All are cited on-slide; none has been
   checked from this repo. Particularly: the Banksia Hill percentages (Bower et al., BMJ Open
   2018), the Lichtenstein hazard ratios (NEJM 2012), ABS custody shares, and the Report on
   Government Services cost figures.
4. **The ~900 assessments figure** is $1.3m divided by the $1,400 private assessment rate used
   earlier in the ADHD.ME material. State that basis if challenged; through an ACCHO the real
   per-assessment cost is lower.
