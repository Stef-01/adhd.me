// W81: a clinician states the case mix they would take more of.
//
// Copy discipline: every option is about APPETITE, never ability. There is no "expert" rung,
// because a self-reported one is exactly the claim W79's separation and the Ahpra advertising
// rules both exist to prevent. The page says outright that stating an interest does not by
// itself change who gets offered what — W82 holds that law.

import { redirect } from "next/navigation";
import { STRENGTH_LABELS, interestIn } from "@/capability/interest";
import { getInterestState } from "@/capability/store";
import { clinicianForEmail } from "@/console/clinician-identity";
import { getConsole } from "@/console/store";
import { getRegisters } from "@/registers/store";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";
import { stateInterest } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your case mix — CareYield" };

const ERROR_COPY: Record<string, string> = {
  denied: "You do not have access to that.",
  not_linked:
    "Your sign-in is not linked to a clinician on this practice's roster, so there is nobody to record a preference for.",
  not_own_interest: "You can only state your own case-mix preferences.",
  strength_out_of_range: "Choose one of the listed options.",
  unknown_condition: "That register no longer exists. The list has been refreshed.",
};

export default async function CaseMixPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  const { error, saved } = await searchParams;

  const identity = clinicianForEmail(record.clinicians, email);
  const registers = getRegisters().conditions.filter((c) => c.active);
  const state = getInterestState();

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Your case mix</h1>
          <p className="text-stone-600">
            Tell the practice how much of each kind of ongoing-care work you would take on.
            This is about the mix of work you want, not about how experienced you are — and
            saying yes here does not by itself change who is offered an appointment with you.
          </p>
        </div>

        {saved && (
          <p role="status" data-testid="case-mix-saved" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            Saved.
          </p>
        )}
        {error && (
          <p role="alert" data-testid="case-mix-error" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            {ERROR_COPY[error] ?? "That change could not be saved."}
          </p>
        )}

        {!identity.linked ? (
          <p data-testid="case-mix-unlinked" className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">
            {ERROR_COPY.not_linked}
          </p>
        ) : registers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">
            No registers are available yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {registers.map((condition) => {
              const current = interestIn(
                state,
                record.practice.id,
                identity.clinician.id,
                condition.code,
              );
              return (
                <li
                  key={condition.code}
                  data-testid={`case-mix-${condition.code}`}
                  className="rounded-lg border border-stone-200 bg-white p-5"
                >
                  <h2 className="font-medium text-stone-900">{condition.displayName}</h2>
                  <p className="mt-1 text-sm text-stone-600">{condition.description}</p>

                  <form action={stateInterest} className="mt-4 flex flex-wrap items-center gap-3">
                    <input type="hidden" name="conditionCode" value={condition.code} />
                    <label className="flex items-center gap-2 text-sm text-stone-700">
                      How much of this work would you take?
                      <select
                        name="strength"
                        defaultValue={current ? String(current.strength) : "none"}
                        data-testid={`strength-${condition.code}`}
                        className="rounded border border-stone-300 px-2 py-1"
                      >
                        <option value="none">Not stated</option>
                        {Object.entries(STRENGTH_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
                    >
                      Save
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ConsoleShell>
  );
}
