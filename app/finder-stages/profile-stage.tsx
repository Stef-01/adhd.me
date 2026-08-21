"use client";

// O95: the profile screen, verbatim from care-finder.tsx.

import { ArrowLeft } from "@phosphor-icons/react";
import { motion } from "motion/react";
import {
  closedBooksNote,
  distanceTo,
  locationLabel,
  missedAskParts,
  type Clinician,
} from "@/demo/clinicians";
import { type NeedSignal } from "@/matching/needs";
import { type Clarifier } from "@/matching/clarify";
import { type SuburbPoint } from "@/geo/suburbs";
import { ClinicianPortrait, OwnershipDisclosure, MotionScreen, NswTraining, Pressable, Wordmark } from "./shared";

export function ProfileStage({
  clinician,
  compareWith,
  personalizedSignals,
  profileEvidence,
  profileMissed,
  clarifierList,
  request,
  origin,
  onCompare,
  onBack,
  onClarifyTop,
  onBook,
}: {
  clinician: Clinician;
  /** O102: the GP this one is held against, or null when there is nothing to compare. */
  compareWith: Clinician | null;
  personalizedSignals: readonly string[];
  profileEvidence: readonly NeedSignal[];
  profileMissed: readonly NeedSignal[];
  clarifierList: readonly Clarifier[];
  request: string;
  origin: SuburbPoint | null;
  onCompare: () => void;
  onBack: () => void;
  onClarifyTop: () => void;
  onBook: () => void;
}) {
  return (
    <MotionScreen key="profile" className="profile-screen">
      <header className="minimal-header profile-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back to results">
          <ArrowLeft size={25} weight="light" aria-hidden="true" />
        </button>
        <Wordmark />
        <button className="text-action" type="button" onClick={onBack}>All results</button>
      </header>

      {/* O67: shares its layoutId with the chosen row's portrait slot, so this frame
          is the row's image ARRIVING rather than a new object fading in — which is why
          the old opacity/scale pop is gone from this element: a layout morph plus an
          enter tween on one thing is two stories about one object. Everything below
          the portrait keeps the screen's own enter. Under reduced motion the layout
          animation is disabled by MotionConfig and this is an instant swap, as now. */}
      <motion.div
        className="profile-portrait"
        layoutId={`gp-portrait-${clinician.id}`}
        data-portrait-of={clinician.id}
        transition={{ layout: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
      >
        <ClinicianPortrait clinician={clinician} variant="fill" />
      </motion.div>

      <div className="profile-content">
        {/* THE HEADING MUST NOT PROMISE A REASON THERE IS NONE OF.
            "Why this fit" was rendered unconditionally while the chips under it were
            rendered only when something matched, so a reader whose words reached no facet
            got a heading asking a question the page then declined to answer — directly over
            a named doctor, which is the worst place on the site to look evasive. The eyebrow
            now describes what is actually below it. */}
        <p className="eyebrow">
          {personalizedSignals.length > 0 ? "Why this fit" : "About this GP"}
        </p>
        <h1>{clinician.name}</h1>
        <p className="clinician-meta">{clinician.title}, {clinician.pronouns} · {locationLabel(clinician)}</p>
        <NswTraining clinician={clinician} />
        <OwnershipDisclosure clinician={clinician} />
        {personalizedSignals.length > 0 ? (
          /* Each reason now shows its provenance (O21): the closed-vocabulary label the
             ranking scored, and the phrase that reached it. `matched` is the lexicon's cue
             (every word of it stem-matched, in order, in the reader's text), not a verbatim
             quote — so the line says "from your words", which is exactly true, rather than
             "you said", which could misquote an inflection. */
          <>
            <ul className="fit-evidence" aria-label="Why this GP is listed for you">
              {profileEvidence.slice(0, 3).map((need) => (
                <li key={need.label}>
                  <span className="fit-evidence-label">{need.label}</span>
                  <span className="fit-evidence-said">from your words: &ldquo;{need.matched}&rdquo;</span>
                </li>
              ))}
            </ul>
            {/* O51: the asks this GP does not answer, said here rather than implied away.
                Declaration-framed (W193): "not something they declare" is a fact about a
                declaration, never a claim about ability. Capped at two so the page stays
                about the fit that exists; the finder's global note still covers asks
                nobody on the roster declares. */}
            {profileMissed.length > 0 && (
              <ul className="fit-missed" aria-label="What you asked for that this GP has not declared">
                {profileMissed.slice(0, 2).map((need) => (
                  /* O118: the sentence is composed in the matching module now, where a test can
                     hold it — and where the label is lowered WITHOUT breaking an acronym. This
                     printed "adhd in children and adolescents" until then. */
                  <li key={need.label}>
                    {missedAskParts(need).before}
                    <span className="fit-missed-label">{missedAskParts(need).label}</span>
                    {missedAskParts(need).after}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          /* Nothing in what they said reached this clinician, so the honest line is what he
             says he does — the same fallback the result row already used, which is why the
             rows looked right while the profile did not. */
          <p className="profile-no-match">
            {clinician.focus}. Nothing in what you said pointed here specifically.
          </p>
        )}
        {/* O66 (explaining-the-fit Q2): the one question that could genuinely reorder
            the list, said on the profile where the reader is actually weighing it. TOP
            clarifier only — the profile is about this clinician, not a quiz — and the
            tap does exactly what the results chips do (answer appended in the reader's
            own words, whole sentence re-read), then RETURNS to results so the O52
            layout animation shows the order changing rather than asserting it did. */}
        {clarifierList.length > 0 && (
          <p className="profile-clarify">
            What would change this order:{" "}
            <button
              type="button"
              className="profile-clarify-question"
              onClick={onClarifyTop}
            >
              {clarifierList[0]!.prompt}
            </button>
          </p>
        )}
        {/* O102 (explaining the fit, Q3): the other GP, one tap away, in the same quiet
            register as the reorder question above it. It renders ONLY when there is a second
            clinician AND the reader's words reached at least one ask — a compare table with
            no rows would be a claim of thoroughness with nothing behind it, and the caller
            passes null in exactly that case. */}
        {compareWith && (
          <p className="profile-compare">
            <button type="button" className="profile-compare-action" onClick={onCompare}>
              Compare with {compareWith.shortName}
            </button>
          </p>
        )}
        <div className="practical-signal-row profile-practical-signals" aria-label="Practical appointment details">
          {clinician.practicalSignals.slice(0, 2).map((signal) => <span key={signal}>{signal}</span>)}
        </div>

        {/* The signal pills above already enumerate the match, so `reason` is deliberately
            NOT repeated here: printing the same list twice on one screen, once as pills and
            once as a sentence, is the same content in two visual languages. The match screen
            has no pills, so it keeps the sentence. */}
        <div className="fit-list">
          <p>{clinician.appointmentLength}</p>
          <p>{distanceTo(clinician, origin) ?? clinician.reach}</p>
          {/* Launch item 14: the practice on a map, from the practice's own name and
              suburb — no API key, no location asked of the reader. */}
          <p>
            <a
              className="profile-directions"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clinician.practice}, ${clinician.suburb}, Australia`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Map and directions to {clinician.practice}
            </a>
          </p>
          {closedBooksNote(clinician, request) && <p>{closedBooksNote(clinician, request)}</p>}
        </div>

        <section>
          <h2>About</h2>
          <p>{clinician.about}</p>
        </section>

        <section>
          <h2>Focus and experience</h2>
          <ul>
            {clinician.experience.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section>
          <h2>Languages</h2>
          <p>{clinician.languages.join(", ")}</p>
        </section>
      </div>

      {/* O44: no entrance animation on the booking bar. It is the screen's primary action
          and a fixed overlay: a delayed fade means a person who arrives and scrolls in the
          first third of a second sees a profile with no way to book — which is exactly how
          the "no booking link" report read — and the animation carried no meaning
          (adhdme-taste: motion must carry meaning or not exist). */}
      <div className="profile-footer">
        <div>
          <span>{clinician.booking.via === "healthengine" ? "Appointments" : "Booking"}</span>
          <strong>
            {clinician.booking.via === "healthengine"
              ? "Live on Healthengine"
              : "By phone with the practice"}
          </strong>
        </div>
        <Pressable className="primary-button" type="button" onClick={onBook}>
          {clinician.booking.via === "healthengine" ? "See available times" : "How to book"}
        </Pressable>
      </div>
    </MotionScreen>
  );
}
