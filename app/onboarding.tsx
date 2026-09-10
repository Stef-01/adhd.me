"use client";


// The ten-question onboarding (PRD §8–§10), one question a screen. Back is allowed, skip where the
// question says so, and every answer is written to the device the moment it is given, so closing
// the tab halfway loses nothing. The end is not a score: it is one sentence about the person's
// priority and one module to start.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { improveOption, improveOptions, isComplete, QUESTIONS, type OnboardingAnswers } from "@/model/onboarding";
import { completeOnboarding, saveOnboarding } from "@/model/store";
import { recommend } from "@/model/recommend";
import { interactiveModule } from "@/learn/interactive";
import { track } from "@/model/events";
import { CharacterMark } from "./characters";
import { useModel } from "./use-model";

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;

export function Onboarding() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { record, refresh, storage } = useModel();
  /** -1 is the welcome screen; 0–9 the questions; 10 the "Start here" screen. */
  const [index, setIndex] = useState(-1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const answers: OnboardingAnswers = record?.onboarding ?? {};

  useEffect(() => {
    if (record && isComplete(record.onboarding)) setIndex(10);
  }, [record]);

  const question = QUESTIONS[index];
  const options = useMemo(() => (question?.key === "improveFirst" ? [...improveOptions(answers), { id: "other", label: "Something else" }] : question?.options ?? []), [question, answers]);

  const go = (next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const save = (patch: Partial<OnboardingAnswers>) => {
    refresh(saveOnboarding(storage, patch));
    if (question) track("ONBOARDING_QUESTION_ANSWERED", { question: String(question.key) });
  };
  const forward = () => {
    if (index === 9) {
      refresh(completeOnboarding(storage));
      track("ONBOARDING_COMPLETED");
      go(10);
      return;
    }
    go(index + 1);
  };

  const current = question ? answers[question.key] : undefined;
  const answered = question?.kind === "multi" ? Array.isArray(current) && current.length > 0 : current !== undefined;
  const canForward = Boolean(question && (answered || question.skippable));

  return (
    <main id="main-content" className="me-screen life-screen onboarding-screen app-page-with-tabs">
      <div className="minimal-header me-chrome">
        <Link className="wordmark finder-wordmark" href="/" aria-label="ADHD.ME, back to the finder" translate="no">ADHD.ME</Link>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          className="onboarding-question"
          initial={reducedMotion ? false : { opacity: 0, x: 24 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, x: -16 * direction, transition: { duration: 0.12 } }}
          transition={{ ...SPRING, opacity: { duration: 0.2 } }}
        >
          {index === -1 && (
            <div className="onboarding-welcome">
              <div className="onboarding-cast" aria-hidden="true">
                <CharacterMark who="alex" mood="engaged" /><CharacterMark who="maya" mood="pleased" /><CharacterMark who="jordan" mood="neutral" /><CharacterMark who="sam" mood="pleased" /><CharacterMark who="priya" mood="engaged" />
              </div>
              <h1>ADHD affects much more than attention.</h1>
              <div className="life-actions">
                <button type="button" className="learn-primary" onClick={() => { track("ONBOARDING_STARTED"); go(0); }}>Start <ArrowRight size={17} weight="bold" aria-hidden="true" /></button>
                <button type="button" className="learn-secondary" onClick={() => { track("ONBOARDING_STARTED", { supporting: true }); refresh(saveOnboarding(storage, { stage: "supporting" })); go(1); }}>I’m supporting someone else</button>
              </div>
              <p className="learn-card-foot">Ten short questions, under two minutes.</p>
            </div>
          )}

          {question && (
            <>
              <ol className="onboarding-progress" aria-hidden="true">
                {QUESTIONS.map((q, i) => <li key={q.key} className={i < index ? "is-done" : i === index ? "is-current" : ""} />)}
              </ol>
              <p className="life-eyebrow">Question {index + 1} of {QUESTIONS.length}</p>
              <h1 tabIndex={-1}>{question.prompt}</h1>
              {question.note && <p className="onboarding-note">{question.note}</p>}
              {question.kind === "scale" ? (
                <label className="onboarding-scale">
                  <span className="sr-only">{question.prompt}</span>
                  <output aria-live="polite">{typeof current === "number" ? current : 5}</output>
                  <input type="range" min={0} max={10} step={1} value={typeof current === "number" ? current : 5} aria-valuetext={`${typeof current === "number" ? current : 5} out of 10`} onChange={(e) => save({ impact: Number(e.target.value) })} />
                  <span className="resonance-scale-ends" aria-hidden="true"><span>Not at all</span><span>Constantly</span></span>
                </label>
              ) : (
                <ul className="onboarding-options" aria-label="Options">
                  {options.map((o) => {
                    const selected = question.kind === "multi" ? (Array.isArray(current) ? (current as readonly string[]).includes(o.id) : false) : current === o.id;
                    return (
                      <li key={o.id}>
                        <button
                          type="button"
                          className={`learn-option${selected ? " is-right" : ""}`}
                          aria-pressed={selected}
                          onClick={() => {
                            if (question.kind === "multi") {
                              const list: string[] = Array.isArray(current) ? [...(current as readonly string[])] : [];
                              const next = selected ? list.filter((x) => x !== o.id) : [...list, o.id].slice(-(question.max ?? 3));
                              save({ [question.key]: next } as Partial<OnboardingAnswers>);
                            } else {
                              save({ [question.key]: o.id } as Partial<OnboardingAnswers>);
                            }
                          }}
                        >
                          <span className="learn-option-mark" aria-hidden="true">{selected && <Check size={16} weight="bold" />}</span>
                          {o.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="onboarding-controls">
                <button type="button" className="learn-secondary" onClick={() => go(index - 1)} aria-label="Back">
                  <ArrowLeft size={17} weight="bold" aria-hidden="true" /> Back
                </button>
                <button type="button" className="learn-primary" disabled={!canForward} onClick={forward}>
                  {answered ? (index === 9 ? "Finish" : "Next") : "Skip"} <ArrowRight size={17} weight="bold" aria-hidden="true" />
                </button>
              </div>
            </>
          )}

          {index === 10 && record && <StartHere answers={answers} onStart={(id) => router.push(`/approach?module=${id}`)} />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

function StartHere({ answers, onStart }: { answers: OnboardingAnswers; onStart: (moduleId: string) => void }) {
  const { record } = useModel();
  const goal = improveOption(answers.improveFirst);
  const rec = record ? recommend(record) : null;
  const moduleId = rec?.moduleId ?? "context";
  const module = interactiveModule(moduleId);
  return (
    <div className="onboarding-welcome" role="status">
      <p className="life-eyebrow">Start here</p>
      <h1>{goal ? `Your biggest priority seems to be ${goal.label.toLowerCase()}.` : "Let’s start with the idea everything else rests on."}</h1>
      <p>{rec?.why}</p>
      {module && (
        <div className="life-card is-lead">
          <span className="life-eyebrow">Recommended first module</span>
          <h2>{module.title}</h2>
          <p>{module.subtitle} · {module.minutes} min</p>
          <div className="life-actions">
            <button type="button" className="learn-primary" onClick={() => onStart(module.id)}>Start <ArrowRight size={17} weight="bold" aria-hidden="true" /></button>
            <Link className="learn-secondary" href="/today">Not now</Link>
          </div>
        </div>
      )}
    </div>
  );
}
