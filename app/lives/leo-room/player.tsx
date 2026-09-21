"use client";
import { SkillRecommendation } from "../../skill-recommendation";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useTransform, useIsPresent, useMotionValueEvent, type MotionValue } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Pause, SpeakerHigh, SpeakerSlash, X } from "@phosphor-icons/react";
import { insectOffset, manageable, PERCHES, ROOM_DURATION, roomMood, type BedroomState, type RoomInsect } from "@/lives/leo-room";
import { BedroomBackdrop, BedAndLeo, RoomBook, RoomHeadphones, RoomLamp, RoomMosquito, RoomPhone, RoomWindow } from "./art";
import { BedroomAudio } from "./audio";
import { useBedroom } from "./use-bedroom";

const HEADINGS: Record<BedroomState["mode"], string> = {
  challenge: "One tiny sound.", recovery: "The room can change.", "wind-down": "A little room to settle.",
  rest: "Nothing else to chase.", revisit: "The next evening.", complete: "You changed the room.",
};

function Mosquito({ insect, clock, still, catchIt }: { insect: RoomInsect; clock: MotionValue<number>; still: boolean; catchIt: (keyboard: boolean) => void }) {
  const [heldPosition, setHeldPosition] = useState<{ x: number; y: number } | null>(null);
  const present = useIsPresent();
  const [perched, setPerched] = useState(false);
  useMotionValueEvent(clock, "change", t => setPerched(insectOffset(insect, t).perched));
  const x = useTransform(clock, t => `calc(${still ? 0 : heldPosition?.x ?? insectOffset(insect, t).x}px * var(--flight-x-scale, 1))`);
  const y = useTransform(clock, t => `calc(${still ? 0 : heldPosition?.y ?? insectOffset(insect, t).y}px * var(--flight-y-scale, 1))`);
  // Hold the visible position: snapping to the perch on focus can move the button
  // away from a mouse between press and release, so the browser never delivers its click.
  const holdPosition = () => setHeldPosition(previous => previous ?? (still ? { x: 0, y: 0 } : insectOffset(insect, clock.get())));
  const perch = PERCHES[insect.slot]!;
  return <motion.div className="bedroom-insect-anchor" data-arriving={insect.arrivedAt > 0} style={{ left: `${perch.x}%`, top: `${perch.y}%`, "--arrival-x": `${80 - perch.x}cqw`, "--arrival-y": `${22 - perch.y}cqh` } as CSSProperties}
    initial={still ? false : { opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }}
    exit={still ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: .45, transition: { duration: .16 } }}>
    <motion.div className="bedroom-insect-flight" style={{ x, y }}>
      <button className="bedroom-insect" disabled={!present} aria-label={`Catch mosquito ${insect.id + 1}`} onClick={event => catchIt(event.detail === 0)}
        onFocus={holdPosition} onBlur={() => setHeldPosition(null)}
        onPointerDown={event => { if (event.button === 0) holdPosition(); }}
        onPointerCancel={() => setHeldPosition(null)}
        onPointerLeave={event => { if (document.activeElement !== event.currentTarget) setHeldPosition(null); }}>
        <RoomMosquito kind={insect.kind} perched={still || heldPosition !== null || perched} />
      </button>
    </motion.div>
  </motion.div>;
}

function Prop({ name, label, children, onClick, disabled, selected, still }: {
  name: string; label: string; children: ReactNode; onClick: () => void;
  disabled?: boolean; selected?: boolean; still: boolean;
}) {
  return <motion.button className={`bedroom-prop bedroom-${name}`} onClick={onClick} aria-label={label}
    disabled={disabled} aria-pressed={selected} layout={still ? false : "position"} whileHover={still || disabled ? undefined : { y: -3 }}
    whileTap={still || disabled ? undefined : { scale: .96 }} transition={{ type: "spring", stiffness: 360, damping: 28 }}>
    {children}<span className="bedroom-prop-label">{label}</span>
  </motion.button>;
}

