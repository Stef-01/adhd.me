// W33: privacy controls — export (APP 12 access) and delete (with hashed deletion
// record + suppression) over the mock dataset, plus the retention config.

import Link from "next/link";
import { getConsole } from "@/console/store";
import { getPrivacy, exportForPatient } from "@/privacy/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell, inputClass, primaryButtonClass } from "../ui";
import { applyRetention, erasePatient, exportPatient } from "./actions";

export const dynamic = "force-dynamic";

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ export?: string; deleted?: string; error?: string; retention?: string }>;
}) {
  const { email, record } = await requirePractice();
  const params = await searchParams;
  const privacy = getPrivacy();
  // W39 review finding: the ?export= render is itself a data disclosure — it takes the
  // same stewardship grant as the action that links here, not just a session.
  const console_ = getConsole();
  const mayExport =
    authorize(console_.memberships, email, record.practice.id, "edit_rules").allowed;
  const exported =
    params.export && mayExport ? exportForPatient(params.export, new Date().toISOString()) : null;

  return (
    <ConsoleShell email={email}>
      <h1 className="text-2xl font-semibold tracking-tight">Privacy &amp; data retention</h1>
      <p className="mt-2 text-sm text-stone-500">
        Synthetic data only in this phase. Public statements:{" "}
        <Link href="/privacy" className="underline">privacy policy (draft)</Link> ·{" "}
        <Link href="/privacy/automated-decisions" className="underline">automated decisions</Link>
      </p>
      {params.retention === "applied" && (
        <p className="mt-4 rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700">
          Retention policy applied. Records past their retention window have been removed.
        </p>
      )}
      {params.deleted && (
        <p className="mt-4 rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700">
          Deletion completed and recorded below.
        </p>
      )}
      {params.error && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {params.error === "denied"
            ? "Your role cannot perform privacy operations."
            : "Enter a patient identifier and tick the confirmation for deletion."}
        </p>
      )}

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">Export a patient&apos;s data</h2>
        <form action={exportPatient} className="mt-4 flex items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">Patient identifier</span>
            <input name="patientId" className={inputClass} placeholder="pat-1" />
          </label>
          <button type="submit" className={primaryButtonClass}>
            Export
          </button>
        </form>
        {exported && (
          <div className="mt-5">
            <h3 className="text-sm font-medium text-stone-700">
              Export for {exported.patientId}
              {exported.suppressed && (
                <span className="ml-2 rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                  suppressed — will never be contacted
                </span>
              )}
            </h3>
            {exported.held ? (
              <pre
                data-testid="export-json"
                className="mt-2 max-h-80 overflow-auto rounded-lg bg-stone-50 p-4 text-xs text-stone-700"
              >
                {JSON.stringify(exported, null, 2)}
              </pre>
            ) : (
              <p className="mt-2 text-sm text-stone-500" data-testid="export-empty">
                No data held for this identifier.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium text-stone-900">Delete a patient&apos;s data</h2>
        <p className="mt-1 text-sm text-stone-500">
          Removes their invitations, visit links, audit trail entries, and the patient link
          on any complaint held about them. A hashed deletion record is kept as proof, and the
          identifier is suppressed from all future contact.
        </p>
        <form action={erasePatient} className="mt-4 flex items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">Patient identifier</span>
            <input name="patientId" className={inputClass} placeholder="pat-1" />
          </label>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-stone-600">
            <input type="checkbox" name="confirm" /> I confirm permanent deletion
          </label>
          <button type="submit" className={primaryButtonClass}>
            Delete
          </button>
        </form>
      </section>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium text-stone-900">Deletion records</h2>
          <span className="text-xs text-stone-500">
            retention policy: invitations {privacy.retention.invitationRetentionDays}d · audit{" "}
            {privacy.retention.auditEventRetentionDays}d · outcomes{" "}
            {privacy.retention.outcomeRetentionDays}d
          </span>
        </div>
        <form action={applyRetention} className="mt-3 flex items-baseline gap-3">
          <button type="submit" className="text-sm font-medium text-stone-700 underline hover:text-stone-900">
            Apply retention now
          </button>
          <span className="text-xs text-stone-500" data-testid="retention-note">
            The policy above is not applied on a schedule yet — nothing runs it automatically,
            so it is applied when you press this. Scheduled enforcement lands with real
            persistence.
          </span>
        </form>
        {privacy.deletions.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">None.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {privacy.deletions.map((d) => (
              <li key={`${d.ref}-${d.at}`} className="py-2.5" data-testid="deletion-record">
                <span className="font-mono text-xs text-stone-500">{d.ref.slice(0, 16)}…</span>{" "}
                <span className="text-stone-700">
                  removed {d.removed.invitations} invitation(s), {d.removed.appointments}{" "}
                  visit link(s), {d.removed.auditEvents} audit event(s),{" "}
                  {d.removed.complaints} complaint link(s)
                </span>{" "}
                <span className="text-stone-500">{d.at.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ConsoleShell>
  );
}
