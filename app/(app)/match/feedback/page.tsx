import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { MatchFeedback } from "../../../match/feedback";

// Phase M (ADR 0007): How did it go?.
export const metadata: Metadata = {
  alternates: { canonical: "/match/feedback" },
  robots: ROBOTS_META,
  title: "How did it go?",
  description: "Three questions about the fit after a first appointment.",
};

export default function Page() {
  return <MatchFeedback />;
}
