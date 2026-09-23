"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, HandWaving, Lightbulb, Notebook, PushPin } from "@phosphor-icons/react";
import { arjunReducer, createArjun, currentQuestion, isRelevant, lines, MEETING, name, ready, remarkX, running, SCENARIOS, type ArjunWorld, type Speaker } from "@/lives/arjun-world";
import { GameShell } from "../kit/shell";
import { useLoop } from "../kit/use-loop";
import { SCORES, sound } from "../sounds";
import { MeetingRoom, TableTop } from "./art";
import { CastBean } from "../kit/cast";
import type { Mood } from "@/learn/interactive";

const SEATS: Speaker[] = ["noor", "sam", "rae"];
const SEAT_X: Record<Speaker, number> = { noor: .16, sam: .5, rae: .84, arjun: .5 };

type Emotion = "calm" | "alert" | "hit" | "drifting" | "relieved";
const ARJUN_MOOD: Record<Emotion, Mood> = { calm: "neutral", alert: "engaged", hit: "anxious", drifting: "overwhelmed", relieved: "relieved" };

function heading(s: ArjunWorld) {
  if (s.phase === "setup") return "Leave the next step ready.";
  if (s.phase === "complete") return "The thread held.";
  if (s.phase === "decided") return "Decided.";
  if (s.phase === "recap") return "Catch up.";
  if (s.phase === "revisit") return "Next week.";
  return currentQuestion(s).ask;
}
function objective(s: ArjunWorld) {
  if (s.phase === "setup") return "Pin it, keep the idea, share the follow-up.";
  if (s.phase === "complete") return "Same people. Your saved idea decided it.";
  if (s.phase === "decided") return undefined;
  if (s.phase === "recap") return "Nothing is lost. Pin what you missed.";
  if (s.phase === "revisit") return s.constraint ? "Something changed. Your pocket can help." : "Pinned questions show what matters.";
  return s.round === 0 ? "Tap what answers it. Park Arjun’s own ideas." : undefined;
}

