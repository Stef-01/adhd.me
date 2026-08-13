// W33: privacy policy — DRAFT. Factual, B2B posture; reviewed by counsel before any
// pilot. No clinical claims, no patient-facing marketing (compliance law #6).

import Link from "next/link";
import { RESPONSIBILITY_STATEMENT } from "@/compliance/party-to-care";

export const metadata = { title: "Privacy policy (draft) — Meherr" };

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="mb-6 inline-block rounded bg-amber-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-900">
        Draft — not yet in force
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
      <div className="prose prose-stone mt-8 space-y-6 text-stone-700">
        <section>
          <h2 className="text-lg font-medium text-stone-900">Who we are</h2>
          <p className="mt-2 text-sm leading-6">
            Meherr provides general practices with software that offers available
            appointment times to their existing patients, on the practice&apos;s instructions.
            The practice remains the custodian of its patient records; Meherr processes
            the minimum information needed to deliver the service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">What we collect and why</h2>
          <p className="mt-2 text-sm leading-6">
            Contact details, appointment history and consent flags supplied by the practice&apos;s
            practice-management system — used solely to determine eligibility for availability
            invitations, to send them, and to measure whether they resulted in attended
            appointments. We do not collect or process clinical notes, diagnoses, or test
            results, and we never use patient information for advertising.
          </p>
          <p className="mt-3 text-sm leading-6">
            For the Western Sydney community interest list, we collect the name, email address
            and interest options a person chooses, with their consent. We use these details only
            to contact them about community sessions and early product testing. We do not ask for
            clinical records or a description of symptoms in this form.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Access, correction and deletion (APP 12 / APP 13)</h2>
          <p className="mt-2 text-sm leading-6">
            Patients may request access to the information Meherr holds, or its deletion,
            through their practice. Deletion removes identifiable records and leaves a hashed
            deletion record as proof; a suppression entry ensures a deleted patient is never
            contacted again, even after a later data refresh.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Retention</h2>
          <p className="mt-2 text-sm leading-6">
            Records are retained per practice-configured windows and pruned automatically when
            they age out. Opt-out and deletion records are kept — they are the evidence that a
            request was honoured.
          </p>
          <p className="mt-3 text-sm leading-6">
            Community interest details are kept while the program is being developed or until the
            person asks for them to be removed.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Who is responsible for your care</h2>
          {/* W138: rendered from the canonical statement, never paraphrased — a claim restated
              in four places is four claims, and they drift. */}
          <p className="mt-2 text-sm leading-6" data-testid="responsibility-statement">
            {RESPONSIBILITY_STATEMENT}
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Automated decision-making</h2>
          <p className="mt-2 text-sm leading-6">
            Meherr uses automation in deciding which patients are offered available
            appointments. Our{" "}
            <Link href="/privacy/automated-decisions" className="underline">
              automated-decisions statement
            </Link>{" "}
            describes what is automated, what never is, and the human controls in force.
          </p>
        </section>
      </div>
    </main>
  );
}
