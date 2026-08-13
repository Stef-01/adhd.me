import { describe, expect, it } from "vitest";
import type { Appointment, AppointmentId, ClinicianId, PracticeId } from "@/domain/types";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { compareDna, compareDnaFromSim } from "./dna";

function appts(genAttended: number, genDna: number, orgAttended: number, orgDna: number): Appointment[] {
  const out: Appointment[] = [];
  let i = 0;
  const push = (status: "attended" | "dna", generatedByInvitation: boolean) =>
    out.push({
      id: `a-${i++}` as AppointmentId,
      practiceId: "p" as PracticeId,
      clinicianId: "c" as ClinicianId,
      startsAt: "2026-08-11T09:00:00+10:00",
      status,
      patientId: null,
      generatedByInvitation,
    });
  for (let n = 0; n < genAttended; n++) push("attended", true);
  for (let n = 0; n < genDna; n++) push("dna", true);
  for (let n = 0; n < orgAttended; n++) push("attended", false);
  for (let n = 0; n < orgDna; n++) push("dna", false);
  return out;
}

describe("W44 DNA analysis", () => {
  it("computes per-arm rates on fixtures", () => {
    const c = compareDna(appts(45, 5, 190, 10)); // gen 10% vs org 5%
    expect(c.generated.rate).toBeCloseTo(0.1, 5);
    expect(c.organic.rate).toBeCloseTo(0.05, 5);
    expect(c.ratio).toBeCloseTo(2, 5);
    expect(c.verdict).toBe("generated_worse");
  });

  it("comparable inside the ±25% band", () => {
    const c = compareDna(appts(90, 10, 180, 22)); // 10% vs ~10.9% → ratio ~0.92
    expect(c.verdict).toBe("comparable");
  });

  it("generated_better below the band", () => {
    const c = compareDna(appts(98, 2, 90, 10)); // 2% vs 10%
    expect(c.verdict).toBe("generated_better");
  });

  it("refuses a verdict on thin data", () => {
    const c = compareDna(appts(5, 1, 200, 10));
    expect(c.verdict).toBe("insufficient_data");
    expect(c.ratio).toBeNull();
  });

  it("zero organic DNA with generated DNA present is generated_worse, never a division blowup", () => {
    const c = compareDna(appts(40, 5, 200, 0));
    expect(c.ratio).toBeNull();
    expect(c.verdict).toBe("generated_worse");
  });

  // 30s budget: building the 12k-patient sim takes ~5s on a cold cache, right on
  // Vitest's 5s default, so this flakes intermittently on an unchanged tree
  // (observed at 5499ms). It is a contract test, not a perf budget — state the real
  // budget rather than dodge it by hoisting runSim to module scope, where the same
  // work would just become unbounded collect time. Same 30s precedent as W27.
  it("produces a definite, well-formed comparison from the full sim", () => {
    // Contract test only: the verdict itself is a property of the sim's DNA calibration, not of
    // this module. (Observed on current defaults: generated_worse — the synthetic DNA model for
    // generated bookings is pessimistic relative to organic; flagged in the ledger for the
    // calibration owner. A real pilot answers this empirically via the holdout.)
    const c = compareDnaFromSim(runSim(DEFAULT_SIM_CONFIG));
    expect(c.verdict).not.toBe("insufficient_data"); // 12k-patient sim is never thin
    expect(c.generated.attended + c.generated.dna).toBeGreaterThan(0);
    for (const arm of [c.generated, c.organic]) {
      expect(arm.rate).toBeGreaterThanOrEqual(0);
      expect(arm.rate).toBeLessThanOrEqual(1);
    }
  }, 30_000);
});
