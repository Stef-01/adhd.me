import { describe, expect, it } from "vitest";
import { buildDashboardData } from "@/sim/dashboard-data";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import type { CapacitySessionRow } from "./capacity";
import { longDate, northStar, simulatedPeriod, underFull } from "./spine";

const data = buildDashboardData(runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6, patientCount: 1_500 }));

describe("the period in words", () => {
  it("reads the week count and the last week's end off the data", () => {
    // 6 weeks from 2026-08-08: the last week starts 2026-09-13 and ends 2026-09-19.
    expect(simulatedPeriod(data)).toBe("6 simulated weeks to 19 Sept 2026");
  });

  it("formats a date the way a manager reads it", () => {
    expect(longDate("2027-02-06")).toBe("6 Feb 2027");
  });

  it("does not invent an end date for a run with no weeks", () => {
    expect(simulatedPeriod({ ...data, weeks: 0, weekly: [] })).toBe("0 simulated weeks");
  });
});

describe("the north star on the home", () => {
  it("is the dashboard's own figure when the claim stands", () => {
    expect(northStar(data)).toBe(data.attribution.incrementalPer1000);
    expect(northStar(data)).not.toBeNull();
  });

  it("is null, not zero, when there is no comparison group", () => {
    const noHoldout = {
      ...data,
      attribution: {
        ...data.attribution,
        incrementalAttended: null,
        incrementalPer1000: null,
        holdoutArm: { patients: 0, attended: 0, attendedPer1000: 0 },
      },
    };
    expect(northStar(noHoldout)).toBeNull();
  });
});

describe("sessions running under full", () => {
  const row = (label: string, utilisation: number | null): CapacitySessionRow =>
    ({ label, utilisation } as CapacitySessionRow);

  it("counts rated rows below full and leaves unrated rows out of both sides", () => {
    expect(underFull([row("a", 1), row("b", 0.5), row("c", null), row("d", 0.99)])).toEqual({
      underFull: 2,
      rated: 3,
    });
  });

  it("reports no rated rows rather than a zero over nothing", () => {
    expect(underFull([row("a", null)])).toEqual({ underFull: 0, rated: 0 });
  });
});
