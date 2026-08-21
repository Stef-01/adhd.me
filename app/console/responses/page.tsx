// W220: the response graph as a practice reads it.
//
// A renderer over `src/console/responses.ts`, which holds every decision this page makes; the
// only things settled HERE are visual, and there are three of them.
//
// THE UNANSWERED PILE GETS NO WARNING STYLING. W173's decision on the outcomes dashboard,
// inherited rather than re-argued: same border, same weight, no colour. A red block labelled
// "nothing recorded" is a design that has decided the record's silence is a failure, which is
// what W170 refused in the model and what W127 did in code.
//
// THE CAVEAT SITS ABOVE THE TABLE, NOT UNDER IT. W219 attached it to the value so a surface could
// not print a rate without the sentence; a page that satisfies that by putting it in a footnote
// has complied with the type and lost the point.
//
// AND THE UNOBSERVED KINDS ARE THEIR OWN SECTION, never a row of zero in the rate table. W212's
// distinction: a rate of zero describes a rail that answered nobody; these were never used.

import Link from "next/link";
import { redirect } from "next/navigation";
import { counterfactual } from "@/outcomes/counterfactual";
import {
  buildResponseGraph,
  eventsFromSim,
  interventionsFromSim,
} from "@/outcomes/response-graph";
import { responsesView } from "@/console/responses";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { authorize } from "@/tenancy/tenancy";
import { getConsole } from "@/console/store";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "How messages were answered — ADHD.ME" };

export default async function ResponsesPage() {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  if (!authorize(console_.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console");
  }

  // Synthetic, like every console surface in this phase — and structurally so: the only producer
  // of an intervention in this tree takes a SimResult, so there is no real-data path to this page.
  const sim = runSim(DEFAULT_SIM_CONFIG);
  const period = {
    fromIso: sim.config.todayIso,
    toIso: isoDaysFrom(sim.config.todayIso, sim.config.weeks * 7 + 7),
  };
  const view = responsesView(
    buildResponseGraph(interventionsFromSim(sim), eventsFromSim(sim), period),
    counterfactual(sim.attribution),
  );

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">How messages were answered</h1>
          <p className="max-w-2xl text-stone-600">
            Every message this practice sent in the period, and what the record holds against it.
            These are counts of recorded events. Nothing here is inferred from a message having
            gone quiet, and nothing is estimated.
          </p>
          <p data-testid="responses-population" className="max-w-2xl text-sm text-stone-500">
            Demonstration data: the figures come from the simulated practice, not from anybody real.
            No message has been sent to a patient.
          </p>
        </div>

        {view.empty !== null ? (
          <section
            data-testid={`responses-empty-${view.empty}`}
            aria-labelledby="responses-empty-heading"
            className="flex flex-col gap-3 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600"
          >
            <h2 id="responses-empty-heading" className="font-medium text-stone-800">
              No response rates to show
            </h2>
            <p data-testid="responses-empty-copy">{view.emptyCopy}</p>
          </section>
        ) : null}

        {view.rates.length > 0 ? (
          <section aria-labelledby="rates-heading" className="flex flex-col gap-3">
            <h2 id="rates-heading" className="font-medium text-stone-900">
              What was answered
            </h2>
            {/* Above the table on purpose — see the header note. */}
            <p data-testid="responses-caveat" className="max-w-3xl text-sm text-stone-600">
              {view.caveat}
            </p>
            <div className="overflow-x-auto">
              <table data-testid="responses-rates" className="w-full text-left text-sm">
                <caption className="sr-only">
                  Response rates by kind of message, counted within the messaged group.
                </caption>
                <thead>
                  <tr className="border-b border-stone-200 text-stone-600">
                    <th scope="col" className="py-2 pr-4 font-medium">Kind of message</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Sent</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Answered at least once</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Nothing recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rates.map((rate) => (
                    <tr key={rate.kind} data-testid={`rate-${rate.kind}`} className="border-b border-stone-100">
                      <th scope="row" className="py-2 pr-4 font-normal text-stone-900">{rate.kind}</th>
                      <td className="py-2 pr-4 tabular-nums text-stone-900">{rate.offered}</td>
                      <td className="py-2 pr-4 tabular-nums text-stone-900">{rate.answeredAtLeastOnce}</td>
                      {/* Same weight as the rest of the row. No warning colour — see the header. */}
                      <td className="py-2 pr-4 tabular-nums text-stone-900">{rate.unanswered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {view.attributionWithheldCopy !== null ? (
          <section aria-labelledby="claim-heading" className="flex flex-col gap-2">
            <h2 id="claim-heading" className="font-medium text-stone-900">
              What this does not say
            </h2>
            <p data-testid="responses-claim-withheld" className="max-w-3xl text-sm text-stone-600">
              {view.attributionWithheldCopy}
            </p>
          </section>
        ) : null}

        {view.unobserved.length > 0 ? (
          <section aria-labelledby="unobserved-heading" className="flex flex-col gap-2">
            <h2 id="unobserved-heading" className="font-medium text-stone-900">
              Not used in this period
            </h2>
            <ul data-testid="responses-unobserved" className="flex flex-col gap-2 text-sm text-stone-600">
              {view.unobserved.map((kind) => (
                <li key={kind.kind}>
                  <span className="text-stone-900">{kind.kind}</span> — {kind.why}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {view.disclosure !== null ? (
          <p data-testid="responses-disclosure" className="max-w-3xl text-sm text-stone-500">
            {view.disclosure.statement}
          </p>
        ) : null}

        {view.refusals.map((refusal) => (
          <p key={refusal.reason} data-testid={`responses-refusal-${refusal.reason}`} className="max-w-3xl text-sm text-stone-600">
            {refusal.copy}
          </p>
        ))}

        <p className="text-sm">
          <Link href="/console/outcomes" className="text-stone-600 underline">
            Outcomes for referrals this practice wrote
          </Link>
        </p>
      </div>
    </ConsoleShell>
  );
}
