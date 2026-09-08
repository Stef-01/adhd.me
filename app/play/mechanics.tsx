"use client";

// The twelve mechanics (PLAY-PLAN.md §3). Each is one component with one contract: it gets the
// round and whether it is live, and calls `onResult(hit, chosen)` exactly once. Every gesture has
// a button behind it, so a keyboard and a screen reader play the same round a thumb does; under
// reduced motion nothing moves on its own and the timer is gone, so the "don't" mechanics end on
// a button the person presses.

import { useEffect, useRef, useState } from "react";
import { Check, HandTap, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { Round } from "@/learn/play";
import { LAYER_LABELS, LAYERS, type Layer } from "@/model/layers";
import { CHARACTER_BIOS, type Mood } from "@/learn/interactive";
import { Scene } from "./scene";
import { Bean } from "./beans";

export interface MechanicProps {
  round: Round;
  live: boolean;
  /** The bean's mood right now; the scene-owning mechanics draw it. */
  mood: Mood;
  reducedMotion: boolean;
  /** 0–1, how much of the timer has drained; 0 under reduced motion. */
  progress: number;
  onResult: (hit: boolean, chosen?: string | string[]) => void;
}

const POP = { type: "spring", stiffness: 520, damping: 28 } as const;

/** Mechanics that draw the scene themselves, with the action on the bean or on a prop in it. */
export function ownsScene(mechanic: Round["mechanic"]): boolean {
  return mechanic === "hold" || mechanic === "dont-tap" || mechanic === "timing" || mechanic === "pause" || mechanic === "catch" || mechanic === "balance";
}

export function Mechanic(props: MechanicProps) {
  switch (props.round.mechanic) {
    case "tap": return <Tap {...props} />;
    case "dont-tap": return <DontTap {...props} />;
    case "hold": return <Hold {...props} />;
    case "swipe": return <Swipe {...props} />;
    case "drag-capture": return <DragCapture {...props} />;
    case "order": return <Order {...props} />;
    case "timing": return <Timing {...props} />;
    case "recall": return <Recall {...props} />;
    case "sort": return <Sort {...props} />;
    case "flip": return <Flip {...props} />;
    case "pause": return <Pause {...props} />;
    case "pick-bean": return <PickBean {...props} />;
    case "catch": return <Catch {...props} />;
    case "balance": return <Balance {...props} />;
  }
}

function Choices({ options, onPick, disabled, pressed }: { options: ReadonlyArray<{ id: string; label: string }>; onPick: (id: string) => void; disabled?: boolean; pressed?: (id: string) => boolean }) {
  return (
    <div className="play-choices" role="group" aria-label="Choices">
      {options.map((o) => (
        <motion.button key={o.id} type="button" className="play-choice" disabled={disabled} aria-pressed={pressed?.(o.id)} onClick={() => onPick(o.id)} whileTap={{ scale: 0.96 }} transition={POP}>
          {o.label}
        </motion.button>
      ))}
    </div>
  );
}

function Tap({ round, live, onResult }: MechanicProps) {
  const [picked, setPicked] = useState<string | null>(null);
  return <Choices options={round.options ?? []} disabled={!live || picked !== null} pressed={(id) => picked === id} onPick={(id) => { setPicked(id); onResult(Boolean(round.options?.find((o) => o.id === id)?.correct), id); }} />;
}

/** The tempting thing sits in the scene. Tapping it is the miss; the timer running out (or "I held" under reduced motion) is the hit. */
function DontTap({ round, live, reducedMotion, mood, onResult }: MechanicProps) {
  const [done, setDone] = useState(false);
  const target = round.options?.[0];
  return (
    <div className="play-dont">
      <Scene prop={round.prop} who={round.who} mood={mood} look={round.look}>
        <motion.button type="button" className="play-tempt in-scene" disabled={!live || done} onClick={() => { setDone(true); onResult(false, target?.id); }} animate={reducedMotion || !live ? {} : { scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          <HandTap size={22} weight="fill" aria-hidden="true" /> {target?.label ?? "Tap"}
        </motion.button>
      </Scene>
      {reducedMotion && live && !done && (
        <button type="button" className="play-choice is-wide" onClick={() => { setDone(true); onResult(true); }}>I held off</button>
      )}
    </div>
  );
}

/** Press and hold the bean; distractions drift across the scene. Letting go early is the miss; holding to the end (or "I held" under reduced motion) is the hit. */
function Hold({ round, live, reducedMotion, progress, mood, onResult }: MechanicProps) {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const finish = (hit: boolean) => { if (done) return; setDone(true); onResult(hit); };
  useEffect(() => { if (!reducedMotion && live && progress >= 1 && started.current) finish(holding); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const bean = (
    <button
      type="button"
      className={`play-bean-hit${holding ? " is-holding" : ""}`}
      disabled={!live || done}
      aria-pressed={holding}
      onPointerDown={() => { started.current = true; setHolding(true); }}
      onPointerUp={() => { if (holding && !reducedMotion) finish(false); setHolding(false); }}
      onPointerLeave={() => { if (holding && !reducedMotion) finish(false); setHolding(false); }}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); started.current = true; setHolding(true); } }}
      onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (holding && !reducedMotion) finish(false); setHolding(false); } }}
    >
      <Bean who={round.who} mood={holding ? "engaged" : mood} size={136} look={round.look} />
      <span className="play-bean-label">{holding ? "Holding…" : "Hold"}</span>
    </button>
  );
  return (
    <div className="play-hold">
      <Scene prop={round.prop} who={round.who} mood={mood} bean={bean}>
        <ul className="play-drift" aria-hidden="true">
          {(round.items ?? []).map((item, i) => (
            <motion.li key={item} style={{ top: `${18 + i * 26}%` }} animate={reducedMotion || !live ? {} : { x: [-220, 400], opacity: [0, 1, 1, 0] }} transition={{ repeat: Infinity, duration: 2.6 + i * 0.5, delay: i * 0.8, ease: "linear" }}>{item}</motion.li>
          ))}
        </ul>
      </Scene>
      {reducedMotion && live && !done && <button type="button" className="play-choice is-wide" onClick={() => finish(true)}>I held on</button>}
    </div>
  );
}

