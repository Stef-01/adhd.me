// W199: the report a practice can read about itself, before anybody else can read one.
//
// W196 shaped the figures, W197 decided what happens to the small ones. This assembles the
// document — and the first thing to settle is who it is for, because the obvious answer is the
// one proposed gate G9 forbids.
//
// NOTHING IS DISCLOSED HERE. G9 asks whether practice-identifiable data may go to a third-party
// organisation at all, and it is unratified. So this report has exactly one reader: the practice
// it is about, looking at its own data in its own console. That is not a disclosure — it is the
// same posture W183 took to profiles under G6 and the pathway registries under G5. The model may
// exist before the ruling; the sending may not, and W202/W203 are where sending lives.
//
// The practical consequence is that this module has no recipient parameter, no delivery, and no
// export-to-anywhere. A practice can read the document and copy it; what it cannot do is press a
// button here that puts it in front of a commissioner. A test asserts the absence, because an
// adapter that exists is one configuration change from disclosing — G1 and G3's shape.
//
// COVERAGE IS NOT A FOOTNOTE. W94 learned this on barriers and W96 put it beside the chart: a
// figure whose basis is invisible is read as a measurement of care. Here the reader may be a
// practice manager preparing for a conversation with a PHN, so the document has to make three
// things impossible to miss:
//
//   WHAT PERIOD IT COVERS, stated once at the top and repeated on every figure, because a figure
//   quoted out of the document loses the heading first.
//
//   WHAT EACH FIGURE WAS COUNTED OVER — the denominator W196 built in. "4" is an impression;
//   "4, counted over 12 recorded referrals" is a fact, and the difference is the entire argument
//   of that unit.
//
//   AND WHAT IS NOT IN IT. A report listing four figures reads as a description of the practice.
//   It is a description of four things the record happens to hold, and the kinds it does NOT
//   report are named — not as a disclaimer, but because a reader deciding what to ask about next
//   needs to know which silences are absences of measurement rather than absences of activity.
//
// THE ZERO PROBLEM, INHERITED AND NOT SOLVED HERE. W196 refuses to produce a figure over zero
// records rather than emitting 0, so a rail with nothing recorded is absent from this document
// rather than present with a zero. That is the safe direction and it has a cost: a reader cannot
// tell "not reported because nothing was recorded" from "not reported because we do not report
// it". So the document distinguishes them explicitly, which is the only reason the coverage
// section carries two lists instead of one.

import { ALL_FIGURE_KINDS, figure, type Figure, type FigureKind } from "./model";
import {
  renderSuppressedReport,
  suppressReport,
  type SuppressedReport,
} from "./suppression";

export interface ReportPeriod {
  fromIso: string;
  toIso: string;
}

export interface PracticeReport {
  practiceId: string;
  practiceName: string;
  period: ReportPeriod;
  /** The suppressed view — the only source of published figures (W197's brand). */
  disclosure: SuppressedReport;
  /** Kinds this report could carry and did not, with which kind of silence each is. */
  coverage: Coverage;
}

export interface Coverage {
  /** Kinds present in the document, published or named as withheld. */
  reported: FigureKind[];
  /**
   * Kinds this report TRIED to compute and found nothing recorded for.
   *
   * W196 refuses to emit a figure over zero records, so these are absent from the figures rather
   * than present as zeroes.
   */
  nothingRecorded: FigureKind[];
  /**
   * Kinds this product does not derive at all yet.
   *
   * W205 ADDED THIS LIST, because without it W199's two-list design was committing the exact
   * conflation it existed to prevent. `nothingRecorded` was "every kind the caller did not pass",
   * and nothing in the tree computes `register_membership` or `care_gaps_detected` — so every
   * live report told a practice "the record held nothing to count" about two figures nobody had
   * ever tried to count. That is a claim about the practice's rails made on the strength of a
   * gap in this product.
   */
  notComputed: FigureKind[];
}

export const KIND_LABELS: Record<FigureKind, string> = {
  referrals_written: "Referrals written",
  referrals_with_recorded_completion: "Referrals with a recorded completion",
  register_membership: "Register membership",
  care_gaps_detected: "Care gaps detected",
};

/**
 * Assemble the report.
 *
 * Takes figures already validated by W196 and passes them through W197's suppression, which is
 * the only way a publishable figure can be obtained. There is no path around it: this function
 * cannot emit a value that did not come out of `suppressReport`.
 *
 * NOTE WHAT IS ABSENT FROM THE SIGNATURE: no recipient, no destination, no send. See the header.
 */
