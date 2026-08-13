// W46 verify gate (traceability half): every figure in the sales assets is
// registered, sourced, and still equal to what the code computes.

import { describe, expect, it } from "vitest";
import { DECK, ONE_PAGER } from "@/collateral/content";
import { FIGURES, NEEDS_FOUNDER_VERIFICATION, figure } from "@/collateral/figures";
import { literalNumbersIn, referencedFigureIds, resolveFigures } from "@/collateral/render";
import { lintCopyBundle } from "@/compliance/landing";
import { BRIEF_ASSUMPTIONS, computeRoi } from "@/economics/roi";
import { BULK_BILLED_LEVEL_B_ALL_IN, findItem } from "@/mbs/items";

/** Every string a reader will see, flattened. */
function allCopy(): string[] {
  const deck = DECK.slides.flatMap((s) => [s.title, ...s.bullets]);
  const onePager = ONE_PAGER.sections.flatMap((s) => [s.heading, s.body]);
  return [DECK.title, DECK.subtitle, ...deck, ONE_PAGER.title, ONE_PAGER.intro, ...onePager, ONE_PAGER.footer];
}

describe("W46 figure register", () => {
  it("every registered figure carries a source a reader can check", () => {
    for (const f of FIGURES) {
      expect(f.id).toMatch(/^[a-z0-9.-]+$/);
      expect(f.label.length).toBeGreaterThan(5);
      expect(f.display.length).toBeGreaterThan(0);
      if (f.source.kind === "computed") expect(f.source.module).toMatch(/^src\/.*\.ts$/);
      if (f.source.kind === "published") expect(f.source.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (f.source.kind === "assumption") expect(f.source.note.length).toBeGreaterThan(20);
    }
  });

  it("figure ids are unique", () => {
    expect(new Set(FIGURES.map((f) => f.id)).size).toBe(FIGURES.length);
  });

  it("each computed figure still equals what the code computes today", () => {
    // This is the anti-drift check: if the ROI model changes, the deck must not keep
    // quoting yesterday's number.
    const roi = computeRoi(BRIEF_ASSUMPTIONS);
    expect(figure("roi.net-annual-benefit").value).toBeCloseTo(roi.netAnnualBenefit, 6);
    expect(figure("roi.multiple").value).toBeCloseTo(roi.roiMultiple, 6);
    expect(figure("roi.incremental-visits-year").value).toBeCloseTo(roi.annualIncrementalVisits, 6);
    expect(figure("assumption.open-slot-rate").value).toBe(BRIEF_ASSUMPTIONS.openSlotRate);
    expect(figure("assumption.incremental-share").value).toBe(BRIEF_ASSUMPTIONS.incrementalShare);
    expect(figure("mbs.item23").value).toBe(findItem("23")!.rebate);
    expect(figure("mbs.bulk-billed-level-b-metro").value).toBe(BULK_BILLED_LEVEL_B_ALL_IN.metro);
  });

  it("each display string is consistent with its own value", () => {
    const numeric = (s: string) => Number(s.replace(/[^0-9.]/g, ""));
    for (const f of FIGURES) {
      const shown = numeric(f.display);
      const expected = f.display.includes("%") ? f.value * 100 : f.value;
      // Displays are rounded for reading; they must round-trip to the real value.
      expect(Math.abs(shown - expected)).toBeLessThan(Math.max(1, Math.abs(expected) * 0.01));
    }
  });

  it("unknown figure ids fail loudly rather than rendering blank", () => {
    expect(() => figure("does.not.exist")).toThrow(/not in the register/);
  });
});

describe("W46 asset copy traceability", () => {
  it("every figure referenced by the assets is registered", () => {
    for (const text of allCopy()) {
      for (const id of referencedFigureIds(text)) {
        expect(() => figure(id), `unregistered figure "${id}" in: ${text}`).not.toThrow();
      }
    }
  });

  it("no asset copy states a bare number — figures come only from the register", () => {
    // A literal in a slide would bypass the register and could never be checked.
    for (const text of allCopy()) {
      expect(literalNumbersIn(text), `literal number in asset copy: ${text}`).toEqual([]);
    }
  });

  it("the assets actually use the register", () => {
    const referenced = new Set(allCopy().flatMap(referencedFigureIds));
    expect(referenced.size).toBeGreaterThanOrEqual(5);
  });

  it("resolved copy contains no unresolved placeholders", () => {
    for (const text of allCopy()) {
      expect(resolveFigures(text)).not.toMatch(/\{\{|\}\}/);
    }
  });
});

describe("W46 compliance and honesty", () => {
  it("asset copy passes the same compliance linter as the public landing page", () => {
    expect(lintCopyBundle({ deck: DECK, onePager: ONE_PAGER })).toEqual([]);
  });

  it("the deck states that the expectation figures are modelled, not measured", () => {
    const resolved = DECK.slides.flatMap((s) => s.bullets).map(resolveFigures).join(" ");
    expect(resolved).toMatch(/pilot replaces every assumption/i);
  });

  it("the deck says the raw booking count is never reported as impact", () => {
    const all = DECK.slides.flatMap((s) => s.bullets).join(" ");
    expect(all).toMatch(/never report the raw count/i);
  });

  it("unverifiable market claims are recorded, not shipped", () => {
    expect(NEEDS_FOUNDER_VERIFICATION.length).toBeGreaterThan(0);
    const copy = allCopy().join(" ").toLowerCase();
    // None of the market-sizing language may appear in the assets.
    for (const banned of ["market size", "addressable market", "industry average", "competitor"]) {
      expect(copy).not.toContain(banned);
    }
  });
});

// --- W46 verify gate (assets produced) --------------------------------------
// Following the W20 precedent: the test generates the artifact, so the committed
// asset can never drift from the code that describes it.

describe("W46 assets are produced", () => {
  it("writes the deck, the one-pager and the figure register", async () => {
    const { buildDeck } = await import("@/collateral/deck");
    const { buildOnePager, renderFigureRegisterMarkdown } = await import("@/collateral/one-pager");
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const path = await import("node:path");

    const out = path.resolve(__dirname, "../../reports");
    mkdirSync(out, { recursive: true });

    const deck = await buildDeck();
    expect(deck.byteLength).toBeGreaterThan(10_000);
    writeFileSync(path.join(out, "meherr-sales-deck.pptx"), deck);

    const onePager = await buildOnePager();
    expect(onePager.byteLength).toBeGreaterThan(5_000);
    writeFileSync(path.join(out, "meherr-one-pager.docx"), onePager);

    writeFileSync(
      path.join(out, "meherr-figure-register.md"),
      renderFigureRegisterMarkdown(FIGURES as never),
    );
  }, 60_000);

  it("the register appendix lists every figure and every unsourced claim", async () => {
    const { renderFigureRegisterMarkdown } = await import("@/collateral/one-pager");
    const md = renderFigureRegisterMarkdown(FIGURES as never);
    for (const f of FIGURES) expect(md).toContain(f.label);
    for (const claim of NEEDS_FOUNDER_VERIFICATION) expect(md).toContain(claim);
  });
});

describe("W46 deck layout invariants", () => {
  it("every bullet on a stat-card slide leads with a registered figure", () => {
    // The card renderer promotes the leading token to the big number, so a bullet
    // starting with prose would render a word ("A") where a figure belongs.
    for (const slide of DECK.slides.filter((s) => s.layout === "cards")) {
      for (const bullet of slide.bullets) {
        expect(bullet, `card bullet must start with a figure: ${bullet}`).toMatch(/^\{\{[a-z0-9.-]+\}\}/i);
      }
    }
  });
});

describe("W46 deck geometry (stands in for pixel visual QA)", () => {
  it("no card, row or heading crosses the slide bounds or the margin", async () => {
    const { LAYOUT: L } = await import("@/collateral/deck");
    const right = L.slideW - L.margin;
    const bottom = L.slideH - L.margin;

    // Widest card row.
    const lastCardRight = L.card.x0 + (L.card.max - 1) * L.card.dx + L.card.w;
    expect(lastCardRight).toBeLessThanOrEqual(right);
    expect(L.card.y + L.card.h).toBeLessThanOrEqual(bottom);
    // Cards must not overlap each other.
    expect(L.card.dx).toBeGreaterThan(L.card.w);

    // Longest bullet row.
    expect(L.row.x + L.row.w).toBeLessThanOrEqual(right);
    expect(L.row.y0 + (L.row.max - 1) * L.row.dy + L.row.h).toBeLessThanOrEqual(bottom);
    // Rows must not overlap.
    expect(L.row.dy).toBeGreaterThan(L.row.h);

    expect(L.heading.x + L.heading.w).toBeLessThanOrEqual(right);
    expect(L.heading.x).toBeGreaterThanOrEqual(L.margin);
  });

  it("no slide carries more items than its layout has room for", () => {
    for (const slide of DECK.slides) {
      const max = slide.layout === "cards" ? 3 : 4;
      expect(slide.bullets.length, `too many bullets on "${slide.title}"`).toBeLessThanOrEqual(max);
    }
  });
});
