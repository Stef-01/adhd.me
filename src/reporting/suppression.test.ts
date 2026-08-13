// W197 verify gate: "a cohort below the declared floor is suppressed rather than rounded, and
// suppression is stated in the report rather than left as a gap (W145's 'named, not omitted'
// rule)."
//
// "Rather than rounded" needs a test that would fail for every rounding scheme, not one that
// checks the happy path. So the suppressed value is hunted for in the rendered document — a band,
// a rounded figure and a zero substitution all put something there, and only true suppression
// leaves nothing to find.

import { describe, expect, it } from "vitest";
import {
  NESTED_KINDS,
  REFUSED_SUPPRESSION_TREATMENTS,
  renderSuppressedReport,
  suppressReport,
  type SuppressedReport,
} from "./suppression";
import { AGGREGATION_FLOORS, figure, type Figure, type FigureKind } from "./model";

const built = (kind: FigureKind, value: number, recordedFacts: number): Figure => {
  const result = figure(kind, value, {
    source: "src/referrals/store.ts",
    recordedFacts,
    fromIso: "2026-04-01",
    toIso: "2026-06-30",
  });
  if (!result.ok) throw new Error(`fixture refused: ${result.errors.join(", ")}`);
  return result.figure;
};

const FLOOR = AGGREGATION_FLOORS.referrals_written.floor;

describe("W197 a cell below the floor is suppressed, not rounded", () => {
  it("publishes no value at all for it", () => {
    const report = suppressReport([built("referrals_written", 3, 40)]);
    expect(report.published).toEqual([]);
    expect(report.suppressed).toHaveLength(1);
    expect(report.suppressed[0]!.reason).toBe("value_below_floor");
  });

  it("leaves the value nowhere to be found in the rendered document", () => {
    // The test that fails for EVERY rounding scheme rather than for the one I thought of.
    // A band, a round-up, a round-down and a zero substitution all put something in the cell;
    // only suppression leaves nothing.
    const rendered = renderSuppressedReport(suppressReport([built("referrals_written", 3, 40)]));
    const text = rendered.join(" ");
    expect(text).not.toMatch(/\b3\b/);
    expect(text).not.toMatch(/<\s*5|≤\s*5|under 5|fewer than 5 referrals/i);
    expect(text).not.toMatch(/\b0\b/);
  });

  it("still names the floor, which is not a leak and is the reader's only calibration", () => {
    // Saying "fewer than 5" bounds the value at 0–4, which is inherent to any suppression scheme
    // and is what published statistics do. Withholding the floor would leave a reader unable to
    // tell a suppressed 4 from a suppressed 400.
    const report = suppressReport([built("referrals_written", 3, 40)]);
    expect(report.suppressed[0]!.floor).toBe(FLOOR);
    expect(report.suppressed[0]!.statement).toContain(`fewer than ${FLOOR}`);
  });

  it("publishes a figure that clears the floor untouched", () => {
    const report = suppressReport([built("referrals_written", 9, 40)]);
    expect(report.suppressed).toEqual([]);
    expect(report.published).toHaveLength(1);
    expect(report.published[0]!.value).toBe(9);
  });

  it("treats the floor as inclusive-from, so exactly the floor publishes", () => {
    // Off-by-one here discloses a cohort or withholds a lawful figure, and which one depends on
    // a comparison operator nobody re-reads.
    expect(suppressReport([built("referrals_written", FLOOR, 40)]).published).toHaveLength(1);
    expect(suppressReport([built("referrals_written", FLOOR - 1, 40)]).suppressed).toHaveLength(1);
  });

  it("records every treatment it refuses, with the reason each fails", () => {
    for (const key of ["round_up", "round_down_to_zero", "band", "blank_cell", "asterisk_only"]) {
      expect(Object.keys(REFUSED_SUPPRESSION_TREATMENTS)).toContain(key);
      expect(REFUSED_SUPPRESSION_TREATMENTS[key]!.length).toBeGreaterThan(40);
    }
  });
});

