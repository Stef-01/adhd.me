"use client";

// The ten mechanic engines (PRD v2 §46) as DOM. One contract, like the play mechanics: an
// engine gets the game, whether it is live, the seed's rng, the difficulty, the clock's progress
// and `onResult`, which it calls exactly once. Every gesture has a button behind it, so a
// keyboard and a screen reader play what a thumb does; under reduced motion nothing moves on its
// own and the clock is gone, so every engine ends on a button.
//
// Calm (§14 of the play plan) holds outside the stage: nothing here changes position while a
// person reads. Inside the stage, things may appear and go — that is the game.

import { useEffect, useRef, useState } from "react";
import { HandTap } from "@phosphor-icons/react";
import type { Rng } from "@/lives/random";
import { filterLayout, holdCue, protectLayout, searchLayout, sortQueue, swatLayout, sweepPosition, timingCue, traceLayout, wipeGrid, type Placed } from "@/lives/layout";
import type { DifficultyParameters, GameConfig, GameDefinition } from "@/lives/types";

export interface EngineProps {
  game: GameDefinition;
  live: boolean;
  rng: Rng;
  params: DifficultyParameters;
  /** The active time this game has at this difficulty (§44, §58). */
  allowedMs: number;
  reducedMotion: boolean;
  /** 0–1 of the clock drained; 0 under reduced motion. */
  progress: number;
  onResult: (outcome: "success" | "failure", mistakes?: number) => void;
}

type Of<K extends GameConfig["kind"]> = Extract<GameConfig, { kind: K }>;

export function Engine(props: EngineProps) {
  switch (props.game.config.kind) {
    case "target_swat": return <TargetSwat {...props} config={props.game.config} />;
    case "semantic_filter": return <SemanticFilter {...props} config={props.game.config} />;
    case "trace_path": return <TracePath {...props} config={props.game.config} />;
    case "inhibition": return <Inhibition {...props} config={props.game.config} />;
    case "object_search": return <ObjectSearch {...props} config={props.game.config} />;
    case "goal_protection": return <GoalProtection {...props} config={props.game.config} />;
    case "hold_release": return <HoldRelease {...props} config={props.game.config} />;
    case "rapid_sorting": return <RapidSorting {...props} config={props.game.config} />;
    case "wipe_scrub": return <WipeScrub {...props} config={props.game.config} />;
    case "precision_timing": return <PrecisionTiming {...props} config={props.game.config} />;
  }
}

/** One result per engine, however many events arrive. */
function useOnce(onResult: EngineProps["onResult"]) {
  const done = useRef(false);
  return (outcome: "success" | "failure", mistakes?: number) => { if (done.current) return; done.current = true; onResult(outcome, mistakes); };
}

/** Milliseconds since the engine went live, at ~60 Hz; frozen at 0 under reduced motion or before live. */
function useClock(live: boolean, reducedMotion: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!live || reducedMotion) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => { setT(now - start); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, reducedMotion]);
  return t;
}

