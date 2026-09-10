import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { Toolkit } from "../../../lives/toolkit";

// ADHD Lives (PRD v2, docs/adhd-lives/PRD-v2.md; ADR 0006). §29, §80–§81: the Toolkit.
export const metadata: Metadata = {
  alternates: { canonical: "/lives/toolkit" },
  robots: ROBOTS_META,
  title: "My Toolkit, ADHD Lives",
  description: "The practical strategies you decided were worth trying, as you set them up, on this device.",
};

export default function Page() {
  return <main id="main-content" className="app-page-with-tabs"><Toolkit /></main>;
}
