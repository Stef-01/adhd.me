"use client";

// The beans: the five characters as they play (PLAY-PLAN.md §4). One rounded body, two dot eyes,
// a mouth, two feet; big; the same colours the characters already have. Decorative — every round
// says its state in words — and `aria-hidden` everywhere it is drawn.

import type { Character, Mood } from "@/learn/interactive";

const PALETTE: Record<Character, { body: string; ink: string }> = {
  maya: { body: "#FF873C", ink: "#743518" },
  alex: { body: "#739DFF", ink: "#203D82" },
  jordan: { body: "#C2A3E0", ink: "#61407C" },
  sam: { body: "#7BC8A4", ink: "#1F5C42" },
  priya: { body: "#FFD340", ink: "#7A5A00" },
};

const SHAPES: Record<Character, string> = {
  maya: "M60 8c30 0 48 24 48 58s-18 58-48 58S12 100 12 66 30 8 60 8Z",
  alex: "M60 10c34 0 50 20 50 54s-16 60-50 60S10 98 10 64 26 10 60 10Z",
  jordan: "M60 6c28 0 52 30 52 64 0 30-22 54-52 54S8 100 8 70C8 36 32 6 60 6Z",
  sam: "M60 12c32 0 54 24 54 56s-22 56-54 56S6 100 6 68s22-56 54-56Z",
  priya: "M60 4c26 0 44 30 44 66s-18 54-44 54S16 106 16 70 34 4 60 4Z",
};

export function Bean({ who, mood = "neutral", size = 120, className }: { who: Character; mood?: Mood; size?: number; className?: string }) {
  const p = PALETTE[who];
  const eyes = mood === "surprised" || mood === "overwhelmed"
    ? <><circle cx="44" cy="58" r="7" fill={p.ink} /><circle cx="76" cy="58" r="7" fill={p.ink} /><circle cx="46" cy="56" r="2.5" fill="#fff" /><circle cx="78" cy="56" r="2.5" fill="#fff" /></>
    : mood === "pleased" || mood === "relieved" || mood === "engaged"
      ? <><path d="M38 58q6-8 12 0" stroke={p.ink} strokeWidth="5" strokeLinecap="round" fill="none" /><path d="M70 58q6-8 12 0" stroke={p.ink} strokeWidth="5" strokeLinecap="round" fill="none" /></>
      : <><circle cx="44" cy="58" r="5" fill={p.ink} /><circle cx="76" cy="58" r="5" fill={p.ink} /></>;
  const brows = mood === "frustrated" ? <><path d="M34 44l16 5" stroke={p.ink} strokeWidth="4" strokeLinecap="round" /><path d="M86 44l-16 5" stroke={p.ink} strokeWidth="4" strokeLinecap="round" /></>
    : mood === "anxious" || mood === "embarrassed" || mood === "overwhelmed" ? <><path d="M34 48l16-4" stroke={p.ink} strokeWidth="4" strokeLinecap="round" /><path d="M86 48l-16-4" stroke={p.ink} strokeWidth="4" strokeLinecap="round" /></> : null;
  const mouth = mood === "pleased" || mood === "engaged" || mood === "relieved" ? "M44 80q16 16 32 0" : mood === "frustrated" ? "M46 88q14-12 28 0" : mood === "anxious" || mood === "embarrassed" ? "M48 84q12 4 24 0" : mood === "overwhelmed" ? "M46 82q14-6 28 2" : mood === "surprised" ? "M52 84a8 9 0 1 0 16 0a8 9 0 1 0-16 0" : mood === "thinking" ? "M50 84h20" : "M48 82q12 8 24 0";
  return (
    <svg viewBox="0 0 120 136" width={size} height={size * 136 / 120} aria-hidden="true" className={className ? `bean ${className}` : "bean"} data-bean={who} data-mood={mood}>
      <path d="M44 122v10M76 122v10" stroke={p.ink} strokeWidth="6" strokeLinecap="round" />
      <path d={SHAPES[who]} fill={p.body} />
      {brows}
      {eyes}
      <path d={mouth} stroke={p.ink} strokeWidth="5" strokeLinecap="round" fill="none" />
      {mood === "embarrassed" && <><circle cx="30" cy="72" r="6" fill="#fff" fillOpacity=".5" /><circle cx="90" cy="72" r="6" fill="#fff" fillOpacity=".5" /></>}
    </svg>
  );
}
