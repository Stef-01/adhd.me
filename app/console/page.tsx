import Link from "next/link";
import { redirect } from "next/navigation";
import { openComplaintCount } from "@/complaints/store";
import { getConsole, practicesFor } from "@/console/store";
import { requirePractice } from "./guard";
import { ConsoleShell } from "./ui";

export const dynamic = "force-dynamic";

export default async function ConsoleHome() {
  const { email, record } = await requirePractice();
  const state = getConsole();

  const rules = record.rulesConfig;
  const settings: Array<[string, string]> = [
    ["Minimum days since last visit", `${rules.minDaysSinceLastVisit} days`],
    ["Existing-booking block window", `${rules.futureBookingBlockDays} days`],
    ["Invitation cap per quarter", `${rules.maxInvitesPerQuarter}`],
    ["Usual GP only", rules.usualClinicianOnly ? "Yes" : "No"],
    ["Ongoing-care patients only", rules.chronicCareOnly ? "Yes" : "No"],
  ];

  // W206: scoped. This counted the whole store, so a practice with no complaints of its own
  // was told to review somebody else's.
  const openComplaints = openComplaintCount(record.practice.id as string);

  return (
    <ConsoleShell
      email={email}
      practices={practicesFor(email).map((r) => ({ id: r.practice.id as string, name: r.practice.name }))}
      activeId={record.practice.id as string}
    >
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{record.practice.name}</h1>
        <span className="text-sm text-stone-500">
          {record.practice.timezone} · holdout {Math.round(record.practice.holdoutRate * 100)}%
        </span>
      </div>

      {openComplaints > 0 && (
        <Link
          href="/console/complaints"
          data-testid="complaint-banner"
          className="mt-4 block rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          {openComplaints} open complaint{openComplaints === 1 ? "" : "s"} — review now. Sending
          pauses are one click away in Admin ops.
        </Link>
      )}

      {/* O149: wraps. Nine links in a non-wrapping row reached x=548 in a 390px viewport and took
          the whole document sideways with them. */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        <Link
          href="/console/results"
          className="-my-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Your results
        </Link>
        <Link
          href="/console/dashboard"
          className="-my-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Incrementality dashboard
        </Link>
        <Link
          href="/console/usefulness"
          className="-my-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Usefulness audit
        </Link>
        <Link
          href="/console/outreach"
          className="-my-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Outreach
        </Link>
        <Link
          href="/console/ops"
          className="-my-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Admin ops
        </Link>
        <Link
          href="/console/roi"
          className="-my-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          ROI calculator
        </Link>
        <Link
          href="/console/privacy"
          className="-my-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Privacy
        </Link>
        <Link
          href="/console/complaints"
          className="-my-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Complaints
        </Link>
        <Link
          href="/console/setup/practice"
          className="-my-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          {record.setupCompletedAt ? "Setup" : "Finish setup"}
        </Link>
      </div>

      <section className="mt-8 rounded-xl border border-stone-200 bg-white p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-medium text-stone-900">Eligibility rules</h2>
          <span className="text-xs text-stone-500">version {record.rulesVersion}</span>
        </div>
        <dl className="divide-y divide-stone-100">
          {settings.map(([term, value]) => (
            <div key={term} className="flex justify-between py-2.5">
              <dt className="text-sm text-stone-500">{term}</dt>
              <dd className="text-sm font-medium text-stone-900">{value}</dd>
            </div>
          ))}
        </dl>
        <Link
          href="/console/rules"
          className="mt-4 -mb-0.5 inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium text-stone-700 underline hover:text-stone-900"
        >
          Edit rules
        </Link>
      </section>
    </ConsoleShell>
  );
}
