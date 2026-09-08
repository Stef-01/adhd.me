"use client";

// The five characters (PRD §14–§15), drawn in the same geometric idiom as the learning scenes:
// rounded bodies, restrained faces, one simple object beside them. Each character has a shape and
// a colour that never change, a face that changes with mood, and a prop that sets the scene. The
// SVG is decorative — the text carries the meaning — and it is `aria-hidden` everywhere it is
// drawn, with the scene described in words beside it. Nothing here animates on its own; motion
// belongs to the player and stops under reduced motion.

import type { Character, Mood, Prop } from "@/learn/interactive";

const PALETTE: Record<Character, { body: string; ink: string; feet: string; shape: "pill" | "square" | "arch" | "round" | "tall" }> = {
  maya: { body: "#FF873C", ink: "#743518", feet: "#C65828", shape: "pill" },
  alex: { body: "#739DFF", ink: "#203D82", feet: "#4267BF", shape: "square" },
  jordan: { body: "#C2A3E0", ink: "#61407C", feet: "#8862A4", shape: "arch" },
  sam: { body: "#7BC8A4", ink: "#1F5C42", feet: "#3E8F68", shape: "round" },
  priya: { body: "#FFD340", ink: "#7A5A00", feet: "#C9A020", shape: "tall" },
};

function Body({ who }: { who: Character }) {
  const p = PALETTE[who];
  switch (p.shape) {
    case "pill": return <rect width="96" height="118" rx="48" fill={p.body} />;
    case "square": return <rect width="96" height="100" rx="26" fill={p.body} />;
    case "arch": return <path d="M0 48C0-17 96-17 96 48v52H0Z" fill={p.body} />;
    case "round": return <circle cx="48" cy="52" r="48" fill={p.body} />;
    case "tall": return <rect width="90" height="124" rx="34" fill={p.body} />;
  }
}

function Face({ who, mood }: { who: Character; mood: Mood }) {
  const ink = PALETTE[who].ink;
  const eyes = mood === "overwhelmed" || mood === "anxious"
    ? <><circle cx="31" cy="44" r="4" fill={ink} /><circle cx="65" cy="44" r="4" fill={ink} /></>
    : mood === "surprised"
      ? <><circle cx="31" cy="44" r="5.5" stroke={ink} strokeWidth="3" fill="none" /><circle cx="65" cy="44" r="5.5" stroke={ink} strokeWidth="3" fill="none" /></>
      : mood === "thinking"
        ? <><path d="M26 44q5-6 10 0" stroke={ink} strokeWidth="3.5" strokeLinecap="round" fill="none" /><circle cx="65" cy="44" r="3.5" fill={ink} /></>
        : <><path d="M27 44q5 8 10 0" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" /><path d="M60 44q5 8 10 0" stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" /></>;
  const brows = mood === "frustrated"
    ? <><path d="M25 33l12 4" stroke={ink} strokeWidth="3.5" strokeLinecap="round" /><path d="M71 33l-12 4" stroke={ink} strokeWidth="3.5" strokeLinecap="round" /></>
    : mood === "anxious" || mood === "overwhelmed" || mood === "embarrassed"
      ? <><path d="M25 36l12-3" stroke={ink} strokeWidth="3.5" strokeLinecap="round" /><path d="M71 36l-12-3" stroke={ink} strokeWidth="3.5" strokeLinecap="round" /></>
      : null;
  const mouth = (() => {
    switch (mood) {
      case "pleased": case "engaged": case "relieved": return "M34 64q14 14 28 0";
      case "frustrated": return "M36 70q12-10 24 0";
      case "anxious": case "embarrassed": return "M38 68q10 3 20 0";
      case "overwhelmed": return "M36 66q12-4 24 2";
      case "surprised": return "M43 66a5 6 0 1 0 10 0a5 6 0 1 0-10 0";
      case "thinking": return "M40 66h16";
      default: return "M38 65q10 6 20 0";
    }
  })();
  return <>
    {brows}
    {eyes}
    <path d={mouth} stroke={ink} strokeWidth="4" strokeLinecap="round" fill="none" />
    {mood === "embarrassed" && <><circle cx="24" cy="56" r="5" fill="#fff" fillOpacity=".55" /><circle cx="72" cy="56" r="5" fill="#fff" fillOpacity=".55" /></>}
  </>;
}

