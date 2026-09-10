import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { SupportPath } from "../../support-path";

// The support path (PRD §37): from an identified problem to the kind of person who helps with it.
export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  robots: ROBOTS_META,
  title: "Support",
  description: "From the problem to the person: what may help, what to try yourself, when another person helps, and which professions fit, with the reason for each.",
};

export default function SupportPage() {
  return <SupportPath />;
}
