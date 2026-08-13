// W173: the outcome dashboard.
//
// The page a practice reads to answer "did the referrals we wrote go anywhere?" — and the whole
// design problem is that the honest answer today is mostly "the record does not say", which is
// the answer a dashboard is worst at carrying. `src/outcomes/dashboard.ts` holds the reasoning;
// three things about the RENDERING are decisions this file makes.
//
// THE UNKNOWN PILE IS NOT STYLED AS A PROBLEM. It gets the same weight as the other two, no
// warning colour, no exclamation. A red block labelled "unknown" is a design that has already
// decided the record's silence is a failure, which is exactly what W170 refused in the model —
// and it would be W127's failure repeated in CSS rather than in code.
//
// IT LEADS WITH WHAT WOULD SETTLE IT. The count is above the fold because it has to be, but the
// section a reader is meant to act on is the list of things somebody could go and record. A
// number an operator can only feel bad about is not a dashboard, it is a scoreboard.
//
// AND THERE IS NO PER-CLINICIAN ANYTHING. Not withheld, not collapsed behind a control —
// absent, because the module cannot produce it (W83's floor, argued there). The page says so
// out loud rather than leaving its absence to be read as an oversight and added later.
//
// The rail is synthetic in this phase, like every other console surface, and the page says
// which referrals are on it — the second denominator, which is the one that stops "4 referrals,
// 2 unknown" from being read as "we wrote 4 referrals".

import Link from "next/link";
import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import {
  DASHBOARD_BASIS,
  REFERRAL_CHAIN,
  describeAsk,
  referralChainOutcomes,
  whatWouldSettleIt,
} from "@/outcomes/dashboard";
import { OUTCOME_VERDICT_COPY, summarise, type OutcomeVerdict } from "@/outcomes/model";
import { sentEventsFor } from "@/referrals/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Outcomes — Meherr" };

const VERDICT_LABEL: Record<OutcomeVerdict, string> = {
  reached: "Recorded as getting there",
  stopped: "Recorded as stopping",
  not_recorded: "The record does not say",
};

