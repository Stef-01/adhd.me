"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BellSlash, Check, Clock, Headphones, Path, X } from "@phosphor-icons/react";
import type { Mood } from "@/learn/interactive";
import { COLS, createMaya, crossingDef, groupX, lanesOf, mayaReducer, ROWS, running, type Dir, type MayaWorld } from "@/lives/maya-world";
import { GameShell, Meter } from "../kit/shell";
import { useLoop } from "../kit/use-loop";
import { CastBean } from "../kit/cast";
import { SCORES, sound } from "../sounds";
import { Bench, Crowd, Gate, Queue, Speaker } from "./art";

type Emotion = "braced" | "startled" | "walking" | "settled";
const MOOD: Record<Emotion, Mood> = { braced: "anxious", startled: "overwhelmed", walking: "engaged", settled: "relieved" };
const PAD: [Dir, string, typeof ArrowUp][] = [["up", "Step forward", ArrowUp], ["left", "Step left", ArrowLeft], ["right", "Step right", ArrowRight], ["down", "Step back", ArrowDown]];

function heading(s: MayaWorld) {
  if (s.phase === "arrived") return s.crossing < 2 ? "Made it." : "Three crossings.";
  if (s.phase === "setup") return "Before next time.";
  if (s.phase === "complete") return "One thing at a time.";
  return crossingDef(s).title;
}

