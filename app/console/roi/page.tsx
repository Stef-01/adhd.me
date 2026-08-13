// W21: in-app ROI widget. Renders the practice-economics model (src/economics/roi)
// at the brief assumptions, with three levers a manager can adjust via the form.
// Read-only compute from query params — no stored state, no mutation, no server
// action. Revenue is shown on incremental visits only (the honesty rule).

import { BRIEF_ASSUMPTIONS, computeRoi, type RoiAssumptions } from "@/economics/roi";
import { requireSession } from "../guard";
import { ConsoleShell, Field, inputClass, primaryButtonClass } from "../ui";

export const dynamic = "force-dynamic";

function positiveNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const aud = (n: number) =>
  `$${Math.round(n).toLocaleString("en-AU")}`;

export default async function RoiPage({
  searchParams,
}: {
  searchParams: Promise<{ gpCount?: string; revenuePerAttendedVisit?: string; meherrMonthlyFee?: string }>;
}) {
  const email = await requireSession();
  const sp = await searchParams;
  const assumptions: RoiAssumptions = {
    ...BRIEF_ASSUMPTIONS,
    gpCount: positiveNumber(sp.gpCount, BRIEF_ASSUMPTIONS.gpCount),
    revenuePerAttendedVisit: positiveNumber(
      sp.revenuePerAttendedVisit,
      BRIEF_ASSUMPTIONS.revenuePerAttendedVisit,
    ),
    meherrMonthlyFee: positiveNumber(sp.meherrMonthlyFee, BRIEF_ASSUMPTIONS.meherrMonthlyFee),
  };
  const r = computeRoi(assumptions);

  const headline: Array<[string, string, string?]> = [
    ["Net annual benefit", aud(r.netAnnualBenefit), "incremental revenue − Meherr cost"],
    ["Return on cost", `${r.roiMultiple.toFixed(1)}×`, "incremental revenue ÷ Meherr cost"],
    ["Incremental visits / year", Math.round(r.annualIncrementalVisits).toLocaleString("en-AU")],
  ];
  const rows: Array<[string, string]> = [
    ["Unfilled slots per week", Math.round(r.openSlotsPerWeek).toLocaleString("en-AU")],
    ["Bookings Meherr generates / week", r.generatedBookingsPerWeek.toFixed(1)],
    ["Attended (after DNA) / week", r.attendedPerWeek.toFixed(1)],
    ["Incremental attended / week", r.incrementalAttendedPerWeek.toFixed(1)],
    ["Incremental revenue / year", aud(r.annualIncrementalRevenue)],
    ["Meherr cost / year", aud(r.annualMeherrCost)],
  ];

  return (
    <ConsoleShell email={email}>
      <h1 className="text-2xl font-semibold tracking-tight">ROI calculator</h1>
      <p className="mt-2 text-sm text-stone-500">
        An estimate from your practice's numbers. Revenue is counted on incremental visits only —
        never on bookings that would have happened anyway.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {headline.map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="text-sm text-stone-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-stone-900" data-testid={`roi-${label}`}>
              {value}
            </div>
            {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
          </div>
        ))}
      </div>

      <form method="get" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Participating GPs">
          <input name="gpCount" type="number" min={0} defaultValue={assumptions.gpCount} className={inputClass} />
        </Field>
        <Field label="Billing per visit (AUD)">
          <input
            name="revenuePerAttendedVisit"
            type="number"
            min={0}
            defaultValue={assumptions.revenuePerAttendedVisit}
            className={inputClass}
          />
        </Field>
        <Field label="Meherr fee (AUD/month)">
          <input
            name="meherrMonthlyFee"
            type="number"
            min={0}
            defaultValue={assumptions.meherrMonthlyFee}
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-3">
          <button type="submit" className={primaryButtonClass}>
            Recalculate
          </button>
        </div>
      </form>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-stone-900">How the estimate is built</h2>
        <dl className="divide-y divide-stone-100">
          {rows.map(([term, value]) => (
            <div key={term} className="flex justify-between py-2.5">
              <dt className="text-sm text-stone-500">{term}</dt>
              <dd className="text-sm font-medium text-stone-900">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-stone-500">
          Fixed assumptions: {Math.round(BRIEF_ASSUMPTIONS.openSlotRate * 100)}% of capacity unfilled,{" "}
          {Math.round(BRIEF_ASSUMPTIONS.fillRate * 100)}% of offered slots booked,{" "}
          {Math.round(BRIEF_ASSUMPTIONS.dnaRate * 100)}% DNA,{" "}
          {Math.round(BRIEF_ASSUMPTIONS.incrementalShare * 100)}% of attended visits incremental. A
          downloadable spreadsheet with every input lives at reports/roi-calculator.xlsx.
        </p>
      </section>
    </ConsoleShell>
  );
}
