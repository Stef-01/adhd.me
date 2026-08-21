// W228 verify gate: "a forecaster that has stopped tracking reality is REPORTED, never silently
// recalibrated (W120's rule: report the disagreement, do not resolve it)."
//
// The absence of recalibration is the assertion that matters, and it is checked three ways,
// because "we did not add that" is exactly the kind of claim that stays true only until somebody
// adds it: the namespace holds one function, the source holds no adjusting identifier, and nothing
// this module returns has a shape a forecaster could be fed.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { lintEducationCopy } from "@/education/advice-lint";
import { occurrencesFrom, sessionKeysFrom } from "./model";
import { MIN_SCORED_PREDICTIONS, backTest, scorePredictions, type Prediction } from "./score";
import * as mod from "./drift";
import {
  DRIFT_REFUSAL_COPY,
  DRIFT_THRESHOLD,
  DRIFT_VERDICT_COPY,
  driftReport,
} from "./drift";

const SOURCE = readFileSync(path.join(process.cwd(), "src/capacity/drift.ts"), "utf8");

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const AS_OF = isoDaysFrom(sim.config.todayIso, 6 * 7 + 1);
const PERIOD = { fromIso: sim.config.todayIso, toIso: AS_OF };
const occurrences = occurrencesFrom(sim.appointments, AS_OF);
const realPredictions = sessionKeysFrom(occurrences).flatMap(
  (key) => backTest(occurrences, key, PERIOD).predictions,
);

/** `n` predictions on consecutive days, the first `hits` of which are hits. */
const made = (n: number, hits: number, startIso: string): Prediction[] =>
  Array.from({ length: n }, (_, i) => ({
    dayIso: isoDaysFrom(startIso, i),
    slotsOffered: 6,
    range: { low: 2, high: 4 },
    actualFilled: i < hits ? 3 : 6,
    hit: i < hits,
    widthSlots: 2,
  }));

describe("W228 the record is split and both halves are reported", () => {
  it("compares the simulated forecaster's two halves and reports both counts", () => {
    const report = driftReport(realPredictions, PERIOD);
    expect(report.compared).toBe(true);
    if (!report.compared) return;
    // Measured, so a change in the sim's behaviour shows up as a failed pin rather than silently.
    expect(realPredictions).toHaveLength(131);
    expect(report.earlier.predictions).toBe(65);
    expect(report.recent.predictions).toBe(66);
    expect(report.earlier.hits).toBe(57);
    expect(report.recent.hits).toBe(54);
    expect(report.verdict).toBe("tracking");
    expect(report.change).toBeCloseTo(-0.0587, 3);
    // Counts, never only rates: a reader has to be able to see how many weeks each figure is over.
    expect(report.copy).toContain("Earlier: 57 of 65.");
    expect(report.copy).toContain("Lately: 54 of 66.");
  });

  it("gives the extra prediction to the recent half, so the newer evidence is not the thinner side", () => {
    const report = driftReport(made(11, 11, "2026-03-01"), PERIOD);
    expect(report.compared).toBe(true);
    if (!report.compared) return;
    expect(report.earlier.predictions).toBe(5);
    expect(report.recent.predictions).toBe(6);
  });

  it("agrees with W224's own arithmetic on the same window", () => {
    // The two computations are separate — this module counts directly rather than calling
    // `scorePredictions`, to avoid a fallback for a state it cannot reach — so they are pinned
    // against each other here instead of being allowed to drift apart.
    const report = driftReport(realPredictions, PERIOD);
    if (!report.compared) throw new Error("expected a comparison");
    const ordered = [...realPredictions].sort((a, b) => a.dayIso.localeCompare(b.dayIso));
    const earlier = scorePredictions(ordered.slice(0, 65), PERIOD);
    const recent = scorePredictions(ordered.slice(65), PERIOD);
    expect(earlier.scored && recent.scored).toBe(true);
    if (!earlier.scored || !recent.scored) return;
    expect(report.earlier.hitRate).toBe(earlier.hitRate);
    expect(report.recent.hitRate).toBe(recent.hitRate);
    expect(report.earlier.meanWidthSlots).toBe(earlier.meanWidthSlots);
  });

  it("refuses below the floor and reports both counts anyway", () => {
    const report = driftReport(made(6, 6, "2026-03-01"), PERIOD);
    expect(report.compared).toBe(false);
    if (report.compared) return;
    expect(report.why).toBe("too_few_in_a_window");
    expect(report.earlierPredictions).toBe(3);
    expect(report.recentPredictions).toBe(3);
    expect(report.copy).toBe(DRIFT_REFUSAL_COPY.too_few_in_a_window);
    // Moves with W224's floor rather than a number written here.
    const atFloor = driftReport(made(MIN_SCORED_PREDICTIONS.predictions * 2, 6, "2026-03-01"), PERIOD);
    expect(atFloor.compared).toBe(true);
  });
});

