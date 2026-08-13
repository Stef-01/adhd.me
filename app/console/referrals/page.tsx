// W137: the referral console, for both sides.
//
// A referral has two practices and they have different jobs. The sender is chasing an outcome
// and can act on almost nothing themselves; the receiver is deciding whether to take somebody
// on, which is the one decision that actually moves the referral. So this is two lists, fed by
// two separate reads, and the actions live only on the receiving side — the side that can
// answer.
//
// Two things it deliberately does NOT show.
//
//   NO CREDENTIAL OR CAPABILITY DETAIL ABOUT ANYONE. The founder's A-or-B ruling on whether
//   credential detail may cross a practice boundary is outstanding (docs/GATE-DOSSIER-Q9.md
//   action 1), so this page is built to the safe intersection the same way W131's document
//   was: it shows the referral and where it is, never who at the other end is qualified for
//   what. Adding that before the ruling would make the ruling by default.
//
//   NO CLINICAL NARRATIVE FROM THE OTHER PRACTICE ON THE SENDER'S LIST. The sender wrote it;
//   they do not need it read back. What they need is whether anybody answered.
//
// Everything on the page is status. The one thing a practice can do here is answer a referral
// addressed to them, and both answers — accept and decline — are explicit acts (W134).

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import {
  ACCEPTANCE_STATE_COPY,
  acceptanceStatus,
  type AcceptanceState,
} from "@/referrals/acceptance";
import { REFERRAL_REASON_COPY, REFERRAL_REQUEST_COPY } from "@/referrals/document";
import { detectLeakage } from "@/referrals/leakage";
import { RETURN_OUTCOME_COPY } from "@/referrals/return-report";
import { actsFor, eventsFor, returnFor, sentBy, sentTo } from "@/referrals/store";
import { describeOutstanding, trackReferral } from "@/referrals/tracking";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell, primaryButtonClass } from "../ui";
import { answerReferral } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Referrals — Meherr" };

const ERROR_COPY: Record<string, string> = {
  denied: "You do not have access to that.",
  not_yours: "That referral was not sent to this practice.",
  already_answered: "That referral has already been answered.",
  reason_missing: "Say why you are declining it.",
  failed: "That change could not be saved.",
};

function StateChip({ state }: { state: AcceptanceState | "unknown" }) {
  const tone =
    state === "accepted"
      ? "bg-emerald-50 text-emerald-900"
      : state === "declined"
        ? "bg-stone-100 text-stone-700"
        : "bg-amber-50 text-amber-900";
  const label =
    state === "unknown"
      ? "Not recorded"
      : state.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  return <span className={`rounded px-2 py-0.5 text-xs ${tone}`}>{label}</span>;
}

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  if (!authorize(console_.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console");
  }
  const { error, saved } = await searchParams;

  const practiceId = record.practice.id;
  const acts = actsFor(practiceId);
  const events = eventsFor(practiceId);
  const leakage = detectLeakage(events, practiceId);

  const sent = sentBy(practiceId).map((document) => ({
    document,
    tracking: trackReferral(document.referralId, practiceId, events, acts),
    returned: returnFor(document.referralId),
  }));
  const received = sentTo(practiceId).map((document) => ({
    document,
    status: acceptanceStatus(acts, document.referralId),
  }));

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Referrals</h1>
          <p className="text-stone-600">
            Referrals this practice sent, and referrals other practices have sent here. A
            referral is not handed over until the receiving practice answers it.
          </p>
        </div>

        {saved && (
          <p role="status" data-testid="referrals-saved" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            Answered. The referring practice can see your answer.
          </p>
        )}
        {error && (
          <p role="alert" data-testid="referrals-error" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            {ERROR_COPY[error] ?? ERROR_COPY.failed}
          </p>
        )}

        <section aria-labelledby="received-heading" className="flex flex-col gap-3">
          <h2 id="received-heading" className="text-lg font-medium">
            Sent to this practice
          </h2>
          {received.length === 0 ? (
            <p data-testid="received-empty" className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">
              No other practice has referred a patient here.
            </p>
          ) : (
            <ul data-testid="received-list" className="flex flex-col gap-4">
              {received.map(({ document, status }) => (
                <li
                  key={document.referralId}
                  data-testid={`received-${document.referralId}`}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium">{document.referralId}</h3>
                    <StateChip state={status.state} />
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    {REFERRAL_REASON_COPY[document.reason]} {REFERRAL_REQUEST_COPY[document.request]}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {ACCEPTANCE_STATE_COPY[status.state]}
                  </p>

                  {status.state === "awaiting_acceptance" && (
                    <form action={answerReferral} className="mt-4 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="referralId" value={document.referralId} />
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`reason-${document.referralId}`} className="text-sm text-stone-600">
                          If you are declining, why?
                        </label>
                        <input
                          id={`reason-${document.referralId}`}
                          name="reason"
                          className="rounded border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <button type="submit" name="answer" value="accept" className={primaryButtonClass}>
                        Accept
                      </button>
                      <button
                        type="submit"
                        name="answer"
                        value="decline"
                        className="rounded border border-stone-300 px-4 py-2 text-sm text-stone-700"
                      >
                        Decline
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="sent-heading" className="flex flex-col gap-3">
          <h2 id="sent-heading" className="text-lg font-medium">
            Sent by this practice
          </h2>
          {sent.length === 0 ? (
            <p data-testid="sent-empty" className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">
              This practice has not referred anyone yet.
            </p>
          ) : (
            <ul data-testid="sent-list" className="flex flex-col gap-4">
              {sent.map(({ document, tracking, returned }) => (
                <li
                  key={document.referralId}
                  data-testid={`sent-${document.referralId}`}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium">{document.referralId}</h3>
                    <StateChip state={tracking.acceptance} />
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    {REFERRAL_REASON_COPY[document.reason]} {REFERRAL_REQUEST_COPY[document.request]}
                  </p>

                  {returned.found && (
                    <p data-testid={`returned-${document.referralId}`} className="mt-2 text-sm text-stone-700">
                      {RETURN_OUTCOME_COPY[returned.report.outcome]}
                    </p>
                  )}
                  {"ambiguous" in returned && (
                    // W142: two different return reports share the latest date, so which is
                    // current is unknowable. Shown as a question rather than resolved by
                    // position — a superseded return report presented as current is a wrong
                    // clinical communication, not an untidy one.
                    <p data-testid={`return-ambiguous-${document.referralId}`} className="mt-2 text-sm text-amber-900">
                      {returned.count} different return reports were filed on the same date for
                      this referral. Check with the other practice which one stands.
                    </p>
                  )}

                  {describeOutstanding(tracking).length > 0 && (
                    <ul data-testid={`outstanding-${document.referralId}`} className="mt-2 flex flex-col gap-1 text-sm text-amber-900">
                      {describeOutstanding(tracking).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  )}

                  {tracking.conflicts.length > 0 && (
                    <ul data-testid={`conflicts-${document.referralId}`} className="mt-2 flex flex-col gap-1 text-sm text-stone-700">
                      {tracking.conflicts.map((conflict) => (
                        <li key={conflict.what}>Worth checking: {conflict.what}.</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p data-testid="referrals-note" className="text-sm text-stone-500">
          Until a referral is answered, this practice is still looking after the patient. Nothing
          here says anything about how any clinician works, and the qualifications held at the
          other practice are not shown.{" "}
          {leakage.timelines.length === 0 ? "" : "Where something is outstanding, it says who it is waiting on."}
        </p>
      </div>
    </ConsoleShell>
  );
}
