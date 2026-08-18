"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CaretLeft,
  CaretRight,
  Microphone,
  PencilSimple,
  Waveform,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { careArchetypes } from "@/demo/care-archetypes";
import {
  clinicians,
  distanceTo,
  getPersonalizedMatch,
  matchQuality,
  rankCliniciansNear,
  rankClinicians,
  topTieNote,
  unservedAsks,
  CLOSED_BOOKS_COPY,
  MATCH_QUALITY_COPY,
  type Clinician,
} from "@/demo/clinicians";
import { clarifiers } from "@/matching/clarify";
import { coveredSuburbs, resolvePlace, type SuburbPoint } from "@/geo/suburbs";
import { CoverageMap } from "./coverage-map";
import {
  SPEECH_DISCLOSURE,
  SPEECH_ERROR_COPY,
  speechUnavailable,
  startSpeech,
  type SpeechError,
  type SpeechSession,
} from "@/voice/speech";

/**
 * Seven screens, down from eleven.
 *
 * `review`, `matching`, `match` and `all` collapsed into `results` in the first minimalism round:
 * a confirmation step, a fake loading animation and two competing views of the same list. See the
 * note above the results screen for what each one was and why it went.
 */
type Stage =
  | "welcome"
  | "scenarios"
  | "listening"
  | "type"
  | "results"
  | "profile"
  | "booking";

const defaultArchetype = careArchetypes[0]!;
const exampleRequest = defaultArchetype.request;
const stageVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: "blur(3px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

const reducedStageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// Welcome intro: children rise in sequence under the screen-level fade.
const introStagger: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const introItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function MotionScreen({ className, children }: { className: string; children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();
  const shouldPreserveFixedPositioning = className.includes("profile-screen");

  return (
    <motion.div
      className={`screen ${className}`}
      variants={shouldReduceMotion || shouldPreserveFixedPositioning ? reducedStageVariants : stageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

function Pressable(props: ComponentProps<typeof motion.button>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      {...props}
      whileTap={shouldReduceMotion || props.disabled ? undefined : { scale: 0.985 }}
      transition={{ duration: 0.12 }}
    />
  );
}

/**
 * A headline for what the person asked for, read back to them.
 *
 * READING BACK IS NOT INTERPRETING. Every branch names the KIND OF APPOINTMENT somebody is after
 * — a first assessment, a dose review, a child's referral — and none of them says anything about
 * whether the person has ADHD. That line matters more here than it did for the product this was
 * adapted from: a self-check that told a visitor "sounds like ADHD" would be this product
 * diagnosing them, which src/compliance/party-to-care.ts exists to prevent and which no amount of
 * hedging in the copy would fix.
 *
 * Order is most-specific-first, because a request usually trips several of these.
 */
function getRequestHeadline(value: string, fallback: string) {
  const words = value.toLowerCase();
  const has = (...terms: string[]) => terms.some((term) => words.includes(term));

  const hasChild = has("my son", "my daughter", "my child", "my teenager", "child", "teenager", "adolescent");
  const hasCulturalContext = has("south indian", "indian", "tamil", "malayalam", "culture", "cultural", "family");

  if (has("disability", "disabled", "wheelchair", "ndis")) {
    return "Accessible assessment, on your terms.";
  }
  if (has("trauma history", "trauma-informed", "permission", "boundaries", "difficult childhood")) {
    return "Assessment without having to relive it.";
  }
  if (has("ptsd", "bipolar", "psychiatrist", "psychiatric")) {
    return "Joined-up, with your psychiatrist in the loop.";
  }
  if (has("substance", "drinking", "alcohol", "cannabis", "addict")) {
    return "A safety question, not a character question.";
  }
  if (has("autism", "autistic", "audhd")) {
    return "An assessment that can hold both.";
  }
  if (has("wearing off", "side effects", "dose", "titration", "already diagnosed", "diagnosed already")) {
    return "Dose review that actually happens.";
  }
  if (has("heart", "cardiac", "cardiovascular", "blood pressure")) {
    return "The heart checks first, then the dose.";
  }
  if (has("without medication", "no medication", "not just medication", "alternatives", "coaching")) {
    return "The whole plan, not just the script.";
  }
  if (has("waitlist", "paediatrician", "referral") && hasChild) {
    return "Use the wait instead of losing it.";
  }
  if (hasChild) return "Start the assessment, and get the school moving.";
  if (has("antidepressant", "treated for anxiety", "wrong diagnosis", "misdiagnosed")) {
    return "Anxiety, ADHD, or both: worked out properly.";
  }
  if (has("perimenopause", "menopause", "hormonal", "coping stopped", "got worse")) {
    return "Not new. Just no longer survivable.";
  }
  if (has("missed", "late", "masking") && hasCulturalContext) {
    return "An assessment where you don’t have to win the argument first.";
  }
  if (has("missed", "late", "masking", "overlooked")) {
    return "A question worth asking properly.";
  }
  return fallback;
}

function Wordmark() {
  return <Link href="/" className="wordmark finder-wordmark" aria-label="ADHD.ME, back to main home">ADHD.ME</Link>;
}

function FinderContext() {
  return (
    <aside className="finder-context">
      {/* "All profiles are synthetic" stopped being true when a founder joined the roster, and a
          disclaimer that is nearly true is worse than none: it is the sentence a reader relies on. */}
      <p>
        Early demo in Beecroft and on the Gold Coast. Availability is synthetic, and every profile except
        Dr Saxena’s describes an invented clinician.
      </p>
    </aside>
  );
}

function WaveformMark({ active = false }: { active?: boolean }) {
  return (
    <span className={`waveform-mark${active ? " is-active" : ""}`} aria-hidden="true">
      <Waveform size={88} weight="light" />
    </span>
  );
}

/**
 * Drop the signals every result shares.
 *
 * Every clinician in this directory does ADHD assessment, so "ADHD assessment" appeared on every
 * row and told a reader nothing about which to choose. A signal is only a reason to pick something
 * if the other options lack it, so the shared ones are removed from the ROW and kept on the
 * profile, where there is nothing to compare against.
 */
function distinguishingSignals(signals: string[], everyone: string[][]): string[] {
  if (everyone.length < 2) return signals;
  const shared = new Set(
    everyone[0]!.filter((signal) => everyone.every((list) => list.includes(signal))),
  );
  const kept = signals.filter((signal) => !shared.has(signal));
  return kept.length > 0 ? kept : signals;
}

/** Initials from a display name, ignoring the title. "Dr Anubhav Saxena" -> "AS". */
function initialsOf(name: string) {
  return name
    .replace(/^(?:Dr|Prof|Mr|Ms|Mrs|Mx)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/**
 * A clinician's portrait, or a monogram when there is none.
 *
 * The synthetic demo personas have synthetic portraits; a real clinician's likeness is theirs to
 * supply, and nothing in this tree generates a face for a real person. A monogram is a real
 * directory pattern rather than a placeholder, so the layout is correct in both states.
 */
function ClinicianPortrait({
  clinician,
  variant,
}: {
  clinician: Clinician;
  /** `fill` for the framed portraits, `thumb` for the fixed-size list row. */
  variant: "fill" | "thumb";
}) {
  const alt = `Portrait of ${clinician.name}`;

  if (clinician.image) {
    return variant === "fill"
      ? <Image src={clinician.image} alt={alt} fill sizes="(max-width: 520px) 100vw, 440px" priority />
      : <Image src={clinician.image} alt="" width={72} height={72} />;
  }

  return (
    <span
      className={`clinician-monogram clinician-monogram-${variant}`}
      // The name is already beside this in every consumer, so the monogram is decorative.
      aria-hidden="true"
    >
      {initialsOf(clinician.name)}
    </span>
  );
}

/** The NSW training, as a credential line. Self-reported, which the profile notes once. */
function NswTraining({ clinician }: { clinician: Clinician }) {
  if (!clinician.nswAdhdTrained) return null;
  return <p className="credential-line">NSW ADHD training</p>;
}

/** A material interest, stated beside the listing it concerns. One line, not an essay. */
function FounderDisclosure({ clinician }: { clinician: Clinician }) {
  if (!clinician.founderInterest) return null;
  return <p className="disclosure-line">Co-founder of ADHD.ME</p>;
}

export function CareFinder() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [archetypeIndex, setArchetypeIndex] = useState(0);
  // The scenario browser rotates on its own until the visitor takes over.
  const [autoCycle, setAutoCycle] = useState(true);
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [request, setRequest] = useState(exampleRequest);
  const [matches, setMatches] = useState(() => rankClinicians(exampleRequest));
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchDirection, setMatchDirection] = useState<1 | -1>(1);
  // Speech state. `heard` is the live transcript, so the screen shows words as they arrive; that
  // is the only reliable signal to somebody that the microphone is actually working.
  // Where the person says they are. A typed suburb or postcode, never the device's location: no
  // permission prompt, and no coordinate leaves the browser.
  const [place, setPlace] = useState("");
  const origin: SuburbPoint | null = useMemo(() => resolvePlace(place), [place]);
  // Round 2: sixteen near-identical rows is the "long list" anti-pattern. Five is enough to choose
  // from, and the rest are one tap away for somebody who wants to read all of them.
  const [showAll, setShowAll] = useState(false);
  const [heard, setHeard] = useState("");
  const [speechError, setSpeechError] = useState<SpeechError | null>(null);
  const speech = useRef<SpeechSession | null>(null);

  const archetype = careArchetypes[archetypeIndex] ?? defaultArchetype;
  const clinician = matches[matchIndex] ?? clinicians[0]!;

  // Stop the microphone whenever this screen is left, by any route: the X, a stage change, an
  // unmount. A recogniser left running after its screen is gone keeps the mic light on, which is
  // alarming and correct to be alarmed by.
  useEffect(() => {
    if (stage === "listening") return;
    speech.current?.cancel();
    speech.current = null;
  }, [stage]);

  useEffect(() => () => speech.current?.cancel(), []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  useEffect(() => {
    if (stage !== "scenarios" || !autoCycle || reducedMotion) return;
    const timer = window.setInterval(() => {
      setArchetypeIndex((current) => {
        const nextIndex = (current + 1) % careArchetypes.length;
        const nextArchetype = careArchetypes[nextIndex] ?? defaultArchetype;
        setRequest(nextArchetype.request);
        setMatches(rankClinicians(nextArchetype.request));
        setMatchIndex(0);
        setMatchDirection(1);
        return nextIndex;
      });
    }, 5500);
    return () => window.clearInterval(timer);
  }, [stage, autoCycle, reducedMotion]);

  const requestSummary = useMemo(() => {
    const cleaned = request.trim().replace(/[.!?]+$/, "");
    if (!cleaned) return exampleRequest;
    return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`;
  }, [request]);
  const requestHeadline = useMemo(
    () => request.trim() === archetype.request ? archetype.headline : getRequestHeadline(request, requestSummary),
    [archetype.headline, archetype.request, request, requestSummary],
  );
  const allSignals = useMemo(
    () => matches.map((item) => getPersonalizedMatch(item, request).signals),
    [matches, request],
  );
  const shown = showAll ? matches : matches.slice(0, 5);

  const personalizedMatch = useMemo(() => getPersonalizedMatch(clinician, request), [clinician, request]);

  function startListening() {
    setHeard("");
    setSpeechError(null);

    const session = startSpeech({
      onPartial: setHeard,
      onFinal: (text) => {
        speech.current = null;
        // Nothing heard is not an error worth a red message; it is a reason to let somebody type.
        if (!text) {
          setStage("type");
          return;
        }
        setHeard(text);
        setDraft(text);
        findMatches(text);
      },
      onError: (error) => {
        speech.current = null;
        // A deliberate stop is not a failure to report.
        if (error === "aborted") return;
        setSpeechError(error);
        setStage("type");
      },
    });

    // Unsupported browser, insecure origin, or a constructor that threw: go straight to typing
    // rather than showing a microphone screen that cannot work.
    if (!session) {
      setSpeechError(null);
      setStage("type");
      return;
    }

    speech.current = session;
    setStage("listening");
  }

  /** "Done" asks the recogniser to finish; the final transcript arrives through onFinal. */
  function finishListening() {
    if (speech.current) {
      speech.current.stop();
      return;
    }
    setStage("type");
  }

  function findMatches(value = request) {
    const nextRequest = value.trim() || archetype.request;
    setRequest(nextRequest);
    setMatches(rankCliniciansNear(nextRequest, origin));
    setMatchIndex(0);
    setShowAll(false);
    // Straight to the results. The sort is synchronous and already done; the screen that used to
    // sit here spent 4.25 seconds saying so.
    setStage("results");
  }

  function chooseClinician(selected: Clinician) {
    const index = matches.findIndex((item) => item.id === selected.id);
    if (index >= 0) setMatchIndex(index);
    setStage("profile");
  }

  function reset() {
    setStage("welcome");
    setDraft("");
    setRequest(archetype.request);
    setMatches(rankClinicians(archetype.request));
    setMatchIndex(0);
    setMatchDirection(1);
  }

  function cycleArchetype(direction: 1 | -1) {
    const nextIndex = (archetypeIndex + direction + careArchetypes.length) % careArchetypes.length;
    const nextArchetype = careArchetypes[nextIndex] ?? defaultArchetype;
    setArchetypeIndex(nextIndex);
    setRequest(nextArchetype.request);
    setDraft("");
    setMatches(rankClinicians(nextArchetype.request));
    setMatchIndex(0);
    setMatchDirection(direction);
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="care-app patient-v2" data-stage={stage}>
        <section className="care-shell" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
        {stage === "welcome" && (
          <MotionScreen key="welcome" className="voice-screen">
            <header className="minimal-header">
              <Wordmark />
              <Link href="/" className="quiet-link finder-home-link">
                <ArrowLeft size={15} weight="regular" aria-hidden="true" /> Home
              </Link>
            </header>

            <motion.div className="voice-core" variants={reducedMotion ? undefined : introStagger}>
              <motion.div className="voice-prompt" variants={reducedMotion ? undefined : introItem}>
                <h1>
                  <span>ADHD assessment</span>
                  <em>that takes you seriously.</em>
                </h1>
              </motion.div>
            </motion.div>

            <motion.div
              className="voice-actions"
              initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* ONE field, ONE dual-functional control. Empty → a microphone that talks; the
                  moment there is text → a send arrow that searches. Both routes converge on the
                  same voice/findMatches() path, so speaking and writing rank clinicians identically. */}
              <div className="dual-input">
                <label className="sr-only" htmlFor="welcome-request">
                  Describe the GP you are looking for, or use the microphone to talk
                </label>
                <input
                  id="welcome-request"
                  type="text"
                  className="dual-input-field"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && draft.trim()) findMatches(draft); }}
                  placeholder="Describe the GP you're looking for…"
                />
                <Pressable
                  className={draft.trim() ? "dual-input-action is-send" : "dual-input-action is-talk"}
                  type="button"
                  onClick={() => (draft.trim() ? findMatches(draft) : startListening())}
                  aria-label={draft.trim() ? "Find a GP" : "Talk instead of typing"}
                >
                  {draft.trim()
                    ? <ArrowRight size={21} weight="bold" aria-hidden="true" />
                    : <Microphone size={21} weight="fill" aria-hidden="true" />}
                </Pressable>
              </div>

              <button
                className="scenario-toggle"
                type="button"
                onClick={() => {
                  setAutoCycle(true);
                  setStage("scenarios");
                }}
              >
                Try a demo scenario
                <CaretRight size={14} weight="bold" aria-hidden="true" />
              </button>
            </motion.div>

            <FinderContext />

          </MotionScreen>
        )}

        {stage === "scenarios" && (
          <MotionScreen key="scenarios" className="scenario-screen">
            <header className="minimal-header">
              <button className="icon-button" type="button" onClick={() => setStage("welcome")} aria-label="Back to start">
                <ArrowLeft size={25} weight="light" aria-hidden="true" />
              </button>
              <Wordmark />
              <span className="header-spacer" />
            </header>

            <div className="scenario-core">
              <p className="eyebrow">Demo scenarios</p>
              <div className="archetype-switcher" role="group" aria-label="Demo care scenarios">
                <Pressable type="button" onClick={() => { setAutoCycle(false); cycleArchetype(-1); }} aria-label="Previous care scenario">
                  <CaretLeft size={22} weight="light" aria-hidden="true" />
                </Pressable>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.blockquote
                    className="scenario-quote"
                    key={archetype.id}
                    initial={{ opacity: 0, x: matchDirection * 9 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: matchDirection * -9 }}
                    transition={{ duration: 0.22 }}
                  >
                    <q>{archetype.example}</q>
                  </motion.blockquote>
                </AnimatePresence>
                <Pressable type="button" onClick={() => { setAutoCycle(false); cycleArchetype(1); }} aria-label="Next care scenario">
                  <CaretRight size={22} weight="light" aria-hidden="true" />
                </Pressable>
              </div>
              <p className="scenario-count">{archetypeIndex + 1} of {careArchetypes.length}</p>
            </div>

            <div className="bottom-action">
              <Pressable className="primary-button" type="button" onClick={() => findMatches(archetype.request)}>
                Try this scenario
              </Pressable>
            </div>
          </MotionScreen>
        )}

        {stage === "listening" && (
          <MotionScreen key="listening" className="listening-screen">
            <header className="minimal-header">
              <Wordmark />
              <button className="icon-button" type="button" onClick={() => setStage("welcome")} aria-label="Cancel">
                <X size={25} weight="light" aria-hidden="true" />
              </button>
            </header>

            <div className="voice-prompt listening-copy">
              <p className="eyebrow">Listening</p>
              <h1>Describe the GP you’d feel comfortable with.</h1>
              {/* The transcript replaces the prompt as soon as there is one: once somebody is
                  talking, the instruction is noise and the words are the feedback. `aria-live`
                  is polite so a screen reader is not interrupted on every revision. */}
              {heard ? (
                <p className="listening-transcript" aria-live="polite">{heard}</p>
              ) : (
                <p className="example">What you need looked at, your language, how you want to be treated. Whatever matters to you.</p>
              )}
            </div>

            <div className="voice-actions">
              <motion.div
                animate={reducedMotion ? undefined : { scale: [1, 1.035, 1] }}
                transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
              >
                <Pressable className="mic-button recording" type="button" onClick={finishListening} aria-label="Finish voice description">
                  <Microphone size={38} weight="light" aria-hidden="true" />
                </Pressable>
              </motion.div>
              <WaveformMark active />
              <button className="primary-button listening-done" type="button" onClick={finishListening}>Done</button>
              <button className="text-action" type="button" onClick={() => setStage("type")}>Type instead</button>
              {/* Beside the microphone, not in a policy page. See src/voice/speech.ts. */}
              <p className="speech-disclosure">{SPEECH_DISCLOSURE}</p>
            </div>
          </MotionScreen>
        )}

        {stage === "type" && (
          <MotionScreen key="type" className="type-screen">
            <header className="minimal-header">
              <button className="icon-button" type="button" onClick={() => setStage("welcome")} aria-label="Go back">
                <ArrowLeft size={25} weight="light" aria-hidden="true" />
              </button>
              <Wordmark />
              <span className="header-spacer" />
            </header>

            <div className="type-content">
              <p className="eyebrow">In your own words</p>
              {speechError && <p className="speech-error" role="status">{SPEECH_ERROR_COPY[speechError]}</p>}
              <h1>
                <span>ADHD assessment</span>
                <em>that takes you seriously.</em>
              </h1>
              <label className="sr-only" htmlFor="doctor-request">Describe the GP you want to see</label>
              <textarea
                id="doctor-request"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="For example: A woman GP who assesses adult ADHD, speaks Tamil, and understands a family who thinks this is an excuse."
                autoFocus
              />
            </div>

            <div className="bottom-action">
              <Pressable className="primary-button" type="button" disabled={!draft.trim()} onClick={() => {
                findMatches(draft);
              }}>
                Find a GP
              </Pressable>
              <p>Don’t include identifying or urgent health details.</p>
            </div>
          </MotionScreen>
        )}

        {/* ROUND 1 OF THE MINIMALISM PASS COLLAPSED FOUR SCREENS INTO THIS ONE.
            Gone: `review` (read your own words back, then press continue), `matching` (a 4.25s
            animation of three rotating reassurances while a synchronous sort had already
            finished), and the swipe deck, which showed ONE clinician at a time with a large
            portrait and made comparing two of them a memory exercise.
            A person choosing a GP is comparing, so the list is the primary view and the only one.
            Where you are moved here from its own screen because it belongs beside the results it
            changes: editing it re-ranks in place instead of sending anybody back a step. */}
        {stage === "results" && (
          <MotionScreen key="results" className="results-screen">
            <header className="minimal-header">
              <Wordmark />
              <button className="text-action" type="button" onClick={reset}>Start over</button>
            </header>

            <div className="results-head">
              <p className="eyebrow">You asked for</p>
              <h1>{requestHeadline}</h1>
              <button className="refine-compact" type="button" onClick={() => { setDraft(request); setStage("type"); }}>
                <span>Change what you said</span>
              </button>

              <div className="place-field">
                <label htmlFor="place">Where are you? Suburb or postcode, if you like.</label>
                <input
                  id="place"
                  name="place"
                  list="covered-suburbs"
                  value={place}
                  onChange={(event) => {
                    setPlace(event.target.value);
                    setMatches(rankCliniciansNear(request, resolvePlace(event.target.value)));
                  }}
                  placeholder="Beecroft"
                  autoComplete="address-level2"
                />
                <datalist id="covered-suburbs">
                  {coveredSuburbs().map((suburb) => <option key={suburb} value={suburb} />)}
                </datalist>
                <p className="place-status" role="status">
                  {/* Says how many are SHOWN, not how many exist. "16 GPs" above a list of five
                      is a number that describes something the reader cannot see. */}
                  {place.trim() === ""
                    ? `${shown.length} of ${matches.length}, ranked on what you asked for.`
                    : origin
                      ? `${shown.length} of ${matches.length}, nearest to ${origin.suburb} first.`
                      : "We do not cover that one yet, so these are ranked on what you asked for."}
                </p>

                {/* WHEN THE ORDER IS NOT EARNED, SAY SO.
                    A probe over realistic first-person queries found the lexicon reached nothing
                    on nine of seventeen and that ten tied exactly — including "I think I might
                    have ADHD", the likeliest thing anybody types. Every one of those still
                    rendered as a ranked list whose order came from the tie-break: from nothing,
                    presented as from something. This is one line and it only appears when the
                    order means nothing, which is the only time it has anything to add. */}
                {matchQuality(request) !== "informed" && (
                  <p className="place-status match-quality" role="status">
                    {MATCH_QUALITY_COPY[matchQuality(request)]}
                  </p>
                )}

                {/* THE TIE THE ROSTER-LEVEL VERDICT CANNOT SEE (O3). "Informed" means an order
                    exists somewhere in the list — not necessarily at the top, which is the one
                    boundary the reader acts on. When the first band is a tie, say so there. */}
                {topTieNote(request) && (
                  <p className="place-status match-quality" role="status">
                    {topTieNote(request)}
                  </p>
                )}

                {/* ONE QUESTION, WHEN THE WORDS DID NOT SEPARATE ANYBODY.
                    Saying "this is not a ranking" is honest and it is a dead end: the commonest
                    sentence in the product reaches only the facet every GP declares, so the reader
                    is told the order means nothing and left where they started. These are the
                    facets this roster actually DISAGREES on, so answering one reorders it — a
                    question that could not change the order would be data collection from somebody
                    who came here to find a GP. Tapping appends the answer in the reader's own
                    words and the whole sentence is re-read, so the finder can still say "you said
                    this" about a signal it prompted. */}
                {matchQuality(request) !== "informed" && clarifiers(request, matches).length > 0 && (
                  <div className="clarify">
                    <p className="clarify-lead">One answer would narrow it:</p>
                    <ul className="clarify-row">
                      {clarifiers(request, matches).map((clarifier) => (
                        <li key={clarifier.facetKey}>
                          <button
                            type="button"
                            className="clarify-chip"
                            onClick={() => {
                              const next = `${request}, ${clarifier.answer}`;
                              setRequest(next);
                              setMatches(rankCliniciansNear(next, origin));
                            }}
                          >
                            {clarifier.prompt}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* A care area nobody on the roster declares is a gap in the LISTING, and the
                    reader should not be left to conclude it is a gap in their question. */}
                {unservedAsks(request).length > 0 && (
                  <p className="place-status match-quality" role="status">
                    {`No GP listed today says they do ${unservedAsks(request)[0]!.toLowerCase()}. That is a gap in our listing, not in what you asked for.`}
                  </p>
                )}

                {/* Only when the answer is no. "We do not cover that one" raises the question of
                    what IS covered, and this answers it in place instead of leaving somebody to
                    guess which suburbs to try. In every other case it would be a block of screen
                    saying something the reader did not ask. */}
                {place.trim() !== "" && !origin && (
                  <CoverageMap highlight={null} />
                )}
              </div>
            </div>

            <div className="clinician-list">
              {shown.map((item, index) => {
                const itemMatch = getPersonalizedMatch(item, request);
                const away = distanceTo(item, origin);
                const reasons = distinguishingSignals(itemMatch.signals, allSignals);
                return (
                  <motion.button
                    key={item.id}
                    className="clinician-row"
                    type="button"
                    onClick={() => chooseClinician(item)}
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.18), duration: 0.26 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.99 }}
                  >
                    <ClinicianPortrait clinician={item} variant="thumb" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{reasons.slice(0, 2).join(", ") || item.focus}</small>
                      <small className="row-availability">{away ? `${item.suburb}, ${away}` : item.suburb}</small>
                      {/* Closed books never outrank open ones at equal fit, and never hide
                          either — the row says why somebody unactionable is still here (O4). */}
                      {!item.acceptingNewPatients && (
                        <small className="row-availability">{CLOSED_BOOKS_COPY}</small>
                      )}
                    </span>
                    <CaretRight size={20} weight="light" aria-hidden="true" />
                  </motion.button>
                );
              })}
            </div>

            {matches.length > shown.length && (
              <button className="show-all" type="button" onClick={() => setShowAll(true)}>
                Show the other {matches.length - shown.length}
              </button>
            )}
          </MotionScreen>
        )}

        {stage === "profile" && (
          <MotionScreen key="profile" className="profile-screen">
            <header className="minimal-header profile-header">
              <button className="icon-button" type="button" onClick={() => setStage("results")} aria-label="Back to results">
                <ArrowLeft size={25} weight="light" aria-hidden="true" />
              </button>
              <Wordmark />
              <button className="text-action" type="button" onClick={() => setStage("results")}>All results</button>
            </header>

            <motion.div
              className="profile-portrait"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
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
                {personalizedMatch.signals.length > 0 ? "Why this fit" : "About this GP"}
              </p>
              <h1>{clinician.name}</h1>
              <p className="clinician-meta">{clinician.title}, {clinician.pronouns} · {clinician.suburb}</p>
              <NswTraining clinician={clinician} />
              <FounderDisclosure clinician={clinician} />
              {personalizedMatch.signals.length > 0 ? (
                <div className="fit-signal-row profile-fit-signals" aria-label="Key match reasons">
                  {personalizedMatch.signals.slice(0, 3).map((signal) => <span key={signal}>{signal}</span>)}
                </div>
              ) : (
                /* Nothing in what they said reached this clinician, so the honest line is what he
                   says he does — the same fallback the result row already used, which is why the
                   rows looked right while the profile did not. */
                <p className="profile-no-match">
                  {clinician.focus}. Nothing in what you said pointed here specifically.
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
                {!clinician.acceptingNewPatients && <p>{CLOSED_BOOKS_COPY}</p>}
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

            <motion.div
              className="profile-footer"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <div>
                <span>{clinician.booking.via === "healthengine" ? "Appointments" : "Booking"}</span>
                <strong>
                  {clinician.booking.via === "healthengine"
                    ? "Live on Healthengine"
                    : "By phone with the practice"}
                </strong>
              </div>
              <Pressable className="primary-button" type="button" onClick={() => setStage("booking")}>
                {clinician.booking.via === "healthengine" ? "See available times" : "How to book"}
              </Pressable>
            </motion.div>
          </MotionScreen>
        )}

        {stage === "booking" && (
          <MotionScreen key="booking" className="booking-screen">
            <header className="minimal-header">
              <button className="icon-button" type="button" onClick={() => setStage("profile")} aria-label="Back to profile">
                <ArrowLeft size={25} weight="light" aria-hidden="true" />
              </button>
              <Wordmark />
              <span className="header-spacer" />
            </header>

            {/* PHASE 1 IS A HANDOFF, NOT A SLOT PICKER, AND THE SCREEN SAYS SO IN PLAIN WORDS.
                This used to render three times — one from the record, two written into this
                component — behind a "Send request" button that set a state variable and sent
                nothing. Against invented personas that was a mock. Against Dr Saxena and Dr Yadav
                it would be fabricated appointments under a named doctor's photograph.

                ADHD.ME does not hold availability and does not pretend to: Healthengine's API is
                inbound-only, their robots.txt disallows /api/, /json/, /book/ and /appointment/,
                and scraping the call their own page makes would put stale times under a real
                doctor's name. The reader is sent to the system that actually knows. */}
            <div className="booking-content">
              <p className="eyebrow">Booking</p>
              <h1>
                {clinician.booking.via === "healthengine"
                  ? `Book with ${clinician.shortName} on Healthengine`
                  : `Booking ${clinician.shortName}`}
              </h1>

              {clinician.booking.via === "healthengine" ? (
                <>
                  <p>
                    {clinician.shortName}’s live appointment times are held by his practice on
                    Healthengine. We send you straight there, so the time you pick is a time that
                    is genuinely open.
                  </p>
                  <p className="booking-note">
                    You book with {clinician.practice} on Healthengine. ADHD.ME does not see your
                    booking and no medical details are entered here.
                  </p>
                </>
              ) : (
                <>
                  <p>{clinician.booking.note}</p>
                  <p className="booking-note">
                    {clinician.practice} takes his appointments by phone. Their number and hours
                    are on the practice page.
                  </p>
                </>
              )}
            </div>

            <div className="bottom-action">
              <a
                className="primary-button"
                href={clinician.booking.url}
                target="_blank"
                rel="noreferrer"
              >
                {clinician.booking.via === "healthengine"
                  ? "See times on Healthengine"
                  : "Open the practice page"}
              </a>
              <p>Opens Healthengine in a new tab.</p>
            </div>
          </MotionScreen>
        )}

          </AnimatePresence>
        </section>
      </main>
    </MotionConfig>
  );
}
