import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { MedicationExperience } from "../../medication";

// Medication experience (PRD §47): described in the person's own words, on this device, never advised on.
export const metadata: Metadata = {
  alternates: { canonical: "/medication" },
  robots: ROBOTS_META,
  title: "Medication",
  description: "What medication seems to change for you, what it leaves untouched and anything unwanted, a note in your own words to take to whoever manages it.",
};

export default function MedicationPage() {
  return <MedicationExperience />;
}
