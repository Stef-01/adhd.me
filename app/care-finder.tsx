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
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { careArchetypes } from "@/demo/care-archetypes";
import { clinicians, getPersonalizedMatch, rankClinicians, type Clinician } from "@/demo/clinicians";

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

function getRequestHeadline(value: string, fallback: string) {
  const words = value.toLowerCase();
  const hasPcos = words.includes("pcos") || words.includes("pmos") || words.includes("polycystic");
  const hasGestationalDiabetes = words.includes("gestational diabetes") || words.includes("pregnancy diabetes");
  const hasPostBirth = ["post-birth", "post birth", "postpartum", "after birth", "giving birth"].some((term) =>
    words.includes(term),
  );
  const hasCulturalContext = ["south indian", "indian", "tamil", "malayalam", "culture", "cultural"].some((term) =>
    words.includes(term),
  );
  const hasMaternalDepression = ["maternal depression", "postnatal depression", "depression after birth", "persistently low"].some((term) =>
    words.includes(term),
  );
  const hasComplexMentalHealth = ["ptsd", "bipolar", "psychiatrist", "psychiatric"].some((term) =>
    words.includes(term),
  );
  const hasTraumaContext = ["trauma history", "trauma-informed", "permission", "boundaries"].some((term) =>
    words.includes(term),
  );

  if (words.includes("disability") || words.includes("disabled") || words.includes("wheelchair")) {
    return "Accessible women’s care, on your terms.";
  }
  if (hasMaternalDepression) return "Maternal mental health, without judgement.";
  if (hasComplexMentalHealth) return "Joined-up reproductive and mental-health care.";
  if (hasTraumaContext) return "Trauma-sensitive care, with you in control.";
  if (hasGestationalDiabetes) return "Gestational diabetes with whole-person support.";
  if (hasPostBirth) return "Post-birth health, strength and emotional care.";
  if (hasPcos && hasCulturalContext) return "PMOS, language and emotional safety.";
  if (hasPcos) return "PMOS care without shame or assumptions.";
  return fallback;
}

function getRequestPriorities(value: string) {
  const words = value.toLowerCase();
  const priorities = [
    { label: "Gestational diabetes", terms: ["gestational diabetes", "pregnancy diabetes"] },
    { label: "PMOS expertise", terms: ["pcos", "pmos", "polycystic"] },
    { label: "Post-birth recovery", terms: ["post-birth", "post birth", "postpartum", "after birth", "giving birth"] },
    { label: "Complex mental-health shared care", terms: ["ptsd", "bipolar", "psychiatrist", "psychiatric"] },
    { label: "Maternal depression", terms: ["maternal depression", "postnatal depression", "depression after birth", "persistently low"] },
    { label: "Trauma-informed care", terms: ["trauma history", "trauma-informed", "boundaries", "permission", "stay in control"] },
    { label: "Psychological safety", terms: ["mental health", "emotion", "anxiety", "anxious", "mood", "psychological", "trauma", "ptsd", "bipolar", "depression", "overwhelmed", "shame", "boundaries", "permission"] },
    { label: "Language match", terms: ["tamil", "malayalam", "hindi", "punjabi", "spanish", "arabic", "vietnamese", "language"] },
    { label: "Disability rights", terms: ["disability", "disabled", "wheelchair", "autonomy", "accessible"] },
    { label: "Weight-respectful care", terms: ["weight stigma", "body image", "body shame", "without shame", "bounce back"] },
    { label: "Woman GP", terms: ["woman", "women", "female"] },
    { label: "Cultural understanding", terms: ["indian", "culture", "cultural", "family", "family pressure"] },
    { label: "Longer conversations", terms: ["time", "unhurried", "longer", "explain", "slowly"] },
  ];

  return priorities
    .filter((priority) => priority.terms.some((term) => words.includes(term)))
    .map((priority) => priority.label)
    .slice(0, 4);
}

function Wordmark() {
  return <Link href="/" className="wordmark finder-wordmark" aria-label="Meherr, back to main home">Meherr</Link>;
}

