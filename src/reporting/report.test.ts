// W199 verify gate: "golden report; e2e + axe zero violations; the report states its own coverage
// and denominator."
//
// The golden test is at the bottom. The tests above it exist so the golden test is a snapshot of
// the right thing — a byte-for-byte assertion locks in whatever the document says, including the
// wrong thing, so what it says has to be argued for separately.

import { describe, expect, it } from "vitest";
import {
  KIND_LABELS,
  REPORT_CAVEATS,
  buildPracticeReport,
  renderPracticeReport,
} from "./report";
import { figure, type Figure, type FigureKind } from "./model";

const PERIOD = { fromIso: "2026-04-01", toIso: "2026-06-30" };

const built = (kind: FigureKind, value: number, recordedFacts: number): Figure => {
  const result = figure(kind, value, {
    source: "src/referrals/store.ts",
    recordedFacts,
    fromIso: PERIOD.fromIso,
    toIso: PERIOD.toIso,
  });
  if (!result.ok) throw new Error(`fixture refused: ${result.errors.join(", ")}`);
  return result.figure;
};

const FIGURES = [built("referrals_written", 40, 60), built("register_membership", 22, 60)];

// What each fixture ATTEMPTED to compute. W205 made this an argument rather than an inference:
// without it the report cannot tell a kind that came back empty from one nobody asked about.
const ATTEMPTED: FigureKind[] = ["referrals_written", "register_membership"];
const WITH_GAPS: FigureKind[] = [...ATTEMPTED, "care_gaps_detected"];
const ALL_ATTEMPTED: FigureKind[] = [
  "care_gaps_detected",
  "referrals_with_recorded_completion",
  "referrals_written",
  "register_membership",
];

describe("W199 the report states its own denominator", () => {
  it("carries what every published figure was counted over", () => {
    // W196's argument, reaching the document: "4" is an impression, "4, counted over 12" is a
    // fact. A report that dropped the denominator would undo the unit that built it in.
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo Family Practice", PERIOD, FIGURES, ATTEMPTED),
      "2026-07-01",
    );
    expect(rendered).toContain("counted over 60 recorded fact(s)");
    expect(rendered).toContain("40");
    expect(rendered).toContain("22");
  });

  it("says in its own caveats that a figure without one is not published", () => {
    expect(REPORT_CAVEATS.join(" ")).toContain("without its denominator is an impression");
  });

  it("repeats the period on every figure, because a quoted figure loses the heading first", () => {
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo", PERIOD, FIGURES, ATTEMPTED),
      "2026-07-01",
    );
    // Matched on the figure form specifically: the caveats also say "counted over", and a
    // looser filter counted one of them as a figure line.
    const figureLines = rendered
      .split("\n")
      .filter((line) => /counted over \d+ recorded fact/.test(line));
    expect(figureLines.length).toBe(2);
    for (const line of figureLines) expect(line).toContain(`${PERIOD.fromIso} to ${PERIOD.toIso}`);
  });
});

describe("W199/W205 the report states its own coverage, in THREE lists", () => {
  it("separates looked-for-and-empty from never-looked-for", () => {
    // W205's finding. `nothingRecorded` used to be "every kind the caller did not pass", and
    // nothing in the tree computes register membership or care gaps — so every live report told
    // a practice "the record held nothing to count" about two figures nobody had ever tried to
    // count. That is a claim about the practice's rails made on the strength of a gap in Meherr.
    const report = buildPracticeReport("prac-1", "Demo", PERIOD, FIGURES, [
      ...ATTEMPTED,
      "care_gaps_detected",
    ]);
    expect(report.coverage.reported).toEqual(["referrals_written", "register_membership"]);
    expect(report.coverage.nothingRecorded).toEqual(["care_gaps_detected"]);
    expect(report.coverage.notComputed).toEqual(["referrals_with_recorded_completion"]);
  });

  it("says of an un-attempted kind that the gap is ours, not the practice's", () => {
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo", PERIOD, FIGURES, ATTEMPTED),
      "2026-07-01",
    );
    expect(rendered).toContain("Not produced by this product yet");
    expect(rendered).toContain("it is a gap in Meherr, not in your record");
  });

  it("distinguishes looked-for-and-empty from withheld and from zero", () => {
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo", PERIOD, FIGURES, [
        ...ATTEMPTED,
        "care_gaps_detected",
      ]),
      "2026-07-01",
    );
    expect(rendered).toContain("Looked for and found nothing recorded");
    expect(rendered).toContain("not because they are withheld");
    expect(rendered).toContain("not because the answer is zero");
  });

  it("states coverage even when every attempted kind reported", () => {
    // The sentence must not appear only on incomplete reports, or its presence becomes the
    // signal. W120's rule about silence, applied to a caveat rather than to a figure.
    const all = [
      built("referrals_written", 40, 60),
      built("referrals_with_recorded_completion", 20, 60),
      built("register_membership", 22, 60),
      built("care_gaps_detected", 11, 60),
    ];
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo", PERIOD, all, ALL_ATTEMPTED),
      "2026-07-01",
    );
    expect(rendered).toContain("Everything this report looked for had something recorded");
    expect(rendered).not.toContain("Not produced by this product yet");
  });

  it("states coverage on an empty report rather than rendering a blank", () => {
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo", PERIOD, [], ATTEMPTED),
      "2026-07-01",
    );
    expect(rendered).toContain("Nothing was reported for this period.");
    expect(rendered).toContain("Looked for and found nothing recorded");
  });

  it("attributes nothing to the practice when nothing was attempted at all", () => {
    // The whole-report version of the same distinction: an empty attempted list means this
    // product looked for nothing, and the document must not read as a description of a quiet
    // practice.
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo", PERIOD, [], []),
      "2026-07-01",
    );
    expect(rendered).toContain("Not produced by this product yet");
    expect(rendered).not.toContain("Looked for and found nothing recorded");
  });

  it("labels every kind it can name", () => {
    // A coverage list rendering a raw enum member would be the one place a reader meets the
    // tree's internal vocabulary.
    for (const label of Object.values(KIND_LABELS)) expect(label).not.toMatch(/_/);
  });
});

