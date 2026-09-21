"use client";

// Today: one thing to understand or try, the care plan, and the way to the map.
//
// This content used to render inline at the top of My ADHD, which made the hub carry two jobs and
// left `/today` as a redirect to it. The brief separates them — "Today: what should I understand
// or try next?" against "My Map: what have I learned about myself?" — and they are genuinely
// different questions, so they are two screens again.
//
// WHY THE CARE PLAN IS HERE AND NOT ON THE HUB. It was on the hub first, and measured: 53 words
// lived in, 58 with a step proposed, against a ceiling of 60. Then the skill-matched practitioner
// card landed on the same screen and added four more, and the two features together put it on 62.
// Neither is individually at fault — the hub had four words of headroom and now carries three
// recommendation surfaces at once (the contributor chips, the step, and a named practitioner), so
// the next addition to it will overflow whatever is there. Today is the same tab, is the screen
// whose question is "what should I try next", has 25 words of headroom, and a plan is a thing you
// act on rather than a thing you have learned about yourself. Whether the hub should carry all
// three is a founder call, recorded in CARE-PLAN-PRD.md §6.

import { useState } from "react";
import Link from "next/link";
import { LifeHeader } from "./life-shell";
import { CarePlanCard, CarePlanSheet } from "./my-adhd-care-plan";
import { TodayContent } from "./today";
import { useModel } from "./use-model";
import { track } from "@/model/events";

export function TodayScreen() {
  const { record, refresh, storage } = useModel();
  const [planOpen, setPlanOpen] = useState(false);
  return (
    <main id="main-content" className="me-screen life-screen map-screen app-page-with-tabs">
      <LifeHeader />
      <header className="life-head">
        <h1>Today.</h1>
      </header>
      <TodayContent model={{ record, refresh, storage }} />

      {record && (
        <CarePlanCard
          record={record}
          onOpen={() => {
            setPlanOpen(true);
            track("CARE_PLAN_OPENED", {});
          }}
        />
      )}

      <p className="map-foot">
        <Link href="/my-adhd">View my map</Link>
      </p>

      {record && (
        <CarePlanSheet
          open={planOpen}
          record={record}
          onClose={() => setPlanOpen(false)}
          onRefresh={refresh}
          /* The GP summary lives on the hub, so this is the one place the plan navigates rather
             than opening a sheet in place — and the hub reads `?share=1` on arrival so the
             promise in "take this to my GP" is kept rather than leaving somebody on the hub
             hunting for the Share button. */
          onShare={() => { setPlanOpen(false); window.location.assign("/my-adhd?share=1"); }}
          storage={storage}
        />
      )}
    </main>
  );
}
