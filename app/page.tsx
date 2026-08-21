import type { Metadata } from "next";
import { StoryLanding } from "./story-landing";

// O167, founder-directed: "remove all mentions of founder on entire site do thorough code audit".
//
// THIS IS THE HALF MY OWN SWEEP COULD NOT SEE, and that is the finding worth recording. The
// site-wide guard in `guidelines-sweep.spec.ts` read `document.body.innerText`, so it swept every
// rendered sentence and structurally could not reach the two strings below — a `<title>` lives in
// the head, and a description renders in a search result and a shared link rather than on the
// page. Both said "Why we founded ADHD.ME". A reader meets the title in their tab before they meet
// a word of the body.
//
// Same shape as this session's register findings: the check ran in the direction its author was
// facing. The sweep now reads the head as well, so the next one cannot hide here.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Why we built ADHD.ME",
  description:
    "Why we built ADHD.ME: getting assessed for ADHD in Australia is a test of stamina rather than of need, and the front door was built for somebody with more resources than most people have.",
};

export default function Home() {
  return <StoryLanding />;
}
