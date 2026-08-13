// W60: register console — the practice sees its registers, the intervals behind them
// and its gap counts, and can switch any register off for itself alone.
//
// Copy discipline: this page describes scheduling, never care. It says a review is
// "due by the practice's schedule", not that a patient needs anything — the clinical
// boundary W58 types is also a copy boundary here.

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import { toViewIntervals } from "@/registers/provenance";
import { registersFor } from "@/registers/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";
import { toggleRegister } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Registers — Meherr" };

const ERROR_COPY: Record<string, string> = {
  denied: "You do not have permission to change registers.",
  unknown_register: "That register no longer exists. The list has been refreshed.",
};

export default async function RegistersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  const { error } = await searchParams;

  const practiceId = record.practice.id;
  const registers = registersFor(practiceId);
  // Injected once per render so every relative review age on the page agrees.
  const now = new Date();
  const canEdit = authorize(console_.memberships, email, practiceId, "edit_rules").allowed;

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Registers</h1>
          <p className="text-stone-600">
            A register is a group of patients your practice already manages for ongoing care.
            Meherr uses it to decide who to offer an appointment to when a session has room
            — never to decide anything about their care.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            {ERROR_COPY[error] ?? "That change could not be applied."}
          </p>
        )}

        {registers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">
            No registers are available yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {registers.map(({ condition, intervals, enabled, counts }) => (
              <li
                key={condition.code}
                data-testid={`register-${condition.code}`}
                className="rounded-lg border border-stone-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="font-medium text-stone-900">{condition.displayName}</h2>
                    <p className="text-sm text-stone-600">{condition.description}</p>
                  </div>
                  <span
                    data-testid={`status-${condition.code}`}
                    className={
                      enabled
                        ? "shrink-0 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white"
                        : "shrink-0 rounded-full bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700"
                    }
                  >
                    {enabled ? "On" : "Off"}
                  </span>
                </div>

                <dl className="mt-4 flex gap-8">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-stone-500">On this register</dt>
                    <dd data-testid={`members-${condition.code}`} className="text-xl font-semibold text-stone-900">
                      {counts.memberCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-stone-500">Due by schedule</dt>
                    <dd data-testid={`gaps-${condition.code}`} className="text-xl font-semibold text-stone-900">
                      {counts.gapCount}
                    </dd>
                  </div>
                </dl>

                {/* W62: intervals reach the page only as ViewIntervals, which cannot be
                    constructed without a complete provenance line — so an interval row
                    without a visible source is not expressible here. */}
                <ul className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-4">
                  {(() => {
                    const { shown, withheld } = toViewIntervals(intervals, now);
                    return (
                      <>
                        {shown.map((interval) => (
                          <li
                            key={interval.id}
                            data-testid="interval-row"
                            className="text-sm text-stone-600"
                          >
                            <span className="text-stone-800">{interval.name}</span> —{" "}
                            {interval.cadence}.
                            <span
                              data-testid="interval-provenance"
                              className="mt-0.5 block text-stone-500"
                            >
                              Source:{" "}
                              <a
                                href={interval.provenance.url}
                                className="underline hover:text-stone-800"
                                rel="noreferrer noopener"
                                target="_blank"
                              >
                                {interval.provenance.citation}
                              </a>{" "}
                              · last reviewed {interval.provenance.reviewedOn} (
                              {interval.provenance.reviewedAgo})
                            </span>
                          </li>
                        ))}
                        {withheld > 0 && (
                          <li data-testid="interval-withheld" className="text-sm text-stone-600">
                            {withheld} {withheld === 1 ? "interval is" : "intervals are"} hidden
                            because the source could not be shown. Nothing is scheduled from a
                            source this practice cannot see.
                          </li>
                        )}
                      </>
                    );
                  })()}
                </ul>

                {canEdit && (
                  <form action={toggleRegister} className="mt-4">
                    <input type="hidden" name="conditionCode" value={condition.code} />
                    <input type="hidden" name="enable" value={enabled ? "0" : "1"} />
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
                    >
                      {enabled ? "Turn off for this practice" : "Turn on for this practice"}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ConsoleShell>
  );
}
