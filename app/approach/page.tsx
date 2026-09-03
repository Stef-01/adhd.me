import type { Metadata } from "next";
import Link from "next/link";
import { AppSettings } from "../app-settings";
import { AppTabs } from "../app-tabs";
import { LearnModules } from "../learn-modules";

// O239 (founder-directed): the Learn tab is a learning-module section. O244 (founder-directed):
// what it teaches is ADHD itself — what the word means, what people find useful day to day,
// two knowledge quizzes — and then the route to care (the story's three modules). The page is
// the app's own shell; the copy is data (`src/learn/scenes.ts`), linted like every patient
// surface; finishing is remembered on this device and nothing else is.
export const metadata: Metadata = {
  alternates: { canonical: "/approach" },
  title: "Learn",
  description:
    "Short reads and quick quizzes about ADHD: what the word means, what people find useful day " +
    "to day, and how the route to a GP assessment works in NSW and Queensland.",
};

export default function ApproachPage() {
  return (
    <main id="main-content" className="me-screen learn-screen app-page-with-tabs">
      <div className="minimal-header has-settings me-chrome">
        <Link className="wordmark finder-wordmark" href="/" aria-label="ADHD.ME, back to the finder" translate="no">ADHD.ME</Link>
        <AppSettings />
      </div>
      {/* The page's one heading — the working-truth sentence this route has carried since it existed.
          Visually it is the small line under the field; the field's own title leads the eye. */}
      <h1 className="learn-thesis">What finding ADHD care actually looks like, and what we changed.</h1>
      <LearnModules />
      <AppTabs />
    </main>
  );
}
