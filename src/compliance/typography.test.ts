// O60 verify gate (Standing debt 7, the O14 low-vision follow-up): type size follows the
// reader's own browser setting, which means no font-size may be declared in px.
//
// WHY THIS IS A COMPLIANCE-ADJACENT RATCHET AND NOT A STYLE PREFERENCE. A px font size is
// immune to the browser's font-size preference — the one control a low-vision reader has that
// does not require zooming and re-panning every page. The O60 migration converted all 344 of
// them to exact rem equals (byte-identical rendering at the default 16px root, proven by
// before/after capture diff); this test is what keeps the count at zero, because a migration
// without a ratchet regresses one convenient hard-coded label at a time.
//
// px stays legitimate elsewhere: borders, radii, shadows, fixed dimensions and media-query
// breakpoints are not type, and widening this rule to them would tax honest layout work.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("app/globals.css", "utf8");

describe("O60 every font size is rem, so text follows the reader's browser setting", () => {
  it("declares no px font-size anywhere in the stylesheet, clamp() bounds included", () => {
    const offenders = [...CSS.matchAll(/font-size:[^;]*\d ?px/g)].map((m) => m[0]);
    expect(offenders, "px font sizes reintroduced — declare them in rem (px ÷ 16)").toEqual([]);
  });

  it("never sets a root font-size, because 1rem must BE the reader's setting", () => {
    // An `html { font-size: … }` would re-anchor every rem in the file to our number instead
    // of theirs, quietly undoing the whole migration while every individual rule stays rem.
    const htmlBlocks = [...CSS.matchAll(/(?:^|\})\s*html(?:,[^{]*)?\s*\{[^}]*\}/g)].map((m) => m[0]);
    for (const block of htmlBlocks) expect(block).not.toMatch(/font-size/);
  });

  it("still uses rem type sizes at all — the rule above cannot pass on an empty file", () => {
    expect((CSS.match(/font-size:[^;]*rem/g) ?? []).length).toBeGreaterThan(300);
  });
});
