import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { MatchPrep } from "../../../match/prep";

// Phase M (ADR 0007): Before the first appointment.
export const metadata: Metadata = {
  alternates: { canonical: "/match/prep" },
  robots: ROBOTS_META,
  title: "Before the first appointment",
  description: "What to bring, the symptom timeline, and what to expect at a first appointment.",
};

export default function Page() {
  return <MatchPrep />;
}
