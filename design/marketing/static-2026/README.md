# ADHD.ME — static campaign working pack

Open `review/index.html` for the contact sheet. Click a preview to open its editable HTML master. PNG exports are in `exports/`; photographic masters in `photography/`; the refined mark and transparent version in `identity/`. Export again from the repository root with `node scripts/export-static-campaign.mjs`.

## Included in this release

73 static layouts and utility exports, including the original core set: four social/story assets; three carousel cards; two newsletter headers; editorial cover and article banner; three presentation graphics; training cover and reflection worksheet; poster, information sheet and two-sided six-panel pamphlet; speaker card, name bar and badge. Each has an HTML source with real editable text and a PNG export. Four original generated photographs and two generated logo masters accompany them.

Names and roles on speaker/name templates are editable fields. Replace them with authorised details; no fictional practitioner biographies or testimonial claims have been invented. All four photographed scenes use AI-generated fictional people. See `sources/RESEARCH.md` and `sources/generation-record.json` for reference and provenance notes.

36 reusable transparent PNGs are collected in `transparent-png/`, with previews on light and dark backgrounds. `inventory.csv` lists 130 canonical PNG/SVG files (convenience copies excluded). See `STANDARDS.md` for researched channel requirements and exact sizing.

The additions include four LinkedIn formats, two 1320px newsletter exports, seven transparent utility graphics, two wide name bars, and six A4 proofs at nominal 300ppi.

## Format and editing

`manifest.json` records exact pixel sizes. Social square/carousel: 1080×1080; portrait: 1080×1350; story: 1080×1920. Newsletter: 1200×600. Editorial cover: 1600×2000. Presentation: 1920×1080. A-series-ratio layouts: 1240×1754. Name bar: 1600×360 with transparent surrounding area. Badge: 1063×591.

Edit wording in a template's HTML, keep the existing content hierarchy, then re-export. Use `templates/system.css` for shared typography, spacing and photo positioning. The included Plus Jakarta Sans variable font and its licence travel with the pack. Palette: sunflower #F2CA16, ink #1A1C1C, paper #F6F2E8, accent #E94D2D. Yellow belongs to large surfaces; red is a small stop or detail. One primary message per graphic. Keep faces free of typography.

These are RGB digital exports. The A-series ratio is useful for review and layout, but the PNGs are not labelled print-production-ready: physical sizes, bleed, printer profile and final typography need a print export pass. Eight outlined SVG identity masters and corresponding 2× PNGs are now included. See `identity/USAGE.md` for colour, reverse, monochrome and compact wordmark variants. Do not stretch the mark or simulate a white-on-dark variant by inverting its red accent.

## Remaining to fulfil the full brief

- Expand the scene library with tactile still-life imagery and additional campaign situations.
- Apply the chosen vector identity consistently to the remaining campaign applications.
- Export the two-sided six-panel pamphlet and other print layouts as PDFs with documented physical sizes and printer fold tolerances.
- Flesh out the training handout set and add presentation diagrams/backgrounds.
- Extend visual review as further campaign applications are added.

No video, motion or B-roll is part of this brief. These materials are kept outside the public app bundle; the app navigation wordmark is unchanged.

## Rebuild and verify

Run `python scripts/standardize-static-campaign.py`, `node scripts/export-static-campaign.mjs`, `node scripts/validate-static-campaign.mjs`, then `python scripts/validate-campaign-deliverables.py`. The last step checks PNG dimensions, alpha and channel byte limits, rebuilds the transparent collection and exact inventory, and writes `review/standards-validation.json`.

## Australian-inspired expansion

See `review/australian-library.html` and `AU-ASSETS.md`: 26 new SVG/PNG illustrations and slide/pamphlet elements, one faceless still-life photograph, one textured coastal artwork, and three faceless campaign layouts. The library now has 73 HTML/PNG layouts and 36 reusable transparent PNGs. All marketing URLs use **adhdme.au**; the browser validator rejects deployment-domain text.
