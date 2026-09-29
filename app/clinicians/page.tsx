import type { Metadata } from "next";
import { seoMetadata } from "@/seo/pages";
import { demoEnabled } from "@/lib/demo-guard";
import { ClinicianWalkthrough } from "./clinician-walkthrough";

export const metadata: Metadata = seoMetadata("/clinicians");

export default function CliniciansPage() {
  return <ClinicianWalkthrough demo={demoEnabled()} />;
}
