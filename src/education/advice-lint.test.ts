// W150 verify gate: "a copy linter bans recommendation language on every education surface."
//
// "Every surface" is the half that can rot, so it is checked against the TREE: the declared copy
// modules must match `src/education/`, and every string those modules actually emit is run
// through the linter. A linter remembered at each call site covers whatever somebody remembered.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGE_BANNED_RULES } from "@/messaging/templates";
import {
  ADVICE_RULE_COPY,
  ADVICE_RULES,
  EDUCATION_COPY_MODULES,
  lintEducationCopy,
  renderCompliantEducationCopy,
  renderUpdateNotice,
} from "./advice-lint";
import { EDUCATION_CONSOLE_COPY } from "./console-copy";
import { curate, describeCuration, CURATION_REJECTION_COPY } from "./curation";
import { describeTriggers, triggersFor } from "./triggers";
import { CPD_REJECTION_COPY, recordCpdEntry, renderCpdExport, trailFor } from "./cpd";
import { PROVENANCE_REFUSAL_COPY } from "./provenance";
import type { RecordedFact } from "@/pathways/evaluation";

const DIR = path.resolve(__dirname);
const rulesFor = (text: string) => lintEducationCopy(text).map((v) => v.rule);

describe("W150 the linter reaches every education surface", () => {
  it("declares every module in src/education/ that emits operator-facing copy", () => {
    // The W102/W140 pattern. A new education module with a describe* or *_COPY export fails
    // this until it is declared, so coverage is a property of the tree.
    const emitters = readdirSync(DIR)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .filter((f) => /export (const \w*_COPY|function describe|function render)/.test(readFileSync(path.join(DIR, f), "utf8")))
      .map((f) => `src/education/${f}`)
      .sort();
    expect(emitters.length).toBeGreaterThan(2);
    expect([...EDUCATION_COPY_MODULES].sort()).toEqual(emitters);
  });

  it("passes every string W145's curation actually emits", () => {
    const result = curate(
      [
        {
          itemId: "item-a",
          conditionCode: "placeholder_register_a",
          title: "Placeholder material title.",
          sourceRef: "src-1",
          relevantFactCodes: ["fact_x"],
        },
        {
          itemId: "item-b",
          conditionCode: "placeholder_register_b",
          title: "Other placeholder title.",
          sourceRef: "src-2",
          relevantFactCodes: [],
        },
      ],
      { practiceConditionCodes: ["placeholder_register_a"], recordedFactCodes: ["fact_x"] },
    );
    for (const line of [result.orderingBasis, ...describeCuration(result)]) {
      expect(lintEducationCopy(line), line).toEqual([]);
    }
    for (const copy of Object.values(CURATION_REJECTION_COPY)) {
      expect(lintEducationCopy(copy), copy).toEqual([]);
    }
  });

  it("passes every string W148's triggers actually emit", () => {
    const fact: RecordedFact = {
      code: "fact_a", state: "recorded_present", source: "pms_condition_flag",
      recordedAt: "2026-02-01", recordedBy: "clin-1",
    };
    for (const outcome of [
      triggersFor([fact], ["placeholder_register_a"]),
      triggersFor([], ["placeholder_register_a"], [
        { conditionCode: "placeholder_register_a", factCode: "fact_a", requires: "recorded_absent", rationale: "Placeholder." },
      ]),
    ]) {
      for (const line of describeTriggers(outcome)) {
        expect(lintEducationCopy(line), line).toEqual([]);
      }
    }
  });

  it("passes every string W149's CPD export actually emits", () => {
    const built = recordCpdEntry(
      {
        entryId: "e1", practiceId: "prac-1", clinicianId: "clin-1", kind: "opened", itemId: "item-1",
        sourceRef: "src-1", itemTitle: "Placeholder material title.", at: "2026-03-01",
      },
      [],
    );
    if (!built.ok) throw new Error("fixture rejected");
    const rendered = renderCpdExport(trailFor([built.entry], "prac-1", "clin-1"), "2026-08-11");
    expect(lintEducationCopy(rendered)).toEqual([]);
    for (const copy of Object.values(CPD_REJECTION_COPY)) {
      expect(lintEducationCopy(copy), copy).toEqual([]);
    }
  });

  it("passes every fixed sentence W151's console renders", () => {
    // The console's prose lives in src/education/ precisely so this loop can reach it. Copy
    // written straight into the page's JSX would be copy no linter sees.
    for (const copy of Object.values(EDUCATION_CONSOLE_COPY)) {
      expect(lintEducationCopy(copy), copy).toEqual([]);
    }
  });

  it("passes every refusal W152's provenance gate can render", () => {
    // Declared late: W152 landed with a *_COPY export and a `renderable` export and was not in
    // the list, which is exactly the omission the tree check exists to catch. It caught it.
    for (const copy of Object.values(PROVENANCE_REFUSAL_COPY)) {
      expect(lintEducationCopy(copy), copy).toEqual([]);
    }
  });

  it("passes the pre-consult notice this unit adds", () => {
    const notice = renderUpdateNotice({
      pathwayId: "path-1", fromVersionHash: "aaa", toVersionHash: "bbb",
      changedOn: "2026-03-03", changedBy: "editor@x.example", changeCount: 2,
    });
    expect(lintEducationCopy(notice)).toEqual([]);
    expect(notice).toContain("nothing about any patient");
  });
});