describe("W228 all three verdicts are reached, and the threshold is the thing that decides", () => {
  it("reports drift when the recent half is worse by more than the threshold", () => {
    // Ten of ten early, four of ten lately: a fall of 60 points.
    const report = driftReport([...made(10, 10, "2026-03-01"), ...made(10, 4, "2026-04-01")], PERIOD);
    expect(report.compared).toBe(true);
    if (!report.compared) return;
    expect(report.verdict).toBe("drifted");
    expect(report.change).toBeCloseTo(-0.6, 5);
    expect(report.copy).toContain(DRIFT_VERDICT_COPY.drifted);
  });

  it("reports an improvement the same way, rather than only reporting bad news", () => {
    const report = driftReport([...made(10, 4, "2026-03-01"), ...made(10, 10, "2026-04-01")], PERIOD);
    expect(report.compared).toBe(true);
    if (!report.compared) return;
    expect(report.verdict).toBe("improved");
    expect(report.change).toBeCloseTo(0.6, 5);
  });

  it("sits on the threshold rather than near it, from both sides", () => {
    // Exactly at the boundary counts as drift; a hair inside does not. A threshold tested only
    // from far away passes with an off-by-one that fires on real data.
    const drop = (points: number) =>
      driftReport([...made(10, 10, "2026-03-01"), ...made(10, 10 - points, "2026-04-01")], PERIOD);
    const at = drop(1); // 100% → 90%: exactly ten points.
    expect(at.compared && at.change).toBeCloseTo(-DRIFT_THRESHOLD.points, 5);
    expect(at.compared && at.verdict).toBe("drifted");
    const inside = driftReport(
      [...made(20, 20, "2026-03-01"), ...made(20, 19, "2026-04-01")], // 5 points
      PERIOD,
    );
    expect(inside.compared && inside.verdict).toBe("tracking");
  });

  it("declares every verdict and refusal it can produce, both directions", () => {
    const verdicts = new Set<string>();
    for (const predictions of [
      realPredictions,
      [...made(10, 10, "2026-03-01"), ...made(10, 4, "2026-04-01")],
      [...made(10, 4, "2026-03-01"), ...made(10, 10, "2026-04-01")],
    ]) {
      const report = driftReport(predictions, PERIOD);
      if (report.compared) verdicts.add(report.verdict);
    }
    expect([...verdicts].sort()).toEqual(Object.keys(DRIFT_VERDICT_COPY).sort());
    const refused = driftReport(made(4, 4, "2026-03-01"), PERIOD);
    expect(refused.compared).toBe(false);
    if (!refused.compared) expect(Object.keys(DRIFT_REFUSAL_COPY)).toContain(refused.why);
  });
});

describe("W228 the disagreement is reported and never resolved", () => {
  it("exports one function, and it returns a description rather than an adjustment", () => {
    expect(Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === "function")).toEqual([
      "driftReport",
    ]);
    const report = driftReport(realPredictions, PERIOD);
    if (!report.compared) throw new Error("expected a comparison");
    // Nothing in the returned shape is a range, a floor or a multiplier — there is nothing here a
    // forecaster could be fed back.
    expect(Object.keys(report).sort()).toEqual([
      "basis", "change", "compared", "copy", "earlier", "recent", "threshold", "verdict",
    ]);
    expect(Object.keys(report.earlier).sort()).toEqual([
      "fromIso", "hitRate", "hits", "meanWidthSlots", "predictions", "toIso",
    ]);
  });

  it("contains no adjusting identifier anywhere in its source", () => {
    // "We did not add that" stays true only until somebody adds it, and the line that adds it
    // looks like a fix for a red monitor.
    // Comments stripped first: the module note has to USE the word "recalibration" to explain why
    // there is none, and a scan that cannot tell prose from code would force the explanation out
    // of the file to satisfy itself. Caught on the first run, when the guard fired on its own
    // module note.
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
    expect(code, "the comment stripper removed the code too").toContain("export function driftReport");
    expect(code).not.toMatch(/\b(recalibrat|readjust|autotune|auto-?correct)/i);
    expect(code, "an adjusting function name").not.toMatch(
      /\b(function|const)\s+\w*(adjust|widen|tune|correct|calibrat)\w*/i,
    );
  });

  it("takes no threshold argument, so the bar cannot be raised after the alert", () => {
    // @ts-expect-error — W196: a threshold passed per call is a threshold somebody sets on seeing
    // the answer, which is the same move as widening the range and harder to spot.
    void driftReport(realPredictions, PERIOD, { points: 0.9 });
    expect(DRIFT_THRESHOLD.why.length).toBeGreaterThan(120);
  });

  it("says outright that drift does not say which side moved", () => {
    expect(DRIFT_VERDICT_COPY.drifted).toMatch(/does not say which side moved/);
    expect(DRIFT_VERDICT_COPY.drifted).toMatch(/Nothing here has been adjusted to close the gap/);
    // And "tracking" must not read as a clean bill of health for the forecaster.
    expect(DRIFT_VERDICT_COPY.tracking).toMatch(/does not say the ranges are good/);
  });

  it("passes the advice linter on everything it can say", () => {
    const report = driftReport(realPredictions, PERIOD);
    const texts = [
      ...Object.values(DRIFT_VERDICT_COPY),
      ...Object.values(DRIFT_REFUSAL_COPY),
      DRIFT_THRESHOLD.why,
      report.compared ? report.copy : "",
    ];
    for (const text of texts) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
