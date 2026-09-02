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

/**
 * U8: `place` is the one thing the URL carries (src/finder/state.ts, home 1), and it is read on
 * the client at arrival, not from `searchParams` here. This page stays static on purpose: a page
 * that reads the query keys its segment on it, and once the place has been edited the history
 * entries behind the person carry the old key — a reload and then Back had Next patch the page
 * from the server and drop the finder's stamp from the entry. One key for every query keeps
 * every entry walkable. (`next dev` renders every request on demand and still keys on the query,
 * so that one path shows there; the built route — what ships and what the e2e gate runs — does
 * not.) Nothing else is in an address: the request never travels in one.
 */
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
