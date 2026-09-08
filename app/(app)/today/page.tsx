import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { Today } from "../../today";

// Today (PRD §6): the single most useful next action, from what this device holds.
export const metadata: Metadata = {
  alternates: { canonical: "/today" },
  robots: ROBOTS_META,
  title: "Today",
  description: "The single most useful next thing for you today — a module, something to try, or a question about how the last thing went.",
};

export default function TodayPage() {
  return <Today />;
}
