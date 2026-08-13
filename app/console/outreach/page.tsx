// W95: leakage outreach console — who would be invited, and everyone who would not.
//
// The page exists to make one thing checkable by eye before anything is sent: the message a
// patient with a stalled referral receives is the SAME availability invitation everyone else
// receives. So the exact wording is shown once, at the top, and the recipient list carries no
// per-patient reason at all — the referral is why the practice is looking, not what the
// patient is told.
//
// Copy discipline: the withheld list is longer than the send list on purpose, and it is not an
// apology. Each row says what to do instead. And the list is in referral-record order, stated
// on the page, because a list of patients ordered by anything derived from their referrals is
// the ranking W96 refuses — naming a recipient is unavoidable when sending; ordering them by
// need is not.

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import type { PatientId } from "@/domain/types";
import { DEFAULT_PREFERENCES } from "@/messaging/preferences";
import { detectLeakage } from "@/referrals/leakage";
import {
  NUDGE_REFUSAL_COPY,
  type NudgeRecipient,
  type NudgeRefusal,
  planOutreach,
  withheldCounts,
} from "@/referrals/outreach";
import { syntheticReferrals } from "@/synthetic/referrals";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Outreach — Meherr" };

/** Availability language only, and linted at render time by W6's gate. */
const SESSION_WINDOW = "after 5pm this week";

export default async function OutreachPage() {
  const { email, record } = await requirePractice();
  const state = getConsole();
  const practiceId = record.practice.id;
  if (!authorize(state.memberships, email, practiceId, "view_dashboard").allowed) {
    redirect("/console");
  }

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  // Synthetic-phase data source: no referral persistence exists yet, and G0 keeps it that way
  // until real ingest is authorised. Deterministic seed so the page is stable to look at.
  const synthetic = syntheticReferrals({ seed: 9501, practiceId, count: 24, todayIso });

  const recipients: NudgeRecipient[] = synthetic.patientIds.map((patientId: PatientId) => ({
    practiceId,
    patientId,
    firstName: "there",
    usualClinicianDisplayName: record.clinicians[0]?.displayName ?? "your GP",
    bookingUrl: `https://book.example/${practiceId}/session`,
    preferences: DEFAULT_PREFERENCES,
    invitesInWindow: 0,
  }));

  const plan = planOutreach({
    practiceId,
    practiceName: record.practice.name,
    sessionWindow: SESSION_WINDOW,
    leakage: detectLeakage(synthetic.events, practiceId),
    barriers: synthetic.barriers,
    recalls: synthetic.recalls,
    recipients,
    now,
    offerExpiresAt: new Date(now.getTime() + 7 * 86_400_000),
    maxInvitesInWindow: record.rulesConfig.maxInvitesPerQuarter,
  });

  const counts = withheldCounts(plan);
  const withheldReasons = (Object.entries(counts) as Array<[NudgeRefusal, number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const sample = plan.send[0]?.text ?? null;

  return (
    <ConsoleShell email={email}>
      <h1 className="text-2xl font-semibold tracking-tight">Outreach</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-500">
        Referrals your practice wrote with nothing recorded since. Where an invitation can go
        out, it is the ordinary availability message — it does not mention the referral, the
        service, or anything about the patient&rsquo;s care.
      </p>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">The exact wording</h2>
        <p className="mt-1 text-sm text-stone-500">
          The same message a patient receives when any session has room. Nothing is added
          because a referral is involved.
        </p>
        {sample === null ? (
          <p className="mt-3 text-sm text-stone-500" data-testid="no-sends">
            Nothing would go out today, so there is no message to show.
          </p>
        ) : (
          <p
            data-testid="nudge-text"
            className="mt-3 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-900"
          >
            {sample}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium text-stone-900">Would be invited</h2>
          <span data-testid="send-count" className="text-sm text-stone-500">
            {plan.send.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          In referral-record order. The order carries no priority — Meherr does not decide who
          to contact first.
        </p>
        {plan.send.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No invitations would go out today.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
                <th className="pb-2 font-medium">Referral</th>
                <th className="pb-2 font-medium">Patient</th>
                <th className="pb-2 font-medium">Would send</th>
              </tr>
            </thead>
            <tbody>
              {plan.send.map((nudge) => (
                <tr key={nudge.referralId} data-testid="send-row" className="border-b border-stone-100">
                  <td className="py-2 text-stone-900">{nudge.referralId}</td>
                  <td className="py-2 text-stone-600">{nudge.patientId}</td>
                  <td className="py-2 text-stone-600">
                    {nudge.sendAt.slice(0, 16).replace("T", " ")}
                    {nudge.deferred ? " (held for their contact hours)" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium text-stone-900">Would not be invited</h2>
          <span data-testid="withheld-count" className="text-sm text-stone-500">
            {plan.withheld.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Each of these needs something other than a text message. Nothing is withheld without a
          reason on this list.
        </p>
        <dl className="mt-4 divide-y divide-stone-100">
          {withheldReasons.map(([reason, count]) => (
            <div key={reason} data-testid="withheld-row" className="py-3">
              <dt className="flex justify-between text-sm font-medium text-stone-900">
                <span>{reason.replace(/_/g, " ")}</span>
                <span data-testid={`withheld-count-${reason}`}>{count}</span>
              </dt>
              <dd className="mt-1 text-sm text-stone-600">{NUDGE_REFUSAL_COPY[reason]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-6 max-w-2xl text-xs text-stone-500">
        Referral records here are synthetic. No message is sent from this page — live sending
        stays switched off until the practice authorises it.
      </p>
    </ConsoleShell>
  );
}
