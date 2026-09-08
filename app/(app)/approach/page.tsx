import type { Metadata } from "next";
import { Suspense } from "react";
import { seoMetadata } from "@/seo/pages";
import Link from "next/link";
import { MapTrifold } from "@phosphor-icons/react/dist/ssr";
import { AppSettings } from "../../app-settings";
import { LearnModules } from "../../learn-modules";

// O239 (founder-directed): the Learn tab is a learning-module section. O244 (founder-directed):
// what it teaches is ADHD itself — what the word means, what people find useful day to day,
// two knowledge quizzes — and then the route to care (the story's three modules). The page is
// the app's own shell; the copy is data (`src/learn/scenes.ts`), linted like every patient
// surface; finishing is remembered on this device and nothing else is.
//
// 2026-09-08 (founder-directed, the ADHD Life PRD): the fifteen interactive modules join the
// list, shelved by life domain, and the care map — the eco-bio-psychosocial model as a screen —
// is one tap away behind the map icon in the header (`/approach/map`).
//
// O241: the head comes from `src/seo/pages.ts` like every other indexable route's, and O244's
// rewrite moved the register entry with the page — which is the merge this file records. The
// description O244 wrote is the one in the register now, inside the window and keyword-led.
export const metadata: Metadata = seoMetadata("/approach");

export default function ApproachPage() {
  return (
    <main id="main-content" className="me-screen learn-screen app-page-with-tabs">
      <div className="minimal-header has-settings me-chrome learn-chrome">
        <Link className="wordmark finder-wordmark" href="/" aria-label="ADHD.ME, back to the finder" translate="no">ADHD.ME</Link>
        <Link className="map-trigger" href="/approach/map" aria-label="Open the care map">
          <MapTrifold size={21} weight="regular" aria-hidden="true" />
        </Link>
        <AppSettings />
      </div>
      {/* The page's one heading — the working-truth sentence this route has carried since it existed.
          Visually it is the small line under the field; the field's own title leads the eye. */}
      <h1 className="learn-thesis">A little more understanding.</h1>
      <p className="learning-intro">Short reads, quick quizzes, and interactive modules that learn what matters to you — on your own schedule.</p>
      {/* The care map's door, visible at every width: the header icon above is the phone's; on the
          desktop the page header is the platform's, so the map needs a door in the page itself. */}
      <Link className="learn-map-link" href="/approach/map" aria-label="Open the care map">
        <MapTrifold size={18} weight="bold" aria-hidden="true" />
        The care map — brain, body, environment, people
      </Link>
      <Suspense fallback={<p role="status">Loading learning modules…</p>}><LearnModules /></Suspense>
    </main>
  );
}
