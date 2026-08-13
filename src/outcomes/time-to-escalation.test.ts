// W176 verify gate: no threshold, target or SLA exists anywhere in the module, and the copy
// says why a target would change clinical behaviour.

import { describe, expect, it } from "vitest";
import { foldIsOrderIndependent } from "../quality/order-independence";
import * as mod from "./time-to-escalation";
import {
  type EscalationTiming,
  NO_MEASUREMENT_COPY,
  WHY_NO_TARGET,
  measureTimeToEscalation,
  renderTimeToEscalation,
} from "./time-to-escalation";

const timing = (factCode: string, recorded: string, noticed: string): EscalationTiming => ({
  pathwayId: "cardio-v1",
  versionHash: "h1",
  factCode,
  factRecordedAt: recorded,
  noticedAt: noticed,
});

const RAISED: EscalationTiming[] = [
  timing("egfr_declining", "2026-03-01", "2026-03-12"), // 11 days
  timing("bp_unstable", "2026-03-04", "2026-03-06"), // 2 days
  timing("acr_rising", "2026-03-10", "2026-03-10"), // same day
];

describe("W176 the interval is measured and reported in full", () => {
  it("counts whole days between the fact landing and the pathway being evaluated", () => {
    const report = measureTimeToEscalation(RAISED, 5);
    expect(report.measured.map((m) => m.days)).toEqual([0, 2, 11]);
    expect(report.shortestDays).toBe(0);
    expect(report.longestDays).toBe(11);
  });

  it("lists every measurement rather than a summary of them", () => {
    expect(measureTimeToEscalation(RAISED, 5).measured).toHaveLength(RAISED.length);
  });

  it("orders shortest first, and a tie does not resolve by input order", () => {
    const tied = [timing("a_code", "2026-03-01", "2026-03-04"), timing("b_code", "2026-04-01", "2026-04-04")];
    const { stable } = foldIsOrderIndependent((xs) => measureTimeToEscalation(xs, 1), tied);
    expect(stable).toBe(true);
    expect(measureTimeToEscalation(tied, 1).measured.map((m) => m.factCode)).toEqual([
      "a_code",
      "b_code",
    ]);
  });

  it("reports a null spread rather than zero when nothing is measured", () => {
    // Zero days would read as "everything was noticed instantly", which is the opposite of
    // "there is nothing here".
    const report = measureTimeToEscalation([], 4);
    expect(report.shortestDays).toBeNull();
    expect(report.longestDays).toBeNull();
  });

  it("distinguishes nothing evaluated from evaluated-and-none-escalated", () => {
    expect(measureTimeToEscalation([], 0).noMeasurement).toBe("nothing_evaluated");
    expect(measureTimeToEscalation([], 7).noMeasurement).toBe("evaluated_none_escalated");
    expect(measureTimeToEscalation(RAISED, 7).noMeasurement).toBeNull();
  });
});

describe("W176 the measure cannot be read without the population it excludes", () => {
  it("carries the count of verdicts that escalated nothing", () => {
    // Survivorship: a practice that escalates nothing has no measurement, and "no measurement"
    // looks identical to "nothing went slowly" unless this number is beside it.
    const report = measureTimeToEscalation(RAISED, 41);
    expect(report.notEscalated).toBe(41);
    expect(report.basis).toContain("41 evaluated pathway(s) raised none");
    expect(report.basis).toContain("not the same as");
  });

  it("says so in the rendered report, not only in the object", () => {
    const text = renderTimeToEscalation(measureTimeToEscalation(RAISED, 41), "2026-03-15");
    expect(text).toContain("41 evaluated pathway(s) raised none");
    expect(text).toContain("raising fewest");
  });

  it("says which kind of nothing it is when there is no measurement", () => {
    const nothing = renderTimeToEscalation(measureTimeToEscalation([], 0), "2026-03-15");
    const none = renderTimeToEscalation(measureTimeToEscalation([], 9), "2026-03-15");
    expect(nothing).toContain(NO_MEASUREMENT_COPY.nothing_evaluated);
    expect(none).toContain(NO_MEASUREMENT_COPY.evaluated_none_escalated);
    expect(nothing).not.toBe(none);
  });
});

