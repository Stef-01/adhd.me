// W76: practice reporting v2 — gap closure and condition incrementality in the weekly report.
//
// Rendered as a SEPARATE, optional section rather than folded into the v1 report body, so a
// practice with no registers gets a byte-identical report to the one W20 shipped and the
// existing golden stays meaningful. Same posture as the W42 chart parameterisation.
//
// The section's job is to carry two honesty rules from W64 and W72 all the way to the page,
// because this is where they are easiest to lose:
//
//   * A withheld figure is printed as a REASON, never as a dash the reader fills in with an
//     assumption, and never as the raw arithmetic that was withheld.
//   * Cohorts overlap, so their rows do not add up to the practice total. Said in the
//     report, not just in the code, because a manager with a calculator will try.

import type { RegisterAnalytics } from "@/registers/analytics";
import {
  explainWithheld,
  type ConditionAttributionReport,
} from "@/registers/attribution";

export interface RegisterSectionInput {
  closure: RegisterAnalytics;
  attribution: ConditionAttributionReport;
  /** Practice-facing names for condition codes; the code is used if absent. */
  conditionNames?: Record<string, string>;
}

const pct = (rate: number) => `${Math.round(rate * 100)}%`;
const points = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)} pts`;

export function renderRegisterSection(input: RegisterSectionInput): string {
  const name = (code: string) => input.conditionNames?.[code] ?? code;

  const closureRows = input.closure.conditions.map((c) => {
    const difference =
      c.differencePoints === null
        ? explainWithheld(c.withheld!)
        : points(c.differencePoints);
    return `| ${name(c.conditionCode)} | ${c.invite.closed}/${c.invite.gapsAtStart} (${pct(c.invite.closureRate)}) | ${c.holdout.closed}/${c.holdout.gapsAtStart} (${pct(c.holdout.closureRate)}) | ${difference} |`;
  });

  const attributionRows = input.attribution.conditions.map((c) => {
    const claim =
      c.claim === null
        ? explainWithheld(c.withheld!)
        : `${c.claim.incrementalAttended} appointments (${c.claim.incrementalPer1000.toFixed(1)} / 1,000)`;
    return `| ${name(c.conditionCode)} | ${c.cohort.inviteArm.patients} | ${c.cohort.holdoutArm.patients} | ${claim} |`;
  });

  // W65 split this into events vs gaps. The sentence describes rows in the table above,
  // which are CLOSED GAPS, so it must use the gap count — the event count would understate
  // it whenever one visit closed gaps on several registers.
  const ambiguity =
    input.closure.ambiguousGapClosures > 0
      ? `\n${input.closure.ambiguousGapClosures} of the closures above were counted from a visit that could not be tied to one register, so they count toward every register that patient is on.\n`
      : "";

  const overlap =
    input.attribution.overlapCount > 0
      ? `\n${input.attribution.overlapCount} patients are on more than one register and are counted in each. **These rows do not add up to the practice total** — that figure is in the Incrementality section above.\n`
      : "";

  return `## Registers

Closure compares each register's invite arm with its own holdout arm. The invite arm's rate on
its own is not evidence: most gaps close anyway, so only the difference between the arms says
anything about Meherr.

| Register | Invite closed | Holdout closed | Difference |
|---|---|---|---|
${closureRows.join("\n") || "| — | — | — | No registers are active. |"}
${ambiguity}
### Incremental appointments by register

| Register | Invite patients | Holdout patients | Incremental |
|---|---|---|---|
${attributionRows.join("\n") || "| — | — | — | No registers are active. |"}
${overlap}`;
}
