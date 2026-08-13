// W41: practice onboarding wizard — self-serve configuration in one sitting.
// Five short steps, each independently saveable, with a visible progress rail so a
// practice manager always knows how much is left. Every input is something the
// practice already knows; nothing here waits on Meherr, so setup never blocks
// on us. Copy stays operational — no clinical claims (CLAUDE.md law 6).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getConsole, setupReadiness } from "@/console/store";
import { isSetupStep, SETUP_STEPS, stepIndex, type SetupStepSlug } from "@/console/setup-steps";
import { APPOINTMENT_TYPES } from "@/session/config";
import { requirePracticeOptional } from "../../guard";
import { ConsoleShell, Field, inputClass, primaryButtonClass } from "../../ui";
import {
  finishSetup,
  saveStepClinicians,
  saveStepPractice,
  saveStepRules,
  saveStepSessions,
} from "../actions";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  standard: "Standard consultation",
  long: "Long consultation",
  telehealth: "Telehealth (phone/video)",
};

// Errors arrive as a KEY in the query string and are mapped to copy here, so a
// crafted link can never render arbitrary text inside the console.
const SETUP_ERROR_COPY: Record<string, string> = {
  form: "That step couldn't be saved — please check the values and try again.",
  name: "Enter a practice name of at least two characters.",
  timezone: "Use an IANA timezone like Australia/Sydney.",
  holdoutPercent: "Holdout must be between 0 and 50 percent.",
  clinicians: "Add at least one clinician, with unique names, and at least one participating.",
  fillableTypes: "Choose at least one appointment type to fill.",
  protectedCapacityFraction: "Protected capacity must be between 0 and 100 percent.",
  startHour: "Hours must be whole numbers between 0 and 24.",
  endHour: "The offering window must end after it starts.",
  participatingClinicianIds: "Choose at least one participating clinician.",
  minDaysSinceLastVisit: "Minimum days since last visit must be a whole number.",
  futureBookingBlockDays: "The existing-booking window must be a whole number of days.",
  maxInvitesPerQuarter: "The invitation cap must be a whole number between 0 and 12.",
};

const SETUP_ERROR_FALLBACK = SETUP_ERROR_COPY.form!;

function errorCopy(key: string | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("clinician-")) return "Each clinician's name must be at least two characters.";
  return SETUP_ERROR_COPY[key] ?? SETUP_ERROR_FALLBACK;
}

function ProgressRail({ current }: { current: SetupStepSlug }) {
  const index = stepIndex(current);
  return (
    <ol className="mb-8 flex flex-wrap gap-2" aria-label="Setup progress">
      {SETUP_STEPS.map((step, i) => {
        const state = i < index ? "done" : i === index ? "current" : "todo";
        return (
          <li
            key={step.slug}
            aria-current={state === "current" ? "step" : undefined}
            className={
              "rounded-lg border px-3 py-1.5 text-sm " +
              (state === "current"
                ? "border-stone-800 bg-stone-900 text-white"
                : state === "done"
                  ? "border-stone-300 text-stone-700"
                  : "border-stone-200 text-stone-500")
            }
          >
            {i + 1}. {step.title}
            {state === "done" && <span aria-hidden> ✓</span>}
          </li>
        );
      })}
    </ol>
  );
}

