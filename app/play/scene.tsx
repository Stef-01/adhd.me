"use client";

// The scene (PLAY-PLAN.md §11, P5; docs/design/games-to-leo-standard.md §2 to §4): a full-width
// stage the bean stands in, drawn as a place with four or more composed objects, on a 360 by 200
// viewBox, in the beans' simple-shape idiom. Sixteen places: the nine original props and the
// rooms the run table asks for (living room, meeting room, the crossing, the supermarket, the
// street, the study). Each declares its own seven tints as custom properties on the scene root
// (`--sc-sky` ... `--sc-accent`), which the art reads through the `f-*` and `s-*` classes in
// `app/styles/play.css`; a cool blue-navy base, warm only where the world is warm.
//
// One part of every place is its `play-prop`: it reacts on its own terms once the scene is up
// (the screen wakes, the message lights, the steam rises), once, inside its own box, and stands
// still under reduced motion. Exactly one per place (the §11 spec counts it).
//
// The stake (§2): `stake` is 0 to 1, driven by the round as it goes (the clock, the heat, the
// catch), and one thing in the place changes with it without a number: the page gains a line,
// the window darkens, the receipt grows, the launch pad fills, the bus comes closer.
//
// Decorative throughout: every round says its state in words, so the art is `aria-hidden`. The
// bean reads its mood from `data-mood` on the scene root as well as on the bean itself.

import type { CSSProperties, ReactNode } from "react";
import type { Character, Mood, Prop } from "@/learn/interactive";
import { Bean } from "./beans";

export interface SceneTints { sky: string; ground: string; deep: string; mid: string; light: string; warm: string; accent: string }

/** Seven tints per place, on the product's blue-navy base (ink #172033, paper #f7f8fc, blues #5065a6 and #6679b9). */
export const SCENE_TINTS: Readonly<Record<Prop, SceneTints>> = {
  desk: { sky: "#e6ebf7", ground: "#c5cfe9", deep: "#3d4f8a", mid: "#6679b9", light: "#f7f8fc", warm: "#f3d9a6", accent: "#7fae8e" },
  phone: { sky: "#e2e8f8", ground: "#c2cdeb", deep: "#33447d", mid: "#6679b9", light: "#f7f8fc", warm: "#ffd9a8", accent: "#e0654d" },
  bill: { sky: "#eceff7", ground: "#cdd5ea", deep: "#4a5b9c", mid: "#8a97c7", light: "#fffdf7", warm: "#e9c9a0", accent: "#e0654d" },
  ball: { sky: "#dcebf3", ground: "#b6d6be", deep: "#3f7a5d", mid: "#6679b9", light: "#f7f8fc", warm: "#ffb347", accent: "#6fa383" },
  lecture: { sky: "#e4e8f4", ground: "#bec8e2", deep: "#33447d", mid: "#5065a6", light: "#dfe6f9", warm: "#f3d9a6", accent: "#8fa5d6" },
  bed: { sky: "#d5daf0", ground: "#aeb6de", deep: "#2f3b66", mid: "#6679b9", light: "#f7f8fc", warm: "#fff2b7", accent: "#c9d3f0" },
  kitchen: { sky: "#f6eee2", ground: "#dcc19f", deep: "#8a5a3c", mid: "#c98a5e", light: "#fffaf0", warm: "#f3b264", accent: "#7fae8e" },
  calendar: { sky: "#e6ebf7", ground: "#c9d1ea", deep: "#2f3b66", mid: "#5c8fa6", light: "#f7f8fc", warm: "#f3d9a6", accent: "#e0654d" },
  door: { sky: "#efeae2", ground: "#cfc3b5", deep: "#6b4e35", mid: "#a8926b", light: "#fbf8f2", warm: "#d9a441", accent: "#5065a6" },
  living: { sky: "#f4ebe4", ground: "#d9b8a6", deep: "#7a4b3a", mid: "#c9785a", light: "#fffaf3", warm: "#f2c48d", accent: "#6fa383" },
  meeting: { sky: "#e3e9f3", ground: "#bfcadc", deep: "#22345e", mid: "#3f7f8c", light: "#f5f7f9", warm: "#e8d9b0", accent: "#8fbcc2" },
  crossing: { sky: "#dfe9f5", ground: "#6e7a8c", deep: "#3a4557", mid: "#9aa6b8", light: "#f7f8fc", warm: "#f2b544", accent: "#e0654d" },
  shop: { sky: "#e6f2ec", ground: "#c8d0d4", deep: "#3f5a52", mid: "#8fb8a6", light: "#fbfdfc", warm: "#ffd9a8", accent: "#e0453d" },
  street: { sky: "#f3e3e6", ground: "#b8bcc9", deep: "#4a4f66", mid: "#9a9fb4", light: "#f9f7f8", warm: "#f5b8a0", accent: "#7fae8e" },
  study: { sky: "#e1e5f2", ground: "#b9c2dd", deep: "#232c4d", mid: "#5065a6", light: "#f4f6fb", warm: "#f0b95a", accent: "#e0654d" },
  none: { sky: "#ebeefa", ground: "#d0d8ef", deep: "#5065a6", mid: "#6679b9", light: "#f7f8fc", warm: "#f3d9a6", accent: "#8fa5d6" },
};

/** The sky of each place; kept for anything that wants one colour per prop. */
export const PROP_TINTS: Readonly<Record<Prop, string>> = Object.fromEntries(Object.entries(SCENE_TINTS).map(([k, t]) => [k, t.sky])) as Record<Prop, string>;