export default async function OutcomesPage() {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  const practiceId = record.practice.id;
  if (!authorize(console_.memberships, email, practiceId, "view_dashboard").allowed) {
    redirect("/console");
  }

  // Scoped in the query, not filtered afterwards — W123's rule, and the reason W91/W103 gave:
  // a later filter is a line somebody can delete, and the deletion looks like a simplification.
  const outcomes = referralChainOutcomes(sentEventsFor(practiceId));
  const summary = summarise(outcomes, REFERRAL_CHAIN);
  const asks = whatWouldSettleIt(outcomes);

  const buckets: Array<{ verdict: OutcomeVerdict; count: number }> = [
    { verdict: "reached", count: summary.reached },
    { verdict: "stopped", count: summary.stopped },
    { verdict: "not_recorded", count: summary.notRecorded },
  ];

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Outcomes</h1>
          <p className="max-w-2xl text-stone-600">
            What the record says happened to the referrals your practice wrote. Every figure here
            is a count of recorded events — nothing is inferred from a referral having gone quiet.
          </p>
        </div>

        {summary.total === 0 ? (
          <section
            data-testid="outcomes-empty"
            aria-labelledby="outcomes-empty-heading"
            className="flex flex-col gap-3 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600"
          >
            <h2 id="outcomes-empty-heading" className="font-medium text-stone-800">
              No referral is on this rail yet.
            </h2>
            <p>
              This is not the same as your practice having written no referrals. It means nothing
              has been recorded here to follow — so there is no population to report on, rather
              than a population whose outcomes are all unknown.
            </p>
            <p>{DASHBOARD_BASIS}</p>
          </section>
        ) : (
          <>
            <section aria-labelledby="counts-heading" className="flex flex-col gap-3">
              <h2 id="counts-heading" className="font-medium text-stone-900">
                {summary.total} referral(s) on this rail
              </h2>
              <dl data-testid="outcome-buckets" className="grid gap-3 sm:grid-cols-3">
                {buckets.map(({ verdict, count }) => (
                  // Deliberately identical styling across all three. Colouring the unknown
                  // bucket as a warning would be the model's refusal undone in CSS.
                  <div
                    key={verdict}
                    data-testid={`bucket-${verdict}`}
                    className="flex flex-col gap-1 rounded-lg border border-stone-200 bg-white px-4 py-3"
                  >
                    <dt className="text-sm text-stone-600">{VERDICT_LABEL[verdict]}</dt>
                    {/* Count and gloss both inside the <dd>: a dt/dd group may not carry a
                        stray sibling, which axe flags as `definition-list` (W49's bar). */}
                    <dd className="flex flex-col gap-1">
                      <span className="text-2xl font-semibold text-stone-900">{count}</span>
                      <span className="text-xs text-stone-500">{OUTCOME_VERDICT_COPY[verdict]}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p data-testid="outcome-basis" className="max-w-3xl text-sm text-stone-600">
                {summary.basis}
              </p>
              <p data-testid="outcome-population" className="max-w-3xl text-sm text-stone-600">
                {DASHBOARD_BASIS}
              </p>
            </section>

            <section aria-labelledby="asks-heading" className="flex flex-col gap-3">
              <h2 id="asks-heading" className="font-medium text-stone-900">
                What would settle the ones the record does not answer
              </h2>
              {asks.length === 0 ? (
                <p data-testid="no-asks" className="text-sm text-stone-600">
                  Every referral here has something recorded either way, so there is nothing
                  outstanding to write down.
                </p>
              ) : (
                <>
                  <p className="max-w-3xl text-sm text-stone-600">
                    Each line is a piece of record-keeping, not a task for a patient or a
                    clinician to chase. The count is how many referrals it would settle.
                  </p>
                  <ul data-testid="settlement-asks" className="flex flex-col gap-2">
                    {asks.map((ask) => (
                      <li
                        key={ask.kind}
                        data-testid="settlement-ask"
                        className="flex items-baseline justify-between gap-4 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm"
                      >
                        <span className="text-stone-700">{describeAsk(ask.kind)}</span>
                        <span className="shrink-0 text-stone-900">
                          {ask.chains} referral(s)
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section aria-labelledby="each-heading" className="flex flex-col gap-3">
              <h2 id="each-heading" className="font-medium text-stone-900">
                Each referral, and what the verdict rests on
              </h2>
              <p className="max-w-3xl text-sm text-stone-600">
                In referral-record order. The order carries no meaning — Meherr does not decide
                which of these matters more.
              </p>
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Every referral on this rail, its recorded outcome, and the events that outcome
                  rests on.
                </caption>
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
                    <th scope="col" className="pb-2 font-medium">Referral</th>
                    <th scope="col" className="pb-2 font-medium">What the record says</th>
                    <th scope="col" className="pb-2 font-medium">Furthest recorded</th>
                    <th scope="col" className="pb-2 font-medium">Resting on</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomes.map((outcome) => (
                    <tr
                      key={outcome.chainId}
                      data-testid="outcome-row"
                      className="border-b border-stone-100 align-top"
                    >
                      <td className="py-2 text-stone-900">{outcome.chainId}</td>
                      <td className="py-2 text-stone-700">{VERDICT_LABEL[outcome.verdict]}</td>
                      <td className="py-2 text-stone-600">
                        {outcome.furthestStage ?? "Nothing recorded"}
                      </td>
                      <td className="py-2 text-stone-600">
                        {outcome.evidence.length === 0
                          ? "No event"
                          : `${outcome.evidence.length} recorded event(s)`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        <section
          data-testid="outcomes-caveats"
          aria-labelledby="not-here-heading"
          className="flex max-w-3xl flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-600"
        >
          <h2 id="not-here-heading" className="font-medium text-stone-800">
            What this page will not show you
          </h2>
          <p data-testid="no-clinician-breakdown">
            There is no breakdown by clinician here, and there is not going to be one. What is
            being counted is largely whether somebody at the other end of a referral wrote
            something down, which is not a fact about the GP who wrote it — a table of it by name
            would read as a performance measure of the thing they control least.
          </p>
          <p>
            There is also no single success figure. One would be produced by dividing the
            recorded-as-getting-there count into the total, which quietly treats every referral
            the record is silent about as one that failed.
          </p>
          <p>
            A referral booked, cancelled and then rebooked reaches the same stages as one booked
            once, so this page cannot tell them apart. That is a question about the sequence of
            events, and the{" "}
            <Link href="/console/referrals" className="underline hover:text-stone-900">
              referral console
            </Link>{" "}
            replays it.
          </p>
        </section>

        <p className="max-w-3xl text-xs text-stone-500">
          Referral records here are synthetic. Nothing on this page is sent anywhere, and no
          figure from it leaves the practice.
        </p>
      </div>
    </ConsoleShell>
  );
}
