"use client";

// L2 (PRD §46): the ten engines as DOM. Each takes the scene the engine laid out, whether it is
// live, the clock's progress, and calls `onResult` exactly once. Every gesture has a button
// behind it, so a keyboard plays what a thumb plays. Under reduced motion nothing moves and
// there is no clock: each engine ends on a choice, and the one that has no natural wrong choice
// offers "Skip this one", which costs a life and says so. `data-outcome` on a reduced-motion
// control names what it does, for the QA record and the browser suite — never for a person.
//
// Every engine plays in a drawn place (app/lives/scenes.tsx, docs/design/games-to-leo-standard.md):
// the `Stage` holds the world's palette, the scene behind, and the field the pieces sit on. A
// piece is a drawn `Sprite` inside the same `.lives-thing` button, named by its label; a cleared
// piece leaves as a `Ghost` on a one-shot effect. Motion loops only when the run allows them.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { escalatedLabel, hitFxOf, markAt, positionAt, releaseVerdict, SCENE, tauntAt, timingHit, traceIsSafe, worldOf, type Entity, type GameDefinition, type GameScene, type HitFx, type Point } from "@/lives";
import { LeoMosquito } from "./leo-mosquito";
import { kindFor, SceneArt, Sprite } from "./scenes";

export interface EngineResult { readonly outcome: "success" | "failure"; readonly mistakes: number; readonly line?: string }

export interface EngineProps {
  game: GameDefinition;
  scene: GameScene;
  live: boolean;
  reducedMotion: boolean;
  /** §93 reduced sensory effects: the layout has already capped the field; the engines drop their side strips and idle loops too. */
  reducedSensory?: boolean;
  /** 0–1 of the allowed time; stays 0 under reduced motion. */
  progress: number;
  elapsedMs: number;
  onResult: (result: EngineResult) => void;
  outcome?: "success" | "failure" | "timeout";
}

/** Engines whose clock running out is the win (§51: survive the button; §54: nothing got in). */
export const EXPIRY_IS_SUCCESS = new Set<GameDefinition["engine"]>(["inhibition", "goal_protection"]);

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** A thing in the scene, positioned in design coordinates: a drawn piece named by its label; a caption where the word is the point. */
function Thing({ e, at, index = 0, caption = false, children, className, ...rest }: { e: Entity; at?: Point; index?: number; caption?: boolean; className?: string; children?: ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  const p = at ?? e;
  return (
    <button type="button" className={`lives-thing${caption ? " has-caption" : ""}${className ? ` ${className}` : ""}`} data-role={e.role} data-kind={kindFor(e.label) ?? "note"} aria-label={e.label} style={{ left: pct(p.x, SCENE.width), top: pct(p.y, SCENE.height), width: pct(2 * e.r, SCENE.width), "--i": index } as CSSProperties} {...rest}>
      {children ?? <><Sprite label={e.label} />{caption && <span className="lives-thing-label">{e.label}</span>}</>}
    </button>
  );
}

/** What a cleared piece leaves behind while its exit plays: decorative, never a target, gone from the tree under reduced motion. */
function Ghost({ at, r, fx, label }: { at: Point; r: number; fx: HitFx; label: string }) {
  return (
    <span className="lives-ghost" data-fx={fx} aria-hidden="true" style={{ left: pct(at.x, SCENE.width), top: pct(at.y, SCENE.height), width: pct(2 * r, SCENE.width) }}>
      {fx === "shred" ? [0, 1, 2].map((i) => <Sprite key={i} label={label} />) : <Sprite label={label} />}
    </span>
  );
}

/** The world an engine plays in: the palette root, the drawn place, and the field the pieces sit on. */
function Stage({ game, live, reducedMotion, reducedSensory, outcome, stake = 0, held = false, className, label, onPointerDown, children }: Pick<EngineProps, "game" | "live" | "reducedMotion" | "reducedSensory" | "outcome"> & { stake?: number; held?: boolean; className?: string; label: string; onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void; children: ReactNode }) {
  const motion = !reducedMotion && !reducedSensory;
  return (
    <div className="lives-world" data-world={worldOf(game.id)} data-motion={motion} data-live={live} data-emotion={stake < 0.5 ? "steady" : stake < 0.8 ? "unsettled" : "overwhelmed"}>
      <SceneArt game={game.id} stake={stake} held={held} moving={live && motion} outcome={outcome} />
      <div className={`lives-field${className ? ` ${className}` : ""}`} aria-label={label} onPointerDown={onPointerDown}>{children}</div>
    </div>
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
function TargetSwat({ game, scene, live, reducedMotion, reducedSensory, progress, elapsedMs, onResult, outcome }: EngineProps) {
  const finish = useOnce(onResult);
  const [swatted, setSwatted] = useState<Record<string, Point>>({});
  const [misses, setMisses] = useState(0);
  const targets = scene.entities.filter((e) => e.role === "target");
  const fx = hitFxOf(game.id);
  const swat = (id: string, at: Point) => {
    const next = { ...swatted, [id]: at };
    setSwatted(next);
    if (Object.keys(next).length === targets.length) finish({ outcome: "success", mistakes: misses });
  };
  return (
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} stake={progress} label="The scene" onPointerDown={(e) => { if (live && (e.target as HTMLElement).classList.contains("lives-field")) setMisses((m) => m + 1); }}>
      {targets.map((e, i) => {
        const label = escalatedLabel(game.config, e.label, misses);
        const hit = swatted[e.id];
        if (hit) return reducedMotion ? null : <Ghost key={e.id} at={hit} r={e.r} fx={fx} label={label} />;
        const at = reducedMotion ? e : positionAt(e, elapsedMs / 1000);
        return <Thing key={e.id} e={{ ...e, label }} at={at} index={i} disabled={!live} data-outcome="hit" onClick={() => swat(e.id, at)} aria-label={`${label}: tap it`} />;
      })}
      {reducedMotion && <Skip live={live} onSkip={() => finish({ outcome: "failure", mistakes: misses, line: "Skipped." })} />}
    </Stage>
  );
}

/** 2. Semantic filter (§50): tap only what belongs. One wrong tap is the miss. */
function SemanticFilter({ game, scene, live, reducedMotion, reducedSensory, onResult, outcome }: EngineProps) {
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
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} stake={targets.length ? taken.length / targets.length : 0} label="The scene">
      {scene.entities.map((e, i) => taken.includes(e.id)
        ? (reducedMotion ? null : <Ghost key={e.id} at={e} r={e.r} fx="collect" label={e.label} />)
        : <Thing key={e.id} e={e} index={i} caption disabled={!live} data-outcome={e.role === "target" ? "hit" : "miss"} onClick={() => pick(e)} />)}
    </Stage>
  );
}

