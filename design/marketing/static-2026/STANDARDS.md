# Channel specifications and exact pack contents

Researched 27 September 2026. No universal standard defines every file in a marketing pack. The contents below combine the requested uses with a conventional brand library (logo variants, colours, typography, graphics and templates). Platform specifications are separated from house production choices.

## Source-backed requirements and implemented outputs

| Use | Implemented PNG size | Basis |
| --- | --- | --- |
| Square social and carousel | 1080 × 1080 | Adobe Express Instagram sizing guidance |
| Portrait social | 1080 × 1350, 4:5 | Adobe Express aspect-ratio guidance |
| Static story | 1080 × 1920, 9:16 | Adobe Express story dimensions |
| LinkedIn landscape | 1200 × 628 and 1200 × 627 | Help article specifies 628; ads overview specifies 627. Both supplied |
| LinkedIn square | 1200 × 1200 | LinkedIn Help recommendation |
| LinkedIn portrait | 720 × 900 | LinkedIn Help recommendation; paid vertical serves on mobile |
| Newsletter headers/features | 1200 × 600 and 1320 × 660 | 600/660px display widths at 2×. Heights are our design choice |
| Presentation graphics | 1920 × 1080 | Microsoft supports widescreen 16:9; 1920 × 1080 is our raster choice |
| A4 portrait print proof | 2480 × 3508 | 210 × 297 mm at nominal 300 pixels/inch, rounded |
| A4 landscape pamphlet proof | 3508 × 2480 | 297 × 210 mm at nominal 300 pixels/inch, rounded |
| Editorial cover | 1600 × 2000 | House digital cover; publishers may need different dimensions |
| Static name bars | 1600 × 360; 1920 × 360 light/dark | House reusable overlay canvases |
| Name badge | 1063 × 591 | House proof; not asserted as a universal badge or business-card standard |

### Primary sources

- [Adobe brand-kit guidance](https://www.adobe.com/express/create/brand-kit): logo versions, formats and brand guidelines. Our pack also includes licensed type, palette rules, original imagery and reusable layouts.
- [Adobe Instagram sizing](https://www.adobe.com/express/feature/image/resize/instagram): square and portrait post ratios, 1080 × 1920 story canvas. Use its dimensions and 9:16 explanatory text; one summary line on that page transposes the ratio.
- [LinkedIn detailed single-image specs](https://www.linkedin.com/help/linkedin/answer/a426534) and [ads overview](https://business.linkedin.com/advertise/ads/ads-guide): dimensions above; PNG/JPG and under 5MB on the overview. Platform cropping can differ by placement, so preview the final ad.
- [Mailchimp image recommendations](https://mailchimp.com/help/image-requirements-for-templates/): PNG for transparency, RGB colour, recommended maximum 1MB, 600–1200px legacy and 660–1320px new-builder widths. Use the 1200 or 1320 files to match your email template. Add the supplied alt-text suggestion as live email metadata.
- [Microsoft slide sizing](https://support.microsoft.com/en-us/powerpoint/change-the-size-of-your-powerpoint-slides): widescreen 16:9 and standard 4:3 options. This pack uses widescreen.
- [Adobe print bleed](https://www.adobe.com/learn/indesign/web/set-print-bleed): 3mm is common; individual printers may require more. The current PNGs are explicitly TRIM-SIZE RGB proofs with NO bleed. Do not call these press-ready PDFs or assume a universal CMYK profile. The pamphlet is a six-panel layout proof; final fold widths must match the chosen fold and printer template.

## Contents to hand to a designer

- 8 outlined SVG identity masters and 8 high-resolution PNG equivalents, plus the 2 original raster logo rerenders.
- 4 original AI-generated photographic masters, with fictional-model provenance.
- 44 rendered layout/utility PNGs and editable HTML sources: social, carousel, newsletter, editorial, presentation, training, poster, information sheet, pamphlet, speaker/name assets and transparent utility graphics.
- 7 editable native-SVG utility graphics: ink/white arrows, red stop, yellow quotation mark, editorial rule, widescreen corner frame and portrait photo frame.
- Font licences, colour/clearspace guidance, research, image-generation record, manifest, validation report and an exact machine-readable inventory.

## Transparent files

`transparent-png/` contains copies of all alpha-bearing reusable production exports, with a catalogue. Use ink on light backgrounds and white/reverse on dark backgrounds. Transparent PNGs have real alpha, not a baked checkerboard. Complete social posts, pamphlets and newsletters intentionally retain their designed backgrounds. Their transparency would not improve usability.

Utility dimensions are convenient artboards, not platform mandates. Photo and slide frames have transparent centres. Name fields are editable templates, not invented staff identities. Static overlays are for composition; this pack contains no video.

## Acceptance checks

The validator checks exact encoded width/height against the manifest; alpha extrema and transparent-pixel proportion; non-empty visible content; byte limits for newsletter/LinkedIn exports; decoded image assets and text bounds for every HTML layout. `inventory.csv` records every PNG/SVG, dimensions where available, bytes, SHA-256 and intended use. Visual review checks contrasting backgrounds and representative channel crops. Recheck platform specifications when launching a later campaign.