function Floor() { return <rect x="0" y="168" width="360" height="32" className="f-ground" />; }
function Clock({ cx, cy, r = 14, turn = 0 }: { cx: number; cy: number; r?: number; turn?: number }) {
  return <>
    <circle cx={cx} cy={cy} r={r} className="f-light" />
    <circle cx={cx} cy={cy} r={r} fill="none" className="s-mid" strokeWidth="3" />
    <path d={`M${cx} ${cy}v${-(r - 5)}`} className="s-deep" strokeWidth="3" strokeLinecap="round" transform={`rotate(${turn} ${cx} ${cy})`} />
    <path d={`M${cx} ${cy}h${r - 7}`} className="s-deep" strokeWidth="3" strokeLinecap="round" />
  </>;
}
function Window({ x, y, w, h, dark = 0, children }: { x: number; y: number; w: number; h: number; dark?: number; children?: ReactNode }) {
  return <>
    <rect x={x} y={y} width={w} height={h} rx="6" className="f-mid" />
    <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="3" className="f-light" />
    {children}
    {dark > 0 && <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx="3" className="f-deep" opacity={dark} />}
    <path d={`M${x + w / 2} ${y + 6}v${h - 12}M${x + 6} ${y + h / 2}h${w - 12}`} className="s-mid" strokeWidth="3" />
  </>;
}

// ── The wall (games-review.md stage 3) ──────────────────────────────────────────────────────────
// Every place was a 360 by 200 strip fitted to the stage's width, so a phone showed a room 216px
// tall under half a screen of bare colour. Leo's room is a whole room: a wall with a window and a
// lamp above the bed. Each place now has its wall, drawn in the band above its furniture (y -250
// to 0), and the canvas reaches up to take it in, so the place fills a portrait stage whole. The
// walls react to nothing; the one reacting part stays in the furniture below.
function Pendant({ x, drop = 90 }: { x: number; drop?: number }) {
  const y = -250 + drop;
  return <>
    <path d={`M${x} -900V${y}`} className="s-deep" strokeWidth="2" />
    <ellipse cx={x} cy={y + 34} rx="34" ry="15" className="f-warm" opacity=".26" />
    <path d={`M${x - 20} ${y + 20}h40l-10-20h-20z`} className="f-deep" />
  </>;
}
function Frame({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <>
    <rect x={x} y={y} width={w} height={h} rx="4" className="f-light" />
    <path d={`M${x + 8} ${y + h - 8}l${w * 0.28} ${-h * 0.46} ${w * 0.18} ${h * 0.2} ${w * 0.14} ${-h * 0.14} ${w * 0.4 - 16} ${h * 0.4}z`} className="f-accent" />
    <circle cx={x + w * 0.72} cy={y + h * 0.3} r={Math.min(w, h) * 0.09} className="f-warm" />
    <rect x={x} y={y} width={w} height={h} rx="4" fill="none" className="s-mid" strokeWidth="4" />
  </>;
}
function Shelf({ x, y, w }: { x: number; y: number; w: number }) {
  const books: ReadonlyArray<readonly [string, number]> = [["f-deep", 26], ["f-warm", 20], ["f-accent", 24], ["f-mid", 18]];
  return <>
    {books.map(([c, h], i) => <rect key={i} x={x + 8 + i * 14} y={y - h} width="11" height={h} rx="1.5" className={c} />)}
    <rect x={x + w - 28} y={y - 10} width="18" height="10" rx="2" className="f-warm" /><circle cx={x + w - 19} cy={y - 18} r="11" className="f-accent" />
    <rect x={x} y={y} width={w} height="7" rx="2" className="f-deep" />
  </>;
}
function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="0" cy="0" rx="34" ry="14" className="f-light" /><ellipse cx="-18" cy="-8" rx="18" ry="13" className="f-light" /><ellipse cx="14" cy="-12" rx="22" ry="16" className="f-light" />
  </g>;
}
function Skyline() {
  const blocks: ReadonlyArray<readonly [number, number, number]> = [[6, 110, 62], [78, 152, 70], [158, 92, 52], [218, 172, 80], [306, 122, 54]];
  return <>{blocks.map(([x, h, w]) => <g key={x}>
    <rect x={x} y={-h} width={w} height={h} className="f-mid" opacity=".8" />
    {Array.from({ length: Math.floor(h / 30) }, (_, r) => <rect key={r} x={x + 10} y={-h + 12 + r * 26} width={w - 20} height="10" rx="2" className="f-light" opacity=".55" />)}
  </g>)}</>;
}

