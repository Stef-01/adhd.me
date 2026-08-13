import { describe, expect, it } from "vitest";
import { generatePractice, practiceStats } from "./generate";

const OPTS = {
  seed: 42,
  patientCount: 12_000,
  clinicianCount: 10,
  scheduleWeeks: 4,
  todayIso: "2026-08-08",
};

describe("W3 synthetic practice engine", () => {
  const data = generatePractice(OPTS);
  const stats = practiceStats(data);

  it("generates the reference practice shape", () => {
    expect(data.clinicians).toHaveLength(10);
    expect(data.patients).toHaveLength(12_000);
    expect(data.clinicians.filter((c) => c.participating)).toHaveLength(8);
    // 4 weeks × 5 days × 10 clinicians × 24 slots
    expect(data.appointments).toHaveLength(4 * 5 * 10 * 24);
  });

  it("hits calibration targets within tolerance", () => {
    expect(stats.smsConsentRate).toBeGreaterThan(0.83);
    expect(stats.smsConsentRate).toBeLessThan(0.87);
    expect(stats.optOutRate).toBeLessThan(0.03);
    expect(stats.usualClinicianRate).toBeGreaterThan(0.88);
    expect(stats.chronicCareRate).toBeGreaterThan(0.27);
    expect(stats.chronicCareRate).toBeLessThan(0.33);
    expect(stats.openSlotRate).toBeGreaterThan(0.06);
    expect(stats.openSlotRate).toBeLessThan(0.1);
  });

  it("produces meaningful unfilled capacity (the wedge exists)", () => {
    // Reference practice: ~8% of ~1,200 weekly slots open ≈ 96/week — well above the
    // 25/week modelling floor in the venture brief.
    expect(stats.openSlotsPerWeek).toBeGreaterThan(25);
  });

  it("is deterministic for a given seed", () => {
    const again = generatePractice(OPTS);
    expect(again).toEqual(data);
  });

  it("differs for a different seed", () => {
    const other = generatePractice({ ...OPTS, seed: 43 });
    expect(other.patients[0]).not.toEqual(data.patients[0]);
  });
});
