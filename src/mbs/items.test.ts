import { describe, expect, it } from "vitest";
import {
  BULK_BILLED_LEVEL_B_ALL_IN,
  DEFAULT_ASSUMPTIONS,
  estimateAnnualIncremental,
  estimateRevenuePerVisit,
  findItem,
  MBS_ITEMS,
} from "./items";

describe("W34 MBS context tables", () => {
  it("matches published 1 July 2025 rebates exactly", () => {
    expect(findItem("23")?.rebate).toBe(43.9);
    expect(findItem("36")?.rebate).toBe(84.9);
    expect(findItem("44")?.rebate).toBe(125.1);
    expect(findItem("965")?.rebate).toBe(156.55);
    expect(findItem("967")?.rebate).toBe(156.55);
  });

  it("carries the Nov-2025 bulk-billing all-in Level B values", () => {
    expect(BULK_BILLED_LEVEL_B_ALL_IN.metro).toBe(69.56);
    expect(BULK_BILLED_LEVEL_B_ALL_IN.remote).toBe(86.91);
  });

  it("item ids are unique and categorised", () => {
    const ids = MBS_ITEMS.map((i) => i.item);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of MBS_ITEMS) expect(["attendance", "chronic_disease"]).toContain(i.category);
  });

  it("blended revenue per Level B visit sits between bulk-billed and private", () => {
    const v = estimateRevenuePerVisit("23", DEFAULT_ASSUMPTIONS);
    expect(v).toBeGreaterThan(BULK_BILLED_LEVEL_B_ALL_IN.metro);
    expect(v).toBeLessThan(43.9 + DEFAULT_ASSUMPTIONS.averageGap);
    // ~0.6×(43.90+43) + 0.4×69.56 = 79.96
    expect(v).toBeCloseTo(79.96, 1);
  });

  it("reproduces the venture-brief practice model within its ~$100/visit assumption", () => {
    // Brief §Phase 1: 8 incremental attended visits/week × 48 weeks at ~$100 blend ≈ $38.4k.
    const annual = estimateAnnualIncremental(8, 48, "36"); // Level C blend
    // 0.6×(84.90+43) + 0.4×84.90 = 110.7 per visit → 42,509 — same order as the brief's model.
    expect(annual).toBeGreaterThan(35_000);
    expect(annual).toBeLessThan(50_000);
  });

  it("throws on unknown items rather than guessing", () => {
    expect(() => estimateRevenuePerVisit("110", DEFAULT_ASSUMPTIONS)).toThrow(/unknown MBS item/);
  });
});
