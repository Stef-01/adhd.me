"use client";

// Today (PRD §6): the single most useful next action — one card, one primary control. Before
// onboarding it is the door; after it, whatever the recommendation engine says; and when an
// experiment is waiting on "did this help?", that question comes first. A standing safety event
// replaces all of it with the safety screen.

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { isComplete } from "@/model/onboarding";
import { recommend } from "@/model/recommend";
import { acknowledgeSafety, activeSafety, recordOutcome, type ExperimentOutcome } from "@/model/store";
import { track } from "@/model/events";
import { profession } from "@/support/professions";
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
      <header className="life-head">
        <span className="life-eyebrow">Today</span>
        <h1>One useful thing.</h1>
        <p>Not a plan, not a streak. The next thing worth doing, and why.</p>
      </header>

      {!record && <p role="status" className="life-card">Reading what this device holds…</p>}

      {record && safety && (
        <SafetyScreen ruleId={safety.ruleId} onAcknowledge={() => refresh(acknowledgeSafety(storage))} />
      )}

      {record && !safety && !isComplete(record.onboarding) && (
        <section className="life-card is-lead" aria-labelledby="today-start">
          <span className="life-eyebrow">Start here</span>
          <h2 id="today-start">Two minutes so this app can be about you.</h2>
          <p>Ten short questions — where you are, what feels hardest, what helps. No score, nothing sent anywhere.</p>
          <div className="life-actions">
            <Link className="learn-primary" href="/start">Start <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>
            <Link className="learn-secondary" href="/approach?module=context">Just show me a module</Link>
          </div>
        </section>
      )}

      {record && !safety && isComplete(record.onboarding) && rec && (
        <section className="life-card is-lead" aria-labelledby="today-action" data-action={rec.action}>
          <span className="life-eyebrow">{ACTION_LABEL[rec.action]}</span>
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
              <Link className="learn-secondary" href="/my-adhd">My ADHD</Link>
            </div>
          )}
          {rec.professions && (
            <p className="learn-card-foot">{rec.professions.map((p) => profession(p).label).join(", ")} — in that order of fit.</p>
          )}
          <WhyThis why={rec.why} rule={rec.explain.ruleTriggered} inputs={rec.explain.inputsUsed} version={rec.explain.ruleVersion} />
        </section>
      )}

      {record && isComplete(record.onboarding) && (
        <section className="life-card" aria-labelledby="today-more">
          <h2 id="today-more">Or, on your own schedule</h2>
          <ul className="life-list">
            <li><Link href="/approach">Explore the modules</Link></li>
            <li><Link href="/approach/map">Open the care map</Link></li>
            <li><Link href="/support">See what kind of support fits</Link></li>
          </ul>
        </section>
      )}
    </main>
  );
}

const ACTION_LABEL: Record<string, string> = {
  LEARN: "Learn",
  TRY_STRATEGY: "Try",
  CHANGE_ENVIRONMENT: "Change something around you",
  INVOLVE_SUPPORT_PERSON: "Involve somebody",
  DISCUSS_WITH_EXISTING_CLINICIAN: "Worth a conversation",
  EXPLORE_PROVIDER: "Explore support",
  URGENT_ESCALATION: "Before anything else",
};