export default async function SetupStepPage({
  params,
  searchParams,
}: {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { email, record } = await requirePracticeOptional();
  const { step } = await params;
  if (!isSetupStep(step)) notFound();
  const { error } = await searchParams;
  const state = getConsole();
  const definition = SETUP_STEPS[stepIndex(step)]!;

  // Every step after the first needs a practice to attach to.
  if (step !== "practice" && !record) redirect("/console/setup/practice");
  // Past that redirect every step but the first has a practice. Narrowed once here
  // rather than with a non-null assertion at each of the twenty reads below.


  const readiness = setupReadiness(record);

  return (
    <ConsoleShell email={email}>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your practice</h1>
        <p className="mt-2 text-sm text-stone-500">
          Step {stepIndex(step) + 1} of {SETUP_STEPS.length} — {definition.blurb}
        </p>
        <div className="mt-6">
          <ProgressRail current={step} />
        </div>

        {errorCopy(error) && (
          <p
            data-testid="setup-error"
            className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {errorCopy(error)}
          </p>
        )}

        {step === "practice" &&
          (record ? (
            <section className="rounded-xl border border-stone-200 bg-white p-6">
              <p className="text-stone-700">
                <span className="font-medium">{record!.practice.name}</span> is set up —{" "}
                {record!.practice.timezone}, holdout {Math.round(record!.practice.holdoutRate * 100)}%.
              </p>
              <Link
                href="/console/setup/clinicians"
                className="mt-4 inline-block rounded-lg bg-stone-900 px-5 py-2.5 font-medium text-white hover:bg-stone-700"
              >
                Continue
              </Link>
            </section>
          ) : (
            <form action={saveStepPractice} className="flex flex-col gap-5">
              <Field label="Practice name">
                <input name="name" required minLength={2} className={inputClass} />
              </Field>
              <Field label="Timezone" hint="IANA name, e.g. Australia/Sydney">
                <input name="timezone" required defaultValue="Australia/Sydney" className={inputClass} />
              </Field>
              <Field
                label="Holdout share (%)"
                hint="Share of eligible patients never invited, so incremental impact stays measurable."
              >
                <input name="holdoutPercent" type="number" required min={0} max={50} defaultValue={10} className={inputClass} />
              </Field>
              <button type="submit" className={primaryButtonClass}>
                Save and continue
              </button>
            </form>
          ))}

        {step === "clinicians" && (
          <form action={saveStepClinicians} className="flex flex-col gap-5">
            <p className="text-sm text-stone-500">
              Add each clinician, and tick the ones who want availability invitations sent for them.
            </p>
            {Array.from({ length: 6 }, (_, i) => {
              const existing = record!.clinicians[i];
              return (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1">
                    {/* Carries the saved id so edits keep clinician identity stable. */}
                    <input type="hidden" name="clinicianId" value={existing?.id ?? ""} />
                    <Field label={`Clinician ${i + 1}`}>
                      <input
                        name="clinicianName"
                        defaultValue={existing?.displayName ?? ""}
                        placeholder={i === 0 ? "Dr Amara Lee" : ""}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 pb-2.5 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      name="participating"
                      value={i}
                      defaultChecked={existing?.participating ?? i === 0}
                      className="h-4 w-4 rounded border-stone-300"
                    />
                    Participating
                  </label>
                </div>
              );
            })}
            <button type="submit" className={primaryButtonClass}>
              Save and continue
            </button>
          </form>
        )}

        {step === "sessions" && (
          <form action={saveStepSessions} className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-stone-700">Appointment types we may fill</legend>
              {APPOINTMENT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    name="fillableTypes"
                    value={type}
                    defaultChecked={record!.sessionConfig.fillableTypes.includes(type)}
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  {TYPE_LABELS[type] ?? type}
                </label>
              ))}
            </fieldset>

            <Field
              label="Protected capacity (%)"
              hint="Share of each session's open slots we never offer, kept for same-day demand."
            >
              <input
                name="protectedCapacityPercent"
                type="number"
                min={0}
                max={100}
                defaultValue={Math.round(record!.sessionConfig.protectedCapacityFraction * 100)}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Offer slots from (hour)" hint="24-hour clock, practice local time.">
                <input
                  name="startHour"
                  type="number"
                  min={0}
                  max={24}
                  defaultValue={record!.sessionConfig.schedulingWindow.startHour}
                  className={inputClass}
                />
              </Field>
              <Field label="Offer slots until (hour)">
                <input
                  name="endHour"
                  type="number"
                  min={0}
                  max={24}
                  defaultValue={record!.sessionConfig.schedulingWindow.endHour}
                  className={inputClass}
                />
              </Field>
            </div>

            {record!.clinicians.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-stone-700">
                  Offer sessions for (leave all unticked for every participating clinician)
                </legend>
                {record!.clinicians
                  .filter((c) => c.participating)
                  .map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        name="participatingClinicianIds"
                        value={c.id}
                        defaultChecked={
                          record!.sessionConfig.participatingClinicianIds !== "all" &&
                          record!.sessionConfig.participatingClinicianIds.includes(c.id)
                        }
                        className="h-4 w-4 rounded border-stone-300"
                      />
                      {c.displayName}
                    </label>
                  ))}
              </fieldset>
            )}

            <button type="submit" className={primaryButtonClass}>
              Save and continue
            </button>
          </form>
        )}

        {step === "rules" && (
          <form action={saveStepRules} className="flex flex-col gap-5">
            <Field label="Minimum days since last visit" hint="Never invite anyone seen more recently.">
              <input
                name="minDaysSinceLastVisit"
                type="number"
                required
                min={0}
                max={3650}
                defaultValue={record!.rulesConfig.minDaysSinceLastVisit}
                className={inputClass}
              />
            </Field>
            <Field label="Existing-booking block window (days)">
              <input
                name="futureBookingBlockDays"
                type="number"
                required
                min={0}
                max={365}
                defaultValue={record!.rulesConfig.futureBookingBlockDays}
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
                defaultValue={record!.rulesConfig.maxInvitesPerQuarter}
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-3">
              <input
                name="usualClinicianOnly"
                type="checkbox"
                defaultChecked={record!.rulesConfig.usualClinicianOnly}
                className="h-4 w-4 rounded border-stone-300"
              />
              <span className="text-sm text-stone-700">Only invite patients of the clinician with availability</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                name="chronicCareOnly"
                type="checkbox"
                defaultChecked={record!.rulesConfig.chronicCareOnly}
                className="h-4 w-4 rounded border-stone-300"
              />
              <span className="text-sm text-stone-700">Only invite patients flagged for ongoing care</span>
            </label>
            <button type="submit" className={primaryButtonClass}>
              Save and continue
            </button>
          </form>
        )}

        {step === "review" && (
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 font-medium text-stone-900">Ready to go</h2>
              <dl className="divide-y divide-stone-100">
                {(
                  [
                    ["Practice", record!.practice?.name ?? "—", readiness.practice],
                    [
                      "Participating clinicians",
                      String(record!.clinicians.filter((c) => c.participating).length),
                      readiness.clinicians,
                    ],
                    [
                      "Appointment types filled",
                      record!.sessionConfig.fillableTypes.map((t) => TYPE_LABELS[t] ?? t).join(", ") || "—",
                      readiness.sessions,
                    ],
                    [
                      "Offering window",
                      `${record!.sessionConfig.schedulingWindow.startHour}:00–${record!.sessionConfig.schedulingWindow.endHour}:00, ` +
                        `${Math.round(record!.sessionConfig.protectedCapacityFraction * 100)}% protected`,
                      readiness.sessions,
                    ],
                    [
                      "Eligibility",
                      `${record!.rulesConfig.minDaysSinceLastVisit} days since last visit, ` +
                        `max ${record!.rulesConfig.maxInvitesPerQuarter}/quarter`,
                      readiness.rules,
                    ],
                  ] as Array<[string, string, boolean]>
                ).map(([term, value, ok]) => (
                  <div key={term} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-stone-500">{term}</dt>
                    <dd className="text-right text-sm font-medium text-stone-900">
                      {value} <span className={ok ? "text-emerald-700" : "text-amber-700"}>{ok ? "✓" : "!"}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {record!.setupCompletedAt ? (
              <p data-testid="setup-complete" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Setup complete. Your practice is ready.
              </p>
            ) : (
              <form action={finishSetup}>
                <button type="submit" className={primaryButtonClass}>
                  Finish setup
                </button>
              </form>
            )}

            <Link href="/console" className="text-sm font-medium text-stone-700 underline hover:text-stone-900">
              Back to the console
            </Link>
          </div>
        )}
      </div>
    </ConsoleShell>
  );
}