function PropArt({ prop }: { prop: Prop }) {
  switch (prop) {
    case "desk": return <g transform="translate(228 120)">
      <rect width="150" height="12" rx="6" fill="#fff" />
      <rect x="14" y="12" width="10" height="70" rx="4" fill="#E9DFD7" /><rect x="126" y="12" width="10" height="70" rx="4" fill="#E9DFD7" />
      <rect x="30" y="-58" width="90" height="58" rx="10" fill="#fff" /><rect x="40" y="-48" width="70" height="38" rx="6" fill="#DCE8F3" />
      <path d="M52-36h46M52-28h30" stroke="#A5B5D0" strokeWidth="4" strokeLinecap="round" />
    </g>;
    case "phone": return <g transform="translate(300 60)">
      <rect width="62" height="112" rx="14" fill="#fff" /><rect x="8" y="12" width="46" height="80" rx="8" fill="#DCE8F3" />
      <rect x="14" y="20" width="34" height="18" rx="6" fill="#FFD340" /><path d="M20 52h22M20 62h14" stroke="#A5B5D0" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 6q14 8 0 20M78-2q22 14 0 36" stroke="#FF873C" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>;
    case "bill": return <g transform="translate(280 70) rotate(6)">
      <rect width="100" height="128" rx="10" fill="#fff" /><path d="M16 22h68M16 40h48M16 58h60M16 76h30" stroke="#A5B5D0" strokeWidth="5" strokeLinecap="round" />
      <rect x="16" y="94" width="68" height="20" rx="6" fill="#FF873C" fillOpacity=".7" />
    </g>;
    case "ball": return <g transform="translate(300 150)">
      <circle cx="40" cy="40" r="40" fill="#fff" /><path d="M40 0v80M0 40h80M12 12q28 28 56 56M68 12q-28 28-56 56" stroke="#739DFF" strokeWidth="4" strokeLinecap="round" />
      <path d="M-50 110q60-30 140 0" stroke="#fff" strokeWidth="14" strokeLinecap="round" fill="none" />
    </g>;
    case "lecture": return <g transform="translate(220 40)">
      <rect width="180" height="110" rx="14" fill="#fff" /><path d="M20 28h140M20 50h100M20 72h120" stroke="#DCE8F3" strokeWidth="8" strokeLinecap="round" />
      <circle cx="150" cy="80" r="14" fill="#FFD340" />
    </g>;
    case "bed": return <g transform="translate(220 120)">
      <rect width="190" height="70" rx="16" fill="#fff" /><rect x="14" y="-24" width="60" height="34" rx="12" fill="#DCE8F3" />
      <rect y="30" width="190" height="40" rx="14" fill="#C2A3E0" fillOpacity=".8" />
      <circle cx="170" cy="-40" r="18" fill="#FFD340" /><path d="M155-52a18 18 0 0 0 26 26 22 22 0 1 1-26-26Z" fill="#F7EDE8" />
    </g>;
    case "kitchen": return <g transform="translate(224 60)">
      <rect width="176" height="130" rx="14" fill="#fff" /><rect x="14" y="14" width="60" height="50" rx="8" fill="#DCE8F3" /><rect x="100" y="14" width="60" height="50" rx="8" fill="#DCE8F3" />
      <rect x="14" y="84" width="146" height="10" rx="5" fill="#E9DFD7" /><ellipse cx="50" cy="106" rx="22" ry="9" fill="#FFD340" /><ellipse cx="110" cy="106" rx="16" ry="7" fill="#C2A3E0" />
    </g>;
    case "calendar": return <g transform="translate(250 50)">
      <rect width="140" height="130" rx="14" fill="#fff" /><rect width="140" height="30" rx="14" fill="#739DFF" />
      {Array.from({ length: 15 }, (_, i) => <rect key={i} x={14 + (i % 5) * 24} y={44 + Math.floor(i / 5) * 26} width="16" height="16" rx="4" fill={i === 13 ? "#FF873C" : "#DCE8F3"} />)}
    </g>;
    case "door": return <g transform="translate(290 40)">
      <rect width="96" height="200" rx="12" fill="#fff" /><rect x="12" y="12" width="72" height="176" rx="8" fill="#E9DFD7" /><circle cx="70" cy="104" r="6" fill="#743518" />
    </g>;
    default: return null;
  }
}

/** One character, one mood, one prop. `title` describes the scene for a screen reader when the art carries a state the text does not. */
export function CharacterScene({ who, mood, prop = "none", scale = 1 }: { who: Character; mood: Mood; prop?: Prop; scale?: number }) {
  const p = PALETTE[who];
  const height = p.shape === "tall" ? 124 : p.shape === "pill" ? 118 : 100;
  return (
    <svg viewBox="0 0 440 280" fill="none" aria-hidden="true" className="learning-scene character-scene" data-character={who} data-mood={mood}>
      <path d="M28 246c90-20 150 14 224 0s106-14 164-2" stroke="#fff" strokeWidth="24" strokeLinecap="round" />
      <PropArt prop={prop} />
      <g transform={`translate(${prop === "none" ? 172 : 80} ${248 - height * scale - 22}) scale(${scale})`}>
        <path d={`M27 ${height - 3}v22m43-22v22`} stroke={p.feet} strokeWidth="5" strokeLinecap="round" />
        <path d={mood === "overwhelmed" ? "M9 66-9 60m96 6 18-6" : mood === "pleased" || mood === "relieved" ? "M9 61-5 30m92 31 18-32" : "M7 63-7 78m94-15 15-9"} stroke={p.feet} strokeWidth="5" strokeLinecap="round" />
        <Body who={who} />
        <Face who={who} mood={mood} />
      </g>
    </svg>
  );
}

/** A small head-and-shoulders mark for a perspective card or a cast list. */
export function CharacterMark({ who, mood = "neutral" }: { who: Character; mood?: Mood }) {
  return (
    <svg viewBox="0 0 96 100" fill="none" aria-hidden="true" className="character-mark" data-character={who}>
      <Body who={who} />
      <Face who={who} mood={mood} />
    </svg>
  );
}
