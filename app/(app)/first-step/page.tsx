import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { FirstStep } from "../../first-step";

// The triage layer's fourth part (Charmaine Bernie, 2026-09-11): the questions that separate
// pathways, asked before any list is shown. Two taps, never more — src/support/pathway.ts.
export const metadata: Metadata = {
  alternates: { canonical: "/first-step" },
  robots: ROBOTS_META,
  title: "First step",
  description: "Two questions — who the care is for, and where you are up to — and the kind of professional that goes through, with the thing to ask them for.",
};

export default function FirstStepPage() {
  return <FirstStep />;
}
