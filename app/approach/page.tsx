import type { Metadata } from "next";
import { seoMetadata } from "@/seo/pages";
import Link from "next/link";
import { AppSettings } from "../app-settings";
import { AppTabs } from "../app-tabs";
import { LearnModules } from "../learn-modules";

// O239 (founder-directed): the Learn tab is a learning-module section. O244 (founder-directed):
// what it teaches is ADHD itself — what the word means, what people find useful day to day,
// two knowledge quizzes — and then the route to care (the story's three modules). The page is
// the app's own shell; the copy is data (`src/learn/scenes.ts`), linted like every patient
// surface; finishing is remembered on this device and nothing else is.
//
// O241: the head comes from `src/seo/pages.ts` like every other indexable route's, and O244's
// rewrite moved the register entry with the page — which is the merge this file records. The
// description O244 wrote is the one in the register now, inside the window and keyword-led.
export const metadata: Metadata = seoMetadata("/approach");

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
