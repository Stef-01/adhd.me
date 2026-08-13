// W127: the content sign-off dashboard — which pathways are signed, by whom, when.
//
// The unit's gate has an unusual second half: "zero signed at ship, and the dashboard SAYS SO
// rather than rendering empty". That distinction is the page.
//
// An empty table reads as a loading failure, or as a feature nobody has used yet. Neither is
// true. Nothing is signed off because signing clinical content off is a founder act that has
// not happened, and that is a fact about the product's state which a practice is entitled to
// see stated plainly. A dashboard that renders a blank grid invites the reader to assume the
// data is missing rather than that the decision is outstanding — and those lead to opposite
// next actions.
//
// Two other decisions:
//
//   IT SHOWS GOVERNANCE, NOT CONTENT. Criteria are summarised as counts, never listed. A
//   pathway's inclusion and exclusion rules are clinical content, and rendering unsigned
//   clinical content in a console is the thing the G5 gate exists to prevent — showing it
//   here would put it in front of a clinician with the product's implicit endorsement before
//   anybody had endorsed it.
//
//   A REFUSAL EXPLAINS ITSELF. W119 already writes a specific sentence for each way a version
//   can fail the gate ("a specialist has reviewed this and it is waiting on founder sign-off"
//   is a different state from "nobody has looked"), and the page renders that rather than a
//   generic "not available".

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import {
  PATHWAY_REFUSAL_COPY,
  usablePathway,
  type PathwayRefusal,
} from "@/pathways/approval";
import { allVersions, getPathwayAttestations } from "@/pathways/registry";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clinical content sign-off — Meherr" };

export default async function PathwaysPage() {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  if (!authorize(console_.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console");
  }

  const attestations = getPathwayAttestations();
  const versions = allVersions();
  const rows = versions.map((version) => {
    const result = usablePathway(version, attestations);
    const review = attestations.find(
      (a) =>
        a.versionHash === version.versionHash &&
        a.kind === "specialist_review" &&
        !a.revokedAt,
    );
    const signOff = attestations.find(
      (a) =>
        a.versionHash === version.versionHash && a.kind === "founder_sign_off" && !a.revokedAt,
    );
    return { version, usable: result.usable, refusal: result.usable ? null : result.reason, review, signOff };
  });
  const signedCount = rows.filter((row) => row.usable).length;

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Clinical content sign-off</h1>
          <p className="text-stone-600">
            Which care pathways have been reviewed by a specialist and signed off, and by whom.
            A pathway that has not cleared both steps is not used by anything.
          </p>
        </div>

        <p
          data-testid="signed-count"
          className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
        >
          <strong>{signedCount}</strong> of <strong>{rows.length}</strong> pathway version(s) are
          signed off and in use.
        </p>

        {rows.length === 0 ? (
          // The gate's second half. Not an empty table.
          <section
            data-testid="pathways-none"
            aria-labelledby="none-heading"
            className="flex flex-col gap-3 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600"
          >
            <h2 id="none-heading" className="font-medium text-stone-800">
              No pathway has been signed off yet.
            </h2>
            <p>
              This is the current state of the product, not a loading error and not a page
              waiting for you to fill it in. Meherr ships with no clinical pathway content at
              all.
            </p>
            <p>
              Adding one takes two people and two separate steps: a specialist reviews the
              content, and then the founder signs it off. Neither has happened, so there is
              nothing here to show and nothing in the product is using a pathway.
            </p>
          </section>
        ) : (
          <ul data-testid="pathways-list" className="flex flex-col gap-4">
            {rows.map((row) => (
              <li
                key={row.version.versionHash}
                data-testid={`pathway-${row.version.versionHash.slice(0, 12)}`}
                className="rounded-lg border border-stone-200 bg-white px-4 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-medium">
                    {row.version.pathwayId} — version {row.version.ordinal}
                  </h2>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      row.usable ? "bg-emerald-50 text-emerald-900" : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {row.usable ? "Signed off and in use" : "Not in use"}
                  </span>
                </div>

                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-stone-600 sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-stone-500">Drafted by</dt>
                    <dd>
                      {row.version.draftedBy} on {row.version.draftedAt}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-stone-500">Specialist review</dt>
                    <dd data-testid={`review-${row.version.versionHash.slice(0, 12)}`}>
                      {row.review ? `${row.review.byEmail} on ${row.review.at}` : "Not yet reviewed"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-stone-500">Founder sign-off</dt>
                    <dd data-testid={`signoff-${row.version.versionHash.slice(0, 12)}`}>
                      {row.signOff ? `${row.signOff.byEmail} on ${row.signOff.at}` : "Not yet signed off"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-stone-500">Criteria</dt>
                    {/* Counts, never the rules themselves — see the module note. */}
                    <dd>
                      {row.version.criteria.inclusion.length} inclusion,{" "}
                      {row.version.criteria.exclusion.length} exclusion,{" "}
                      {row.version.criteria.escalation.length} escalation
                    </dd>
                  </div>
                </dl>

                {row.refusal && (
                  <p
                    data-testid={`refusal-${row.version.versionHash.slice(0, 12)}`}
                    className="mt-3 rounded bg-stone-50 px-3 py-2 text-sm text-stone-700"
                  >
                    {PATHWAY_REFUSAL_COPY[row.refusal as PathwayRefusal]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <p data-testid="pathways-note" className="text-sm text-stone-500">
          The rules a pathway contains are not shown here. This page is about who checked the
          content and when, not about the content itself — and unreviewed clinical material
          does not belong in front of a clinician with the product&rsquo;s name on it.
        </p>
      </div>
    </ConsoleShell>
  );
}
