// W83: capability console. Two views of the same graph, deliberately different.
//
// The clinician sees their own profile in full, including what the system DERIVED about them
// — a capability record you cannot inspect is one you cannot correct. The practice sees the
// panel as presence-and-freshness only, never raw visit counts: a manager deciding who can
// take work does not need one GP's tallies, and showing them would turn a capability graph
// into a productivity board.
//
// Copy discipline, same as W60: this page describes what the practice KNOWS, never what a
// clinician is good at. "Verified by an external body" is a provenance statement; "expert in"
// would be a claim, and the W6/W23 linters exist because that line is easy to cross.

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import { ownProfile, panelView } from "@/capability/graph";
import type { ClinicianId } from "@/domain/types";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Capability — Meherr" };

const FRESHNESS_LABEL: Record<string, string> = {
  current: "Current",
  stale: "Needs review",
  void: "Expired",
  absent: "Not recorded",
};

function Chip({ state }: { state: string }) {
  const tone =
    state === "current"
      ? "bg-emerald-50 text-emerald-900"
      : state === "void"
        ? "bg-amber-100 text-amber-900"
        : state === "stale"
          ? "bg-amber-50 text-amber-900"
          : "bg-stone-100 text-stone-600";
  return <span className={`rounded px-2 py-0.5 text-xs ${tone}`}>{FRESHNESS_LABEL[state] ?? state}</span>;
}

export default async function CapabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { email, record } = await requirePractice();
  const state = getConsole();
  if (!authorize(state.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console");
  }

  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  // Synthetic-phase stand-in for "which clinician am I": the first roster entry, or the one
  // named in the query. Real identity binding arrives with G1/G2 credentials.
  const me = (params.as ?? record.clinicians[0]?.id ?? "clin-1") as ClinicianId;

  const mine = ownProfile(record.practice.id, me, today);
  const panel = panelView(record.practice.id, today);

  return (
    <ConsoleShell email={email}>
      <h1 className="text-2xl font-semibold tracking-tight">Capability</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-500">
        What this practice records about who takes which work. Three separate things: what a GP
        says they want more of, what they have actually seen, and what someone external has
        verified. They are never combined into a single score.
      </p>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">Your profile</h2>
        <p className="mt-1 text-sm text-stone-500" data-testid="own-profile-note">
          Everything recorded about you, including what was worked out from your attended visits.
        </p>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500" data-testid="own-profile-empty">
            Nothing recorded yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100" data-testid="own-profile">
            {mine.map((row) => (
              <li key={row.conditionCode as string} className="py-4">
                <div className="font-medium text-stone-900">{row.conditionCode as string}</div>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-stone-500">Stated interest</dt>
                    <dd className="text-stone-700">
                      {row.interest ? `${row.interest.strength} of 5 — ${row.interest.reason}` : "None stated"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-stone-500">Visits seen</dt>
                    <dd className="text-stone-700" data-testid="own-visits">
                      {row.experience
                        ? `${row.experience.attendedVisits} between ${row.experience.windowFrom} and ${row.experience.windowTo}`
                        : "Not counted"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-stone-500">External verification</dt>
                    <dd className="text-stone-700">
                      {row.competence
                        ? `${row.competence.credential}, verified by ${row.competence.attestedBy}`
                        : "None recorded"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">Panel view</h2>
        <p className="mt-1 max-w-2xl text-sm text-stone-500" data-testid="panel-note">
          Whether each record exists and is up to date, across the practice. Visit counts are not
          shown here — they are on each clinician&apos;s own profile.
        </p>
        {panel.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No capability records yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm" data-testid="panel-view">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-2 pr-4 font-medium">Clinician</th>
                  <th className="py-2 pr-4 font-medium">Register</th>
                  <th className="py-2 pr-4 font-medium">Interest</th>
                  <th className="py-2 pr-4 font-medium">Experience</th>
                  <th className="py-2 font-medium">Verified</th>
                </tr>
              </thead>
              <tbody>
                {panel.map((cell) => (
                  <tr key={`${cell.clinicianId}-${cell.conditionCode}`} className="border-b border-stone-100">
                    <td className="py-2 pr-4 text-stone-700">{cell.clinicianId as string}</td>
                    <td className="py-2 pr-4 text-stone-700">{cell.conditionCode as string}</td>
                    <td className="py-2 pr-4"><Chip state={cell.interest} /></td>
                    <td className="py-2 pr-4"><Chip state={cell.experience} /></td>
                    <td className="py-2"><Chip state={cell.competence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ConsoleShell>
  );
}