/** Each distraction is a button; clearing them all before the bar drains is the hit. */
function Swipe({ round, live, onResult }: MechanicProps) {
  const [gone, setGone] = useState<string[]>([]);
  const items = round.items ?? [];
  const remove = (item: string) => {
    const next = [...gone, item];
    setGone(next);
    if (next.length === items.length) onResult(true, next);
  };
  return (
    <ul className="play-swipe" aria-label="Distractions">
      {items.map((item) => gone.includes(item) ? null : (
        <li key={item}>
          <motion.button type="button" className="play-chip-big" disabled={!live} onClick={() => remove(item)} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 60) remove(item); }} whileTap={{ scale: 0.95 }} transition={POP}>
            <X size={16} weight="bold" aria-hidden="true" /> {item}
          </motion.button>
        </li>
      ))}
    </ul>
  );
}

/** Tap a request, then tap the note (or drag it there). All captured before the bar drains is the hit. */
function DragCapture({ round, live, onResult }: MechanicProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string[]>([]);
  const items = round.items ?? [];
  const capture = (item: string) => {
    const next = [...captured, item];
    setCaptured(next);
    setSelected(null);
    if (next.length === items.length) onResult(true, next);
  };
  return (
    <div className="play-capture">
      <div className="play-choices" role="group" aria-label="Requests">
        {items.map((item) => captured.includes(item) ? null : (
          <motion.button key={item} type="button" className="play-choice" aria-pressed={selected === item} disabled={!live} onClick={() => setSelected(item)} drag dragSnapToOrigin onDragEnd={(_, info) => { if (info.offset.y > 80) capture(item); }} whileTap={{ scale: 0.96 }} transition={POP}>{item}</motion.button>
        ))}
      </div>
      <button type="button" className={`play-note${selected ? " is-ready" : ""}`} disabled={!live || !selected} onClick={() => selected && capture(selected)} aria-label={selected ? `Put “${selected}” on the note` : "The note — pick a request first"}>
        <span className="play-note-title">The note</span>
        <ul>{captured.map((c) => <li key={c}><Check size={12} weight="bold" aria-hidden="true" /> {c}</li>)}</ul>
        {selected && <span className="play-note-hint">Tap to put “{selected}” here</span>}
      </button>
    </div>
  );
}

