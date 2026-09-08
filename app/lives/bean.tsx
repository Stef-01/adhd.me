"use client";

// The eight lives (PRD v2 §47) drawn as beans, in the style the five beans already have: one
// body, dot eyes, a mouth, two feet. Maya is the same person as the existing bean and keeps her
// colour. Decorative — every game says its state in words — and `aria-hidden` throughout.

import type { Mood } from "@/learn/interactive";
import type { CharacterId } from "@/lives/types";
import { BeanArt } from "../play/beans";

const LIVES: Record<CharacterId, { body: string; ink: string; shape: string }> = {
  maya: { body: "#FF873C", ink: "#743518", shape: "M60 8c30 0 48 24 48 58s-18 58-48 58S12 100 12 66 30 8 60 8Z" },
  leo: { body: "#8FB8FF", ink: "#1F3F86", shape: "M60 12c32 0 50 22 50 54s-18 60-50 60S10 98 10 66 28 12 60 12Z" },
  arjun: { body: "#5FC8B0", ink: "#155947", shape: "M60 6c30 0 50 28 50 62 0 32-20 56-50 56S10 100 10 68C10 34 30 6 60 6Z" },
  zoe: { body: "#FF6F91", ink: "#7A1F3A", shape: "M60 4c28 0 46 30 46 66s-16 54-46 54S14 106 14 70 32 4 60 4Z" },
  theo: { body: "#C9B26B", ink: "#5B4A12", shape: "M60 10c34 0 52 22 52 56s-18 58-52 58S8 100 8 66 26 10 60 10Z" },
  mia: { body: "#C2A3E0", ink: "#4E2E70", shape: "M60 8c26 0 48 26 48 62s-22 54-48 54S12 106 12 70 34 8 60 8Z" },
  jax: { body: "#FFB347", ink: "#7A4A00", shape: "M60 6c32 0 54 26 54 60s-22 58-54 58S6 100 6 66 28 6 60 6Z" },
  nina: { body: "#7BC8A4", ink: "#1F5C42", shape: "M60 10c30 0 46 26 46 62s-16 52-46 52S14 108 14 72 30 10 60 10Z" },
};

export function LifeBean({ who, mood = "neutral", size = 120, className }: { who: CharacterId; mood?: Mood; size?: number; className?: string }) {
  const c = LIVES[who];
  return <BeanArt id={who} shape={c.shape} body={c.body} ink={c.ink} mood={mood} size={size} className={className} />;
}

/** The stage tint behind each life; "random" games take the neutral one. */
export const LIFE_TINTS: Record<CharacterId | "random", string> = {
  maya: "#fbe6d8", leo: "#e3ecfb", arjun: "#dcf1ea", zoe: "#fde1e7", theo: "#f3ead9", mia: "#e9e2f7", jax: "#fdebd3", nina: "#dff0e6", random: "#ebe6f2",
};
