// W199: the reporting summary, read by the practice it is about.
//
// The page exists because a practice manager preparing for a conversation with a PHN should be
// able to see what this product would say about them BEFORE anybody else can. Proposed gate G9
// governs whether such figures may be disclosed at all and is unratified, so this surface has one
// reader — the practice, looking at its own data — and no way to send anything.
//
// Three rendering decisions this file makes rather than the module:
//
//   THE DOCUMENT IS ON THE PAGE, not behind a download. A report a reader cannot see before
//   obtaining it is a report they will forward unread, and the whole point of the caveats is that
//   they travel with the figures.
//
//   THE COVERAGE SECTION IS NOT COLLAPSED. It is the part that says what the figures do not
//   cover, which is the part a reader skips if it is one click away — W173 made the same call
//   about the unknown pile, for the same reason.
//
//   AND THERE IS NO SEND CONTROL, deliberately and visibly. The page says so, so its absence
//   reads as a decision rather than as a feature nobody got to.

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import {
  KIND_LABELS,
  REFERRAL_DERIVED_KINDS,
  REPORT_CAVEATS,
  buildPracticeReport,
  figuresFromReferrals,
  renderPracticeReport,
} from "@/reporting/report";
import { referralChainOutcomes } from "@/outcomes/dashboard";
import { sentBy, sentEventsFor } from "@/referrals/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reporting — Meherr" };

/**
 * The window this page reports on.
 *
 * W205 FOUND THE DEFECT THIS CONSTANT CAUSED. The page stamped a hardcoded quarter onto counts
 * that were never filtered by it: `sentBy(practiceId).length` is every referral the practice has
 * ever written, and the synthetic rail dates every one of them 2026-02-01 — outside the quarter
 * the document claimed. So the page rendered a true number under a false period, which is the
 * exact failure W196 and W199 were both written to prevent, arriving through the one input
 * neither of them validates.
 *
 * The calendar year in the synthetic phase, and the figures are now COUNTED WITHIN IT below. A
 * real deployment takes the period from the request; what it must never do again is take the
 * figures from one window and the label from another.
 */
const PERIOD = { fromIso: "2026-01-01", toIso: "2026-12-31" };

const withinPeriod = (iso: string) => iso >= PERIOD.fromIso && iso <= PERIOD.toIso;

export default async function ReportingPage() {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  const practiceId = record.practice.id;
  // The document says when it was made. Stamping the period's end date claimed every render was
  // produced on 30 June, on a page that recomputes on every request (W205).
  const generatedAt = new Date().toISOString().slice(0, 10);
  if (!authorize(console_.memberships, email, practiceId, "view_dashboard").allowed) {
    redirect("/console");
  }

  // Scoped in the query, not filtered afterwards — W123's rule, and W181's finding.
  // Then filtered BY PERIOD, which is W205's fix: a figure and the window it is labelled with
  // have to come from the same place.
  const written = sentBy(practiceId).filter((doc) => withinPeriod(doc.createdAt)).length;
  const events = sentEventsFor(practiceId).filter((event) => withinPeriod(event.at));
  const completed = referralChainOutcomes(events).filter(
    (outcome) => outcome.verdict === "reached",
  ).length;

  const report = buildPracticeReport(
    practiceId as string,
    record.practice.name,
    PERIOD,
    figuresFromReferrals(written, completed, PERIOD),
    // What this page TRIED to compute. The other two kinds are not derived anywhere in the tree,
    // and saying so is different from saying the practice's record held nothing (W205).
    REFERRAL_DERIVED_KINDS,
  );
  const document = renderPracticeReport(report, generatedAt);

  return (
    <ConsoleShell email={email}>
      <h1 className="text-2xl font-semibold tracking-tight">Reporting summary</h1>
      <p className="mt-2 text-sm text-stone-500">
        What this product would say about your practice, for {PERIOD.fromIso} to {PERIOD.toIso}.
      </p>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-1 font-medium text-stone-900">Nothing here has been sent</h2>
        <p className="text-sm text-stone-600" data-testid="no-disclosure">
          Meherr does not disclose figures about your practice to any outside organisation, and
          there is no control on this page that would. This is your own record, shown to you.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-stone-900">Figures</h2>
        <ul className="flex flex-col gap-3 text-sm" data-testid="figures">
          {report.disclosure.published.map((figure) => (
            <li key={figure.kind} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <span className="font-medium text-stone-900">
                {KIND_LABELS[figure.kind]}: {figure.value}
              </span>
              <span className="block text-stone-600">
                Counted over {figure.recordedFacts} recorded fact(s), {figure.fromIso} to{" "}
                {figure.toIso}.
              </span>
            </li>
          ))}
          {report.disclosure.suppressed.map((entry) => (
            <li
              key={entry.kind}
              data-testid={`withheld-${entry.kind}`}
              className="rounded-lg border border-stone-100 bg-stone-50 p-3 text-stone-700"
            >
              {entry.statement}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-stone-600" data-testid="suppression-statement">
          {report.disclosure.statement}
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-stone-900">Coverage</h2>
        <p className="text-sm text-stone-600" data-testid="coverage-reported">
          {report.coverage.reported.length > 0
            ? `Reported here: ${report.coverage.reported.map((k) => KIND_LABELS[k]).join(", ")}.`
            : "Nothing was reported for this period."}
        </p>
        <p className="mt-2 text-sm text-stone-600" data-testid="coverage-absent">
          {report.coverage.nothingRecorded.length > 0
            ? `Looked for and found nothing recorded in this period: ${report.coverage.nothingRecorded
                .map((k) => KIND_LABELS[k])
                .join(", ")}. These are absent because the record held nothing to count, not because they are withheld and not because the answer is zero.`
            : "Everything this report looked for had something recorded in this period."}
        </p>
        {report.coverage.notComputed.length > 0 && (
          <p className="mt-2 text-sm text-stone-600" data-testid="coverage-not-computed">
            {`Not produced by this product yet: ${report.coverage.notComputed
              .map((k) => KIND_LABELS[k])
              .join(", ")}. Nothing was looked for, so this says nothing about your practice — it is a gap in Meherr, not in your record.`}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-stone-900">What this report is</h2>
        <ul className="flex flex-col gap-2 text-sm text-stone-600">
          {REPORT_CAVEATS.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-2 font-medium text-stone-900">The document</h2>
        <p className="mb-3 text-sm text-stone-500">
          The same report as text, so you can take it into a meeting. It carries its own caveats,
          because a figure copied out of this page loses everything around it.
        </p>
        <pre
          className="overflow-x-auto rounded-lg border border-stone-100 bg-stone-50 p-4 text-xs whitespace-pre-wrap text-stone-800"
          data-testid="document"
        >
          {document}
        </pre>
      </section>
    </ConsoleShell>
  );
}
