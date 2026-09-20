"use client";

// A topic survey (PRD §22–§23): one question a screen, saved on every answer, "Save and come
// back" at any point, and a result in the §23 shape — friction, amplifier, contributor, strength,
// try next, explore next. No total, no cut-off, no diagnosis. Leaving before half the questions
// are answered is recorded as an abandon for the fatigue engine; the answers are kept either way.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { strategyById, interactiveModule } from "@/learn/interactive";
import { topicSurvey, TOPIC_SURVEYS } from "@/learn/surveys";
import { insightFor, scoreSurvey } from "@/model/surveys";
import { axes, movedAxes } from "@/model/matrix";
import { acceptExperiment, completeSurvey, recordAbandon, recordSurveyAnswer, type ModelRecord } from "@/model/store";
import { track } from "@/model/events";
import { LifeHeader } from "./life-shell";
import { MyAdhdRadar } from "./my-adhd-radar";
import { useModel } from "./use-model";

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;

export function TopicSurveyScreen() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  // A mode flag, not a fact about anybody: level 4 asks the same survey's extra questions and
  // writes them into the same store, so nothing already answered is asked twice.
  const deeper = params.get("deeper") === "1";
  const survey = topicSurvey(id);
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { record, refresh, storage } = useModel();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const held = record && survey ? record.surveys[survey.id] : undefined;
  const answers = held?.answers ?? {};
  const finished = Boolean(held?.completedAt) && !deeper;

  useEffect(() => {
    if (survey) track("SURVEY_STARTED", { survey: survey.id });
  }, [survey]);

  if (!survey) {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs">
        <LifeHeader />
        <header className="life-head"><h1>Choose a survey.</h1><p>Two to four minutes. Optional.</p></header>
        <ul className="cold-kinds">
          {TOPIC_SURVEYS.map((s) => <li key={s.id}><Link className="cold-kind" href={`/survey?id=${s.id}`}><span><strong>{s.title}</strong><span>{s.minutes} min</span></span><ArrowRight size={18} weight="bold" aria-hidden="true" /></Link></li>)}
        </ul>
      </main>
    );
  }

  const questions = deeper && survey.deeper?.length ? survey.deeper : survey.questions;
  const question = questions[index];
  const go = (next: number) => { setDirection(next > index ? 1 : -1); setIndex(next); window.scrollTo({ top: 0, behavior: "auto" }); };
  const answered = question ? answers[question.id] !== undefined : false;
  const last = index === questions.length - 1;
  const finish = () => {
    refresh(completeSurvey(storage, survey.id));
    track("SURVEY_COMPLETED", { survey: survey.id, deeper });
    if (deeper) router.push("/my-adhd");
  };
  const leave = () => {
    const done = Object.keys(answers).length;
    if (!finished && done < Math.ceil(questions.length / 2)) { refresh(recordAbandon(storage, survey.id)); track("SURVEY_ABANDONED", { survey: survey.id, answered: done }); }
    router.push("/my-adhd");
  };

  return (
    <main id="main-content" className="me-screen life-screen onboarding-screen app-page-with-tabs">
      <LifeHeader />
      {finished && record ? (
        <SurveyResult surveyId={survey.id} answers={answers} record={record} onAccept={(strategyId, moduleId) => refresh(acceptExperiment(storage, moduleId, strategyId))} accepted={new Set(record.experiments.map((e) => e.strategyId))} />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={index} className="onboarding-question" initial={reducedMotion ? false : { opacity: 0, x: 24 * direction }} animate={{ opacity: 1, x: 0 }} exit={reducedMotion ? undefined : { opacity: 0, x: -16 * direction, transition: { duration: 0.12 } }} transition={{ ...SPRING, opacity: { duration: 0.2 } }}>
            <ol className="onboarding-progress" aria-hidden="true">
              {questions.map((q, i) => <li key={q.id} className={i < index ? "is-done" : i === index ? "is-current" : ""} />)}
            </ol>
            <p className="life-eyebrow">{survey.title} · {index + 1} of {questions.length}</p>
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

/**
 * The map moment (founder, 2026-09-19): answering a questionnaire fills the map in, and the person
 * sees it happen.
 *
 * This replaced four stacked result cards — friction, amplifier, contributor, strength — with the
 * one thing the exchange promised: the shape moves, it says so, and it earns one sentence. The
 * sentence is authored per friction in `SURVEY_INSIGHTS`, never composed here.
 *
 * THE "BEFORE" NEEDS NO SNAPSHOT. `deriveNeeds` only reads a survey once it has `completedAt`, so
 * the record with that one field removed IS the state a moment ago. No extra storage, nothing to
 * keep in sync, and it stays true if the person reloads the page.
 */
function SurveyResult({
  surveyId,
  answers,
  record,
  onAccept,
  accepted,
}: {
  surveyId: string;
  answers: Record<string, string | number>;
  record: ModelRecord;
  onAccept: (strategyId: string, moduleId: string) => void;
  accepted: Set<string>;
}) {
  const survey = topicSurvey(surveyId)!;
  const result = scoreSurvey(survey, answers);
  const insight = insightFor(result);
  const tryNext = strategyById(result.tryNext);
  const explore = interactiveModule(result.exploreNext);

  const before = useMemo<ModelRecord>(() => {
    const held = record.surveys[surveyId];
    if (!held) return record;
    const { completedAt: _done, ...rest } = held;
    return { ...record, surveys: { ...record.surveys, [surveyId]: rest } };
  }, [record, surveyId]);

  const points = useMemo(() => axes(record), [record]);
  const moved = useMemo(() => movedAxes(before, record), [before, record]);

  useEffect(() => {
    if (moved.length) track("MAP_CLARIFIED", { survey: surveyId, changed: moved.length });
  }, [moved, surveyId]);

  return (
    <div role="status" className="map-screen map-moment">
      <MyAdhdRadar points={points} onOpen={() => undefined} moved={moved} />
      <header className="life-head">
        <h1>{moved.length ? "Your map just got clearer." : `${survey.resultTitle}.`}</h1>
      </header>
      {insight && <p className="map-stands-out">{insight}</p>}
      {result.contradictions.length > 0 && (
        <p className="map-foot">Two answers disagreed, so that part was left out.</p>
      )}
      {tryNext && !accepted.has(tryNext.strategy.id) && (
        <div className="map-sheet-actions">
          <button type="button" className="learn-secondary" onClick={() => onAccept(tryNext.strategy.id, tryNext.module.id)}>
            {tryNext.strategy.title}
          </button>
        </div>
      )}
      {explore && (
        <section className="map-step">
          <h2>{explore.title}</h2>
          <Link className="learn-primary" href={`/approach?module=${explore.id}`}>
            {explore.minutes} min <ArrowRight size={17} weight="bold" aria-hidden="true" />
          </Link>
        </section>
      )}
      <p className="map-foot"><Link href="/my-adhd">My map</Link></p>
    </div>
  );
}
