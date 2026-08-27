// O197 (founder-directed): `/mission` — the landing page that accompanies the network.
//
// WHY A SEPARATE ROUTE RATHER THAN A SECTION ON `/network`. The founder asked for "a seperate
// landing page to accompany this new interface", and the network's own law is why that is the
// right shape rather than an extra scroll: `layout.one-idea` gives a screen one thing to say, and
// `/network` already says "here are the GPs, read them". A mission argued underneath a deck of
// faces is a second idea competing with the first, and a reader who arrives wanting to know what
// this is would have to scroll past the people to find out. Two ideas, two doors, one link
// between them.
//
// AND IT IS THE FRONT DOOR OF THE NETWORK'S OWN DEPLOYMENT. The same instruction parks the finder
// on `finder/standalone-deployment` for a different domain later. When that split happens this
// page is what a stranger lands on, so it is written to stand on its own: it names what the
// network is for, what it does today, and how big it actually is — before it hands the reader on.
//
// THE MISSION SENTENCE IS THE FOUNDER'S AND SHIPS VERBATIM. See `src/network/mission.ts` for what
// that means mechanically, including the acceptance entry that makes the rendered sweep REPORT the
// linter's match to the people who own that review rather than block the founder's words or
// quietly reword them.

import type { Metadata } from "next";
import Link from "next/link";
import { MISSION_COPY } from "@/network/mission";
import { PublicHeader } from "../public-header";
import { SiteFooter } from "../site-footer";

export const metadata: Metadata = {
  alternates: { canonical: "/mission" },
  title: "Why this exists",
  description:
    "What the ADHD.ME network is for: GPs who write their own pages, so a patient can read who somebody is before deciding whether to see them.",
};

export default function MissionPage() {
  return (
    <>
      {/*
        The header's right-hand door is the network, not the finder. This page exists to hand a
        reader to the people, and a page with two exits to two different products makes the reader
        choose before they have been told anything.
      */}
      <PublicHeader rightHref="/network" rightLabel="The network" />

      <main id="main-content" className="mission">
        <header className="mission-hero">
          <p className="mission-eyebrow">{MISSION_COPY.eyebrow}</p>
          <h1 className="mission-heading">{MISSION_COPY.heading}</h1>
          {/*
            The founder's sentence, set as the page's statement rather than buried in body copy.
            It is the largest run of prose on the screen because it is the reason the rest exists.
          */}
          <p className="mission-statement">{MISSION_COPY.statement}</p>
        </header>

        <section className="mission-section">
          <h2 className="mission-section-heading">{MISSION_COPY.howHeading}</h2>
          <p className="mission-section-body">{MISSION_COPY.howBody}</p>
        </section>

        {/*
          The scope paragraph sits BEFORE the door on purpose. A reader who is about to meet two
          doctors should have been told there are two, on the same screen that told them what the
          network is aiming at — `honesty.claim-earned`, and the only honest place for it is in
          front of the click rather than after it.
        */}
        <section className="mission-section">
          <h2 className="mission-section-heading">{MISSION_COPY.reachHeading}</h2>
          <p className="mission-section-body">{MISSION_COPY.reachBody}</p>
        </section>

        <section className="mission-door">
          <h2 className="mission-door-heading">{MISSION_COPY.readHeading}</h2>
          <p className="mission-door-body">{MISSION_COPY.readBody}</p>
          {/*
            The page's one accent, spent on its one action (`type.accent-live-tokens`). Sized by
            padding rather than by a large glyph so the hit area clears the 44px floor
            (`interaction.touch-44`).
          */}
          <Link href="/network" className="mission-door-link">
            Read the network
            <span aria-hidden="true"> →</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
