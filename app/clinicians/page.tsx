import type { Metadata } from "next";
import { ClinicianWalkthrough } from "./clinician-walkthrough";

export const metadata: Metadata = {
  alternates: { canonical: "/clinicians" },
  title: "For GPs",
  description: "A walkthrough for clinicians: how listing works, what you declare, and how a patient reaches you.",
};

export default function CliniciansPage() {
  return <ClinicianWalkthrough />;
}
