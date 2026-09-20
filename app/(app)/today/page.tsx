import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { TodayScreen } from "../../today-screen";

// Today (PRD §6): the single most useful next action, on its own screen again.
export const metadata: Metadata = {
  alternates: { canonical: "/today" },
  robots: ROBOTS_META,
  title: "Today",
  description: "One thing to understand or try next, chosen from what this device already holds.",
};

export default function TodayPage() {
  return <TodayScreen />;
}
