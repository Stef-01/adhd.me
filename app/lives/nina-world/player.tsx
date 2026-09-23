"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookmarkSimple, Check, FolderSimple } from "@phosphor-icons/react";
import type { Mood } from "@/learn/interactive";
import { COLS, createNina, ninaReducer, ROWS, running, SCENARIOS, wanted, type Dir, type NinaWorld } from "@/lives/nina-world";
import { GameShell } from "../kit/shell";
import { useLoop } from "../kit/use-loop";
import { CastBean } from "../kit/cast";
import { SCORES, sound } from "../sounds";
import { Blot, Desk, Nib } from "./art";

type Emotion = "stuck" | "hover" | "typing" | "kept";
const MOOD: Record<Emotion, Mood> = { stuck: "frustrated", hover: "anxious", typing: "engaged", kept: "pleased" };
const PAD: [Dir, string, typeof ArrowUp][] = [["up", "Pen up", ArrowUp], ["left", "Pen left", ArrowLeft], ["right", "Pen right", ArrowRight], ["down", "Pen down", ArrowDown]];

function heading(s: NinaWorld) {
  if (s.phase === "setup") return "Leave it easy to return to.";
  if (s.phase === "complete") return "A draft exists.";
  if (s.phase === "line-done") return s.line < 2 ? "One line down." : "Three lines. A start.";
  if (s.phase === "revisit") return "Back at the marker.";
  return SCENARIOS[s.scenario]!.brief + ".";
}
const where = (s: NinaWorld, x: number, y: number) => {
  const dx = x - s.pen.x, dy = y - s.pen.y;
  return [dy ? `${Math.abs(dy)} ${dy < 0 ? "up" : "down"}` : "", dx ? `${Math.abs(dx)} ${dx < 0 ? "left" : "right"}` : ""].filter(Boolean).join(", ");
};

