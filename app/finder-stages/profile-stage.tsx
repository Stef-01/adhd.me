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
import { type SuburbPoint } from "@/geo/suburbs";
import { ClinicianPortrait, MotionScreen, Pressable, Wordmark } from "./shared";

const UNKNOWN_DETAIL = /set (?:by|with) the practice/i;

function shortTitle(title: string): string {
  return title.split(",")[0]?.trim() || title;
}

type ProfileFact = { kind: "language" | "telehealth" | "availability"; label: string };

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
  return facts.slice(0, 3);
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
    <MotionScreen key="profile" className="profile-screen">
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
            transition={{ layout: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
          >
            <ClinicianPortrait clinician={clinician} variant="fill" />
          </motion.div>

          <div className="profile-identity">
            <h1>{clinician.name}</h1>
            <p className="clinician-meta">{shortTitle(clinician.title)}</p>
            <p className="profile-location">{locationLabel(clinician)}</p>
          </div>
        </div>

        <ul className="profile-facts" aria-label="Profile highlights">
          {facts.map((fact) => (
            <li key={fact.kind}>
              <span className="profile-fact-icon" aria-hidden="true">
                {fact.kind === "telehealth" && <VideoCamera size={19} weight="regular" />}
                {fact.kind === "language" && <Translate size={19} weight="regular" />}
                {fact.kind === "availability" && <UserPlus size={19} weight="regular" />}
              </span>
              <span>{fact.label}</span>
            </li>
          ))}
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
        <Pressable className="primary-button" type="button" onClick={onBook}>
          {clinician.booking.via === "healthengine" ? "See available times" : "How to book"}
        </Pressable>
      </div>
    </MotionScreen>
  );
}
