import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { ROBOTS_META } from "@/security/robots";
import { AppSettings } from "../../../app-settings";
import { CareMap } from "../../../care-map";

// The care map (PRD §25): the eco-bio-psychosocial model as a screen, one tap from the Learn page's
// map icon. General on its own; personal once the device holds signals.
export const metadata: Metadata = {
  alternates: { canonical: "/approach/map" },
  robots: ROBOTS_META,
  title: "The care map",
  description: "ADHD across brain, body, environment and people: a map of where in a life the difficulties sit, which modules work on each, and — on your device — where yours are.",
};

export default function CareMapPage() {
  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs">
      <div className="minimal-header has-settings me-chrome">
        <Link className="learn-back" href="/approach"><ArrowLeft size={18} weight="bold" aria-hidden="true" /> Learn</Link>
        <AppSettings />
      </div>
      <header className="life-head">
        <span className="life-eyebrow">The care map</span>
        <h1>Where ADHD sits in a life.</h1>
      </header>
      <CareMap />
    </main>
  );
}