/** Tap the options in the right order. Any wrong tap is the miss. */
function Order({ round, live, onResult }: MechanicProps) {
  const [tapped, setTapped] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);
  const order = round.options ?? [];
  const shuffled = useRef([...order].sort((a, b) => a.id.localeCompare(b.id)));
  return (
    <div className="play-order">
      <Choices options={shuffled.current} disabled={!live || wrong || tapped.length === order.length} pressed={(id) => tapped.includes(id)} onPick={(id) => {
        const expected = order[tapped.length]?.id;
        if (id !== expected) { setWrong(true); onResult(false, [...tapped, id]); return; }
        const next = [...tapped, id];
        setTapped(next);
        if (next.length === order.length) onResult(true, next);
      }} />
      <ol className="play-order-trail" aria-live="polite">{tapped.map((id, i) => <li key={id}>{i + 1}. {order.find((o) => o.id === id)?.label}</li>)}</ol>
    </div>
  );
}

/** A bar sweeps from "not now" into "now" under the bean. Tap the bean inside "now" for the hit. Under reduced motion, choose the moment. */
function Timing({ round, live, reducedMotion, progress, mood, onResult }: MechanicProps) {
  const [done, setDone] = useState(false);
  const inNow = progress >= 0.7 && progress <= 0.95;
  if (reducedMotion) {
    const choices = round.options?.length ? round.options : [{ id: "weeks", label: "Three weeks out" }, { id: "days", label: "A few days out" }, { id: "tonight", label: "The night before", correct: true }];
    return (
      <div className="play-timing">
        <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} />
        <Choices options={choices} disabled={!live || done} onPick={(id) => { setDone(true); onResult(Boolean(choices.find((o) => o.id === id)?.correct), id); }} />
      </div>
    );
  }
  const bean = (
    <button type="button" className={`play-bean-hit${inNow ? " is-now" : ""}`} disabled={!live || done} onClick={() => { setDone(true); onResult(inNow, inNow ? "now" : "early"); }}>
      <Bean who={round.who} mood={inNow ? "surprised" : mood} size={136} look={round.look} />
      <span className="play-bean-label">It’s real now</span>
    </button>
  );
  return (
    <div className="play-timing">
      <Scene prop={round.prop} who={round.who} mood={mood} bean={bean}>
        <div className="play-timing-track in-scene" aria-hidden="true">
          <span className="play-timing-zone" />
          <motion.span className="play-timing-marker" style={{ left: `${Math.min(100, progress * 100)}%` }} />
          <span className="play-timing-label" style={{ left: "10%" }}>not now</span>
          <span className="play-timing-label" style={{ left: "82%" }}>now</span>
        </div>
      </Scene>
    </div>
  );
}

/** Show the list, then hide it behind an interruption, then ask what was on it. */
function Recall({ round, live, onResult }: MechanicProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [picked, setPicked] = useState<string[]>([]);
  const items = round.items ?? [];
  const decoys = round.options?.length ? round.options.map((o) => o.label) : ["Bread", "The dry cleaning"];
  const all = [...items, ...decoys].sort();
  return (
    <div className="play-recall">
      {phase === 0 && <>
        <ul className="sim-list">{items.map((i) => <li key={i}>{i}</li>)}</ul>
        <button type="button" className="play-choice" disabled={!live} onClick={() => setPhase(1)}>I have them</button>
      </>}
      {phase === 1 && <>
        <div className="sim-notification" role="status"><strong>Group chat</strong><p>“Are you coming Saturday? Also, the lease?? Call me.”</p></div>
        <button type="button" className="play-choice" disabled={!live} onClick={() => setPhase(2)}>Reply, then keep walking</button>
      </>}
      {phase === 2 && <>
        <div className="play-choices" role="group" aria-label="What was on the list">
          {all.map((o) => <button key={o} type="button" className="play-choice" aria-pressed={picked.includes(o)} disabled={!live} onClick={() => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))}>{o}</button>)}
        </div>
        <button type="button" className="play-tempt" disabled={!live || picked.length === 0} onClick={() => onResult(items.every((i) => picked.includes(i)) && !decoys.some((d) => picked.includes(d)), picked)}>Check</button>
      </>}
    </div>
  );
}

