"use client";

// The run player (PLAY-PLAN.md §2): title → rounds → recognition → insight → try → next.
//
// Calm (PLAY-PLAN.md §14, founder 2026-09-08, after a tester with ADHD was overwhelmed): no labels
// on any card — no kicker, no round count, no rule line — unless the person asks for them with the
// "?" in the housing; one question per card; cards crossfade, nothing slides or springs; no
// "Faster" card and no instruction callout. A three-card tutorial before the first run on this
// device says what the bar is, that waiting can be the move, and that a miss costs nothing.
//
// Each round has four beats — instruction in, play, result, advance — on one clock: the timer
// bar that drains across the top. Under reduced motion there is no clock and every beat ends on
// a button. A miss costs nothing: the bean reacts, the miss line says why, the run goes on. What
// the run writes to the personal model is what the nine-stage module wrote: resonance, the
// answers its rounds declare, the insight verdict, the experiment, completion.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Play, Question, ShareNetwork, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { expiryIsHit, rampedSeconds, RULES, runPhaseAt, runStepCount, type Run, RELATE_BUTTONS, RELATE_PROMPT, relateFormFor } from "@/learn/play";
import { deviceLearningStorage } from "@/learn/cursor";
import { track } from "@/model/events";
import { acceptExperiment, acknowledgeSafety, activeSafety, confirmInterpretation, markModuleComplete, readModel, recordAnswer, recordInsight, recordReflection, recordRelate, recordResonance, type Frequency, type InsightVerdict, type ModelRecord, type Priority } from "@/model/store";
import { Bean } from "./beans";
import { Mechanic, ownsScene } from "./mechanics";
import { Scene } from "./scene";
import { SafetyScreen } from "../safety-screen";
import { VoiceReflection } from "../voice-reflection";
import { interpret, type Interpretation } from "@/model/interpret";

/** Cards crossfade. Nothing on a play screen moves position; the tester read moving text as panic. */
const FADE = { duration: 0.18, ease: "easeOut" } as const;
const RESULT_MS = 1500;
/** The device remembers that the tutorial has been seen, and whether labels are wanted. */
const TUTORED_KEY = "adhdme.play.tutored";
const LABELS_KEY = "adhdme.play.labels";
const TUTORIAL: ReadonlyArray<{ line: string; mood: "engaged" | "thinking" | "pleased" }> = [
  { line: "The bar at the top is the clock. Do what the line says before it runs out.", mood: "engaged" },
  { line: "Sometimes the line says do nothing. Waiting is the move.", mood: "thinking" },
  { line: "A miss costs nothing. After each round, say how much it was you.", mood: "pleased" },
];
function readFlag(key: string): boolean { try { return deviceLearningStorage.getItem(key) === "1"; } catch { return false; } }
function writeFlag(key: string, on: boolean): void { try { if (on) deviceLearningStorage.setItem(key, "1"); else deviceLearningStorage.removeItem(key); } catch { /* memory only */ } }

const FREQUENCIES: ReadonlyArray<{ id: Frequency; label: string }> = [{ id: "often", label: "Often" }, { id: "sometimes", label: "Sometimes" }, { id: "rarely", label: "Rarely" }, { id: "unsure", label: "Unsure" }];
const PRIORITIES: ReadonlyArray<{ id: Priority; label: string }> = [{ id: "yes", label: "Yes" }, { id: "maybe", label: "Maybe" }, { id: "no", label: "No" }];
const VERDICTS: ReadonlyArray<{ id: InsightVerdict; label: string }> = [{ id: "yes", label: "That’s me" }, { id: "partly", label: "Partly" }, { id: "no", label: "Not really" }];

