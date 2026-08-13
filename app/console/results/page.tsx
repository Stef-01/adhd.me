// W42: incrementality dashboard v2 — practice-facing, plain English.
// /console/dashboard (W14) stays as the detailed measurement view and keeps its own
// language; this page restates the same arithmetic for a practice manager. It adds
// no new computation: every number comes from W9 attribution and W16 guardrails, so
// it cannot drift from the weekly report (W20).
//
// Honesty rules enforced on this surface:
//   - the raw "booked from a message" count never gets a headline tile (ATTRIBUTION v1);
//   - continuity is reported as a rule that held, never as a result;
//   - the estimate is labelled an estimate, and the demonstration data is labelled.

import Link from "next/link";
import { getComplaints } from "@/complaints/store";
import { DEFAULT_GUARDRAILS, evaluateGuardrails, metricsFromSim } from "@/guardrails/monitors";
import { getDashboardData } from "@/sim/dashboard-data";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { RESULTS_COPY as C } from "@/console/results-copy";
import { buildPracticeResults, shortDate, weeklyExtras } from "@/console/results";
import { DEFAULT_REPORT_OPTIONS } from "@/report/options";
import { WeeklyArmsChart } from "../dashboard/chart";
import { requireSession } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

const aud = (n: number | null) => (n === null ? "—" : `$${Math.round(n).toLocaleString("en-AU")}`);
const num = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-AU"));

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums text-stone-900">{value}</div>
      <div className="mt-1 text-xs text-stone-500">{detail}</div>
    </div>
  );
}