const WALLS: Readonly<Record<Prop, ReactNode>> = {
  desk: <><Pendant x={70} /><Shelf x={20} y={-56} w={132} /><Frame x={236} y={-176} w={94} h={68} /><rect x="186" y="-126" width="32" height="38" rx="2" className="f-warm" /><path d="M191 -114h22M191 -104h16" className="s-mid" strokeWidth="2" /></>,
  phone: <><Window x={34} y={-196} w={112} h={132} dark={0.55} /><circle cx="112" cy="-162" r="12" className="f-warm" /><Pendant x={256} drop={70} /><Frame x={214} y={-104} w={72} h={54} /></>,
  bill: <>
    <rect x="30" y="-196" width="152" height="112" rx="6" className="f-warm" />
    <rect x="46" y="-182" width="44" height="30" rx="2" className="f-light" transform="rotate(-6 68 -167)" /><rect x="104" y="-176" width="58" height="38" rx="2" className="f-light" /><path d="M104 -176l29 19 29-19" fill="none" className="s-mid" strokeWidth="2" />
    <rect x="58" y="-134" width="52" height="34" rx="2" className="f-light" transform="rotate(5 84 -117)" /><circle cx="68" cy="-182" r="4" className="f-accent" /><circle cx="133" cy="-176" r="4" className="f-accent" />
    <rect x="30" y="-196" width="152" height="112" rx="6" fill="none" className="s-deep" strokeWidth="4" /><Pendant x={292} drop={80} />
  </>,
  ball: <><Cloud x={250} y={-400} s={0.9} /><circle cx="300" cy="-192" r="30" className="f-warm" /><Cloud x={84} y={-202} /><Cloud x={212} y={-142} s={0.8} /><path d="M0 0q60-40 120-10t120-8 120 6v12H0z" className="f-accent" opacity=".55" /><circle cx="40" cy="-18" r="22" className="f-accent" /><circle cx="330" cy="-14" r="18" className="f-accent" /></>,
  lecture: <><Pendant x={60} drop={60} /><Pendant x={180} drop={60} /><Pendant x={300} drop={60} /><rect x="30" y="-122" width="202" height="42" rx="6" className="f-mid" /><rect x="44" y="-108" width="122" height="10" rx="4" className="f-light" /><Clock cx={318} cy={-104} r={20} /></>,
  bed: <>
    <Window x={40} y={-206} w={98} h={122} dark={0.6} /><circle cx="110" cy="-172" r="12" className="f-warm" />
    <path d="M160 -214q100 52 200 0" fill="none" className="s-mid" strokeWidth="2" />
    {[178, 208, 238, 268, 298, 328].map((x, i) => <circle key={x} cx={x} cy={-214 + Math.round(Math.sin(((i + 1) / 7) * Math.PI) * 25)} r="5" className="f-warm" />)}
    <Frame x={222} y={-142} w={82} h={62} />
  </>,
  kitchen: <>
    <rect x="24" y="-66" width="150" height="7" rx="2" className="f-deep" />
    {[36, 64, 92, 120, 148].map((x, i) => <g key={x}><rect x={x} y={-66 - (18 + (i % 2) * 8)} width="18" height={18 + (i % 2) * 8} rx="4" className={i % 2 ? "f-warm" : "f-light"} /><rect x={x - 1} y={-70 - (18 + (i % 2) * 8)} width="20" height="5" rx="2" className="f-deep" /></g>)}
    <Frame x={226} y={-150} w={100} h={74} />
    <path d="M60 -202h240" className="s-deep" strokeWidth="4" strokeLinecap="round" /><path d="M100 -202v22M160 -202v28M220 -202v20M270 -202v26" className="s-deep" strokeWidth="3" />
    <circle cx="100" cy="-174" r="7" className="f-warm" /><rect x="154" y="-174" width="12" height="10" rx="2" className="f-accent" /><ellipse cx="220" cy="-178" rx="9" ry="5" className="f-warm" /><rect x="264" y="-176" width="12" height="14" rx="3" className="f-accent" />
  </>,
  calendar: <>
    <rect x="24" y="-212" width="190" height="162" rx="6" className="f-light" /><rect x="24" y="-212" width="190" height="30" rx="6" className="f-deep" />
    {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => <rect key={`${r}-${c}`} x={34 + c * 36} y={-172 + r * 28} width="30" height="22" rx="3" className={r === 2 && c === 3 ? "f-accent" : "f-sky"} />))}
    <Pendant x={300} drop={40} /><Clock cx={300} cy={-140} r={26} />
  </>,
  door: <>
    <path d="M40 -102h150" className="s-deep" strokeWidth="6" strokeLinecap="round" />{[60, 110, 160].map((x) => <circle key={x} cx={x} cy="-96" r="5" className="f-warm" />)}
    <path d="M60 -96l-18 70h36z" className="f-accent" /><rect x="100" y="-96" width="22" height="46" rx="6" className="f-mid" />
    <ellipse cx="290" cy="-142" rx="40" ry="56" className="f-light" /><path d="M270 -172q14-10 26 4" fill="none" className="s-mid" strokeWidth="3" /><ellipse cx="290" cy="-142" rx="40" ry="56" fill="none" className="s-warm" strokeWidth="6" />
    <Pendant x={196} drop={50} />
  </>,
  living: <><Frame x={30} y={-172} w={82} h={62} /><Frame x={126} y={-194} w={58} h={84} /><Pendant x={262} drop={100} /><rect x="212" y="-40" width="130" height="7" rx="2" className="f-deep" /><rect x="228" y="-52" width="20" height="12" className="f-warm" /><circle cx="238" cy="-62" r="14" className="f-accent" /><rect x="292" y="-66" width="12" height="26" rx="2" className="f-mid" /><rect x="308" y="-60" width="12" height="20" rx="2" className="f-warm" /></>,
  meeting: <>
    {[40, 160, 280].map((x) => <rect key={x} x={x} y="-246" width="70" height="10" rx="3" className="f-light" />)}
    {[60, 150, 240, 330].map((x) => <path key={x} d={`M${x} -226V-6`} className="s-mid" strokeWidth="3" opacity=".45" />)}<path d="M0 -142h360" className="s-mid" strokeWidth="3" opacity=".45" />
    <rect x="30" y="-112" width="100" height="62" rx="4" className="f-mid" opacity=".5" /><Clock cx={196} cy={-184} r={22} />
  </>,
  crossing: <><Cloud x={210} y={-400} s={0.8} /><Cloud x={70} y={-214} /><Cloud x={252} y={-190} s={0.9} /><Skyline /></>,
  shop: <>
    {[50, 180, 310].map((x) => <g key={x}><path d={`M${x} -900V-210`} className="s-deep" strokeWidth="2" /><rect x={x - 40} y="-210" width="80" height="30" rx="5" className="f-accent" /><rect x={x - 26} y="-199" width="52" height="8" rx="3" className="f-light" /></g>)}
    {[20, 140, 260].map((x) => <rect key={x} x={x} y="-140" width="80" height="8" rx="3" className="f-light" opacity=".7" />)}
  </>,
  street: <><Cloud x={250} y={-390} s={0.85} /><Cloud x={92} y={-206} /><circle cx="300" cy="-202" r="24" className="f-warm" opacity=".8" /><Skyline /><path d="M40 0V-122h26" fill="none" className="s-deep" strokeWidth="5" /><ellipse cx="66" cy="-114" rx="12" ry="7" className="f-warm" /></>,
  study: <>
    <rect x="20" y="-232" width="132" height="222" rx="4" className="f-mid" />
    {[-192, -132, -72].map((y) => <g key={y}>{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={30 + i * 18} y={y - (22 + (i % 3) * 6)} width="14" height={22 + (i % 3) * 6} rx="1.5" className={["f-deep", "f-warm", "f-accent", "f-light"][i % 4]} />)}<rect x="20" y={y} width="132" height="6" className="f-deep" /></g>)}
    <Frame x={206} y={-168} w={108} h={78} /><Pendant x={300} drop={60} />
  </>,
  none: <><Cloud x={240} y={-380} s={0.9} /><Cloud x={82} y={-182} /><Cloud x={262} y={-122} s={0.8} /></>,
};