const at = (p: { x: number; y: number }) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%` });

/** A thing on the stage a person taps. */
function Thing({ p, className, disabled, onTap, children }: { p: Placed<unknown>; className?: string; disabled?: boolean; onTap: () => void; children: React.ReactNode }) {
  return <button type="button" className={`lives-thing${className ? ` ${className}` : ""}`} style={at(p)} disabled={disabled} onClick={onTap}>{children}</button>;
}

// ── target_swat: tap every target before the clock runs out ─────────────────────────────────
function TargetSwat({ rng, params, live, reducedMotion, progress, onResult, config }: EngineProps & { config: Of<"target_swat"> }) {
  const settle = useOnce(onResult);
  const [layout] = useState(() => swatLayout(rng, config, params));
  const [targets, setTargets] = useState(layout.targets);
  const [hit, setHit] = useState<string[]>([]);
  const escalation = useRef(0);
  // At higher difficulty the targets hop to new places on a beat — the smug mosquito.
  useEffect(() => {
    if (!live || reducedMotion || !layout.hopMs) return;
    const id = window.setInterval(() => { setTargets((ts) => ts.map((t) => ({ ...t, x: 0.1 + rng.next() * 0.8, y: 0.12 + rng.next() * 0.62 }))); escalation.current++; }, layout.hopMs);
    return () => window.clearInterval(id);
  }, [live, reducedMotion, layout.hopMs, rng]);
  useEffect(() => { if (live && progress >= 1) settle("failure", targets.length - hit.length); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const swat = (id: string) => {
    const next = [...hit, id];
    setHit(next);
    if (next.length === targets.length) settle("success", 0);
  };
  const label = (i: number) => config.escalation && escalation.current > 0 ? config.escalation[Math.min(config.escalation.length - 1, escalation.current - 1)]! : targets[i]!.item;
  return (
    <div className="lives-field" role="group" aria-label="Targets">
      {targets.map((t, i) => hit.includes(t.id) ? null : <Thing key={t.id} p={t} className="is-target" disabled={!live} onTap={() => swat(t.id)}>{label(i)}</Thing>)}
    </div>
  );
}

// ── semantic_filter: tap what belongs, leave what does not ──────────────────────────────────
function SemanticFilter({ rng, params, live, progress, onResult, config }: EngineProps & { config: Of<"semantic_filter"> }) {
  const settle = useOnce(onResult);
  const [layout] = useState(() => filterLayout(rng, config, params));
  const [taken, setTaken] = useState<string[]>([]);
  useEffect(() => { if (live && progress >= 1) settle("failure"); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const tap = (id: string) => {
    const item = layout.items.find((i) => i.id === id)!;
    if (!item.relevant) { settle("failure", 1); return; }
    const next = [...taken, id];
    setTaken(next);
    if (next.length === layout.need) settle("success", 0);
  };
  return (
    <div className="lives-grid" role="group" aria-label="Things on the desk">
      {layout.items.map((it) => (
        <button key={it.id} type="button" className="lives-chip" disabled={!live || taken.includes(it.id)} aria-pressed={taken.includes(it.id)} onClick={() => tap(it.id)}>{it.text}</button>
      ))}
    </div>
  );
}

// ── trace_path: draw from the bean to the goal without touching a hazard ────────────────────
function TracePath({ rng, params, live, reducedMotion, progress, onResult, config }: EngineProps & { config: Of<"trace_path"> }) {
  const settle = useOnce(onResult);
  const [layout] = useState(() => traceLayout(rng, config, params));
  const [tracing, setTracing] = useState(false);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const field = useRef<HTMLDivElement>(null);
  useEffect(() => { if (live && progress >= 1) settle("failure"); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const point = (e: React.PointerEvent) => {
    const r = field.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const move = (e: React.PointerEvent) => {
    if (!tracing || !live) return;
    const p = point(e);
    setTrail((t) => (t.length > 60 ? [...t.slice(-59), p] : [...t, p]));
    for (const h of layout.hazards) if (Math.hypot(h.x - p.x, (h.y - p.y) * 0.6) < 0.09) { setTracing(false); settle("failure", 1); return; }
    const goal = layout.points.at(-1)!;
    if (Math.hypot(goal.x - p.x, (goal.y - p.y) * 0.6) < 0.1) { setTracing(false); settle("success", 0); }
  };
  const d = layout.points.map((p, i) => `${i ? "L" : "M"}${(p.x * 100).toFixed(1)} ${(p.y * 100).toFixed(1)}`).join(" ");
  return (
    <div className="lives-field is-trace" ref={field} onPointerMove={move} onPointerUp={() => setTracing(false)} onPointerLeave={() => setTracing(false)}>
      <svg className="lives-trace-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={d} className="lives-corridor" style={{ strokeWidth: layout.width / 4 }} />
        {trail.length > 1 && <polyline className="lives-trail" points={trail.map((p) => `${(p.x * 100).toFixed(1)},${(p.y * 100).toFixed(1)}`).join(" ")} />}
      </svg>
      {layout.hazards.map((h) => <span key={h.id} className="lives-thing is-hazard" style={at(h)} aria-hidden="true">{h.item}</span>)}
      <button type="button" className="lives-thing is-start" style={at(layout.points[0]!)} disabled={!live} aria-label="Start drawing the path" onPointerDown={() => setTracing(true)} onClick={() => { if (reducedMotion) settle("success", 0); }}>{reducedMotion ? "Walk the path" : "Start"}</button>
      <span className="lives-thing is-goal" style={at(layout.points.at(-1)!)} aria-hidden="true">Safe</span>
    </div>
  );
}

// ── inhibition: the button wants pressing; not pressing it is the hit ───────────────────────
function Inhibition({ live, reducedMotion, progress, onResult, config, allowedMs }: EngineProps & { config: Of<"inhibition"> }) {
  const settle = useOnce(onResult);
  const t = useClock(live, reducedMotion);
  useEffect(() => { if (live && progress >= 1) settle("success", 0); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const taunt = config.taunts[Math.min(config.taunts.length - 1, Math.floor((t / allowedMs) * config.taunts.length))] ?? "";
  return (
    <div className="lives-centre">
      <button type="button" className="lives-tempt" data-taunt={taunt} disabled={!live} onClick={() => settle("failure", 1)}>
        <HandTap size={22} weight="fill" aria-hidden="true" /> {config.temptation}
      </button>
      {reducedMotion && live && <button type="button" className="play-choice is-wide" onClick={() => settle("success", 0)}>I held off</button>}
    </div>
  );
}

// ── object_search: find the one thing you came for ──────────────────────────────────────────
function ObjectSearch({ rng, params, live, progress, onResult, config }: EngineProps & { config: Of<"object_search"> }) {
  const settle = useOnce(onResult);
  const [layout] = useState(() => searchLayout(rng, config, params));
  useEffect(() => { if (live && progress >= 1) settle("failure"); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  return (
    <div className="lives-field" role="group" aria-label="Things in the room">
      {layout.things.map((th) => <Thing key={th.id} p={th} disabled={!live} onTap={() => settle(th.item.goal ? "success" : "failure", th.item.goal ? 0 : 1)}>{th.item.text}</Thing>)}
    </div>
  );
}

// ── goal_protection: keep the one thing; send everything else away ──────────────────────────
function GoalProtection({ rng, params, live, reducedMotion, progress, onResult, config, allowedMs }: EngineProps & { config: Of<"goal_protection"> }) {
  const settle = useOnce(onResult);
  const [layout] = useState(() => protectLayout(rng, config, params, allowedMs));
  const t = useClock(live, reducedMotion);
  const [gone, setGone] = useState<string[]>([]);
  useEffect(() => { if (live && progress >= 1) settle(gone.length === layout.intruders.length ? "success" : "failure"); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const dismiss = (id: string) => {
    const next = [...gone, id];
    setGone(next);
    if (next.length === layout.intruders.length) settle("success", 0);
  };
  const showing = layout.intruders.filter((i) => (reducedMotion || t >= i.at) && !gone.includes(i.id));
  return (
    <div className="lives-protect">
      <button type="button" className="lives-keep" disabled={!live} onClick={() => settle("failure", 1)}>{config.keep}</button>
      <ul className="lives-intruders" aria-label="Things that are not on the list">
        {showing.map((i) => <li key={i.id} data-side={i.side}><button type="button" className="lives-chip is-intruder" disabled={!live} onClick={() => dismiss(i.id)}>{i.text} ✕</button></li>)}
      </ul>
    </div>
  );
}

// ── hold_release: hold until the cue, then let go ───────────────────────────────────────────
function HoldRelease({ rng, params, live, reducedMotion, progress, onResult, config, allowedMs }: EngineProps & { config: Of<"hold_release"> }) {
  const settle = useOnce(onResult);
  const [cue] = useState(() => holdCue(rng, allowedMs, params));
  const t = useClock(live, reducedMotion);
  const [holding, setHolding] = useState(false);
  const cued = reducedMotion ? true : t >= cue.at;
  const missed = !reducedMotion && t > cue.at + cue.windowMs;
  useEffect(() => { if (live && !reducedMotion && holding && missed) settle("failure", 1); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [missed, holding, live]);
  useEffect(() => { if (live && progress >= 1) settle("failure"); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const release = () => {
    if (!holding) return;
    setHolding(false);
    if (reducedMotion) return;
    settle(cued && !missed ? "success" : "failure", cued && !missed ? 0 : 1);
  };
  return (
    <div className="lives-centre">
      <button type="button" className={`lives-hold${holding ? " is-holding" : ""}${cued && holding ? " is-cued" : ""}`} disabled={!live} aria-pressed={holding}
        onPointerDown={() => setHolding(true)} onPointerUp={release} onPointerLeave={release}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setHolding(true); } }}
        onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(); } }}>
        {holding ? (cued ? config.releaseAt : "Holding…") : config.verb}
      </button>
      {reducedMotion && live && <button type="button" className="play-choice is-wide" onClick={() => settle("success", 0)}>Let go at “{config.releaseAt}”</button>}
    </div>
  );
}

// ── rapid_sorting: each thing to its bin, quickly ───────────────────────────────────────────
function RapidSorting({ rng, params, live, progress, onResult, config }: EngineProps & { config: Of<"rapid_sorting"> }) {
  const settle = useOnce(onResult);
  const [layout] = useState(() => sortQueue(rng, config, params));
  const [i, setI] = useState(0);
  useEffect(() => { if (live && progress >= 1) settle("failure"); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const current = layout.queue[i];
  const choose = (bin: string) => {
    if (!current) return;
    if (current.bin !== bin) { settle("failure", 1); return; }
    if (i + 1 === layout.queue.length) settle("success", 0); else setI(i + 1);
  };
  return (
    <div className="lives-sort">
      <p className="lives-sort-item" aria-live="polite">{current?.label ?? ""}</p>
      <div className="play-choices" role="group" aria-label="Bins">
        {layout.bins.map((b) => <button key={b} type="button" className="play-choice" disabled={!live || !current} onClick={() => choose(b)}>{b}</button>)}
      </div>
    </div>
  );
}

// ── wipe_scrub: clear the covering ──────────────────────────────────────────────────────────
function WipeScrub({ params, live, reducedMotion, progress, onResult, config }: EngineProps & { config: Of<"wipe_scrub"> }) {
  const settle = useOnce(onResult);
  const grid = wipeGrid(params);
  const [cleared, setCleared] = useState<Set<number>>(() => new Set());
  const down = useRef(false);
  useEffect(() => { if (live && progress >= 1) settle("failure"); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const clear = (n: number) => {
    if (!live || cleared.has(n)) return;
    const next = new Set(cleared); next.add(n); setCleared(next);
    if (next.size >= grid.need) settle("success", 0);
  };
  return (
    <div className="lives-wipe" role="group" aria-label={`Clear the ${config.covering}`} onPointerDown={() => { down.current = true; }} onPointerUp={() => { down.current = false; }} onPointerLeave={() => { down.current = false; }}>
      <div className="lives-wipe-grid" style={{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)` }}>
        {Array.from({ length: grid.cols * grid.rows }, (_, n) => (
          <button key={n} type="button" className={`lives-tile${cleared.has(n) ? " is-clear" : ""}`} disabled={!live} aria-label={cleared.has(n) ? "Cleared" : config.covering} onPointerEnter={() => { if (down.current) clear(n); }} onPointerDown={() => clear(n)} onClick={() => clear(n)} />
        ))}
      </div>
      {reducedMotion && live && <button type="button" className="play-choice is-wide" onClick={() => settle("success", 0)}>Wipe it clear</button>}
    </div>
  );
}

