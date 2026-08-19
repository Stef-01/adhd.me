import type { Metadata } from "next";
import { CareFinder } from "../care-finder";

export const metadata: Metadata = {
  alternates: { canonical: "/finder" },
  title: "Early clinician finder demo",
  description: "A synthetic demonstration of matching people to GPs who do ADHD assessment, on language, care area and access.",
};

export default function FinderPage() {
  return <CareFinder />;
}