describe("W176 no threshold, target or SLA exists anywhere in the module", () => {
  it("exports nothing that names one, and nothing that averages", () => {
    // Guarantee-as-absence (W68's shape). A central tendency is the figure a target attaches
    // to, and here it would summarise only the escalations that happened.
    expect(Object.keys(mod).sort()).toEqual([
      "NO_MEASUREMENT_COPY",
      "WHY_NO_TARGET",
      "measureTimeToEscalation",
      "renderTimeToEscalation",
    ]);
    // The pinned list above is the guarantee; this catches a future export that slips past a
    // reviewer. `WHY_NO_*` is exempt as a rule rather than as an exception for one name: an
    // export whose name says why there is no X is the refusal, not the thing being refused.
    const named = Object.keys(mod).filter((name) => !name.startsWith("WHY_NO_"));
    expect(named.length).toBeGreaterThan(0);
    for (const name of named) {
      expect(name, `${name} names a target or an average`).not.toMatch(
        /target|threshold|sla|goal|benchmark|mean|median|average|rate|percent|score/i,
      );
    }
  });

  it("puts no threshold field on the report", () => {
    const report = measureTimeToEscalation(RAISED, 5);
    for (const field of Object.keys(report)) {
      expect(field).not.toMatch(/target|threshold|sla|goal|benchmark|breach|overdue|status/i);
    }
    // Non-vacuous: the report really does have fields.
    expect(Object.keys(report).length).toBeGreaterThan(4);
  });

  it("renders no verdict vocabulary and no percentage", () => {
    const texts = [
      renderTimeToEscalation(measureTimeToEscalation(RAISED, 5), "2026-03-15"),
      renderTimeToEscalation(measureTimeToEscalation([], 0), "2026-03-15"),
    ];
    // "target" and "threshold" ARE present — in the sentence saying there is none — so the scan
    // is for the vocabulary of a VERDICT, which the refusal does not need. W95's collision,
    // avoided by banning the words a judgement would use rather than the words naming it.
    const banned = /\b(overdue|breach|breached|too slow|late|acceptable|unacceptable|amber|red|green|sla)\b/i;
    for (const text of texts) {
      expect(text.length).toBeGreaterThan(0);
      const hit = text.match(banned);
      expect(hit?.[0] ?? null, `the report judges the interval: "${hit?.[0]}"`).toBeNull();
      expect(text).not.toMatch(/\d\s*%/);
    }
  });
});

describe("W176 the copy says why a target would change clinical behaviour", () => {
  it("names the behaviour change, not just the refusal", () => {
    // The gate asks the copy to make the argument. "We do not do targets" would satisfy a
    // reading of the row and persuade nobody who was about to ask for one.
    expect(WHY_NO_TARGET).toContain("escalate sooner");
    expect(WHY_NO_TARGET).toMatch(/thinner grounds/);
    expect(WHY_NO_TARGET).toContain("change in clinical behaviour");
  });

  it("names the cost of the direction it would push", () => {
    expect(WHY_NO_TARGET).toContain("attention of whoever receives the escalation");
    expect(WHY_NO_TARGET).toContain("alarm of the patient");
  });

  it("hands the judgement back to signed-off content rather than keeping it", () => {
    expect(WHY_NO_TARGET).toContain("signed-off content");
    expect(WHY_NO_TARGET).toContain("not in a figure this software");
  });

  it("appears on the report whether or not anything was measured", () => {
    // The argument is most needed on the empty report — that is the one somebody looks at and
    // says "so what would good look like?".
    for (const notEscalated of [0, 9]) {
      expect(renderTimeToEscalation(measureTimeToEscalation([], notEscalated), "2026-03-15")).toContain(
        WHY_NO_TARGET,
      );
    }
    expect(renderTimeToEscalation(measureTimeToEscalation(RAISED, 9), "2026-03-15")).toContain(
      WHY_NO_TARGET,
    );
  });

  it("says the interval is not a fact about a person", () => {
    const text = renderTimeToEscalation(measureTimeToEscalation(RAISED, 9), "2026-03-15");
    // W83's floor: `factRecordedAt` is when the fact entered the record, so a slow import and
    // an inattentive week are the same number, and neither belongs to anybody.
    expect(text).toContain("not about anybody's attention");
    expect(text).toContain("slow import");
    expect(JSON.stringify(measureTimeToEscalation(RAISED, 9))).not.toMatch(/clinician|recordedBy/i);
  });
});
