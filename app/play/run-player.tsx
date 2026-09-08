"use client";

// The run player (PLAY-PLAN.md §2): title → rounds → recognition → insight → try → next.
//
// Each round has four beats — instruction in, play, result, advance — on one clock: the timer
// bar that drains across the top. Under reduced motion there is no clock and every beat ends on
// a button. A miss costs nothing: the bean reacts, the miss line says why, the run goes on. What
// the run writes to the personal model is what the nine-stage module wrote: resonance, the
// answers its rounds declare, the insight verdict, the experiment, completion.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Play, Sparkle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { expiryIsHit, runPhaseAt, type Run } from "@/learn/play";
import { deviceLearningStorage } from "@/learn/cursor";
import { track } from "@/model/events";
import { acceptExperiment, markModuleComplete, readModel, recordAnswer, recordInsight, recordResonance, type Frequency, type InsightVerdict, type ModelRecord, type Priority } from "@/model/store";
import { Bean } from "./beans";
import { Mechanic } from "./mechanics";

const SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as const;
const RESULT_MS = 1500;

const FREQUENCIES: ReadonlyArray<{ id: Frequency; label: string }> = [{ id: "often", label: "Often" }, { id: "sometimes", label: "Sometimes" }, { id: "rarely", label: "Rarely" }, { id: "unsure", label: "Unsure" }];
const PRIORITIES: ReadonlyArray<{ id: Priority; label: string }> = [{ id: "yes", label: "Yes" }, { id: "maybe", label: "Maybe" }, { id: "no", label: "No" }];
const VERDICTS: ReadonlyArray<{ id: InsightVerdict; label: string }> = [{ id: "yes", label: "That’s me" }, { id: "partly", label: "Partly" }, { id: "no", label: "Not really" }];