/** 3. Trace path (§48): draw from the bean to the goal without touching a hazard; or pick a route. */
function TracePath({ game, scene, live, reducedMotion, reducedSensory, progress, onResult, outcome }: EngineProps) {
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
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} stake={progress} className="lives-trace" label="The crossing">
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
        {hazards.map((e, i) => <Thing key={e.id} e={e} index={i} caption tabIndex={-1} aria-hidden="true" className="is-hazard" />)}
        <span className="lives-trace-label is-start" style={{ left: pct(scene.start?.x ?? 0, SCENE.width), top: pct(scene.start?.y ?? 0, SCENE.height) }}>{character}</span>
        <span className="lives-trace-label is-goal" style={{ left: pct(scene.goal?.x ?? 0, SCENE.width), top: pct(scene.goal?.y ?? 0, SCENE.height) }}>Safe</span>
      </div>
      {!pickRoutes && <button type="button" className="lives-skip" disabled={!live} onClick={() => setPickRoutes(true)}>Pick a route instead</button>}
      {pickRoutes && (
        <div className="lives-choices" role="group" aria-label="Routes">
          {(scene.routes ?? []).map((r) => <button key={r.id} type="button" className="lives-choice" data-outcome={r.safe ? "hit" : "miss"} disabled={!live} onClick={() => finish(r.safe ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: `That route met ${hazards[0]?.label ?? "trouble"}.` })}>{r.label}</button>)}
        </div>
      )}
    </Stage>
  );
}

/** 4. Inhibition (§51): the button wants to be pressed. Do not. */
function Inhibition({ game, scene, live, reducedMotion, reducedSensory, progress, onResult, outcome }: EngineProps) {
  const finish = useOnce(onResult);
  const e = scene.entities[0]!;
  const taunt = tauntAt(progress, scene.taunts ?? []);
  const grow = 1 + progress * 0.6;
  return (
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} stake={progress} className="lives-inhibit" label="The scene">
      <Thing e={{ ...e, r: e.r * grow }} className={`is-temptation${taunt ? ` taunt-${(scene.taunts ?? []).indexOf(taunt)}` : ""}`} data-outcome="miss" disabled={!live} onClick={() => finish({ outcome: "failure", mistakes: 1, line: "Sent." })} aria-label={`${e.label}: do not press`}>
        <Sprite label={e.label} />
        <span className="lives-temptation-word">{taunt === "says PRESS IT" ? "PRESS IT" : e.label}</span>
      </Thing>
      {taunt && !reducedMotion && !reducedSensory && <p className="lives-taunt" aria-live="polite">It {taunt}.</p>}
      {reducedMotion && <button type="button" className="lives-skip is-hold" data-outcome="hit" disabled={!live} onClick={() => finish({ outcome: "success", mistakes: 0 })}>I held off</button>}
    </Stage>
  );
}

