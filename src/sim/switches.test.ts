// W19: the operational switches are honoured in a sim run.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "./harness";
import { ALL_CLEAR } from "@/ops/switches";

const BASE = { ...DEFAULT_SIM_CONFIG, weeks: 6, patientCount: 1_000, clinicianCount: 4 };

describe("W19 ops switches honoured in sim", () => {
  it("the kill switch stops all sending", () => {
    const result = runSim({ ...BASE, switches: { killSwitch: true, pausedPracticeIds: [] } });
    expect(result.totals.invitationsSent).toBe(0);
    expect(result.totals.booked).toBe(0);
  });

  it("pausing this practice stops its sending", () => {
    const open = runSim(BASE);
    expect(open.totals.invitationsSent).toBeGreaterThan(0);
    const paused = runSim({
      ...BASE,
      switches: { killSwitch: false, pausedPracticeIds: [open.practice.id] },
    });
    expect(paused.totals.invitationsSent).toBe(0);
  });

  it("pausing a different practice does not affect this one", () => {
    const open = runSim(BASE);
    const other = runSim({
      ...BASE,
      switches: { killSwitch: false, pausedPracticeIds: ["some-other-practice"] },
    });
    expect(other.totals.invitationsSent).toBe(open.totals.invitationsSent);
  });

  it("all-clear is the default behaviour", () => {
    const explicit = runSim({ ...BASE, switches: ALL_CLEAR });
    const implicit = runSim(BASE);
    expect(explicit.totals.invitationsSent).toBe(implicit.totals.invitationsSent);
  });
});
