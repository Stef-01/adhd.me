"use client";

// L2 (PRD §46): the ten engines as DOM. Each takes the scene the engine laid out, whether it is
// live, the clock's progress, and calls `onResult` exactly once. Every gesture has a button
// behind it, so a keyboard plays what a thumb plays. Under reduced motion nothing moves and
// there is no clock: each engine ends on a choice, and the one that has no natural wrong choice
// offers "Skip this one", which costs a life and says so. `data-outcome` on a reduced-motion
// control names what it does, for the QA record and the browser suite — never for a person.

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { escalatedLabel, markAt, positionAt, releaseVerdict, SCENE, tauntAt, timingHit, traceIsSafe, type Entity, type GameDefinition, type GameScene, type Point } from "@/lives";
import { Glyph } from "./sticker";
import { LeoMosquito } from "./leo-mosquito";

export interface EngineResult { readonly outcome: "success" | "failure"; readonly mistakes: number; readonly line?: string }

export interface EngineProps {
  game: GameDefinition;
  scene: GameScene;
  live: boolean;
  reducedMotion: boolean;
  /** 0–1 of the allowed time; stays 0 under reduced motion. */
  progress: number;
  elapsedMs: number;
  onResult: (result: EngineResult) => void;
  outcome?: "success" | "failure" | "timeout";
}

