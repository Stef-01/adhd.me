"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Pause, Play, ArrowCounterClockwise, Check } from "@phosphor-icons/react";
import { allowedMs, game, layoutGame, strategy, worldOf } from "@/lives";
import type { LifeJourney } from "@/lives/journeys";
import { Engine, EXPIRY_IS_SUCCESS, type EngineResult } from "./engines";
import { NinaDraft } from "./nina-draft";
import { LifeBean } from "./bean";
import { SceneArt, Sprite } from "./scenes";

type Phase = "playing" | "paused" | "result" | "practice" | "complete";

export function CharacterJourney({ journey }: { journey: LifeJourney }) {
  const preference = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const reduced = mounted && Boolean(preference);
  const [round, setRound] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [elapsed, setElapsed] = useState(0);
  const [outcome, setOutcome] = useState<EngineResult | null>(null);
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState("");
  const phaseRef = useRef<Phase>("playing");
  const elapsedRef = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const definition = game(journey.rounds[round]!.game);
  const untimed = reduced || definition.id === "nina_first_line";
  const level = 1 + round;
  const scene = useMemo(() => layoutGame(definition, level, 4103 + round * 103 + attempt * 17), [definition, level, round, attempt]);
  const duration = allowedMs(definition, level, true);
  const change = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const finish = useCallback((result: EngineResult) => {
    if (phaseRef.current !== "playing") return;
    setOutcome(result); change("result");
  }, [change]);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [round, phase, step]);
  useEffect(() => {
    if (!mounted || phase !== "playing") return;
    let frame = 0, last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += now - last; last = now; setElapsed(elapsedRef.current);
      if (elapsedRef.current >= duration) {
        finish({ outcome: EXPIRY_IS_SUCCESS.has(definition.engine) ? "success" : "failure", mistakes: 0 });
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const hidden = () => { if (document.hidden) change("paused"); };
    document.addEventListener("visibilitychange", hidden);
    if (document.hidden) change("paused"); else if (!untimed) frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", hidden); };
  }, [mounted, phase, untimed, duration, definition.engine, finish, change]);
  const launch = (next: number) => {
    elapsedRef.current = 0; setElapsed(0); setOutcome(null); setRound(next); setAttempt(n => n + 1); change("playing");
  };
  const next = () => {
    if (round + 1 < journey.rounds.length) launch(round + 1);
    else { setStep(0); setFeedback(""); change("practice"); }
  };
  const practical = phase === "practice" || phase === "complete";
  const task = journey.practice[step];
  const resource = strategy(journey.strategy);
  return <section className="character-journey lives-run" data-phase={phase} data-ready={mounted} data-character={journey.who} data-round={round} style={{ "--journey-paper": journey.colour, "--journey-ink": journey.ink } as CSSProperties} aria-labelledby="journey-title">
    <nav className="journey-toolbar" aria-label="Game navigation">
      <Link href="/lives/characters" aria-label="Back to the eight lives"><ArrowLeft size={22} /></Link>
      <span>{journey.who.charAt(0).toUpperCase() + journey.who.slice(1)}</span>
      {phase === "playing" || phase === "paused" ? <button aria-label={phase === "paused" ? "Resume game" : "Pause game"} onClick={() => change(phase === "paused" ? "playing" : "paused")}>{phase === "paused" ? <Play size={22} /> : <Pause size={22} />}</button> : <span />}
    </nav>
    <div className="journey-layout">
      <header className="journey-heading">
        <span className="journey-chapter">{practical ? "Try it in the moment" : `${round + 1} / ${journey.rounds.length}`}</span>
        <h1 id="journey-title" tabIndex={-1} ref={heading}>{phase === "paused" ? "Take your time." : phase === "complete" ? "A little more space." : phase === "practice" ? task!.title : journey.rounds[round]!.title}</h1>
        {!practical && <div className="journey-clock"><span role="timer" aria-label="Time remaining">{untimed ? "Your pace" : `${Math.max(0, Math.ceil((duration - elapsed) / 1000))}s`}</span><div aria-hidden="true"><i style={{ transform: `scaleX(${untimed ? 1 : Math.max(0, 1 - elapsed / duration)})` }} /></div></div>}
        <div className="journey-companion" aria-hidden="true"><LifeBean who={journey.who} mood={phase === "complete" || outcome?.outcome === "success" ? "pleased" : phase === "result" ? "thinking" : "engaged"} size={112} /></div>
      </header>
      <div className="journey-stage lives-scene" data-game={definition.id}>
        {practical ? <div className="lives-world journey-practice-world" data-world={worldOf(definition.id)}><SceneArt game={definition.id} stake={phase === "complete" ? 0 : .3} outcome="success" /><div className="journey-practice-object"><Sprite label={task?.sprite ?? journey.practice[journey.practice.length - 1]!.sprite} /><LifeBean who={journey.who} mood={phase === "complete" ? "pleased" : "thinking"} size={140} /></div></div> : mounted ? definition.id === "nina_first_line" ? <NinaDraft key={`${round}-${attempt}`} live={phase === "playing"} onResult={finish} outcome={outcome?.outcome} /> : <Engine key={`${round}-${attempt}`} game={definition} scene={scene} live={mounted && phase === "playing"} reducedMotion={reduced} progress={Math.min(1, elapsed / duration)} elapsedMs={elapsed} onResult={finish} outcome={outcome?.outcome} /> : null}
        {!practical && (definition.engine !== "trace_path" || definition.id === "nina_first_line") && <span className="journey-scene-character" aria-hidden="true"><LifeBean who={journey.who} mood={outcome?.outcome === "success" ? "pleased" : outcome ? "thinking" : "engaged"} size={56} /></span>}
        {phase === "paused" && <div className="journey-overlay"><button className="journey-primary" onClick={() => change("playing")}><Play size={20} /> Resume</button></div>}
      </div>
      <div className="journey-actions">
        {phase === "result" && <><p role="status">{outcome?.outcome === "success" ? "Got it." : "That moment got away. Another go?"}</p><div className="journey-action-row">{outcome?.outcome === "failure" && <button className="journey-primary" onClick={() => launch(round)}><ArrowCounterClockwise size={18} /> Try again</button>}<button className={outcome?.outcome === "success" ? "journey-primary" : "journey-secondary"} onClick={next}>{round + 1 < journey.rounds.length ? "Next moment" : "Try a different approach"}<ArrowRight size={18} /></button></div></>}
        {phase === "practice" && <><div className="journey-options">{task!.choices.map((choice, index) => <button className="journey-option" key={choice} onClick={() => {
          if (index !== task!.correct) { setFeedback("Try changing one thing that is within reach."); return; }
          setFeedback(task!.effect);
          if (step + 1 === journey.practice.length) change("complete"); else setStep(n => n + 1);
        }}>{choice}<ArrowRight size={18} /></button>)}</div><p role="status">{feedback}</p></>}
        {phase === "complete" && <><motion.span className="journey-complete" initial={reduced ? false : { scale: .92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: .35, bounce: .12 }}><Check size={22} /></motion.span><p role="status">{journey.ending}</p><Link className="journey-primary" href={`/lives/learn?module=${resource.moduleId}`}>Try this in my day<ArrowRight size={18} /></Link><button className="journey-secondary" onClick={() => launch(0)}><ArrowCounterClockwise size={18} /> Play again</button></>}
      </div>
    </div>
  </section>;
}
