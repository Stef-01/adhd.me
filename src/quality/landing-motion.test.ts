// A11Y-2: the landing page's motion, pinned against its own source.
//
// The defect was `opacity: 0` in a motion/react `initial`, which SSR emits as an inline style —
// so the copy was unreadable until React hydrated, and unreadable full stop if it never did.
// e2e/landing.spec.ts proves the rendered outcome. This pins the MECHANISM, for two reasons the
// e2e cannot cover:
//
//   THE OBVIOUS REGRESSION IS A REASONABLE-SOUNDING EDIT. "The section should fade in" is a
//   sentence anybody might act on, and reintroducing `opacity: 0` here looks harmless in review
//   — the page still animates, still passes axe once hydrated, and only breaks for a reader
//   whose JavaScript never arrives, who by definition files no bug report.
//
//   AND THE OPPOSITE REGRESSION IS DELETING THE ANIMATION. Stripping the transforms would also
//   satisfy every no-opacity check while quietly throwing away the design the fix was chosen to
//   preserve. A runtime assertion for this is a race — whether an animation is still in flight
//   at any given moment is timing — so it is pinned here instead, W175's pattern.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE = path.join(process.cwd(), "app", "story-landing.tsx");
const source = readFileSync(SOURCE, "utf8");

/** Comments explain the rule; only code can break it. */
const code = source
  .split("\n")
  .filter((line) => {
    const t = line.trimStart();
    return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
  })
  .join("\n");

describe("A11Y-2 the storybook never ships hidden copy", () => {
  it("animates no opacity anywhere, so nothing can be server-rendered invisible", () => {
    expect(code, "story-landing.tsx animates opacity again").not.toMatch(/opacity:\s*0/);
  });

  it("keeps the reduced-motion gate, which is still right even though it was not the fix", () => {
    // `useReducedMotion` cannot help during SSR, which is what made the defect possible. It is
    // still correct for everything after mount, so removing it would be a separate regression.
    expect(code).toContain("useReducedMotion");
  });
});

describe("A11Y-2 the animation it was fixed in favour of is still there", () => {
  it("still declares a NON-ZERO slide offset, so the fix did not become a deletion", () => {
    // Non-zero is the whole assertion. A first draft matched any `y:` value, which `y: 0`
    // satisfies — so flattening every offset to zero, deleting the animation entirely, passed
    // the test written to prevent exactly that.
    const offsets = code.match(/\by:\s*-?[1-9]\d*(?:\.\d+)?/g) ?? [];
    expect(offsets.length, "the entrance slide has been flattened away").toBeGreaterThan(0);
  });

  it("still resolves that slide to zero, so content does not rest displaced", () => {
    expect(code).toMatch(/\by:\s*0\b/);
  });
});
