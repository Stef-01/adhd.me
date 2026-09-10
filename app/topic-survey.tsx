"use client";

// A topic survey (PRD §22–§23): one question a screen, saved on every answer, "Save and come
// back" at any point, and a result in the §23 shape — friction, amplifier, contributor, strength,
// try next, explore next. No total, no cut-off, no diagnosis. Leaving before half the questions
// are answered is recorded as an abandon for the fatigue engine; the answers are kept either way.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { strategyById, interactiveModule } from "@/learn/interactive";
import { topicSurvey, TOPIC_SURVEYS } from "@/learn/surveys";
import { LAYER_LABELS } from "@/model/layers";
import { scoreSurvey } from "@/model/surveys";
import { acceptExperiment, completeSurvey, recordAbandon, recordSurveyAnswer } from "@/model/store";
import { track } from "@/model/events";
import { LifeHeader } from "./life-shell";
import { useModel } from "./use-model";

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;

export function TopicSurveyScreen() {
  const id = useSearchParams().get("id") ?? "";
  const survey = topicSurvey(id);
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { record, refresh, storage } = useModel();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const held = record && survey ? record.surveys[survey.id] : undefined;
  const answers = held?.answers ?? {};
  const finished = Boolean(held?.completedAt);

  useEffect(() => {
    if (survey) track("SURVEY_STARTED", { survey: survey.id });
  }, [survey]);

  if (!survey) {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs">
        <LifeHeader />
        <header className="life-head"><span className="life-eyebrow">Surveys</span><h1>Choose a survey.</h1><p>Two to four minutes. Optional.</p></header>
        <ul className="life-list">
          {TOPIC_SURVEYS.map((s) => <li key={s.id}><Link href={`/survey?id=${s.id}`}>{s.title} · {s.minutes} min</Link></li>)}
        </ul>
      </main>
    );
  }

  const question = survey.questions[index];
  const go = (next: number) => { setDirection(next > index ? 1 : -1); setIndex(next); window.scrollTo({ top: 0, behavior: "auto" }); };
  const answered = question ? answers[question.id] !== undefined : false;
  const last = index === survey.questions.length - 1;
  const finish = () => {
    refresh(completeSurvey(storage, survey.id));
    track("SURVEY_COMPLETED", { survey: survey.id });
  };
  const leave = () => {
    const done = Object.keys(answers).length;
    if (!finished && done < Math.ceil(survey.questions.length / 2)) { refresh(recordAbandon(storage, survey.id)); track("SURVEY_ABANDONED", { survey: survey.id, answered: done }); }
    router.push("/my-adhd");
  };

  return (
    <main id="main-content" className="me-screen life-screen onboarding-screen app-page-with-tabs">
      <LifeHeader />
      {finished && record ? (
        <SurveyResult surveyId={survey.id} answers={answers} onAccept={(strategyId, moduleId) => refresh(acceptExperiment(storage, moduleId, strategyId))} accepted={new Set(record.experiments.map((e) => e.strategyId))} />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={index} className="onboarding-question" initial={reducedMotion ? false : { opacity: 0, x: 24 * direction }} animate={{ opacity: 1, x: 0 }} exit={reducedMotion ? undefined : { opacity: 0, x: -16 * direction, transition: { duration: 0.12 } }} transition={{ ...SPRING, opacity: { duration: 0.2 } }}>
            <ol className="onboarding-progress" aria-hidden="true">
              {survey.questions.map((q, i) => <li key={q.id} className={i < index ? "is-done" : i === index ? "is-current" : ""} />)}
            </ol>
            <p className="life-eyebrow">{survey.title} · {index + 1} of {survey.questions.length}</p>
            {question && <h1 tabIndex={-1}>{question.prompt}</h1>}
            {question?.note && <p className="onboarding-note">{question.note}</p>}
            {question?.kind === "scale" ? (
              <label className="onboarding-scale">
                <span className="sr-only">{question.prompt}</span>
                <output aria-live="polite">{typeof answers[question.id] === "number" ? answers[question.id] : 5}</output>
                <input type="range" min={0} max={10} step={1} value={typeof answers[question.id] === "number" ? (answers[question.id] as number) : 5} aria-valuetext={`${answers[question.id] ?? 5} out of 10`} onChange={(e) => { refresh(recordSurveyAnswer(storage, survey.id, question.id, Number(e.target.value))); track("SURVEY_QUESTION_ANSWERED", { survey: survey.id, question: question.id }); }} />
                <span className="resonance-scale-ends" aria-hidden="true"><span>Not at all</span><span>Constantly</span></span>
              </label>
            ) : question ? (
              <ul className="onboarding-options" aria-label="Options">
                {question.options!.map((o) => {
                  const selected = answers[question.id] === o.id;
                  return (
                    <li key={o.id}>
                      <button type="button" className={`learn-option${selected ? " is-right" : ""}`} aria-pressed={selected} onClick={() => { refresh(recordSurveyAnswer(storage, survey.id, question.id, o.id)); track("SURVEY_QUESTION_ANSWERED", { survey: survey.id, question: question.id }); }}>
                        <span className="learn-option-mark" aria-hidden="true">{selected && <Check size={16} weight="bold" />}</span>
                        {o.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className="onboarding-controls">
              <button type="button" className="learn-secondary" onClick={() => (index === 0 ? leave() : go(index - 1))}>
                <ArrowLeft size={17} weight="bold" aria-hidden="true" /> {index === 0 ? "Save and come back" : "Back"}
              </button>
              <button type="button" className="learn-primary" onClick={() => (last ? finish() : go(index + 1))}>
                {last ? "See my pattern" : answered ? "Next" : "Skip"} <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </button>
            </div>
            {index > 0 && <button type="button" className="learn-reset" onClick={leave}>Save and come back later</button>}
          </motion.div>
        </AnimatePresence>
      )}
    </main>
  );
}

function SurveyResult({ surveyId, answers, onAccept, accepted }: { surveyId: string; answers: Record<string, string | number>; onAccept: (strategyId: string, moduleId: string) => void; accepted: Set<string> }) {
  const survey = topicSurvey(surveyId)!;
  const result = scoreSurvey(survey, answers);
  const tryNext = strategyById(result.tryNext);
  const explore = interactiveModule(result.exploreNext);
  return (
    <div role="status">
      <header className="life-head">
        <span className="life-eyebrow">{survey.title}</span>
        <h1>{survey.resultTitle}.</h1>
        <p>{result.complete ? "From your answers, and nothing else. No score, no verdict." : `From the ${result.answered} you answered. Come back for the rest whenever you like.`}</p>
      </header>
      {result.contradictions.length > 0 && (
        <p className="learn-reveal">Two answers disagreed, so that part was left out.</p>
      )}
      <section className="life-card is-lead" aria-labelledby="sr-friction">
        <span className="life-eyebrow">Biggest friction</span>
        <h2 id="sr-friction">{result.friction ? `${result.friction.label}.` : "Nothing stood out yet."}</h2>
        {result.cost !== null && <p>You put the cost at <span className="t-digit">{result.cost}</span> out of 10.</p>}
      </section>
      {result.amplifier && (
        <section className="life-card"><span className="life-eyebrow">Environmental amplifier</span><h2>{result.amplifier.note}.</h2><p><span className="layer-pill" data-layer={result.amplifier.layer}>{LAYER_LABELS[result.amplifier.layer]}</span></p></section>
      )}
      {result.contributor && (
        <section className="life-card"><span className="life-eyebrow">Possible contributor</span><h2>{result.contributor.note}.</h2><p><span className="layer-pill" data-layer={result.contributor.layer}>{LAYER_LABELS[result.contributor.layer]}</span></p></section>
      )}
      {result.strengths.length > 0 && (
        <section className="life-card"><span className="life-eyebrow">Strength</span><h2><Sparkle size={16} weight="fill" aria-hidden="true" /> {result.strengths[0]}.</h2>{result.strengths.length > 1 && <p>{result.strengths.slice(1).join(" · ")}</p>}</section>
      )}
      {tryNext && (
        <section className="life-card"><span className="life-eyebrow">Try next</span><h2>{tryNext.strategy.title}</h2>
          <ol className="learn-card-detail">{tryNext.strategy.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <div className="life-actions">
            {accepted.has(tryNext.strategy.id) ? <p className="strategy-accepted"><Check size={14} weight="bold" aria-hidden="true" /> On your list</p> : <button type="button" className="learn-secondary" onClick={() => onAccept(tryNext.strategy.id, tryNext.module.id)}>I’ll try this</button>}
          </div>
        </section>
      )}
      {explore && (
        <section className="life-card"><span className="life-eyebrow">Explore next</span><h2>{explore.title}</h2><p>{explore.subtitle} · {explore.minutes} min</p>
          <div className="life-actions"><Link className="learn-primary" href={`/approach?module=${explore.id}`}>Open the module <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link><Link className="learn-secondary" href="/my-adhd">My ADHD</Link></div>
        </section>
      )}
    </div>
  );
}
