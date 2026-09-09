import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { LivesHome } from "../../lives/home";

// ADHD Lives (PRD v2, docs/adhd-lives/PRD-v2.md; ADR 0006). §82: home is a large PLAY and one line.
export const metadata: Metadata = {
  alternates: { canonical: "/lives" },
  robots: ROBOTS_META,
  title: "ADHD Lives",
  description: "A fast cartoon microgame about eight lives with ADHD. Play first; anything useful comes after, and only if a moment looked familiar.",
};

export default function Page() {
  return <main id="main-content" className="app-page-with-tabs"><LivesHome /></main>;
}
