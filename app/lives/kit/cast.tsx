"use client";
import type { Mood } from "@/learn/interactive";
import type { CharacterId } from "@/lives";
import { BeanArt } from "../../play/beans";
import { LifeBean } from "../bean";

/** Supporting cast drawn by the same bean as the eight lives; colours match their v2 rigs. */
const SUPPORT = {
  noor: { body: "#8CBFAF", ink: "#244C43", shape: "M60 8c28 0 46 26 46 60s-18 56-46 56S14 102 14 68 32 8 60 8Z" },
  rae: { body: "#DEAAA8", ink: "#744542", shape: "M60 10c32 0 50 22 50 56s-18 58-50 58S10 100 10 66 28 10 60 10Z" },
  sam: { body: "#7BC8A4", ink: "#1F5C42", shape: "M60 6c30 0 48 28 48 62s-18 56-48 56S12 102 12 68 30 6 60 6Z" },
  ari: { body: "#F2A65A", ink: "#6B3A10", shape: "M60 8c32 0 50 24 50 58s-18 58-50 58S10 100 10 66 28 8 60 8Z" },
} as const;
export type CastId = CharacterId | keyof typeof SUPPORT;

export function CastBean({ who, mood = "neutral", size = 96, className }: { who: CastId; mood?: Mood; size?: number; className?: string }) {
  if (who in SUPPORT) { const p = SUPPORT[who as keyof typeof SUPPORT]; return <BeanArt id={who} shape={p.shape} body={p.body} ink={p.ink} mood={mood} size={size} className={className} />; }
  return <LifeBean who={who as CharacterId} mood={mood} size={size} className={className} />;
}