describe("W199 G9 — nothing is disclosed from here", () => {
  it("takes no recipient, destination or send argument", () => {
    // The gate is unratified, so the only reader is the practice itself. An adapter that exists
    // is one configuration change from disclosing — G1 and G3's shape, applied early.
    // @ts-expect-error — there is no recipient parameter and no options object to grow one.
    void (() => buildPracticeReport("prac-1", "Demo", PERIOD, [], { recipient: "phn" }));
  });

  it("says on the document that nothing has been sent", () => {
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo", PERIOD, FIGURES, ATTEMPTED),
      "2026-07-01",
    );
    expect(rendered).toContain("Nothing here has been sent to anybody");
    expect(rendered).toContain("no control on this page that would");
  });

  it("names the practice it belongs to, so it cannot be read as a group's", () => {
    const report = buildPracticeReport("prac-1", "Demo Family Practice", PERIOD, FIGURES, ATTEMPTED);
    expect(renderPracticeReport(report, "2026-07-01")).toContain("prac-1");
  });
});

describe("W199 suppression reaches the document", () => {
  it("renders a withheld figure as a named withholding, never as a gap", () => {
    const withSmall = [...FIGURES, built("care_gaps_detected", 2, 60)];
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo", PERIOD, withSmall, WITH_GAPS),
      "2026-07-01",
    );
    expect(rendered).toContain("Care gaps detected: withheld");
    expect(rendered).toContain("were withheld because they describe groups too");
    expect(rendered).not.toMatch(/Care gaps detected: 2\b/);
  });

  it("counts a withheld kind as REPORTED, not as nothing recorded", () => {
    // The distinction the coverage section exists for: withheld means measured, and listing it
    // under "nothing recorded" would be the exact misreading W197's statements prevent.
    const report = buildPracticeReport("prac-1", "Demo", PERIOD, [...FIGURES, built("care_gaps_detected", 2, 60)], WITH_GAPS);
    expect(report.coverage.reported).toContain("care_gaps_detected");
    expect(report.coverage.nothingRecorded).not.toContain("care_gaps_detected");
  });
});

describe("W199 the report is golden", () => {
  it("renders the same bytes whatever order the figures arrive in", () => {
    // A golden document that depends on input order is a golden document for one caller.
    const forwards = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo Family Practice", PERIOD, FIGURES, ATTEMPTED),
      "2026-07-01",
    );
    const backwards = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo Family Practice", PERIOD, [...FIGURES].reverse(), ATTEMPTED),
      "2026-07-01",
    );
    expect(backwards).toBe(forwards);
  });

  it("matches the golden document", () => {
    const rendered = renderPracticeReport(
      buildPracticeReport("prac-1", "Demo Family Practice", PERIOD, [...FIGURES, built("care_gaps_detected", 2, 60)], WITH_GAPS),
      "2026-07-01",
    );
    expect(rendered).toBe(
      [
        `# Reporting summary — Demo Family Practice`,
        ``,
        "Practice `prac-1`. Covering 2026-04-01 to 2026-06-30 inclusive.",
        `Generated 2026-07-01.`,
        ``,
        `## What this report is`,
        ``,
        ...REPORT_CAVEATS.map((c) => `- ${c}`),
        ``,
        `## Figures`,
        ``,
        `- 1 figure(s) in this report were withheld because they describe groups too small to publish without identifying people. Each is named below with the reason. A withheld figure was measured — it is not missing data, and it is not a zero.`,
        `- Referrals written: 40, counted over 60 recorded fact(s) from src/referrals/store.ts for 2026-04-01 to 2026-06-30.`,
        `- Register membership: 22, counted over 60 recorded fact(s) from src/referrals/store.ts for 2026-04-01 to 2026-06-30.`,
        `- Care gaps detected: withheld. This figure describes fewer than 5 people, and publishing it could identify them. It was measured; it is not missing.`,
        ``,
        `## Coverage`,
        ``,
        `Reported here: Care gaps detected, Referrals written, Register membership.`,
        `Everything this report looked for had something recorded in this period.`,
        `Not produced by this product yet: Referrals with a recorded completion. Nothing was looked for, so this says nothing about your practice — it is a gap in Meherr, not in your record.`,
        ``,
      ].join("\n"),
    );
  });
});
