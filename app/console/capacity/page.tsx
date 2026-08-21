// W229: the capacity console.
//
// A renderer over `src/console/capacity.ts`, which holds every decision. Three are settled here
// and they are all about what the styling would say if it were allowed to.
//
// THE DRIFT VERDICT IS NOT COLOURED. W228 reports that two halves of the record disagree and
// refuses to say which side moved; a page that renders `drifted` in red has resolved that
// disagreement in CSS. `improved` gets the same treatment for the same reason — a green badge
// would be a grade on a forecaster this product deliberately declines to grade.
//
// A SESSION WITH NO RATE SHOWS AN EM DASH AND ITS SENTENCE, never a nought. W215 found
// `(incrementalAttended ?? 0).toFixed(0)` printing a confident zero live on the dashboard; this is
// the same shape and the same refusal.
//
// AND THE CALENDAR GAP SITS WITH THE NUMBERS, not in a footer. It is a property of what is being
// read — nothing here allows for the days the practice was shut — so it belongs where the reading
// happens.

import Link from "next/link";
import { redirect } from "next/navigation";
import { capacityView } from "@/console/capacity";
import { getConsole } from "@/console/store";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "How full the sessions run — ADHD.ME" };

/**
 * The drift block's styling, as a constant.
 *
 * A CONSTANT ON PURPOSE: written inline it was one conditional away from `verdict === "drifted" &&
 * "text-red-800"`, and the e2e that was meant to catch that PASSED when I seeded it — the sim's
 * verdict is `tracking`, so the red branch never rendered and the colour check measured a colour
 * nobody had changed. As a constant there is no verdict in scope to branch on, and the test scans
 * for one.
 */
const DRIFT_BLOCK_CLASS =
  "max-w-3xl rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600";

export default async function CapacityPage() {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  if (!authorize(console_.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console");
  }

  const sim = runSim(DEFAULT_SIM_CONFIG);
  const asOfIso = isoDaysFrom(sim.config.todayIso, sim.config.weeks * 7 + 1);
  const view = capacityView(sim.appointments, asOfIso, {
    fromIso: sim.config.todayIso,
    toIso: asOfIso,
  });

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">How full the sessions run</h1>
          <p className="max-w-2xl text-stone-600">
            Every recurring session this practice has run, how full it was in the weeks recorded,
            and what the record says about opening more. These are counts from the diary. Nothing
            is estimated and nothing is inferred from the time of year.
          </p>
          <p data-testid="capacity-population" className="max-w-2xl text-sm text-stone-500">
            Demonstration data: the figures come from the simulated practice, not from anybody real.
          </p>
        </div>

        {view.empty !== null ? (
          <section
            data-testid={`capacity-empty-${view.empty}`}
            aria-labelledby="capacity-empty-heading"
            className="flex flex-col gap-3 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600"
          >
            <h2 id="capacity-empty-heading" className="font-medium text-stone-800">
              What this page can say
            </h2>
            <p data-testid="capacity-empty-copy">{view.emptyCopy}</p>
          </section>
        ) : null}

        {view.calendarGap !== null ? (
          <p data-testid="capacity-calendar-gap" className="max-w-3xl text-sm text-stone-600">
            {view.calendarGap}
          </p>
        ) : null}

        {view.drift !== null ? (
          <section aria-labelledby="drift-heading" className="flex flex-col gap-2">
            <h2 id="drift-heading" className="font-medium text-stone-900">
              Whether the ranges still match
            </h2>
            {/* Deliberately identical styling for every verdict. Colouring `drifted` would
                resolve, in CSS, the disagreement W228 refuses to resolve in code. */}
            <p
              data-testid="capacity-drift"
              data-verdict={view.drift.compared ? view.drift.verdict : "withheld"}
              className={DRIFT_BLOCK_CLASS}
            >
              {view.drift.copy}
            </p>
          </section>
        ) : null}

        {view.score !== null && view.score.scored ? (
          <p data-testid="capacity-score" className="max-w-3xl text-sm text-stone-600">
            {view.score.sentence}
          </p>
        ) : null}

        {view.sessions.length > 0 ? (
          <section aria-labelledby="sessions-heading" className="flex flex-col gap-3">
            <h2 id="sessions-heading" className="font-medium text-stone-900">
              {view.sessions.length} recurring session(s) on record
            </h2>
            <div className="overflow-x-auto">
              <table data-testid="capacity-sessions" className="w-full text-left text-sm">
                <caption className="sr-only">
                  Recurring sessions, how full each ran, and what the record says about opening more.
                </caption>
                <thead>
                  <tr className="border-b border-stone-200 text-stone-600">
                    <th scope="col" className="py-2 pr-4 font-medium">Session</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Weeks recorded</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Slots offered</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Filled</th>
                    <th scope="col" className="py-2 pr-4 font-medium">How full</th>
                  </tr>
                </thead>
                <tbody>
                  {view.sessions.map((row) => (
                    <tr key={row.label} data-testid="capacity-row" className="border-b border-stone-100">
                      <th scope="row" className="py-2 pr-4 font-normal text-stone-900">{row.label}</th>
                      <td className="py-2 pr-4 tabular-nums text-stone-900">{row.occurrences}</td>
                      <td className="py-2 pr-4 tabular-nums text-stone-900">{row.slotsOffered}</td>
                      <td className="py-2 pr-4 tabular-nums text-stone-900">{row.slotsFilled}</td>
                      {/* The label is composed in the view, where the no-rate branch is reachable
                          by a fixture. An em dash, never a nought — W215's live defect. */}
                      <td className="py-2 pr-4 tabular-nums text-stone-900">{row.utilisationLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {view.sessions.some((row) => row.recommendation.offered) ? (
          <section aria-labelledby="opening-heading" className="flex flex-col gap-3">
            <h2 id="opening-heading" className="font-medium text-stone-900">
              If more slots were opened
            </h2>
            <ul data-testid="capacity-recommendations" className="flex flex-col gap-3 text-sm text-stone-600">
              {view.sessions.map((row) =>
                row.recommendation.offered ? (
                  <li key={row.label} className="flex flex-col gap-1">
                    <span className="text-stone-900">{row.recommendation.recommendation.sentence}</span>
                    <span>{row.recommendation.recommendation.demandEvidence}</span>
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ) : null}

        <p className="text-sm">
          <Link href="/console/responses" className="text-stone-600 underline">
            How messages were answered
          </Link>
        </p>
      </div>
    </ConsoleShell>
  );
}
