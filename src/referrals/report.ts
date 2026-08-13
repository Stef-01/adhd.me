// W96: leakage reporting for the practice.
//
// The number on this page is uncomfortable by nature — it says how many of a practice's own
// referrals went nowhere. Getting the framing wrong turns a useful operational report into an
// accusation, so three rules shape it:
//
//   1. IT REPORTS THE RECORD, NOT THE PEOPLE. Every stage line describes what is or is not on
//      file. "Nothing has come back from the service" is true; "the patient did not attend" is
//      a guess we are not entitled to make (W92/W93).
//   2. IT STATES HOW MUCH IT DOES NOT KNOW. Barrier coverage is reported next to the barrier
//      chart, because four bars over 6% of cases is not a finding, and a reader cannot tell
//      the difference from the bars alone (W94).
//   3. IT NEVER RANKS PATIENTS. There is no "most at risk" list, no priority order and no
//      per-patient row. The unit of the report is the practice's process, because a ranked
//      list of patients derived from referral records is clinical triage by another name (G7).
//
// The report is built as a structured object first and rendered from it, so the markdown and
// any later surface cannot drift — the W20 pattern.

import type { PracticeId } from "@/domain/types";
import {
  type BarrierRecord,
  type BarrierTally,
  BARRIER_COPY,
  coverage,
  tallyBarriers,
} from "./barriers";
import { STAGE_COPY, type LeakageStage, type LeakageSummary } from "./leakage";

export interface LeakageReport {
  practiceId: PracticeId;
  windowLabel: string;
  totalReferrals: number;
  leaked: number;
  /** Stage counts, worst-stuck first, with the completed/withdrawn tail last. */
  stages: Array<{ stage: LeakageStage; count: number; copy: string }>;
  barriers: BarrierTally[];
  barrierCoverage: { withBarrier: number; total: number; share: number };
}

/** Stuck stages first — they are what the practice can act on. */
const STAGE_ORDER: LeakageStage[] = [
  "written_no_appointment",
  "appointment_lost",
  "attended_no_completion",
  "completed",
  "withdrawn",
  "not_written",
];

export function buildLeakageReport(
  practiceId: PracticeId,
  windowLabel: string,
  leakage: LeakageSummary,
  barriers: readonly BarrierRecord[],
): LeakageReport {
  const leakedIds = leakage.timelines.filter((t) => t.leaked).map((t) => t.referralId);

  return {
    practiceId,
    windowLabel,
    totalReferrals: leakage.timelines.length,
    leaked: leakage.leaked,
    stages: STAGE_ORDER.filter((stage) => leakage.byStage[stage] > 0).map((stage) => ({
      stage,
      count: leakage.byStage[stage],
      copy: STAGE_COPY[stage],
    })),
    barriers: tallyBarriers(barriers, practiceId),
    barrierCoverage: coverage(barriers, practiceId, leakedIds),
  };
}

const pct = (share: number) => `${Math.round(share * 100)}%`;

export function renderLeakageReport(report: LeakageReport): string {
  if (report.totalReferrals === 0) {
    return `# Referral follow-through — ${report.windowLabel}\n\nNo referrals were recorded in this period.\n`;
  }

  const lines = [
    `# Referral follow-through — ${report.windowLabel}`,
    ``,
    `${report.leaked} of ${report.totalReferrals} referrals have no completion recorded.`,
    ``,
    `This describes what is on file, not what patients did. A letter that never arrived and`,
    `an appointment that was never made look the same in the record, and this report does not`,
    `guess between them.`,
    ``,
    `## Where they stopped`,
    ``,
    `| Stage | Referrals | What that means |`,
    `|---|---|---|`,
    ...report.stages.map((s) => `| ${s.stage.replace(/_/g, " ")} | ${s.count} | ${s.copy} |`),
    ``,
  ];

  if (report.barriers.length === 0) {
    lines.push(
      `## Reasons`,
      ``,
      `No reasons have been recorded against these referrals. Reasons are only ever recorded`,
      `when someone tells the practice — nothing here is inferred from a patient's details.`,
      ``,
    );
  } else {
    lines.push(
      `## Reasons people gave`,
      ``,
      `| Reason | Referrals |`,
      `|---|---|`,
      ...report.barriers.map((b) => `| ${BARRIER_COPY[b.code]} | ${b.count} |`),
      ``,
      `Recorded for ${report.barrierCoverage.withBarrier} of ${report.barrierCoverage.total} ` +
        `referrals with no completion (${pct(report.barrierCoverage.share)}). The rest have no ` +
        `reason on file — that is unknown, not "no reason". Nothing here is inferred from a ` +
        `patient's details.`,
      ``,
    );
  }

  lines.push(
    `This report is about the practice's follow-through process. It deliberately does not rank`,
    `or list patients.`,
    ``,
  );

  return lines.join("\n");
}
