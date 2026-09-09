"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { SCENE, type Point } from "@/lives";
import { leoFlightAt } from "@/lives/leo-flight";
import type { EngineProps } from "./engines";

/** Original scene artwork; the reference Unity clip informs the four-pose timing only. */
export function LeoBedroom({ asleep = false, moving = false }: { asleep?: boolean; moving?: boolean }) {
  return <svg className={`leo-bedroom${moving ? " is-moving" : ""}`} viewBox="0 0 390 560" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <path fill="#c5c6ed" d="M0 0h390v560H0z" />
    <path fill="#abaed9" d="M0 422h390v138H0z" />
    <rect x="247" y="35" width="106" height="151" rx="48" fill="#6d71ac" />
    <rect x="255" y="43" width="90" height="135" rx="42" fill="#363c73" />
    <path d="M316 62a24 24 0 1 0 12 37 24 24 0 0 1-12-37" fill="#fff2b7" />
    <path d="M271 101h6m-3-3v6m52 37h6m-3-3v6" stroke="#d9daf4" strokeWidth="3" strokeLinecap="round" />
    <path d="M251 121h98M301 41v140" stroke="#6d71ac" strokeWidth="7" />
    <path d="M26 402h67v14H26zm6 12h8v73h-8zm47 0h8v73h-8z" fill="#776089" />
    <path d="M51 352h12v48H51z" fill="#957194" /><path d="M36 315h43l13 42H24z" fill="#f2be85" />
    <ellipse cx="215" cy="508" rx="125" ry="16" fill="#8d8fbc" />
    <path d="M111 361q0-19 19-19h194q21 0 21 19v141H111z" fill="#815e83" />
    <rect x="120" y="351" width="214" height="119" rx="24" fill="#f8eddb" />
    <rect x="150" y="360" width="115" height="49" rx="22" fill="#fffaf0" />
    <g className="leo-sleepy-head">
      <path d="M161 394v-42q0-40 44-40t44 40v42z" fill="#b5d33d" />
      {asleep ? <path d="M178 353q7 7 14 0m24 0q7 7 14 0" fill="none" stroke="#465a08" strokeWidth="4" strokeLinecap="round" /> : <><path d="M175 343l18 3m22-1 18-5" stroke="#465a08" strokeWidth="4" strokeLinecap="round" /><ellipse cx="186" cy="357" rx="4" ry="6" fill="#465a08" /><ellipse cx="224" cy="357" rx="4" ry="6" fill="#465a08" /></>}
      <path d={asleep ? "M198 374q9 7 17 0" : "M199 378h14"} stroke="#465a08" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
    <path d="M122 393q92-19 211 7v92H122z" fill="#f1b56c" />
    <path d="M122 414q107-14 211 8v22q-112-23-211-8z" fill="#f8d699" />
    <path d="M129 492v20m197-20v20" stroke="#815e83" strokeWidth="12" strokeLinecap="round" />
    {asleep && <g fill="#465a08" fontFamily="sans-serif" fontWeight="700"><text x="155" y="290" fontSize="20">z</text><text x="133" y="267" fontSize="27">z</text></g>}
  </svg>;
}

