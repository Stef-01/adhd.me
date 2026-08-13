// W76 verify gate: a golden register section. The whole rendered markdown is asserted, so
// a wording or arithmetic change shows up as a golden diff rather than as a passing test.

import { describe, expect, it } from "vitest";
import type { ConditionCode } from "@/domain/types";
import type { RegisterAnalytics } from "@/registers/analytics";
import type { ConditionAttributionReport } from "@/registers/attribution";
import { ATTRIBUTION_VERSION } from "@/engine/attribution";
import { renderRegisterSection } from "./registers-section";

const DIABETES = "cond_diabetes" as ConditionCode;
const CKD = "cond_ckd" as ConditionCode;

const closure: RegisterAnalytics = {
  conditions: [
    {
      conditionCode: DIABETES,
      invite: { gapsAtStart: 50, closed: 30, closureRate: 0.6 },
      holdout: { gapsAtStart: 30, closed: 9, closureRate: 0.3 },
      differencePoints: 30,
      withheld: null,
    },
    {
      conditionCode: CKD,
      invite: { gapsAtStart: 24, closed: 9, closureRate: 0.375 },
      holdout: { gapsAtStart: 8, closed: 2, closureRate: 0.25 },
      differencePoints: null,
      withheld: "cohort_too_small",
    },
  ],
  ambiguousClosures: 3,
  ambiguousGapClosures: 4,
};

function armCount(patients: number, attended: number) {
  return { patients, attended, attendedPer1000: (attended / patients) * 1000 };
}

const attribution: ConditionAttributionReport = {
  window: { fromIso: "2026-01-01", toIso: "2026-06-30" },
  conditions: [
    {
      version: ATTRIBUTION_VERSION,
      conditionCode: DIABETES,
      cohort: {
        version: ATTRIBUTION_VERSION,
        window: { fromIso: "2026-01-01", toIso: "2026-06-30" },
        inviteArm: armCount(60, 30),
        holdoutArm: armCount(40, 10),
        incrementalPer1000: 250,
        incrementalAttended: 15,
        naiveGeneratedAttended: 12,
      },
      claim: { incrementalPer1000: 250, incrementalAttended: 15 },
      withheld: null,
    },
    {
      version: ATTRIBUTION_VERSION,
      conditionCode: CKD,
      cohort: {
        version: ATTRIBUTION_VERSION,
        window: { fromIso: "2026-01-01", toIso: "2026-06-30" },
        inviteArm: armCount(40, 12),
        holdoutArm: armCount(6, 1),
        incrementalPer1000: 133.3,
        incrementalAttended: 5,
        naiveGeneratedAttended: 4,
      },
      claim: null,
      withheld: "cohort_too_small",
    },
  ],
  overlapCount: 7,
};

const NAMES = { [DIABETES]: "Diabetes", [CKD]: "Kidney health" };

const GOLDEN = `## Registers

Closure compares each register's invite arm with its own holdout arm. The invite arm's rate on
its own is not evidence: most gaps close anyway, so only the difference between the arms says
anything about Meherr.

| Register | Invite closed | Holdout closed | Difference |
|---|---|---|---|
| Diabetes | 30/50 (60%) | 9/30 (30%) | +30.0 pts |
| Kidney health | 9/24 (38%) | 2/8 (25%) | This register is too small to measure reliably — it needs at least 30 patients in each group. |

4 of the closures above were counted from a visit that could not be tied to one register, so they count toward every register that patient is on.

### Incremental appointments by register

| Register | Invite patients | Holdout patients | Incremental |
|---|---|---|---|
| Diabetes | 60 | 40 | 15 appointments (250.0 / 1,000) |
| Kidney health | 40 | 6 | This register is too small to measure reliably — it needs at least 30 patients in each group. |

7 patients are on more than one register and are counted in each. **These rows do not add up to the practice total** — that figure is in the Incrementality section above.
`;

describe("W76 register section — golden", () => {
  it("renders the golden report exactly", () => {
    expect(renderRegisterSection({ closure, attribution, conditionNames: NAMES })).toBe(GOLDEN);
  });

  it("prints a reason where a figure is withheld, never a bare dash", () => {
    const output = renderRegisterSection({ closure, attribution, conditionNames: NAMES });
    // The withheld CKD rows must not carry the arithmetic that was withheld.
    expect(output).not.toContain("133.3");
    expect(output).not.toContain("+12.5 pts");
    expect(output).toContain("too small to measure reliably");
  });

  it("says outright that cohort rows do not sum to the practice total", () => {
    const output = renderRegisterSection({ closure, attribution, conditionNames: NAMES });
    expect(output).toContain("do not add up to the practice total");
  });

  it("discloses closures that could not be tied to one register", () => {
    const output = renderRegisterSection({ closure, attribution, conditionNames: NAMES });
    expect(output).toContain("could not be tied to one register");
  });

  it("omits the overlap and ambiguity notes when there is nothing to disclose", () => {
    const clean = renderRegisterSection({
      closure: { ...closure, ambiguousClosures: 0, ambiguousGapClosures: 0 },
      attribution: { ...attribution, overlapCount: 0 },
      conditionNames: NAMES,
    });
    expect(clean).not.toContain("could not be tied");
    expect(clean).not.toContain("do not add up");
  });

  it("falls back to the condition code when no display name is supplied", () => {
    const output = renderRegisterSection({ closure, attribution });
    expect(output).toContain("cond_diabetes");
  });

  it("handles a practice with no registers without pretending there is data", () => {
    const output = renderRegisterSection({
      closure: { conditions: [], ambiguousClosures: 0, ambiguousGapClosures: 0 },
      attribution: { window: attribution.window, conditions: [], overlapCount: 0 },
    });
    expect(output).toContain("No registers are active.");
  });
});