/** Engines whose clock running out is the win (§51: survive the button; §54: nothing got in). */
export const EXPIRY_IS_SUCCESS = new Set<GameDefinition["engine"]>(["inhibition", "goal_protection"]);

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** A thing in the scene, positioned in design coordinates. */
function Thing({ e, at, children, className, ...rest }: { e: Entity; at?: Point; className?: string; children?: React.ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  const p = at ?? e;
  return (
    <button type="button" className={`lives-thing${className ? ` ${className}` : ""}`} data-role={e.role} style={{ left: pct(p.x, SCENE.width), top: pct(p.y, SCENE.height), width: pct(2 * e.r, SCENE.width) }} {...rest}>
      {children ?? <><Glyph label={e.label} /><span className="lives-thing-label">{e.label}</span></>}
    </button>
  );
}

function useOnce(onResult: EngineProps["onResult"]) {
  const done = useRef(false);
  return useCallback((r: EngineResult) => { if (done.current) return; done.current = true; onResult(r); }, [onResult]);
}

function Skip({ live, onSkip }: { live: boolean; onSkip: () => void }) {
  return <button type="button" className="lives-skip" data-outcome="miss" disabled={!live} onClick={onSkip}>Skip this one (costs a life)</button>;
}

export function Engine(props: EngineProps) {
  if (props.game.id === "leo_mosquito") return <LeoMosquito {...props} />;
  switch (props.game.engine) {
    case "target_swat": return <TargetSwat {...props} />;
    case "semantic_filter": return <SemanticFilter {...props} />;
    case "trace_path": return <TracePath {...props} />;
    case "inhibition": return <Inhibition {...props} />;
    case "object_search": return <ObjectSearch {...props} />;
    case "goal_protection": return <GoalProtection {...props} />;
    case "hold_release": return <HoldRelease {...props} />;
    case "rapid_sorting": return <RapidSorting {...props} />;
    case "wipe_scrub": return <WipeScrub {...props} />;
    case "precision_timing": return <PrecisionTiming {...props} />;
  }
}

/** 1. Target swat (§49): tap every moving thing before the clock runs out. Misses escalate the mosquito. */
function TargetSwat({ game, scene, live, reducedMotion, elapsedMs, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  const [swatted, setSwatted] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const targets = scene.entities.filter((e) => e.role === "target");
  const swat = (id: string) => {
    const next = [...swatted, id];
    setSwatted(next);
    if (next.length === targets.length) finish({ outcome: "success", mistakes: misses });
  };
  return (
    <div className="lives-field" aria-label="The scene" onPointerDown={(e) => { if (live && (e.target as HTMLElement).classList.contains("lives-field")) setMisses((m) => m + 1); }}>
      {targets.map((e) => swatted.includes(e.id) ? null : (
        <Thing key={e.id} e={{ ...e, label: escalatedLabel(game.config, e.label, misses) }} at={reducedMotion ? e : positionAt(e, elapsedMs / 1000)} disabled={!live} data-outcome="hit" onClick={() => swat(e.id)} aria-label={`${escalatedLabel(game.config, e.label, misses)}: tap it`} />
      ))}
      {reducedMotion && <Skip live={live} onSkip={() => finish({ outcome: "failure", mistakes: misses, line: "Skipped." })} />}
    </div>
  );
}

/** 2. Semantic filter (§50): tap only what belongs. One wrong tap is the miss. */
function SemanticFilter({ scene, live, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  const [taken, setTaken] = useState<string[]>([]);
  const targets = scene.entities.filter((e) => e.role === "target");
  const pick = (e: Entity) => {
    if (e.role !== "target") { finish({ outcome: "failure", mistakes: 1, line: `That was ${e.label}.` }); return; }
    const next = [...taken, e.id];
    setTaken(next);
    if (next.length === targets.length) finish({ outcome: "success", mistakes: 0 });
  };
  return (
    <div className="lives-field" aria-label="The scene">
      {scene.entities.map((e) => taken.includes(e.id) ? null : (
        <Thing key={e.id} e={e} disabled={!live} data-outcome={e.role === "target" ? "hit" : "miss"} onClick={() => pick(e)} />
      ))}
    </div>
  );
}

/** 3. Trace path (§48): draw from the bean to the goal without touching a hazard; or pick a route. */
function TracePath({ game, scene, live, reducedMotion, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  const [points, setPoints] = useState<Point[]>([]);
  const [pickRoutes, setPickRoutes] = useState(reducedMotion);
  const surface = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const toDesign = (ev: ReactPointerEvent): Point => {
    const box = surface.current!.getBoundingClientRect();
    return { x: ((ev.clientX - box.left) / box.width) * SCENE.width, y: ((ev.clientY - box.top) / box.height) * SCENE.height };
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const verdict = traceIsSafe(points, scene);
    finish(verdict.safe ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: verdict.reason === "safe" ? undefined : `The path ${verdict.reason}.` });
  };
  const hazards = scene.entities.filter((e) => e.role === "hazard");
  const character = game.character === "random" ? "It" : game.character.charAt(0).toUpperCase() + game.character.slice(1);
  return (
    <div className="lives-field lives-trace" aria-label="The crossing">
      <div
        ref={surface}
        className="lives-trace-surface"
        style={{ touchAction: "none" }}
        onPointerDown={(ev) => { if (!live || pickRoutes) return; drawing.current = true; (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId); setPoints([toDesign(ev)]); }}
        onPointerMove={(ev) => { if (!drawing.current) return; setPoints((p) => [...p, toDesign(ev)]); }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <svg viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} className="lives-trace-art" aria-hidden="true">
          {scene.start && <circle cx={scene.start.x} cy={scene.start.y} r={34} className="lives-trace-start" />}
          {scene.goal && <circle cx={scene.goal.x} cy={scene.goal.y} r={30} className="lives-trace-goal" />}
          {points.length > 1 && <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" className="lives-trace-line" strokeWidth={scene.pathWidth ?? 40} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        {hazards.map((e) => <Thing key={e.id} e={e} tabIndex={-1} aria-hidden="true" className="is-hazard" />)}
        <span className="lives-trace-label is-start" style={{ left: pct(scene.start?.x ?? 0, SCENE.width), top: pct(scene.start?.y ?? 0, SCENE.height) }}>{character}</span>
        <span className="lives-trace-label is-goal" style={{ left: pct(scene.goal?.x ?? 0, SCENE.width), top: pct(scene.goal?.y ?? 0, SCENE.height) }}>Safe</span>
      </div>
      {!pickRoutes && <button type="button" className="lives-skip" disabled={!live} onClick={() => setPickRoutes(true)}>Pick a route instead</button>}
      {pickRoutes && (
        <div className="lives-choices" role="group" aria-label="Routes">
          {(scene.routes ?? []).map((r) => <button key={r.id} type="button" className="lives-choice" data-outcome={r.safe ? "hit" : "miss"} disabled={!live} onClick={() => finish(r.safe ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: `That route met ${hazards[0]?.label ?? "trouble"}.` })}>{r.label}</button>)}
        </div>
      )}
    </div>
  );
}

/** 4. Inhibition (§51): the button wants to be pressed. Do not. */
function Inhibition({ scene, live, reducedMotion, progress, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  const e = scene.entities[0]!;
  const taunt = tauntAt(progress, scene.taunts ?? []);
  const grow = 1 + progress * 0.6;
  return (
    <div className="lives-field lives-inhibit" aria-label="The scene">
      <Thing e={{ ...e, r: e.r * grow }} className={`is-temptation${taunt ? ` taunt-${(scene.taunts ?? []).indexOf(taunt)}` : ""}`} data-outcome="miss" disabled={!live} onClick={() => finish({ outcome: "failure", mistakes: 1, line: "Sent." })} aria-label={`${e.label}: do not press`}>
        <span className="lives-temptation-word">{taunt === "says PRESS IT" ? "PRESS IT" : e.label}</span>
      </Thing>
      {taunt && !reducedMotion && <p className="lives-taunt" aria-live="polite">It {taunt}.</p>}
      {reducedMotion && <button type="button" className="lives-skip is-hold" data-outcome="hit" disabled={!live} onClick={() => finish({ outcome: "success", mistakes: 0 })}>I held off</button>}
    </div>
  );
}

/** 5. Object search (§52): the thing you came for is one of these. */
function ObjectSearch({ scene, live, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  return (
    <div className="lives-field" aria-label="The room">
      {scene.entities.map((e) => (
        <Thing key={e.id} e={e} disabled={!live} data-outcome={e.role === "goal" ? "hit" : "miss"} onClick={() => finish(e.role === "goal" ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: `You left with the ${e.label}.` })} />
      ))}
    </div>
  );
}

/** 6. Goal protection (§54): things fly at the one thing you came for. Clear them; never the thing itself. */
function GoalProtection({ scene, live, reducedMotion, progress, elapsedMs, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  const [cleared, setCleared] = useState<string[]>([]);
  const keep = scene.entities.find((e) => e.role === "keep")!;
  const intruders = scene.entities.filter((e) => e.role === "intruder");
  const seconds = elapsedMs / 1000;
  const allowed = progress > 0 ? elapsedMs / progress : 0;
  const positioned = intruders.map((e) => {
    if (reducedMotion) return { e, at: e, visible: true };
    const enterAt = ((e.at ?? 0) * allowed) / 1000;
    const t = Math.max(0, seconds - enterAt);
    return { e, at: { x: e.x + e.vx * t, y: e.y + e.vy * t }, visible: seconds >= enterAt };
  });
  useEffect(() => {
    if (reducedMotion || !live) return;
    for (const { e, at, visible } of positioned) {
      if (!visible || cleared.includes(e.id)) continue;
      if (Math.hypot(at.x - keep.x, at.y - keep.y) < keep.r + e.r * 0.6) { finish({ outcome: "failure", mistakes: 1, line: `The ${e.label} got in.` }); return; }
    }
  });
  const clear = (id: string) => {
    const next = [...cleared, id];
    setCleared(next);
    if (next.length === intruders.length) finish({ outcome: "success", mistakes: 0 });
  };
  return (
    <div className="lives-field" aria-label="The scene">
      <Thing e={keep} className="is-keep" data-outcome="miss" disabled={!live} onClick={() => finish({ outcome: "failure", mistakes: 1, line: `That was the ${keep.label}.` })} aria-label={`${keep.label}: keep it`} />
      {positioned.map(({ e, at, visible }) => !visible || cleared.includes(e.id) ? null : (
        <Thing key={e.id} e={e} at={at} className="is-intruder" data-outcome="hit" disabled={!live} onClick={() => clear(e.id)} aria-label={`${e.label}: clear it`} />
      ))}
    </div>
  );
}

/** 7. Hold/release (§17): hold the word; let go when it is your turn, not before. */
function HoldRelease({ scene, live, reducedMotion, progress, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  const [holding, setHolding] = useState(false);
  const plan = scene.hold!;
  const cued = progress >= plan.cueAt;
  const release = () => {
    if (!holding) return;
    setHolding(false);
    const verdict = releaseVerdict(progress, plan);
    finish(verdict === "on time" ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: verdict === "early" ? "Out it came." : "The moment passed." });
  };
  if (reducedMotion) {
    return (
      <div className="lives-field lives-hold" aria-label="The conversation">
        <p className="lives-cue">{plan.verb}. Then, at {plan.releaseAt}, say it.</p>
        <div className="lives-choices" role="group" aria-label="What do you do">
          <button type="button" className="lives-choice" data-outcome="hit" disabled={!live} onClick={() => finish({ outcome: "success", mistakes: 0 })}>Wait for {plan.releaseAt}</button>
          <button type="button" className="lives-choice" data-outcome="miss" disabled={!live} onClick={() => finish({ outcome: "failure", mistakes: 1, line: "Out it came." })}>Say it now</button>
        </div>
      </div>
    );
  }
  return (
    <div className="lives-field lives-hold" aria-label="The conversation">
      <p className="lives-cue" aria-live="polite">{cued ? `${plan.releaseAt.charAt(0).toUpperCase()}${plan.releaseAt.slice(1)} — let go` : holding ? "Holding…" : plan.verb}</p>
      <button
        type="button"
        className={`lives-hold-button${holding ? " is-holding" : ""}${cued ? " is-cued" : ""}`}
        disabled={!live}
        aria-pressed={holding}
        onPointerDown={() => setHolding(true)}
        onPointerUp={release}
        onPointerLeave={release}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setHolding(true); } }}
        onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(); } }}
      >
        {plan.verb}
      </button>
    </div>
  );
}

