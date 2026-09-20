"use client";

// What you have tried, and how it went.
//
// This used to be two cards at the bottom of the hub — "Insight cards" and "Strategy history" —
// which is a filing cabinet under a picture of somebody's life. It is a real record and worth
// keeping; it is simply not what a person opens the tab to see. One word in the hub's footer row
// reaches it, and everything here is the person's own answer to something.

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import { INTERACTIVE_MODULES } from "@/learn/interactive";
import { recordInsight, type ExperimentOutcome, type InsightVerdict } from "@/model/store";
import { LifeHeader } from "./life-shell";
import { useModel } from "./use-model";

const OUTCOMES: ReadonlyArray<{ id: ExperimentOutcome | "pending"; title: string }> = [
  { id: "a-lot", title: "Helped a lot" },
  { id: "a-little", title: "Helped a little" },
  { id: "no", title: "Did not help" },
  { id: "didnt-try", title: "Not tried" },
  { id: "pending", title: "Still testing" },
];

const VERDICTS: ReadonlyArray<{ id: InsightVerdict; label: string }> = [
  { id: "yes", label: "Yes" },
  { id: "partly", label: "Partly" },
  { id: "no", label: "Not really" },
];

/* Every id the app can write comes from a strategy step of an interactive module — `runs.ts`
   resolves through `strategyOf`, which throws at module load rather than inventing an id, and the
   survey result offers a strategy from the same modules. So an id that does not resolve means a
   record written by an older release naming a strategy that has since been renamed or retired,
   which `readModel` accepts without validating. It used to return the id, which put a slug like
   "wind-down" on screen under "Helped a lot". A name the app has lost tells a person nothing and a
   slug tells them it is broken, so the entry is dropped instead. */
function strategyTitle(id: string): string | null {
  for (const m of INTERACTIVE_MODULES) {
    for (const s of m.steps) {
      if (s.kind !== "strategy") continue;
      const found = s.strategies.find((x) => x.id === id);
      if (found) return found.title;
    }
  }
  return null;
}

const INSIGHTS = INTERACTIVE_MODULES.flatMap((m) =>
  m.steps
    .filter((s) => s.kind === "insight")
    .map((s) => ({ id: (s as { id: string }).id, heading: (s as { heading: string }).heading })),
);

export function MyAdhdHistory() {
  const { record, refresh, storage } = useModel();
  const experiments = record?.experiments ?? [];
  const answered = INSIGHTS.filter((i) => record?.insights[i.id]);

  return (
    <main id="main-content" className="me-screen life-screen map-screen app-page-with-tabs">
      <LifeHeader />
      <header className="life-head">
        <Link className="learn-back" href="/my-adhd">
          <ArrowLeft size={16} weight="bold" aria-hidden="true" /> My ADHD
        </Link>
        <h1>What you tried.</h1>
      </header>

      {record && experiments.length === 0 && answered.length === 0 && (
        <p className="map-stands-out">Nothing yet.</p>
      )}

      {OUTCOMES.map(({ id, title }) => {
        /* Named first, so an outcome whose only entries the app can no longer name does not render
           an empty heading over an empty list. */
        const list = experiments
          .filter((e) => (e.outcome ?? "pending") === id)
          .map((e) => ({ id: e.strategyId, name: strategyTitle(e.strategyId) }))
          .filter((e): e is { id: string; name: string } => e.name !== null);
        if (list.length === 0) return null;
        return (
          <section key={id} className="map-history" aria-labelledby={`history-${id}`}>
            <h2 id={`history-${id}`}>{title}</h2>
            <ul>
              {list.map((e) => (
                <li key={e.id}>{e.name}</li>
              ))}
            </ul>
          </section>
        );
      })}

      {record && answered.length > 0 && (
        <section className="map-history" aria-labelledby="history-insights">
          <h2 id="history-insights">What fitted</h2>
          <ul className="map-verdicts">
            {answered.map((i) => (
              <li key={i.id}>
                <p>{i.heading}</p>
                <div className="resonance-row" role="group" aria-label={`Does “${i.heading}” fit`}>
                  {VERDICTS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="learn-chip"
                      aria-pressed={record.insights[i.id] === v.id}
                      onClick={() => refresh(recordInsight(storage, i.id, v.id))}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
