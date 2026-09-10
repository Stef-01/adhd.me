import type { Metadata } from "next";
import { LeoPractice } from "../../../../lives/leo-practice";
import { ROBOTS_META } from "@/security/robots";

export const metadata: Metadata = {
  title: "Leo and the mosquito, ADHD Lives",
  description: "Catch the mosquito and let Leo sleep. One replayable moment, with an untimed option.",
  alternates: { canonical: "/lives/play/leo-mosquito" },
  robots: ROBOTS_META,
};

export default function Page() {
  return <main id="main-content"><LeoPractice /></main>;
}