/** 5. Object search (§52): the thing you came for is one of these. */
function ObjectSearch({ game, scene, live, reducedMotion, reducedSensory, onResult, outcome }: EngineProps) {
  const finish = useOnce(onResult);
  return (
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} label="The room">
      {scene.entities.map((e, i) => (
        <Thing key={e.id} e={e} index={i} caption disabled={!live} data-outcome={e.role === "goal" ? "hit" : "miss"} onClick={() => finish(e.role === "goal" ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: `You left with the ${e.label}.` })} />
      ))}
    </Stage>
  );
}

/** 6. Goal protection (§54): things fly at the one thing you came for. Clear them; never the thing itself. */
function GoalProtection({ game, scene, live, reducedMotion, reducedSensory, progress, elapsedMs, onResult, outcome }: EngineProps) {
  const finish = useOnce(onResult);
  const [cleared, setCleared] = useState<Record<string, Point>>({});
  const keep = scene.entities.find((e) => e.role === "keep")!;
  const intruders = scene.entities.filter((e) => e.role === "intruder");
  const fx = hitFxOf(game.id);
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
      if (!visible || cleared[e.id]) continue;
      if (Math.hypot(at.x - keep.x, at.y - keep.y) < keep.r + e.r * 0.6) { finish({ outcome: "failure", mistakes: 1, line: `The ${e.label} got in.` }); return; }
    }
  });
  const clear = (id: string, at: Point) => {
    const next = { ...cleared, [id]: at };
    setCleared(next);
    if (Object.keys(next).length === intruders.length) finish({ outcome: "success", mistakes: 0 });
  };
  return (
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} stake={progress} label="The scene">
      <Thing e={keep} className="is-keep" data-outcome="miss" disabled={!live} onClick={() => finish({ outcome: "failure", mistakes: 1, line: `That was the ${keep.label}.` })} aria-label={`${keep.label}: keep it`} />
      {positioned.map(({ e, at, visible }, i) => {
        const gone = cleared[e.id];
        if (gone) return reducedMotion ? null : <Ghost key={e.id} at={gone} r={e.r} fx={fx} label={e.label} />;
        if (!visible) return null;
        return <Thing key={e.id} e={e} at={at} index={i} className="is-intruder" data-outcome="hit" disabled={!live} onClick={() => clear(e.id, at)} aria-label={`${e.label}: clear it`} />;
      })}
    </Stage>
  );
}

/** What the hand holds, per game: the lid, the tissue, the word, the thread. */
const HOLD_KIND: Record<string, string> = { rogue_blender: "lid", sneeze: "cloud", zoe_keyword: "thought", arjun_hold_thread: "thread" };

/** 7. Hold/release (§17): hold the word; let go when it is your turn, not before. */
function HoldRelease({ game, scene, live, reducedMotion, reducedSensory, progress, onResult, outcome }: EngineProps) {
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
      <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} className="lives-hold" label="The conversation">
        <p className="lives-cue">{plan.verb}. Then, at {plan.releaseAt}, say it.</p>
        <div className="lives-choices" role="group" aria-label="What do you do">
          <button type="button" className="lives-choice" data-outcome="hit" disabled={!live} onClick={() => finish({ outcome: "success", mistakes: 0 })}>Wait for {plan.releaseAt}</button>
          <button type="button" className="lives-choice" data-outcome="miss" disabled={!live} onClick={() => finish({ outcome: "failure", mistakes: 1, line: "Out it came." })}>Say it now</button>
        </div>
      </Stage>
    );
  }
  return (
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} stake={progress} held={holding} className="lives-hold" label="The conversation">
      <p className="lives-cue" aria-live="polite">{cued ? `${plan.releaseAt.charAt(0).toUpperCase()}${plan.releaseAt.slice(1)}, let go` : holding ? "Holding…" : plan.verb}</p>
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
        <Sprite kind={HOLD_KIND[game.id] ?? "speech"} />
        {plan.verb}
      </button>
    </Stage>
  );
}