function FinderContext() {
  return (
    <aside className="finder-context">
      <p>Early demo in Western Sydney. All clinician profiles and availability are synthetic.</p>
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
  const [elapsed, setElapsed] = useState(0);
  const [selectedTime, setSelectedTime] = useState("");

  const archetype = careArchetypes[archetypeIndex] ?? defaultArchetype;
  const clinician = matches[matchIndex] ?? clinicians[0]!;

  useEffect(() => {
    if (stage !== "listening") return;
    const timer = window.setInterval(() => setElapsed((value) => Math.min(value + 1, 20)), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

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
    setElapsed(0);
    setStage("listening");
  }

  function finishListening() {
    setRequest(archetype.request);
    setDraft(archetype.request);
    setStage("review");
  }

  function findMatches(value = request) {
    const nextRequest = value.trim() || archetype.request;
    setRequest(nextRequest);
    setMatches(rankClinicians(nextRequest));
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
                  <span>PMOS care</span>
                  <em>that gets you.</em>
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
              <p className="example">Health needs, culture, emotional support. Whatever matters to you.</p>
            </div>

            <div className="voice-actions">
              <motion.div
                animate={{ scale: [1, 1.035, 1] }}
                transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
              >
                <Pressable className="mic-button recording" type="button" onClick={finishListening} aria-label="Finish voice description">
                  <Microphone size={38} weight="light" aria-hidden="true" />
                </Pressable>
              </motion.div>
              <WaveformMark active />
              <p className="listening-time">Listening · 0:{elapsed.toString().padStart(2, "0")}</p>
              <button className="text-action" type="button" onClick={finishListening}>Done</button>
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
              <h1>
                <span>PMOS care</span>
                <em>that gets you.</em>
              </h1>
              <label className="sr-only" htmlFor="doctor-request">Describe the GP you want to see</label>
              <textarea
                id="doctor-request"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="For example: A woman GP with PMOS experience who understands South Indian family dynamics."
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
                  <Image
                    src={clinician.image}
                    alt={`Portrait of ${clinician.name}`}
                    fill
                    sizes="(max-width: 520px) 100vw, 440px"
                    priority
                  />
                  <button className="portrait-nav previous" type="button" onClick={() => moveMatch(-1)} aria-label="Previous match">
                    <CaretLeft size={24} weight="light" aria-hidden="true" />
                  </button>
                  <button className="portrait-nav next" type="button" onClick={() => moveMatch(1)} aria-label="Next match">
                    <CaretRight size={24} weight="light" aria-hidden="true" />
                  </button>
                </motion.div>

                <div className="match-details">
                  <h2>{clinician.name}</h2>
                  <p className="clinician-meta">{clinician.title} · {clinician.suburb}</p>
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
                  <Image src={item.image} alt="" width={72} height={72} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{itemMatch.signals.slice(0, 2).join(" · ") || item.focus} · {item.suburb}</small>
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
              <Image src={clinician.image} alt={`Portrait of ${clinician.name}`} fill sizes="(max-width: 520px) 100vw, 440px" priority />
            </motion.div>

            <div className="profile-content">
              <p className="eyebrow">Why this fit</p>
              <h1>{clinician.name}</h1>
              <p className="clinician-meta">{clinician.title} · {clinician.pronouns} · {clinician.suburb}</p>
              {personalizedMatch.signals.length > 0 && (
                <div className="fit-signal-row profile-fit-signals" aria-label="Key match reasons">
                  {personalizedMatch.signals.slice(0, 3).map((signal) => <span key={signal}>{signal}</span>)}
                </div>
              )}
              <div className="practical-signal-row profile-practical-signals" aria-label="Practical appointment details">
                {clinician.practicalSignals.slice(0, 2).map((signal) => <span key={signal}>{signal}</span>)}
              </div>

              <div className="fit-list">
                <p>{personalizedMatch.reason}</p>
                <p>{clinician.appointmentLength}</p>
                <p>{clinician.distance}</p>
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
                <p>{clinician.languages.join(" · ")}</p>
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
