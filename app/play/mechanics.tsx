"use client";

// The fourteen mechanics (PLAY-PLAN.md §3; docs/design/games-to-leo-standard.md §4, the mechanic
// table). Each is one component with one contract: it gets the round and whether it is live, and
// calls `onResult(hit, chosen)` exactly once. Every gesture has a button behind it, so a keyboard
// and a screen reader play the same round a thumb does; under reduced motion nothing moves on its
// own and the timer is gone, so the "don't" mechanics end on a button the person presses.
//
// To Leo's standard: the thing you tap, hold, drag, swipe, order, catch or balance is drawn (a
// glyph on a card, a ring around the bean, a timeline with stations, a tray that tilts), moves
// the way that thing would, and reacts once to the touch (a fling, a pin, a squash, a flip). The
// word stays on every piece, so every accessible name is what it was. The rules, timings, scoring
// and result lines are untouched: this file changes what a person sees and feels, not what counts.

import { useEffect, useRef, useState } from "react";
import { Check, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { Round } from "@/learn/play";
import { LAYER_LABELS, LAYERS, type Layer } from "@/model/layers";
import { CHARACTER_BIOS, type Mood, type Prop } from "@/learn/interactive";
import { Scene } from "./scene";
import { Bean } from "./beans";
import { Glyph, LayerGlyph } from "./glyphs";

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
const SETTLE = { type: "spring", stiffness: 380, damping: 26 } as const;

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

/**
 * The options as objects (the essay, a tab, a snack): a drawn glyph on each card, read off the
 * option's own words, the chosen one lifting. Under motion the cards arrive one after another;
 * under reduced motion they are simply there.
 */
function Choices({ options, onPick, disabled, pressed, prop, reducedMotion, label = "Choices" }: { options: ReadonlyArray<{ id: string; label: string }>; onPick: (id: string) => void; disabled?: boolean; pressed?: (id: string) => boolean; prop?: Prop; reducedMotion?: boolean; label?: string }) {
  return (
    <div className="play-choices" role="group" aria-label={label}>
      {options.map((o, i) => {
        const on = pressed?.(o.id) ?? false;
        return (
          <motion.button key={o.id} type="button" className="play-choice play-object" disabled={disabled} aria-pressed={on} onClick={() => onPick(o.id)}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: on ? -4 : 0 }} transition={{ ...SETTLE, delay: reducedMotion ? 0 : i * 0.06 }} whileTap={{ scale: 0.96 }}>
            <Glyph text={o.label} prop={prop} size={24} />
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function Tap({ round, live, reducedMotion, onResult }: MechanicProps) {
  const [picked, setPicked] = useState<string | null>(null);
  return <Choices options={round.options ?? []} prop={round.prop} reducedMotion={reducedMotion} disabled={!live || picked !== null} pressed={(id) => picked === id} onPick={(id) => { setPicked(id); onResult(Boolean(round.options?.find((o) => o.id === id)?.correct), id); }} />;
}

/**
 * One tempting object sits in the scene and pulses (not under reduced motion). Tapping it is
 * the miss; the timer running out (or "I held off" under reduced motion) is the hit. The stake
 * is the clock: the place changes as the wait holds.
 */
function DontTap({ round, live, reducedMotion, progress, mood, onResult }: MechanicProps) {
  const [done, setDone] = useState(false);
  const target = round.options?.[0];
  const moving = !reducedMotion && live && !done;
  return (
    <div className="play-dont">
      <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} stake={progress}>
        <div className="play-tempt-spot in-scene">
          {moving && <motion.span className="play-tempt-pull" aria-hidden="true" animate={{ scale: [0.9, 1.45], opacity: [0.5, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut" }} />}
          <motion.button type="button" className="play-tempt play-tempt-thing" disabled={!live || done} onClick={() => { setDone(true); onResult(false, target?.id); }}
            animate={moving ? { y: [0, -6, 0], rotate: [0, -2, 2, 0] } : { y: 0, rotate: 0 }} transition={moving ? { repeat: Infinity, duration: 1.6, ease: "easeInOut" } : { duration: 0 }} whileTap={{ scale: 0.94 }}>
            <Glyph text={target?.label ?? ""} prop={round.prop} size={30} />
            <span>{target?.label ?? "Tap"}</span>
          </motion.button>
        </div>
      </Scene>
      {reducedMotion && live && !done && (
        <button type="button" className="play-choice is-wide" onClick={() => { setDone(true); onResult(true); }}>I held off</button>
      )}
    </div>
  );
}

const RING = 2 * Math.PI * 46;

/**
 * Press and hold the bean; a ring fills around it as the round runs and glows when full.
 * Distractions drift across the scene as drawn things. Letting go early is the miss; holding to
 * the end (or "I held on" under reduced motion) is the hit.
 */
function Hold({ round, live, reducedMotion, progress, mood, onResult }: MechanicProps) {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const finish = (hit: boolean) => { if (done) return; setDone(true); onResult(hit); };
  useEffect(() => { if (!reducedMotion && live && progress >= 1 && started.current) finish(holding); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [progress, live]);
  const moving = !reducedMotion && live && !done;
  const filled = started.current ? progress : 0;
  const bean = (
    <button
      type="button"
      className={`play-bean-hit play-hold-hit${holding ? " is-holding" : ""}${filled > 0.9 ? " is-full" : ""}`}
      disabled={!live || done}
      aria-pressed={holding}
      onPointerDown={() => { started.current = true; setHolding(true); }}
      onPointerUp={() => { if (holding && !reducedMotion) finish(false); setHolding(false); }}
      onPointerLeave={() => { if (holding && !reducedMotion) finish(false); setHolding(false); }}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); started.current = true; setHolding(true); } }}
      onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (holding && !reducedMotion) finish(false); setHolding(false); } }}
    >
      <span className="play-ring" aria-hidden="true">
        <svg viewBox="0 0 100 100"><circle className="play-ring-track" cx="50" cy="50" r="46" /><circle className="play-ring-fill" cx="50" cy="50" r="46" strokeDasharray={RING} strokeDashoffset={RING * (1 - filled)} /></svg>
      </span>
      <Bean who={round.who} mood={holding ? "engaged" : mood} size={136} look={round.look} />
      <span className="play-bean-label">{holding ? "Holding…" : (round.verb ?? "Hold")}</span>
    </button>
  );
  return (
    <div className="play-hold">
      <Scene prop={round.prop} who={round.who} mood={mood} bean={bean} stake={filled}>
        <ul className="play-drift" aria-hidden="true" data-still={!moving}>
          {(round.items ?? []).map((item, i) => (
            <motion.li key={item} style={{ top: `${12 + i * 24}%` }} animate={moving ? { x: [-240, 420], y: [0, -6, 4, 0], opacity: [0, 1, 1, 0] } : { x: 0, y: 0, opacity: 1 }} transition={moving ? { repeat: Infinity, duration: 2.8 + i * 0.5, delay: i * 0.9, ease: "linear" } : { duration: 0 }}>
              <Glyph text={item} prop={round.prop} size={18} /> {item}
            </motion.li>
          ))}
        </ul>
      </Scene>
      {reducedMotion && live && !done && <button type="button" className="play-choice is-wide" onClick={() => finish(true)}>I held on</button>}
    </div>
  );
}

const FLING = { out: (dir: number) => ({ x: 640 * dir, rotate: 18 * dir, opacity: 0, transition: { duration: 0.32, ease: "easeIn" as const } }) };

/**
 * Each distraction is a drawn card in a hand; swipe one and it flings off the edge, tap one and
 * it goes the same way. Clearing them all before the bar drains is the hit. Under reduced motion
 * the card is simply gone.
 */
function Swipe({ round, live, reducedMotion, onResult }: MechanicProps) {
  const [gone, setGone] = useState<string[]>([]);
  const [dir, setDir] = useState<1 | -1>(1);
  const items = round.items ?? [];
  const remove = (item: string, way: 1 | -1) => {
    if (gone.includes(item)) return;
    setDir(way);
    const next = [...gone, item];
    setGone(next);
    if (next.length === items.length) onResult(true, next);
  };
  return (
    <ul className="play-swipe" aria-label="Distractions">
      <AnimatePresence initial={false} custom={dir}>
        {items.map((item, i) => gone.includes(item) ? null : (
          <motion.li key={item} className="play-swipe-slot" style={{ zIndex: items.length - i }} layout={!reducedMotion} custom={dir} variants={reducedMotion ? undefined : FLING} exit={reducedMotion ? undefined : "out"}
            initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SETTLE, delay: reducedMotion ? 0 : i * 0.08 }}
            drag={reducedMotion ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.9} onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 60) remove(item, info.offset.x > 0 ? 1 : -1); }}>
            <motion.button type="button" className="play-chip-big play-swipe-card" disabled={!live} onClick={() => remove(item, 1)} whileTap={{ scale: 0.97 }} transition={POP}>
              <Glyph text={item} prop={round.prop} size={24} />
              <X size={16} weight="bold" aria-hidden="true" /> {item}
            </motion.button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** The place a request is captured to, drawn by the world: a fridge door, a calendar, a phone list, the launch pad shelf, or a notepad. */
function NoteArt({ prop }: { prop?: Prop }) {
  switch (prop) {
    case "kitchen": case "bill": case "living": return <svg className="play-note-art" viewBox="0 0 80 96" aria-hidden="true"><rect x="10" y="4" width="60" height="88" rx="8" className="n-light" /><rect x="10" y="4" width="60" height="88" rx="8" fill="none" className="n-mid" strokeWidth="3" /><path d="M10 40h60" className="n-mid" strokeWidth="3" /><rect x="16" y="14" width="5" height="18" rx="2.5" className="n-mid" /><rect x="16" y="50" width="5" height="26" rx="2.5" className="n-mid" /><circle cx="52" cy="20" r="4" className="n-accent" /><circle cx="40" cy="58" r="3" className="n-warm" /></svg>;
    case "calendar": return <svg className="play-note-art" viewBox="0 0 80 96" aria-hidden="true"><rect x="8" y="10" width="64" height="76" rx="8" className="n-light" /><rect x="8" y="10" width="64" height="76" rx="8" fill="none" className="n-mid" strokeWidth="3" /><rect x="8" y="10" width="64" height="18" rx="8" className="n-deep" /><rect x="8" y="20" width="64" height="8" className="n-deep" /><g className="n-mid"><rect x="16" y="36" width="12" height="10" rx="2" /><rect x="34" y="36" width="12" height="10" rx="2" /><rect x="52" y="36" width="12" height="10" rx="2" /><rect x="16" y="52" width="12" height="10" rx="2" /><rect x="52" y="52" width="12" height="10" rx="2" /><rect x="16" y="68" width="12" height="10" rx="2" /></g><rect x="34" y="52" width="12" height="10" rx="2" className="n-accent" /></svg>;
    case "phone": return <svg className="play-note-art" viewBox="0 0 80 96" aria-hidden="true"><rect x="16" y="2" width="48" height="92" rx="10" className="n-deep" /><rect x="21" y="10" width="38" height="74" rx="5" className="n-light" /><g className="n-mid"><rect x="26" y="20" width="28" height="4" rx="2" /><rect x="26" y="32" width="22" height="4" rx="2" /><rect x="26" y="44" width="26" height="4" rx="2" /></g><circle cx="40" cy="74" r="4" className="n-accent" /></svg>;
    case "door": case "street": return <svg className="play-note-art" viewBox="0 0 80 96" aria-hidden="true"><path d="M12 20h56" className="n-deep" strokeWidth="4" strokeLinecap="round" /><circle cx="24" cy="27" r="3" className="n-warm" /><circle cx="40" cy="27" r="3" className="n-warm" /><circle cx="56" cy="27" r="3" className="n-warm" /><rect x="8" y="54" width="64" height="8" rx="3" className="n-deep" /><rect x="14" y="62" width="5" height="30" className="n-mid" /><rect x="61" y="62" width="5" height="30" className="n-mid" /><circle cx="24" cy="47" r="5" fill="none" className="n-warm" strokeWidth="3" /><path d="M29 47h9" className="n-warm" strokeWidth="3" strokeLinecap="round" /></svg>;
    default: return <svg className="play-note-art" viewBox="0 0 80 96" aria-hidden="true"><rect x="10" y="10" width="60" height="82" rx="6" className="n-light" /><rect x="10" y="10" width="60" height="82" rx="6" fill="none" className="n-mid" strokeWidth="3" /><g className="n-mid"><circle cx="24" cy="10" r="4" /><circle cx="40" cy="10" r="4" /><circle cx="56" cy="10" r="4" /></g><g className="n-mid" opacity=".6"><rect x="18" y="30" width="44" height="3" rx="1.5" /><rect x="18" y="44" width="44" height="3" rx="1.5" /><rect x="18" y="58" width="44" height="3" rx="1.5" /><rect x="18" y="72" width="44" height="3" rx="1.5" /></g></svg>;
  }
}

/**
 * Tap a request, then tap the note (or drag it there). The requests are drawn slips; the note is
 * the place the world keeps things (a fridge door, a calendar, the launch pad); a captured slip
 * pins there with a drop. All captured before the bar drains is the hit.
 */
function DragCapture({ round, live, reducedMotion, onResult }: MechanicProps) {
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
    <div className="play-capture" data-prop={round.prop ?? "none"}>
      <div className="play-choices play-slips" role="group" aria-label="Requests">
        <AnimatePresence initial={false}>
          {items.map((item, i) => captured.includes(item) ? null : (
            <motion.button key={item} type="button" className="play-choice play-slip" aria-pressed={selected === item} disabled={!live} onClick={() => setSelected(item)}
              drag dragSnapToOrigin onDragEnd={(_, info) => { if (info.offset.y > 80) capture(item); }}
              initial={reducedMotion ? false : { opacity: 0, y: -10, rotate: -2 }} animate={{ opacity: 1, y: selected === item ? -4 : 0, rotate: selected === item ? -1.5 : 0 }} exit={reducedMotion ? undefined : { y: 90, scale: 0.5, opacity: 0, transition: { duration: 0.28 } }} transition={{ ...SETTLE, delay: reducedMotion ? 0 : i * 0.08 }} whileTap={{ scale: 0.96 }}>
              <Glyph text={item} prop={round.prop} size={24} />
              {item}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      <button type="button" className={`play-note${selected ? " is-ready" : ""}`} disabled={!live || !selected} onClick={() => selected && capture(selected)} aria-label={selected ? `Put “${selected}” on the note` : "The note, pick a request first"}>
        <NoteArt prop={round.prop} />
        <span className="play-note-body">
          <span className="play-note-title">The note</span>
          <ul>{captured.map((c) => <li key={c} className="play-pinned"><Check size={12} weight="bold" aria-hidden="true" /> {c}</li>)}</ul>
          {selected && <span className="play-note-hint">Tap to put “{selected}” here</span>}
        </span>
      </button>
    </div>
  );
}

/**
 * Station cards on a line: tap them in the right order and each slides into its rank, the trail
 * beneath filling station by station. Any wrong tap is the miss.
 */
function Order({ round, live, reducedMotion, onResult }: MechanicProps) {
  const [tapped, setTapped] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const order = round.options ?? [];
  const shuffled = useRef([...order].sort((a, b) => a.id.localeCompare(b.id)));
  const ranked = [...tapped.map((id) => shuffled.current.find((o) => o.id === id)!), ...shuffled.current.filter((o) => !tapped.includes(o.id))];
  const done = wrong !== null || tapped.length === order.length;
  return (
    <div className="play-order">
      <div className="play-choices play-stations" role="group" aria-label="Choices">
        {ranked.map((o) => {
          const n = tapped.indexOf(o.id);
          return (
            <motion.button key={o.id} type="button" className={`play-choice play-station${n >= 0 ? " is-placed" : ""}${wrong === o.id ? " is-wrong" : ""}`} disabled={!live || done} aria-pressed={n >= 0} layout={!reducedMotion} transition={SETTLE} whileTap={{ scale: 0.96 }}
              onClick={() => {
                const expected = order[tapped.length]?.id;
                if (o.id !== expected) { setWrong(o.id); onResult(false, [...tapped, o.id]); return; }
                const next = [...tapped, o.id];
                setTapped(next);
                if (next.length === order.length) onResult(true, next);
              }}>
              <span className="play-station-badge" aria-hidden="true">{n >= 0 ? n + 1 : ""}</span>
              <Glyph text={o.label} prop={round.prop} size={22} />
              {o.label}
            </motion.button>
          );
        })}
      </div>
      <ol className="play-order-trail" aria-live="polite" data-count={order.length}>
        {tapped.map((id, i) => <li key={id}>{i + 1}. {order.find((o) => o.id === id)?.label}</li>)}
      </ol>
    </div>
  );
}

/**
 * A timeline with stations (the round's `scale`), a marker moving along it from far to the
 * moment to act, which is the last station. Tap the bean while the marker is at the last station
 * for the hit; the station lights when the marker is on it. Under reduced motion, choose the moment.
 */
function Timing({ round, live, reducedMotion, progress, mood, onResult }: MechanicProps) {
  const [done, setDone] = useState(false);
  const inNow = progress >= 0.7 && progress <= 0.95;
  const scale = round.scale ?? ["Not now", "Now"];
  const verb = round.verb ?? "Now";
  if (reducedMotion) {
    const choices = round.options?.length ? round.options : [{ id: "weeks", label: "Three weeks out" }, { id: "days", label: "A few days out" }, { id: "tonight", label: "The night before", correct: true }];
    return (
      <div className="play-timing">
        <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} />
        <Choices options={choices} prop={round.prop} reducedMotion disabled={!live || done} onPick={(id) => { setDone(true); onResult(Boolean(choices.find((o) => o.id === id)?.correct), id); }} />
      </div>
    );
  }
  const bean = (
    <button type="button" className={`play-bean-hit${inNow ? " is-now" : ""}`} disabled={!live || done} onClick={() => { setDone(true); onResult(inNow, inNow ? "now" : "early"); }}>
      <Bean who={round.who} mood={inNow ? "surprised" : mood} size={136} look={round.look} />
      <span className="play-bean-label">{verb}</span>
    </button>
  );
  const last = scale.length - 1;
  return (
    <div className="play-timing">
      <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} bean={bean} stake={progress}>
        <div className="play-timing-track in-scene" aria-hidden="true" data-now={inNow || done}>
          <span className="play-timing-line" />
          <span className="play-timing-zone" />
          {scale.map((mark, i) => <span key={mark} className={`play-timing-station${i === last ? " is-last" : ""}${progress >= i / last ? " is-passed" : ""}`} style={{ left: `${(i / last) * 100}%` }} />)}
          <span className="play-timing-marker" style={{ left: `${Math.min(100, progress * 100)}%` }}><svg viewBox="0 0 20 28"><path d="M10 27C4 18 1 14 1 10a9 9 0 0 1 18 0c0 4-3 8-9 17z" /><circle cx="10" cy="10" r="3.5" /></svg></span>
          <ol className="play-marks">
            {scale.map((mark, i) => <li key={mark} className={i === last ? "is-last" : ""} style={{ left: `${(i / last) * 100}%` }}>{mark}</li>)}
          </ol>
        </div>
      </Scene>
    </div>
  );
}

/**
 * The list as objects on a table; then the interruption covers it; then the cover lifts and the
 * question is what was there.
 */
function Recall({ round, live, reducedMotion, onResult }: MechanicProps) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [picked, setPicked] = useState<string[]>([]);
  const items = round.items ?? [];
  const decoys = round.options?.length ? round.options.map((o) => o.label) : ["Bread", "The dry cleaning"];
  const all = [...items, ...decoys].sort();
  return (
    <div className="play-recall">
      {phase < 2 && (
        <div className="play-table" data-covered={phase === 1}>
          <ul className="sim-list play-table-list">
            {items.map((i, n) => <motion.li key={i} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SETTLE, delay: reducedMotion ? 0 : n * 0.08 }}><Glyph text={i} prop={round.prop} size={22} /> {i}</motion.li>)}
          </ul>
          <span className="play-table-edge" aria-hidden="true" />
          <AnimatePresence initial={false}>
            {phase === 1 && (
              <motion.div key="cover" className="play-cover" initial={reducedMotion ? false : { y: "-105%" }} animate={{ y: 0 }} exit={reducedMotion ? undefined : { y: "-105%", transition: { duration: 0.22 } }} transition={SETTLE}>
                <div className="sim-notification play-buzz" role="status"><strong>Group chat</strong><p>“Are you coming Saturday? Also, the lease?? Call me.”</p></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {phase === 0 && <button type="button" className="play-choice" disabled={!live} onClick={() => setPhase(1)}>I have them</button>}
      {phase === 1 && <button type="button" className="play-choice" disabled={!live} onClick={() => setPhase(2)}>Reply, then keep walking</button>}
      {phase === 2 && <>
        <div className="play-choices" role="group" aria-label="What was on the list">
          {all.map((o) => <button key={o} type="button" className="play-choice play-object" aria-pressed={picked.includes(o)} disabled={!live} onClick={() => setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))}><Glyph text={o} prop={round.prop} size={22} />{o}</button>)}
        </div>
        <button type="button" className="play-tempt" disabled={!live || picked.length === 0} onClick={() => onResult(items.every((i) => picked.includes(i)) && !decoys.some((d) => picked.includes(d)), picked)}>Check</button>
      </>}
    </div>
  );
}

/**
 * Tap a cause (a drawn slip), then the tray it belongs in; the tray tilts as the slip lands.
 * All placed rightly is the hit; one wrong placement is the miss.
 */
function Sort({ round, live, reducedMotion, onResult }: MechanicProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, Layer>>({});
  const [landed, setLanded] = useState<{ layer: Layer; n: number } | null>(null);
  const options = round.options ?? [];
  const place = (layer: Layer) => {
    if (!selected) return;
    const next = { ...placed, [selected]: layer };
    setPlaced(next);
    setSelected(null);
    setLanded({ layer, n: Object.keys(next).length });
    if (Object.keys(next).length === options.length) onResult(options.every((o) => next[o.id] === o.layer), Object.entries(next).map(([k, v]) => `${k}:${v}`));
  };
  return (
    <div className="play-sort">
      <div className="play-choices play-slips" role="group" aria-label="Causes">
        {options.map((o) => placed[o.id] ? null : <button key={o.id} type="button" className="play-choice play-slip" aria-pressed={selected === o.id} disabled={!live} onClick={() => setSelected(o.id)}><Glyph text={o.label} prop={round.prop} size={22} />{o.label}</button>)}
      </div>
      <div className="play-layers" role="group" aria-label="Layers">
        {LAYERS.map((layer) => (
          <motion.button key={layer} type="button" className="play-layer" data-layer={layer} disabled={!live || !selected} onClick={() => place(layer)} aria-label={selected ? `Put it in ${LAYER_LABELS[layer]}` : LAYER_LABELS[layer]}
            animate={!reducedMotion && landed?.layer === layer ? { rotate: [0, -4, 3, landed.n * 0.001], y: [0, 3, 0] } : { rotate: 0, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
            <LayerGlyph layer={layer} />
            {LAYER_LABELS[layer]}
            <small>{options.filter((o) => placed[o.id] === layer).map((o) => o.label).join(", ")}</small>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/**
 * A card with two faces, one per bean: tap a bean and the card turns to that side (a flip under
 * motion, an instant turn under reduced motion). Once both sides are seen, "Both are true" is the hit.
 */
function Flip({ round, live, reducedMotion, onResult }: MechanicProps) {
  const [seen, setSeen] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const sides = round.options ?? [];
  const face = open ? sides.findIndex((s) => s.id === open) : -1;
  return (
    <div className="play-flip">
      <div className="play-beans play-flip-pair" role="group" aria-label="Perspectives">
        {sides.map((s, i) => (
          <button key={s.id} type="button" className="play-bean-button" data-side={i} aria-pressed={open === s.id} disabled={!live} onClick={() => { setOpen(s.id); setSeen((x) => (x.includes(s.id) ? x : [...x, s.id])); }}>
            <Bean who={s.bean ?? "sam"} mood={open === s.id ? "surprised" : "neutral"} size={84} />
            <span>{s.label}</span>
          </button>
        ))}
      </div>
      {open && (
        <div className="play-flip-card" data-side={face}>
          <motion.div className="play-flip-inner" initial={false} animate={{ rotateY: face === 1 ? 180 : 0 }} transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            {sides.slice(0, 2).map((s, i) => (
              <blockquote key={s.id} className="perspective-thought play-flip-face" data-face={i} aria-hidden={face !== i}><p>{s.thought}</p></blockquote>
            ))}
          </motion.div>
        </div>
      )}
      <button type="button" className="play-tempt" disabled={!live || seen.length < sides.length} onClick={() => onResult(true, seen)}>Both are true</button>
    </div>
  );
}

/**
 * Hold the bean and a breath ring around it contracts as the heat drops; release inside the calm
 * band. Letting the heat reach the top is the miss. Under reduced motion: choose the move.
 */
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
    const choices = round.options?.length ? round.options : [{ id: "pause", label: "Say the pause word, leave for twenty minutes", correct: true }, { id: "push", label: "Say the next thing" }];
    return (
      <div className="play-pause">
        <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} />
        <Choices options={choices} prop={round.prop} reducedMotion disabled={!live || done} onPick={(id) => { setDone(true); onResult(choices.find((o) => o.id === id)?.correct === true, id); }} />
      </div>
    );
  }
  const release = () => { setHolding(false); if (heat < 0.35) { setDone(true); onResult(true); } };
  const calm = heat < 0.35;
  const hot = heat > 0.8;
  const breathing = live && !done && holding;
  const bean = (
    <button type="button" className={`play-bean-hit play-breath-hit${holding ? " is-holding" : ""}`} disabled={!live || done} aria-pressed={holding}
      onPointerDown={() => setHolding(true)}
      onPointerUp={release}
      onPointerLeave={() => { if (holding) release(); }}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setHolding(true); } }}
      onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(); } }}
    >
      <motion.span className="play-breath" aria-hidden="true" data-calm={calm} data-hot={hot}
        animate={breathing ? { scale: [1 + heat * 0.5, 1 + heat * 0.5 + 0.08, 1 + heat * 0.5], opacity: [0.55, 0.8, 0.55] } : { scale: 1 + heat * 0.5, opacity: hot ? 0.8 : 0.5 }}
        transition={breathing ? { repeat: Infinity, duration: 1.6, ease: "easeInOut" } : { duration: 0.12, ease: "linear" }} />
      <Bean who={round.who} mood={holding ? (calm ? "relieved" : "thinking") : hot ? "frustrated" : mood} size={136} look={round.look} />
      <span className="play-bean-label">{holding ? "Pausing…" : (round.verb ?? "Hold to pause")}</span>
    </button>
  );
  return (
    <div className="play-pause">
      <Scene prop={round.prop} who={round.who} mood={mood} bean={bean} stake={heat}>
        <div className="play-heat in-scene" aria-hidden="true" data-hot={hot} data-calm={calm}>
          <span className="play-heat-fill" style={{ transform: `scaleX(${heat})` }} /><em className="play-heat-calm" />
        </div>
      </Scene>
      <p className="play-heat-label" aria-live="polite">{calm ? "Calm enough to come back" : hot ? "Too hot to talk" : "Cooling"}</p>
    </div>
  );
}

