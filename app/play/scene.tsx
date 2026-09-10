"use client";

// The scene (PLAY-PLAN.md §11, P5): a full-width stage the bean stands in, with one flat prop
// drawn behind it. Our own art, in the beans' style: one or two shapes per prop, no faces, no
// text. Decorative — every round says its state in words — and `aria-hidden` throughout. A
// mechanic that wants the bean to be the thing you touch renders its own button inside.

import type { ReactNode } from "react";
import type { Character, Mood, Prop } from "@/learn/interactive";
import { Bean } from "./beans";

export const PROP_TINTS: Record<Prop, string> = {
  desk: "#e9e2f7", phone: "#e3ecfb", bill: "#f7e6dc", ball: "#dff0e6", lecture: "#f3ead9",
  bed: "#e4e8f5", kitchen: "#fbeedd", calendar: "#e2eef0", door: "#efe5de", none: "#ebe6f2",
};

/** One flat drawing per prop, on a 360×200 stage; the bean stands at x≈120. The part marked
 *  `play-prop` reacts on its own terms once the scene is up (PLAY-PLAN §11): the phone lights
 *  up, the bill slides a few pixels, the ball rolls in place. CSS only, inside its own box, and
 *  a still equal under reduced motion (`app/styles/play.css`). */
function PropArt({ prop }: { prop: Prop }) {
  switch (prop) {
    case "desk": return <><rect x="180" y="112" width="160" height="14" rx="4" fill="#c8b8e6" /><rect x="196" y="126" width="12" height="60" fill="#b9a7dc" /><rect x="312" y="126" width="12" height="60" fill="#b9a7dc" /><rect x="216" y="70" width="80" height="42" rx="6" fill="#7d6aa8" /><rect className="play-prop" x="222" y="76" width="68" height="26" rx="3" fill="#f4f0fb" /><rect x="248" y="112" width="16" height="6" fill="#7d6aa8" /></>;
    case "phone": return <><rect x="236" y="40" width="74" height="140" rx="14" fill="#7c8fc4" /><g className="play-prop"><rect x="244" y="52" width="58" height="108" rx="6" fill="#dfe9ff" /><circle cx="256" cy="72" r="8" fill="#ff6b57" /><rect x="270" y="66" width="24" height="5" rx="2" fill="#8fa5d6" /><rect x="270" y="75" width="18" height="5" rx="2" fill="#8fa5d6" /></g><circle cx="273" cy="170" r="5" fill="#dfe9ff" /></>;
    case "bill": return <g className="play-prop"><path d="M228 44h96l16 16v112H228z" fill="#fffdf7" stroke="#d9c7b4" strokeWidth="3" /><rect x="246" y="76" width="60" height="6" rx="3" fill="#d9c7b4" /><rect x="246" y="92" width="48" height="6" rx="3" fill="#d9c7b4" /><rect x="246" y="108" width="56" height="6" rx="3" fill="#d9c7b4" /><rect x="246" y="136" width="64" height="14" rx="4" fill="#e5533d" /></g>;
    case "ball": return <><ellipse cx="270" cy="182" rx="60" ry="8" fill="#b7d9c3" /><g className="play-prop"><circle cx="270" cy="128" r="46" fill="#ffb347" /><path d="M232 108q38-14 76 0" stroke="#e08a1b" strokeWidth="6" fill="none" strokeLinecap="round" /><path d="M232 148q38 14 76 0" stroke="#e08a1b" strokeWidth="6" fill="none" strokeLinecap="round" /></g></>;
    case "lecture": return <><rect x="176" y="40" width="168" height="100" rx="8" fill="#5b8a6a" /><rect x="184" y="48" width="152" height="84" rx="4" fill="#6fa383" /><g className="play-prop"><rect x="200" y="66" width="90" height="6" rx="3" fill="#dff0e6" opacity=".8" /><rect x="200" y="82" width="120" height="6" rx="3" fill="#dff0e6" opacity=".6" /><rect x="200" y="98" width="70" height="6" rx="3" fill="#dff0e6" opacity=".6" /></g><rect x="252" y="140" width="16" height="44" fill="#c9bfae" /></>;
    case "bed": return <><rect x="176" y="120" width="170" height="52" rx="10" fill="#8d9fd6" /><rect x="176" y="96" width="170" height="34" rx="8" fill="#eef1fb" /><rect x="188" y="70" width="60" height="34" rx="10" fill="#fff" /><rect x="176" y="172" width="12" height="16" fill="#5f6fa5" /><rect x="334" y="172" width="12" height="16" fill="#5f6fa5" /><circle className="play-prop" cx="60" cy="40" r="14" fill="#ffe9a8" /></>;
    case "kitchen": return <><rect x="176" y="100" width="170" height="86" rx="6" fill="#e2c39c" /><rect x="176" y="92" width="170" height="14" rx="4" fill="#b9885a" /><rect x="196" y="120" width="52" height="56" rx="4" fill="#f6dfc2" /><rect x="260" y="120" width="70" height="56" rx="4" fill="#f6dfc2" /><rect x="286" y="60" width="44" height="32" rx="6" fill="#ffffff" /><circle cx="308" cy="76" r="7" fill="#e0a45e" /><path className="play-prop" d="M220 60q8-14 0-28M236 60q8-14 0-28" stroke="#c9b3a0" strokeWidth="4" fill="none" strokeLinecap="round" /></>;
    case "calendar": return <><rect x="216" y="44" width="120" height="126" rx="10" fill="#fff" stroke="#9fbcc2" strokeWidth="3" /><rect x="216" y="44" width="120" height="30" rx="10" fill="#4f8b96" /><rect x="216" y="62" width="120" height="12" fill="#4f8b96" /><circle cx="244" cy="44" r="5" fill="#4f8b96" /><circle cx="308" cy="44" r="5" fill="#2f5c64" /><g fill="#cfe0e3"><rect x="228" y="88" width="20" height="16" rx="3" /><rect x="256" y="88" width="20" height="16" rx="3" /><rect x="284" y="88" width="20" height="16" rx="3" /><rect x="228" y="112" width="20" height="16" rx="3" /><rect x="284" y="112" width="20" height="16" rx="3" /><rect x="228" y="136" width="20" height="16" rx="3" /><rect x="256" y="136" width="20" height="16" rx="3" /></g><rect className="play-prop" x="256" y="112" width="20" height="16" rx="3" fill="#e5533d" /></>;
    case "door": return <><rect x="232" y="30" width="96" height="158" rx="6" fill="#b08a6e" /><g className="play-prop"><rect x="242" y="40" width="76" height="140" rx="4" fill="#c9a585" /><rect x="252" y="52" width="56" height="52" rx="3" fill="#b28e6c" /><rect x="252" y="112" width="56" height="58" rx="3" fill="#b28e6c" /><circle cx="304" cy="112" r="5" fill="#f0d9a8" /></g></>;
    case "none": return null;
  }
}

export function Scene({ prop = "none", who, mood, beanSize = 136, bean, result, look, children, className }: { prop?: Prop; who: Character; mood: Mood; beanSize?: number; look?: "fit"; /** Replaces the plain bean (a mechanic's bean button). */ bean?: ReactNode; /** The round's result, once there is one: the scene reacts (PLAY-PLAN.md §11). */ result?: "hit" | "miss"; children?: ReactNode; className?: string }) {
  return (
    <div className={`play-scene${className ? ` ${className}` : ""}`} data-prop={prop} data-result={result} style={{ background: PROP_TINTS[prop] }}>
      <svg className="play-scene-art" viewBox="0 0 360 200" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <PropArt prop={prop} />
      </svg>
      <div className="play-scene-bean">{bean ?? <Bean who={who} mood={mood} size={beanSize} look={look} />}</div>
      {children}
    </div>
  );
}
