"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Pause, Play, ArrowCounterClockwise, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { allowedMs, game, layoutGame } from "@/lives";
import { LEO_ROUTINE, LEO_SETTLED, leoRoom } from "@/lives/leo-routine";
import { LeoBedroom, LeoMosquito } from "./leo-mosquito";
import { LeoBuzz } from "./leo-buzz";
import type { EngineResult } from "./engines";

const GAME = game("leo_mosquito");
/** One room, one swarm: three waves that grow. The Chaos Run is where levels climb. */
const LEVEL = 1;
/**
  * The round ENDS INTO the routine (2026-09-11, founder-directed), rather than into a menu.
  * There is no beat between them and deliberately so: a timed pause would be a thing to wait
  * through, and the round's own outcome is not lost by going straight there — it is the heading
  * and the line on the routine's first step, which is where the old result screen said it.
  * "success"/"failure" are still the engine's two outcomes and still decide the line that gets
  * said, but neither is a screen any more: both walk into `routine`, because the thing that gets
  * Leo to sleep is the same either way, and a game that only rewards catching every mosquito
  * teaches the opposite of the strategy it is attached to.
  */
type Phase = "ready" | "playing" | "paused" | "routine" | "settled";

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
  /** How the round went, said once at the top of the routine and then let go of. */
  const [roundLine, setRoundLine] = useState("");
  /** How much of the routine is done. Indexes LEO_ROUTINE; at its length, Leo is asleep. */
  const [step, setStep] = useState(0);
  /** How the round ended. It is the heading on the routine's first step, and nothing after that. */
  const [won, setWon] = useState(false);
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
    setRoundLine(result.outcome === "success" ? "Every mosquito caught." : result.line ?? "Some got away.");
    setWon(result.outcome === "success");
    setStep(0);
    changePhase("routine");
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
      if (elapsedRef.current >= duration) { setRoundLine("Time ran out with mosquitoes still in the room."); setWon(false); setStep(0); changePhase("routine"); return; }
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
    elapsedRef.current = 0; setElapsed(0); setRoundLine(""); setStep(0); setAttempt(n => n + 1); changePhase("playing");
  };
  const settled = phase === "settled";
  const after = phase === "routine" || settled;
  const room = leoRoom(step);
  // The line under the button is the consequence of the tap just made, so it reads as something
  // that happened rather than something promised. At the first step there is no previous tap, so
  // the round's own outcome stands there instead — said once, then let go of.
  const said = step === 0 ? roundLine : LEO_ROUTINE[step - 1]!.line;
  return <section data-liquid className="leo-practice lives-run" data-phase={phase} aria-labelledby="leo-title">
    <div className="leo-toolbar">
      <Link href="/lives/learn" aria-label="Back to learning"><ArrowLeft size={22} /></Link>
      <span>Leo & the mosquito</span>
      {phase === "playing" || phase === "paused" ? <button onClick={() => changePhase(phase === "paused" ? "playing" : "paused")} aria-label={phase === "paused" ? "Resume game" : "Pause game"}>{phase === "paused" ? <Play size={22} weight="fill" /> : <Pause size={22} />}</button> : <button onClick={() => setBuzzOn(on => !on)} aria-label="Buzz sounds" aria-pressed={buzzOn}>{buzzOn ? <SpeakerHigh size={22} /> : <SpeakerSlash size={22} />}</button>}
    </div>
    <h1 id="leo-title" ref={title} tabIndex={-1}>{phase === "ready" ? "One tiny sound." : phase === "paused" ? "Take your time." : settled ? "Quiet all night."
      /* The routine opens on the round's own answer and then names what is being done, so the
         outcome is said exactly once and the screen never stops to be waited through. */
      : phase === "routine" ? (step === 0 ? (won ? "Quiet at last." : "Still wide awake.") : "Change the room.") : "GET IT!"}</h1>
    {/* The clock belongs to the round. Nothing in the routine is timed — it is the opposite of the
        round in exactly that way — so the bar and the timer leave rather than sit there at zero. */}
    {!after && <div className="leo-countdown">
      <div className="leo-clock" aria-hidden="true"><span style={{ transform: `scaleX(${phase === "ready" || still ? 1 : Math.max(0, 1 - elapsed / duration)})` }} /></div>
      <span role="timer" aria-label="Time remaining">{still ? "No timer" : `${Math.max(0, Math.ceil((duration - elapsed) / 1000))}s`}</span>
    </div>}
    <div className="leo-board">
      {/* Same room, same drawing, and the round's last frame stays on it until the FIRST tap of the
          routine — the finished swarm, its count and Leo's face, held by the person rather than by
          a timer. From there the plain scene takes over and picks up each thing as it is done. The
          swarm stops its own audio the moment it is handed an outcome, and disposes the graph when
          that first tap unmounts it. */}
      {phase === "ready" ? <LeoBedroom />
        : settled || step > 0 ? <LeoBedroom asleep={settled} windowShut={room.window} headphones={room.headphones} phoneOff={room.phone} reading={room.book} lightOff={room.light} />
        : <LeoMosquito key={attempt} game={GAME} scene={scene} live={phase === "playing"} reducedMotion={still} elapsedMs={elapsed} progress={Math.min(1, elapsed / duration)} onResult={finish} outcome={phase === "routine" ? (won ? "success" : "failure") : undefined} initialAudio={roundAudio.current} onSoundChange={setBuzzOn} />}
      {phase === "paused" && <div className="leo-pause"><button onClick={() => changePhase("playing")}><Play size={22} weight="fill" /> Resume</button></div>}
    </div>
    <div className="leo-bottom">
      {phase === "ready" && <>
        <p>{still ? "Catch every mosquito, one wave at a time." : "Three waves, each bigger. Catch them before Leo can’t settle."}</p>
        <button className="leo-primary" onClick={start}><Play size={20} weight="fill" /> Play Leo’s moment</button>
      </>}
      {phase === "paused" && <p>The clock and mosquitoes are paused.</p>}
      {/* The routine: one step on the screen at a time, each tap a thing that happens to the room
          above. Nothing is skippable and nothing is scored — each tap changes the room. */}
      {phase === "routine" && <>
        <p role="status">{said}</p>
        <button className="leo-primary leo-routine-step" onClick={() => {
          const next = step + 1;
          setStep(next);
          if (next >= LEO_ROUTINE.length) changePhase("settled");
        }}>{LEO_ROUTINE[step]!.label}</button>
      </>}
      {settled && <>
        <p role="status">{LEO_SETTLED}</p>
        <p>Same order tomorrow. One less thing to remember.</p>
        <div className="leo-result-actions"><button className="leo-primary" onClick={start}><ArrowCounterClockwise size={20} /> Play again</button></div>
        <Link className="leo-learn-link" href="/lives/learn?module=lower_sensory_floor_v1">Tiny sounds feel familiar? Explore one idea <ArrowRight size={18} /></Link>
      </>}
    </div>
  </section>;
}
