// W246: the interop console.
//
// A renderer over `src/console/interop.ts`. Two things are settled here and both are about what the
// styling would claim if it were allowed to.
//
// NO GREEN, NO TICK, NO STATUS LIGHT. A practice that believes its referrals are flowing will stop
// chasing them, and a dashboard of correct zeroes in a calm colour says exactly that. Every count is
// rendered in the body colour with its meaning beside it, and the page carries no success styling at
// all — asserted through a canvas in the e2e, because this decision lives entirely in CSS.
//
// THE ABSENCES COME FIRST. What has not been exchanged is longer, more useful and more honest than
// what has, so it is above the counts rather than under them. A reader who stops after the first
// screen should stop having read the true thing.

import Link from "next/link";
import { redirect } from "next/navigation";
import { interopView } from "@/console/interop";
import { getConsole } from "@/console/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "What has been exchanged — ADHD.ME" };

export default async function InteropPage() {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  if (!authorize(console_.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console");
  }

  const view = interopView();

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">What has been exchanged</h1>
          <p data-testid="interop-headline" className="max-w-3xl text-stone-600">
            {view.headline}
          </p>
        </div>

        <section aria-labelledby="gate-heading" className="flex flex-col gap-2">
          <h2 id="gate-heading" className="font-medium text-stone-900">
            Why there is no integration
          </h2>
          <p data-testid="interop-gate" className="max-w-3xl rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
            {view.gate.refusal}
          </p>
        </section>

        {/* The absences first — see the header note. */}
        <section aria-labelledby="not-exchanged-heading" className="flex flex-col gap-3">
          <h2 id="not-exchanged-heading" className="font-medium text-stone-900">
            What is not being sent, and why
          </h2>
          <ul data-testid="interop-not-exchanged" className="flex flex-col gap-4 text-sm text-stone-600">
            {view.notExchanged.map((item) => (
              <li key={item.what} className="flex flex-col gap-1">
                <span className="text-stone-900">{item.what}</span>
                <span>{item.why}</span>
                <span className="text-xs text-stone-500">Declared in {item.declaredIn}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="counts-heading" className="flex flex-col gap-3">
          <h2 id="counts-heading" className="font-medium text-stone-900">
            Counts
          </h2>
          <dl data-testid="interop-counts" className="grid gap-3 sm:grid-cols-2">
            {view.exchanged.map((row) => (
              // Deliberately identical styling for every row, and no colour on the number. A zero
              // in a calm green is a claim that everything succeeded.
              <div
                key={row.label}
                // Keyed on the label, never the value: all four counts are currently 0, so a
                // value-keyed testid is four identical hooks that rename themselves the day a
                // number changes.
                data-testid={`interop-count-${row.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                className="flex flex-col gap-1 rounded-lg border border-stone-200 bg-white px-4 py-3"
              >
                <dt className="text-sm text-stone-600">{row.label}</dt>
                <dd className="flex flex-col gap-1">
                  <span className="text-2xl font-semibold tabular-nums text-stone-900">{row.count}</span>
                  {/* The meaning travels with the number, never as a footnote. */}
                  <span className="text-xs text-stone-500">{row.meaning}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-sm">
          <Link href="/console/capacity" className="text-stone-600 underline">
            How full the sessions run
          </Link>
        </p>
      </div>
    </ConsoleShell>
  );
}
