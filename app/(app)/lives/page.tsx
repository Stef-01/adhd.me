import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { LivesHome } from "../../lives/lives-home";

// ADHD Lives (PRD v2, ADR 0006): the Chaos Run — eight lives, three hearts, a score. The Learn
// tab claims it; the learning that follows a run is Phase L3.
export const metadata: Metadata = {
  alternates: { canonical: "/lives" },
  robots: ROBOTS_META,
  title: "Chaos Run",
  description: "Fast little games from the lives of eight characters. Three lives, a score, and nothing to get right about yourself.",
};

export default function LivesPage() {
  return <LivesHome />;
}
