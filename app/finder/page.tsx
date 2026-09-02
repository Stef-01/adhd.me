import type { Metadata } from "next";
import { HIDDEN_ROBOTS_META } from "@/security/robots";
import { CareFinder } from "../care-finder";

// U7: hidden from crawlers — this deployment is for testing and the roster defaults to example
// profiles. The register in src/security/robots.ts says why; reversing it is a founder gate.
export const metadata: Metadata = {
  alternates: { canonical: "/finder" },
  robots: HIDDEN_ROBOTS_META,
  title: "Early clinician finder demo",
  description: "A synthetic demonstration of matching people to GPs who do ADHD assessment, on language, care area and access.",
};

export default function FinderPage() {
  return (
    <>
      <CareFinder />
      {/*
        O192: the way back out to `/network`. Rendered beside the finder rather than inside it,
        because the finder is a stage machine that owns its own screen and a persistent chrome
        element is not one of its stages — the same reason the privacy bar lives outside it.
      */}
    </>
  );
}
