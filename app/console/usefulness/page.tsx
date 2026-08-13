// W15: usefulness-audit capture — one-tap GP form per attended generated visit.
// Copy stays factual and non-clinical (no patient names — synthetic de-identified
// labels only). Each visit is a single quick form: tap what happened, submit.

import { outcomesFor, pendingVisitsFor } from "@/audit/store";
import { tallyOutcomes, USEFULNESS_OPTIONS } from "@/audit/usefulness";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";
import { submitUsefulness } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  "1": "Something was missing from that submission — please try again.",
  unknown_option: "That option wasn't recognised.",
  unnecessary_conflict: "A visit can't be both unnecessary and have a recorded action.",
  reasonable_requires_action: "To mark a visit worthwhile, record at least one thing that happened.",
  unknown_visit: "That visit is no longer in the queue.",
  already_recorded: "That visit was already audited.",
  denied: "Your role cannot record visit outcomes.",
};

export default async function UsefulnessPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  // W209: the page reads THIS practice's queue. It used to read the whole store, which held
  // every practice's attended appointments under an id no console mints.
  const { email, record } = await requirePractice();
  const { saved, error } = await searchParams;
  const practiceId = record.practice.id;
  const pending = pendingVisitsFor(practiceId);
  const tally = tallyOutcomes(outcomesFor(practiceId));

  return (
    <ConsoleShell email={email}>
      <h1 className="text-2xl font-semibold tracking-tight">Usefulness audit</h1>
      <p className="mt-2 text-sm text-stone-500">
        For each attended appointment, tap what happened in the visit. One tap per item; it takes seconds.
      </p>

      {saved === "1" && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Saved. {pending.length} visit{pending.length === 1 ? "" : "s"} left to audit.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {ERROR_COPY[error] ?? ERROR_COPY["1"]}
        </p>
      )}

      <p className="mt-6 text-sm text-stone-500">
        Audited so far: <span className="font-medium text-stone-900">{tally.audited}</span>
        {tally.audited > 0 && <> · {tally.reasonablePct}% judged worthwhile</>}
      </p>

      {pending.length === 0 ? (
        <p className="mt-8 rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
          No visits waiting for audit. New attended appointments appear here.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {pending.map((visit) => (
            <form
              key={visit.appointmentId}
              action={submitUsefulness}
              className="rounded-xl border border-stone-200 bg-white p-6"
            >
              <input type="hidden" name="appointmentId" value={visit.appointmentId} />
              <div className="mb-4 flex items-baseline justify-between">
                <span className="font-medium text-stone-900">{visit.patientLabel}</span>
                <span className="text-xs text-stone-500">
                  {new Date(visit.attendedAt).toLocaleString("en-AU")}
                </span>
              </div>
              <fieldset className="flex flex-wrap gap-2">
                <legend className="sr-only">What happened in this visit</legend>
                {USEFULNESS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:border-stone-400 has-[:checked]:border-stone-800 has-[:checked]:bg-stone-900 has-[:checked]:text-white"
                  >
                    <input type="checkbox" name="usefulness" value={option.value} className="sr-only" />
                    {option.label}
                  </label>
                ))}
              </fieldset>
              <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    name="clinicianJudgedReasonable"
                    defaultChecked
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  This appointment was worthwhile
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-stone-900 px-5 py-2 font-medium text-white hover:bg-stone-700"
                >
                  Save
                </button>
              </div>
            </form>
          ))}
        </div>
      )}
    </ConsoleShell>
  );
}
