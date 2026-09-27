# Identity production files

Use the outlined SVG masters for new layouts. They contain paths, not live fonts or embedded bitmap images, and retain the supplied concept: floating ADHD letters, bold me, and a small square stop. This is a vector redraw using Plus Jakarta Sans and Newsreader, not an exact trace of the generated raster. The original rerendered PNGs remain as reference masters; do not alternate different letterforms within one campaign.

## Choose a file

- `mark-colour.svg`: transparent, ink lettering and red stop; use on pale backgrounds.
- `mark-reverse.svg`: transparent, ivory lettering and red stop; use on dark backgrounds.
- `mark-mono-ink.svg` / `mark-mono-white.svg`: single-colour applications.
- `mark-yellow.svg` / `mark-ivory.svg`: complete background lockups.
- `wordmark-ink.svg` / `wordmark-white.svg`: compact horizontal alternative.
- Every SVG has a corresponding `-2x.png` raster export. The main mark exports at 2000 × 1300 pixels. Transparent masters preserve alpha.

Do not stretch, skew, add shadows, rearrange ADHD, crop the red stop or replace the yellow with a gradient. Reverse artwork changes the lettering, not the red stop. Monochrome artwork deliberately changes both to one colour.

## Clearspace and size

The square stop is the clearspace unit, X. Keep at least X around the visible mark and preferably 2X on campaign covers. The SVG canvas includes this breathing room; avoid tightly cropping it when placing the logo. For the full mark, start at 160 CSS pixels wide or 40 mm in print, then inspect a final-size proof. Below that, use the horizontal wordmark rather than shrinking the floating letters until they become unreadable. Suggested horizontal minimum: 120 CSS pixels or 30 mm, subject to the production process.

## Colour and type

Sunflower #F2CA16; ink #1A1C1C; paper #F6F2E8; red #E94D2D. These are RGB definitions. A print supplier should convert using the actual paper and press profile; no universal CMYK conversion is claimed.

Layouts use Plus Jakarta Sans. The floating identity letters use Newsreader. Both font licences are in `../sources/fonts/`. Outlines let recipients use the artwork without installing fonts. To change the lettering itself, edit and rerun `scripts/build-campaign-identity.py` from the repository root; it requires Python fontTools and the repository font dependencies. Export PNG variants with `node scripts/export-campaign-identity.mjs`.

The app navigation wordmark is not replaced by these campaign files.
