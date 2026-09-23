"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Star, Tag, Coin, ArrowUUpLeft } from "@phosphor-icons/react";
import type { Mood } from "@/learn/interactive";
import { budget, createJax, jaxReducer, missing, nearestLure, price, PRODUCTS, running, spent, trip, type JaxWorld } from "@/lives/jax-world";
import { GameShell } from "../kit/shell";
import { useLoop } from "../kit/use-loop";
import { CastBean } from "../kit/cast";
import { SCORES, sound } from "../sounds";
import { Aisle, Kitchen, Product, Trolley } from "./art";

type Emotion = "steady" | "tempted" | "firm" | "done";
const MOOD: Record<Emotion, Mood> = { steady: "neutral", tempted: "anxious", firm: "engaged", done: "pleased" };
const LANES = ["left", "middle", "right"];

function heading(s: JaxWorld) {
  if (s.phase === "till" || s.phase === "revisit-till") return "At the till.";
  if (s.phase === "setup") return "Home again.";
  if (s.phase === "complete") return "Just the list.";
  return trip(s).title;
}
function objective(s: JaxWorld) {
  if (s.phase === "till" || s.phase === "revisit-till") return spent(s) > budget(s) ? "Over budget. Put something back." : undefined;
  if (s.phase === "setup") return "Leave the next shop easier.";
  if (s.phase === "complete") return "Same list. The wish was your call.";
  if (s.trip === 0) return "Steer into the list. Tap the lures away.";
  return undefined;
}

