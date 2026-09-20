"use client";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Pause, Play, ArrowCounterClockwise } from "@phosphor-icons/react";
import { createMorning, morningReducer, ESSENTIALS, ROOMS, ROOM_NAMES, ITEM_NAMES, POINTS, carrying, packed, commandLabel, isMorning, position, type Command, type Essential, type Room } from "@/lives/theo-morning";
import { Prop, RoomArt, TheoAvatar } from "./art";

export function TheoMorningGame() {
  const reduced = useReducedMotion();
  const [state, dispatch] = useReducer(morningReducer, undefined, () => createMorning());
  const [ready, setReady] = useState(false), [selected, setSelected] = useState<Essential>("keys");
  const title = useRef<HTMLHeadingElement>(null), lastPhase = useRef(state.phase);
  const active = isMorning(state), evening = state.phase === "evening", result = state.phase === "departure" || state.phase === "complete";
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { if (reduced) dispatch({ type: "still", still: true }); }, [reduced]);
  useEffect(() => {
    if (!ready || !active || state.paused || state.still) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: "tick", seconds: Math.min(.25, (now - previous) / 1000) }); previous = now;
    }, 100);
    return () => clearInterval(timer);
  }, [ready, active, state.paused, state.still]);
  useEffect(() => {
    const hide = () => { if (document.hidden) dispatch({ type: "pause", paused: true }); };
    document.addEventListener("visibilitychange", hide); return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => { if (lastPhase.current !== state.phase) { title.current?.focus({ preventScroll: true }); lastPhase.current = state.phase; } }, [state.phase]);
  const select = (command: Command) => dispatch({ type: "choose", command });
  const place = position(state), hand = carrying(state), inBag = packed(state);
  const left = Math.max(0, Math.ceil(state.deadline - state.elapsed));
  const action = state.work?.command ?? state.intent;
  const progress = state.work ? state.work.elapsed / state.work.duration : 0;
  const titleText = evening ? "Make room for tomorrow." : state.phase === "complete" ? "A little less to carry." : state.phase === "departure" ? state.first?.caught ? "Made it out." : "A different train." : state.phase === "revisit" ? "You’ve been here before." : "One train. One busy brain.";
  const chooseHome = (room: Room) => {
    dispatch({ type: "home", item: selected, room });
    const next = ESSENTIALS.find(k => k !== selected && !state.homes[k]); if (next) setSelected(next);
  };
  function objectButton(command: Command, label?: string) {
    const isBusy = state.intent === command;
    return <button key={command} className="tm-object" data-active={isBusy} data-command={command} aria-label={label ?? commandLabel(state, command)} aria-pressed={isBusy} disabled={state.paused || !ready} onClick={() => select(command)}>
      <span className="tm-object-art"><Prop kind={command}/>{command === "phone" && state.plugged && <span className="tm-charge" aria-hidden="true"><i style={{ transform: `scaleX(${state.charge})` }}/></span>}</span>
      <span>{command === "phone" ? state.charge >= 1 ? "Phone" : state.plugged ? `${Math.floor(state.charge * 100)}%` : "Charge" : command === "bottle" ? state.filled ? "Water" : "Fill" : command === "bag" ? `${inBag.length}/3` : command === "shoes" ? "Shoes" : command === "spill" ? "Clear" : command === "umbrella" ? "Rain" : "Keys"}</span>
      {isBusy && <span className="tm-object-progress" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }}/></span>}
    </button>;
  }
  return <section className="tm-game lives-run" data-phase={state.phase} data-paused={state.paused} data-still={state.still} data-packed={inBag.length} data-node={state.node} data-trips={state.trips} data-intent={state.intent ?? ""} data-hands={hand.join(",")} data-ready={ready} aria-labelledby="tm-title">
    <nav className="tm-nav" aria-label="Game navigation"><Link href="/approach?pane=games" aria-label="Back to games"><ArrowLeft size={21}/></Link><span>Theo · Out the door</span>{active ? <button aria-label={state.paused ? "Resume game" : "Pause game"} onClick={() => dispatch({ type: "pause", paused: !state.paused })}>{state.paused ? <Play size={20}/> : <Pause size={20}/>}</button> : <span/>}</nav>
    <header className="tm-header"><div><span className="tm-kicker">{evening ? "That evening" : state.phase === "revisit" || state.phase === "complete" ? "The next morning" : "A morning with Theo"}</span><h1 id="tm-title" ref={title} tabIndex={-1}>{titleText}</h1></div>{active && <div className="tm-time" data-urgent={left < 16}><span>{state.still ? "Planning time" : state.updated ? "Next train" : "Train leaves"}</span><strong role="timer" aria-label="Time until train">{left ? `${left}s` : "Departed"}</strong></div>}</header>
    {active && <div className="tm-pocket" aria-label="Bag contents"><span className="tm-pocket-label">Bag</span>{ESSENTIALS.map(item => <span key={item} data-packed={state.items[item] === "bag"} data-carried={state.items[item] === "hand"}><Prop kind={item}/><span>{ITEM_NAMES[item]}</span>{state.items[item] === "bag" && <Check size={13} aria-label="packed"/>}</span>)}<span className="tm-hands">{hand.length}/2 hands</span></div>}
    {evening && <div className="tm-setup-items" role="group" aria-label="Choose an essential to give a home">{ESSENTIALS.map(item => <button key={item} aria-pressed={selected === item} onClick={() => setSelected(item)}><Prop kind={item}/>{ITEM_NAMES[item]}{state.homes[item] && <Check size={15}/>}</button>)}</div>}
    <div className="tm-theatre" data-evening={evening} data-rain={state.phase === "revisit" || state.phase === "complete"}>
      <div className="tm-train-track" aria-hidden="true"><span className="tm-station"/><div className="tm-train" data-left={state.elapsed >= state.deadline || result}><i/><i/><i/><i/><i/></div><span className="tm-track-line"/></div>
      <div className="tm-house" aria-label="Theo’s house">
        <div className="tm-corridor tm-corridor-x"/><div className="tm-corridor tm-corridor-y"/>
        {(["kitchen", "bedroom", "living", "door"] as Room[]).map(room => <div key={room} className={`tm-room tm-room-${room}`}><RoomArt room={room} evening={evening}/><span className="tm-room-name">{ROOM_NAMES[room]}</span></div>)}
        <svg className="tm-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{state.travel && <path d={`M${place.x},${place.y} L${POINTS[state.travel.to].x},${POINTS[state.travel.to].y}`} />}</svg>
        {active && ROOMS.map(room => <div key={room} className={`tm-room-items tm-items-${room}`} style={{ left: `${POINTS[room].x}%`, top: `${POINTS[room].y + 6}%` }}>{ESSENTIALS.filter(k => state.items[k] === room).map(k => objectButton(k))}{room === "door" && !state.shoes && objectButton("shoes")}{room === "door" && state.phase === "revisit" && !state.umbrella && objectButton("umbrella")}</div>)}
        {active && <div className="tm-bag-position">{objectButton("bag")}</div>}
        {active && state.spill === "wet" && <div className="tm-spill-position">{objectButton("spill")}</div>}
        {active && state.spill === "clear" && <div className="tm-clear-mark" aria-hidden="true"><Check size={20}/></div>}
        {evening && (["kitchen", "bedroom", "hall"] as Room[]).map(room => <button key={room} className={`tm-home tm-home-${room}`} style={{ left: `${POINTS[room].x}%`, top: `${POINTS[room].y + 6}%` }} aria-label={`Place ${ITEM_NAMES[selected]} in ${ROOM_NAMES[room]}`} onClick={() => chooseHome(room)}><span className="tm-home-props">{ESSENTIALS.filter(k => state.homes[k] === room).map(k => <Prop key={k} kind={k}/>)}{!ESSENTIALS.some(k => state.homes[k] === room) && <span>+</span>}</span><span>{ROOM_NAMES[room]}</span></button>)}
        {!evening && <div className="tm-character-space" aria-hidden="true"><div className="tm-character" style={{ transform: `translate(${result ? 89 : place.x}%, ${result ? 87 : place.y}%)` }}><div className="tm-character-anchor"><TheoAvatar load={result ? 0 : state.load} walking={Boolean(state.travel) && !state.paused && !state.still} shoes={state.shoes} carrying={hand.length}/>{hand.map((item, i) => <span key={item} className={`tm-carried tm-carried-${i}`}><Prop kind={item}/></span>)}{inBag.length > 0 && <span className="tm-worn-bag"><Prop kind="bag"/></span>}</div></div></div>}
        {evening && <><button className="tm-night-cue" aria-label="Leave twelve seconds earlier" aria-pressed={state.cue} onClick={() => dispatch({ type: "cue" })}><Prop kind="clock"/><span>{state.cue ? "Earlier ✓" : "Earlier cue"}</span></button><button className="tm-night-note" aria-pressed={state.note} onClick={() => dispatch({ type: "note" })}><Prop kind="later"/><span>{state.note ? "Noted ✓" : "Later note"}</span></button></>}
      </div>
      {state.paused && active && <div className="tm-pause"><h2>The world can wait.</h2><button className="tm-primary" onClick={() => dispatch({ type: "pause", paused: false })}><Play size={18}/>Resume</button><button className="tm-pace" aria-pressed={state.still} disabled={Boolean(reduced)} onClick={() => dispatch({ type: "still", still: !state.still })}>{state.still ? "Your pace · on" : "Play at your pace"}</button></div>}
    </div>
    <div className="tm-below">
      <div className="tm-message"><span className="tm-mood" role="img" aria-label={state.load > 60 ? "Theo feels tangled" : "Theo feels steady"} data-upset={state.load > 60}/><p role="status" aria-live="polite">{state.line}</p>{active && state.intent && <span className="tm-busy" aria-live="off">{state.travel ? "On the way" : action ? commandLabel(state, action) : ""}</span>}</div>
      {active && <div className="tm-demands"><div className="tm-demands-list"><AnimatePresence initial={false}>{state.demands.map(d => <motion.button key={d} initial={state.still ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }} disabled={state.paused} aria-pressed={state.intent === d} onClick={() => select(d)}><Prop kind={d}/>{commandLabel(state, d)}</motion.button>)}</AnimatePresence></div>{state.demands.length > 0 && <button className="tm-later" disabled={state.paused} onClick={() => select("later")} aria-pressed={state.intent === "later"}>Park for later</button>}</div>}
      {active && <div className="tm-actions"><div>{!state.updated && <button className="tm-quiet" disabled={state.paused} onClick={() => select("message")}>Update Ari</button>}{state.load > 50 && <button className="tm-quiet" disabled={state.paused} onClick={() => select("breathe")}>Take a breath</button>}</div><button className="tm-primary" disabled={state.paused || !ready} onClick={() => select("door")}>Leave <ArrowRight size={18}/></button></div>}
      {evening && <div className="tm-actions"><span className="tm-setup-count">{Object.keys(state.homes).length}/3 homes</span><button className="tm-primary" disabled={ESSENTIALS.some(k => !state.homes[k])} onClick={() => dispatch({ type: "tomorrow" })}>Tomorrow <ArrowRight size={18}/></button></div>}
      {result && <div className="tm-ending"><span className="tm-result-stat">{state.phase === "complete" ? `${state.first?.trips} → ${state.trips} trips` : `${state.trips} trips · ${Math.round(state.elapsed)}s`}</span>{state.phase === "departure" ? <button className="tm-primary" onClick={() => dispatch({ type: "evening" })}>Later that evening <ArrowRight size={18}/></button> : <><button className="tm-primary" onClick={() => { setSelected("keys"); dispatch({ type: "restart" }); }}><ArrowCounterClockwise size={18}/>Another morning</button><Link href="/lives/learn?module=launch_pad_v1">Make your own launch pad <ArrowRight size={17}/></Link></>}</div>}
    </div>
  </section>;
}
