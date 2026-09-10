import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { MyManual } from "../../manual";

// My Manual (PRD §27): three sections the person writes about themselves, on this device only.
export const metadata: Metadata = {
  alternates: { canonical: "/manual" },
  robots: ROBOTS_META,
  title: "My Manual",
  description: "What helps you, what makes things harder, and how to work with you, in your own words, editable, never written for you.",
};

export default function ManualPage() {
  return <MyManual />;
}
