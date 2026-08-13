import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import { requirePractice } from "../guard";
import { saveRules } from "../actions";
import { ConsoleShell, ErrorNote, Field, inputClass, primaryButtonClass } from "../ui";

export const dynamic = "force-dynamic";

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { email, record } = await requirePractice();
  const state = getConsole();
  const { error } = await searchParams;
  const rules = record.rulesConfig;

  return (
    <ConsoleShell email={email}>
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Eligibility rules</h1>
        <p className="mb-6 text-sm text-stone-500">
          Patients outside these rules are never invited. Changes are versioned and audited.
        </p>
        <ErrorNote show={error === "1"} />
        <form action={saveRules} className="mt-4 flex flex-col gap-5">
          <Field label="Minimum days since last visit" hint="Never invite anyone seen more recently.">
            <input
              name="minDaysSinceLastVisit"
              type="number"
              required
              min={0}
              max={3650}
              defaultValue={rules.minDaysSinceLastVisit}
              className={inputClass}
            />
          </Field>
          <Field
            label="Existing-booking block window (days)"
            hint="Skip patients already booked within this window."
          >
            <input
              name="futureBookingBlockDays"
              type="number"
              required
              min={0}
              max={365}
              defaultValue={rules.futureBookingBlockDays}
              className={inputClass}
            />
          </Field>
          <Field label="Invitation cap per quarter" hint="Contact-frequency ceiling per patient.">
            <input
              name="maxInvitesPerQuarter"
              type="number"
              required
              min={0}
              max={12}
              defaultValue={rules.maxInvitesPerQuarter}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-3">
            <input
              name="usualClinicianOnly"
              type="checkbox"
              defaultChecked={rules.usualClinicianOnly}
              className="h-4 w-4 rounded border-stone-300"
            />
            <span className="text-sm text-stone-700">Only invite patients of the clinician with availability</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              name="chronicCareOnly"
              type="checkbox"
              defaultChecked={rules.chronicCareOnly}
              className="h-4 w-4 rounded border-stone-300"
            />
            <span className="text-sm text-stone-700">Only invite patients flagged for ongoing care</span>
          </label>
          <button type="submit" className={primaryButtonClass}>
            Save rules
          </button>
        </form>
      </div>
    </ConsoleShell>
  );
}