export function RunPlayer({ run, step, onStep, onFinish, onOpenModule, bar }: {
  run: Run;
  step: number;
  onStep: (next: number) => void;
  onFinish: () => void;
  onOpenModule: (id: string) => void;
  bar: React.ReactNode;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const [record, setRecord] = useState<ModelRecord | null>(null);
  const [cleared, setCleared] = useState<Record<string, boolean>>({});
  const { phase, round, index } = runPhaseAt(run, step);

  useEffect(() => { setRecord(readModel(deviceLearningStorage)); track("MODULE_STARTED", { module: run.id, format: "run" }); }, [run.id]);
  const refresh = (r: ModelRecord) => setRecord(r);
  const next = useCallback(() => onStep(step + 1), [onStep, step]);
  const finish = () => { refresh(markModuleComplete(deviceLearningStorage, run.id)); track("MODULE_COMPLETED", { module: run.id, format: "run" }); onFinish(); };
  const roundsCleared = Object.values(cleared).filter(Boolean).length;

  return (
    <section className="learn-module play-run" aria-labelledby="learn-module-title" data-phase={phase} data-round={round?.id}>
      {bar}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} className="play-stage" initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -12, transition: { duration: 0.12 } }} transition={{ ...SPRING, opacity: { duration: 0.18 } }}>
          {phase === "title" && (
            <div className="play-card is-title">
              <Bean who={run.bean} mood="engaged" size={160} className="play-hero-bean" />
              <p className="play-kicker">{run.rounds.length} rounds · {run.minutes} min</p>
              <h2 className="play-title">{run.title}</h2>
              <p className="play-line">{run.tagline}</p>
              <button type="button" className="play-tempt is-go" onClick={next} autoFocus><Play size={18} weight="fill" aria-hidden="true" /> Tap to play</button>
            </div>
          )}

          {phase === "round" && round && (
            <RoundStage
              key={round.id}
              run={run}
              index={index ?? 0}
              reducedMotion={reducedMotion}
              onDone={(hit, chosen) => {
                setCleared((c) => ({ ...c, [round.id]: hit }));
                track("MODULE_STEP_COMPLETED", { module: run.id, step, kind: round.mechanic, hit });
                if (round.writes && chosen !== undefined) {
                  refresh(recordAnswer(deviceLearningStorage, run.id, round.writes.question, chosen));
                  track("SURVEY_QUESTION_ANSWERED", { module: run.id, question: round.writes.question });
                }
                if (typeof chosen === "string") track("MODULE_BRANCH_SELECTED", { module: run.id, step, option: chosen.slice(0, 40) });
              }}
              onAdvance={next}
            />
          )}

          {phase === "recognition" && (
            <div className="play-card">
              <Bean who={run.bean} mood="thinking" size={110} />
              <p className="play-kicker">Round {run.rounds.length + 1} · you</p>
              <h2 className="play-title">{run.recognition}</h2>
              <div className="play-choices" role="group" aria-label="How often">
                {FREQUENCIES.map((f) => <button key={f.id} type="button" className="play-choice" aria-pressed={record?.resonance[run.id]?.frequency === f.id} onClick={() => { refresh(recordResonance(deviceLearningStorage, run.id, { frequency: f.id })); track("MODULE_RESONANCE_RECORDED", { module: run.id, field: "frequency", value: f.id }); }}>{f.label}</button>)}
              </div>
              <label className="resonance-scale play-scale">
                <span className="play-line">How much does it cost you?</span>
                <input type="range" min={0} max={10} step={1} value={record?.resonance[run.id]?.cost ?? 5} aria-valuetext={`${record?.resonance[run.id]?.cost ?? 5} out of 10`} onChange={(e) => refresh(recordResonance(deviceLearningStorage, run.id, { cost: Number(e.target.value) }))} />
                <output className="t-digit">{record?.resonance[run.id]?.cost ?? 5}</output>
              </label>
              <p className="play-line">Want it easier?</p>
              <div className="play-choices" role="group" aria-label="Want it easier">
                {PRIORITIES.map((p) => <button key={p.id} type="button" className="play-choice" aria-pressed={record?.resonance[run.id]?.priority === p.id} onClick={() => refresh(recordResonance(deviceLearningStorage, run.id, { priority: p.id }))}>{p.label}</button>)}
              </div>
              <button type="button" className="play-tempt is-go" disabled={!record?.resonance[run.id]?.frequency} onClick={next}>Next <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
            </div>
          )}

          {phase === "insight" && (() => {
            const answer = record?.answers[`${run.id}.${run.insight.byAnswer?.question ?? ""}`];
            const first = Array.isArray(answer) ? answer[0] : answer;
            const tail = first && run.insight.byAnswer ? run.insight.byAnswer.map[first] : undefined;
            const verdict = record?.insights[run.insight.id];
            return (
              <div className="play-card is-insight">
                <p className="play-kicker"><Sparkle size={12} weight="fill" aria-hidden="true" /> Insight · {roundsCleared} of {run.rounds.length} rounds cleared</p>
                <h2 className="play-title">{run.insight.heading}</h2>
                <p className="play-line">{run.insight.body}{tail ? ` ${tail}` : ""}</p>
                <div className="play-choices" role="group" aria-label="Does that fit">
                  {VERDICTS.map((v) => <button key={v.id} type="button" className="play-choice" aria-pressed={verdict === v.id} onClick={() => { refresh(recordInsight(deviceLearningStorage, run.insight.id, v.id)); track(v.id === "no" ? "INSIGHT_REJECTED" : "INSIGHT_CONFIRMED", { insight: run.insight.id }); }}>{v.label}</button>)}
                </div>
                <button type="button" className="play-tempt is-go" onClick={next}>Next <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
              </div>
            );
          })()}

          {phase === "try" && (() => {
            const accepted = record?.experiments.some((e) => e.strategyId === run.strategy.id);
            return (
              <div className="play-card">
                <Bean who={run.bean} mood="pleased" size={100} />
                <p className="play-kicker">Try this</p>
                <h2 className="play-title">{run.strategy.title}</h2>
                <ol className="play-steps">{run.strategy.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                {accepted ? <p className="strategy-accepted"><Check size={14} weight="bold" aria-hidden="true" /> On your list</p> : <button type="button" className="play-choice" onClick={() => { refresh(acceptExperiment(deviceLearningStorage, run.id, run.strategy.id)); track("EXPERIMENT_ACCEPTED", { module: run.id, strategy: run.strategy.id }); }}>I’ll try this</button>}
                <button type="button" className="play-tempt is-go" onClick={next}>Next <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
              </div>
            );
          })()}

          {phase === "next" && (
            <div className="play-card is-title">
              <Bean who={run.bean} mood="relieved" size={140} className="play-hero-bean" />
              <p className="play-kicker">Run complete · {roundsCleared} of {run.rounds.length} cleared</p>
              <h2 className="play-title">{run.next.heading}</h2>
              <p className="play-line">{run.next.body}</p>
              <div className="next-actions">
                {run.next.action === "learn" && run.next.moduleId ? (
                  <button type="button" className="play-tempt is-go" onClick={() => { markModuleComplete(deviceLearningStorage, run.id); track("MODULE_COMPLETED", { module: run.id, format: "run" }); onOpenModule(run.next.moduleId!); }}>Play the next one <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
                ) : run.next.action === "support" ? (
                  <Link className="play-tempt is-go" href="/support" onClick={() => { markModuleComplete(deviceLearningStorage, run.id); track("MODULE_COMPLETED", { module: run.id, format: "run" }); }}>Explore support <ArrowRight size={16} weight="bold" aria-hidden="true" /></Link>
                ) : (
                  <button type="button" className="play-tempt is-go" onClick={finish}><Check size={16} weight="bold" aria-hidden="true" /> Finish</button>
                )}
                {run.next.action !== "try" && <button type="button" className="play-choice" onClick={finish}>Finish for now</button>}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/** One round: instruction in, play on the clock, result, advance. */
function RoundStage({ run, index, reducedMotion, onDone, onAdvance }: { run: Run; index: number; reducedMotion: boolean; onDone: (hit: boolean, chosen?: string | string[]) => void; onAdvance: () => void }) {
  const round = run.rounds[index]!;
  const [beat, setBeat] = useState<"in" | "play" | "result">(reducedMotion ? "play" : "in");
  const [hit, setHit] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const settled = useRef(false);

  const settle = useCallback((h: boolean, chosen?: string | string[]) => {
    if (settled.current) return;
    settled.current = true;
    setHit(h);
    setBeat("result");
    onDone(h, chosen);
  }, [onDone]);

  // Instruction beat, then the clock. Under reduced motion there is no clock: the round waits for a gesture.
  useEffect(() => {
    if (reducedMotion) return;
    const t = window.setTimeout(() => setBeat("play"), 900);
    return () => window.clearTimeout(t);
  }, [reducedMotion]);
  useEffect(() => {
    if (reducedMotion || beat !== "play") return;
    let raf = 0;
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const p = Math.min(1, (now - start.current) / (round.seconds * 1000));
      setProgress(p);
      if (p >= 1) { settle(expiryIsHit(round.mechanic)); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [beat, reducedMotion, round.seconds, round.mechanic, settle]);
  // Auto-advance after the result beat; the button is always there too.
  useEffect(() => {
    if (beat !== "result" || reducedMotion) return;
    const t = window.setTimeout(onAdvance, RESULT_MS);
    return () => window.clearTimeout(t);
  }, [beat, reducedMotion, onAdvance]);

  const mood = beat === "result" ? (hit ? "pleased" : "embarrassed") : (round.mood ?? "neutral");
  return (
    <div className={`play-card is-round${beat === "result" ? (hit ? " is-hit" : " is-miss") : ""}`} data-beat={beat}>
      {!reducedMotion && <div className="play-clock" aria-hidden="true"><span style={{ transform: `scaleX(${1 - progress})` }} /></div>}
      <p className="play-kicker">Round {index + 1} of {run.rounds.length}</p>
      <div className="play-scene"><Bean who={round.who} mood={mood} size={128} /></div>
      <h2 className="play-title play-instruction" tabIndex={-1}>{round.instruction}</h2>
      {beat !== "result" && (
        <Mechanic round={round} live={beat === "play"} reducedMotion={reducedMotion} progress={progress} onResult={settle} />
      )}
      {beat === "result" && (
        <motion.div className="play-result" role="status" initial={reducedMotion ? false : { scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING}>
          <p className="play-verdict">{hit ? <><Check size={18} weight="bold" aria-hidden="true" /> Cleared</> : "Not this time"}</p>
          <p className="play-line">{hit ? round.hit : round.miss}</p>
          <button type="button" className="play-tempt is-go" onClick={onAdvance} autoFocus>Next <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
        </motion.div>
      )}
    </div>
  );
}
