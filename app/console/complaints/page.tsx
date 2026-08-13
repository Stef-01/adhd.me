// W43: complaint/opt-out workflow surface — intake, triage, resolution. Open
// complaints are the practice notification: they banner here and on the console
// home, and the W16 guardrail treats any open complaint as critical.

import { redirect } from "next/navigation";
import { complaintsFor } from "@/complaints/store";
import { getConsole } from "@/console/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell, inputClass, primaryButtonClass } from "../ui";
import { intake, resolve, triage } from "./actions";

export const dynamic = "force-dynamic";

const SEVERITY_LABEL: Record<string, string> = {
  low: "Low",
  serious: "Serious",
  urgent: "Urgent",
};

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ received?: string; error?: string }>;
}) {
  const { email, record } = await requirePractice();
  // W51: the list is operator-entered, patient-linked data — reading it takes
  // membership, not merely a session.
  const state = getConsole();
  if (!authorize(state.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console");
  }
  const params = await searchParams;
  // W206: the whole store used to render here, so every practice could read every other
  // practice's complaints — including the patient identifier each one carries.
  const complaints = complaintsFor(record.practice.id as string);
  const open = complaints.filter((c) => c.status === "open");
  const resolved = complaints.filter((c) => c.status === "resolved");

  return (
    <ConsoleShell email={email}>
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
        <span className="text-sm text-stone-500" data-testid="open-count">
          {open.length} open
        </span>
      </div>
      {params.received && (
        <p className="mt-4 rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700">
          Complaint recorded. Any requested opt-out has already been applied.
        </p>
      )}
      {params.error && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {params.error === "denied"
            ? "Your role cannot triage or resolve complaints."
            : params.error === "resolve"
              ? "Triage first, and say what was done."
              : "Check the form: a short description is required, and opt-out needs the patient identifier."}
        </p>
      )}

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">Record a complaint</h2>
        <form action={intake} className="mt-4 grid gap-4">
          <div className="flex gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">Channel</span>
              <select name="channel" className={inputClass}>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="front_desk">Front desk</option>
                <option value="sms_reply">SMS reply</option>
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">What happened</span>
              <input name="summary" className={inputClass} placeholder="Caller unhappy about receiving a message" />
            </label>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">Patient identifier (if known)</span>
              <input name="patientId" className={inputClass} placeholder="pat-1" />
            </label>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-stone-600">
              <input type="checkbox" name="wantsOptOut" /> They want no further contact
            </label>
            <button type="submit" className={primaryButtonClass}>
              Record
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">Open</h2>
        {open.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">None open.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {open.map((c) => (
              <li key={c.id} className="py-4" data-testid={`complaint-${c.id}`}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-stone-900">
                    {c.summary}
                    {c.optOutApplied && (
                      <span className="ml-2 rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                        opt-out applied
                      </span>
                    )}
                    {c.optOutApplied && c.optOutMatchedPatient === false && (
                      <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        identifier matched no record — check it
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-stone-500">
                    {c.channel} · {c.at.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <form action={triage} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <select name="severity" defaultValue={c.severity ?? ""} className={inputClass}>
                      <option value="" disabled>
                        Severity…
                      </option>
                      <option value="low">Low</option>
                      <option value="serious">Serious</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button type="submit" className="text-sm font-medium text-stone-700 underline hover:text-stone-900">
                      Triage
                    </button>
                  </form>
                  {c.severity && (
                    <span className="text-xs text-stone-500">triaged: {SEVERITY_LABEL[c.severity]}</span>
                  )}
                  <form action={resolve} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="resolution" className={`${inputClass} flex-1`} placeholder="What was done" />
                    <button type="submit" className="text-sm font-medium text-stone-700 underline hover:text-stone-900">
                      Resolve
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">Resolved</h2>
        {resolved.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {resolved.map((c) => (
              <li key={c.id} className="py-2.5">
                <span className="text-stone-700">{c.summary}</span>{" "}
                <span className="text-stone-500">— {c.resolution}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ConsoleShell>
  );
}
