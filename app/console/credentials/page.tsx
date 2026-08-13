// W113: the credential console — a clinician sees and corrects their own record.
//
// The safety argument for this page is one sentence, and it is worth stating before the code
// because every choice below follows from it:
//
//   EVERY ACTION A CLINICIAN HAS HERE CAN ONLY REDUCE WHAT THE SYSTEM CLAIMS ABOUT THEM.
//
// Withdrawing removes a claim. There is no action that adds one: W110 refuses
// self-verification outright, and this page deliberately offers no "add a credential" form,
// because credentialing starts with the practice, which holds the evidence. So the page
// cannot be used to manufacture a qualification — not because it validates carefully, but
// because it exposes nothing that points that way.
//
// What it shows is the clinician's OWN record and only that. The read is `ownCredentials`,
// which takes the subject id as its argument rather than fetching the practice's history and
// narrowing it. And it shows the WHOLE record, including expired entries, which is a
// deliberate departure from W112: the rest of the product treats an expired credential as
// absent, but the person it is about must be able to see that it lapsed. A record you cannot
// inspect is one you cannot correct — W83's argument for showing a GP their own derived
// counts, and it applies here with more force.
//
// Evidence DOCUMENTS are not on this page. W109 gates them behind a grant a clinician cannot
// obtain, and that stands: what a clinician gets here is their credentialing history, not the
// scans a reviewer looked at. Subject access to the documents themselves needs the founder's
// G6 position on credential visibility, which is W117.

import { redirect } from "next/navigation";
import { clinicianForEmail } from "@/console/clinician-identity";
import { getConsole } from "@/console/store";
import { effectiveExpiry, reattestationDue } from "@/credentials/attestation";
import { logFor, ownCredentials } from "@/credentials/ledger";
import { replayVerification } from "@/credentials/verification";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell, primaryButtonClass } from "../ui";
import { withdrawOwnCredential } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your credentials — Meherr" };

const ERROR_COPY: Record<string, string> = {
  denied: "You do not have access to that.",
  not_linked: "We cannot tell which clinician you are, so we will not show you a record that might belong to someone else. Ask the practice to link your sign-in address to your name on the roster.",
  not_yours: "That credential is not yours.",
  terminal: "That credential was already withdrawn or rejected.",
  reason_missing: "Say why you are withdrawing it.",
  failed: "That change could not be saved.",
};

/** Status wording. Says what the practice HOLDS, never what the clinician can do. */
const STATUS_COPY: Record<string, string> = {
  submitted: "Waiting to be checked",
  checked: "Checked, waiting to be confirmed",
  verified: "Confirmed",
  expired: "Lapsed",
  rejected: "Not accepted",
  withdrawn: "Withdrawn",
};