function Mosquito({ annoyed, hit }: { annoyed: boolean; hit: boolean }) {
  return <svg viewBox="0 0 100 100" aria-hidden="true" className="leo-mosquito-art">
    <g className="leo-wing leo-wing-left"><ellipse cx="31" cy="33" rx="15" ry="23" transform="rotate(-35 31 33)" fill="#fffaf0" stroke="#3a355f" strokeWidth="3" /></g>
    <g className="leo-wing leo-wing-right"><ellipse cx="68" cy="33" rx="15" ry="23" transform="rotate(35 68 33)" fill="#fffaf0" stroke="#3a355f" strokeWidth="3" /></g>
    <path d="m34 63-16 10m20 2-10 15m33-27 19 10M59 76l11 14M44 33l-6-16m17 16 7-17" stroke="#3a355f" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="49" cy="61" rx="19" ry="26" fill={hit ? "#efd791" : "#f7c75d"} stroke="#3a355f" strokeWidth="3" />
    <path d="M31 60h37m-33 11h29" stroke="#3a355f" strokeWidth="7" />
    <ellipse cx="49" cy="40" rx="21" ry="18" fill="#f1b582" stroke="#3a355f" strokeWidth="3" />
    {hit ? <path d="m37 35 7 7m0-7-7 7m18-7 7 7m0-7-7 7" stroke="#3a355f" strokeWidth="3" strokeLinecap="round" /> : <><circle cx="40" cy="38" r="3" fill="#3a355f" /><circle cx="58" cy="38" r="3" fill="#3a355f" /><path d={annoyed ? "M35 30l10 3m9 0 10-3" : "M43 48q7 5 13-1"} stroke="#3a355f" strokeWidth="3" strokeLinecap="round" fill="none" /></>}
    <path d="M68 43h17" stroke="#3a355f" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}

/** Wasp-like MOVING → PRESSED → FALLING feedback, on the director's existing clock. */
export function LeoMosquito({ scene, live, reducedMotion, elapsedMs, onResult, outcome }: EngineProps) {
  const [hits, setHits] = useState<Record<string, Point>>({});
  const [misses, setMisses] = useState(0);
  const [focused, setFocused] = useState<{ id: string; at: Point } | null>(null);
  const hitIds = useRef(new Set<string>());
  const done = useRef(false);
  const finish = useRef(onResult);
  finish.current = onResult;
  const targets = scene.entities.filter(e => e.role === "target");
  const caught = Object.keys(hits).length;
  const swat = (id: string, at: Point) => {
    if (!live || done.current || hitIds.current.has(id)) return;
    hitIds.current.add(id);
    setHits(current => ({ ...current, [id]: at }));
    if (hitIds.current.size === targets.length) {
      done.current = true;
      finish.current({ outcome: "success", mistakes: misses, line: "Quiet at last." });
    }
  };
  return <div className="leo-room" data-live={live} data-reduced={reducedMotion} aria-label="Leo's bedroom" onPointerDown={event => {
    if (live && !done.current && !(event.target as Element).closest("button")) setMisses(n => n + 1);
  }}>
    <LeoBedroom asleep={outcome === "success" || caught === targets.length} moving={live && !reducedMotion && caught < targets.length} />
    {targets.map(e => {
      const at = hits[e.id] ?? (focused?.id === e.id ? focused.at : leoFlightAt(e, elapsedMs / 1000, reducedMotion));
      const hit = Boolean(hits[e.id]);
      return <div key={e.id} className="leo-fly-position" style={{ transform: `translate(${at.x / SCENE.width * 100}cqw, ${at.y / SCENE.height * 100}cqh)` }}>
        <motion.button type="button" className={`leo-fly${hit ? " is-caught" : ""}`} aria-label={`Catch mosquito ${Number(e.id.slice(1)) + 1}`} disabled={!live || hit} data-outcome="hit"
          initial={false} animate={hit && !reducedMotion ? { y: 30, rotate: 100, opacity: 0, scale: .8 } : { y: 0, rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: .3, delay: hit ? .08 : 0, ease: [.22, 1, .36, 1] }}
          onFocus={() => setFocused({ id: e.id, at })} onBlur={() => setFocused(null)}
          onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); swat(e.id, at); }}
          onClick={event => { if (event.detail === 0) swat(e.id, at); }}>
          <Mosquito annoyed={misses > 0} hit={hit} />
        </motion.button>
      </div>;
    })}
    <span className="sr-only" role="status">{caught ? `${caught} of ${targets.length} caught` : "Catch the mosquitoes so Leo can rest."}</span>
    {reducedMotion && !outcome && <button className="leo-skip" disabled={!live || done.current} data-outcome="miss" onClick={() => {
      if (!live || done.current) return;
      done.current = true; finish.current({ outcome: "failure", mistakes: misses, line: "The mosquito has other plans." });
    }}>Skip this round</button>}
  </div>;
}
