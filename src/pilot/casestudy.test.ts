// W45 verify gate: golden output — plus the in-code de-identification and
// compliance guarantees the golden alone can't prove.

import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import {
  assertPublishable,
  CaseStudyComplianceError,
  renderCaseStudy,
  type CaseStudyContext,
} from "./casestudy";
import { buildPilotReport, syntheticOutcomeRecords } from "./report";

const REPORTS_DIR = path.resolve(__dirname, "../../reports");

const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 8 });
const report = buildPilotReport(result, syntheticOutcomeRecords(result, 45));
const CONTEXT: CaseStudyContext = {
  practiceDescriptor: "a 10-GP metropolitan general practice",
  identifyingStrings: ["Synthetic Family Practice", "Dr Synthetic"],
  syntheticData: true,
};

describe("W45 case-study generator", () => {
  it("matches the committed golden byte for byte", () => {
    const goldenPath = path.join(REPORTS_DIR, "case-study-w45.md");
    const rendered = renderCaseStudy(report, CONTEXT);
    if (process.env.UPDATE_GOLDEN) {
      mkdirSync(REPORTS_DIR, { recursive: true });
      writeFileSync(goldenPath, rendered);
    }
    expect(rendered).toBe(readFileSync(goldenPath, "utf8"));
  });

  it("the golden carries the honest-numbers structure and the synthetic marker", () => {
    const text = renderCaseStudy(report, CONTEXT);
    expect(text).toContain("incremental attended appointments per 1,000 patients in the messaged\n  group");
    expect(text).toContain("would have claimed");
    expect(text).toContain("Synthetic-data rehearsal");
    expect(text).toContain("makes no claims about anyone's health");
    expect(text).not.toContain("Synthetic Family Practice"); // de-identified
  });

  it("refuses output containing a declared identifying string", () => {
    expect(() =>
      renderCaseStudy(report, {
        ...CONTEXT,
        practiceDescriptor: "the Synthetic Family Practice team",
      }),
    ).toThrow(CaseStudyComplianceError);
  });

  it("refuses internal identifiers anywhere in the text", () => {
    expect(() => assertPublishable("visit by pat-123 went well", [])).toThrow(/internal identifier/);
    expect(() => assertPublishable("booked via inv-bf-apt-1-0", [])).toThrow(/internal identifier/);
  });

  it("refuses copy-compliance violations (linter is the gate, not editing)", () => {
    expect(() =>
      renderCaseStudy(report, { ...CONTEXT, practiceDescriptor: "the best specialist clinic" }),
    ).toThrow(/copy-compliance/);
    expect(() => assertPublishable("Patients love it — 5/5 stars", [])).toThrow(/copy-compliance/);
  });

  it("refuses to fabricate a case study without a holdout arm", () => {
    expect(() =>
      renderCaseStudy({ ...report, northStarIncrementalPer1000: null }, CONTEXT),
    ).toThrow(/no holdout/);
  });
});

describe("W100 Year-2 register section", () => {
  const REGISTERS = {
    registerCount: 2,
    membersAtStart: 240,
    gapsAtStart: 88,
    inviteClosureRate: 0.42,
    holdoutClosureRate: 0.31,
  };

  it("is omitted entirely when the pilot ran no registers", () => {
    const text = renderCaseStudy(report, CONTEXT);
    expect(text).not.toContain("Register-driven contact");
  });

  it("reports the DIFFERENCE between arms, never the messaged rate alone", () => {
    // A closure rate without a comparison is just "patients attended appointments", which
    // happens without any of this — the same rule W64 holds for the analytics it comes from.
    const text = renderCaseStudy(report, { ...CONTEXT, registers: REGISTERS });
    expect(text).toContain("Register-driven contact");
    expect(text).toContain("11.0 percentage points");
    expect(text).toContain("without the comparison group it would mean only that patients attended appointments");
  });

  it("claims nothing when the register had no comparison group", () => {
    const text = renderCaseStudy(report, {
      ...CONTEXT,
      registers: { ...REGISTERS, holdoutClosureRate: null },
    });
    expect(text).toContain("no effect on appointment completion is claimed");
    expect(text).not.toContain("percentage points");
  });

  it("never names a condition — there is no field to put one in", () => {
    // De-identification, not just lint: "a 10-GP metropolitan practice" is not identifying,
    // but the same practice plus a named register is a much smaller haystack.
    const text = renderCaseStudy(report, { ...CONTEXT, registers: REGISTERS });
    for (const banned of ["diabetes", "kidney", "ckd", "pcos", "cardiac", "mental health"]) {
      expect(text.toLowerCase(), `case study must not name "${banned}"`).not.toContain(banned);
    }
  });

  it("says the message itself was unchanged — registers pick WHO, not WHAT", () => {
    const text = renderCaseStudy(report, { ...CONTEXT, registers: REGISTERS });
    expect(text).toContain("carried no mention of any register");
  });

  it("still passes the full W45 gate with the section present", () => {
    // De-identification, internal-id and compliance-lint checks all still run over the
    // longer document — assertPublishable throws rather than rendering a bad one.
    expect(() => renderCaseStudy(report, { ...CONTEXT, registers: REGISTERS })).not.toThrow();
  });

  it("describes reviews as due by the practice's schedule, not as clinically needed", () => {
    const text = renderCaseStudy(report, { ...CONTEXT, registers: REGISTERS });
    expect(text).toContain("due by the practice's own schedule");
    expect(text.toLowerCase()).not.toContain("overdue");
  });
});
