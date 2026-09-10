// W14: incrementality dashboard v1 — the north star (incremental attended per 1,000
// eligible) from the deterministic sim, holdout vs invite arm. Numbers follow
// docs/ATTRIBUTION.md v1: the naive generated count appears only as a contrast figure.

import Link from "next/link";
import { getDashboardData } from "@/sim/dashboard-data";
import { counterfactual, withheldCopy } from "@/outcomes/counterfactual";
import { simulatedPeriod } from "@/console/spine";
import { requireSession } from "../guard";
import { ConsoleShell } from "../ui";
import { WeeklyArmsChart } from "./chart";
import { PhoneFold } from "./phone-fold";

export const dynamic = "force-dynamic";

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-stone-900">{value}</div>
      {detail && <div className="mt-1 text-xs text-stone-500">{detail}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const email = await requireSession();
  const data = getDashboardData();
  const attr = data.attribution;
  // W215: the headline is the counterfactual's, not the raw arithmetic's. The tile below used to
  // read `(attr.incrementalAttended ?? 0).toFixed(0)` and printed a confident `0` for a practice
  // with no comparison group — a withheld figure rendered as a measured zero.
  const cf = counterfactual(attr);
  const withheld = withheldCopy(cf);

  return (
    <ConsoleShell email={email}>
      {/* Wraps: at a phone width the meta line sat hard against the title on one row. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Incrementality</h1>
        {/* The period in words, read off the sim rather than typed. */}
        <p data-testid="dashboard-period" className="text-sm text-stone-500">
          {simulatedPeriod(data)} · {data.patientCount.toLocaleString()} synthetic patients
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Incremental attended / 1,000"
          value={cf.claimed ? attr.incrementalPer1000!.toFixed(1) : "—"}
          detail={cf.claimed ? "North star — invite-arm rate above holdout" : "Withheld — see below"}
        />
        <StatTile
          label="Incremental attended"
          value={cf.claimed ? cf.figure.difference.toFixed(0) : "—"}
          detail={`vs naive generated count ${attr.naiveGeneratedAttended} (contrast only)`}
        />
        <StatTile
          label="Invite arm"
          value={attr.inviteArm.attendedPer1000.toFixed(0)}
          detail={`attended / 1,000 · ${attr.inviteArm.patients.toLocaleString()} patients`}
        />
        <StatTile
          label="Holdout arm"
          value={attr.holdoutArm.attendedPer1000.toFixed(0)}
          detail={`attended / 1,000 · ${attr.holdoutArm.patients.toLocaleString()} patients`}
        />
      </div>

      {withheld && (
        <p
          data-testid="counterfactual-withheld"
          className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {withheld}
        </p>
      )}

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-stone-900">Weekly attended per 1,000 — by arm</h2>
        <WeeklyArmsChart weekly={data.weekly} />
      </section>

      <PhoneFold
        className="mt-8 rounded-xl border border-stone-200 bg-white p-6"
        testId="dashboard-weekly-table"
        summary={
          <>
            <h2 className="font-medium text-stone-900">Weekly table</h2>
            <span className="text-xs text-stone-500">
              opt-outs {data.optOutRatePct.toFixed(1)}% of {data.totals.invitationsSent.toLocaleString()} sent
            </span>
          </>
        }
      >
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-2 pr-4 font-medium">Week</th>
                {/* Right-aligned with their cells — see the note on /console/capacity. These are
                    `toFixed(1)`, so left alignment misaligns the decimal point the moment the
                    integer part changes width, and one arm can go negative. */}
                <th className="py-2 pr-4 text-right font-medium">Invite / 1,000</th>
                <th className="py-2 pr-4 text-right font-medium">Holdout / 1,000</th>
                <th className="py-2 text-right font-medium">Incremental</th>
              </tr>
            </thead>
            <tbody>
              {data.weekly.map((p) => (
                <tr key={p.week} className="border-b border-stone-100 text-stone-700">
                  <td className="py-1.5 pr-4">W{p.week}</td>
                  <td className="py-1.5 pr-4 text-right">{p.invitePer1000.toFixed(1)}</td>
                  <td className="py-1.5 pr-4 text-right">{p.holdoutPer1000.toFixed(1)}</td>
                  <td className="py-1.5 text-right">{p.incrementalPer1000 === null ? "—" : p.incrementalPer1000.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PhoneFold>

      <p className="mt-6 text-xs text-stone-500">
        Attribution definitions: docs/ATTRIBUTION.md {attr.version} — intention-to-treat; no claim
        without a holdout arm. <Link href="/console" className="underline">Back to console</Link>
      </p>
    </ConsoleShell>
  );
}
