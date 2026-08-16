# ADHD.ME — Bond Transformer pitch deck

15 slides for the Bond University Transformer / Launchpad. Content spec and the reasoning
behind each slide: [`../PITCH-BOND-TRANSFORMER.md`](../PITCH-BOND-TRANSFORMER.md).

## Just want to look at it

- `ADHD-ME-Bond-Transformer-Deck.pdf` — send/present version, 1600×900.
- `slides/deck-contact-sheet.png` — all 15 slides on one page.
- `slides/deck-NN.png` — individual slides, for dropping into an email or application form.
- `adhd-me-bond-transformer-deck.html` — open in any browser. Self-contained: fonts and
  screenshots are inlined, nothing is fetched.

## Want to change it

**Do not edit `adhd-me-bond-transformer-deck.html` — it is generated and your edits will be
overwritten.** The two source files are:

| File | Holds |
|---|---|
| `deck.src.html` | Slide scaffolding, the design tokens, and one-off slide copy |
| `build-deck.mjs` | Repeated blocks (stats, findings, tiers, team, the ask), icons, and the assembly pass |

Rebuild:

```bash
node docs/pitch/build-deck.mjs
```

That regenerates the HTML with fonts and images re-inlined. To regenerate the PDF and the
slide PNGs as well, render the built HTML with Playwright at 1600×900 — the repo already
depends on `@playwright/test`, so run any render script from the repo root or the import
will not resolve.

Three things the builder does for you, so don't hand-roll them:

- **Slide numbers are assigned by position.** Insert a slide anywhere and every number after
  it renumbers itself. Never hardcode one.
- **Every non-ASCII character is escaped to a numeric entity** on output, so the deck renders
  identically no matter how a host serves or sniffs the charset. Write normal em dashes and
  curly quotes in the source; the builder handles it.
- **Screenshots are base64-inlined.** The deck has no external requests and works offline.

## Design system

Oscar Health's Series A layout grammar — lowercase serif display, hard 150px left rail, one
idea per slide, the lower-right quadrant deliberately empty — in ADHD.ME's own tokens from
[`../../DESIGN.md`](../../DESIGN.md). Newsreader for display, Inter for everything functional,
sage `#66774A` as the only accent and kept under 10% of surface. Icons are Lucide, stroked
never filled. The emptiness is the design; please don't fill it.

## Before this deck goes anywhere

Two items still need a founder decision — both are marked FOUNDER ACTION in the spec:

1. **Slide 15 reads "add contact email before sending".** No address was invented.
2. **Slide 6 says the interview findings were "recorded with the participant's knowledge".**
   Confirm the participant agreed to their de-identified findings appearing in an external
   pitch document. If that overstates what was agreed, soften the line or pull the slide.

Slide 6 is paraphrased from `../patient views.docx` and is deliberately never set in
quotation marks — the source is a summary written after the interview, not a transcript.
Keep it that way.

## Figma

`figma-slides-06-15.js` exists because the Figma MCP tool-call quota on the Starter plan ran
out mid-build. Slides **1–5 only** are live in the Slides file
(`DkS0rta61zfawq8WZGcDEB`) and match this system exactly. Paste the script into `use_figma` in
two batches once the quota allows, and use `upload_assets` to fill the `SHOT_FINDER` and
`SHOT_PRACTICE` frames — `figma.createImageAsync` is not available in that environment.

The HTML/PDF is the complete deck. Figma is currently the partial one.
