"use client";

import {
  ArrowLeft,
  ArrowsLeftRight,
  CaretRight,
  Translate,
  UserPlus,
  VideoCamera,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import {
  closedBooksNote,
  distanceTo,
  locationLabel,
  missedAskParts,
  type Clinician,
} from "@/demo/clinicians";
import { type NeedSignal } from "@/matching/needs";
import { APPROACH_LABELS } from "@/finder/filters";
import { type SuburbPoint } from "@/geo/suburbs";
import { profileAnnouncement } from "@/finder/announce";
import { ClinicianPortrait, EASE_OUT, MotionScreen, Pressable, StatusLine, Wordmark } from "./shared";

const UNKNOWN_DETAIL = /set (?:by|with) the practice/i;

function shortTitle(title: string): string {
  return title.split(",")[0]?.trim() || title;
}

type FactKind = "language" | "telehealth" | "availability" | "recording" | "approach";
type ProfileFact = { kind: FactKind; label: string };

const FACT_ICONS: Partial<Record<FactKind, typeof VideoCamera>> = {
  telehealth: VideoCamera,
  language: Translate,
  availability: UserPlus,
};

const LANGUAGE_LIST = new Intl.ListFormat("en-AU", { style: "long", type: "conjunction" });

function profileFacts(clinician: Clinician): ProfileFact[] {
  const facts: ProfileFact[] = [];
  if (clinician.telehealthFirstAppointment) {
    facts.push({ kind: "telehealth", label: "Telehealth" });
  }
  const additionalLanguages = clinician.languages.filter((language) => language !== "English");
  if (additionalLanguages.length > 0) {
    facts.push({ kind: "language", label: LANGUAGE_LIST.format(additionalLanguages) });
  }
  if (clinician.acceptingNewPatients) {
    facts.push({ kind: "availability", label: "Accepting new patients" });
  }
  // O236: the declared note-taking fact, in the practice's own terms.
  if (clinician.consultRecording === "ai-scribe") facts.push({ kind: "recording", label: "AI scribe, with your consent" });
  if (clinician.consultRecording === "no-ai") facts.push({ kind: "recording", label: "No AI recording" });
  // O248: how they say they work, in the closed vocabulary's own words.
  for (const a of clinician.approach ?? []) facts.push({ kind: "approach", label: APPROACH_LABELS[a] });
  return facts.slice(0, 6);
}

function usefulPracticalSignals(clinician: Clinician): string[] {
  return clinician.practicalSignals.filter(
    (signal) => !UNKNOWN_DETAIL.test(signal) && signal !== "Books online",
  );
}

export function ProfileStage({
  clinician,
  personalizedSignals,
  profileEvidence,
  profileMissed,
  request,
  origin,
  compareName,
  focusOnArrival,
  onBack,
  onCompare,
  onBook,
}: {
  clinician: Clinician;
  personalizedSignals: readonly string[];
  profileEvidence: readonly NeedSignal[];
  profileMissed: readonly NeedSignal[];
  request: string;
  origin: SuburbPoint | null;
  compareName: string | null;
  focusOnArrival: boolean;
  onBack: () => void;
  onCompare: () => void;
  onBook: () => void;
}) {
  const facts = profileFacts(clinician);
  const accessFacts = [
    ...usefulPracticalSignals(clinician),
    !UNKNOWN_DETAIL.test(clinician.appointmentLength) ? clinician.appointmentLength : null,
    distanceTo(clinician, origin) ?? clinician.reach,
    closedBooksNote(clinician, request),
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <MotionScreen key="profile" className="profile-screen" focusOnArrival={focusOnArrival}>
      <StatusLine line={profileAnnouncement(clinician.name)} />
      <header className="minimal-header profile-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back to results">
          <ArrowLeft size={25} weight="light" aria-hidden="true" />
        </button>
        <Wordmark />
        <span className="header-spacer" aria-hidden="true" />
      </header>

      <div className="profile-content">
        <div className="profile-intro">
          <motion.div
            className="profile-portrait"
            layoutId={`gp-portrait-${clinician.id}`}
            data-portrait-of={clinician.id}
            transition={{ layout: { duration: 0.42, ease: EASE_OUT } }}
          >
            <ClinicianPortrait clinician={clinician} variant="fill" />
          </motion.div>

          <div className="profile-identity">
            <h1 tabIndex={-1}>{clinician.name}</h1>
            {/* O217 put "Example profile — a fictional GP…" here, directly under the name. O231
                (founder-directed) removed it; see app/finder-stages/shared.tsx for what stays and
                why the structural defences, not the label, are what keep this honest. */}
            <p className="clinician-meta">{shortTitle(clinician.title)}</p>
            <p className="profile-location">{locationLabel(clinician)}</p>
            {/* O184: the material-interest disclosure, back on the listing it concerns.
                SITED IN THE IDENTITY BLOCK, because that is where a reader is deciding who this
                person is — a conflict notice met AFTER a view has formed has already failed. Ink at
                the same weight as the rest of the identity: O166 established that taking this off
                the accent must not make it quieter.
                THE SHORT LABEL RENDERS, NOT THE FULL SENTENCE — restored exactly as
                `OwnershipDisclosure` had it. The long form is a factual claim about a named person
                held in the roster and reviewed there; the label is what O158 built for rendering
                "beside the listing", and the two are not interchangeable. Putting the paragraph
                here instead pushed the bio below the half-viewport line at 390px, which
                `profile-layout.spec.ts` caught — the fold rule and the disclosure both hold with
                the field each was designed for. Whether a patient should ALSO meet the full
                sentence, and where, is a design question this unit does not answer: it was never
                on the profile, and inventing a placement while restoring a control is how a
                restoration turns into a redesign nobody reviewed. */}
            {clinician.disclosedInterest && clinician.disclosedInterestLabel && (
              <p className="disclosure-line">{clinician.disclosedInterestLabel}</p>
            )}
          </div>
        </div>

        <ul className="profile-facts" aria-label="Profile highlights">
          {facts.map((fact) => {
            // Three of the five kinds have an icon; `recording` and `approach` never did, and the
            // span was rendered for them anyway — an empty flex child still takes the row's 8px
            // gap, so those facts sat one gap in from their iconed neighbours for no mark. The
            // slot is only drawn when something goes in it.
            const Icon = FACT_ICONS[fact.kind];
            return (
              <li key={fact.kind + fact.label}>
                {Icon && (
                  <span className="profile-fact-icon" aria-hidden="true">
                    <Icon size={19} weight="regular" />
                  </span>
                )}
                <span>{fact.label}</span>
              </li>
            );
          })}
        </ul>

        <section className="profile-about">
          <h2>About</h2>
          <p>{clinician.summary}</p>
          <details className="profile-more">
            <summary>
              More about {clinician.name.replace(/^Dr\s+/i, "Dr ")}
              <CaretRight size={18} weight="regular" aria-hidden="true" />
            </summary>
            <p>{clinician.about}</p>
          </details>
        </section>

        <div className="profile-disclosures">
          <details className="profile-disclosure">
            <summary>
              <span>Why matched</span>
              <CaretRight size={19} weight="regular" aria-hidden="true" />
            </summary>
            <div className="profile-disclosure-body">
              {personalizedSignals.length > 0 ? (
                <>
                  <ul className="fit-evidence" aria-label="Why this GP is listed for you">
                    {profileEvidence.slice(0, 3).map((need) => (
                      <li key={need.label}>
                        <strong>{need.label}</strong>
                        <span>From your words: &ldquo;{need.matched}&rdquo;</span>
                      </li>
                    ))}
                  </ul>
                  {profileMissed.length > 0 && (
                    <ul className="fit-missed" aria-label="What you asked for that this GP has not declared">
                      {profileMissed.slice(0, 2).map((need) => (
                        <li key={need.label}>
                          {missedAskParts(need).before}
                          <strong>{missedAskParts(need).label}</strong>
                          {missedAskParts(need).after}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="profile-no-match">
                  {clinician.focus}. Nothing in what you said pointed here specifically.
                </p>
              )}
              {compareName && (
                <button className="profile-compare" type="button" onClick={onCompare}>
                  <ArrowsLeftRight size={18} weight="regular" aria-hidden="true" />
                  Compare with {compareName}
                </button>
              )}
            </div>
          </details>

          <details className="profile-disclosure">
            <summary>
              <span>Appointment and access</span>
              <CaretRight size={19} weight="regular" aria-hidden="true" />
            </summary>
            <div className="profile-disclosure-body">
              <ul className="profile-detail-list">
                {[...new Set(accessFacts)].map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
            </div>
          </details>

          <details className="profile-disclosure">
            <summary>
              <span>Credentials and experience</span>
              <CaretRight size={19} weight="regular" aria-hidden="true" />
            </summary>
            <div className="profile-disclosure-body">
              <p>{clinician.title}, {clinician.pronouns}</p>
              <ul className="profile-detail-list">
                {clinician.experience.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p>Languages: {clinician.languages.join(", ")}</p>
            </div>
          </details>
        </div>
      </div>

      <div className="profile-footer">
        {/* O217 put an explanation WHERE THE ACTION GOES for an example profile, so the journey
            ended in a sentence one tap from the booking screen. O231 (founder-directed) gives every
            profile its action back: the screen behind it is the real booking screen, which for a
            practice-booked GP explains the route rather than opening one. Nothing is disabled and
            nothing opens a fabricated listing — the difference between this and O217's concern is
            that the button leads somewhere true, not that it leads somewhere at all. */}
        <Pressable className="primary-button" type="button" onClick={onBook}>
          {clinician.booking.via === "healthengine" ? "See available times" : "How to book"}
        </Pressable>
      </div>
    </MotionScreen>
  );
}
