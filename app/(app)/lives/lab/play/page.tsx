import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { Suspense } from "react";
import { LivesLabPlay } from "../../../../lives/play";

// ADHD Lives (PRD v2, docs/adhd-lives/PRD-v2.md; ADR 0006). §106–§107: the lab, one game at a time.
export const metadata: Metadata = {
  alternates: { canonical: "/lives/lab/play" },
  robots: ROBOTS_META,
  title: "One game, ADHD Lives lab",
  description: "The Chaos Run with a single game in its pool, so each game can be played and reviewed on its own.",
};

export default function Page() {
  return <main id="main-content" className="me-screen learn-screen"><Suspense fallback={<p role="status">Loading the run…</p>}><LivesLabPlay /></Suspense></main>;
}
