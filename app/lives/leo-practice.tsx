"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Pause, Play, ArrowCounterClockwise } from "@phosphor-icons/react";
import { allowedMs, game, layoutGame } from "@/lives";
import { LeoBedroom, LeoMosquito } from "./leo-mosquito";
import type { EngineResult } from "./engines";

const GAME = game("leo_mosquito");
type Phase = "ready" | "playing" | "paused" | "success" | "failure";

/** Independently replayable. Practice does not write a learning profile or arcade score. */
export function LeoPractice() {
  const reduced = Boolean(useReducedMotion());
  const [untimed, setUntimed] = useState(false);
  const [level, setLevel] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  const title = useRef<HTMLHeadingElement>(null);
  const scene = useMemo(() => layoutGame(GAME, level, 1701 + attempt), [level, attempt]);
  const duration = allowedMs(GAME, level);
  const still = reduced || untimed;
  const changePhase = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const finish = useCallback((result: EngineResult) => {
    if (phaseRef.current !== "playing") return;
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
      if (elapsedRef.current >= duration) { changePhase("failure"); return; }
      raf = requestAnimationFrame(tick);
    };
    const hide = () => { if (document.hidden) changePhase("paused"); };
    document.addEventListener("visibilitychange", hide);
    if (document.hidden) changePhase("paused");
    else if (!still) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", hide); };
  }, [phase, still, duration, changePhase]);

  const start = () => { elapsedRef.current = 0; setElapsed(0); setAttempt(n => n + 1); changePhase("playing"); };
  const result = phase === "success" || phase === "failure";
  return <section className="leo-practice lives-run" data-phase={phase} aria-labelledby="leo-title">
    <div className="leo-toolbar">
      <Link href="/lives/learn" aria-label="Back to learning"><ArrowLeft size={22} /></Link>
      <span>Leo & the mosquito</span>
      {phase === "playing" || phase === "paused" ? <button onClick={() => changePhase(phase === "paused" ? "playing" : "paused")} aria-label={phase === "paused" ? "Resume game" : "Pause game"}>{phase === "paused" ? <Play size={22} weight="fill" /> : <Pause size={22} />}</button> : <span className="leo-toolbar-spacer" />}
    </div>
    <h1 id="leo-title" ref={title} tabIndex={-1}>{phase === "ready" ? "One tiny sound." : phase === "paused" ? "Take your time." : phase === "success" ? "Quiet at last." : phase === "failure" ? "Still wide awake." : "GET IT!"}</h1>
    <div className="leo-clock" aria-hidden="true"><span style={{ transform: `scaleX(${phase === "ready" || still ? 1 : Math.max(0, 1 - elapsed / duration)})` }} /></div>
    <div className="leo-board">
      {phase === "ready" ? <LeoBedroom /> : <LeoMosquito key={attempt} game={GAME} scene={scene} live={phase === "playing"} reducedMotion={still} elapsedMs={elapsed} progress={Math.min(1, elapsed / duration)} onResult={finish} outcome={result ? phase : undefined} />}
      {phase === "paused" && <div className="leo-pause"><button onClick={() => changePhase("playing")}><Play size={22} weight="fill" /> Resume</button></div>}
    </div>
    <div className="leo-bottom">
      {phase === "ready" && <>
        <p>Catch the mosquito. Let Leo sleep.</p>
        <div className="leo-options">
          <label>Challenge <select value={level} onChange={e => setLevel(Number(e.target.value))}><option value={1}>One mosquito</option><option value={4}>A little company</option><option value={8}>The whole choir</option></select></label>
          <label className="leo-untimed"><input type="checkbox" checked={still} disabled={reduced} onChange={e => setUntimed(e.target.checked)} /> No timer or movement</label>
        </div>
        <button className="leo-primary" onClick={start}><Play size={20} weight="fill" /> Play Leo’s moment</button>
      </>}
      {phase === "playing" && <p className="leo-hint">{still ? "Tap each mosquito. There’s no rush." : "Catch every mosquito before the bar runs out."}</p>}
      {phase === "paused" && <p>The clock and mosquitoes are paused.</p>}
      {result && <>
        <p role="status">{phase === "success" ? "The smallest thing can take up the whole room." : "The mosquito has other plans. Another go?"}</p>
        <div className="leo-result-actions"><button className="leo-primary" onClick={start}><ArrowCounterClockwise size={20} /> Play again</button><button className="leo-secondary" onClick={() => changePhase("ready")}>Change challenge</button></div>
        <Link className="leo-learn-link" href="/lives/learn?module=lower_sensory_floor_v1">Tiny sounds feel familiar? Explore one idea <ArrowRight size={18} /></Link>
      </>}
    </div>
  </section>;
}
