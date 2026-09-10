import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { LivesLab } from "../../../lives/lab";

// ADHD Lives (PRD v2, docs/adhd-lives/PRD-v2.md; ADR 0006). §106–§107: the lab.
export const metadata: Metadata = {
  alternates: { canonical: "/lives/lab" },
  robots: ROBOTS_META,
  title: "The lab, ADHD Lives",
  description: "The recommendation debugger and the session director's log: why the engine suggested what it did, and why the director picked what it picked.",
};

export default function Page() {
  return <main id="main-content" className="app-page-with-tabs"><LivesLab /></main>;
}
