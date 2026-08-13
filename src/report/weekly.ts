// W20: weekly practice report generator — the document a practice manager actually reads.
// Three sections, in the order the venture brief argues them: incrementality (the honest
// number), revenue estimate (incremental visits only — never the naive count), guardrails
// (what would stop the service). Content is built as a structured object first so the
// markdown and docx renderers can never drift from each other, and golden tests pin both.

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { renderRegisterSection, type RegisterSectionInput } from "./registers-section";
import { evaluateGuardrails, metricsFromSim, DEFAULT_GUARDRAILS, type Complaint, type GuardrailAlert, type GuardrailConfig } from "@/guardrails/monitors";
import { buildDashboardData } from "@/sim/dashboard-data";
import type { SimResult } from "@/sim/harness";

// W107: `ReportOptions`/`DEFAULT_REPORT_OPTIONS` moved to ./options so the console can read
// them without importing this module, which pulls in docx. Re-exported here because callers
// that already render a document want them in the same place.
import { DEFAULT_REPORT_OPTIONS, type ReportOptions } from "./options";
export { DEFAULT_REPORT_OPTIONS, type ReportOptions };

export interface WeeklyReport {
  practiceName: string;
  week: number;
  weekStartIso: string;
  weekly: { invitePer1000: number; holdoutPer1000: number; incrementalPer1000: number | null };
  cumulative: {
    incrementalAttended: number | null;
    incrementalPer1000: number | null;
    naiveGeneratedAttended: number;
    invitePatients: number;
    holdoutPatients: number;
  };
  revenue: {
    perVisitAssumptionAud: number;
    incrementalEstimateAud: number | null;
    naiveWouldClaimAud: number;
  };
  loop: { invitationsSent: number; booked: number; optedOut: number; dnaGenerated: number };
  alerts: GuardrailAlert[];
}

/**
 * Shape the FINAL week of the supplied run into the report object. The report's
 * "this week" is always the last simulated week, and every cumulative figure is
 * the run so far — the live cadence generates each Monday's report from a data
 * snapshot that ends that week, so a run and a report week are the same thing.
 * (Retro-reporting an interior week from a longer run would silently mix that
 * week's rates with end-of-run totals; refuse the shape instead of lying.)
 */
export function buildWeeklyReport(result: SimResult, options: ReportOptions): WeeklyReport {
  const week = result.totals.weeksSimulated;
  const dashboard = buildDashboardData(result);
  const point = dashboard.weekly[week - 1];
  if (!point) throw new Error("cannot report on a run with no completed weeks");
  const attr = result.attribution;
  const incrementalEstimateAud =
    attr.incrementalAttended === null
      ? null
      : Math.round(attr.incrementalAttended * options.revenuePerAttendedVisit);
  return {
    practiceName: result.practice.name,
    week,
    weekStartIso: point.weekStartIso,
    weekly: {
      invitePer1000: point.invitePer1000,
      holdoutPer1000: point.holdoutPer1000,
      incrementalPer1000: point.incrementalPer1000,
    },
    cumulative: {
      incrementalAttended: attr.incrementalAttended,
      incrementalPer1000: attr.incrementalPer1000,
      naiveGeneratedAttended: attr.naiveGeneratedAttended,
      invitePatients: attr.inviteArm.patients,
      holdoutPatients: attr.holdoutArm.patients,
    },
    revenue: {
      perVisitAssumptionAud: options.revenuePerAttendedVisit,
      incrementalEstimateAud,
      naiveWouldClaimAud: Math.round(
        attr.naiveGeneratedAttended * options.revenuePerAttendedVisit,
      ),
    },
    loop: {
      invitationsSent: result.totals.invitationsSent,
      booked: result.totals.booked,
      optedOut: result.totals.optedOut,
      dnaGenerated: result.totals.dnaGenerated,
    },
    alerts: evaluateGuardrails(metricsFromSim(result, options.complaints), options.guardrails),
  };
}

const fmt = (n: number | null, digits = 1) => (n === null ? "n/a" : n.toFixed(digits));
const aud = (n: number | null) => (n === null ? "n/a" : `$${n.toLocaleString("en-AU")} AUD`);

/**
 * W76: the register section is optional and appended, never interleaved — a practice with
 * no registers gets byte-identical output to the v1 report, so the W20 golden stays valid.
 */
/**
 * Why the naive count is not the reported figure.
 *
 * The usual reason is displacement — part of the generated attendance would have happened
 * anyway — and the copy said exactly that. But the incremental figure is a holdout-based
 * ESTIMATE, and an estimate can land ABOVE the naive count in a given window. When it does,
 * "part of it is displaced organic attendance" is a non-sequitur attached to a smaller
 * number, and a practice manager reading it would rightly be confused.
 *
 * So the reason given matches the direction actually observed. Neither branch changes which
 * number is reported: the holdout estimate is the answer either way.
 */
function naiveNote(r: WeeklyReport): string {
  const naive = r.revenue.naiveWouldClaimAud;
  const estimate = r.revenue.incrementalEstimateAud;
  if (estimate === null) return "";
  if (naive > estimate) return ", because part of it is displaced organic attendance";
  return (
    ", because it counts bookings rather than measuring them — in this window the holdout" +
    " comparison came out higher, which a raw count cannot show either way"
  );
}

