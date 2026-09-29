"use client";

// O95: the booking handoff screen, verbatim from care-finder.tsx.

import { ArrowLeft } from "@phosphor-icons/react";
import { track } from "@vercel/analytics";
import { bookingHandoff, type Clinician } from "@/demo/clinicians";
import { bookingAnnouncement } from "@/finder/announce";
import { MotionScreen, StatusLine, Wordmark } from "./shared";

export function BookingStage({
  clinician,
  focusOnArrival,
  onBack,
  onHandoff,
}: {
  clinician: Clinician;
  focusOnArrival: boolean;
  onBack: () => void;
  /** The tap that leaves for the practice: the finder records it, and asks about the visit later. */
  onHandoff?: () => void;
}) {
  const handoff = bookingHandoff(clinician);
  return (
    <MotionScreen key="booking" className="booking-screen" focusOnArrival={focusOnArrival}>
      <StatusLine line={bookingAnnouncement(clinician.shortName)} />
      <header className="minimal-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back to profile">
          <ArrowLeft size={25} weight="light" aria-hidden="true" />
        </button>
        <Wordmark />
        <span className="header-spacer" />
      </header>

      {/* PHASE 1 IS A HANDOFF, NOT A SLOT PICKER, AND THE SCREEN SAYS SO IN PLAIN WORDS.
          This used to render three times, one from the record, two written into this
          component, behind a "Send request" button that set a state variable and sent
          nothing. Against invented personas that was a mock. Against named real clinicians
          it would be fabricated appointments under a named doctor's photograph.

          ADHD.ME does not hold availability and does not pretend to: Healthengine's API is
          inbound-only, their robots.txt disallows /api/, /json/, /book/ and /appointment/,
          and scraping the call their own page makes would put stale times under a real
          doctor's name. The reader is sent to the system that actually knows. */}
      <div className="booking-content">
        {/* O232: an eyebrow reading "Booking" stood directly above a heading beginning "Booking".
            The heading carries its own weight; a label that repeats its first word is noise. */}
        <h1 tabIndex={-1}>
          {clinician.booking.via === "healthengine"
            ? `Book with ${clinician.shortName}`
            : `Booking ${clinician.shortName}`}
        </h1>

        {clinician.booking.via === "healthengine" ? (
          <>
            {/* O44: "his practice" was written when Dr Anubhav Saxena was the only
                online-bookable GP, and misgendered every clinician added after him.
                The practice holds the times; no pronoun is needed to say so. */}
            {/* 2026-09-29: this screen measured 83 words against a ceiling of 60 (the budget
                instrument had never reached it). The same facts in half the words. */}
            <p>
              {clinician.shortName}’s live times are held by the practice on Healthengine, so the
              time you pick there is open.
            </p>
            <p className="booking-note">
              ADHD.ME does not see your booking with {clinician.practice}.
            </p>
          </>
        ) : (
          /* O252: the phone sentence is gone. `practice` used to mean one thing — a clinician
             synced to no online platform, whom you ring — so the copy said so. It now also
             carries the clinics that book online somewhere other than Healthengine (GOALS on
             Halaxy, Wellness Psychology Clinic on its own form), and telling those readers to
             phone would send them to a number when a booking page was one tap away. The route
             is named once, in the note the entry supplies, and what remains is the fact the
             note cannot carry: whose booking it is and what ADHD.ME does not see. */
          <>
            <p>{clinician.booking.note}</p>
            <p className="booking-note">
              You book with {clinician.practice}. ADHD.ME does not see your booking and no
              medical details are entered here.
            </p>
          </>
        )}
      </div>

      <div className="bottom-action">
        {/* Routed through /go/<id> (O28): outbound booking intent becomes countable per
            clinician from this domain's own logs, with nothing stored, see the route's
            header and docs/BOOKING-ATTRIBUTION.md. The destination is unchanged. */}
        <a
          className="primary-button"
          href={`/go/${clinician.id}?src=finder`}
          target="_blank"
          rel="noreferrer"
          // O33: the custom event beside the server-side /go count. On the free tier
          // Vercel drops custom events, so this records nothing today and starts
          // recording the day the plan upgrades — no code change at that moment. No
          // identifier travels with it; the payload is the same two fields /go logs.
          onClick={() => {
            track("booking_outbound", { clinician: clinician.id, surface: "finder" });
            onHandoff?.();
          }}
        >
          {handoff.label}
        </a>
        {/* THE CAPTION NOW NAMES THE DESTINATION THE BUTTON ACTUALLY HAS. It read a flat "Opens
            Healthengine in a new tab." under a button that says "Open the practice page", this
            block renders for BOTH remaining routes, and on the `practice` route the link is the
            practice's own `booking.url`, which is not Healthengine and by definition never was
            (that variant exists precisely because the clinician is not synced to any online
            platform). Every other sentence on this screen was branched on `via` and this one
            alone was not, so the one line whose whole job is to say where a reader is about to be
            sent named the wrong place, on the exit point. Both strings come from
            `bookingHandoff` so they can no longer drift apart; see the note there. */}
        <p>{handoff.caption}</p>
        {/* Attribution layer 3 (docs/BOOKING-ATTRIBUTION.md): Healthengine asks new
            patients how they heard about the practice, and the practice sees the
            answer. One factual sentence, no incentive, no claim. */}
        {clinician.booking.via === "healthengine" && (
          <p className="booking-heard">If asked how you heard about the practice, say ADHD.ME.</p>
        )}
      </div>
    </MotionScreen>
  );
}
