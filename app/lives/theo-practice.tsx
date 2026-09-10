"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, Pause, Play, ArrowCounterClockwise } from "@phosphor-icons/react";
import { game, layoutGame } from "@/lives";
import { createTheoPlan } from "@/lives/theo-launch";
import { TheoHallway } from "./theo-art";
import { TheoGame } from "./theo-game";

type Phase = "ready" | "playing" | "paused" | "success" | "failure";
const GAME = game("theo_get_out");
export function TheoPractice() {
  const preference = useReducedMotion(); const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [untimed, setUntimed] = useState(false), [level, setLevel] = useState(1), [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready"), [elapsed, setElapsed] = useState(0), [line, setLine] = useState("");
  const phaseRef = useRef(phase), elapsedRef = useRef(0), heading = useRef<HTMLHeadingElement>(null);
  const reduced = mounted && Boolean(preference), still = reduced || untimed;
  const scene = useMemo(() => layoutGame(GAME, level, 2309 + attempt), [level, attempt]);
  const plan = useMemo(() => createTheoPlan(scene.seed, level), [scene.seed, level]);
  const change = (next: Phase) => { phaseRef.current = next; setPhase(next); };
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [phase]);
  useEffect(() => {
    if (phase !== "playing") return;
    let frame = 0, previous = performance.now();
    const tick = (now: number) => {
      if (phaseRef.current !== "playing") return;
      elapsedRef.current += now - previous; previous = now; setElapsed(elapsedRef.current);
      if (elapsedRef.current >= plan.duration) { setLine("Time slipped away. Try gathering the essentials first."); change("failure"); return; }
      frame = requestAnimationFrame(tick);
    };
    const hide = () => { if (document.hidden) change("paused"); };
    document.addEventListener("visibilitychange", hide);
    if (document.hidden) change("paused"); else if (!still) frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", hide); };
  }, [phase, still, plan.duration]);
  const start = () => { elapsedRef.current = 0; setElapsed(0); setAttempt(n => n + 1); setLine(""); change("playing"); };
  const result = phase === "success" || phase === "failure";
  return <section className="theo-practice lives-run" data-phase={phase} aria-labelledby="theo-title">
    <nav className="theo-toolbar" aria-label="Game navigation"><Link href="/approach?pane=games" aria-label="Back to games"><ArrowLeft size={22} /></Link><span>Theo · Out the door</span>{phase === "playing" || phase === "paused" ? <button aria-label={phase === "paused" ? "Resume game" : "Pause game"} onClick={() => change(phase === "paused" ? "playing" : "paused")}>{phase === "paused" ? <Play size={22} /> : <Pause size={22} />}</button> : <span className="theo-toolbar-space" />}</nav>
    <header className="theo-heading"><h1 id="theo-title" ref={heading} tabIndex={-1}>{phase === "ready" ? "Just get out the door." : phase === "success" ? "And you’re off!" : phase === "failure" ? "Still in the hallway." : phase === "paused" ? "The world can wait." : "Essentials. Then exit."}</h1></header>
    {phase === "ready" ? <div className="theo-intro"><div className="theo-intro-art"><TheoHallway /></div><div className="theo-intro-copy"><h2>The plant can wait.</h2><p className="theo-rule">Three detours. Round over. {still ? "Take your time." : `You have ${plan.duration / 1000} seconds.`}</p><label className="theo-setting">Challenge<select aria-label="Challenge" value={level} onChange={e => setLevel(Number(e.target.value))}><option value={1}>Usual · 3 essentials</option><option value={4}>Busy · 4 essentials</option><option value={8}>Chaos · 5 essentials</option></select></label><label className="theo-untimed"><input type="checkbox" checked={still} disabled={reduced} onChange={e => setUntimed(e.target.checked)} /> No timer</label><button className="theo-primary" onClick={start}><Play size={20} weight="fill" /> Play Theo’s morning</button></div></div> : <>
      <div className="theo-time"><span>{still ? "Your pace." : "Time to leave"}</span><strong role="timer" aria-label="Time remaining">{still ? "No timer" : `${Math.max(0, Math.ceil((plan.duration - elapsed) / 1000))}s`}</strong></div>
      <div className="theo-clock" aria-hidden="true"><span style={{ transform: `scaleX(${still ? 1 : Math.max(0, 1 - elapsed / plan.duration)})` }} /></div>
      <div className="theo-play-area"><TheoGame key={attempt} game={GAME} scene={scene} live={phase === "playing"} reducedMotion={reduced} elapsedMs={elapsed} progress={elapsed / plan.duration} outcome={result ? phase : undefined} onResult={r => { if (phaseRef.current !== "playing") return; setLine(r.line ?? ""); change(r.outcome); }} />{phase === "paused" && <div className="theo-pause"><button className="theo-primary" onClick={() => change("playing")}><Play size={20} /> Resume</button></div>}</div>
      {result && <div className="theo-result"><p role="status">{line}</p><div><button className="theo-primary" onClick={start}><ArrowCounterClockwise size={20} /> Play again</button><button className="theo-secondary" onClick={() => change("ready")}>Change challenge</button></div><Link href="/lives/learn?module=launch_pad_v1">Give your essentials a home. Try a launch pad →</Link></div>}
    </>}
  </section>;
}

