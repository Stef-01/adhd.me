"use client";

// Today: one thing to understand or try, and the way to the map.
//
// This content used to render inline at the top of My ADHD, which made the hub carry two jobs and
// left `/today` as a redirect to it. The brief separates them — "Today: what should I understand
// or try next?" against "My Map: what have I learned about myself?" — and they are genuinely
// different questions, so they are two screens again.

import Link from "next/link";
import { LifeHeader } from "./life-shell";
import { TodayContent } from "./today";
import { useModel } from "./use-model";

export function TodayScreen() {
  const model = useModel();
  return (
    <main id="main-content" className="me-screen life-screen map-screen app-page-with-tabs">
      <LifeHeader />
      <header className="life-head">
        <h1>Today.</h1>
      </header>
      <TodayContent model={model} />
      <p className="map-foot">
        <Link href="/my-adhd">View my map</Link>
      </p>
    </main>
  );
}
