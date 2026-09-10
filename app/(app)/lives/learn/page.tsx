import type { Metadata } from "next";
import { Suspense } from "react";
import { ROBOTS_META } from "@/security/robots";
import { LearnHome } from "../../../lives/learn-home";

export const metadata: Metadata = {
  alternates: { canonical: "/lives/learn" },
  robots: ROBOTS_META,
  title: "Learn, ADHD Lives",
  description: "Sixteen practical strategies, two to five minutes each.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ module?: string }> }) {
  // Without ?module the config redirect in next.config.ts has already sent the reader to Learn.
  await searchParams;
  return <main id="main-content" className="app-page-with-tabs"><Suspense fallback={<p role="status">Loading…</p>}><LearnHome /></Suspense></main>;
}
