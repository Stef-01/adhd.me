import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { checkInvariants, DEFAULT_SIM_CONFIG, renderReport, runSim } from "./harness";

describe("W12 simulation harness", () => {
  // One full deterministic run shared by every assertion below.
  const result = runSim(DEFAULT_SIM_CONFIG);
  const violations = checkInvariants(result);

  it("completes all 26 weeks with a live loop", () => {
    expect(result.totals.weeksSimulated).toBe(26);
    expect(result.totals.invitationsSent).toBeGreaterThan(100);
    expect(result.totals.booked).toBeGreaterThan(10);
    expect(result.totals.attendedGenerated).toBeGreaterThan(0);
    expect(result.totals.organicVisits).toBeGreaterThan(0);
    expect(result.smsSentCount).toBe(result.totals.invitationsSent);
  });

  it("invariants hold", () => {
    expect(violations).toEqual([]);
  });

  it("no invitation is ever left dangling: every offer reaches a terminal or booked state", () => {
    const open = result.invitations.filter((i) => i.status === "queued" || i.status === "sent");
    expect(open).toEqual([]);
  });

  it("attribution runs on the sim output with a real holdout arm", () => {
    const attr = result.attribution;
    expect(attr.holdoutArm.patients).toBeGreaterThan(0);
    expect(attr.inviteArm.patients).toBeGreaterThan(attr.holdoutArm.patients);
    expect(attr.incrementalPer1000).not.toBeNull();
    expect(attr.naiveGeneratedAttended).toBe(result.totals.attendedGenerated);
    // Displacement is modelled, so the naive count must overstate the incremental estimate.
    expect(attr.incrementalAttended!).toBeLessThan(attr.naiveGeneratedAttended);
  });

  it("the sim is deterministic: same seed, same headline numbers", () => {
    const again = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 4 });
    const once = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 4 });
    expect(again.totals).toEqual(once.totals);
    expect(again.attribution).toEqual(once.attribution);
  });

  it("generates the report artifact", () => {
    const report = renderReport(result, violations);
    expect(report).toContain("All invariants held.");
    expect(report).toContain("Incremental attended appointments:");
    expect(report).toContain("mock adapter only");
    const dir = path.resolve(__dirname, "../../reports");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "sim-26w.md"), report);
  });
});
