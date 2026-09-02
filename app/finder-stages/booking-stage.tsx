"use client";

// O95: the booking handoff screen, verbatim from care-finder.tsx.

import { ArrowLeft } from "@phosphor-icons/react";
import { track } from "@vercel/analytics";
import { locationLabel, type Clinician } from "@/demo/clinicians";
import { bookingAnnouncement } from "@/finder/announce";
import { MotionScreen, StatusLine, Wordmark } from "./shared";

export function BookingStage({
  clinician,
  focusOnArrival,
  onBack,
}: {
  clinician: Clinician;
  focusOnArrival: boolean;
  onBack: () => void;
}) {
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
          This used to render three times — one from the record, two written into this
          component — behind a "Send request" button that set a state variable and sent
          nothing. Against invented personas that was a mock. Against named real clinicians
          it would be fabricated appointments under a named doctor's photograph.

          ADHD.ME does not hold availability and does not pretend to: Healthengine's API is
          inbound-only, their robots.txt disallows /api/, /json/, /book/ and /appointment/,
          and scraping the call their own page makes would put stale times under a real
          doctor's name. The reader is sent to the system that actually knows. */}
      <div className="booking-content">
        <p className="eyebrow">Booking</p>
        <h1 tabIndex={-1}>
          {clinician.booking.via === "healthengine"
            ? `Book with ${clinician.shortName} on Healthengine`
            : `Booking ${clinician.shortName}`}
        </h1>

        {clinician.booking.via === "healthengine" ? (
          <>
            {/* O44: "his practice" was written when Dr Anubhav Saxena was the only
                online-bookable GP, and misgendered every clinician added after him.
                The practice holds the times; no pronoun is needed to say so. */}
            <p>
              {clinician.shortName}’s live appointment times are held by the practice on
              Healthengine. We send you straight there, so the time you pick is a time that
              is genuinely open.
            </p>
            <p className="booking-note">
              You book with {clinician.practice} on Healthengine. ADHD.ME does not see your
              booking and no medical details are entered here.
            </p>
          </>
        ) : clinician.booking.via === "synthetic-none" ? (
          /* O231: said ONCE. The first draft rendered the route in the note and again in the
             paragraph under it ("arranged by phone" / "takes these appointments by phone"), with
             the practice name repeated a third time in a block at the bottom of an otherwise empty
             screen — caught in the screenshot pass, not by a test. The practice sits with the
             sentence it belongs to and the screen ends where the reading ends. */
          <>
            <p>{clinician.booking.note}</p>
            <p className="booking-practice">
              <span className="booking-practice-name">{clinician.practice}</span>
              <span>{locationLabel(clinician)}</span>
            </p>
          </>
        ) : (
          <>
            <p>{clinician.booking.note}</p>
            <p className="booking-note">
              {clinician.practice} takes these appointments by phone. Their number and hours
              are on the practice page.
            </p>
          </>
        )}
      </div>

      {/* O231: the outbound control exists only where there is somewhere real to go. A
          practice-booked entry with no listing ends on the route itself, which is a true terminal
          state and a designed one — not a disabled button, and not a link to a fabricated page. */}
      {clinician.booking.via === "synthetic-none" ? null : (
      <div className="bottom-action">
        {/* Routed through /go/<id> (O28): outbound booking intent becomes countable per
            clinician from this domain's own logs, with nothing stored — see the route's
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
          onClick={() => track("booking_outbound", { clinician: clinician.id, surface: "finder" })}
        >
          {clinician.booking.via === "healthengine"
            ? "See times on Healthengine"
            : "Open the practice page"}
        </a>
        <p>Opens Healthengine in a new tab.</p>
        {/* Attribution layer 3 (docs/BOOKING-ATTRIBUTION.md): Healthengine asks new
            patients how they heard about the practice, and the practice sees the
            answer. One factual sentence, no incentive, no claim. */}
        {clinician.booking.via === "healthengine" && (
          <p className="booking-heard">If the booking asks how you heard about the practice, you can say ADHD.ME.</p>
        )}
      </div>
      )}
    </MotionScreen>
  );
}