// ── precision_timing: tap at the right mark ─────────────────────────────────────────────────
function PrecisionTiming({ params, live, reducedMotion, progress, onResult, config }: EngineProps & { config: Of<"precision_timing"> }) {
  const settle = useOnce(onResult);
  const cue = timingCue(config, params);
  const t = useClock(live, reducedMotion);
  const pos = reducedMotion ? cue.centre : sweepPosition(t, cue.sweepMs);
  useEffect(() => { if (live && progress >= 1) settle("failure"); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  return (
    <div className="lives-timing">
      <div className="lives-track" aria-hidden="true">
        <span className="lives-zone" style={{ left: `${cue.from * 100}%`, width: `${(cue.to - cue.from) * 100}%` }} />
        <span className="lives-marker" style={{ left: `${pos * 100}%` }} />
        <ol className="lives-marks">{config.marks.map((m, i) => <li key={m} className={i === config.hitIndex ? "is-hit" : ""} style={{ left: `${((i + 0.5) / config.marks.length) * 100}%` }}>{m}</li>)}</ol>
      </div>
      {reducedMotion ? (
        <div className="play-choices" role="group" aria-label="The moment">
          {config.marks.map((m, i) => <button key={m} type="button" className="play-choice" disabled={!live} onClick={() => settle(i === config.hitIndex ? "success" : "failure", i === config.hitIndex ? 0 : 1)}>{m}</button>)}
        </div>
      ) : (
        <button type="button" className="lives-now" disabled={!live} onClick={() => settle(pos >= cue.from && pos <= cue.to ? "success" : "failure", pos >= cue.from && pos <= cue.to ? 0 : 1)}>Now</button>
      )}
    </div>
  );
}
