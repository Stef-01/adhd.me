import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { LivesCharacters } from "../../../lives/characters";

// ADHD Lives (PRD v2, docs/adhd-lives/PRD-v2.md; ADR 0006). §41: character stories as the bridge to learning.
export const metadata: Metadata = {
  alternates: { canonical: "/lives/characters" },
  robots: ROBOTS_META,
  title: "The eight lives, ADHD Lives",
  description: "Maya, Leo, Arjun, Zoe, Theo, Mia, Jax and Nina: who they are, the pattern each lives, and what each is trying.",
};

export default function Page() {
  return <main id="main-content" className="app-page-with-tabs"><LivesCharacters /></main>;
}
