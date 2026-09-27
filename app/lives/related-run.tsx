"use client";

// A character game's end screen leads to the run on the same subject: its short title, one link.
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { relatedRun } from "@/learn/games";
import type { CharacterId } from "@/lives/types";

export function RelatedRun({ who, className, arrow = 18 }: { who: CharacterId; className?: string; arrow?: number }) {
  const run = relatedRun(who);
  if (!run) return null;
  return <Link className={className} href={`/approach?module=${encodeURIComponent(run.id)}`}>{run.title} <ArrowRight size={arrow} aria-hidden="true" /></Link>;
}