export function JaxWorldGame() {
  const { state: s, dispatch } = useLoop(jaxReducer, () => createJax(), running);
  const live = s.phase === "aisle" || s.phase === "revisit";
  const till = s.phase === "till" || s.phase === "revisit-till";
  const t = trip(s);
  const tempted = live && s.items.some(i => i.lure && i.z > .45 && i.lane === s.lane);
  const emotion: Emotion = s.phase === "complete" || till ? "done" : tempted ? "tempted" : s.items.some(i => i.z > .6 && missing(s).includes(i.key)) ? "firm" : "steady";
  const over = spent(s) > budget(s);
  const pause = useCallback(() => dispatch({ type: "pause" }), [dispatch]);

  // Keyboard: arrows steer, Space flicks the nearest lure.
  useEffect(() => {
    if (!live) return;
    const key = (event: KeyboardEvent) => {
      if (s.paused || (event.target instanceof HTMLElement && event.target.closest("dialog"))) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); dispatch({ type: "steer", lane: s.lane + (event.key === "ArrowLeft" ? -1 : 1) }); }
      if (event.key === " " && !(event.target instanceof HTMLButtonElement)) { const lure = nearestLure(s); if (lure) { event.preventDefault(); dispatch({ type: "flick", id: lure.id }); } }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [live, s, dispatch]);

  // Swipe to steer.
  const swipe = useRef<{ x: number; id: number } | null>(null);
  const down = (e: PointerEvent) => { if ((e.target as HTMLElement).closest(".jw-item")) return; swipe.current = { x: e.clientX, id: e.pointerId }; };
  const up = (e: PointerEvent) => { const w = swipe.current; swipe.current = null; if (!w || w.id !== e.pointerId) return; const dx = e.clientX - w.x; if (Math.abs(dx) > 36) dispatch({ type: "steer", lane: s.lane + Math.sign(dx) }); };

  const heard = useRef({ basket: 0, wishes: 0, bump: 0, rev: s.revision });
  useEffect(() => {
    const h = heard.current;
    if (s.basket.length > h.basket) { const key = s.basket.at(-1)!; sound().sfx(s.list.includes(key) ? "plate" : "till", .5); }
    if (s.wishes.length > h.wishes) sound().sfx("zip", .8);
    if (s.bump > h.bump && s.basket.length === h.basket) sound().sfx("thud");
    if (s.revision !== h.rev && s.phase === "complete") sound().stinger("win");
    Object.assign(h, { basket: s.basket.length, wishes: s.wishes.length, bump: s.bump, rev: s.revision });
  });

  const wallet = <span className="jw-wallet" role="img" aria-label={`Spent ${spent(s)} of ${budget(s)} coins`}>
    <Coin size={15} weight="fill" /><span className="jw-wallet-bar"><i style={{ width: `${Math.min(100, spent(s) / budget(s) * 100)}%` }} data-over={over} /></span>
  </span>;
  const hud = live || till ? <>
    {s.phase !== "revisit" && s.phase !== "revisit-till" && <span className="kit-rounds" role="img" aria-label={`Trip ${s.trip + 1} of 3`}>{[0, 1, 2].map(r => <i key={r} data-on={r <= s.trip} />)}</span>}
    {wallet}
    {s.wishes.length > 0 && <span className="jw-wishes" role="img" aria-label={`${s.wishes.length} saved for later`}>{s.wishes.map(w => <Star key={w} size={15} weight="fill" />)}</span>}
  </> : undefined;

  return <GameShell name="jw-game" label="Jax’s shop" eyebrow="Jax · Just the list" heading={heading(s)} objective={objective(s)} hud={hud} status={s.message}
    paused={s.paused} still={s.still} onPause={pause} onResume={() => dispatch({ type: "resume" })} onStill={value => dispatch({ type: "still", value })}
    phaseKey={`${s.phase}-${s.trip}`} data={{ phase: s.phase, trip: s.trip, scenario: s.scenario, lane: s.lane }}
    score={SCORES.jax} playing={live} intensity={.3 + s.trip * .2 + (tempted ? .3 : 0)}>
    {(live || till) && <div className="jw-scene" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { swipe.current = null; }}>
      <Aisle flicker={s.trip >= 1} />
      {live && <div className="jw-lanes" role="group" aria-label="Aisle lanes">
        {LANES.map((name, lane) => <button key={name} className="jw-lane" data-lane={lane} aria-pressed={s.lane === lane} aria-label={`Steer ${name}`} onClick={() => dispatch({ type: "steer", lane })} />)}
      </div>}
      {live && <div className="jw-items" role="group" aria-label="Coming down the aisle">
        {s.items.map(item => {
          const p = PRODUCTS[item.key]!;
          const need = s.list.includes(item.key) && !s.basket.includes(item.key);
          const sold = t.soldOut?.key === item.key;
          const z = item.z;
          return <button key={item.id} className="jw-item" data-lane={item.lane} data-kind={p.kind} data-need={need} data-lure={item.lure} data-sold={sold}
            style={{ "--x": 50 + (item.lane - 1) * (7 + 27 * z), "--y": 38 + 44 * z ** 1.25, "--s": .32 + .78 * z, zIndex: Math.round(z * 100) } as CSSProperties}
            aria-label={need ? `Steer to the ${p.name.toLowerCase()}` : sold ? `${p.name}, sold out` : p.kind === "wish" ? s.trip < 3 ? `Save the ${p.name.toLowerCase()} for later` : `Steer to the ${p.name.toLowerCase()}, on sale` : `Knock ${p.name.toLowerCase()} away`}
            onClick={() => dispatch(need || (p.kind === "wish" && s.trip === 3) ? { type: "steer", lane: item.lane } : { type: "flick", id: item.id })}>
            <Product id={item.key} />
            {item.lure && p.kind === "extra" && <span className="jw-tag"><Tag size={12} weight="fill" /> Sale</span>}
            {p.kind === "wish" && <span className="jw-tag is-wish"><Star size={12} weight="fill" /> {s.trip === 3 ? "Sale" : "Want"}</span>}
            {sold && <span className="jw-tag is-sold">Sold out</span>}
            {need && s.setup.list && <span className="jw-tick"><Check size={12} weight="bold" /></span>}
          </button>;
        })}
      </div>}
      <motion.div className="jw-trolley" data-emotion={emotion} animate={{ left: `${50 + (s.lane - 1) * 30}%` }} transition={s.still ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34 }}>
        <span className="jw-jax"><CastBean who="jax" mood={MOOD[emotion]} size={110} /></span>
        <div className="jw-basket" aria-hidden="true">{s.basket.slice(-5).map((key, n) => <span key={key + n} className="jw-in"><Product id={key} /></span>)}</div>
        <Trolley />
        <div className="jw-list" role="img" aria-label={`List: ${s.list.map(k => PRODUCTS[k]!.name + (s.basket.includes(k) ? ", got" : "")).join("; ")}`}>
          {s.list.map(key => <span key={key} data-got={s.basket.includes(key)}><Product id={key} />{s.basket.includes(key) && <Check size={11} weight="bold" />}</span>)}
        </div>
      </motion.div>
      {s.still && live && <button className="kit-primary jw-roll" onClick={() => dispatch({ type: "roll" })}>Roll on <ArrowRight size={18} /></button>}
      {till && <motion.div className="jw-receipt" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} role="group" aria-label="Receipt">
        <ul>
          {s.basket.map((key, index) => {
            const keep = s.list.includes(key) && s.basket.indexOf(key) === index;
            return <li key={key + index}><Product id={key} /><span>{PRODUCTS[key]!.name}</span><b>{price(s, key)}</b>
              {!keep ? <button className="jw-back" aria-label={`Put ${PRODUCTS[key]!.name.toLowerCase()} back`} onClick={() => dispatch({ type: "return", index })}><ArrowUUpLeft size={18} /></button> : <span className="jw-back-gap" />}</li>;
          })}
        </ul>
        <p className="jw-total" data-over={over}><span>Total</span><b>{spent(s)} of {budget(s)}</b></p>
        <button className="kit-primary" onClick={() => dispatch({ type: "pay" })} aria-disabled={over}>Pay <ArrowRight size={18} /></button>
      </motion.div>}
    </div>}

    {(s.phase === "setup" || s.phase === "complete") && <div className="jw-scene is-home">
      <Kitchen />
      <button className="jw-prop jw-fridge-note" data-done={s.setup.list} disabled={s.phase === "complete"} onClick={() => dispatch({ type: "stick-list" })} aria-pressed={s.setup.list}>
        <span className="jw-note">{(s.receipts.at(-1)?.items ?? []).filter(k => PRODUCTS[k]!.kind === "need").slice(0, 3).map(k => <Product key={k} id={k} />)}</span>
        <span>{s.setup.list ? <><Check size={14} weight="bold" /> On the fridge</> : "Stick the list up"}</span>
      </button>
      <button className="jw-prop jw-fridge-shelf" data-done={s.setup.fridge} disabled={s.phase === "complete"} onClick={() => dispatch({ type: "fridge" })} aria-pressed={s.setup.fridge}>
        <Product id={s.receipts.at(-1)?.items.find(k => PRODUCTS[k]!.kind === "need") ?? "milk"} />
        <span>{s.setup.fridge ? <><Check size={14} weight="bold" /> Put away</> : "Put food away"}</span>
      </button>
      <button className="jw-prop jw-wish-board" data-done={s.setup.wish} disabled={s.phase === "complete"} onClick={() => dispatch({ type: "save-wish" })} aria-pressed={s.setup.wish}>
        <Product id={t.wish} />
        <span>{s.setup.wish ? <><Check size={14} weight="bold" /> Payday</> : `Save the ${PRODUCTS[t.wish]!.name.toLowerCase()}`}</span>
      </button>
      <span className="jw-home-jax"><CastBean who="jax" mood={s.phase === "complete" ? "pleased" : "thinking"} size={120} /></span>
      {s.phase === "setup" ? <button className="kit-primary jw-next" disabled={!(s.setup.list && s.setup.wish && s.setup.fridge)} onClick={() => dispatch({ type: "continue" })}>Next shop <ArrowRight size={18} /></button>
        : <div className="jw-end">
          <span className="kit-stamp"><Check size={18} weight="bold" /> {s.receipts.at(-1)?.items.includes(t.wish) ? `${PRODUCTS[t.wish]!.name}, on sale` : "Wish still saved"}</span>
          <Link className="kit-primary" href="/lives/learn?module=park_the_idea_v1">Park the new idea <ArrowRight size={18} /></Link>
          <button className="kit-quiet" onClick={() => dispatch({ type: "restart" })}>Another shop</button>
        </div>}
    </div>}
  </GameShell>;
}