export function RunPlayer({ run, step, onStep, onFinish, onOpenModule, onLeave }: {
  run: Run;
  step: number;
  onStep: (next: number) => void;
  onFinish: () => void;
  onOpenModule: (id: string) => void;
  onLeave: () => void;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const total = runStepCount(run);
  const [record, setRecord] = useState<ModelRecord | null>(null);
  const [cleared, setCleared] = useState<Record<string, boolean>>({});
  const [reflection, setReflection] = useState("");
  /** PRD §29: readings of the reflection just written, offered once, entering the model only on a yes. */
  const [reading, setReading] = useState<readonly Interpretation[] | null>(null);
  /** The tutorial shows once per device, before the first run's title; `null` until the device is read. */
  const [tutorial, setTutorial] = useState<number | null>(null);
  const [labels, setLabels] = useState(false);
  const [safety, setSafety] = useState<ReturnType<typeof activeSafety>>(null);
  const { phase, round, index } = runPhaseAt(run, step);

  useEffect(() => { const r = readModel(deviceLearningStorage); setRecord(r); setSafety(activeSafety(r)); setTutorial(readFlag(TUTORED_KEY) ? -1 : 0); setLabels(readFlag(LABELS_KEY)); track("MODULE_STARTED", { module: run.id, format: "run" }); }, [run.id]);
  const toggleLabels = () => { setLabels((l) => { writeFlag(LABELS_KEY, !l); return !l; }); };
  const endTutorial = () => { writeFlag(TUTORED_KEY, true); setTutorial(-1); };
  const refresh = (r: ModelRecord) => setRecord(r);
  const next = useCallback(() => onStep(step + 1), [onStep, step]);
  const finish = () => { refresh(markModuleComplete(deviceLearningStorage, run.id)); track("MODULE_COMPLETED", { module: run.id, format: "run" }); onFinish(); };
  /** The reflect beat: save, check for safety, and either stop on the safety screen or move on. */
  const leaveReflection = () => {
    if (reflection.trim()) {
      const { record: r, safety: hit } = recordReflection(deviceLearningStorage, run.id, reflection);
      refresh(r);
      setReflection("");
      if (hit) { track("SAFETY_TRIGGERED", { module: run.id, rule: hit }); setSafety(activeSafety(r)); return; }
      const readings = interpret(reflection);
      if (readings.length) { setReading(readings); track("INTERPRETATION_OFFERED", { module: run.id, readings: readings.length }); return; }
    }
    next();
  };
  const confirmReading = (r: Interpretation) => {
    refresh(confirmInterpretation(deviceLearningStorage, run.id, r));
    track("INTERPRETATION_CONFIRMED", { module: run.id, subdomain: r.subdomain });
    setReading(null);
    next();
  };
  const declineReading = () => { track("INTERPRETATION_DECLINED", { module: run.id }); setReading(null); next(); };

  if (safety) {
    return <SafetyScreen ruleId={safety.ruleId} onAcknowledge={() => { refresh(acknowledgeSafety(deviceLearningStorage)); setSafety(null); }} />;
  }

  return (
    <section className="learn-module play-run" aria-labelledby="learn-module-title" data-phase={phase} data-round={round?.id}>
      <h1 id="learn-module-title" className="sr-only">{run.title}</h1>
      {/* Zero header (founder, 2026-09-08): an X to back out, and the progress in its own small housing. */}
      <div className="play-top">
        <button type="button" className="play-x" aria-label="All modules" onClick={onLeave}><X size={20} weight="bold" aria-hidden="true" /></button>
        <div className="play-hut">
          <ol className="learn-dots play-dots" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => <li key={i} className={i === step ? "is-current" : i < step ? "is-done" : ""} />)}
          </ol>
          {labels && <span className="play-count" aria-live="polite">{Math.min(step + 1, total)} of {total}</span>}
        </div>
        <button type="button" className="play-x play-help" aria-label={labels ? "Hide the labels" : "Show the labels"} aria-pressed={labels} onClick={toggleLabels}><Question size={20} weight="bold" aria-hidden="true" /></button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={phase === "title" && tutorial !== null && tutorial >= 0 ? `tutorial-${tutorial}` : step} className="play-stage" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }} transition={FADE}>
          {phase === "title" && tutorial !== null && tutorial >= 0 && (
            <div className="play-card is-title" role="group" aria-label="How to play">
              <Bean who={run.bean} mood={TUTORIAL[tutorial]!.mood} size={160} className="play-hero-bean" />
              <h2 className="play-title">{TUTORIAL[tutorial]!.line}</h2>
              <button type="button" className="play-tempt is-go" onClick={() => (tutorial + 1 < TUTORIAL.length ? setTutorial(tutorial + 1) : endTutorial())} autoFocus>{tutorial + 1 < TUTORIAL.length ? "Next" : "Got it"} <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
            </div>
          )}
          {phase === "title" && (tutorial === null || tutorial < 0) && (
            <div className="play-card is-title">
              <Bean who={run.bean} mood="engaged" size={160} className="play-hero-bean" />
              <h2 className="play-title">{run.title}</h2>
              <button type="button" className="play-tempt is-go" onClick={next} autoFocus><Play size={18} weight="fill" aria-hidden="true" /> Tap to play</button>
            </div>
          )}

          {phase === "round" && round && (
            <RoundStage
              key={round.id}
              run={run}
              index={index ?? 0}
              reducedMotion={reducedMotion}
              labels={labels}
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

          {phase === "recognition" && (() => {
            // One question per card: how often, then whether they want it easier. The cost is the
            // mean of the relate beats (needs.ts), so no slider here.
            const asked = record?.resonance[run.id]?.frequency;
            return (
              <div className="play-card">
                <Bean who={run.bean} mood="thinking" size={110} />
                <h2 className="play-title">{asked ? "Want it easier?" : run.recognition}</h2>
                {!asked ? (
                  <div className="play-choices" role="group" aria-label="How often">
                    {FREQUENCIES.map((f) => <button key={f.id} type="button" className="play-choice" onClick={() => { refresh(recordResonance(deviceLearningStorage, run.id, { frequency: f.id })); track("MODULE_RESONANCE_RECORDED", { module: run.id, field: "frequency", value: f.id }); }}>{f.label}</button>)}
                  </div>
                ) : (
                  <div className="play-choices" role="group" aria-label="Want it easier">
                    {PRIORITIES.map((p) => <button key={p.id} type="button" className="play-choice" aria-pressed={record?.resonance[run.id]?.priority === p.id} onClick={() => { refresh(recordResonance(deviceLearningStorage, run.id, { priority: p.id })); next(); }}>{p.label}</button>)}
                  </div>
                )}
              </div>
            );
          })()}

          {phase === "insight" && (() => {
            const answer = record?.answers[`${run.id}.${run.insight.byAnswer?.question ?? ""}`];
            const first = Array.isArray(answer) ? answer[0] : answer;
            const tail = first && run.insight.byAnswer ? run.insight.byAnswer.map[first] : undefined;
            const verdict = record?.insights[run.insight.id];
            return (
              <div className="play-card is-insight">
                <h2 className="play-title">{run.insight.heading}</h2>
                <p className="play-line">{run.insight.body}{tail ? ` ${tail}` : ""}</p>
                <div className="play-choices" role="group" aria-label="Does that fit">
                  {VERDICTS.map((v) => <button key={v.id} type="button" className="play-choice" aria-pressed={verdict === v.id} onClick={() => { refresh(recordInsight(deviceLearningStorage, run.insight.id, v.id)); track(v.id === "no" ? "INSIGHT_REJECTED" : "INSIGHT_CONFIRMED", { insight: run.insight.id }); }}>{v.label}</button>)}
                </div>
                <button type="button" className="play-tempt is-go" onClick={next}>Next <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
              </div>
            );
          })()}

          {phase === "reflect" && reading && (
            <div className="play-card play-reading" role="group" aria-labelledby="play-reading-title">
              <Bean who={run.bean} mood="thinking" size={100} />
              <h2 id="play-reading-title" className="play-title">{reading.length === 1 ? reading[0]!.sentence : "It sounds like two things were part of it."}</h2>
              <div className="play-choices" role="group" aria-label="Readings">
                {reading.map((r) => (
                  <button key={r.subdomain} type="button" className="play-choice is-wide" onClick={() => confirmReading(r)}>
                    <Check size={16} weight="bold" aria-hidden="true" /> {reading.length === 1 ? "Yes, that was it" : r.note}
                  </button>
                ))}
              </div>
              <button type="button" className="play-tempt" onClick={declineReading}>Not quite <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
            </div>
          )}

          {phase === "reflect" && run.reflect && !reading && (
            <div className="play-card">
              <Bean who={run.bean} mood="thinking" size={100} />
              <h2 className="play-title">{run.reflect.prompt}</h2>
              <label className="reflect-field" style={{ width: "100%" }}>
                <span className="sr-only">Your reflection</span>
                <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder="In your own words, or leave it blank. It stays on this device." maxLength={2000} />
              </label>
              <VoiceReflection onText={(text) => setReflection((t) => (t ? `${t} ${text}` : text).slice(0, 2000))} />
              <button type="button" className="play-tempt is-go" onClick={leaveReflection}>{reflection.trim() ? "Next" : "Skip"} <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
            </div>
          )}

          {phase === "try" && (() => {
            const accepted = record?.experiments.some((e) => e.strategyId === run.strategy.id);
            return (
              <div className="play-card">
                <Bean who={run.bean} mood="pleased" size={100} />
                <h2 className="play-title">{run.strategy.title}</h2>
                {accepted ? <p className="strategy-accepted"><Check size={14} weight="bold" aria-hidden="true" /> On your list</p> : <button type="button" className="play-choice" onClick={() => { refresh(acceptExperiment(deviceLearningStorage, run.id, run.strategy.id)); track("EXPERIMENT_ACCEPTED", { module: run.id, strategy: run.strategy.id }); }}>I’ll try this</button>}
                <details className="play-steps-fold" open={accepted}>
                  <summary>The steps</summary>
                  <ol className="play-steps">{run.strategy.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                </details>
                <button type="button" className="play-tempt is-go" onClick={next}>Next <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
              </div>
            );
          })()}

          {phase === "next" && (
            <div className="play-card is-title">
              <Bean who={run.bean} mood="relieved" size={140} className="play-hero-bean" />
              <h2 className="play-title">{run.next.heading}</h2>
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
              <ShareRun runId={run.id} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/** One round: instruction in, play on the clock, result, advance. */
function RoundStage({ run, index, reducedMotion, labels, onDone, onAdvance }: { run: Run; index: number; reducedMotion: boolean; labels: boolean; onDone: (hit: boolean, chosen?: string | string[]) => void; onAdvance: () => void }) {
  const round = run.rounds[index]!;
  const seconds = rampedSeconds(run, index);
  // Beats: play — the clock runs from the first frame — then the result. (§14: no Faster card, no callout.)
  const [beat, setBeat] = useState<"play" | "result">("play");
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

  useEffect(() => {
    if (reducedMotion || beat !== "play") return;
    let raf = 0;
    let hiddenAt: number | null = null;
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const p = Math.min(1, (now - start.current) / (seconds * 1000));
      setProgress(p);
      if (p >= 1) { settle(expiryIsHit(round.mechanic)); return; }
      raf = requestAnimationFrame(tick);
    };
    // A hidden tab pauses the clock: the round resumes where it was, it does not expire behind
    // the person's back.
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = performance.now(); cancelAnimationFrame(raf); return; }
      if (hiddenAt !== null && start.current !== null) start.current += performance.now() - hiddenAt;
      hiddenAt = null;
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVisibility); };
  }, [beat, reducedMotion, seconds, round.mechanic, settle]);
  // The relate beat (founder, 2026-09-08): after the result, "How much is this you?" — buttons on
  // one round, the slider on the next. Optional: Next is always there. A round with the beat does
  // not auto-advance, because a question you have not read is not a question.
  const relateForm = relateFormFor(round, index);
  const [related, setRelated] = useState<number | null>(null);
  const [slid, setSlid] = useState(5);
  const relate = (value: number) => {
    setRelated(value);
    recordRelate(deviceLearningStorage, run.id, round.id, value);
    track("ROUND_RELATED", { module: run.id, round: round.id, form: relateForm ?? "none", value });
  };
  // Auto-advance after the result beat when there is nothing to answer; the button is always there too.
  useEffect(() => {
    if (beat !== "result" || reducedMotion || relateForm) return;
    const t = window.setTimeout(onAdvance, RESULT_MS);
    return () => window.clearTimeout(t);
  }, [beat, reducedMotion, onAdvance, relateForm]);

  const mood = beat === "result" ? (hit ? "pleased" : "embarrassed") : (round.mood ?? "neutral");
  return (
    <div className={`play-card is-round${beat === "result" ? (hit ? " is-hit" : " is-miss") : ""}`} data-beat={beat}>
      {!reducedMotion && <div className="play-clock" aria-hidden="true"><span style={{ transform: `scaleX(${1 - progress})` }} /></div>}
      {labels && <p className="play-label">Round {index + 1} of {run.rounds.length}</p>}
      <h2 className="play-title play-instruction" tabIndex={-1}>{round.instruction}</h2>
      {beat === "play" && round.clue && <p className="play-clue">{round.clue}</p>}
      {(beat === "result" || !ownsScene(round.mechanic)) && <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} result={beat === "result" ? (hit ? "hit" : "miss") : undefined} />}
      {beat !== "result" && (
        <>
          <Mechanic round={round} live={beat === "play"} reducedMotion={reducedMotion} progress={progress} mood={mood} onResult={settle} />
          {labels && <p className="play-rule">{reducedMotion ? RULES[round.mechanic].reduced : RULES[round.mechanic].motion}</p>}
        </>
      )}
      {beat === "result" && (
        <motion.div className="play-result" role="status" data-hit={hit ? "true" : "false"} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={FADE}>
          <p className="play-line">{hit ? round.hit : round.miss}</p>
          {relateForm === "buttons" && (
            <div className="play-relate" role="group" aria-label={RELATE_PROMPT}>
              <p className="play-relate-prompt">{RELATE_PROMPT}</p>
              <div className="play-choices">
                {RELATE_BUTTONS.map((b) => <button key={b.id} type="button" className="play-choice" aria-pressed={related === b.value} onClick={() => relate(b.value)}>{b.label}</button>)}
              </div>
            </div>
          )}
          {relateForm === "slider" && (
            <div className="play-relate">
              <label className="play-likert">
                <span className="play-relate-prompt">{RELATE_PROMPT}</span>
                <input type="range" min={0} max={10} step={1} value={related ?? slid} aria-valuetext={`${related ?? slid} out of 10, ${(related ?? slid) <= 2 ? "not me" : (related ?? slid) >= 8 ? "very me" : "a bit"}`} onChange={(e) => setSlid(Number(e.target.value))} onPointerUp={(e) => relate(Number((e.target as HTMLInputElement).value))} onKeyUp={(e) => relate(Number((e.target as HTMLInputElement).value))} />
                <span className="play-likert-ends" aria-hidden="true"><span>Not me</span><output className="t-digit">{related ?? slid}</output><span>Very me</span></span>
              </label>
            </div>
          )}
          <button type="button" className="play-tempt is-go" onClick={onAdvance} autoFocus={!relateForm}>Next <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Support-person sharing (PRD §46): a run by link. The link carries the module id and nothing
 * else — no answer, no name, nothing from this device — so it can go to a partner, a parent or
 * a manager as "this is the one I mean". The line under the button says exactly that.
 */
function ShareRun({ runId }: { runId: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/approach?module=${encodeURIComponent(runId)}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else await navigator.clipboard.writeText(url);
      setCopied(true); track("SHARE_LINK_COPIED", { module: runId }); window.setTimeout(() => setCopied(false), 2000);
    } catch { /* Dismissed or refused: the link is not secret; nothing else to do. */ }
  };
  return (
    <div className="play-share">
      <button type="button" className="play-choice" onClick={share}>{copied ? <><Check size={16} weight="bold" aria-hidden="true" /> Link copied</> : <><ShareNetwork size={16} weight="bold" aria-hidden="true" /> Share this run</>}</button>
      <p className="play-share-note">Nothing about you is in the link — only which run it is.</p>
    </div>
  );
}
