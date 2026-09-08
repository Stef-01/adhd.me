import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { Adjustments } from "../../adjustments";

// Institutional navigation (PRD §45): what a university or a workplace can put on paper, and who to ask.
export const metadata: Metadata = {
  alternates: { canonical: "/adjustments" },
  robots: ROBOTS_META,
  title: "Adjustments on paper",
  description: "The study and workplace adjustments most people with ADHD are never told exist, who grants them, and what to bring when you ask.",
};

export default function AdjustmentsPage() {
  return <Adjustments />;
}
