"use client";

// The eight lives as beans (PRD §47, §91–§92), drawn by the same `BeanArt` the five beans use:
// one rounded body, two eyes, a mouth, two feet, a colour that never changes and a face that
// does. Maya is the same person as the existing bean and keeps her colour. Decorative everywhere
// it is drawn — every screen says its state in words — so `aria-hidden` always.

import type { Mood } from "@/learn/interactive";
import type { CharacterId } from "@/lives";
import { BeanArt } from "../play/beans";

export type LifeMood = Mood;

const PALETTE: Record<CharacterId, { body: string; ink: string; shape: string }> = {
  maya: { body: "#FF873C", ink: "#743518", shape: "M60 8c30 0 48 24 48 58s-18 58-48 58S12 100 12 66 30 8 60 8Z" },
  leo: { body: "#B5D33D", ink: "#465A08", shape: "M60 10c34 0 50 20 50 54s-16 60-50 60S10 98 10 64 26 10 60 10Z" },
  arjun: { body: "#6C8CFF", ink: "#1E3A8A", shape: "M60 4c26 0 44 30 44 66s-18 54-44 54S16 106 16 70 34 4 60 4Z" },
  zoe: { body: "#FF7EB6", ink: "#7A2450", shape: "M60 6c28 0 52 30 52 64 0 30-22 54-52 54S8 100 8 70C8 36 32 6 60 6Z" },
  theo: { body: "#4FC3C9", ink: "#0F5559", shape: "M60 12c32 0 54 24 54 56s-22 56-54 56S6 100 6 68s22-56 54-56Z" },
  mia: { body: "#C2A3E0", ink: "#61407C", shape: "M60 6c30 0 50 26 50 62 0 32-20 56-50 56S10 100 10 68 30 6 60 6Z" },
  jax: { body: "#FF5E57", ink: "#7A1F1B", shape: "M60 10c36 0 52 26 52 56s-16 58-52 58S8 96 8 66 24 10 60 10Z" },
  nina: { body: "#FFD340", ink: "#7A5A00", shape: "M60 4c24 0 46 28 46 66s-22 54-46 54S14 108 14 70 36 4 60 4Z" },
};

export function LifeBean({ who, mood = "neutral", size = 120, className }: { who: CharacterId; mood?: LifeMood; size?: number; className?: string }) {
  const p = PALETTE[who];
  return <BeanArt id={who} shape={p.shape} body={p.body} ink={p.ink} mood={mood} size={size} className={className ? `lives-bean ${className}` : "lives-bean"} />;
}

export function beanColour(who: CharacterId): string { return PALETTE[who].body; }
