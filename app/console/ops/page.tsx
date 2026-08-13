// W19: admin ops console — invitation queue visibility, the global kill-switch,
// and per-practice pause. Factual, operational copy; no clinical content.

import { feedEvidenceFor, getOps, queueView } from "@/ops/store";
import { SILENCE_COPY, readCount } from "@/ops/silence";
import { canSend, isPracticePaused } from "@/ops/switches";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";
import { toggleKillSwitch, togglePracticePause } from "./actions";

export const dynamic = "force-dynamic";

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { email, record } = await requirePractice();
  const { error } = await searchParams;

  const practiceId = record.practice.id;
  const ops = getOps();
  const queue = queueView(practiceId);
  const killed = ops.switches.killSwitch;
  const paused = isPracticePaused(ops.switches, practiceId);
  const sending = canSend(ops.switches, practiceId);
  // The zero and its cause are computed together, so the page cannot render one without the other.
  const reading = readCount(queue.outstanding.length, feedEvidenceFor(practiceId), !sending);

  const statuses: Array<[string, number]> = [
    ["Queued", queue.counts.queued],
    ["Sent", queue.counts.sent],
    ["Booked", queue.counts.booked],
    ["Expired", queue.counts.expired],
    ["Opted out", queue.counts.opted_out],
  ];

  return (
    <ConsoleShell email={email}>
      <h1 className="text-2xl font-semibold tracking-tight">Admin ops</h1>
      <p className="mt-2 text-sm text-stone-500">
        Live invitation queue and the controls to halt sending. Halting never affects appointments
        already booked.
      </p>

      {error === "denied" && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your role can't change sending controls.
        </p>
      )}

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-1 font-medium text-stone-900">Sending status</h2>
        <p className={`text-sm ${sending ? "text-emerald-700" : "text-red-700"}`} data-testid="sending-status">
          {sending ? "Sending is active" : killed ? "Sending halted — kill switch engaged" : "Sending paused for this practice"}
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <form action={toggleKillSwitch}>
            <input type="hidden" name="engage" value={killed ? "0" : "1"} />
            <button
              type="submit"
              className={`rounded-lg px-5 py-2.5 font-medium text-white ${killed ? "bg-emerald-700 hover:bg-emerald-600" : "bg-red-700 hover:bg-red-600"}`}
            >
              {killed ? "Release kill switch" : "Engage kill switch"}
            </button>
          </form>
          <form action={togglePracticePause}>
            <input type="hidden" name="pause" value={paused ? "0" : "1"} />
            <button
              type="submit"
              className="rounded-lg border border-stone-300 px-5 py-2.5 font-medium text-stone-800 hover:border-stone-500"
            >
              {paused ? "Resume this practice" : "Pause this practice"}
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-medium text-stone-900">Invitation queue</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {statuses.map(([label, count]) => (
            <div key={label} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <dt className="text-xs text-stone-500">{label}</dt>
              <dd className="text-lg font-semibold text-stone-900">{count}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 mb-2 text-sm font-medium text-stone-700">
          Outstanding offers ({queue.outstanding.length})
        </h3>
        {reading.kind === "none" ? (
          // W179: a zero that says WHICH zero it is. "No offers outstanding" was true of a quiet
          // week and of a feed that died on Tuesday, and those send an operator opposite ways.
          <div className="flex flex-col gap-3" data-testid="silence">
            {reading.causes.map((cause) => (
              <div
                key={cause}
                data-testid={`silence-${cause}`}
                className="rounded-lg border border-stone-200 bg-stone-50 p-4"
              >
                <p className="text-sm font-medium text-stone-900">{SILENCE_COPY[cause].headline}</p>
                <p className="mt-1 text-sm text-stone-600">{SILENCE_COPY[cause].detail}</p>
                <p className="mt-2 text-sm text-stone-800">{SILENCE_COPY[cause].action}</p>
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {queue.outstanding.map((o) => (
              <li key={o.id} className="flex justify-between py-2">
                <span className="text-stone-700">{o.id}</span>
                <span className="text-stone-500">
                  {o.sessionDate} · {o.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ConsoleShell>
  );
}
