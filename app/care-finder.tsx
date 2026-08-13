"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  CaretLeft,
  CaretRight,
  List,
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
  rankCliniciansNear,
  rankClinicians,
  type Clinician,
} from "@/demo/clinicians";
import { coveredSuburbs, resolvePlace, type SuburbPoint } from "@/geo/suburbs";
import {
  SPEECH_DISCLOSURE,
  SPEECH_ERROR_COPY,
  speechUnavailable,
  startSpeech,
  type SpeechError,
  type SpeechSession,
} from "@/voice/speech";

type Stage =
  | "welcome"
  | "scenarios"
  | "listening"
  | "type"
  | "review"
  | "matching"
  | "match"
  | "all"
  | "profile"
  | "booking"
  | "confirmed";

const defaultArchetype = careArchetypes[0]!;
const exampleRequest = defaultArchetype.request;
const matchingSteps = [
  "Understanding what matters to you.",
  "Considering clinical and cultural fit.",
  "Checking access and availability.",
];

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

const matchVariants: Variants = {
  initial: (direction: number) => ({ opacity: 0, x: direction * 28 }),
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 310, damping: 31, mass: 0.78 },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -22,
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
  }),
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

/**
 * The priorities a request stated, as labels.
 *
 * These are things the person SAID THEY WANT, not inferences about their health. "Bulk billing"
 * belongs here; "inattentive presentation" would not, and there is no branch that could produce it.
 */
function getRequestPriorities(value: string) {
  const words = value.toLowerCase();
  const priorities = [
    { label: "First ADHD assessment", terms: ["assessment", "assessed", "diagnosis", "diagnose", "might have adhd", "think i have"] },
    { label: "Children and adolescents", terms: ["my son", "my daughter", "my child", "child", "teenager", "adolescent", "school"] },
    { label: "Co-occurring autism", terms: ["autism", "autistic", "audhd"] },
    { label: "Titration and dose review", terms: ["dose", "titration", "wearing off", "side effects", "already diagnosed", "diagnosed already"] },
    { label: "Baseline physical screening", terms: ["heart", "cardiac", "cardiovascular", "blood pressure", "baseline", "bloods", "safe"] },
    { label: "Complex mental-health shared care", terms: ["ptsd", "bipolar", "psychiatrist", "psychiatric"] },
    { label: "Anxiety and mood differential", terms: ["antidepressant", "treated for anxiety", "wrong diagnosis", "misdiagnosed", "differential"] },
    { label: "Trauma-informed care", terms: ["trauma history", "trauma-informed", "boundaries", "permission", "stay in control", "difficult childhood"] },
    { label: "Substance history held safely", terms: ["substance", "drinking", "alcohol", "cannabis", "addict", "non-stimulant"] },
    { label: "Non-medication supports", terms: ["without medication", "no medication", "not just medication", "alternatives", "coaching", "habits"] },
    { label: "Study or workplace adjustments", terms: ["employer", "workplace", "university", "study", "adjustments", "letter", "documentation", "ndis"] },
    { label: "Psychological safety", terms: ["mental health", "emotion", "anxiety", "anxious", "mood", "psychological", "trauma", "depression", "overwhelmed", "shame", "rejection sensitivity"] },
    { label: "Language match", terms: ["tamil", "malayalam", "hindi", "punjabi", "spanish", "arabic", "vietnamese", "mandarin", "language"] },
    { label: "Disability rights", terms: ["disability", "disabled", "wheelchair", "autonomy", "accessible"] },
    { label: "Telehealth", terms: ["telehealth", "remote", "online", "cannot travel", "can’t travel", "can't travel"] },
    { label: "Woman GP", terms: ["woman", "women", "female"] },
    { label: "Cultural understanding", terms: ["indian", "culture", "cultural", "family", "family pressure", "lazy", "not real"] },
    { label: "Longer conversations", terms: ["time", "unhurried", "longer", "explain", "slowly"] },
  ];

  return priorities
    .filter((priority) => priority.terms.some((term) => words.includes(term)))
    .map((priority) => priority.label)
    .slice(0, 4);
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
        Early demo in Western Sydney. Availability is synthetic, and every profile except
        Dr Saxena’s describes an invented clinician.
      </p>
    </aside>
  );
}

/**
 * A material interest, rendered beside the listing that carries it.
 *
 * Deliberately not a tooltip, not a footnote and not collapsed: a disclosure a reader has to open
 * is a disclosure the product can claim to have made and most people will never see. It sits in
 * the reading order immediately after the clinician's name, which is the only place it changes
 * what somebody does next.
 */