describe("W197 two figures that each clear the floor can disclose a cell that does not", () => {
  const WRITTEN = 40;

  it("withholds the subset when the DIFFERENCE is below the floor", () => {
    // The unit's real finding. 40 and 38 both clear a floor of 5 comfortably, and together they
    // say exactly two referrals have no recorded completion. No per-figure check can see it,
    // because neither figure is small — the small cell never appears in the report at all.
    const report = suppressReport([
      built("referrals_written", WRITTEN, 60),
      built("referrals_with_recorded_completion", 38, 60),
    ]);
    expect(report.published.map((f) => f.kind)).toEqual(["referrals_written"]);
    expect(report.suppressed[0]!.kind).toBe("referrals_with_recorded_completion");
    expect(report.suppressed[0]!.reason).toBe("complement_below_floor");
  });

  it("leaves the differenceable pair unreconstructable in the document", () => {
    // W205 STRENGTHENED THIS TEST, and the reason is that it passed against a document that
    // leaked. It only checked the literal 38 was absent — but the statement said "the difference
    // between them is fewer than 5 people", which beside the published 40 bounds the subset to
    // [36,40] and the hidden group to [0,4]. That is the `band` this module refuses, arriving as
    // an explanation, and a test looking for one number could not see it.
    const report = suppressReport([
      built("referrals_written", WRITTEN, 60),
      built("referrals_with_recorded_completion", 38, 60),
    ]);
    const text = renderSuppressedReport(report).join(" ");
    expect(text).not.toMatch(/\b38\b/);

    // No quantity at all in the complement statement: any number here narrows the range a reader
    // can place the withheld figure in, which is the whole disclosure.
    const statement = report.suppressed[0]!.statement;
    expect(statement, "the complement statement quantifies the gap").not.toMatch(/\d/);
    expect(statement).not.toMatch(/fewer than|less than|under \d|at most|no more than/i);
    expect(statement).toContain("is the thing being protected");
  });

  it("still calibrates a value_below_floor suppression, where the floor reveals nothing new", () => {
    // The two statements differ on purpose, and the asymmetry is the finding. For a plain
    // small cell the floor is the reader's only calibration and tells them nothing they could
    // not infer from the scheme existing. For a complement it IS the disclosure.
    const plain = suppressReport([built("referrals_written", 3, 40)]).suppressed[0]!;
    expect(plain.statement).toContain(`fewer than ${FLOOR}`);
  });

  it("publishes both when the difference clears the floor", () => {
    // The rule must not become a blanket refusal to report the pair: a difference of 15 is not a
    // small cell, and withholding it would cost a commissioner the one comparison they came for.
    const report = suppressReport([
      built("referrals_written", WRITTEN, 60),
      built("referrals_with_recorded_completion", 25, 60),
    ]);
    expect(report.suppressed).toEqual([]);
    expect(report.published).toHaveLength(2);
  });

  it("withholds the SUBSET rather than the whole, which hides less", () => {
    // Publishing the whole while withholding the part tells a reader only that the part lies
    // somewhere between 0 and the whole. The other way round bounds the whole from below.
    const report = suppressReport([
      built("referrals_written", WRITTEN, 60),
      built("referrals_with_recorded_completion", 38, 60),
    ]);
    expect(report.published[0]!.value).toBe(WRITTEN);
  });

  it("does not withhold the part when the whole is itself withheld", () => {
    // With no published whole there is nothing to difference against, and suppressing the part
    // as well would hide a lawful figure for no gain.
    const report = suppressReport([
      built("referrals_written", 3, 60),
      built("referrals_with_recorded_completion", 3, 60),
    ]);
    for (const entry of report.suppressed) expect(entry.reason).toBe("value_below_floor");
  });

  it("declares the nesting as data, so an undeclared one is a visible gap", () => {
    // An undeclared nesting is a differencing channel nobody is checking, and it looks exactly
    // like no channel existing.
    expect(NESTED_KINDS).toContainEqual({
      whole: "referrals_written",
      part: "referrals_with_recorded_completion",
    });
  });

  it("publishes the basis when everything clears, because a count without one is an impression", () => {
    // The suppression must not become a reason to stop publishing denominators generally — W196
    // built the basis in deliberately, and "4" alone is what it exists to prevent.
    const report = suppressReport([built("referrals_written", 9, 40)]);
    expect(report.published[0]!.recordedFacts).toBe(40);
    expect(renderSuppressedReport(report).join(" ")).toContain("counted over 40");
  });

  it("names the cross-report residual rather than implying it is closed", () => {
    // A commissioner holding two quarters can subtract, and no per-report rule can see that.
    // Claiming otherwise would be worse than the gap.
    const text = readModule();
    expect(text).toContain("differencing across SEVERAL reports");
    expect(text).toContain("W203");
  });

  it("records that the first draft's second rule was unreachable", () => {
    // Kept because a rule that cannot fire looks exactly like a rule that works, and the next
    // reader deserves to know the concern was checked rather than overlooked.
    const text = readModule();
    expect(text).toContain("UNREACHABLE");
  });
});