/** One place per prop. The part marked `play-prop` reacts once when the scene is up (PLAY-PLAN §11). */
function PropArt({ prop, stake }: { prop: Prop; stake: number }) {
  switch (prop) {
    case "desk": return <>
      <Floor />
      <Window x={150} y={26} w={76} h={62}><ellipse cx="172" cy="48" rx="10" ry="5" className="f-sky" /></Window>
      <rect x="176" y="118" width="172" height="12" rx="4" className="f-mid" /><rect x="188" y="130" width="10" height="38" className="f-deep" /><rect x="326" y="130" width="10" height="38" className="f-deep" />
      <rect x="180" y="100" width="18" height="18" rx="3" className="f-warm" /><circle cx="184" cy="94" r="7" className="f-accent" /><circle cx="195" cy="92" r="8" className="f-accent" />
      <g transform="rotate(-8 217 108)"><rect x="200" y="96" width="34" height="24" rx="2" className="f-light" />
        {stake > 0.3 && <rect x="205" y="102" width="20" height="3" rx="1.5" className="f-mid" />}{stake > 0.6 && <rect x="205" y="108" width="24" height="3" rx="1.5" className="f-mid" />}{stake > 0.9 && <rect x="205" y="114" width="14" height="3" rx="1.5" className="f-mid" />}</g>
      <rect x="256" y="102" width="18" height="16" className="f-deep" /><rect x="222" y="54" width="86" height="52" rx="8" className="f-deep" />
      <g className="play-prop"><rect x="228" y="60" width="74" height="40" rx="4" className="f-light" /><rect x="236" y="70" width="40" height="4" rx="2" className="f-mid" /><rect x="236" y="80" width="56" height="4" rx="2" className="f-sky" /><rect x="236" y="90" width="30" height="4" rx="2" className="f-sky" /></g>
      <rect x="244" y="110" width="50" height="6" rx="2" className="f-deep" />
      <rect x="312" y="102" width="16" height="16" rx="3" className="f-warm" /><path d="M328 106h4a3 3 0 0 1 0 8h-4" fill="none" className="s-warm" strokeWidth="3" />
      <circle cx="338" cy="80" r="18" className="f-warm" opacity=".22" /><path d="M338 118V66" className="s-deep" strokeWidth="4" /><path d="M322 66h32l-8-16h-16z" className="f-warm" />
    </>;
    case "phone": return <>
      <Floor />
      <Clock cx={150} cy={52} r={16} />
      <rect x="196" y="150" width="150" height="10" rx="4" className="f-mid" /><rect x="206" y="160" width="8" height="12" className="f-deep" /><rect x="328" y="160" width="8" height="12" className="f-deep" />
      <rect x="232" y="22" width="88" height="130" rx="16" className="f-deep" /><rect x="240" y="34" width="72" height="106" rx="8" className="f-light" />
      <rect x="246" y="38" width="16" height="3" rx="1.5" className="f-mid" /><rect x="292" y="38" width="14" height="3" rx="1.5" className="f-mid" />
      <rect x="246" y="48" width="40" height="14" rx="7" className="f-sky" /><rect x="266" y="66" width="40" height="14" rx="7" className="f-mid" />
      <g className="play-prop"><rect x="246" y="84" width="46" height="16" rx="8" className="f-accent" /><circle cx="292" cy="84" r="5" className="f-warm" /></g>
      {stake > 0.4 && <rect x="262" y="104" width="44" height="10" rx="5" className="f-mid" />}{stake > 0.75 && <rect x="246" y="116" width="34" height="8" rx="4" className="f-sky" />}
      <rect x="246" y="126" width="52" height="10" rx="3" className="f-sky" /><circle cx="304" cy="131" r="5" className="f-accent" />
      <rect x="262" y="144" width="28" height="4" rx="2" className="f-mid" />
    </>;
    case "bill": return <>
      <Floor />
      <rect x="250" y="28" width="92" height="142" rx="8" className="f-light" /><rect x="250" y="28" width="92" height="142" rx="8" fill="none" className="s-mid" strokeWidth="3" /><path d="M250 86h92" className="s-mid" strokeWidth="3" />
      <rect x="258" y="52" width="6" height="22" rx="3" className="f-mid" /><rect x="258" y="98" width="6" height="34" rx="3" className="f-mid" />
      <circle cx="306" cy="48" r="5" className="f-accent" /><circle cx="322" cy="60" r="4" className="f-warm" /><rect x="288" y="100" width="34" height="26" rx="2" className="f-sky" transform="rotate(4 305 113)" />
      <rect x="150" y="128" width="90" height="8" rx="3" className="f-mid" /><rect x="158" y="136" width="8" height="32" className="f-deep" /><rect x="224" y="136" width="8" height="32" className="f-deep" />
      <g className="play-prop"><path d="M166 66h50l12 12v50h-62z" className="f-light" /><path d="M166 66h50l12 12v50h-62z" fill="none" className="s-mid" strokeWidth="3" /><rect x="176" y="88" width="34" height="4" rx="2" className="f-mid" /><rect x="176" y="98" width="26" height="4" rx="2" className="f-mid" /><rect x="176" y="112" width="40" height="8" rx="3" className="f-accent" /></g>
      {stake > 0.5 && <circle cx="214" cy="80" r="9" fill="none" className="s-accent" strokeWidth="3" />}
    </>;
    case "ball": return <>
      <Floor />
      <path d="M0 176q180-14 360 0v24H0z" className="f-light" opacity=".45" />
      <circle cx="310" cy="36" r="18" className="f-warm" />
      <rect x="176" y="112" width="12" height="58" className="f-deep" /><circle cx="182" cy="96" r="32" className="f-accent" /><circle cx="164" cy="108" r="18" className="f-accent" />
      <rect x="262" y="118" width="70" height="8" rx="3" className="f-mid" /><rect x="262" y="132" width="70" height="8" rx="3" className="f-mid" /><rect x="268" y="140" width="6" height="28" className="f-deep" /><rect x="320" y="140" width="6" height="28" className="f-deep" />
      <rect x="340" y="140" width="16" height="28" rx="3" className="f-deep" />
      {stake > 0.5 && <rect x="284" y="108" width="26" height="10" rx="3" className="f-warm" />}
      <ellipse cx="240" cy="166" rx="30" ry="5" className="f-deep" opacity=".2" />
      <g className="play-prop"><circle cx="240" cy="134" r="30" className="f-warm" /><path d="M216 120q24-10 48 0M216 148q24 10 48 0" fill="none" className="s-deep" strokeWidth="5" strokeLinecap="round" /></g>
    </>;
    case "lecture": return <>
      <Floor />
      <Clock cx={120} cy={48} />
      <rect x="170" y="26" width="176" height="106" rx="8" className="f-deep" /><rect x="178" y="34" width="160" height="90" rx="4" className="f-mid" />
      <g className="play-prop"><rect x="196" y="52" width="80" height="6" rx="3" className="f-light" /><rect x="196" y="68" width="110" height="6" rx="3" className="f-light" opacity=".7" /><rect x="196" y="84" width="64" height="6" rx="3" className="f-light" opacity=".7" /></g>
      {stake > 0.5 && <rect x="196" y="100" width="90" height="6" rx="3" className="f-warm" />}
      <rect x="248" y="132" width="40" height="36" rx="4" className="f-deep" /><rect x="242" y="126" width="52" height="10" rx="3" className="f-mid" />
      <g className="f-mid"><rect x="84" y="150" width="56" height="18" rx="6" /><rect x="150" y="150" width="56" height="18" rx="6" /><rect x="216" y="150" width="56" height="18" rx="6" /><rect x="282" y="150" width="56" height="18" rx="6" /></g>
    </>;
    case "bed": return <>
      <Floor />
      <rect x="150" y="22" width="80" height="66" rx="8" className="f-deep" /><circle cx="166" cy="36" r="2" className="f-light" /><circle cx="176" cy="70" r="1.5" className="f-light" /><circle cx="216" cy="74" r="2" className="f-light" />
      <circle className="play-prop f-warm" cx="206" cy="44" r="11" />
      <path d="M190 22v66M150 55h80" className="s-mid" strokeWidth="4" />
      <rect x="238" y="82" width="112" height="44" rx="10" className="f-deep" /><rect x="238" y="118" width="112" height="40" rx="8" className="f-light" /><rect x="238" y="132" width="112" height="26" rx="8" className="f-mid" /><rect x="238" y="140" width="112" height="6" className="f-warm" opacity=".6" /><rect x="248" y="102" width="44" height="22" rx="9" className="f-light" />
      <rect x="244" y="158" width="8" height="10" className="f-deep" /><rect x="336" y="158" width="8" height="10" className="f-deep" />
      <rect x="196" y="126" width="36" height="42" rx="4" className="f-deep" />
      <circle cx="214" cy="104" r="22" className="f-warm" opacity=".22" /><rect x="210" y="112" width="8" height="14" className="f-mid" /><path d="M196 112h36l-6-18h-24z" className="f-warm" />
      <circle cx="226" cy="120" r="9" className="f-light" opacity={0.45 * (1 - stake)} /><rect x="222" y="114" width="7" height="12" rx="2" className="f-light" opacity={1 - 0.6 * stake} />
      <ellipse cx="290" cy="176" rx="60" ry="7" className="f-mid" opacity=".5" />
    </>;
    case "kitchen": return <>
      <Floor />
      <Clock cx={120} cy={48} />
      <Window x={150} y={26} w={70} h={56} />
      <rect x="236" y="26" width="112" height="50" rx="4" className="f-mid" /><path d="M292 26v50" className="s-deep" strokeWidth="2" opacity=".35" /><rect x="282" y="44" width="4" height="14" rx="2" className="f-light" /><rect x="298" y="44" width="4" height="14" rx="2" className="f-light" />
      <rect x="176" y="118" width="172" height="50" className="f-mid" /><path d="M262 118v50" className="s-deep" strokeWidth="2" opacity=".35" /><rect x="176" y="106" width="172" height="12" rx="3" className="f-light" />
      <rect x="190" y="86" width="40" height="20" rx="5" className="f-light" /><rect x="198" y="84" width="10" height="6" className="f-deep" /><rect x="212" y="84" width="10" height="6" className="f-deep" />
      <ellipse cx="240" cy="104" rx="12" ry="3" className="f-light" />{stake > 0.3 && <circle cx="240" cy="102" r="4" className="f-accent" />}
      <rect x="252" y="98" width="64" height="8" rx="2" className="f-deep" /><ellipse cx="284" cy="98" rx="22" ry="6" className="f-deep" /><path d="M306 96h22" className="s-deep" strokeWidth="5" strokeLinecap="round" />
      <path className="play-prop s-light" d="M272 88q6-12 0-24M284 86q6-12 0-24M296 88q6-12 0-24" fill="none" strokeWidth="4" strokeLinecap="round" />
      {stake > 0.6 && <path d="M266 76q8-16 0-32" fill="none" className="s-deep" strokeWidth="4" opacity=".35" strokeLinecap="round" />}
      <rect x="326" y="92" width="14" height="14" rx="3" className="f-warm" />
    </>;
    case "calendar": return <>
      <Floor />
      <Clock cx={120} cy={50} r={15} />
      <Window x={150} y={26} w={52} h={60} />
      <rect x="216" y="30" width="120" height="126" rx="10" className="f-light" /><rect x="216" y="30" width="120" height="126" rx="10" fill="none" className="s-mid" strokeWidth="3" /><rect x="216" y="30" width="120" height="30" rx="10" className="f-deep" /><rect x="216" y="48" width="120" height="12" className="f-deep" /><circle cx="244" cy="30" r="5" className="f-mid" /><circle cx="308" cy="30" r="5" className="f-mid" />
      {[[228, 74], [256, 74], [284, 74], [228, 98], [284, 98], [228, 122], [256, 122]].map(([x, y], i) => <rect key={i} x={x} y={y} width="20" height="16" rx="3" className={stake >= (i + 1) / 8 ? "f-mid" : "f-ground"} />)}
      <rect className="play-prop f-accent" x="256" y="98" width="20" height="16" rx="3" />
      <rect x="176" y="156" width="172" height="12" rx="4" className="f-mid" /><path d="M190 156v-46" className="s-deep" strokeWidth="4" /><path d="M176 110h28l-6-16h-16z" className="f-warm" />
      <rect x="280" y="146" width="36" height="6" rx="3" className="f-deep" transform="rotate(-12 298 149)" />
    </>;
    case "door": return <>
      <Floor />
      <Clock cx={120} cy={46} />
      <rect x="226" y="20" width="110" height="150" rx="6" className="f-deep" />
      <g className="play-prop"><rect x="236" y="30" width="90" height="140" rx="4" className="f-mid" /><rect x="246" y="42" width="70" height="50" rx="3" className="f-deep" opacity=".25" /><rect x="246" y="102" width="70" height="56" rx="3" className="f-deep" opacity=".25" /><circle cx="310" cy="102" r="5" className="f-warm" /></g>
      <path d="M160 46h60" className="s-deep" strokeWidth="4" strokeLinecap="round" /><circle cx="172" cy="52" r="3" className="f-warm" /><circle cx="196" cy="52" r="3" className="f-warm" /><circle cx="214" cy="52" r="3" className="f-warm" />
      <path d="M184 56h24l6 44h-36z" className="f-accent" /><rect x="206" y="58" width="16" height="22" rx="4" className="f-warm" opacity=".8" />
      <rect x="150" y="122" width="66" height="8" rx="3" className="f-deep" /><rect x="156" y="130" width="6" height="38" className="f-deep" opacity=".6" /><rect x="204" y="130" width="6" height="38" className="f-deep" opacity=".6" />
      {stake > 0.25 && <><circle cx="166" cy="114" r="5" fill="none" className="s-warm" strokeWidth="3" /><path d="M171 114h10M178 114v4" className="s-warm" strokeWidth="3" strokeLinecap="round" /></>}
      {stake > 0.55 && <rect x="190" y="106" width="9" height="16" rx="2" className="f-light" />}{stake > 0.85 && <rect x="202" y="112" width="12" height="9" rx="2" className="f-warm" />}
      <rect x="246" y="158" width="24" height="10" rx="5" className="f-deep" /><rect x="274" y="158" width="24" height="10" rx="5" className="f-deep" />
    </>;
    case "living": return <>
      <Floor />
      <rect x="164" y="40" width="44" height="56" rx="4" className="f-light" /><circle cx="186" cy="44" r="3" className="f-accent" /><rect x="172" y="54" width="28" height="4" rx="2" className="f-mid" /><rect x="172" y="64" width="20" height="4" rx="2" className="f-mid" />{stake > 0.5 && <rect x="172" y="74" width="24" height="4" rx="2" className="f-accent" />}
      <rect x="270" y="40" width="50" height="36" rx="4" className="f-deep" /><path d="M276 70l12-14 10 8 8-6 8 12z" className="f-accent" />
      <circle cx="330" cy="70" r="20" className="f-warm" opacity=".22" /><path d="M330 92V56" className="s-deep" strokeWidth="4" /><path className="play-prop f-warm" d="M314 56h32l-6-18h-20z" />
      <rect x="236" y="92" width="112" height="40" rx="12" className="f-mid" /><rect x="246" y="100" width="42" height="28" rx="8" className="f-light" /><rect x="296" y="100" width="42" height="28" rx="8" className="f-light" /><rect x="230" y="126" width="124" height="28" rx="8" className="f-mid" /><rect x="226" y="112" width="14" height="42" rx="7" className="f-deep" /><rect x="344" y="112" width="14" height="42" rx="7" className="f-deep" /><rect x="240" y="154" width="8" height="14" className="f-deep" /><rect x="336" y="154" width="8" height="14" className="f-deep" />
      <ellipse cx="250" cy="178" rx="80" ry="7" className="f-light" opacity=".6" />
      <rect x="150" y="128" width="72" height="8" rx="3" className="f-deep" /><rect x="156" y="136" width="6" height="32" className="f-deep" /><rect x="210" y="136" width="6" height="32" className="f-deep" />
      {stake < 0.8 && <path d="M162 124q10-14 24-6" fill="none" className="s-warm" strokeWidth="6" strokeLinecap="round" />}{stake < 0.5 && <rect x="176" y="112" width="12" height="14" rx="3" className="f-light" />}
      <circle cx="200" cy="120" r="5" fill="none" className="s-deep" strokeWidth="3" /><path d="M205 120h8" className="s-deep" strokeWidth="3" strokeLinecap="round" />
    </>;
    case "meeting": return <>
      <Floor />
      <rect x="150" y="30" width="68" height="56" rx="6" className="f-mid" /><rect x="156" y="36" width="56" height="44" rx="3" className="f-sky" /><path d="M156 72q20-14 56-4v12h-56z" className="f-accent" /><ellipse cx="186" cy="66" rx="9" ry="5" className="f-light" /><circle cx="180" cy="64" r="2" className="f-deep" /><circle cx="190" cy="67" r="2" className="f-deep" /><path d="M184 30v50M156 58h56" className="s-mid" strokeWidth="3" />
      <rect x="236" y="26" width="112" height="72" rx="6" className="f-deep" /><rect x="242" y="32" width="100" height="60" rx="3" className="f-light" />
      <rect className="play-prop f-mid" x="252" y="44" width="50" height="6" rx="3" />
      {stake > 0.34 && <rect x="252" y="58" width="70" height="5" rx="2.5" className="f-accent" />}{stake > 0.67 && <rect x="252" y="70" width="52" height="5" rx="2.5" className="f-accent" />}
      <rect x="196" y="104" width="30" height="24" rx="6" className="f-deep" /><rect x="326" y="104" width="30" height="24" rx="6" className="f-deep" />
      <rect x="176" y="126" width="172" height="10" rx="5" className="f-mid" /><rect x="256" y="136" width="12" height="32" className="f-deep" />
      <rect x="290" y="112" width="34" height="14" rx="2" className="f-deep" /><rect x="286" y="124" width="42" height="4" rx="2" className="f-mid" /><rect x="230" y="114" width="12" height="12" rx="3" className="f-warm" />
    </>;
    case "crossing": return <>
      <rect x="0" y="130" width="360" height="70" className="f-ground" /><rect x="0" y="124" width="360" height="8" className="f-light" />
      <ellipse cx="120" cy="40" rx="18" ry="8" className="f-light" />
      <rect x="150" y="50" width="60" height="74" className="f-mid" /><rect x="220" y="66" width="80" height="58" className="f-mid" opacity=".7" /><g className="f-light"><rect x="160" y="60" width="10" height="12" /><rect x="180" y="60" width="10" height="12" /><rect x="160" y="84" width="10" height="12" /><rect x="180" y="84" width="10" height="12" /><rect x="236" y="78" width="10" height="10" /><rect x="260" y="78" width="10" height="10" /></g>
      <g className="f-warm"><rect x="190" y="138" width="24" height="56" /><rect x="230" y="138" width="24" height="56" /><rect x="270" y="138" width="24" height="56" /><rect x="310" y="138" width="24" height="56" /></g>
      <g transform={`translate(${-stake * 60} 0)`}><rect x="300" y="84" width="90" height="40" rx="8" className="f-deep" /><rect x="308" y="92" width="18" height="14" rx="3" className="f-light" /><rect x="332" y="92" width="18" height="14" rx="3" className="f-light" /><circle cx="316" cy="126" r="6" className="f-deep" /><circle cx="350" cy="126" r="6" className="f-deep" /></g>
      <rect x="332" y="70" width="4" height="54" className="f-deep" />
      <circle className="play-prop f-accent" cx="334" cy="62" r="12" />
    </>;
    case "shop": return <>
      <Floor />
      <rect x="150" y="30" width="110" height="100" rx="4" className="f-mid" /><g className="f-light"><rect x="156" y="52" width="98" height="4" /><rect x="156" y="82" width="98" height="4" /><rect x="156" y="112" width="98" height="4" /></g>
      <g><rect x="162" y="38" width="12" height="14" rx="2" className="f-warm" /><rect x="180" y="40" width="10" height="12" rx="2" className="f-accent" /><rect x="198" y="36" width="14" height="16" rx="2" className="f-light" /><rect x="164" y="68" width="14" height="14" rx="2" className="f-deep" /><rect x="186" y="70" width="10" height="12" rx="2" className="f-warm" /><rect x="168" y="98" width="12" height="14" rx="2" className="f-light" /><rect x="190" y="100" width="12" height="12" rx="2" className="f-deep" /></g>
      <g className="play-prop"><path d="M214 96l10-10h14v14l-10 10z" className="f-accent" /><circle cx="234" cy="90" r="2" className="f-light" /></g>
      <rect x="270" y="30" width="60" height="100" rx="4" className="f-deep" /><rect x="276" y="36" width="48" height="88" rx="3" className="f-sky" /><rect x="318" y="70" width="4" height="20" rx="2" className="f-light" />
      <rect x="176" y="140" width="120" height="28" rx="4" className="f-deep" /><rect x="176" y="134" width="120" height="8" rx="3" className="f-light" />
      <rect x="282" y={124 - stake * 30} width="16" height={10 + stake * 30} rx="2" className="f-light" /><path d={`M286 ${128 - stake * 30}h8`} className="s-mid" strokeWidth="2" />
      <path d="M306 142h12l6 20h24" fill="none" className="s-deep" strokeWidth="4" strokeLinecap="round" /><rect x="322" y="146" width="26" height="14" rx="2" className="f-mid" /><circle cx="326" cy="166" r="4" className="f-deep" /><circle cx="344" cy="166" r="4" className="f-deep" />
    </>;
    case "street": return <>
      <rect x="0" y="176" width="360" height="24" className="f-ground" /><rect x="0" y="160" width="360" height="16" className="f-light" />
      <circle cx="300" cy={60 - stake * 20} r="18" className="f-warm" /><ellipse cx="130" cy="44" rx="20" ry="8" className="f-light" />
      <rect x="310" y="60" width="4" height="100" className="f-deep" /><rect x="302" y="50" width="20" height="12" rx="4" className="f-warm" />
      <rect x="232" y="104" width="12" height="56" className="f-deep" /><circle className="play-prop f-accent" cx="238" cy="88" r="34" />
      <rect x="178" y="110" width="4" height="50" className="f-deep" /><rect x="168" y="100" width="24" height="16" rx="3" className="f-mid" /><rect x="172" y="104" width="16" height="8" rx="2" className="f-light" />
      <rect x="262" y="136" width="40" height="6" rx="3" className="f-mid" /><rect x="266" y="142" width="4" height="18" className="f-deep" /><rect x="294" y="142" width="4" height="18" className="f-deep" />
      <rect x="150" y="150" width="20" height="10" rx="5" className="f-deep" /><rect x="174" y="150" width="20" height="10" rx="5" className="f-deep" />
    </>;
    case "study": return <>
      <Floor />
      <Window x={150} y={24} w={70} h={60} dark={stake * 0.85}>{stake > 0.7 && <circle cx="200" cy="42" r="2" className="f-light" />}</Window>
      <rect x="238" y="30" width="46" height="48" rx="4" className="f-light" /><rect x="238" y="30" width="46" height="12" rx="4" className="f-deep" /><g className="f-ground"><rect x="244" y="48" width="8" height="6" rx="1" /><rect x="256" y="48" width="8" height="6" rx="1" /><rect x="268" y="48" width="8" height="6" rx="1" /><rect x="244" y="60" width="8" height="6" rx="1" /><rect x="268" y="60" width="8" height="6" rx="1" /></g><rect x="256" y="60" width="8" height="6" rx="1" className="f-accent" />
      <Clock cx={316} cy={52} r={16} turn={stake * 180} />
      <rect x="176" y="118" width="172" height="12" rx="4" className="f-mid" /><rect x="188" y="130" width="10" height="38" className="f-deep" /><rect x="326" y="130" width="10" height="38" className="f-deep" />
      <rect x="226" y="98" width="60" height="20" rx="3" className="f-deep" /><rect x="220" y="114" width="72" height="5" rx="2" className="f-mid" /><rect x="196" y="104" width="14" height="14" rx="3" className="f-warm" /><rect x="296" y="106" width="8" height="12" className="f-accent" /><rect x="304" y="102" width="8" height="16" className="f-mid" />
      <circle cx="330" cy="82" r="20" className="f-warm" opacity={0.2 + stake * 0.2} /><path d="M330 118V72" className="s-deep" strokeWidth="4" /><path className="play-prop f-warm" d="M312 72h36l-8-18h-20z" />
    </>;
    case "none": return <>
      <ellipse cx="100" cy="190" rx="130" ry="30" className="f-ground" /><ellipse cx="290" cy="196" rx="150" ry="34" className="f-mid" opacity=".35" />
    </>;
  }
}