/**
 * The NSW training, rendered as what it is: the clinician's own statement.
 *
 * "Says they have completed" rather than "has completed", because there is no register this
 * product can check it against. W193's whole distinction is between a fact a reader can verify
 * and a claim they are being asked to take on trust, and rendering the second as the first is the
 * failure that module exists to prevent. The wording is the disclosure.
 */
function NswTraining({ clinician }: { clinician: Clinician }) {
  if (!clinician.nswAdhdTrained) return null;

  return (
    <p className="declared-claim">
      Says they have completed the NSW training to carry ADHD care without ongoing psychiatrist
      involvement. This has not been verified.
    </p>
  );
}

function FounderDisclosure({ clinician }: { clinician: Clinician }) {
  if (!clinician.founderInterest) return null;

  return (
    <aside className="founder-disclosure" aria-label="Disclosure">
      <strong>Disclosure</strong>
      <p>{clinician.founderInterest}</p>
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
 * `Clinician.image` is nullable on purpose and this is the component that makes that cheap. The
 * synthetic demo personas have synthetic portraits; a real clinician's likeness is theirs to
 * supply, and nothing in this tree generates a face for a real person. A monogram is a real
 * directory pattern rather than a placeholder waiting to be filled, so the layout is correct in
 * both states and no surface has to branch.
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
      // The name is already beside this in every consumer, so the monogram is decorative. Giving
      // it a label would make a screen reader read the same name twice, once as two letters.
      aria-hidden="true"
    >
      {initialsOf(clinician.name)}
    </span>
  );
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
  const [matchingStep, setMatchingStep] = useState(0);
  const [selectedTime, setSelectedTime] = useState("");
  // Speech state. `heard` is the live transcript, so the screen shows words as they arrive; that
  // is the only reliable signal to somebody that the microphone is actually working.
  // Where the person says they are. A typed suburb or postcode, never the device's location: no
  // permission prompt, and no coordinate leaves the browser.
  const [place, setPlace] = useState("");
  const origin: SuburbPoint | null = useMemo(() => resolvePlace(place), [place]);
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
    if (stage !== "matching") return;
    setMatchingStep(0);
    const stepTimer = window.setInterval(() => {
      setMatchingStep((current) => Math.min(current + 1, matchingSteps.length - 1));
    }, 1400);
    const timer = window.setTimeout(() => setStage("match"), 4250);
    return () => {
      window.clearInterval(stepTimer);
      window.clearTimeout(timer);
    };
  }, [stage]);

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
  const requestPriorities = useMemo(() => getRequestPriorities(request), [request]);
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
        setRequest(text);
        setDraft(text);
        setStage("review");
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
    setStage("matching");
  }

  function moveMatch(direction: 1 | -1) {
    setMatchDirection(direction);
    setMatchIndex((current) => (current + direction + matches.length) % matches.length);
  }

  function chooseClinician(selected: Clinician, destination: "match" | "profile" = "profile") {
    const index = matches.findIndex((item) => item.id === selected.id);
    if (index >= 0) setMatchIndex(index);
    setMatchDirection(1);
    setStage(destination);
  }

  function reset() {
    setStage("welcome");
    setDraft("");
    setRequest(archetype.request);
    setMatches(rankClinicians(archetype.request));
    setMatchIndex(0);
    setMatchDirection(1);
    setSelectedTime("");
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
    setSelectedTime("");
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
              <Pressable className="mic-button" type="button" onClick={startListening} aria-label="Start voice description">
                <Microphone size={38} weight="light" aria-hidden="true" />
                <span>Talk for 20 seconds</span>
              </Pressable>

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
                setRequest(draft);
                setStage("review");
              }}>
                Continue
              </Pressable>
              <p>Don’t include identifying or urgent health details.</p>
            </div>
          </MotionScreen>
        )}

        {stage === "review" && (
          <MotionScreen key="review" className="review-screen">
            <header className="minimal-header">
              <Wordmark />
              <button className="text-action" type="button" onClick={reset}>Start over</button>
            </header>

            <div className="review-content">
              <p className="eyebrow">What matters to you</p>
              <h1>{requestHeadline}</h1>
              {requestHeadline !== requestSummary && (
                <p className="review-transcript">“{requestSummary}”</p>
              )}
              {/* Where they are. Asked here rather than up front because it is the second question,
                  and asked as a typed suburb rather than a geolocation prompt. Optional: a blank
                  field ranks on stated preference alone rather than blocking the search. */}
              <div className="place-field">
                <label htmlFor="place">Where are you? Suburb or postcode, if you like.</label>
                <input
                  id="place"
                  name="place"
                  list="covered-suburbs"
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  placeholder="Blacktown"
                  autoComplete="address-level2"
                />
                <datalist id="covered-suburbs">
                  {coveredSuburbs().map((suburb) => <option key={suburb} value={suburb} />)}
                </datalist>
                <p className="place-status" role="status">
                  {place.trim() === ""
                    ? "Leave it blank and we will match on what you asked for."
                    : origin
                      ? `Matching around ${origin.suburb} ${origin.postcode}.`
                      : "We do not cover that one yet, so we will match on what you asked for."}
                </p>
              </div>

              {requestPriorities.length > 0 && (
                <div className="priority-list" aria-label="Matching priorities">
                  {requestPriorities.map((priority, index) => (
                    <motion.span
                      key={priority}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.11 + index * 0.055, duration: 0.28 }}
                    >
                      {priority}
                    </motion.span>
                  ))}
                </div>
              )}
              <button className="refine-line" type="button" onClick={() => {
                setDraft(request);
                setStage("type");
              }}>
                <Waveform size={34} weight="light" aria-hidden="true" />
                <span>Refine</span>
                <PencilSimple size={18} weight="light" aria-hidden="true" />
              </button>
            </div>

            <div className="bottom-action">
              <Pressable className="primary-button" type="button" onClick={() => findMatches(request)}>Show my matches</Pressable>
              <p>We’ll show fit reasons, not ratings.</p>
            </div>
          </MotionScreen>
        )}

        {stage === "matching" && (
          <MotionScreen key="matching" className="matching-screen">
            <Wordmark />
            <motion.div
              className="matching-core"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="matching-wave"
                animate={{ opacity: [0.45, 1, 0.45], scaleX: [0.84, 1, 0.84] }}
                transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
              >
                <WaveformMark />
              </motion.div>
              <h1>Finding the right fit…</h1>
              <AnimatePresence mode="wait">
                <motion.p
                  key={matchingStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.24 }}
                >
                  {matchingSteps[matchingStep]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </MotionScreen>
        )}

        {stage === "match" && (
          <MotionScreen key="match" className="match-screen">
            <header className="minimal-header match-header">
              <Wordmark />
              <button className="match-count" type="button" onClick={() => setStage("all")}>
                {matchIndex + 1} of {matches.length}
                <List size={17} weight="regular" aria-hidden="true" />
              </button>
            </header>

            <div className="request-banner">
              <p className="eyebrow">You asked for</p>
              <h1>{requestHeadline}</h1>
              <button className="refine-compact" type="button" onClick={() => {
                setDraft(request);
                setStage("type");
              }}>
                <WaveformMark />
                <span>Refine</span>
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false} custom={matchDirection}>
              <motion.div
                className="match-result-motion"
                key={clinician.id}
                custom={matchDirection}
                variants={matchVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <motion.div
                  className="match-portrait"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.12}
                  style={{ touchAction: "pan-y" }}
                  whileDrag={{ scale: 0.992 }}
                  onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.x) > 55 || Math.abs(info.velocity.x) > 450) {
                      moveMatch(info.offset.x < 0 ? 1 : -1);
                    }
                  }}
                >
                  <ClinicianPortrait clinician={clinician} variant="fill" />
                  <button className="portrait-nav previous" type="button" onClick={() => moveMatch(-1)} aria-label="Previous match">
                    <CaretLeft size={24} weight="light" aria-hidden="true" />
                  </button>
                  <button className="portrait-nav next" type="button" onClick={() => moveMatch(1)} aria-label="Next match">
                    <CaretRight size={24} weight="light" aria-hidden="true" />
                  </button>
                </motion.div>

                <div className="match-details">
                  <h2>{clinician.name}</h2>
                  <p className="clinician-meta">
                    {clinician.title} · {clinician.suburb}
                    {distanceTo(clinician, origin) && <span className="clinician-distance">{distanceTo(clinician, origin)}</span>}
                  </p>
                  <NswTraining clinician={clinician} />
                  <FounderDisclosure clinician={clinician} />
                  <p className="match-reason">{personalizedMatch.reason}</p>
                  <div className="practical-signal-row" aria-label="Practical appointment details">
                    {clinician.practicalSignals.slice(0, 2).map((signal) => <span key={signal}>{signal}</span>)}
                  </div>
                  <p className="availability">Accepting new patients · Next: {clinician.nextAvailable.split(",")[0]}</p>
                  <Pressable className="primary-button" type="button" onClick={() => setStage("profile")}>
                    View profile <CaretRight size={18} weight="bold" aria-hidden="true" />
                  </Pressable>
                </div>
              </motion.div>
            </AnimatePresence>
          </MotionScreen>
        )}

        {stage === "all" && (
          <MotionScreen key="all" className="all-screen">
            <header className="minimal-header">
              <button className="icon-button" type="button" onClick={() => setStage("match")} aria-label="Back to current match">
                <ArrowLeft size={25} weight="light" aria-hidden="true" />
              </button>
              <Wordmark />
              <span className="header-spacer" />
            </header>
            <div className="all-heading">
              <p className="eyebrow">Tailored for you</p>
              <h1>{matches.length} GPs to explore</h1>
            </div>
            <div className="clinician-list">
              {matches.map((item, index) => {
                const itemMatch = getPersonalizedMatch(item, request);
                return (
                  <motion.button
                  key={item.id}
                  className="clinician-row"
                  type="button"
                  onClick={() => chooseClinician(item)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.045, 0.24), duration: 0.3 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <ClinicianPortrait clinician={item} variant="thumb" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{itemMatch.signals.slice(0, 2).join(", ") || item.focus} · {item.suburb}</small>
                    <small className="row-practical">{item.practicalSignals.slice(0, 2).join(" · ")}</small>
                    <small className="row-availability">Next: {item.nextAvailable}</small>
                  </span>
                  <CaretRight size={20} weight="light" aria-hidden="true" />
                  </motion.button>
                );
              })}
            </div>
          </MotionScreen>
        )}

        {stage === "profile" && (
          <MotionScreen key="profile" className="profile-screen">
            <header className="minimal-header profile-header">
              <button className="icon-button" type="button" onClick={() => setStage("match")} aria-label="Back to matches">
                <ArrowLeft size={25} weight="light" aria-hidden="true" />
              </button>
              <Wordmark />
              <button className="text-action" type="button" onClick={() => setStage("all")}>All matches</button>
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
              <p className="eyebrow">Why this fit</p>
              <h1>{clinician.name}</h1>
              <p className="clinician-meta">{clinician.title}, {clinician.pronouns} · {clinician.suburb}</p>
              <NswTraining clinician={clinician} />
              <FounderDisclosure clinician={clinician} />
              {personalizedMatch.signals.length > 0 && (
                <div className="fit-signal-row profile-fit-signals" aria-label="Key match reasons">
                  {personalizedMatch.signals.slice(0, 3).map((signal) => <span key={signal}>{signal}</span>)}
                </div>
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
                <span>Next available</span>
                <strong>{clinician.nextAvailable}</strong>
              </div>
              <Pressable className="primary-button" type="button" onClick={() => setStage("booking")}>Request appointment</Pressable>
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

            <div className="booking-content">
              <p className="eyebrow">Request an appointment</p>
              <h1>Choose a time with {clinician.shortName}</h1>
              <p>The practice will confirm the request. No medical details are sent here.</p>
              <div className="time-list" role="radiogroup" aria-label="Available appointment times">
                {[clinician.nextAvailable, "Wednesday, 2:10 pm", "Friday, 9:40 am"].map((time, index) => (
                  <motion.button
                    key={time}
                    type="button"
                    role="radio"
                    aria-checked={selectedTime === time}
                    className={selectedTime === time ? "selected" : ""}
                    onClick={() => setSelectedTime(time)}
                    initial={{ opacity: 0, y: 9 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.06, duration: 0.28 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {time}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="bottom-action">
              <Pressable className="primary-button" type="button" disabled={!selectedTime} onClick={() => setStage("confirmed")}>Send request</Pressable>
              <p>Demo only. Nothing will be sent.</p>
            </div>
          </MotionScreen>
        )}

        {stage === "confirmed" && (
          <MotionScreen key="confirmed" className="confirmed-screen">
            <Wordmark />
            <div>
              <motion.div
                className="confirmation-icon"
                initial={{ opacity: 0, scale: 0.76 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 320, damping: 20 }}
              >
                <CheckCircle size={58} weight="light" aria-hidden="true" />
              </motion.div>
              <p className="eyebrow">Request ready</p>
              <h1>{selectedTime}</h1>
              <p>In the live product, {clinician.name}’s practice would confirm this time with you.</p>
            </div>
            <Pressable className="primary-button" type="button" onClick={reset}>Find another GP</Pressable>
          </MotionScreen>
        )}
          </AnimatePresence>
        </section>
      </main>
    </MotionConfig>
  );
}