export function ArjunWorldGame() {
  const { state: s, dispatch } = useLoop(arjunReducer, () => createArjun(), running);
  const stream = useRef<HTMLDivElement>(null);
  const all = lines(s);
  const pinnedCount = s.board.filter(p => p && !p.stale && isRelevant(s, p.line)).length;
  const live = s.phase === "round" || s.phase === "revisit" || s.phase === "recap";
  const speaking = new Map<Speaker, number>();
  for (const r of s.stream) speaking.set(all[r.line]!.speaker, r.id);
  const idea = SCENARIOS[s.scenario]!.rounds[0].idea!;
  const canRetrieve = s.phase === "revisit" && s.constraint && s.pocket.includes(idea) && !s.stream.some(r => all[r.line]!.kind === "idea") && !s.board.some(p => p && all[p.line]!.kind === "idea");

  const emotion: Emotion = s.phase === "complete" ? "relieved" : s.drift > 0 ? "drifting" : s.phase === "recap" || s.message.startsWith("Missed") || s.message.includes("off topic") ? "hit" : s.stream.length > 2 ? "alert" : "calm";
  const heard = useRef({ id: 0, rev: s.revision, board: 0, pocket: 0 });
  useEffect(() => {
    const h = heard.current, newest = s.stream.at(-1);
    if (newest && newest.id > h.id) { sound().sfx(all[newest.line]!.kind === "idea" ? "pop" : "tick", SEAT_X[all[newest.line]!.speaker]); h.id = newest.id; }
    const filled = s.board.filter(Boolean).length;
    if (filled > h.board) sound().sfx(s.message.includes("off topic") ? "thud" : "stamp");
    if (s.pocket.length > h.pocket) sound().sfx("scribble", .1);
    if (s.revision !== h.rev && (s.phase === "decided" || s.phase === "complete")) sound().stinger("win");
    Object.assign(h, { rev: s.revision, board: filled, pocket: s.pocket.length });
  });
  const pause = useCallback(() => dispatch({ type: "pause" }), [dispatch]);
  function catchRemark(id: number, keyboard: boolean) {
    dispatch({ type: "catch", id });
    if (keyboard) requestAnimationFrame(() => (stream.current?.querySelector<HTMLButtonElement>(".aw-bubble:not([disabled])") ?? stream.current?.querySelector<HTMLButtonElement>("button"))?.focus({ preventScroll: true }));
  }

  const hud = live ? <>
    {s.phase !== "revisit" && <span className="aw-rounds" role="img" aria-label={`Round ${s.round + 1} of 3`}>{[0, 1, 2].map(r => <i key={r} data-on={r <= s.round} />)}</span>}
    <span className="aw-pins" role="img" aria-label={`${pinnedCount} of 3 pinned`}>{[0, 1, 2].map(n => <PushPin key={n} size={16} weight={n < pinnedCount ? "fill" : "regular"} />)}</span>
    {s.pocket.length > 0 && <span className="aw-ideas" role="img" aria-label={`${s.pocket.length} ideas parked`}>{s.pocket.map(i => <Lightbulb key={i} size={16} weight="fill" />)}</span>}
  </> : undefined;

  return <GameShell name="aw-game" label="Arjun’s meeting" eyebrow="Arjun · Hold the thread" heading={heading(s)} objective={objective(s)} hud={hud}
    status={s.message} paused={s.paused} still={s.still} onPause={pause} onResume={() => dispatch({ type: "resume" })} onStill={value => dispatch({ type: "still", value })}
    phaseKey={`${s.phase}-${s.round}-${s.question}`} score={SCORES.arjun} playing={s.phase === "round" || s.phase === "revisit"} intensity={.3 + s.stream.length * .12 + (s.drift > 0 ? .3 : 0)} data={{ phase: s.phase, round: s.round, scenario: s.scenario, question: s.question, drift: s.drift > 0 }}>
      <div className="aw-room" data-drift={s.drift > 0}>
        <div className="aw-board" role="group" aria-label="The board">
          {(s.anchor || s.phase === "revisit" || s.phase === "complete") && <span className="aw-pin-note"><PushPin size={14} weight="fill" />{s.phase === "setup" ? currentQuestionOf(s) : currentQuestion(s).ask}</span>}
          {s.phase === "setup" && !s.anchor && <button className="aw-prop aw-anchor" onClick={() => dispatch({ type: "anchor" })}><PushPin size={26} weight="duotone" /><span>Pin the next question</span></button>}
          <div className="aw-slots">
            {(s.phase === "setup" || s.phase === "complete" ? [0, 1, 2] : s.board.map((_, i) => i)).map(slot => {
              if (s.phase === "setup" || s.phase === "complete") {
                const decision = s.phase === "complete" ? (slot === 0 ? s.decisions[3] : undefined) : s.decisions[slot];
                return decision ? <div key={"d" + slot} className="aw-card is-decision"><Check size={16} weight="bold" /><span>{decision}</span></div> : <div key={"d" + slot} className="aw-card is-empty" aria-hidden="true" />;
              }
              const pin = s.board[slot];
              if (!pin) return <div key={"e" + slot} className="aw-card is-empty" role="img" aria-label="Empty space"><PushPin size={18} /></div>;
              const l = all[pin.line]!;
              const off = pin.stale || !isRelevant(s, pin.line);
              return <motion.button key={"p" + pin.line + (pin.stale ? "s" : "")} className="aw-card" initial={{ opacity: 0, y: 36, scale: .8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 26 }} data-off={off} data-kind={l.kind}
                aria-label={off ? `Clear ${l.text}` : `Pinned: ${l.text}`} onClick={() => off && dispatch({ type: "clear", slot })} aria-disabled={!off}>
                <CastBean who={l.speaker} size={24} /><span>{l.text}</span>{off && <small>Clear</small>}
              </motion.button>;
            })}
          </div>
        </div>

        <div className="aw-table">
          <MeetingRoom minutes={s.phase === "round" ? Math.min(1, s.t / MEETING[s.round]!) : 0} />
          <div className="aw-seats" aria-hidden={s.phase !== "setup"}>
            {SEATS.map(p => {
              const img = <span key={p + (speaking.get(p) ?? 0)} className={speaking.has(p) ? "aw-bean is-speaking" : "aw-bean"}><CastBean who={p} mood={s.phase === "complete" || s.owner === p ? "pleased" : speaking.has(p) ? "engaged" : "neutral"} size={120} /></span>;
              if (s.phase === "setup" && p !== "sam") return <button key={p} className="aw-seat" style={{ "--x": SEAT_X[p] } as CSSProperties} aria-pressed={s.owner === p} aria-label={`Hand the follow-up to ${name(p)}`} onClick={() => dispatch({ type: "owner", person: p as "noor" | "rae" })}>{img}<span>{s.owner === p ? <><Check size={13} weight="bold" /> {name(p)}</> : name(p)}</span></button>;
              return <div key={p} className="aw-seat" style={{ "--x": SEAT_X[p] } as CSSProperties}>{img}</div>;
            })}
          </div>
          <TableTop />
          <span className="aw-arjun" data-emotion={emotion}><CastBean who="arjun" mood={ARJUN_MOOD[emotion]} size={150} /></span>
          <div className="aw-stream" ref={stream} role="group" aria-label="What people are saying">
            <AnimatePresence>
              {live && s.stream.map((r, n) => {
                const l = all[r.line]!;
                const p = remarkX(s, r);
                const cue = s.anchor && s.phase === "revisit" && isRelevant(s, r.line);
                return <motion.button key={r.id} className="aw-bubble" data-kind={l.kind} data-lane={r.id % 2} data-cue={cue} data-slow={r.slow} data-relevant={isRelevant(s, r.line) || (l.kind === "idea" && s.round < 3)}
                  style={{ "--p": p ?? 0, "--n": n } as CSSProperties} data-still={p === null}
                  initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  exit={s.still ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 1.25, pointerEvents: "none", transition: { duration: .16 } }}
                  aria-label={l.kind === "idea" && s.round < 3 ? `Park Arjun’s idea: ${l.text}` : `${name(l.speaker)}: ${l.text}`} onClick={event => catchRemark(r.id, event.detail === 0)}>
                  <CastBean who={l.speaker} size={26} />{cue && <PushPin className="aw-cue" size={13} weight="fill" />}<span>{l.text}</span>
                </motion.button>;
              })}
            </AnimatePresence>
          </div>
          <div className="aw-pocket" data-glow={canRetrieve}>
            {s.phase === "setup" && !s.pocket.includes(idea) ? <button className="aw-prop" onClick={() => dispatch({ type: "keep-idea" })}><span className="aw-thought">{idea}</span><span>Keep the idea</span></button>
              : canRetrieve ? <button className="aw-prop" onClick={() => dispatch({ type: "retrieve" })}><Notebook size={28} weight="duotone" /><span>Use the saved idea</span></button>
              : s.phase === "setup" ? <div className="aw-prop is-done"><Notebook size={28} weight="duotone" /><Check size={16} weight="bold" /><span>{idea}</span></div>
              : <div className="aw-pocket-still"><Notebook size={28} weight="duotone" /><span className="sr-only">{s.pocket.length} parked ideas</span></div>}
          </div>
          <div className="aw-hand">
            {(s.phase === "round" || s.phase === "revisit") && !s.still && <button className="aw-prop" onClick={() => dispatch({ type: "ask" })} disabled={s.t < s.askReady}><HandWaving size={24} /><span>Ask again</span></button>}
            {s.still && (s.phase === "round" || s.phase === "revisit") && <button className="aw-prop" onClick={() => dispatch({ type: "next" })}><ArrowRight size={22} /><span>Let one pass</span></button>}
          </div>
        </div>

        {s.phase === "setup" && <div className="aw-follow" role="group" aria-label="Follow-up">
          {s.owner && <div className="aw-when">{(["today", "tomorrow"] as const).map(w => <button key={w} aria-pressed={s.when === w} onClick={() => dispatch({ type: "when", when: w })}>{w === "today" ? "Today" : "Tomorrow"}</button>)}</div>}
          <button className="kit-primary" disabled={!ready(s)} onClick={() => dispatch({ type: "continue" })}>Next meeting <ArrowRight size={19} /></button>
        </div>}
        {s.phase === "decided" && <motion.div className="aw-overlay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="aw-stamp"><Check size={18} weight="bold" /> {s.decisions.at(-1)}</span>
          <button className="kit-primary" autoFocus onClick={() => dispatch({ type: "continue" })}>{s.round < 2 ? "Next item" : "After the meeting"} <ArrowRight size={19} /></button>
        </motion.div>}
        {s.phase === "complete" && <div className="aw-overlay is-final">
          <span className="aw-stamp"><Check size={18} weight="bold" /> {name(s.owner ?? "rae")} follows up {s.when}</span>
          <Link className="kit-primary" href="/lives/learn?module=meeting_anchor_v1">Try a meeting anchor <ArrowRight size={19} /></Link>
          <button className="kit-quiet" onClick={() => dispatch({ type: "restart" })}>Another meeting</button>
        </div>}
      </div>
  </GameShell>;
}

function currentQuestionOf(s: ArjunWorld) { return SCENARIOS[s.scenario]!.revisit.questions[0]!.ask; }
