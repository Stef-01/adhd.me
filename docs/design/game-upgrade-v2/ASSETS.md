# Lives v2 asset delivery

Generated 20 September 2026. This pack is the original editable production baseline for [the all-games plan](PLAN.md). It is not a replacement for implementing and playtesting each game.

| Family | Delivered |
| --- | ---: |
| Character poses: 15 characters × 12 poses | 180 SVGs |
| Scenes: 8 worlds × desktop/phone × 3 layers | 48 SVGs |
| Distinct props and state variants | 85 SVGs |
| Feedback effects | 16 SVGs |
| Optional original synthesised sounds | 15 WAVs |
| Total | 344 assets |

Asset payload: 1,159,352 bytes, excluding manifest, motion metadata and the review gallery. No third-party fonts, images, music, runtime dependencies or API keys are needed to regenerate the files.

## Files and reproducibility

- `public/games/v2/manifest.json`: file hashes, dimensions, pivots, hand grips, scene anchors and coverage for eight character games, 32 arcade rounds and 20 learning runs.
- `public/games/v2/catalog.html`: browsable review gallery with world/category/pose/composition filters and explicit audio controls.
- `public/games/v2/motion.json`: event-driven motion recipes, reduced-motion alternatives and audio lifecycle rules.
- `scripts/generate-lives-assets.py`: deterministic Python standard-library generator.
- `scripts/validate-lives-assets.py`: actual-file validation, SVG parsing, manifest references, pose/layer coverage, inventory ID checks and WAV duration/peak/fade checks.

Run from the repository: `python scripts/generate-lives-assets.py`, then `python scripts/validate-lives-assets.py`. Serve `public` over HTTP and open `/games/v2/catalog.html`; direct file opening cannot fetch the manifest in all browsers. The gallery is a development artifact and is not linked into patient navigation.

## Integration contract

SVGs have no baked interface text. Character groups are named and retain a common foot pivot. Props use a stable 128×128 frame; state swaps do not change their coordinate system. Scene compositions expose anchors for each orientation. The gallery composes separate props at those anchors as an example, not a game renderer.

Use model events to drive motion. Keep hit regions stable and at least the intended CSS target size; SVG metadata is not a touch-accessibility guarantee. Load the active scene rather than the entire pack. Do not autoplay audio. Looped ambience requires the documented crossfade; individual files have faded endpoints. Bound mixed output with a master limiter, since per-file peak validation does not bound several simultaneous voices.

The pack uses the existing canonical Lives and legacy cast geometry/colours. New Ari, Noor and Rae are original supporting characters. Resolve the existing fern-versus-cyan Theo discrepancy at runtime integration; this pack uses canonical cyan.

## QA evidence

- All 344 manifest hashes matched; all referenced files resolve.
- All 329 SVG files parsed; character group/pivot and scene anchor bounds validated.
- All 15 mono PCM files have valid duration, faded endpoints and individual peak amplitude at or below 0.221.
- Chromium gallery checks decoded all 12 pose sets, both compositions of all eight worlds, all 85 props and 16 effects, and loaded metadata for all 15 sounds.
- World and prop filtering passed. The gallery had no page errors, failed resource responses or horizontal overflow at 390px. Desktop review used 1440px.
- Visually inspected the eight desktop worlds, phone compositions, expression sheet and compact 85-prop contact sheet. Corrected category-control visibility and removed book-like filler from the market shelving. Scene previews now include separate interactive props.
- Browser evidence is under ignored `qa/_runs/lives-v2-*`; the repeatable gallery check is `scripts/qa-lives-assets.mjs`.

Limitations: sound files were structurally and browser-decoder checked, not listener-panel tested. Full in-game focus, hit-target, contrast, timing and audio-mix QA remains part of each game's implementation gates. Asset generation does not establish patient engagement or clinical efficacy.
