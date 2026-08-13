// W141: referral analytics — process, never people.
//
// W96 built the leakage report and drew the line this unit inherits: the report is about the
// practice's follow-through PROCESS, and it deliberately does not rank or list patients. This
// takes that further, because a referral rail has a second population W96 did not have to think
// about — the clinicians on both sides — and a rail is exactly where somebody would want to
// know which of them answers fastest.
//
// So there are two absences here, and they are the unit rather than caveats on it:
//
//   NO PATIENT APPEARS, AT ALL. Not ranked, not listed, not counted in a way that identifies
//   one. The report's rows are STAGES and REASONS; a patient is a unit of arithmetic and never
//   a subject. W96's rule, carried through.
//
//   NO CLINICIAN OR PRACTICE IS SCORED. This is the new one. "Which practice answers referrals
//   fastest" is a metric that reads as neutral and functions as a league table, and the first
//   time it is quoted at somebody it becomes a reason to accept referrals they should have
//   declined. There is no per-clinician and no per-receiving-practice breakdown, and a test
//   asserts the report object has no field that could hold one.
//
// What it DOES measure is the process: where referrals stop, how long they sit, and how much of
// the picture is actually known. The last of those is the one W115 argued for and it applies
// again — a report that shows only what it can see implies the rest is fine.

import { acceptanceStatus, type AcceptanceAct, type AcceptanceState } from "./acceptance";
import type { ReferralDocument } from "./document";
import { detectLeakage, type LeakageStage, type ReferralEvent } from "./leakage";
import type { PracticeId } from "@/domain/types";

export interface StageCount {
  stage: LeakageStage;
  count: number;
}

export interface AcceptanceCount {
  state: AcceptanceState | "unknown";
  count: number;
}

export interface ReferralAnalytics {
  practiceId: PracticeId;
  asOf: string;
  /** Referrals this practice SENT. The only population it can report on honestly. */
  sentCount: number;
  byStage: StageCount[];
  byAcceptance: AcceptanceCount[];
  /**
   * How much of the picture is known. The number W115 argued for: a report showing only what it
   * can see implies the rest is fine.
   */
  coverage: {
    withNoAcceptanceRecord: number;
    withNoChainEvents: number;
  };
  caveats: string[];
}

function tallyStages(counts: Map<LeakageStage, number>): StageCount[] {
  return [...counts.entries()]
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count || a.stage.localeCompare(b.stage));
}

export function buildReferralAnalytics(
  practiceId: PracticeId,
  asOf: string,
  documents: readonly ReferralDocument[],
  events: readonly ReferralEvent[],
  acts: readonly AcceptanceAct[],
): ReferralAnalytics {
  const sent = documents.filter((document) => document.fromPracticeId === practiceId);
  const leakage = detectLeakage(events, practiceId);

  const stageCounts = new Map<LeakageStage, number>();
  const acceptanceCounts = new Map<AcceptanceState | "unknown", number>();
  let withNoAcceptanceRecord = 0;
  let withNoChainEvents = 0;

  for (const document of sent) {
    const timeline = leakage.timelines.find((t) => t.referralId === document.referralId);
    const stage: LeakageStage = timeline?.stage ?? "not_written";
    if (!timeline) withNoChainEvents++;
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);

    const mineActs = acts.filter((act) => act.referralId === document.referralId);
    // W135's rule: nothing recorded is `unknown`, a REPORTED value rather than a missing one.
    const state: AcceptanceState | "unknown" =
      mineActs.length === 0 ? "unknown" : acceptanceStatus(acts, document.referralId).state;
    if (mineActs.length === 0) withNoAcceptanceRecord++;
    acceptanceCounts.set(state, (acceptanceCounts.get(state) ?? 0) + 1);
  }

  const caveats = [
    "This report is about the practice's referral PROCESS. It does not rank or list patients, and no patient appears in it.",
    "No clinician or receiving practice is scored. 'Which practice answers fastest' reads as neutral and works as a league table, and the first time it is quoted at somebody it becomes a reason to accept a referral they should have declined.",
    "Only referrals this practice SENT are counted. A referral sent here is the other practice's process to report on, not this one's.",
  ];
  if (withNoAcceptanceRecord > 0) {
    caveats.push(
      `${withNoAcceptanceRecord} of ${sent.length} referrals have NO acceptance record at all. They are not 'unanswered' — nobody wrote anything down, which is a different problem and a different fix.`,
    );
  }
  if (withNoChainEvents > 0) {
    caveats.push(
      `${withNoChainEvents} of ${sent.length} referrals have no chain events recorded, so their stage is unknown rather than 'not written'.`,
    );
  }

  return {
    practiceId,
    asOf,
    sentCount: sent.length,
    byStage: tallyStages(stageCounts),
    byAcceptance: [...acceptanceCounts.entries()]
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state)),
    coverage: { withNoAcceptanceRecord, withNoChainEvents },
    caveats,
  };
}

const STAGE_LABEL: Record<LeakageStage, string> = {
  not_written: "No referral recorded",
  written_no_appointment: "Written, nothing booked",
  appointment_lost: "Booked then cancelled",
  attended_no_completion: "Seen, nothing came back",
  completed: "Finished",
  withdrawn: "Withdrawn",
};

const ACCEPTANCE_LABEL: Record<AcceptanceState | "unknown", string> = {
  not_sent: "Not sent",
  awaiting_acceptance: "Waiting for an answer",
  accepted: "Accepted",
  declined: "Declined",
  handed_back: "Handed back",
  unknown: "Nothing recorded",
};

export function renderReferralAnalytics(report: ReferralAnalytics): string {
  const share = (n: number) =>
    report.sentCount === 0 ? "—" : `${Math.round((n / report.sentCount) * 100)}%`;

  return [
    `# Referral process — ${report.practiceId}`,
    ``,
    `As at ${report.asOf}. ${report.sentCount} referral(s) sent by this practice.`,
    ``,
    `## Where referrals stop`,
    ``,
    `| Stage | Referrals | Share |`,
    `|---|---|---|`,
    ...report.byStage.map((row) => `| ${STAGE_LABEL[row.stage]} | ${row.count} | ${share(row.count)} |`),
    ``,
    `## Whether the other practice answered`,
    ``,
    `| Answer | Referrals | Share |`,
    `|---|---|---|`,
    ...report.byAcceptance.map((row) => `| ${ACCEPTANCE_LABEL[row.state]} | ${row.count} | ${share(row.count)} |`),
    ``,
    `## What this report does not say`,
    ``,
    ...report.caveats.map((c) => `- ${c}`),
    ``,
  ].join("\n");
}