export function MayaWorldGame() {
  const { state: s, dispatch } = useLoop(mayaReducer, () => createMaya(), running);
  const live = s.phase === "crossing" || s.phase === "revisit";
  const c = crossingDef(s);
  const [startled, setStartled] = useState(false);
  const bumps = useRef(s.bump);
  useEffect(() => {
    if (s.bump === bumps.current) return;
    bumps.current = s.bump; setStartled(true); sound().sfx("thud", (s.maya.x + .5) / COLS);
    const t = window.setTimeout(() => setStartled(false), 700); return () => window.clearTimeout(t);
  }, [s.bump, s.maya.x]);
  const heard = useRef({ pulses: s.pulses, pings: s.pings.length, rev: s.revision, x: s.maya.x, y: s.maya.y });
  useEffect(() => {
    const h = heard.current;
    if (s.pulses > h.pulses && c.speaker) sound().sfx("chime", (c.speaker[0] + .5) / COLS);
    if (s.pings.length > h.pings) sound().sfx("phone_buzz", .8);
    if (s.maya.x !== h.x || s.maya.y !== h.y) sound().sfx("footstep", (s.maya.x + .5) / COLS);
    if (s.revision !== h.rev && (s.phase === "arrived" || s.phase === "complete")) sound().stinger(s.phase === "complete" ? "win" : "rest");
    Object.assign(h, { pulses: s.pulses, pings: s.pings.length, rev: s.revision, x: s.maya.x, y: s.maya.y });
  });
  const emotion: Emotion = s.phase === "complete" || s.phase === "arrived" ? "settled" : startled || s.overwhelmed ? "startled" : s.load > 60 ? "braced" : "walking";
  const pause = useCallback(() => dispatch({ type: "pause" }), [dispatch]);
  const step = useCallback((dir: Dir) => dispatch({ type: "step", dir }), [dispatch]);

  useEffect(() => {
    if (!live) return;
    const key = (e: KeyboardEvent) => {
      if (s.paused) return;
      const dir = ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" } as Record<string, Dir>)[e.key];
      if (dir) { e.preventDefault(); step(dir); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [live, s.paused, step]);

  const board = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const toward = (dx: number, dy: number): Dir => Math.abs(dx) > Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "up" : "down";
  const tap = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const r = board.current!.getBoundingClientRect();
    const px = r.left + (s.maya.x + .5) / COLS * r.width, py = r.top + (s.maya.y + .5) / ROWS * r.height;
    if (Math.hypot(e.clientX - px, e.clientY - py) > 20) step(toward(e.clientX - px, e.clientY - py));
  };
  const down = (e: PointerEvent) => { swipe.current = { x: e.clientX, y: e.clientY }; };
  const up = (e: PointerEvent) => { const p = swipe.current; swipe.current = null; if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 36) { e.preventDefault(); step(toward(e.clientX - p.x, e.clientY - p.y)); } };

  const room = 1 - s.load / 100;
  const hud = live ? <>
    {s.phase === "crossing" && <span className="kit-rounds" role="img" aria-label={`Crossing ${s.crossing + 1} of 3`}>{[0, 1, 2].map(r => <i key={r} data-on={r <= s.crossing} />)}</span>}
    <Meter label="Room to think" value={room} text={s.overwhelmed ? "Too much right now" : room > .6 ? "Plenty" : room > .3 ? "Getting busy" : "Very little"} />
  </> : undefined;
  const cell = (x: number, y: number) => ({ "--cx": x / COLS, "--cy": y / ROWS } as CSSProperties);

  return <GameShell name="mw-game" label="Maya’s crossing" eyebrow="Maya · One thing at a time" heading={heading(s)} objective={s.phase === "crossing" && s.crossing === 0 ? "Step across. Mind the crowds." : undefined}
    hud={hud} status={s.message} paused={s.paused} still={s.still} onPause={pause} onResume={() => dispatch({ type: "resume" })} onStill={value => dispatch({ type: "still", value })}
    phaseKey={`${s.phase}-${s.crossing}`} data={{ phase: s.phase, crossing: s.crossing, scenario: s.scenario, emotion, overwhelmed: s.overwhelmed }}
    score={SCORES.maya} playing={live} intensity={Math.min(1, .25 + s.load / 110)}>
    <div className="mw-scene" data-load={s.load > 70 ? "high" : "ok"}>
      {(live || s.phase === "arrived") && <>
        <div className="mw-board" ref={board} role="group" aria-label="The concourse" onClick={live ? tap : undefined} onPointerDown={down} onPointerUp={up}>
          <div className="mw-platform" style={{ height: `${100 / ROWS}%` }} />
          {lanesOf(s).map(l => <div key={`lane${l.row}`} className="mw-lane" style={{ top: `${l.row / ROWS * 100}%`, height: `${100 / ROWS}%` }} data-dir={l.speed > 0 ? "right" : "left"} />)}
          <span className="mw-piece mw-gate" style={cell(c.goal, 0)}><Gate open /></span>
          {s.crossing === 3 && "queue" in c && <span className="mw-piece" style={cell(c.queue!, 1)}><Queue /></span>}
          {c.benches.map(([x, y]) => <span key={`b${x}${y}`} className="mw-piece mw-bench" style={cell(x, y)}><Bench /></span>)}
          {c.speaker && <span className="mw-piece mw-speaker" style={cell(c.speaker[0], c.speaker[1])}><Speaker /><i key={s.pulses} className="mw-pulse" data-soft={s.crossing === 3 && s.setup.ease === "headphones"} /></span>}
          {lanesOf(s).flatMap((l, li) => l.groups.map((g, gi) => <span key={`g${li}${gi}`} className="mw-crowd" style={{ left: `${groupX(l, g, s.t) / COLS * 100}%`, top: `${l.row / ROWS * 100}%`, width: `${g.w / COLS * 100}%`, height: `${100 / ROWS}%` }}><Crowd seed={li * 3 + gi} /></span>))}
          {s.still && live && lanesOf(s).flatMap((l, li) => l.groups.map((g, gi) => <span key={`n${li}${gi}`} className="mw-ghost" data-row={l.row} style={{ left: `${groupX(l, g, s.t + 900) / COLS * 100}%`, top: `${l.row / ROWS * 100}%`, width: `${g.w / COLS * 100}%`, height: `${100 / ROWS}%` }} />))}
          <span className="mw-piece mw-maya" data-emotion={emotion} style={cell(s.maya.x, s.maya.y)}><CastBean who="maya" mood={MOOD[emotion]} size={80} /></span>
          {live && s.pings.map((id, i) => <button key={id} className="mw-ping" style={{ top: `${4 + i * 11}%` }} aria-label="Dismiss notification" onClick={() => dispatch({ type: "dismiss", id })}>
            <span className="mw-ping-dot" /><span>New message</span><X size={14} weight="bold" />
          </button>)}
        </div>
        {live && <div className="mw-pad" role="group" aria-label="Move Maya">{PAD.map(([dir, label, Icon]) => <button key={dir} data-dir={dir} aria-label={label} onClick={() => step(dir)}><Icon size={22} weight="bold" /></button>)}</div>}
        {s.phase === "arrived" && <motion.div className="mw-done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button className="kit-primary" autoFocus onClick={() => dispatch({ type: "continue" })}>{s.crossing < 2 ? "Next place" : "Sit a moment"} <ArrowRight size={18} /></button>
        </motion.div>}
      </>}

      {(s.phase === "setup" || s.phase === "complete") && <div className="mw-rest">
        <span className="mw-rest-maya"><CastBean who="maya" mood={s.phase === "complete" ? "pleased" : "thinking"} size={120} />{s.phase === "complete" && <CastBean who="ari" mood="pleased" size={100} />}</span>
        {s.phase === "setup" ? <div className="mw-choices">
          <button className="mw-prop" aria-pressed={s.setup.dnd} onClick={() => dispatch({ type: "dnd" })}><BellSlash size={24} weight="duotone" />{s.setup.dnd ? <><Check size={14} weight="bold" /> Do not disturb</> : "Quiet the phone"}</button>
          <div className="mw-pair" role="group" aria-label="One easier thing">
            <button className="mw-prop" aria-pressed={s.setup.ease === "headphones"} onClick={() => dispatch({ type: "ease", value: "headphones" })}><Headphones size={24} weight="duotone" />Headphones</button>
            <button className="mw-prop" aria-pressed={s.setup.ease === "quiet"} onClick={() => dispatch({ type: "ease", value: "quiet" })}><Path size={24} weight="duotone" />Quieter way</button>
          </div>
          <button className="mw-prop" aria-pressed={s.setup.meet} onClick={() => dispatch({ type: "meet" })}><Clock size={24} weight="duotone" />{s.setup.meet ? <><Check size={14} weight="bold" /> Ari, by the clock</> : "Meet Ari by the clock"}</button>
          <button className="kit-primary" disabled={!(s.setup.dnd && s.setup.ease && s.setup.meet)} onClick={() => dispatch({ type: "continue" })}>Next week <ArrowRight size={18} /></button>
        </div> : <div className="mw-choices">
          <span className="kit-stamp"><Check size={18} weight="bold" /> Ari found you</span>
          <Link className="kit-primary" href="/lives/learn?module=lower_sensory_floor_v1">Lower the sensory floor <ArrowRight size={18} /></Link>
          <button className="kit-quiet" onClick={() => dispatch({ type: "restart" })}>Another place</button>
        </div>}
      </div>}
    </div>
  </GameShell>;
}