export default async function CredentialsPage({
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

  // W81's rule, unchanged: unlinked means unlinked. Showing "probably you" on a page about
  // someone's qualifications is the one failure this lookup exists to avoid.
  const identity = clinicianForEmail(record.clinicians, email);
  const today = new Date().toISOString().slice(0, 10);

  const mine = identity.linked
    ? ownCredentials(record.practice.id, identity.clinician.id, today)
    : [];
  // Notices are computed over the practice log and then narrowed to this clinician — the
  // urgency rules live in W112 and are not restated here.
  const dueForMe = identity.linked
    ? reattestationDue(replayVerification(logFor(record.practice.id), today)).filter(
        (item) => item.subjectClinicianId === identity.clinician.id,
      )
    : [];

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Your credentials</h1>
          <p className="text-stone-600">
            What the practice holds about your qualifications, and where each one is up to.
            This is a record of what was checked and by whom — it does not describe how you
            work or what you are good at.
          </p>
        </div>

        {saved && (
          <p role="status" data-testid="credentials-saved" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            Withdrawn. The practice can see that you withdrew it, and why.
          </p>
        )}
        {error && (
          <p role="alert" data-testid="credentials-error" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            {ERROR_COPY[error] ?? ERROR_COPY.failed}
          </p>
        )}

        {!identity.linked ? (
          <p data-testid="credentials-unlinked" className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">
            {ERROR_COPY.not_linked}
          </p>
        ) : mine.length === 0 ? (
          <p data-testid="credentials-empty" className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">
            The practice does not hold any credentials for you yet. Credentialing starts with
            the practice, because they hold the documents to check.
          </p>
        ) : (
          <>
            {dueForMe.length > 0 && (
              <section
                aria-labelledby="due-heading"
                data-testid="credentials-due"
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <h2 id="due-heading" className="text-sm font-semibold text-amber-900">
                  Needs re-checking
                </h2>
                <ul className="mt-1 flex flex-col gap-1 text-sm text-amber-900">
                  {dueForMe.map((item) => (
                    <li key={item.credentialId}>
                      {item.credentialId} —{" "}
                      {item.urgency === "lapsed"
                        ? `lapsed on ${item.expiresOn}`
                        : `due by ${item.expiresOn}`}
                      {item.expiryStated ? "" : " (no expiry was stated, so the practice set a review date)"}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <ul data-testid="credentials-list" className="flex flex-col gap-4">
              {mine.map((credential) => {
                const expiry = effectiveExpiry(credential);
                const open = credential.status !== "withdrawn" && credential.status !== "rejected";
                return (
                  <li
                    key={credential.credentialId}
                    data-testid={`credential-${credential.credentialId}`}
                    className="rounded-lg border border-stone-200 bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-medium">{credential.credentialId}</h2>
                      <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                        {STATUS_COPY[credential.status] ?? credential.status}
                      </span>
                    </div>

                    <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-stone-600 sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-stone-500">Lodged by</dt>
                        <dd>{credential.submittedBy}</dd>
                      </div>
                      {credential.checkedBy && (
                        <div className="flex gap-2">
                          <dt className="text-stone-500">Checked by</dt>
                          <dd>
                            {credential.checkedBy} on {credential.checkedOn}
                          </dd>
                        </div>
                      )}
                      {credential.verifiedBy && (
                        <div className="flex gap-2">
                          <dt className="text-stone-500">Confirmed by</dt>
                          <dd>
                            {credential.verifiedBy} on {credential.verifiedOn}
                          </dd>
                        </div>
                      )}
                      {expiry && (
                        <div className="flex gap-2">
                          <dt className="text-stone-500">
                            {expiry.stated ? "Expires" : "Review date"}
                          </dt>
                          <dd>{expiry.on}</dd>
                        </div>
                      )}
                      {credential.supersedes && (
                        <div className="flex gap-2">
                          <dt className="text-stone-500">Renews</dt>
                          <dd>{credential.supersedes}</dd>
                        </div>
                      )}
                      {credential.endedReason && (
                        <div className="flex gap-2">
                          <dt className="text-stone-500">Reason</dt>
                          <dd>{credential.endedReason}</dd>
                        </div>
                      )}
                    </dl>

                    {open && (
                      <form action={withdrawOwnCredential} className="mt-4 flex flex-wrap items-end gap-3">
                        <input type="hidden" name="credentialId" value={credential.credentialId} />
                        <div className="flex flex-col gap-1">
                          <label
                            htmlFor={`reason-${credential.credentialId}`}
                            className="text-sm text-stone-600"
                          >
                            Why are you withdrawing this?
                          </label>
                          <input
                            id={`reason-${credential.credentialId}`}
                            name="reason"
                            required
                            className="rounded border border-stone-300 px-3 py-2 text-sm"
                          />
                        </div>
                        <button type="submit" className={primaryButtonClass}>
                          Withdraw
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p data-testid="credentials-note" className="text-sm text-stone-500">
          You can withdraw a credential you no longer stand behind. You cannot confirm your own
          — someone else at the practice has to check it, which is what makes it worth
          anything. The documents a reviewer looked at are not shown here.
        </p>
      </div>
    </ConsoleShell>
  );
}