describe("W197 suppression is stated, never left as a gap", () => {
  it("names every withheld figure rather than silently dropping it", () => {
    // W145's rule. A blank cell and a suppressed cell look identical and mean opposite things,
    // and a reader will assume the one that needs no explanation.
    const report = suppressReport([
      built("referrals_written", 3, 40),
      built("register_membership", 2, 40),
      built("care_gaps_detected", 12, 40),
    ]);
    expect(report.published.map((f) => f.kind)).toEqual(["care_gaps_detected"]);
    expect(report.suppressed.map((s) => s.kind)).toEqual([
      "referrals_written",
      "register_membership",
    ]);
    for (const entry of report.suppressed) {
      expect(entry.statement).toContain("withheld");
      expect(entry.statement).toContain("not missing");
    }
  });

  it("says a withheld figure is not a zero, which is the other misreading", () => {
    const report = suppressReport([built("referrals_written", 3, 40)]);
    expect(report.statement).toContain("not a zero");
  });

  it("carries the report-level sentence even when NOTHING was suppressed", () => {
    // Its absence would itself be information: a reader who only sees the sentence on some
    // reports learns to read its presence as "something was hidden here".
    const report = suppressReport([built("referrals_written", 9, 40)]);
    expect(report.suppressed).toEqual([]);
    expect(report.statement).toContain("No figure in this report was withheld");
    expect(renderSuppressedReport(report)[0]).toBe(report.statement);
  });

  it("renders every suppression into the document, not only into the object", () => {
    const report = suppressReport([
      built("referrals_written", 3, 40),
      built("register_membership", 2, 40),
    ]);
    const rendered = renderSuppressedReport(report).join("\n");
    for (const entry of report.suppressed) expect(rendered).toContain(entry.statement);
  });
});

describe("W197 the floor cannot be chosen after seeing the data", () => {
  it("takes no threshold argument", () => {
    // W196 kept the floor off `figure`'s signature for this reason; the same rule has to hold
    // here or the register becomes advisory.
    // @ts-expect-error — there is no floor, options or threshold parameter to pass.
    void (() => suppressReport([], { floor: 1 }));
  });

  it("uses the floor the figure carries, per kind", () => {
    // The floors differ by kind because the re-identification risk does. A single global floor
    // applied here would quietly overrule the register's reasoning.
    for (const kind of Object.keys(AGGREGATION_FLOORS) as FigureKind[]) {
      const floor = AGGREGATION_FLOORS[kind].floor;
      expect(suppressReport([built(kind, floor - 1, 40)]).suppressed[0]!.floor).toBe(floor);
    }
  });
});

describe("W197 the report cannot be assembled around the suppression", () => {
  it("mints publishable figures only through suppressReport", () => {
    // Branded, so a renderer cannot be handed raw figures. The check cannot be skipped if the
    // result of the check is the only thing downstream accepts.
    const report = suppressReport([built("referrals_written", 9, 40)]);
    const forged = { kind: "referrals_written", value: 3, recordedFacts: 40, source: "s", fromIso: "2026-04-01", toIso: "2026-06-30" };
    // @ts-expect-error — a plain object is not a PublishableFigure.
    const attempt: SuppressedReport = { ...report, published: [forged] };
    expect(attempt.published).toHaveLength(1);
  });

  it("orders both lists deterministically, whatever order the figures arrive in", () => {
    const figures = [
      built("register_membership", 2, 40),
      built("referrals_written", 9, 40),
      built("care_gaps_detected", 1, 40),
    ];
    const forwards = suppressReport(figures);
    const backwards = suppressReport([...figures].reverse());
    expect(backwards.published.map((f) => f.kind)).toEqual(forwards.published.map((f) => f.kind));
    expect(backwards.suppressed.map((s) => s.kind)).toEqual(forwards.suppressed.map((s) => s.kind));
  });
});

function readModule(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const path = require("node:path") as typeof import("node:path");
  return readFileSync(path.join(__dirname, "suppression.ts"), "utf8");
}