/** Tap a cause, then tap its layer. All placed rightly is the hit; one wrong placement is the miss. */
function Sort({ round, live, onResult }: MechanicProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, Layer>>({});
  const options = round.options ?? [];
  const place = (layer: Layer) => {
    if (!selected) return;
    const next = { ...placed, [selected]: layer };
    setPlaced(next);
    setSelected(null);
    if (Object.keys(next).length === options.length) onResult(options.every((o) => next[o.id] === o.layer), Object.entries(next).map(([k, v]) => `${k}:${v}`));
  };
  return (
    <div className="play-sort">
      <div className="play-choices" role="group" aria-label="Causes">
        {options.map((o) => placed[o.id] ? null : <button key={o.id} type="button" className="play-choice" aria-pressed={selected === o.id} disabled={!live} onClick={() => setSelected(o.id)}>{o.label}</button>)}
      </div>
      <div className="play-layers" role="group" aria-label="Layers">
        {LAYERS.map((layer) => (
          <button key={layer} type="button" className="play-layer" data-layer={layer} disabled={!live || !selected} onClick={() => place(layer)} aria-label={selected ? `Put it in ${LAYER_LABELS[layer]}` : LAYER_LABELS[layer]}>
            {LAYER_LABELS[layer]}
            <small>{options.filter((o) => placed[o.id] === layer).map((o) => o.label).join(", ")}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tap each bean to hear its side; then "Both are true" is the hit. */
function Flip({ round, live, onResult }: MechanicProps) {
  const [seen, setSeen] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const sides = round.options ?? [];
  return (
    <div className="play-flip">
      <div className="play-beans" role="group" aria-label="Perspectives">
        {sides.map((s) => (
          <button key={s.id} type="button" className="play-bean-button" aria-pressed={open === s.id} disabled={!live} onClick={() => { setOpen(s.id); setSeen((x) => (x.includes(s.id) ? x : [...x, s.id])); }}>
            <Bean who={s.bean ?? "sam"} mood={open === s.id ? "surprised" : "neutral"} size={84} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      {open && <blockquote className="perspective-thought"><p>{sides.find((s) => s.id === open)?.thought}</p></blockquote>}
      <button type="button" className="play-tempt" disabled={!live || seen.length < sides.length} onClick={() => onResult(true, seen)}>Both are true</button>
    </div>
  );
}

/** Hold the bean to let the heat drop; release inside the calm zone. Under reduced motion: pause, then return. */
function Pause({ round, live, reducedMotion, mood, onResult }: MechanicProps) {
  const [heat, setHeat] = useState(0.9);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (reducedMotion || !live || done) return;
    const id = window.setInterval(() => setHeat((h) => Math.max(0, Math.min(1, h + (holding ? -0.05 : 0.02)))), 100);
    return () => window.clearInterval(id);
  }, [holding, live, done, reducedMotion]);
  useEffect(() => { if (!reducedMotion && live && !done && heat >= 1) { setDone(true); onResult(false); } /* eslint-disable-line react-hooks/exhaustive-deps */ }, [heat]);
  if (reducedMotion) {
    return (
      <div className="play-pause">
        <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} />
        <Choices options={round.options?.length ? round.options : [{ id: "pause", label: "Say the pause word, leave for twenty minutes", correct: true }, { id: "push", label: "Say the next thing" }]} disabled={!live || done} onPick={(id) => { setDone(true); onResult((round.options?.length ? round.options : [{ id: "pause", correct: true }]).find((o) => o.id === id)?.correct === true, id); }} />
      </div>
    );
  }
  const release = () => { setHolding(false); if (heat < 0.35) { setDone(true); onResult(true); } };
  const bean = (
    <button type="button" className={`play-bean-hit${holding ? " is-holding" : ""}`} disabled={!live || done} aria-pressed={holding}
      onPointerDown={() => setHolding(true)}
      onPointerUp={release}
      onPointerLeave={() => { if (holding) release(); }}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setHolding(true); } }}
      onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(); } }}
    >
      <Bean who={round.who} mood={holding ? (heat < 0.35 ? "relieved" : "thinking") : heat > 0.8 ? "frustrated" : mood} size={136} look={round.look} />
      <span className="play-bean-label">{holding ? "Pausing…" : "Hold to pause"}</span>
    </button>
  );
  return (
    <div className="play-pause">
      <Scene prop={round.prop} who={round.who} mood={mood} bean={bean}>
        <div className="play-heat in-scene" aria-hidden="true"><span style={{ width: `${heat * 100}%` }} /><em style={{ left: "0", width: "35%" }} /></div>
      </Scene>
      <p className="play-heat-label" aria-live="polite">{heat < 0.35 ? "Calm enough to come back" : heat > 0.8 ? "Too hot to talk" : "Cooling"}</p>
    </div>
  );
}

