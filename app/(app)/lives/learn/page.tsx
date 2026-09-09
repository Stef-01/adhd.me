import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { Suspense } from "react";
import { LearnHome } from "../../../lives/learn-home";

// ADHD Lives (PRD v2, docs/adhd-lives/PRD-v2.md; ADR 0006). §28: Learn home; ?module= opens the renderer (§25).
export const metadata: Metadata = {
  alternates: { canonical: "/lives/learn" },
  robots: ROBOTS_META,
  title: "Learn — ADHD Lives",
  description: "Sixteen practical strategies, two to five minutes each, opened from a moment that looked familiar or from here.",
};

export default function Page() {
  return <main id="main-content" className="app-page-with-tabs"><Suspense fallback={<p role="status">Loading…</p>}><LearnHome /></Suspense></main>;
}