export function buildPracticeReport(
  practiceId: string,
  practiceName: string,
  period: ReportPeriod,
  figures: readonly Figure[],
  /**
   * The kinds this caller ATTEMPTED to compute.
   *
   * Required, and required for the reason W205 found: without it the report cannot tell a kind
   * that came back empty from a kind nobody asked about, and it was reporting the second as the
   * first. Defaulting it would restore exactly the bug — the caller is the only party that knows.
   */
  attempted: readonly FigureKind[],
): PracticeReport {
  const disclosure = suppressReport(figures);
  const reported = [...new Set(figures.map((f) => f.kind))].sort();
  const nothingRecorded = attempted.filter((kind) => !reported.includes(kind)).sort();
  const notComputed = ALL_FIGURE_KINDS.filter(
    (kind) => !reported.includes(kind) && !attempted.includes(kind),
  );
  return {
    practiceId,
    practiceName,
    period,
    disclosure,
    coverage: { reported, nothingRecorded, notComputed },
  };
}

/**
 * The caveats, as data rather than prose in the renderer.
 *
 * Exported so a console surface shows the same sentences the document carries. W177 learned this
 * the same way: two renderings of one caveat drift, and the drift is invisible because nobody
 * opens both at once.
 */
export const REPORT_CAVEATS: readonly string[] = [
  "This report describes what is recorded in Meherr for this practice in the period named above. It is not a measure of care, and no figure in it says whether anything was done well.",
  "Every figure states what it was counted over. A count without its denominator is an impression, so if a denominator is missing the figure is missing too.",
  "A figure that is absent because nothing was recorded is listed as such. Nothing recorded is not the same as nothing happening, and this report cannot tell you which it was.",
  "Nothing here has been sent to anybody. Meherr does not disclose practice-identifiable figures to any outside organisation, and there is no control on this page that would.",
];

/** The document. Structured object first, rendered from it — W20's pattern. */
export function renderPracticeReport(report: PracticeReport, generatedAt: string): string {
  const { period } = report;
  const lines: string[] = [
    `# Reporting summary — ${report.practiceName}`,
    ``,
    `Practice \`${report.practiceId}\`. Covering ${period.fromIso} to ${period.toIso} inclusive.`,
    `Generated ${generatedAt}.`,
    ``,
    `## What this report is`,
    ``,
    ...REPORT_CAVEATS.map((caveat) => `- ${caveat}`),
    ``,
    `## Figures`,
    ``,
    ...renderSuppressedReport(report.disclosure).map((line) => `- ${line}`),
    ``,
    `## Coverage`,
    ``,
  ];

  lines.push(
    report.coverage.reported.length > 0
      ? `Reported here: ${report.coverage.reported.map((k) => KIND_LABELS[k]).join(", ")}.`
      : `Nothing was reported for this period.`,
  );

  // Three lists rather than one, because the silences lead a reader to different questions and
  // only one of them is a question about the practice.
  lines.push(
    report.coverage.nothingRecorded.length > 0
      ? `Looked for and found nothing recorded in this period: ${report.coverage.nothingRecorded
          .map((k) => KIND_LABELS[k])
          .join(", ")}. These are absent because the record held nothing to count, not because they are withheld and not because the answer is zero.`
      : `Everything this report looked for had something recorded in this period.`,
  );

  if (report.coverage.notComputed.length > 0) {
    lines.push(
      `Not produced by this product yet: ${report.coverage.notComputed
        .map((k) => KIND_LABELS[k])
        .join(", ")}. Nothing was looked for, so this says nothing about your practice — it is a gap in Meherr, not in your record.`,
    );
  }

  lines.push(``);
  return lines.join("\n");
}

/**
 * Figures derived from a practice's own referral rail.
 *
 * Pure: it takes counts rather than reaching for a store, so it can be tested without one and so
 * the page that fetches is visibly the page that fetches. Returns only the kinds it can evidence
 * — a kind with nothing recorded produces no figure at all rather than a zero, which is W196's
 * refusal and the reason `Coverage` has a `nothingRecorded` list to put it in.
 */
export const REFERRAL_DERIVED_KINDS: readonly FigureKind[] = [
  "referrals_written",
  "referrals_with_recorded_completion",
];

export function figuresFromReferrals(
  written: number,
  withRecordedCompletion: number,
  period: ReportPeriod,
): Figure[] {
  if (written <= 0) return [];
  const basis = { source: "src/referrals/store.ts", recordedFacts: written, ...period };
  const out: Figure[] = [];
  for (const [kind, value] of [
    ["referrals_written", written],
    ["referrals_with_recorded_completion", withRecordedCompletion],
  ] as const) {
    const result = figure(kind, value, basis);
    // A refusal is not an error to surface here: W196 refuses a figure it cannot evidence, and
    // the report's coverage section is where that absence gets named.
    if (result.ok) out.push(result.figure);
  }
  return out;
}
