"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Pause, Play, ArrowCounterClockwise, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { allowedMs, game, layoutGame } from "@/lives";
import { LeoBedroom, LeoMosquito } from "./leo-mosquito";
import { LeoBuzz } from "./leo-buzz";
import type { EngineResult } from "./engines";

const GAME = game("leo_mosquito");
/** One room, one swarm: three waves that grow. The Chaos Run is where levels climb. */
const LEVEL = 1;
type Phase = "ready" | "playing" | "paused" | "success" | "failure";

/** Independently replayable. Practice does not write a learning profile or arcade score. */
export function LeoPractice() {
  const prefersReduced = useReducedMotion();
  const [motionReady, setMotionReady] = useState(false);
  const reduced = motionReady && Boolean(prefersReduced);
  // Countdown copy must match the server until hydration has completed.
  useEffect(() => { setMotionReady(true); }, []);
  const [buzzOn, setBuzzOn] = useState(true);
  const roundAudio = useRef<LeoBuzz | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [failureLine, setFailureLine] = useState("");
  const elapsedRef = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  const title = useRef<HTMLHeadingElement>(null);
  const scene = useMemo(() => layoutGame(GAME, LEVEL, 1701 + attempt), [attempt]);
  const duration = allowedMs(GAME, LEVEL);
  // Untimed and still is what reduced motion asks for; nobody has to find a box to get it.
  const still = reduced;
  const changePhase = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const finish = useCallback((result: EngineResult) => {
    if (phaseRef.current !== "playing") return;
    if (result.outcome === "failure") setFailureLine(result.line ?? "The swarm got away. Another go?");
    changePhase(result.outcome);
  }, [changePhase]);

  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [phase]);
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      if (phaseRef.current !== "playing") return;
      elapsedRef.current += now - previous;
      previous = now;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= duration) { setFailureLine("Time ran out with mosquitoes still in the room. Another go?"); changePhase("failure"); return; }
      raf = requestAnimationFrame(tick);
    };
    const hide = () => { if (document.hidden) changePhase("paused"); };
    document.addEventListener("visibilitychange", hide);
    if (document.hidden) changePhase("paused");
    else if (!still) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", hide); };
  }, [phase, still, duration, changePhase]);

  const start = () => {
    roundAudio.current = buzzOn ? new LeoBuzz() : null;
    // Unlock audio during the explicit Play gesture. The game owns and disposes this graph.
    if (roundAudio.current) void roundAudio.current.enable().catch(() => {});
    elapsedRef.current = 0; setElapsed(0); setFailureLine(""); setAttempt(n => n + 1); changePhase("playing");
  };
  const result = phase === "success" || phase === "failure";
  return <section data-liquid className="leo-practice lives-run" data-phase={phase} aria-labelledby="leo-title">
    <div className="leo-toolbar">
      <Link href="/lives/learn" aria-label="Back to learning"><ArrowLeft size={22} /></Link>
      <span>Leo & the mosquito</span>
      {phase === "playing" || phase === "paused" ? <button onClick={() => changePhase(phase === "paused" ? "playing" : "paused")} aria-label={phase === "paused" ? "Resume game" : "Pause game"}>{phase === "paused" ? <Play size={22} weight="fill" /> : <Pause size={22} />}</button> : <button onClick={() => setBuzzOn(on => !on)} aria-label="Buzz sounds" aria-pressed={buzzOn}>{buzzOn ? <SpeakerHigh size={22} /> : <SpeakerSlash size={22} />}</button>}
    </div>
    <h1 id="leo-title" ref={title} tabIndex={-1}>{phase === "ready" ? "One tiny sound." : phase === "paused" ? "Take your time." : phase === "success" ? "Quiet at last." : phase === "failure" ? "Still wide awake." : "GET IT!"}</h1>
    <div className="leo-countdown">
      <div className="leo-clock" aria-hidden="true"><span style={{ transform: `scaleX(${phase === "ready" || still ? 1 : Math.max(0, 1 - elapsed / duration)})` }} /></div>
      <span role="timer" aria-label="Time remaining">{still ? "No timer" : `${Math.max(0, Math.ceil((duration - elapsed) / 1000))}s`}</span>
    </div>
    <div className="leo-board">
      {phase === "ready" ? <LeoBedroom /> : <LeoMosquito key={attempt} game={GAME} scene={scene} live={phase === "playing"} reducedMotion={still} elapsedMs={elapsed} progress={Math.min(1, elapsed / duration)} onResult={finish} outcome={result ? phase : undefined} initialAudio={roundAudio.current} onSoundChange={setBuzzOn} />}
      {phase === "paused" && <div className="leo-pause"><button onClick={() => changePhase("playing")}><Play size={22} weight="fill" /> Resume</button></div>}
    </div>
    <div className="leo-bottom">
      {phase === "ready" && <>
        <p>{still ? "Catch every mosquito, one wave at a time." : "Three waves, each bigger. Catch them before Leo can’t settle."}</p>
        <button className="leo-primary" onClick={start}><Play size={20} weight="fill" /> Play Leo’s moment</button>
      </>}
      {phase === "paused" && <p>The clock and mosquitoes are paused.</p>}
      {result && <>
        <p role="status">{phase === "success" ? "Every mosquito caught. Leo can finally settle." : failureLine}</p>
        <div className="leo-result-actions"><button className="leo-primary" onClick={start}><ArrowCounterClockwise size={20} /> Play again</button></div>
        <Link className="leo-learn-link" href="/lives/learn?module=lower_sensory_floor_v1">Tiny sounds feel familiar? Explore one idea <ArrowRight size={18} /></Link>
      </>}
    </div>
  </section>;
}