function band(stake: number): "low" | "mid" | "high" { return stake < 0.34 ? "low" : stake < 0.67 ? "mid" : "high"; }

export function Scene({ prop = "none", who, mood, beanSize = 136, bean, result, look, stake = 0, wall = true, children, className }: {
  prop?: Prop; who: Character; mood: Mood; beanSize?: number; look?: "fit";
  /** Replaces the plain bean (a mechanic's bean button). */
  bean?: ReactNode;
  /** The round's result, once there is one: the scene reacts (PLAY-PLAN.md §11). */
  result?: "hit" | "miss";
  /** 0 to 1, how far the round's stake has gone: one thing in the place changes with it. */
  stake?: number;
  /** The wall above the furniture; off where a mechanic puts its own thing in that band. */
  wall?: boolean;
  children?: ReactNode; className?: string;
}) {
  const t = SCENE_TINTS[prop];
  const clamped = Math.max(0, Math.min(1, stake));
  const style = { "--sc-sky": t.sky, "--sc-ground": t.ground, "--sc-deep": t.deep, "--sc-mid": t.mid, "--sc-light": t.light, "--sc-warm": t.warm, "--sc-accent": t.accent, background: t.sky } as CSSProperties;
  return (
    <div className={`play-scene${className ? ` ${className}` : ""}`} data-prop={prop} data-result={result} data-mood={mood} data-stake={band(clamped)} style={style}>
      <svg className="play-scene-art" viewBox="0 -250 360 450" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        {wall && WALLS[prop]}
        <PropArt prop={prop} stake={clamped} />
      </svg>
      <div className="play-scene-bean">{bean ?? <Bean who={who} mood={mood} size={beanSize} look={look} />}</div>
      {children}
    </div>
  );
}

/** A place without its bean or its reaction: the run's title card stands in its first world. */
export function PlaceArt({ prop }: { prop: Prop }) {
  const t = SCENE_TINTS[prop];
  const style = { "--sc-sky": t.sky, "--sc-ground": t.ground, "--sc-deep": t.deep, "--sc-mid": t.mid, "--sc-light": t.light, "--sc-warm": t.warm, "--sc-accent": t.accent, background: t.sky } as CSSProperties;
  return (
    <div className="play-place" data-place={prop} style={style} aria-hidden="true">
      <svg className="play-scene-art" viewBox="0 -250 360 450" preserveAspectRatio="xMidYMax meet">
        {WALLS[prop]}
        <PropArt prop={prop} stake={0} />
      </svg>
    </div>
  );
}