describe("W150 informs, never advises", () => {
  it("refuses a plain instruction to a clinician", () => {
    for (const text of [
      "You should review this patient against the new criteria.",
      "You need to check the updated exclusions.",
      "Please reassess anyone on this register.",
    ]) {
      expect(rulesFor(text), text).toContain("no-clinician-instruction");
    }
  });

  it("refuses the polite version, which is the one that gets written", () => {
    for (const text of [
      "Consider reviewing patients on this pathway.",
      "It is recommended that you re-check the criteria.",
      "You may wish to look at this before the consult.",
    ]) {
      expect(rulesFor(text), text).toContain("no-soft-recommendation");
    }
  });

  it("refuses a claim about what a patient needs, whoever it addresses", () => {
    for (const text of ["This patient needs a review.", "They should be seen again."]) {
      expect(rulesFor(text), text).toContain("no-patient-directed-claim");
    }
  });

  it("refuses action framing, which turns a notice into a task list", () => {
    for (const text of ["Action required.", "Next steps: re-check the register.", "Follow-up required."]) {
      expect(rulesFor(text), text).toContain("no-action-framing");
    }
  });

  it("accepts the informational form of the same fact", () => {
    // The pair that shows the rule is about who made the judgement, not about the subject.
    expect(lintEducationCopy("This pathway changed on 3 March. Two criteria differ from the version in force before it.")).toEqual([]);
    expect(rulesFor("You should review this pathway because it changed on 3 March.")).toContain(
      "no-clinician-instruction",
    );
  });

  it("throws rather than returning findings nobody reads", () => {
    expect(() => renderCompliantEducationCopy("Consider reviewing this.")).toThrow(
      /no-soft-recommendation/,
    );
  });
});

describe("W150 W6's rules are applied, not re-implemented", () => {
  it("catches a W6-only rule", () => {
    // "overdue" belongs to W6 and to no pattern here. If this module ever grew its own copy of
    // the vocabulary, the delegation would be what rotted.
    expect(rulesFor("These patients are overdue.")).toContain("no-overdue-framing");
    expect(MESSAGE_BANNED_RULES.length).toBeGreaterThan(0);
  });

  it("owns only the advice patterns", () => {
    // The rules this module adds must not overlap with the ones it delegates to; an overlap is
    // a copy waiting to drift.
    for (const rule of ADVICE_RULES) {
      expect(MESSAGE_BANNED_RULES, `${rule} duplicates a W6 rule`).not.toContain(rule);
    }
  });

  it("explains each of its own rules in terms of the harm", () => {
    for (const rule of ADVICE_RULES) {
      const copy = ADVICE_RULE_COPY[rule];
      expect(copy, rule).toBeTruthy();
      expect(copy!.length, rule).toBeGreaterThan(60);
    }
    expect(ADVICE_RULE_COPY["no-soft-recommendation"]).toContain(
      "softness does not change who made the judgement",
    );
  });
});

describe("W150 the pre-consult notice says nothing about a patient", () => {
  const notice = {
    pathwayId: "path-1", fromVersionHash: "aaa", toVersionHash: "bbb",
    changedOn: "2026-03-03", changedBy: "editor@x.example", changeCount: 2,
  };

  it("has no field for a patient", () => {
    expect(Object.keys(notice).sort()).toEqual([
      "changeCount", "changedBy", "changedOn", "fromVersionHash", "pathwayId", "toVersionHash",
    ]);
    for (const key of Object.keys(notice)) {
      expect(key).not.toMatch(/patient|case|subject|affected/i);
    }
  });

  it("states that the pathway changed and points elsewhere for what changed", () => {
    // Deliberately thin: W122 owns the diff, and a notice that summarised the change would be
    // this module writing about clinical content.
    const rendered = renderUpdateNotice(notice);
    expect(rendered).toContain("changed on 2026-03-03");
    expect(rendered).toContain("2 criterion change(s)");
    expect(rendered).toContain("full comparison is available");
  });
});
