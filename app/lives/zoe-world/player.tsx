"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, CalendarCheck, Check, PaperPlaneRight, Wind } from "@phosphor-icons/react";
import type { Mood } from "@/learn/interactive";
import { beatDef, breathLeft, createZoe, dayName, fuseLength, hotLeft, running, words, zoeReducer, type ZoeWorld } from "@/lives/zoe-world";
import { GameShell } from "../kit/shell";
import { useLoop } from "../kit/use-loop";
import { CastBean } from "../kit/cast";
import { SCORES, sound } from "../sounds";

type Emotion = "steady" | "itch" | "sent" | "sorry" | "repaired";
const MOOD: Record<Emotion, Mood> = { steady: "neutral", itch: "frustrated", sent: "pleased", sorry: "embarrassed", repaired: "relieved" };

function heading(s: ZoeWorld) {
  if (s.phase === "repair") return "That came out sharp.";
  if (s.phase === "reply") return s.repaired ? "Repaired." : "Said what you meant.";
  if (s.phase === "setup") return "Make a plan together.";
  if (s.phase === "complete") return "Before you sent.";
  if (s.phase === "revisit") return "The plan comes up.";
  return "Before you send.";
}

export function ZoeWorldGame() {
  const { state: s, dispatch } = useLoop(zoeReducer, () => createZoe(), running);
  const live = s.phase === "typing" || s.phase === "revisit";
  const b = beatDef(s);
  const w = words(s);
  const fuse = Math.min(1, s.fuse / fuseLength(s));
  const holding = breathLeft(s) > 0;
  const emotion: Emotion = s.phase === "repair" ? "sorry" : s.phase === "reply" || s.phase === "complete" ? s.repaired ? "repaired" : "sent" : live && hotLeft(s) > 0 && fuse > .5 ? "itch" : "steady";
  const pause = useCallback(() => dispatch({ type: "pause" }), [dispatch]);
  const heard = useRef({ typed: 0, jar: 0, rev: s.revision });
  useEffect(() => {
    const h = heard.current;
    if (s.typed > h.typed && live && !s.still) sound().sfx("keytap", .5);
    if (s.jar.length > h.jar) sound().sfx("zip", .15);
    if (s.revision !== h.rev) {
      if (s.phase === "repair") sound().sfx("phone_buzz", .5);
      else if (s.phase === "reply" || s.phase === "complete") { sound().sfx("notification", .5); sound().stinger(s.repaired ? "rest" : "win"); }
    }
    Object.assign(h, { typed: s.typed, jar: s.jar.length, rev: s.revision });
  });

  const hud = live ? <>
    {s.phase === "typing" && <span className="kit-rounds" role="img" aria-label={`Message ${s.beat + 1} of 3`}>{[0, 1, 2].map(r => <i key={r} data-on={r <= s.beat} />)}</span>}
  </> : undefined;
  const typedAll = s.typed >= b.zoe.length;

  return <GameShell name="zw-game" label="Zoe’s phone" eyebrow="Zoe · Before you send" heading={heading(s)} objective={s.phase === "typing" && s.beat === 0 ? "Tap the sharp words before it sends." : undefined}
    hud={hud} status={s.message} paused={s.paused} still={s.still} onPause={pause} onResume={() => dispatch({ type: "resume" })} onStill={value => dispatch({ type: "still", value })}
    phaseKey={`${s.phase}-${s.beat}`} data={{ phase: s.phase, beat: s.beat, scenario: s.scenario, emotion, holding }}
    score={SCORES.zoe} playing={live && !holding} intensity={.3 + fuse * .6 * (hotLeft(s) > 0 ? 1 : .4)}>
    <div className="zw-scene">
      <div className="zw-room" aria-hidden="true"><span className="zw-moon" /><span className="zw-lamp" /></div>
      <div className="zw-side">
        <span className="zw-zoe" data-emotion={emotion}><CastBean who="zoe" mood={MOOD[emotion]} size={120} /></span>
        <div className="zw-jar" role="img" aria-label={`${s.jar.length} feelings kept in the jar`}>
          <svg viewBox="0 0 60 70" aria-hidden="true"><rect x="12" y="4" width="36" height="8" rx="3" fill="#b88aa6" /><path d="M10 14 H50 V60 a8 8 0 0 1 -8 8 H18 a8 8 0 0 1 -8 -8 Z" fill="#ffffff55" stroke="#e6c7d8" strokeWidth="3" />
            {s.jar.slice(-6).map((_, i) => <rect key={i} x={16 + (i % 3) * 10} y={52 - Math.floor(i / 3) * 12} width="9" height="9" rx="2" fill={["#ff7eb6", "#f2c14e", "#b98bd6"][i % 3]} transform={`rotate(${(i * 23) % 30 - 15} ${20 + (i % 3) * 10} ${56 - Math.floor(i / 3) * 12})`} />)}
          </svg>
        </div>
      </div>

      <div className="zw-phone" data-shake={s.phase === "repair"}>
        <div className="zw-screen">
          <header className="zw-chat-head"><CastBean who="rae" size={30} /><span>Rae</span></header>
          <div className="zw-thread" role="log" aria-label="Messages">
            {s.phase !== "setup" && <motion.p key={`in${s.beat}`} className="zw-bubble is-in" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>{b.from}</motion.p>}
            {live && <div className="zw-bubble is-draft" role="group" aria-label="Your reply, typing"><p className="zw-words">{w.slice(0, s.typed).map((x, i) => x.hot
              ? <button key={i} className="zw-word is-hot" onClick={() => dispatch({ type: "cool", index: i })} aria-label={`Change “${x.text}”`}>{x.text}</button>
              : <span key={i} className={`zw-word ${x.plan ? "is-plan" : s.cooled.includes(i) ? "is-cool" : ""}`}>{x.text}</span>)}
              {!typedAll && <span className="zw-caret" aria-hidden="true" />}</p></div>}
            {(s.phase === "reply" || s.phase === "repair" || s.phase === "complete") && <motion.p className="zw-bubble is-out" data-sharp={s.sentSharp} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>{w.map(x => x.text).join(" ")}</motion.p>}
            {s.phase === "repair" && <motion.p className="zw-bubble is-in is-hurt" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>{b.hurt}</motion.p>}
            {(s.phase === "reply" || s.phase === "complete") && s.repaired && <p className="zw-bubble is-out">Sorry, that came out sharp.</p>}
            {(s.phase === "reply" || s.phase === "complete") && <motion.p className="zw-bubble is-in" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: s.still ? 0 : .35 }}>{b.warm}</motion.p>}
            {s.phase === "setup" && <div className="zw-plan" role="group" aria-label="The plan">
              <p className="zw-bubble is-in">Can we plan a proper catch-up?</p>
              <div className="zw-row" role="group" aria-label="Who checks in"><span>Checks in</span>{(["zoe", "rae"] as const).map(who => <button key={who} aria-pressed={s.owner === who} onClick={() => dispatch({ type: "owner", who })}>{who === "zoe" ? "You" : "Rae"}</button>)}</div>
              <div className="zw-row" role="group" aria-label="Day"><span>When</span>{(["thu", "sat"] as const).map(day => <button key={day} aria-pressed={s.day === day} onClick={() => dispatch({ type: "day", day })}>{dayName(day)}</button>)}</div>
            </div>}
          </div>

          {live && <div className="zw-draft" role="group" aria-label="Send controls">
            <button className="zw-breathe" onClick={() => dispatch({ type: "breathe" })} disabled={s.still || s.t < s.breathReady} aria-label="Breathe"><Wind size={22} /></button>
            <div className="zw-fuse-bar" role="img" aria-label={s.still ? "Sends when you choose" : `Sends in ${Math.ceil((fuseLength(s) - s.fuse) / 1000)} seconds`}><i style={{ transform: `scaleX(${fuse})` }} data-hot={hotLeft(s) > 0} /></div>
            <button className="zw-send" onClick={() => dispatch({ type: "send" })} disabled={!typedAll} aria-label="Send" style={{ transform: `scale(${1 + fuse * .28})` }} data-hot={hotLeft(s) > 0}>
              <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" className="zw-fuse-bg" /><circle cx="24" cy="24" r="21" className="zw-fuse" style={{ strokeDashoffset: 132 * (1 - fuse) }} /></svg>
              <PaperPlaneRight size={20} weight="fill" />
            </button>
          </div>}
          {s.phase === "repair" && <div className="zw-actions"><button className="kit-primary" autoFocus onClick={() => dispatch({ type: "repair" })}>Say sorry <ArrowRight size={18} /></button></div>}
          {s.phase === "reply" && <div className="zw-actions"><button className="kit-primary" autoFocus onClick={() => dispatch({ type: "continue" })}>{s.beat < 2 ? "Next message" : "Later that week"} <ArrowRight size={18} /></button></div>}
          {s.phase === "setup" && <div className="zw-actions">
            <button className="zw-prop" aria-pressed={s.calendar} disabled={!s.day} onClick={() => dispatch({ type: "calendar" })}><CalendarCheck size={20} weight="duotone" />{s.calendar ? <><Check size={13} weight="bold" /> In the calendar</> : "Put it in the calendar"}</button>
            <button className="zw-prop" aria-pressed={s.kept} onClick={() => dispatch({ type: "keep" })}>{s.kept ? <><Check size={13} weight="bold" /> Jar on the shelf</> : "Keep the jar"}</button>
            <button className="kit-primary" disabled={!(s.owner && s.day && s.calendar && s.kept)} onClick={() => dispatch({ type: "continue" })}>Saturday comes <ArrowRight size={18} /></button>
          </div>}
          {s.phase === "complete" && <div className="zw-actions">
            <span className="kit-stamp"><Check size={18} weight="bold" /> {dayName(s.day)} at 7</span>
            <Link className="kit-primary" href="/lives/learn?module=pause_before_send_v1">Pause before send <ArrowRight size={18} /></Link>
            <button className="kit-quiet" onClick={() => dispatch({ type: "restart" })}>Another conversation</button>
          </div>}
        </div>
      </div>
    </div>
  </GameShell>;
}