/** Tap the bean whose thought is yours; the picked bean waves. Always a hit; writes an answer. */
function PickBean({ round, live, reducedMotion, onResult }: MechanicProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const multi = Boolean(round.writes?.multi);
  const options = round.options ?? [];
  return (
    <div className="play-pick">
      <div className="play-beans play-cast-row" role="group" aria-label="Which is you">
        {options.map((o, i) => {
          const on = picked.includes(o.id);
          return (
            <motion.button key={o.id} type="button" className="play-bean-button" aria-pressed={on} disabled={!live || (!multi && picked.length > 0)}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SETTLE, delay: reducedMotion ? 0 : i * 0.07 }}
              onClick={() => {
                const next = multi ? (on ? picked.filter((x) => x !== o.id) : [...picked, o.id]) : [o.id];
                setPicked(next);
                setLast(on ? null : o.id);
                if (!multi) onResult(true, o.id);
              }}>
              <motion.span className="play-wave" animate={!reducedMotion && last === o.id && on ? { rotate: [0, -8, 8, -5, 0], y: [0, -6, 0] } : { rotate: 0, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                <Bean who={o.bean ?? "alex"} mood={on ? "pleased" : "neutral"} size={72} />
              </motion.span>
              <span className="play-plinth" aria-hidden="true" />
              <span>{o.label}</span>
              <small className="sr-only">{o.bean ? CHARACTER_BIOS[o.bean].name : ""}</small>
            </motion.button>
          );
        })}
      </div>
      {multi && <button type="button" className="play-tempt" disabled={!live || picked.length === 0} onClick={() => onResult(true, picked)}>That’s me</button>}
    </div>
  );
}

