# ADHD.ME — Bond University Transformer / Launchpad deck

Content spec for the deck. Written 2026-08-16, revised the same day to add interview 01.

Built artefacts live in `docs/pitch/`:

| File | What it is |
|---|---|
| `adhd-me-bond-transformer-deck.html` | The deck. Self-contained — fonts and images inlined. |
| `ADHD-ME-Bond-Transformer-Deck.pdf` | Print/send version, 1600×900. |
| `deck.src.html` + `build-deck.mjs` | Source. Edit the source, run the builder, never hand-edit the output. |
| `figma-slides-06-15.js` | Figma Slides continuation — see "Figma" below. |
| `slides/` | Per-slide PNGs and a contact sheet. |

**Audience:** the Transformer Launchpad judging panel — Transformer Director, Alumni &
Development, and Bond academics. Not a VC panel. They weight *evidence of customer discovery,
feasibility, team credibility and real-world impact* over TAM theatrics, and the funding on
offer is a non-equity grant plus mentoring, space and introductions.

**Aesthetic:** Oscar Health Series A (2014) layout grammar — lowercase serif display, hard
left rail, one idea per slide, most of the canvas deliberately empty, an occasional saturated
full-bleed for the emotional beat — rendered in ADHD.ME's own palette from `DESIGN.md` so the
deck and the product are visibly the same object.

## Compliance rules this deck inherits

Same rules as the public surfaces (`docs/COMPLIANCE-DOSSIER.md`):

- No clinical claims, no advice, no testimonials or ratings.
- Every internal figure is **indicative** and labelled as such until confirmed against source.
- External figures are cited to a named source on the slide.
- No invented traction. Where there is no evidence yet, the slide says what is *built*, not
  what is *proven*.

## Design system

| Role | Value | Source |
|---|---|---|
| Ground | `#FBFAF7` `--paper` | DESIGN.md |
| Display / primary text | `#191A17` `--ink` | DESIGN.md |
| Secondary text | `#6E706A` `--muted` | DESIGN.md |
| Smallest labels | `#6B6C67` `--faint` | DESIGN.md |
| Accent | `#66774A` `--sage` | DESIGN.md |
| Accent wash | `#EEF1E8` `--sage-soft` | DESIGN.md |
| Raised surface | `#EEECE5` `--stone` | DESIGN.md |
| Hairline | `#DFDDD6` `--line` | DESIGN.md |
| Deep ground (full-bleed) | `#242B1C` | darkened sage, not a new hue |
| Accent on deep ground | `#A8BA88` | the same hue lifted, not a second accent |

- **Display:** Newsreader, lowercase, `-0.035em` tracking, ~1.04 line-height.
- **UI/body:** Inter.
- **Rail:** 150px left margin on a 1920×1080 canvas. Content never crosses x=1770.
- **Icons:** Lucide, 1.4–1.7px stroke, recoloured to sage. Never filled.
- **Signature:** the sage hairline rule that opens every eyebrow, and the deliberate emptiness
  of the lower-right quadrant. Do not fill it.

Slide numbers are assigned by the builder from actual position — inserting a slide can never
leave a stale number behind. Never hardcode one.

## Slides

### 1 — Title
`ADHD.ME` · findable. nearby. continuous. Footer: Bond University Transformer · Launchpad 2026.

### 2 — Problem (full-bleed deep ground)
**the wait was never the care.** The one emotional beat; the deck's only oversized icon.

### 3 — What the gap costs (stat rail)
6–12 months · $1k–$5k · 1m+ Australians · $20bn+ a year. Marked indicative.

### 4 — Why now
**the rule just changed.** Dec 2025 Queensland first; Mar 2026 NSW Stage 2, SA/WA/ACT follow;
2023 Senate inquiry → National ADHD Framework on shared care.

### 5 — The gap
**the permission changed. the pathway didn't.**

### 6 — Customer discovery, interview 01
**finding someone was the hard part.**
Five paraphrased findings from the first patient interview (16 Aug 2026), source
`docs/patient views.docx`. The highlighted one — extreme difficulty finding which GP does ADHD
prescribing without already knowing someone — is the slide-5 claim, confirmed by the first
person asked.

Handling rules for this slide, which are not negotiable:

- **No verbatim quotes.** The source is a summary written after the fact, not a transcript.
  Nothing on this slide sits in quotation marks. A fabricated quote attributed to a real person
  is a worse failure than an honest paraphrase.
- **No identifying detail and no pronouns.** The findings describe what was reported, not who
  reported it.
- **n = 1, stated on the slide.** Labelled "a signal to test, not evidence of demand".
  Presenting one interview as validated demand to an academic panel would not survive the first
  question — and stating the limit yourself is the more persuasive move in that room.
- **Not a testimonial.** These are research findings about the problem. The participant has not
  used ADHD.ME and endorses nothing, which is what keeps the slide clear of the
  no-testimonials rule governing every other surface.

**FOUNDER ACTION:** confirm the participant agreed to their de-identified findings being used
in an external pitch document. The slide asserts "recorded with the participant's knowledge" —
if that overstates what was agreed, soften it or pull the slide.

### 7 — What ADHD.ME is
Say what you need · See who is near you · Book the first appointment.

### 8 — Product: the finder
Real screenshot of `/finder`.

### 9 — Product: the practice console
Real screenshot of the incrementality dashboard. Captioned as synthetic on the slide.

### 10 — Business model
Flat fees, never a cut of care. $4,800 / $9,600 / $14,400–18,000 / $25k–100k. Pilot $2,400.

### 11 — Why this is hard to copy
Compliance is code · Measured, not claimed · The capability graph.

### 12 — Where we are
Built and verified, pre-pilot, gates named. Discovery now listed as under way.

### 13 — Team
Vikram Ganeshalingam (final-year MD, Bond) · Dr Anubhav Saxena (MBBS, FRACGP) ·
Stefan Thottunkal (NOURISH Stanford; HSIL, Harvard T.H. Chan).

### 14 — The ask (full-bleed deep ground)
Grant · two mentors · three Gold Coast practices · Hub space. Closing line: Queensland is the
first state where a GP can carry this pathway. Bond is in Queensland.

### 15 — thanks
**FOUNDER ACTION:** the contact line still reads "add contact email before sending".

## Figma

All 15 slides are live and validated at
https://www.figma.com/slides/YCJjlwrFNcELigr3BovJoZ — in the `adhd` team on
`vikram.ganeshalingam@student.bond.edu.au`, as native text and vectors with both product
screenshots embedded. Build it again with `figma-slides-06-15.js`.

Use that account for Figma work on this deck; `krishganesh80@gmail.com` is Starter tier with an
exhausted MCP quota, and the partial 5-slide file stranded in its drafts
(`DkS0rta61zfawq8WZGcDEB`) should be ignored.

## Sources

- 2023 Senate inquiry into ADHD assessment and support services — 700+ submissions, 15
  recommendations, National ADHD Framework, shared-care models.
- Queensland Health / NSW Health GP ADHD reforms, Dec 2025 and Mar 2026.
- AADPA Australian evidence-based clinical practice guideline for ADHD (2022).
- Internal: `docs/PRICING.md`, `docs/FIVE-YEAR-PLAN.md`, `src/compliance/landing-copy.ts`,
  `docs/patient views.docx`.
