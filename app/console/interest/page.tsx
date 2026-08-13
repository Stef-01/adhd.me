// W105: the community interest register, behind the Meherr-staff gate.
//
// The signup list is NOT FETCHED AT ALL for a non-staff visitor. Rendering it conditionally
// would be enough for the human eye and not enough for the wire: in a server component the
// data would still be assembled, and anything that reaches the RSC payload has left the
// server. The gate therefore sits above the read, not around the markup.

import { ConsoleShell } from "../ui";
import { requireSession } from "../guard";
import { listInterestSignups } from "@/interest/store";
import { isMeherrStaff, STAFF_REFUSAL_COPY } from "@/tenancy/staff";
import { attributionFor, ingested, quoteForOperator } from "@/security/untrusted";

/** W153: whose words the names below are. Written by us; a signup cannot forge it. */
const ATTRIBUTION = attributionFor("public_form");

export const dynamic = "force-dynamic";
export const metadata = { title: "Community interest — Meherr" };

export default async function CommunityInterestPage() {
  const email = await requireSession();

  if (!isMeherrStaff(email)) {
    return (
      <ConsoleShell email={email}>
        <div>
          <p className="text-sm font-medium text-stone-500">Demand evidence</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Community interest</h1>
        </div>
        <p
          data-testid="interest-refused"
          className="mt-8 rounded-xl border border-stone-300 bg-white p-6 text-sm leading-6 text-stone-700"
        >
          {STAFF_REFUSAL_COPY}
        </p>
      </ConsoleShell>
    );
  }

  const signups = listInterestSignups();

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">Demand evidence</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Community interest</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">Unique, consented registrations from the Western Sydney community landing page.</p>
        </div>
        <a href="/api/interest/export" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:border-stone-500">Download CSV</a>
      </div>

      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
        <span className="text-sm text-stone-500">Unique registrations</span>
        <strong className="mt-1 block text-4xl tracking-tight">{signups.length}</strong>
      </div>

      {signups.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No registrations yet.</p>
      ) : (
        <>
        <p data-testid="interest-attribution" className="mt-8 text-sm text-stone-500">
          {ATTRIBUTION}
        </p>
        <ul className="mt-2 divide-y divide-stone-200 border-y border-stone-200">
          {signups.map((signup) => (
            <li key={signup.id} className="grid gap-2 py-5 sm:grid-cols-[1fr_auto]">
              <div>
                {/* W153: a name typed into a public form. Carried verbatim — editing somebody's
                    name to defend against a machine that does not exist yet is a real harm
                    traded for a hypothetical one — with the attribution stated once above the
                    list, so "Meherr Support (verified)" reads as a signup calling itself that
                    rather than as the product saying it. */}
                <strong className="text-sm">
                  {quoteForOperator(ingested(signup.name, "public_form")).text}
                </strong>
                <a href={`mailto:${signup.email}`} className="ml-2 text-sm text-stone-500 underline">{signup.email}</a>
                <p className="mt-2 text-sm text-stone-600">{signup.interests.join(" · ")}</p>
              </div>
              <time className="text-xs text-stone-500" dateTime={signup.createdAt}>{new Date(signup.createdAt).toLocaleString("en-AU")}</time>
            </li>
          ))}
        </ul>
        </>
      )}
    </ConsoleShell>
  );
}
