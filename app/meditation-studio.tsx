"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Pause, Play, SpeakerHigh, SpeakerSlash, X, SunHorizon, UsersThree } from "@phosphor-icons/react";
import { meditationGuide, remainingTime, sharedMeditation } from "@/learn/meditation";

type Session = { mode: "personal" | "shared"; startsAt: number; endsAt: number; pausedAt: number | null };
type Clock = ReturnType<typeof sharedMeditation>;

function MeditationTitle({ children, focus = true }: { children: React.ReactNode; focus?: boolean }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (focus) title.current?.focus({ preventScroll: true }); }, [focus]);
  return <h1 ref={title} tabIndex={-1}>{children}</h1>;
}

export function MeditationStudio() {
  const reduced = useReducedMotion();
  const [now, setNow] = useState<number | null>(null);
  const [personalNow, setPersonalNow] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [clock, setClock] = useState<Clock | null>(null);
  const [clockError, setClockError] = useState(false);
  const offset = useRef(0);
  const [minutes, setMinutes] = useState(5);
  const [session, setSession] = useState<Session | null>(null);
  const [sound, setSound] = useState(false);
  const [soundError, setSoundError] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const lastGuide = useRef("");

  useEffect(() => {
    const controller = new AbortController();
    const sync = async () => {
      const sent = Date.now();
      try {
        const response = await fetch("/api/meditation/session", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Clock unavailable");
        const result = await response.json() as Clock;
        if (!Number.isFinite(result.serverNow)) throw new Error("Invalid clock");
        offset.current = result.serverNow - (sent + Date.now()) / 2;
        setClock(result); setClockError(false); setNow(Date.now() + offset.current);
      } catch { if (!controller.signal.aborted) { setClockError(true); setClock(null); } }
    };
    void sync();
    const refresh = setInterval(() => void sync(), 30_000);
    const tick = setInterval(() => { setNow(Date.now() + offset.current); setPersonalNow(performance.now()); }, 250);
    return () => { controller.abort(); clearInterval(refresh); clearInterval(tick); void audio.current?.close(); };
  }, []);

  const time = session?.pausedAt ?? (session?.mode === "personal" ? personalNow : now ?? 0);
  const duration = session ? session.endsAt - session.startsAt : minutes * 60_000;
  const elapsed = session ? Math.max(0, Math.min(duration, time - session.startsAt)) : 0;
  const progress = duration ? elapsed / duration : 0;
  const complete = Boolean(session && progress >= 1);
  const guide = meditationGuide(progress);
  const shared = clock && now ? sharedMeditation(now) : null;

  const chime = () => {
    const ctx = audio.current;
    if (!ctx || ctx.state !== "running") return;
    const gain = ctx.createGain(); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(.065, ctx.currentTime + .04); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + 2);
    [440, 660].forEach(frequency => { const tone = ctx.createOscillator(); tone.type = "sine"; tone.frequency.value = frequency; tone.connect(gain); tone.start(); tone.stop(ctx.currentTime + 2.1); });
    setTimeout(() => gain.disconnect(), 2200);
  };
  useEffect(() => {
    if (session && sound && !session.pausedAt && lastGuide.current !== guide.title) { lastGuide.current = guide.title; chime(); }
  }, [guide.title, session, sound]);

  const toggleSound = async () => {
    if (sound) { setSound(false); await audio.current?.suspend(); return; }
    try { audio.current ??= new AudioContext(); await audio.current.resume(); setSound(true); setSoundError(false); chime(); }
    catch { setSoundError(true); }
  };
  const begin = (mode: Session["mode"]) => {
    const current = Date.now() + offset.current;
    const schedule = sharedMeditation(current);
    if (mode === "shared" && (!clock || !schedule.live)) return;
    const personalTime = performance.now();
    setHasStarted(true); setPersonalNow(personalTime);
    setSession({ mode, startsAt: mode === "shared" ? schedule.startsAt : personalTime, endsAt: mode === "shared" ? schedule.endsAt : personalTime + minutes * 60_000, pausedAt: null });
    setNow(current); lastGuide.current = "";
  };
  const pause = () => {
    const time = performance.now();
    setSession(current => {
      if (!current || current.mode !== "personal") return current;
      return current.pausedAt === null ? { ...current, pausedAt: time } : { ...current, startsAt: current.startsAt + time - current.pausedAt, endsAt: current.endsAt + time - current.pausedAt, pausedAt: null };
    });
  };
  const close = () => { setSession(null); lastGuide.current = ""; void audio.current?.suspend(); setSound(false); };

  return <main id="main-content" className={`meditation-studio${session ? " is-playing" : ""}`}>
    <div className="meditation-topline"><Link href="/approach"><ArrowLeft size={18} /> All learning</Link><span>ADHD.ME · A LITTLE SPACE</span>{session ? <button onClick={close} aria-label="Leave this session"><X size={22} /></button> : <SunHorizon size={26} />}</div>
    <AnimatePresence mode="wait" initial={false}>
      {!session ? <motion.div key="lobby" className="meditation-lobby" initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="meditation-invitation"><span className="activity-label">A GUIDED MOMENT OF STILLNESS</span><MeditationTitle focus={hasStarted}>A little less doing.<br />A little more being.</MeditationTitle><p>Find a comfortable spot. Follow a few gentle prompts. Come back to the next thing in your own time.</p>
          <div className="meditation-length" role="group" aria-label="Session length">{[2, 5, 10].map(n => <motion.button key={n} whileTap={reduced ? undefined : { scale: .96 }} aria-pressed={minutes === n} onClick={() => setMinutes(n)}>{n} min</motion.button>)}</div>
          <motion.button className="meditation-start" whileHover={reduced ? undefined : { y: -3 }} whileTap={reduced ? undefined : { scale: .97 }} onClick={() => begin("personal")}><Play size={24} weight="fill" /> Start my moment <ArrowRight size={20} /></motion.button>
          <p className="meditation-small">Written guidance · Optional soft chimes · No account needed</p>
        </div>
        <div className="meditation-landscape" aria-hidden="true"><div className="meditation-sun"><span>⌣</span></div><div className="meditation-hill hill-back" /><div className="meditation-hill hill-front" /><span className="landscape-caption">JUST HERE. JUST NOW.</span></div>
        <div className="meditation-shared"><div className="shared-icon"><UsersThree size={32} /></div><div><span className="activity-label">SHARED STILLNESS</span><h2>{shared?.live ? "A moment, on the same clock." : "Meet here for the next pause."}</h2><p>Five minutes, every quarter hour. Everyone who joins follows the same scheduled prompts. This is a synchronised guided session.</p><small>{clockError ? "The shared clock is unavailable. You can still start your own session." : !shared ? "Connecting to the shared clock…" : shared.live ? `${remainingTime(shared.endsAt - (now ?? 0))} left in this session` : `Next session in ${remainingTime(shared.nextStartsAt - (now ?? 0))}`}</small></div><button disabled={!shared?.live} onClick={() => begin("shared")}>{shared?.live ? "Join session" : "Starts soon"}<ArrowRight size={18} /></button></div>
      </motion.div> : <motion.div key="player" className="meditation-player" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0 }}>
        <span className="meditation-session-label">{complete ? "A MOMENT, TAKEN" : session.mode === "shared" ? "SHARED STILLNESS · LIVE SESSION CLOCK" : "YOUR OWN MOMENT"}</span>
        <MeditationTitle key={complete ? "complete-title" : "player-title"}>{complete ? "Here you are." : "Nothing else to do."}</MeditationTitle>
        <div className="meditation-orbit"><motion.div className="meditation-breath" animate={{ scale: reduced || session.pausedAt || complete ? 1 : [1, 1.13, 1] }} transition={{ duration: 8, repeat: reduced || session.pausedAt || complete ? 0 : Infinity, ease: [.45, 0, .55, 1] }} /><div className="meditation-orbit-center">{complete ? <Check size={48} /> : <><span>{session.pausedAt ? "PAUSED" : session.mode === "shared" ? "TOGETHER" : "STILLNESS"}</span><strong role="timer" aria-label="Time remaining">{remainingTime(duration - elapsed)}</strong></>}</div></div>
        <div className="meditation-guide" aria-live="polite"><AnimatePresence mode="wait" initial={false}><motion.div key={complete ? "end" : guide.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .4 }}><h2>{complete ? "You made some space." : guide.title}</h2><p>{complete ? "There is no score for stillness. Take what you need from this moment and leave the rest here." : guide.text}</p></motion.div></AnimatePresence></div>
        <div className="meditation-progress" aria-hidden="true"><motion.span animate={{ scaleX: progress }} transition={{ duration: reduced ? 0 : .3 }} /></div>
        <div className="meditation-controls">{complete ? <><button onClick={close}>Choose another moment</button><Link href="/approach">Back to learning <ArrowRight size={18} /></Link></> : <><button aria-pressed={sound} onClick={() => void toggleSound()}>{sound ? <SpeakerHigh size={22} /> : <SpeakerSlash size={22} />}{sound ? "Chimes on" : "Chimes off"}</button>{session.mode === "personal" && <button onClick={pause}>{session.pausedAt ? <Play size={22} /> : <Pause size={22} />}{session.pausedAt ? "Resume" : "Pause"}</button>}<button onClick={close}>Finish early</button></>}</div>
        {soundError && <p role="status">Sound is unavailable in this browser. Written guidance continues.</p>}
        {session.mode === "shared" && !complete && <p className="meditation-small">The shared clock keeps going if you leave. No participant count or personal information is collected.</p>}
      </motion.div>}
    </AnimatePresence>
  </main>;
}