export default async function ResultsPage() {
  const email = await requireSession();
  const data = getDashboardData();
  // Guardrails read the sim result itself; the dashboard cache holds the shaped view.
  // Complaints come from the live store (W51): an empty list here would make the
  // zero-tolerance complaints monitor unfireable and print "nothing needs attention"
  // over an open complaint.
  const alerts = evaluateGuardrails(
    metricsFromSim(runSim(DEFAULT_SIM_CONFIG), getComplaints().complaints),
    DEFAULT_GUARDRAILS,
  );
  const r = buildPracticeResults(data, alerts, {
    revenuePerAttendedVisit: DEFAULT_REPORT_OPTIONS.revenuePerAttendedVisit,
    guardrails: DEFAULT_GUARDRAILS,
  });
  const weekly = weeklyExtras(data);

  const extra = r.extraAppointments ?? 0;
  const anyway = r.wouldHaveHappenedAnyway ?? 0;
  const extraShare = r.bookedFromMessage > 0 ? (extra / r.bookedFromMessage) * 100 : 0;

  return (
    <ConsoleShell email={email}>
      <h1 className="text-2xl font-semibold tracking-tight">{C.heading}</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-500">{C.lede}</p>
      <p className="mt-3 max-w-2xl rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500">
        {C.syntheticNote}
      </p>

      {/* Answers "is anything wrong?" in five seconds, before any number. */}
      <p
        data-testid="results-status"
        className={`mt-6 flex items-center gap-2 text-sm ${r.allClear ? "text-emerald-800" : "text-amber-900"}`}
      >
        <span
          aria-hidden
          className={`inline-block h-2 w-2 rounded-full ${r.allClear ? "bg-emerald-600" : "bg-amber-500"}`}
        />
        {r.allClear ? C.guardrails.allClear : C.guardrails.attention}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile
          label={C.tiles.extraAppointments.label}
          value={num(r.extraAppointments)}
          detail={
            r.extraPerWeek === null
              ? `Over ${r.weeks} weeks`
              : `Over ${r.weeks} weeks — about ${r.extraPerWeek} a week`
          }
        />
        <Tile
          label={C.tiles.extraBillings.label}
          value={aud(r.extraRevenueAud)}
          detail={`${num(r.extraAppointments)} visits at an assumed $${DEFAULT_REPORT_OPTIONS.revenuePerAttendedVisit} each`}
        />
        <Tile
          label={C.tiles.optOuts.label}
          value={num(r.optOut.count)}
          detail={`${r.optOut.pct}% of ${num(r.optOut.ofMessages)} messages`}
        />
      </div>

      {/* The hard idea: why the honest number is smaller than the raw count. */}
      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">{C.comparison.heading}</h2>
        {C.comparison.body.map((paragraph) => (
          <p key={paragraph} className="mt-3 max-w-2xl text-sm text-stone-600">
            {paragraph}
          </p>
        ))}

        <p className="mt-5 text-sm text-stone-700" data-testid="results-split-total">
          {num(r.bookedFromMessage)} appointments were booked from a Meherr message and attended.
        </p>
        <div aria-hidden className="mt-2 flex h-6 w-full overflow-hidden rounded-lg border border-stone-200">
          <div className="h-full bg-[#2a78d6]" style={{ width: `${extraShare}%` }} />
          <div className="ml-0.5 h-full flex-1 bg-stone-200" />
        </div>
        <p className="mt-2 text-sm text-stone-600">
          <span className="font-medium text-stone-900">
            {num(extra)} {C.comparison.barLabelExtra}
          </span>{" "}
          · {num(anyway)} {C.comparison.barLabelAnyway}
        </p>
        <p className="mt-3 text-sm text-stone-500">
          Counting all {num(r.bookedFromMessage)} would let us claim {aud(r.naiveWouldClaimAud)}. We
          report {aud(r.extraRevenueAud)}, because the rest are visits your practice would have had
          regardless.
        </p>
      </section>

      {/* Guardrails, in the practice's language. */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-stone-900">{C.guardrails.heading}</h2>
        {r.allClear ? (
          <p className="text-sm text-stone-600">{C.guardrails.allClear}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {r.alerts.map((alert) => (
              <li key={alert.monitor} className="text-sm text-amber-900">
                <span className="font-medium">
                  {alert.severity === "critical" ? "Serious" : "Warning"}:
                </span>{" "}
                {alert.message}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-stone-500">{C.guardrails.continuityNote}</p>
      </section>

      {/* Two-group chart — reuses the W14 component with plain-English labels. */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">{C.chart.heading}</h2>
        <p className="mt-1 mb-4 max-w-2xl text-sm text-stone-500">{C.chart.sub}</p>
        <WeeklyArmsChart
          weekly={data.weekly}
          scale={10}
          labels={{
            invite: C.chart.messagedLabel,
            holdout: C.chart.comparisonLabel,
            caption: C.chart.caption,
            unit: "per 100 patients",
            difference: "Difference",
          }}
        />
      </section>

      {/* Table view — the accessible equivalent of the chart. */}
      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-3 font-medium text-stone-900">{C.chart.tableHeading}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{C.chart.tableCaption}</caption>
            <thead>
              <tr className="text-left text-stone-500">
                <th scope="col" className="py-1.5 pr-4 font-medium">Week starting</th>
                <th scope="col" className="py-1.5 pr-4 font-medium">
                  {C.chart.messagedLabel} (per 100)
                </th>
                <th scope="col" className="py-1.5 pr-4 font-medium">
                  {C.chart.comparisonLabel} (per 100)
                </th>
                <th scope="col" className="py-1.5 font-medium">Extra appointments</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-stone-800">
              {weekly.map((w) => (
                <tr key={w.week} className="border-t border-stone-100">
                  <td className="py-1.5 pr-4">{shortDate(w.weekStartIso)}</td>
                  <td className="py-1.5 pr-4">{w.messagedPer100.toFixed(1)}</td>
                  <td className="py-1.5 pr-4">{w.comparisonPer100.toFixed(1)}</td>
                  <td className="py-1.5">{w.extraAppointments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <summary className="cursor-pointer font-medium text-stone-900">{C.method.heading}</summary>
        {C.method.body.map((paragraph) => (
          <p key={paragraph} className="mt-3 max-w-2xl text-sm text-stone-600">
            {paragraph}
          </p>
        ))}
        <dl className="mt-4 divide-y divide-stone-100">
          {(
            [
              ["Messaged patients", num(r.messagedPatients)],
              ["Comparison group", num(r.comparisonPatients)],
              ["Appointments per 100 messaged patients", r.messagedPer100.toFixed(1)],
              ["Appointments per 100 comparison patients", r.comparisonPer100.toFixed(1)],
              ["Extra appointments", num(r.extraAppointments)],
            ] as Array<[string, string]>
          ).map(([term, value]) => (
            <div key={term} className="flex justify-between py-2">
              <dt className="text-sm text-stone-500">{term}</dt>
              <dd className="text-sm font-medium tabular-nums text-stone-900">{value}</dd>
            </div>
          ))}
        </dl>
      </details>

      <p className="mt-6 text-xs text-stone-500">{C.footer}</p>
      <div className="mt-4 flex gap-4">
        <Link href="/console" className="text-sm font-medium text-stone-700 underline hover:text-stone-900">
          Back to the console
        </Link>
        <Link
          href="/console/dashboard"
          className="text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Detailed measurement view
        </Link>
      </div>
    </ConsoleShell>
  );
}
