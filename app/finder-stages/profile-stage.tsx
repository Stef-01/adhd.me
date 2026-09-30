"use client";

import { CARE_NEEDS, IDENTITY_LABELS, publicCareProfile, publicIdentity } from "@/support/care-preferences";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsLeftRight,
  CaretRight,
  Translate,
  UserPlus,
  VideoCamera,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Fragment, useRef, type SyntheticEvent, useMemo } from "react";
import {
  closedBooksNote,
  distanceTo,
  locationLabel,
  missedAsksLine,
  type Clinician,
} from "@/demo/clinicians";
import { facetKey, needForKey, shortLabel, type NeedSignal } from "@/matching/needs";
import { APPROACH_LABELS } from "@/finder/filters";
import { type SuburbPoint } from "@/geo/suburbs";
import { profileAnnouncement } from "@/finder/announce";
import { professionOf } from "@/demo/clinicians";
import { professionLabel } from "@/support/professions";
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
  // O261: every listed clinician accepts new patients, so the fact carries no information as a chip on
  // each profile (three words on a screen that holds sixty); closed books still say so on the row (O4).
  // The profile pills took its place.
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
  insights = [],
  request,
  origin,
  compareName,
  focusOnArrival,
  onBack,
  onCompare,
  onBook,
  problemFit = null,
  fitTags = [],
  strengthFit = null,
}: {
  clinician: Clinician;
  personalizedSignals: readonly string[];
  profileEvidence: readonly NeedSignal[];
  profileMissed: readonly NeedSignal[];
  /** Why this clinician, in their own words (src/lib/matching/why.ts), or none: the keys then stand alone. */
  insights?: readonly string[];
  request: string;
  origin: SuburbPoint | null;
  compareName: string | null;
  focusOnArrival: boolean;
  onBack: () => void;
  onCompare: () => void;
  onBook: () => void;
  /** PRD §42: why this provider fits what the personal model has learned, or null. */
  problemFit?: string | null;
  /** The declared expertise that answers this person's own map. The traceable half of the match. */
  fitTags?: readonly string[];
  strengthFit?: string | null;
}) {
  const facts = profileFacts(clinician);
  /** The declared care areas as pills: asked-for ones first, then the rest as declared, three at most. */
  const worksWith = useMemo(() => {
    const asked = new Set(profileEvidence.map((need) => facetKey(need.facet)));
    const declared = [...clinician.careAreas, ...(clinician.careAreasSometimes ?? [])];
    const ordered = [...declared.filter((area) => asked.has(`care:${area}`)), ...declared.filter((area) => !asked.has(`care:${area}`))];
    const words = ordered.map((area) => needForKey(`care:${area}`)).filter((need): need is NeedSignal => need !== null).map(shortLabel);
    return [...new Set(words)].slice(0, 3);
  }, [clinician.careAreas, clinician.careAreasSometimes, profileEvidence]);
  const about = useRef<HTMLDetailsElement | null>(null);
  /** A section closed by hand with nothing else open: the first sentence comes back. */
  const unfoldAbout = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open || !about.current) return;
    if (event.currentTarget.closest(".profile-content")?.querySelector('details[name="profile-section"][open]')) return;
    about.current.open = true;
  };
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
            <p className="clinician-meta">{professionOf(clinician) === "gp" ? shortTitle(clinician.title) : `${professionLabel(professionOf(clinician))} · ${clinician.title.split(",").slice(1).join(",").trim() || shortTitle(clinician.title)}`}</p>
            {problemFit && <p className="profile-best-for profile-fit"><span>Why you’re seeing them</span> {problemFit}</p>}
            {/* WHY THIS MATCH, MADE TRACEABLE (founder, 2026-09-19). These are the same expertise
                tags that filled the person's own map, shown here as the things they have in
                common — so the card reads as an answer to what somebody said, not as an ad. */}
            {fitTags.length > 0 && (
              <ul className="profile-fit-tags" aria-label="What this matches in your map">
                {fitTags.map((tag) => <li key={tag}>{tag}</li>)}
              </ul>
            )}
            {strengthFit && <p className="profile-best-for profile-fit"><span>And</span> {strengthFit}</p>}
            <p className="profile-location">{locationLabel(clinician)}</p>
            {publicIdentity(clinician) && <p className="profile-cultural-identity">{publicIdentity(clinician)!.identities.map(id => IDENTITY_LABELS[id]).join(" · ")}{publicIdentity(clinician)!.country && <> · Country / Nation: {publicIdentity(clinician)!.country}</>}</p>}
            {publicCareProfile(clinician) && <details className="profile-more profile-care-declaration"><summary>Care they offer <CaretRight size={16} aria-hidden="true" /></summary><ul>{publicCareProfile(clinician)!.needs.map(need => <li key={need}>{CARE_NEEDS[need]}</li>)}</ul><a href={publicCareProfile(clinician)!.source} target="_blank" rel="noopener noreferrer">Clinician declaration ↗</a></details>}

            {/* O184: the material-interest disclosure, back on the listing it concerns.
                SITED IN THE IDENTITY BLOCK, because that is where a reader is deciding who this
                person is, a conflict notice met AFTER a view has formed has already failed. Ink at
                the same weight as the rest of the identity: O166 established that taking this off
                the accent must not make it quieter.
                THE SHORT LABEL RENDERS, NOT THE FULL SENTENCE, restored exactly as
                `OwnershipDisclosure` had it. The long form is a factual claim about a named person
                held in the roster and reviewed there; the label is what O158 built for rendering
                "beside the listing", and the two are not interchangeable. Putting the paragraph
                here instead pushed the bio below the half-viewport line at 390px, which
                `profile-layout.spec.ts` caught, the fold rule and the disclosure both hold with
                the field each was designed for. Whether a patient should ALSO meet the full
                sentence, and where, is a design question this unit does not answer: it was never
                on the profile, and inventing a placement while restoring a control is how a
                restoration turns into a redesign nobody reviewed. */}
            {clinician.disclosedInterest && clinician.disclosedInterestLabel && (
              <p className="disclosure-line">{clinician.disclosedInterestLabel}</p>
            )}
          </div>
        </div>
        {worksWith.length > 0 && (
          /* O261 (founder, 2026-09-29: "key pill tags"): what they declare they work with, in the chips' own words,
             the ones this person asked for first, at most three. Replaces PRD §41's "Best for" line, whose expertise
             tags now sit inside the care areas. Under the intro at full width: inside the identity column, three pills
             wrapped onto three lines at 390px and pushed the bio below the fold (profile-layout.spec.ts). */
          <ul className="profile-works-with" aria-label="Works with">
            {worksWith.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        )}

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

        {/* One section open at a time (`name`): the clinician's own first sentence shows until
            another section opens, then folds to "About", one tap from coming back. Folded, not
            deleted, so "Why matched" open is one screen of words rather than two. Closing the
            last open section brings the sentence back. */}
        <details className="profile-about" name="profile-section" open ref={about}>
          <summary>
            <span>About</span>
            <CaretRight size={19} weight="regular" aria-hidden="true" />
          </summary>
          <p>{firstSentence(clinician.summary)}</p>
          <details className="profile-more">
            <summary>
              More
              <CaretRight size={18} weight="regular" aria-hidden="true" />
            </summary>
            {firstSentence(clinician.summary) !== clinician.summary && <p>{clinician.summary}</p>}
            <p>{clinician.about}</p>
          </details>
        </details>

        <div className="profile-disclosures">
          <details className="profile-disclosure" name="profile-section" onToggle={unfoldAbout}>
            <summary>
              <span>Why matched</span>
              <CaretRight size={19} weight="regular" aria-hidden="true" />
            </summary>
            <div className="profile-disclosure-body">
              {/* The sentence, the way a person would say why, in place of the key rows; without one the
                  keys carry the person's own words, as before. */}
              {insights.length > 0 && (
                <ul className="fit-insights" aria-label="Why, in their words">
                  {insights.map((sentence) => <li key={sentence}>{sentence}</li>)}
                </ul>
              )}
              {personalizedSignals.length > 0 ? (
                <>
                  {insights.length === 0 && (
                  <ul className="fit-evidence" aria-label="Why this provider is listed for you">
                    {profileEvidence.slice(0, 3).map((need) => (
                      <li key={need.label}>
                        <strong>{need.label}</strong>
                        {/* The quote only where there is one (the model quotes the words that asked for
                            each tag, R19) and where it says more than the label: "longer first
                            appointment" under "A longer first appointment" said it twice. */}
                        {need.matched !== "" && !saysAgain(need.label, need.matched) && <span>From your words: &ldquo;{need.matched}&rdquo;</span>}
                      </li>
                    ))}
                  </ul>
                  )}
                  {profileMissed.length > 0 && (
                    <ul className="fit-missed" aria-label="What you asked for that this provider has not declared">
                      <li>
                        {missedAsksLine(profileMissed.slice(0, 2)).before}
                        {missedAsksLine(profileMissed.slice(0, 2)).asks.map((ask, i, all) => (
                          <Fragment key={ask}>
                            {/* A care label can hold a comma ("pregnancy, postpartum and new parents"): the list then parts with semicolons. */}
                            {i > 0 && (all.some((one) => one.includes(",")) ? "; " : ", ")}
                            <strong>{ask}</strong>
                          </Fragment>
                        ))}
                        {missedAsksLine(profileMissed.slice(0, 2)).after}
                      </li>
                    </ul>
                  )}
                </>
              ) : insights.length === 0 && (
                <p className="profile-no-match">
                  {clinician.focus}. Nothing in what you said pointed here specifically.
                </p>
              )}
              {/* O261: the visible label is one word; the name stays in the accessible name, and the compare screen shows both. */}
              {compareName && (
                <button className="profile-compare" type="button" onClick={onCompare} aria-label={`Compare with ${compareName}`}>
                  <ArrowsLeftRight size={18} weight="regular" aria-hidden="true" />
                  Compare
                </button>
              )}
            </div>
          </details>

          <details className="profile-disclosure" name="profile-section" onToggle={unfoldAbout}>
            <summary>
              <span>Appointments</span>
              <CaretRight size={19} weight="regular" aria-hidden="true" />
            </summary>
            <div className="profile-disclosure-body">
              <ul className="profile-detail-list">
                {[...new Set(accessFacts)].map((fact) => <li key={fact}>{fact}</li>)}
              </ul>
            </div>
          </details>

          <details className="profile-disclosure" name="profile-section" onToggle={unfoldAbout}>
            <summary>
              <span>Background</span>
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
          <ArrowRight size={17} weight="bold" aria-hidden="true" />
        </Pressable>
      </div>
    </MotionScreen>
  );
}

/** True when the label already carries every word of the quote, so the quote adds nothing. */
function saysAgain(label: string, quote: string): boolean {
  const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const inLabel = new Set(words(label));
  const quoted = words(quote);
  return quoted.length > 0 && quoted.every((word) => inLabel.has(word));
}

/** The first sentence of a declaration; the rest waits behind the fold. */
function firstSentence(text: string): string {
  const match = /^(.+?[.!?])(\s|$)/.exec(text.trim());
  return match ? match[1]! : text;
}
