"use client";

// Today (PRD §6): the single most useful next action — one card, one primary control. Before
// onboarding it is the door; after it, whatever the recommendation engine says; and when an
// experiment is waiting on "did this help?", that question comes first. A standing safety event
// replaces all of it with the safety screen.

import Link from "next/link";
import { LearningScene } from "./learning-scene";
import { ArrowRight } from "@phosphor-icons/react";
import { isComplete } from "@/model/onboarding";
import { recommend } from "@/model/recommend";
import { acknowledgeSafety, activeSafety, recordOutcome, type ExperimentOutcome } from "@/model/store";
import { track } from "@/model/events";
import { LifeHeader, WhyThis } from "./life-shell";
import { SafetyScreen } from "./safety-screen";
import { useModel } from "./use-model";

const OUTCOMES: ReadonlyArray<{ id: ExperimentOutcome; label: string }> = [
  { id: "a-lot", label: "A lot" },
  { id: "a-little", label: "A little" },
  { id: "no", label: "No" },
  { id: "didnt-try", label: "Didn’t try" },
];

export function Today() {
  const { record, refresh, storage } = useModel();
  const safety = record ? activeSafety(record) : null;
  const rec = record ? recommend(record) : null;

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs">
      <LifeHeader />
      {/* §14 Calm (founder, 2026-09-08): one card, one button, no labels. The heading is the page. */}
      <header className="life-head">
        <h1>One useful thing.</h1>
      </header>

      {!record && <p role="status" className="life-card">Reading what this device holds…</p>}

      {record && safety && (
        <SafetyScreen ruleId={safety.ruleId} onAcknowledge={() => refresh(acknowledgeSafety(storage))} />
      )}

      {record && !safety && !isComplete(record.onboarding) && (
        <section className="life-card is-lead" aria-labelledby="today-start">
          <h2 id="today-start">Two minutes so this app can be about you.</h2>
          <p>Ten short questions. Nothing is sent anywhere.</p>
          <div className="life-figure" aria-hidden="true"><LearningScene variant={1} /></div>
          <div className="life-actions">
            <Link className="learn-primary" href="/start">Start <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>
          </div>
        </section>
      )}

      {record && !safety && isComplete(record.onboarding) && rec && (
        <section className="life-card is-lead" aria-labelledby="today-action" data-action={rec.action}>
          <h2 id="today-action">{rec.heading}</h2>
          <p>{rec.body}</p>
          {rec.action === "TRY_STRATEGY" && rec.strategy && rec.explain.ruleTriggered === "experiment.pending" ? (
            <div className="resonance-row" role="group" aria-label="Did this help">
              {OUTCOMES.map((o) => (
                <button key={o.id} type="button" className="learn-chip" onClick={() => { refresh(recordOutcome(storage, rec.strategy!.id, o.id)); track("EXPERIMENT_OUTCOME_RECORDED", { strategy: rec.strategy!.id, outcome: o.id }); }}>{o.label}</button>
              ))}
            </div>
          ) : (
            <div className="life-actions">
              {rec.moduleId && rec.action === "LEARN" && <Link className="learn-primary" href={`/approach?module=${rec.moduleId}`}>Open the module <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>}
              {rec.strategy && rec.action !== "LEARN" && rec.moduleId && <Link className="learn-primary" href={`/approach?module=${rec.moduleId}`}>See it in the module <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>}
              {rec.action === "EXPLORE_PROVIDER" && <Link className="learn-primary" href="/support">See who could help <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>}
              {rec.action === "DISCUSS_WITH_EXISTING_CLINICIAN" && <Link className="learn-primary" href="/support">Prepare what to say <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>}
            </div>
          )}
          <WhyThis why={rec.why} rule={rec.explain.ruleTriggered} inputs={rec.explain.inputsUsed} version={rec.explain.ruleVersion} />
        </section>
      )}

    </main>
  );
}
