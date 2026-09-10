import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { MatchResults } from "../../../match/results";

// Phase M (ADR 0007): Your matches.
export const metadata: Metadata = {
  alternates: { canonical: "/match/results" },
  robots: ROBOTS_META,
  title: "Your matches",
  description: "Up to three GPs with a reason each, and where each request stands on their side.",
};

export default function Page() {
  return <MatchResults />;
}
