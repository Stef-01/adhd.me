// O57: the clinician applications register, behind the ADHD.ME-staff gate.
//
// THE GATE SITS ABOVE THE READ, exactly as `/console/interest` (W105) established: for a
// non-staff visitor the application list is NOT FETCHED AT ALL. Conditional rendering would
// satisfy the eye and not the wire — in a server component the data would still be assembled
// into the RSC payload, and an application row holds a GP's name, email and registration
// number. Nothing below the gate runs unless the session is on the staff list, which ships
// empty (adding an entry is a founder decision, made in a commit).
//
// THIS PAGE HAS NO APPROVE BUTTON, AND THAT IS ITS DESIGN. Every application's status is
// `received` — the only value the type allows — because W183's gate to being listed is an
// Ahpra advertising review, which is a human act performed outside this console. A control
// here that moved an application toward the directory would make that gate a variable. The
// page READS requests; it cannot grant them.
//
// Every sentence rendered for a row comes from `applicationView` (W233), where each is
// unit-pinned — including the one this page exists for: the join hero's declared mix,
// rendered as stated preference when and only when the GP actually set it (O26's capture,
// finally with a reader — Standing debt 1 closed).

import { ConsoleShell } from "../ui";
import { requireSession } from "../guard";
import { listApplications } from "@/onboarding/store";
import { applicationView } from "@/onboarding/applications-view";
import { isAdhdMeStaff, STAFF_REFUSAL_COPY } from "@/tenancy/staff";
import { attributionFor, ingested, quoteForOperator } from "@/security/untrusted";

/** W153: whose words the names below are. Written by us; an application cannot forge it. */
const ATTRIBUTION = attributionFor("public_form");

export const dynamic = "force-dynamic";
export const metadata = { title: "Clinician applications — ADHD.ME" };

export default async function ClinicianApplicationsPage() {
  const email = await requireSession();

  if (!isAdhdMeStaff(email)) {
    return (
      <ConsoleShell email={email}>
        <div>
          <p className="text-sm font-medium text-stone-500">Join requests</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Clinician applications</h1>
        </div>
        <p
          data-testid="applications-refused"
          className="mt-8 rounded-xl border border-stone-300 bg-white p-6 text-sm leading-6 text-stone-700"
        >
          {STAFF_REFUSAL_COPY}
        </p>
      </ConsoleShell>
    );
  }

  const applications = listApplications().map(applicationView);

  return (
    <ConsoleShell email={email}>
      <div>
        <p className="text-sm font-medium text-stone-500">Join requests</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Clinician applications</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
          Requests to be listed, exactly as submitted. Everything below is the applicant’s own
          declaration; listing is a separate human act with its own review, and nothing on this
          page can perform it.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
        <span className="text-sm text-stone-500">Applications received</span>
        <strong className="mt-1 block text-4xl tracking-tight">{applications.length}</strong>
      </div>

      {applications.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          No applications yet.
        </p>
      ) : (
        <>
          <p data-testid="applications-attribution" className="mt-8 text-sm text-stone-500">
            {ATTRIBUTION}
          </p>
          <ul className="mt-2 divide-y divide-stone-200 border-y border-stone-200">
            {applications.map((application) => (
              <li key={application.id} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto]">
                <div>
                  <strong className="text-sm">
                    {quoteForOperator(ingested(application.fullName, "public_form")).text}
                  </strong>
                  <a href={`mailto:${application.email}`} className="ml-2 text-sm text-stone-500 underline">
                    {application.email}
                  </a>
                  <p className="mt-1 text-sm text-stone-600">{application.practiceLine}</p>
                  <p className="mt-1 text-xs text-stone-500">{application.ahpraLine}</p>
                  <p className="mt-2 text-sm text-stone-600">
                    Sees often: {application.careAreaLabels.join(" · ")}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    How they work: {application.mannerLabels.join(" · ")}
                  </p>
                  {application.languages.length > 0 && (
                    <p className="mt-1 text-sm text-stone-600">
                      Languages: {application.languages.join(" · ")}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-stone-600">
                    {application.booksLine} {application.trainingLine}
                  </p>
                  {application.mixLine && (
                    <p data-testid="application-mix" className="mt-2 text-sm text-stone-700">
                      {application.mixLine}
                    </p>
                  )}
                </div>
                <time className="text-xs text-stone-500" dateTime={application.submittedOn}>
                  {application.submittedOn}
                </time>
              </li>
            ))}
          </ul>
        </>
      )}
    </ConsoleShell>
  );
}
