import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { Suspense } from "react";
import { LivesPlay } from "../../../lives/play";

// ADHD Lives (PRD v2, docs/adhd-lives/PRD-v2.md; ADR 0006). §4, §44: the Chaos Run.
export const metadata: Metadata = {
  alternates: { canonical: "/lives/play" },
  robots: ROBOTS_META,
  title: "Play, ADHD Lives",
  description: "The Chaos Run: microgames from eight lives, three lives of yours, faster every four, and a score at the end.",
};

export default function Page() {
  return <main id="main-content" className="me-screen learn-screen"><Suspense fallback={<p role="status">Loading the run…</p>}><LivesPlay /></Suspense></main>;
}
