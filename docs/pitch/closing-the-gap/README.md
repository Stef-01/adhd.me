# 715 — a proposal to the Minister for Health and Ageing

14 slides. Same design system as the Bond Transformer deck (`../`), different genre: this is a
policy proposal to a federal department, not a startup pitch.

**Live in Figma:** https://www.figma.com/slides/ZPi89QFNGBV0o9DjirqH02 (adhd team,
`vikram.ganeshalingam@student.bond.edu.au`) — native text and vectors.

| File | What it is |
|---|---|
| `715-Closing-the-Gap-Proposal.pdf` | Send/present version, 1600x900 |
| `715-closing-the-gap-proposal.html` | Self-contained; fonts and images inlined |
| `ctg.src.html` + `build-ctg.mjs` | Source. Edit these, run the builder, never hand-edit the HTML |
| `slides/`, `figma-import/` | Per-slide PNGs; the second set is 3840x2160 for dropping into Figma |

Rebuild: `node docs/pitch/closing-the-gap/build-ctg.mjs`, run from the repo root.

## The argument

The gap has not moved (8.8 years) and 4 of 19 targets are on track. Rather than proposing to
fix that, the deck picks one already-funded, already-measurable thing — the MBS 715 Aboriginal
and Torres Strait Islander health assessment, at 27.9% national uptake — shows that the reasons
it is missed are operational rather than clinical, and offers a register/recall/measurement
layer under community control. The pitch to government is the measurement: a randomised holdout
means the program can report zero, which is the Productivity Commission's 2024 criticism
answered literally.

## Non-negotiables in this deck

These are structural, not stylistic. Removing any of them makes the deck worse with its actual
audience, not just less careful.

- **Slide 4 exists to disclaim.** "This is not a plan to close the gap." Priority Reform One
  settles who decides and Priority Reform Two settles who delivers; the deck says plainly that
  neither is us. A proposal that skips this reads as a non-Indigenous team proposing to fix
  Indigenous health, which is the pattern the Priority Reforms exist to end.
- **The absence of partners is stated, not hidden.** Slide 4's footnote says there is no
  Aboriginal or Torres Strait Islander partner organisation today. Phase 0 of the pilot is
  securing one, before any build.
- **The team slide leaves a seat visibly empty**, labelled as a condition of proceeding rather
  than an advisory role added later.
- **The pilot is deliberately unpriced.** Costing work that has not been co-designed would
  contradict the sequencing the deck argues for.
- **No Aboriginal visual motifs.** No ochre palette, no dot or line-work motifs, no
  Country-inspired imagery. Using that iconography without an Aboriginal artist or community
  mandate is appropriation, and this audience reads it as tokenism instantly. The restrained
  system is the respectful choice; keep it.
- **Data sovereignty is Priority Reform Four on slide 10**, and it says the partner is the data
  custodian. That has to stay true of whatever gets built.

## Before this is sent

1. **Contact address** — slide 14 still reads "add contact email before sending".
2. **Partnership** — the honest thing this deck asks for is an introduction to NACCHO or a state
   affiliate. Approaching the Minister before approaching the sector inverts the sequencing the
   deck itself argues for. Consider going to NACCHO first and presenting jointly.
3. **Figure check** — every external figure is cited on-slide but none has been verified against
   its primary source from this repo. Verify before it goes to a department that will know them.
4. **Branding** — the deck deliberately carries no product name. The engine comes from the
   ADHD.ME tree, and "ADHD.ME" would make no sense on a 715 proposal.
