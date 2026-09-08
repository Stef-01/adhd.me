import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { Onboarding } from "../../onboarding";

// The ADHD Life onboarding (PRD §8–§10). Device state only; nothing here for a crawler to read.
export const metadata: Metadata = {
  alternates: { canonical: "/start" },
  robots: ROBOTS_META,
  title: "Start",
  description: "Ten short questions so the app can suggest where to begin. Nothing is scored, and everything stays on your device.",
};

export default function StartPage() {
  return <Onboarding />;
}
