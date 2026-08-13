import { describe, expect, it } from "vitest";
import { BRIEF_ASSUMPTIONS, computeRoi, type RoiAssumptions } from "@/economics/roi";

describe("computeRoi", () => {
  it("matches the brief figures on the brief assumptions", () => {
    const r = computeRoi(BRIEF_ASSUMPTIONS);
    // Hand-computed chain from the default assumptions (10 GPs, 120 slots/wk,
    // 8% open, 25% fill, 5% DNA, 60% incremental, $80/visit, $990/mo).
    expect(r.openSlotsPerWeek).toBeCloseTo(96, 6);
    expect(r.generatedBookingsPerWeek).toBeCloseTo(24, 6);
    expect(r.attendedPerWeek).toBeCloseTo(22.8, 6);
    expect(r.incrementalAttendedPerWeek).toBeCloseTo(13.68, 6);
    expect(r.incrementalRevenuePerWeek).toBeCloseTo(1094.4, 6);
    expect(r.annualIncrementalVisits).toBeCloseTo(711.36, 6);
    expect(r.annualIncrementalRevenue).toBeCloseTo(56908.8, 4);
    expect(r.annualMeherrCost).toBe(11880);
    expect(r.netAnnualBenefit).toBeCloseTo(45028.8, 4);
    expect(r.roiMultiple).toBeCloseTo(4.79, 2);
  });

  it("scales incremental revenue linearly with practice size", () => {
    const one = computeRoi({ ...BRIEF_ASSUMPTIONS, gpCount: 1 });
    const ten = computeRoi({ ...BRIEF_ASSUMPTIONS, gpCount: 10 });
    expect(ten.annualIncrementalRevenue).toBeCloseTo(one.annualIncrementalRevenue * 10, 4);
  });

  it("never counts displaced attendance: incrementalShare gates revenue", () => {
    const full = computeRoi({ ...BRIEF_ASSUMPTIONS, incrementalShare: 1 });
    const zero = computeRoi({ ...BRIEF_ASSUMPTIONS, incrementalShare: 0 });
    expect(zero.annualIncrementalRevenue).toBe(0);
    expect(full.annualIncrementalRevenue).toBeGreaterThan(computeRoi(BRIEF_ASSUMPTIONS).annualIncrementalRevenue);
  });

  it("guards divide-by-zero when Meherr cost is zero", () => {
    const free: RoiAssumptions = { ...BRIEF_ASSUMPTIONS, meherrMonthlyFee: 0 };
    const r = computeRoi(free);
    expect(r.annualMeherrCost).toBe(0);
    expect(r.roiMultiple).toBe(0);
    expect(r.netAnnualBenefit).toBe(r.annualIncrementalRevenue);
  });

  it("net benefit turns negative when the fee outweighs incremental revenue", () => {
    const r = computeRoi({ ...BRIEF_ASSUMPTIONS, meherrMonthlyFee: 100_000 });
    expect(r.netAnnualBenefit).toBeLessThan(0);
    expect(r.roiMultiple).toBeLessThan(1);
  });
});