/** Tap the bean whose thought is yours. Always a hit; writes an answer. */
function PickBean({ round, live, onResult }: MechanicProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const multi = Boolean(round.writes?.multi);
  const options = round.options ?? [];
  return (
    <div className="play-pick">
      <div className="play-beans" role="group" aria-label="Which is you">
        {options.map((o) => (
          <button key={o.id} type="button" className="play-bean-button" aria-pressed={picked.includes(o.id)} disabled={!live || (!multi && picked.length > 0)} onClick={() => {
            const next = multi ? (picked.includes(o.id) ? picked.filter((x) => x !== o.id) : [...picked, o.id]) : [o.id];
            setPicked(next);
            if (!multi) onResult(true, o.id);
          }}>
            <Bean who={o.bean ?? "alex"} mood={picked.includes(o.id) ? "pleased" : "neutral"} size={72} />
            <span>{o.label}</span>
            <small className="sr-only">{o.bean ? CHARACTER_BIOS[o.bean].name : ""}</small>
          </button>
        ))}
      </div>
      {multi && <button type="button" className="play-tempt" disabled={!live || picked.length === 0} onClick={() => onResult(true, picked)}>That’s me</button>}
    </div>
  );
}

/**
 * Things fall from the top of the scene, one after another; tap each before it lands. Decoys (the
 * round's options) fall too — tapping one counts against you. Everything worth catching, caught,
 * and no decoy touched, is the hit. Under reduced motion: pick what to keep.
 */