/** 8. Rapid sorting (§13, §19): each thing goes in a bin. The wrong bin is the miss. */
function RapidSorting({ game, scene, live, reducedMotion, reducedSensory, onResult, outcome }: EngineProps) {
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
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} stake={items.length ? index / items.length : 0} className="lives-sort" label="The sorting">
      <p key={index} className="lives-sort-item" aria-live="polite"><Sprite label={current?.label ?? ""} fallback="speech" />{current?.label}</p>
      <p className="lives-sort-count">{index + 1} of {items.length}</p>
      <div className="lives-choices" role="group" aria-label="Bins">
        {(scene.bins ?? []).map((bin) => <button key={bin} type="button" className="lives-choice is-bin" data-outcome={current?.bin === bin ? "hit" : "miss"} disabled={!live} onClick={() => sort(bin)}><Sprite label={bin} fallback="tray" />{bin}</button>)}
      </div>
    </Stage>
  );
}

/** 9. Wipe/scrub (§22): the layer over the scene comes off a tile at a time. Clear it all. */
function WipeScrub({ game, scene, live, reducedMotion, reducedSensory, onResult, outcome }: EngineProps) {
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
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} stake={tiles.length ? gone.length / tiles.length : 0} className="lives-wipe" label="The layer">
      <div className="lives-wipe-grid" style={{ gridTemplateColumns: `repeat(${grid.columns}, 1fr)`, touchAction: "none" }}>
        {tiles.map((e) => gone.includes(e.id) ? <span key={e.id} className="lives-tile is-gone" aria-hidden="true">{!reducedMotion && <Sprite label={e.label} />}</span> : (
          <button key={e.id} type="button" className="lives-tile" disabled={!live} data-outcome="hit" aria-label={`${e.label}: wipe`} onClick={() => wipe(e.id)} onPointerEnter={(ev) => { if (live && ev.buttons > 0) wipe(e.id); }} onPointerDown={() => wipe(e.id)}>
            <Sprite label={e.label} />
          </button>
        ))}
      </div>
      <p className="lives-sort-count">{tiles.length - gone.length} left</p>
      {reducedMotion && <Skip live={live} onSkip={() => finish({ outcome: "failure", mistakes: 0, line: "Skipped." })} />}
    </Stage>
  );
}

/** What the tap acts on, per game: the toaster's lever, the lamp's cord, the towel. */
const TIMING_KIND: Record<string, string> = { toast: "toast", leo_lights_out: "cord", theo_shower: "towel" };

/** 10. Precision timing (§53 clock, toast): a marker sweeps the marks; act on the right one. */
function PrecisionTiming({ game, scene, live, reducedMotion, reducedSensory, progress, onResult, outcome }: EngineProps) {
  const finish = useOnce(onResult);
  const plan = scene.timing!;
  if (reducedMotion) {
    return (
      <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} className="lives-timing" label="The moment">
        <div className="lives-choices" role="group" aria-label="When">
          {plan.marks.map((m, i) => <button key={m} type="button" className="lives-choice" data-outcome={i === plan.hitIndex ? "hit" : "miss"} disabled={!live} onClick={() => finish(i === plan.hitIndex ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: `${m} was not it.` })}>{m}</button>)}
        </div>
      </Stage>
    );
  }
  const over = markAt(progress, plan);
  return (
    <Stage game={game} live={live} reducedMotion={reducedMotion} reducedSensory={reducedSensory} outcome={outcome} stake={progress} className="lives-timing" label="The moment">
      <div className="lives-timing-track" aria-hidden="true">
        <span className="lives-timing-zone" style={{ left: `${plan.window.start * 100}%`, width: `${(plan.window.end - plan.window.start) * 100}%` }} />
        <span className="lives-timing-marker" style={{ left: `${Math.min(100, progress * 100)}%` }} />
        <ol className="lives-timing-marks">
          {plan.marks.map((m, i) => <li key={m} className={i === over ? "is-over" : ""} style={{ width: `${100 / plan.marks.length}%` }}>{m}</li>)}
        </ol>
      </div>
      <p className="lives-cue" aria-live="polite">{plan.marks[over]}</p>
      <button type="button" className={`lives-hold-button${timingHit(progress, plan) ? " is-cued" : ""}`} disabled={!live} onClick={() => finish(timingHit(progress, plan) ? { outcome: "success", mistakes: 0 } : { outcome: "failure", mistakes: 1, line: `${plan.marks[over]} was not it.` })}><Sprite kind={TIMING_KIND[game.id] ?? "clock"} />Now</button>
    </Stage>
  );
}
