"use client";

// The five characters (PRD §14–§15), drawn in the same geometric idiom as the learning scenes:
// rounded bodies, restrained faces, one simple object beside them. Each character has a shape and
// a colour that never change, a face that changes with mood, and a prop that sets the scene. The
// SVG is decorative — the text carries the meaning — and it is `aria-hidden` everywhere it is
// drawn, with the scene described in words beside it. Nothing here animates on its own; motion
// belongs to the player and stops under reduced motion.

import type { Character, Mood } from "@/learn/interactive";

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


/** A small head-and-shoulders mark for a perspective card or a cast list. */
export function CharacterMark({ who, mood = "neutral" }: { who: Character; mood?: Mood }) {
  return (
    <svg viewBox="0 0 96 100" fill="none" aria-hidden="true" className="character-mark" data-character={who}>
      <Body who={who} />
      <Face who={who} mood={mood} />
    </svg>
  );
}