export function NinaWorldGame() {
  const { state: s, dispatch } = useLoop(ninaReducer, () => createNina(), running);
  const live = s.phase === "writing" || s.phase === "revisit";
  const c = SCENARIOS[s.scenario]!;
  const want = wanted(s);
  const emotion: Emotion = s.phase === "complete" || s.phase === "line-done" ? "kept" : s.t < s.stunUntil ? "stuck" : s.t < s.slowUntil || (!s.pen.dir && !s.still) ? "hover" : "typing";
  const pause = useCallback(() => dispatch({ type: "pause" }), [dispatch]);
  const steer = useCallback((dir: Dir) => dispatch({ type: "dir", dir }), [dispatch]);

  useEffect(() => {
    if (!live) return;
    const key = (e: KeyboardEvent) => {
      if (s.paused) return;
      const dir = ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" } as Record<string, Dir>)[e.key];
      if (dir) { e.preventDefault(); steer(dir); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [live, s.paused, steer]);

  // Tap toward a spot on the page, or swipe, to turn the pen.
  const board = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const toward = (dx: number, dy: number): Dir => Math.abs(dx) > Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "up" : "down";
  const tap = (e: MouseEvent) => {
    const r = board.current!.getBoundingClientRect();
    const px = r.left + (s.pen.x + .5) / COLS * r.width, py = r.top + (s.pen.y + .5) / ROWS * r.height;
    if (Math.hypot(e.clientX - px, e.clientY - py) > 18) steer(toward(e.clientX - px, e.clientY - py));
  };
  const down = (e: PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const up = (e: PointerEvent) => { const p = start.current; start.current = null; if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 36) { e.preventDefault(); steer(toward(e.clientX - p.x, e.clientY - p.y)); } };

  const heard = useRef({ filled: 0, bump: 0, rev: s.revision, moves: 0 });
  useEffect(() => {
    const h = heard.current, filled = s.filled.filter(Boolean).length;
    if (filled > h.filled) sound().sfx("rustle", (s.pen.x + .5) / COLS);
    else if (s.bump > h.bump) sound().sfx(s.t < s.stunUntil ? "thud" : "tick", (s.pen.x + .5) / COLS);
    else if (s.moves > h.moves && live) sound().sfx("keytap", (s.pen.x + .5) / COLS);
    if (s.revision !== h.rev && (s.phase === "line-done" || s.phase === "complete")) sound().stinger("win");
    Object.assign(h, { filled, bump: s.bump, rev: s.revision, moves: s.moves });
  });

  const hud = live ? <>
    {s.phase === "writing" && <span className="kit-rounds" role="img" aria-label={`Line ${s.line + 1} of 3`}>{[0, 1, 2].map(r => <i key={r} data-on={r <= s.line} />)}</span>}
  </> : undefined;

  const cell = (x: number, y: number) => ({ "--cx": (x + .5) / COLS, "--cy": (y + .5) / ROWS } as CSSProperties);
  const line = (words: (string | null)[], cls = "") => <p className={`nw-line ${cls}`}>{words.map((w, i) => <span key={i} data-empty={!w}>{w ?? "···"}</span>)}</p>;

  return <GameShell name="nw-game" label="Nina’s desk" eyebrow="Nina · The first line" heading={heading(s)} objective={s.phase === "writing" && s.line === 0 ? "Steer the pen through the words." : undefined}
    hud={hud} status={s.message} paused={s.paused} still={s.still} onPause={pause} onResume={() => dispatch({ type: "resume" })} onStill={value => dispatch({ type: "still", value })}
    phaseKey={`${s.phase}-${s.line}`} data={{ phase: s.phase, line: s.line, scenario: s.scenario, emotion }}
    score={SCORES.nina} playing={live} intensity={.3 + s.filled.filter(Boolean).length * .18 + s.draft.length * .05}>
    <div className="nw-scene">
      <Desk />
      <span className="nw-nina" data-emotion={emotion}><CastBean who="nina" mood={MOOD[emotion]} size={120} /></span>
      {(live || s.phase === "line-done") && <div className="nw-sheet">
        {line(s.phase === "line-done" ? s.draft.at(-1)! : s.filled, "is-current")}
        <div className="nw-board"><div className="nw-page" ref={board} role="group" aria-label="The page" onClick={live ? tap : undefined} onPointerDown={down} onPointerUp={up}>
          {live && s.trail.length > 0 && <svg className="nw-trail" viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="none" aria-hidden="true"><polyline points={[s.pen, ...s.trail].map(t => `${t.x + .5},${t.y + .5}`).join(" ")} /></svg>}
          {s.chunks.map(ch => {
            const needed = ch.slot !== null && want[ch.slot] === ch.text && !s.filled[ch.slot];
            return <span key={ch.id} className="nw-chunk" data-needed={needed} data-tab={ch.slot === null} style={cell(ch.x, ch.y)}>{ch.text}</span>;
          })}
          {s.blots.map((b, i) => <span key={`b${b.x},${b.y}`} className="nw-blot" style={{ ...cell(b.x, b.y), animationDelay: `${i * .1}s` }}><Blot /></span>)}
          {live && <motion.span className="nw-pen" data-dir={s.pen.dir ?? "none"} style={cell(s.pen.x, s.pen.y)} layout={false}><Nib /></motion.span>}
          <ul className="sr-only" aria-live="polite">{s.chunks.filter(ch => ch.slot !== null && want[ch.slot] === ch.text && !s.filled[ch.slot]).map(ch => <li key={ch.id}>{ch.text}: {where(s, ch.x, ch.y)}</li>)}</ul>
        </div></div>
        {live && <div className="nw-pad" role="group" aria-label="Steer the pen">{PAD.map(([dir, label, Icon]) => <button key={dir} data-dir={dir} aria-label={label} onClick={() => steer(dir)}><Icon size={22} weight="bold" /></button>)}</div>}
        {s.phase === "line-done" && <motion.div className="nw-done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <button className="kit-primary" autoFocus onClick={() => dispatch({ type: "continue" })}>{s.line < 2 ? "Next line" : "Put the pen down"} <ArrowRight size={18} /></button>
        </motion.div>}
      </div>}

      {(s.phase === "setup" || s.phase === "complete") && <div className="nw-sheet is-draft">
        <div className="nw-paper" aria-label="Your draft" role="group">
          {s.draft.map((l, i) => <p key={i}>{l.join(" ")}</p>)}
          {s.marker && s.phase === "setup" && <span className="nw-marker"><BookmarkSimple size={18} weight="fill" /></span>}
        </div>
        {s.phase === "setup" ? <div className="nw-setup">
          <button className="nw-prop" aria-pressed={s.saved} onClick={() => dispatch({ type: "save" })}><FolderSimple size={24} weight="duotone" />{s.saved ? <><Check size={14} weight="bold" /> Saved</> : "Save the draft"}</button>
          <button className="nw-prop" aria-pressed={Boolean(s.marker)} onClick={() => dispatch({ type: "marker" })}><BookmarkSimple size={24} weight="duotone" />{s.marker ? <><Check size={14} weight="bold" /> Marker left</> : "Leave a marker"}</button>
          <div className="nw-steps" role="group" aria-label="Next step">{c.steps.map(step => <button key={step} aria-pressed={s.next === step} onClick={() => dispatch({ type: "next", step })}>{step}</button>)}</div>
          <button className="kit-primary" disabled={!(s.saved && s.marker && s.next)} onClick={() => dispatch({ type: "continue" })}>Tomorrow <ArrowRight size={18} /></button>
        </div> : <div className="nw-setup">
          <span className="kit-stamp"><Check size={18} weight="bold" /> Next: {s.next?.toLowerCase()}</span>
          <Link className="kit-primary" href="/lives/learn?module=sixty_second_start_v1">Try a 60-second start <ArrowRight size={18} /></Link>
          <button className="kit-quiet" onClick={() => dispatch({ type: "restart" })}>Another draft</button>
        </div>}
      </div>}
    </div>
  </GameShell>;
}
