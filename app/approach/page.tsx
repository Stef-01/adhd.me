import type { Metadata } from "next";
import Link from "next/link";
import { AppSettings } from "../app-settings";
import { AppTabs } from "../app-tabs";
import { LearnModules } from "../learn-modules";

// O239 (founder-directed): the Learn tab is a learning-module section — three short modules a
// person finishes one card at a time, finished ones remembered on this device. The eight-scene
// scroll sequence that lived here (and on the front page before O230) became the modules' cards,
// word for word (`src/learn/scenes.ts`): the argument is the same, the reading is in the
// person's hands rather than the scroll position's, and the page is the app's own shell — the
// same header, width and gutter as the finder and the profile — instead of a story chrome.
export const metadata: Metadata = {
  alternates: { canonical: "/approach" },
  title: "Learn",
  description:
    "Three short modules: why the search returns no GP, what the old route through assessment cost, " +
    "and what changed in NSW and Queensland.",
};

export default function ApproachPage() {
  return (
    <main id="main-content" className="me-screen learn-screen app-page-with-tabs">
      <div className="minimal-header has-settings me-chrome">
        <Link className="wordmark finder-wordmark" href="/" aria-label="ADHD.ME, back to the finder" translate="no">ADHD.ME</Link>
        <AppSettings />
      </div>
      <header className="me-head learn-head">
        <p className="learn-eyebrow">Learn</p>
        <h1>What finding ADHD care actually looks like, and what we changed.</h1>
        <p>A few minutes each. Read one now, come back for the rest.</p>
      </header>
      <LearnModules />
      <AppTabs />
    </main>
  );
}