function Catch({ round, live, reducedMotion, progress, mood, onResult }: MechanicProps) {
  const items = round.items ?? [];
  const decoys = (round.options ?? []).map((o) => o.label);
  const all = useRef([...items.map((label, i) => ({ label, decoy: false, key: `i${i}` })), ...decoys.map((label, i) => ({ label, decoy: true, key: `d${i}` }))].sort((a, b) => (a.label.length * 7 + a.key.charCodeAt(1)) % 5 - (b.label.length * 7 + b.key.charCodeAt(1)) % 5));
  const [caught, setCaught] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const n = all.current.length;
  useEffect(() => {
    if (reducedMotion || !live || done || progress < 1) return;
    setDone(true);
    onResult(items.every((i) => caught.includes(i)) && wrong.length === 0, [...caught, ...wrong.map((w) => `x:${w}`)]);
  }, [progress, live, reducedMotion, done, caught, wrong, items, onResult]);
  if (reducedMotion) {
    const choices = all.current.map((x) => ({ id: x.key, label: x.label }));
    return (
      <div className="play-catch">
        <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} />
        <div className="play-choices" role="group" aria-label="What to keep">
          {choices.map((c) => <button key={c.id} type="button" className="play-choice" aria-pressed={picked.includes(c.id)} disabled={!live || done} onClick={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}>{c.label}</button>)}
        </div>
        <button type="button" className="play-tempt is-go" disabled={!live || done || picked.length === 0} onClick={() => { setDone(true); const keep = all.current.filter((x) => picked.includes(x.key)); onResult(keep.length === items.length && keep.every((x) => !x.decoy), keep.map((x) => x.label)); }}>Keep these</button>
      </div>
    );
  }
  // Each thing has a window of the round; inside it, it falls from the top to the ground.
  const win = 1 / n;
  return (
    <div className="play-catch">
      <Scene prop={round.prop} who={round.who} mood={mood} look={round.look}>
        <div className="play-falling" aria-label="Falling things">
          {all.current.map((x, i) => {
            const t = (progress - i * win * 0.85) / (win * 1.3);
            if (t < 0 || t > 1 || caught.includes(x.label) || wrong.includes(x.label)) return null;
            const left = 12 + ((i * 37) % 60);
            return (
              <motion.button key={x.key} type="button" className={`play-fall${x.decoy ? " is-decoy" : ""}`} style={{ left: `${left}%`, top: `${t * 78}%` }} disabled={!live || done} onClick={() => (x.decoy ? setWrong((w) => [...w, x.label]) : setCaught((c) => [...c, x.label]))} whileTap={{ scale: 0.9 }} transition={POP}>
                {x.label}
              </motion.button>
            );
          })}
        </div>
      </Scene>
      <p className="play-heat-label" aria-live="polite">{caught.length} of {items.length} caught{wrong.length ? `, ${wrong.length} to avoid` : ""}</p>
    </div>
  );
}

/**
 * A marker drifts across a bar; the calm zone is the middle. Tap the bean to steady it. Inside the
 * zone when the clock runs out is the hit. Under reduced motion: choose the steadying move.
 */
function Balance({ round, live, reducedMotion, progress, mood, onResult }: MechanicProps) {
  const [x, setX] = useState(0.5);
  const [done, setDone] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    if (reducedMotion || !live || done) return;
    const dt = progress - last.current; last.current = progress;
    // The drift changes direction a few times a round; it is deterministic, so the same round plays the same.
    const dir = Math.sin(progress * 19 + 1) > 0 ? 1 : -1;
    setX((v) => Math.max(0, Math.min(1, v + dir * dt * 1.6)));
    if (progress >= 1) { setDone(true); onResult(x >= 0.3 && x <= 0.7, x.toFixed(2)); }
  }, [progress, live, reducedMotion, done, x, onResult]);
  if (reducedMotion) {
    const choices = round.options ?? [];
    return (
      <div className="play-balance">
        <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} />
        <Choices options={choices} disabled={!live || done} onPick={(id) => { setDone(true); onResult(Boolean(choices.find((o) => o.id === id)?.correct), id); }} />
      </div>
    );
  }
  const inZone = x >= 0.3 && x <= 0.7;
  const bean = (
    <button type="button" className={`play-bean-hit${inZone ? "" : " is-now"}`} disabled={!live || done} onClick={() => setX((v) => v + (0.5 - v) * 0.6)}>
      <Bean who={round.who} mood={inZone ? mood : "overwhelmed"} size={136} look={round.look} />
      <span className="play-bean-label">Steady</span>
    </button>
  );
  return (
    <div className="play-balance">
      <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} bean={bean}>
        <div className="play-timing-track in-scene" aria-hidden="true">
          <span className="play-timing-zone is-middle" />
          <motion.span className="play-timing-marker" style={{ left: `${x * 100}%` }} />
        </div>
      </Scene>
      <p className="play-heat-label" aria-live="polite">{inZone ? "Steady" : x < 0.3 ? "Tipping one way" : "Tipping the other way"}</p>
    </div>
  );
}
