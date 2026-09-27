// The lesson colours, read out of the stylesheet that paints them and held to WCAG AA: each ink on
// each fill it sits on. The lead designer's review asked for every bright colour to be checked.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";

const css = readFileSync(join(process.cwd(), "app/styles/learning-play.css"), "utf8");

/** Every `.learn-module` rule that sets lesson tokens: the default, then each tone. */
const TONES = [...css.matchAll(/\.platform-shell \.learn-module(?:\.tone-([a-z]+))?\s*\{([^}]*--lesson-colour[^}]*)\}/g)].map((m) => {
  const token = (name: string) => m[2]!.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  return { tone: m[1] ?? "default", fill: token("lesson-colour")!, soft: token("lesson-soft")!, ink: token("lesson-ink")!, quiet: token("lesson-ink-quiet")! };
});

function luminance(hex: string): number {
  const [r, g, b] = hex.slice(1).match(/../g)!.map((n) => parseInt(n, 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe("lesson colours", () => {
  it("are read from the stylesheet, all nine of them", () => {
    expect(TONES.map((t) => t.tone)).toEqual(["default", "amber", "saffron", "coral", "oat", "lilac", "forest", "slate", "night"]);
    for (const t of TONES) expect(Object.values(t).every(Boolean), t.tone).toBe(true);
  });

  it("the reading ink and the quiet ink clear 4.5:1 on both the strong fill and the soft one", () => {
    for (const t of eachOf(TONES, "the tones")) {
      for (const [ink, name] of [[t.ink, "ink"], [t.quiet, "quiet ink"]] as const) {
        expect(contrast(ink, t.fill), `${t.tone} ${name} on the strong fill`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(ink, t.soft), `${t.tone} ${name} on the soft fill`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("white never sits on a lesson fill as text, because on amber it reads at 2:1", () => {
    expect(contrast("#ffffff", "#ffa000")).toBeLessThan(3);
    expect(css).not.toMatch(/color:\s*(#fff\b|#ffffff|white)/i);
  });
});