/**
 * Things are tossed across the scene one after another, each on its own arc; tap each before it
 * lands and it squashes into the catch. Decoys (the round's options) are tossed too, greyed;
 * tapping one counts against you. Everything worth catching, caught, and no decoy touched, is the
 * hit. Under reduced motion: pick what to keep.
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
          {choices.map((c) => <button key={c.id} type="button" className="play-choice play-object" aria-pressed={picked.includes(c.id)} disabled={!live || done} onClick={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}><Glyph text={c.label} prop={round.prop} size={22} />{c.label}</button>)}
        </div>
        <button type="button" className="play-tempt is-go" disabled={!live || done || picked.length === 0} onClick={() => { setDone(true); const keep = all.current.filter((x) => picked.includes(x.key)); onResult(keep.length === items.length && keep.every((x) => !x.decoy), keep.map((x) => x.label)); }}>Keep these</button>
      </div>
    );
  }
  // Each thing has a window of the round; inside it, it is tossed in from one side and falls.
  const win = 1 / n;
  return (
    <div className="play-catch">
      <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} stake={items.length ? caught.length / items.length : 0}>
        <div className="play-falling" aria-label="Falling things">
          <AnimatePresence initial={false}>
            {all.current.map((x, i) => {
              const t = (progress - i * win * 0.85) / (win * 1.3);
              if (t < 0 || t > 1 || caught.includes(x.label) || wrong.includes(x.label)) return null;
              const dir = i % 2 ? -1 : 1;
              const left = 8 + ((i * 37) % 52) + dir * 16 * t;
              const top = Math.min(80, 6 - 22 * t + 96 * t * t);
              return (
                <motion.button key={x.key} type="button" className={`play-fall${x.decoy ? " is-decoy" : ""}`} style={{ left: `${left}%`, top: `${top}%`, rotate: dir * 22 * t }} disabled={!live || done}
                  onClick={() => (x.decoy ? setWrong((w) => [...w, x.label]) : setCaught((c) => [...c, x.label]))}
                  exit={{ scaleY: 0.45, scaleX: 1.2, opacity: 0, transition: { duration: 0.22, ease: "easeOut" } }} whileTap={{ scale: 0.9 }} transition={POP}>
                  <span className="play-fall-art"><Glyph text={x.label} prop={round.prop} size={34} /></span>
                  <span className="play-fall-label">{x.label}</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
        <svg className="play-basket" viewBox="0 0 90 44" aria-hidden="true"><path d="M4 10h82l-10 30H14z" className="b-mid" /><path d="M4 10h82" className="b-deep" strokeWidth="6" strokeLinecap="round" /><path d="M22 16l4 20M45 16v20M68 16l-4 20" className="b-deep" strokeWidth="3" opacity=".5" /></svg>
      </Scene>
      <p className="play-heat-label" aria-live="polite">{caught.length} of {items.length} caught{wrong.length ? `, ${wrong.length} to avoid` : ""}</p>
    </div>
  );
}

/**
 * A tray on a pivot tilts as the week drifts; the thing on it slides toward the edge. Tap the
 * bean to level it. Inside the calm band when the clock runs out is the hit. Under reduced
 * motion: choose the steadying move.
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
        <Choices options={choices} prop={round.prop} reducedMotion disabled={!live || done} onPick={(id) => { setDone(true); onResult(Boolean(choices.find((o) => o.id === id)?.correct), id); }} />
      </div>
    );
  }
  const inZone = x >= 0.3 && x <= 0.7;
  const tilt = (x - 0.5) * 36;
  const bean = (
    <button type="button" className={`play-bean-hit${inZone ? "" : " is-now"}`} disabled={!live || done} onClick={() => setX((v) => v + (0.5 - v) * 0.6)}>
      <Bean who={round.who} mood={inZone ? mood : "overwhelmed"} size={136} look={round.look} />
      <span className="play-bean-label">{round.verb ?? "Steady"}</span>
    </button>
  );
  const load = round.prop === "kitchen" ? "mug" : round.prop === "door" ? "key" : "sheet";
  return (
    <div className="play-balance">
      <Scene prop={round.prop} who={round.who} mood={mood} look={round.look} bean={bean} wall={false} stake={Math.abs(x - 0.5) * 2}>
        <div className="play-tray in-scene" aria-hidden="true" data-zone={inZone}>
          <svg viewBox="0 0 240 100" className="play-tray-art">
            <path d="M108 96l12-24 12 24z" className="t-deep" />
            <g className="play-tray-arm" style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "120px 72px" }}>
              <rect x="20" y="66" width="200" height="12" rx="6" className="t-mid" />
              <rect x="80" y="66" width="80" height="12" rx="6" className="t-zone" />
              <g style={{ transform: `translate(${6 + x * 200}px, 0)` }}>
                {load === "mug" ? <><rect x="0" y="42" width="24" height="24" rx="5" className="t-load" /><path d="M24 48h5a4 4 0 0 1 0 10h-5" fill="none" className="t-load-s" strokeWidth="3" /></>
                  : load === "key" ? <><circle cx="8" cy="56" r="7" fill="none" className="t-load-s" strokeWidth="4" /><path d="M15 56h14M24 56v6" className="t-load-s" strokeWidth="4" strokeLinecap="round" /></>
                  : <><path d="M0 40h18l8 8v18H0z" className="t-load" /><path d="M5 54h14M5 60h10" className="t-deep" strokeWidth="2" /></>}
              </g>
            </g>
          </svg>
        </div>
      </Scene>
      <p className="play-heat-label" aria-live="polite">{inZone ? "Level" : x < 0.3 ? "Tipping one way" : "Tipping the other way"}</p>
    </div>
  );
}