export function LeoBedroom() {
  const { state: s, dispatch, clock, ready } = useBedroom();
  const [sound, setSound] = useState(false);
  const [soundNotice, setSoundNotice] = useState("");
  const audio = useRef<BedroomAudio | null>(null);
  const alive = useRef(true);
  const enabling = useRef(false);
  const scene = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const ended = s.mode === "rest" || s.mode === "complete";
  useEffect(() => { setSoundNotice(""); }, [s.revision]);
  const ids = s.insects.map(i => i.id).join(",");
  const calm = Math.round((1 - s.activation) * 100);
  const pageReady = s.book.page >= (s.mode === "revisit" ? 3 : 2);
  const remaining = Math.ceil((ROOM_DURATION - s.challengeTime) / 1000);
  const bookLabel = ended ? "Bookmark kept" : !s.book.open ? s.book.page ? "Find your place" : "Read a little" : pageReady ? "Bookmark kept" : "Turn the page";

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; audio.current?.dispose(); audio.current = null; };
  }, []);
  useEffect(() => {
    audio.current?.update(ids ? ids.split(",").map(Number) : [], s.headphones, sound && !s.paused && !ended);
  }, [ids, s.headphones, s.paused, sound, ended]);
  useEffect(() => {
    if (s.paused) dialog.current?.showModal();
    else if (dialog.current?.open) { dialog.current.close(); pauseButton.current?.focus({ preventScroll: true }); }
  }, [s.paused]);
  useEffect(() => {
    if (["rest", "complete", "revisit", "challenge"].includes(s.mode)) heading.current?.focus({ preventScroll: true });
  }, [s.mode, s.scenario]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !s.paused && !ended) { event.preventDefault(); dispatch({ type: "pause" }); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [dispatch, s.paused, ended]);

  async function toggleSound() {
    if (sound) { setSound(false); return; }
    if (enabling.current) return;
    enabling.current = true;
    const engine = audio.current ?? new BedroomAudio(); audio.current = engine;
    try {
      await engine.enable();
      if (alive.current) { setSound(true); setSoundNotice(""); } else engine.dispose();
    } catch {
      engine.dispose(); if (audio.current === engine) audio.current = null;
      if (alive.current) setSoundNotice("Sound unavailable. Everything still works quietly.");
    }
    finally { enabling.current = false; }
  }
  function catchInsect(id: number, keyboard: boolean) {
    dispatch({ type: "catch", id });
    // A removed focused target must not send keyboard users back to browser chrome.
    if (keyboard) requestAnimationFrame(() => {
      const next = scene.current?.querySelector<HTMLButtonElement>(".bedroom-insect:not([disabled])");
      (next ?? scene.current?.querySelector<HTMLButtonElement>(".bedroom-prop:not([disabled])"))?.focus({ preventScroll: true });
    });
  }
  const objective = ended ? s.mode === "complete" ? "Same room. A different evening." : "Leave it ready for tomorrow." :
    manageable(s) ? pageReady ? "Keep your place. Lower the light." : "A page or two. At your pace." :
    s.mode === "revisit" ? "Keep the routine. Find your place." : "Catch the buzz. Change the room.";

  return <section className="bedroom-game lives-run" aria-label="Leo’s evening" data-mode={s.mode} data-still={s.still}
    data-ready={ready} data-paused={s.paused} data-scenario={s.scenario} data-page={s.book.page}>
    <header className="bedroom-toolbar">
      <Link href="/approach?pane=games" aria-label="Back to learning" className="bedroom-icon"><ArrowLeft size={21} /></Link>
      <span>LEO’S EVENING</span>
      <div><button className="bedroom-icon" onClick={toggleSound} aria-label={sound ? "Mute room sounds" : "Enable room sounds"} aria-pressed={sound}>
        {sound ? <SpeakerHigh size={21} /> : <SpeakerSlash size={21} />}
      </button><button className="bedroom-icon" ref={pauseButton} onClick={() => dispatch({ type: "pause" })} aria-label="Pause game"><Pause size={21} /></button></div>
    </header>
    <div className="bedroom-caption">
      <h1 tabIndex={-1} ref={heading}>{HEADINGS[s.mode]}</h1>
      <p>{objective}</p>
      <div className="bedroom-hud">
        <div className="bedroom-regulation"><span>Room to settle</span><div role="meter" aria-label="Leo’s regulation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={calm} aria-valuetext={`${calm} out of 100`}>
          <span style={{ transform: `scaleX(${1 - s.activation})` }} />
        </div></div>
        <span className="bedroom-count" aria-label={`${s.insects.length} mosquitoes inside`}>{s.insects.length} inside</span>
        <span className="bedroom-clock" role="timer" aria-label="Time remaining">{s.mode === "challenge" && !s.still ? `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, "0")}` : ended ? <Check size={18} aria-label="Evening complete" /> : "Your pace"}</span>
      </div>
    </div>
    <div ref={scene} className="bedroom-scene" data-light={s.lamp} data-book={s.book.open ? "open" : "closed"} data-notifications={s.notifications} data-mood={roomMood(s)} aria-label="Leo’s bedroom" inert={s.paused || undefined}>
      <BedroomBackdrop />
      <div className="bedroom-bed"><BedAndLeo mood={roomMood(s)} headphones={s.headphones} /></div>
      <div className="bedroom-night-shade" />
      <Prop name="window" still={s.still} disabled={s.window === "secured" || ended} label={s.window === "secured" ? "Window secured" : "Close the window"} onClick={() => dispatch({ type: "window" })}>
        <RoomWindow secured={s.window === "secured"} outside={s.prevented > 0 || s.events.some(event => event.kind === "insects" && event.at - s.time < 2600)} />
      </Prop>
      <Prop name="phone" still={s.still} disabled={s.phone === "parked" || ended} label={s.phone === "parked" ? "Phone parked" : "Put phone away"} onClick={() => dispatch({ type: "phone" })}>
        <RoomPhone parked={s.phone === "parked"} notifications={s.notifications} />
      </Prop>
      <Prop name="lamp" still={s.still} disabled={ended} label={ended ? "Lights out" : s.lamp === "reading" ? "Dim the light" : s.lamp === "dim" ? "Light off" : "Light on"} onClick={() => dispatch({ type: "light" })}>
        <RoomLamp level={s.lamp} />
      </Prop>
      <Prop name="headphones" still={s.still} disabled={ended} selected={s.headphones} label={ended ? s.headphones ? "Sound softened" : "Quiet works too" : s.headphones ? "Headphones off" : "Headphones on"} onClick={() => dispatch({ type: "headphones" })}>
        <RoomHeadphones worn={s.headphones} />
      </Prop>
      <Prop name="book" still={s.still} disabled={ended || (pageReady && s.lamp !== "off")} label={bookLabel} onClick={() => dispatch({ type: "book" })}>
        <motion.div key={`${s.book.open}-${s.book.page}`} initial={s.still ? false : { rotateY: -14, opacity: .7 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: .25 }}>
          <RoomBook open={s.book.open} page={s.book.page} />
        </motion.div>
      </Prop>
      <AnimatePresence initial={false}>{s.insects.map(insect => <Mosquito key={insect.id} insect={insect} clock={clock} still={s.still || s.paused} catchIt={keyboard => catchInsect(insect.id, keyboard)} />)}</AnimatePresence>
      {s.mode === "revisit" && <span className="bedroom-night-label">ONE EVENING LATER</span>}
    </div>
    <footer className="bedroom-footer">
      <p role="status" aria-live="polite" aria-atomic="true">{soundNotice || s.line}</p>
      {s.mode === "rest" && <button className="bedroom-next" onClick={() => dispatch({ type: "next-evening" })}>Tomorrow evening <ArrowRight size={19} /></button>}
      {s.mode === "complete" && <div className="bedroom-finish"><button onClick={() => dispatch({ type: "restart" })}>Another evening</button><Link href="/lives/learn?module=lower_sensory_floor_v1">Bring it into your day <ArrowRight size={18} /></Link></div>}
      {s.mode === "complete" && <SkillRecommendation context="sleep" />}
    </footer>
    <dialog className="bedroom-pause" aria-labelledby="bedroom-pause-title" ref={dialog} onCancel={event => { event.preventDefault(); dispatch({ type: "resume" }); }}>
      <button className="bedroom-icon bedroom-pause-close" aria-label="Close pause menu" onClick={() => dispatch({ type: "resume" })}><X size={20} /></button>
      <span className="bedroom-pause-eyebrow">A LITTLE SPACE</span><h2 id="bedroom-pause-title">Nothing to keep up with.</h2>
      <button className="bedroom-next" autoFocus onClick={() => dispatch({ type: "resume" })}>Resume <ArrowRight size={19} /></button>
      <button className="bedroom-pace" aria-pressed={s.still} onClick={() => dispatch({ type: "still", value: !s.still })}><span>Play at my pace</span><span className="bedroom-switch" aria-hidden="true" data-on={s.still}><span /></span></button>
      {!ended && s.mode !== "revisit" && <button className="bedroom-pause-quiet" onClick={() => { dispatch({ type: "resume" }); dispatch({ type: "recover" }); }}>Continue without countdown</button>}
    </dialog>
  </section>;
}
