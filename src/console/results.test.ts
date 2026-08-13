import { describe, expect, it } from "vitest";
import { buildPracticeResults, shortDate, weeklyExtras } from "@/console/results";
import { RESULTS_COPY } from "@/console/results-copy";
import { lintCopyBundle } from "@/compliance/landing";
import { DEFAULT_GUARDRAILS } from "@/guardrails/monitors";
import { buildDashboardData } from "@/sim/dashboard-data";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import type { DashboardData } from "@/sim/dashboard-data";

const OPTIONS = { revenuePerAttendedVisit: 80, guardrails: DEFAULT_GUARDRAILS };

/** A small deterministic run — the shape is what matters, not the exact seed. */
const data = buildDashboardData(runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6, patientCount: 1_500 }));

describe("W42 practice results view-model", () => {
  const r = buildPracticeResults(data, [], OPTIONS);

  it("reports extra appointments, never the raw generated count, as the headline", () => {
    // The honest number must be strictly smaller than the raw count when displacement
    // is modelled — that gap is the entire point of the comparison group.
    expect(r.extraAppointments).not.toBeNull();
    expect(r.extraAppointments!).toBeLessThan(r.bookedFromMessage);
    expect(r.wouldHaveHappenedAnyway).toBe(
      Math.max(0, r.bookedFromMessage - r.extraAppointments!),
    );
  });

  it("prices only the extra appointments, and shows what the naive claim would be", () => {
    // Priced off the ROUNDED count so the page's own arithmetic checks out.
    expect(r.extraRevenueAud).toBe(r.extraAppointments! * 80);
    expect(r.naiveWouldClaimAud).toBe(Math.round(r.bookedFromMessage * 80));
    expect(r.naiveWouldClaimAud).toBeGreaterThan(r.extraRevenueAud!);
  });

  it("converts rates to per-100 patients, the unit the page shows", () => {
    expect(r.messagedPer100).toBeCloseTo(data.attribution.inviteArm.attendedPer1000 / 10, 6);
    expect(r.comparisonPer100).toBeCloseTo(data.attribution.holdoutArm.attendedPer1000 / 10, 6);
  });

  it("carries guardrail alerts through and reports all-clear honestly", () => {
    expect(r.allClear).toBe(true);
    const withAlert = buildPracticeResults(
      data,
      [
        {
          monitor: "opt_out_rate",
          severity: "warning",
          value: 1.9,
          threshold: 1.6,
          message: "Opt-out rate is above the warning threshold.",
        },
      ],
      OPTIONS,
    );
    expect(withAlert.allClear).toBe(false);
    expect(withAlert.alerts).toHaveLength(1);
  });

  it("renders nothing rather than a fake number when there is no comparison group", () => {
    // A practice with no holdout has no defensible impact figure — the page must show
    // an em dash, never a zero or the raw count dressed up as impact.
    //
    // W215 CHANGED THIS FIXTURE, AND THE OLD ONE WAS TESTING THE WRONG THING. It nulled
    // `incrementalAttended` and `incrementalPer1000` while leaving the holdout arm populated —
    // the SYMPTOM, not the cause — so it verified that nulls propagate rather than that a
    // practice without a comparison group gets no claim. Now the claim derives from the arms,
    // so the fixture empties the arm, which is the condition the test names.
    const noComparison: DashboardData = {
      ...data,
      attribution: {
        ...data.attribution,
        holdoutArm: { patients: 0, attended: 0, attendedPer1000: 0 },
        incrementalAttended: null,
        incrementalPer1000: null,
      },
    };
    const blank = buildPracticeResults(noComparison, [], OPTIONS);
    expect(blank.extraAppointments).toBeNull();
    expect(blank.extraRevenueAud).toBeNull();
    expect(blank.extraPerWeek).toBeNull();
    expect(blank.differencePer100).toBeNull();
    expect(blank.withheldReasons).toEqual(["no_holdout_arm"]);
    expect(blank.withheldCopy).toContain("no comparison group");
    // The raw count is still known — it just never becomes the headline.
    expect(blank.bookedFromMessage).toBe(r.bookedFromMessage);
  });

  it("W215: withholds the claim when the holdout arm is below W72's floor, not only when empty", () => {
    // The gap this unit closed. W72 floored register cohorts two years ago; the practice-wide
    // figure — the one on the dashboard — withheld only on an EMPTY arm, so three holdout
    // patients produced a headline scaled off three people.
    const thin: DashboardData = {
      ...data,
      attribution: {
        ...data.attribution,
        holdoutArm: { patients: 3, attended: 0, attendedPer1000: 0 },
      },
    };
    const withheld = buildPracticeResults(thin, [], OPTIONS);
    expect(withheld.extraAppointments).toBeNull();
    expect(withheld.differencePer100).toBeNull();
    expect(withheld.withheldReasons).toEqual(["holdout_arm_below_floor"]);
    // Withheld is not missing: the counts a practice can check are still on the view-model.
    expect(withheld.messagedPatients).toBe(data.attribution.inviteArm.patients);
    expect(withheld.comparisonPatients).toBe(3);
  });

  it("W215: says the claim is withheld in words, and the copy never reads as a zero", () => {
    const thin: DashboardData = {
      ...data,
      attribution: {
        ...data.attribution,
        holdoutArm: { patients: 3, attended: 0, attendedPer1000: 0 },
      },
    };
    const copy = buildPracticeResults(thin, [], OPTIONS).withheldCopy;
    expect(copy).toBeTruthy();
    expect(copy!).not.toMatch(/\b0\b|zero|no extra/i);
    expect(copy!).toContain("too small");
  });

  it("weekly extras carry one row per week in per-100 units", () => {
    const weekly = weeklyExtras(data);
    expect(weekly).toHaveLength(data.weekly.length);
    expect(weekly[0]!.messagedPer100).toBeCloseTo(data.weekly[0]!.invitePer1000 / 10, 6);
    expect(Number.isInteger(weekly[0]!.extraAppointments)).toBe(true);
  });

  it("formats dates the way a practice manager reads them", () => {
    expect(shortDate("2026-08-09")).toMatch(/9 Aug/);
  });
});

describe("W42 copy compliance", () => {
  it("the shipped practice-facing copy passes the compliance linter", () => {
    // Same gate the public landing copy passes (W23): no clinical claims, no
    // testimonials or ratings, no superlatives, guarantees or urgency.
    expect(lintCopyBundle(RESULTS_COPY)).toEqual([]);
  });

  it("avoids the measurement jargon the v1 dashboard uses", () => {
    const allCopy = JSON.stringify(RESULTS_COPY).toLowerCase();
    for (const jargon of ["incrementality", "holdout", "per 1,000", "attribution", "arm"]) {
      expect(allCopy).not.toContain(jargon);
    }
  });
});