/** 8. Rapid sorting (§13, §19): each thing goes in a bin. The wrong bin is the miss. */
function RapidSorting({ scene, live, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  const [index, setIndex] = useState(0);
  const items = scene.entities.filter((e) => e.role === "item");
  const current = items[index];
  const sort = (bin: string) => {
    if (!current) return;
    if (current.bin !== bin) { finish({ outcome: "failure", mistakes: 1, line: `${current.label} was ${current.bin}.` }); return; }
    if (index + 1 >= items.length) { finish({ outcome: "success", mistakes: 0 }); return; }
    setIndex(index + 1);
  };
  return (
    <div className="lives-field lives-sort" aria-label="The sorting">
      <p className="lives-sort-item" aria-live="polite">{current?.label}</p>
      <p className="lives-sort-count">{index + 1} of {items.length}</p>
      <div className="lives-choices" role="group" aria-label="Bins">
        {(scene.bins ?? []).map((bin) => <button key={bin} type="button" className="lives-choice is-bin" data-outcome={current?.bin === bin ? "hit" : "miss"} disabled={!live} onClick={() => sort(bin)}>{bin}</button>)}
      </div>
    </div>
  );
}

/** 9. Wipe/scrub (§22): the layer over the scene comes off a tile at a time. Clear it all. */
function WipeScrub({ scene, live, reducedMotion, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  const [gone, setGone] = useState<string[]>([]);
  const tiles = scene.entities.filter((e) => e.role === "tile");
  const wipe = (id: string) => {
    if (gone.includes(id)) return;
    const next = [...gone, id];
    setGone(next);
    if (next.length === tiles.length) finish({ outcome: "success", mistakes: 0 });
  };
  const grid = scene.grid!;
  return (
    <div className="lives-field lives-wipe" aria-label="The layer" style={{ touchAction: "none" }}>
      <div className="lives-wipe-grid" style={{ gridTemplateColumns: `repeat(${grid.columns}, 1fr)` }}>
        {tiles.map((e) => gone.includes(e.id) ? <span key={e.id} className="lives-tile is-gone" aria-hidden="true" /> : (
          <button key={e.id} type="button" className="lives-tile" disabled={!live} data-outcome="hit" aria-label={`${e.label}: wipe`} onClick={() => wipe(e.id)} onPointerEnter={(ev) => { if (live && ev.buttons > 0) wipe(e.id); }} onPointerDown={() => wipe(e.id)}>
            <span aria-hidden="true">{e.label}</span>
          </button>
        ))}
      </div>
      <p className="lives-sort-count">{tiles.length - gone.length} left</p>
      {reducedMotion && <Skip live={live} onSkip={() => finish({ outcome: "failure", mistakes: 0, line: "Skipped." })} />}
    </div>
  );
}

/** 10. Precision timing (§53 clock, toast): a marker sweeps the marks; act on the right one. */
function PrecisionTiming({ scene, live, reducedMotion, progress, onResult }: EngineProps) {
  const finish = useOnce(onResult);
  const plan = scene.timing!;
  if (reducedMotion) {
    return (
      <div className="lives-field lives-timing" aria-label="The moment">
        <div className="lives-choices" role="group" aria-label="When">
          {plan.marks.map((m, i) => <button key={m} type="button" className="lives-choice" data-outcome={i === plan.hitIndex ? "hit" : "miss"} disabled={!live} onClick={() => finish(i === plan.hitIndex ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: `${m} was not it.` })}>{m}</button>)}
        </div>
      </div>
    );
  }
  const over = markAt(progress, plan);
  return (
    <div className="lives-field lives-timing" aria-label="The moment">
      <div className="lives-timing-track" aria-hidden="true">
        <span className="lives-timing-zone" style={{ left: `${plan.window.start * 100}%`, width: `${(plan.window.end - plan.window.start) * 100}%` }} />
        <span className="lives-timing-marker" style={{ left: `${Math.min(100, progress * 100)}%` }} />
        <ol className="lives-timing-marks">
          {plan.marks.map((m, i) => <li key={m} className={i === over ? "is-over" : ""} style={{ width: `${100 / plan.marks.length}%` }}>{m}</li>)}
        </ol>
      </div>
      <p className="lives-cue" aria-live="polite">{plan.marks[over]}</p>
      <button type="button" className={`lives-hold-button${timingHit(progress, plan) ? " is-cued" : ""}`} disabled={!live} onClick={() => finish(timingHit(progress, plan) ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: `${plan.marks[over]} was not it.` })}>Now</button>
    </div>
  );
}