export function renderWeeklyReportMarkdown(
  r: WeeklyReport,
  registers?: RegisterSectionInput,
): string {
  const alerts =
    r.alerts.length === 0
      ? "All guardrails clear: opt-out rate, generated-booking DNA, and complaints are all inside thresholds."
      : r.alerts.map((a) => `- **${a.severity.toUpperCase()}** ${a.message}`).join("\n");
  return `# ${r.practiceName} — weekly report, week ${r.week}

Week beginning ${r.weekStartIso}. Synthetic-data phase: every figure below comes from the
simulated practice; the measurement design (holdout arm, intention-to-treat) is the one the
live product uses.

## Incrementality

| Measure | This week | Cumulative |
|---|---|---|
| Invite arm, attended / 1,000 | ${fmt(r.weekly.invitePer1000)} | — |
| Holdout arm, attended / 1,000 | ${fmt(r.weekly.holdoutPer1000)} | — |
| Incremental / 1,000 | ${fmt(r.weekly.incrementalPer1000)} | ${fmt(r.cumulative.incrementalPer1000)} |
| Incremental attended appointments | — | ${fmt(r.cumulative.incrementalAttended)} |

Arms: ${r.cumulative.invitePatients.toLocaleString("en-AU")} invite / ${r.cumulative.holdoutPatients.toLocaleString("en-AU")} holdout patients.
Definitions: docs/ATTRIBUTION.md v1 — what counts, what never counts.

## Revenue estimate

**${aud(r.revenue.incrementalEstimateAud)}** cumulative, at the practice's configured
${aud(r.revenue.perVisitAssumptionAud)} average billing per attended visit, applied to
incremental visits only.

Counting every invitation-generated booking (${r.cumulative.naiveGeneratedAttended} visits)
would claim ${aud(r.revenue.naiveWouldClaimAud)} — Meherr does not report that number as
impact${naiveNote(r)}.

## Guardrails

${alerts}

Loop this period: ${r.loop.invitationsSent.toLocaleString("en-AU")} invitations sent, ${r.loop.booked} booked, ${r.loop.optedOut} opt-outs, ${r.loop.dnaGenerated} DNA on generated bookings.
${registers ? `\n${renderRegisterSection(registers)}` : ""}`;
}

/** The same content as a .docx for the practice inbox. */
export async function renderWeeklyReportDocx(r: WeeklyReport): Promise<Buffer> {
  const h = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
    new Paragraph({ heading: level, children: [new TextRun(text)] });
  const p = (text: string, bold = false) =>
    new Paragraph({ children: [new TextRun({ text, bold })] });
  const row = (cells: string[], header = false) =>
    new TableRow({
      children: cells.map(
        (text) =>
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text, bold: header })] })],
          }),
      ),
    });

  const doc = new Document({
    creator: "Meherr",
    title: `${r.practiceName} weekly report — week ${r.week}`,
    sections: [
      {
        children: [
          h(`${r.practiceName} — weekly report, week ${r.week}`, HeadingLevel.HEADING_1),
          p(`Week beginning ${r.weekStartIso}. Synthetic-data phase.`),
          h("Incrementality", HeadingLevel.HEADING_2),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              row(["Measure", "This week", "Cumulative"], true),
              row(["Invite arm, attended / 1,000", fmt(r.weekly.invitePer1000), "—"]),
              row(["Holdout arm, attended / 1,000", fmt(r.weekly.holdoutPer1000), "—"]),
              row([
                "Incremental / 1,000",
                fmt(r.weekly.incrementalPer1000),
                fmt(r.cumulative.incrementalPer1000),
              ]),
              row([
                "Incremental attended appointments",
                "—",
                fmt(r.cumulative.incrementalAttended),
              ]),
            ],
          }),
          p(
            `Arms: ${r.cumulative.invitePatients.toLocaleString("en-AU")} invite / ` +
              `${r.cumulative.holdoutPatients.toLocaleString("en-AU")} holdout patients. ` +
              "Definitions: ATTRIBUTION v1.",
          ),
          h("Revenue estimate", HeadingLevel.HEADING_2),
          p(
            `${aud(r.revenue.incrementalEstimateAud)} cumulative, at ${aud(r.revenue.perVisitAssumptionAud)} ` +
              "average billing per attended visit, applied to incremental visits only.",
            true,
          ),
          p(
            `Counting every generated booking (${r.cumulative.naiveGeneratedAttended} visits) would claim ` +
              `${aud(r.revenue.naiveWouldClaimAud)} — not reported as impact${naiveNote(r)}.`,
          ),
          h("Guardrails", HeadingLevel.HEADING_2),
          ...(r.alerts.length === 0
            ? [p("All guardrails clear: opt-outs, generated-booking DNA and complaints inside thresholds.")]
            : r.alerts.map((a) => p(`${a.severity.toUpperCase()}: ${a.message}`))),
          p(
            `Loop this period: ${r.loop.invitationsSent.toLocaleString("en-AU")} invitations sent, ` +
              `${r.loop.booked} booked, ${r.loop.optedOut} opt-outs, ${r.loop.dnaGenerated} DNA on generated bookings.`,
          ),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
