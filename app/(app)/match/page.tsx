import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { MatchIntake } from "../../match/intake";

// Phase M (ADR 0007): Find a GP.
export const metadata: Metadata = {
  alternates: { canonical: "/match" },
  robots: ROBOTS_META,
  title: "Find a GP",
  description: "Say what you are looking for, in your own words, and get three GPs back with a reason each.",
};

export default function Page() {
  return <MatchIntake />;
}
