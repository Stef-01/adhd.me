import type { Metadata } from "next";
import { Suspense } from "react";
import { ROBOTS_META } from "@/security/robots";
import { TopicSurveyScreen } from "../../topic-survey";

// A topic survey (PRD §22): `?id=work-study` and the other four. Device state only.
export const metadata: Metadata = {
  alternates: { canonical: "/survey" },
  robots: ROBOTS_META,
  title: "Survey",
  description: "Eight to twelve questions on one part of life with ADHD, answered in two to four minutes, producing a pattern, never a score.",
};

export default function SurveyPage() {
  return <Suspense fallback={<p role="status">Loading…</p>}><TopicSurveyScreen /></Suspense>;
}
