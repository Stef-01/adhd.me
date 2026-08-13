// W22: the presenter's page — launch/reset the scripted demo world and keep the
// patient-side booking links at hand while walking the console in another tab.
// Everything here is synthetic (founder gates G2/G3); the walkthrough script
// lives in docs/DEMO.md.

import { getStore } from "@/booking/store";
import { signBookingToken } from "@/booking/token";
import { getConsole } from "@/console/store";
import { DemoNavigator } from "../demo-navigator";
import { assertDemoEnabled } from "@/lib/demo-guard";
import { launchDemo } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  sent: "Sent — link live",
  booked: "Booked",
  expired: "Expired (session filled)",
  opted_out: "Opted out",
};

export default function DemoPage() {
  assertDemoEnabled();
  const live = getConsole().practices.length > 0;
  const rail = getStore();

  return (
    <div className="min-h-screen bg-stone-50">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <DemoNavigator />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Meherr demo</h1>
        <p className="mt-3 max-w-xl text-stone-500">
          A scripted synthetic practice: {rail.practiceName}, {rail.clinicianName}, one open
          session, three invited patients. No real patient data, no live SMS — the walkthrough
          script is docs/DEMO.md.
        </p>

        <form action={launchDemo} className="mt-8">
          <button
            type="submit"
            className="rounded-lg bg-stone-900 px-5 py-2.5 font-medium text-white hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            {live ? "Reset demo to the start" : "Launch demo"}
          </button>
        </form>

        {live && (
          <section className="mt-10 rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="font-medium text-stone-900">Patient booking links</h2>
            <p className="mt-1 text-sm text-stone-500">
              Open one in a second tab when the script reaches the patient moment. Statuses are
              live — return here after booking to show the third offer expiring.
            </p>
            <ul className="mt-4 divide-y divide-stone-100">
              {rail.state.invitations.map((inv, i) => (
                <li key={inv.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="text-stone-500">
                    Patient {i + 1} · {STATUS_LABEL[inv.status] ?? inv.status}
                  </span>
                  {inv.status === "sent" || inv.status === "queued" ? (
                    <a
                      href={`/book/${signBookingToken(inv.id)}`}
                      target="_blank"
                      className="font-medium text-stone-700 underline hover:text-stone-900"
                      data-testid={`booking-link-${i + 1}`}
                    >
                      Open booking link
                    </a>
                  ) : (
                    <span className="text-stone-500">link closed</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-stone-500">
              Console tabs for the walkthrough: <a className="underline" href="/console">practice</a> ·{" "}
              <a className="underline" href="/console/dashboard">incrementality</a> ·{" "}
              <a className="underline" href="/console/usefulness">usefulness</a> ·{" "}
              <a className="underline" href="/console/ops">admin ops</a> ·{" "}
              <a className="underline" href="/console/roi">ROI</a>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
