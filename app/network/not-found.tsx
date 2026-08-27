// O192 round 8: the 404 a reader gets when they ask for a GP the network does not hold.
//
// THE GAP THIS CLOSES, found by looking at the page rather than at the test. `network.spec.ts`
// asserts that an unknown clinician returns a 404 status, and it does — but the status was all
// anybody had checked. The page a reader actually met was the SITE 404, which offers "Find a GP"
// and "Start from the beginning" and cannot offer the one thing they were reaching for. Somebody
// following a stale link to a doctor was told the link was dead and then pointed away from the
// network entirely.
//
// Next renders the nearest `not-found` boundary, so a file at this segment catches `notFound()`
// from `/network/[clinician]` while every other dead link on the site keeps the site page. The
// copy keeps that page's manners — plain sentence, nothing blamed on the reader — and changes
// only what it can now say: which list this was, and that the list is one click away.
//
// It deliberately does NOT name or guess a clinician. A 404 that said "did you mean Dr X?" would
// be this product recommending a named doctor to somebody who did not describe anything, which is
// the finder's job and only ever on what a reader asked for.
import Link from "next/link";
import type { Metadata } from "next";
import { NETWORK_CLINICIANS, networkSizeInWords } from "@/network/gallery";

export const metadata: Metadata = {
  title: "Not in the network",
  description: "That GP is not in the ADHD.ME network. Read the GPs who are, or describe what you are looking for.",
};

export default function NetworkNotFound() {
  return (
    <main id="main-content" className="notfound-screen">
      <p className="notfound-code" aria-hidden="true">404</p>
      <h1>That GP is not in the network.</h1>
      <p className="notfound-copy">
        The link may be old, or the doctor may never have been listed here. Nothing you did was
        wrong. {networkSizeInWords()[0]!.toUpperCase()}
        {networkSizeInWords().slice(1)} GP{NETWORK_CLINICIANS.length === 1 ? " is" : "s are"} in the
        network today, and you can read {NETWORK_CLINICIANS.length === 1 ? "them" : "all of them"} in
        their own words.
      </p>
      <div className="notfound-doors">
        <Link className="notfound-primary" href="/network">The network</Link>
        <Link className="notfound-secondary" href="/finder">Describe what you need</Link>
      </div>
    </main>
  );
}
