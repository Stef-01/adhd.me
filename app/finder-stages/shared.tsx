"use client";

// O95 (refactor lane, queue item 1): the finder's shared pieces, extracted from the
// 1,253-line care-finder.tsx so each stage can live in its own file. NOTHING here is new:
// every component, comment and constant moved verbatim — the RCA comments are the tree's
// memory of paid-for lessons and move intact (the lane's law). The orchestrator
// (app/care-finder.tsx) keeps the state machine and the speech session; stages receive
// state and named handlers as props, lifted plainly.

import Image from "next/image";
import Link from "next/link";
import { Waveform } from "@phosphor-icons/react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { type ComponentProps, type ReactNode } from "react";
import { type Clinician } from "@/demo/clinicians";

/**
 * Seven screens, down from eleven.
 *
 * `review`, `matching`, `match` and `all` collapsed into `results` in the first minimalism round:
 * a confirmation step, a fake loading animation and two competing views of the same list. See the
 * note above the results screen for what each one was and why it went.
 */
export type Stage =
  | "welcome"
  | "scenarios"
  | "listening"
  | "type"
  | "results"
  | "profile"
  // O102: the compare, reached from a profile and returning to it.
  | "compare"
  | "booking";

export const stageVariants: Variants = {
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

export const reducedStageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// Welcome intro: children rise in sequence under the screen-level fade.
export const introStagger: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const introItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export function MotionScreen({ className, children }: { className: string; children: ReactNode }) {
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

export function Pressable(props: ComponentProps<typeof motion.button>) {
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
export function getRequestHeadline(value: string, fallback: string) {
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

export function Wordmark() {
  return <Link href="/" className="wordmark finder-wordmark" aria-label="ADHD.ME, back to main home">ADHD.ME</Link>;
}

export function FinderContext() {
  return (
    <aside className="finder-context">
      {/* "All profiles are synthetic" stopped being true when an owner joined the roster, and a
          disclaimer that is nearly true is worse than none: it is the sentence a reader relies on. */}
      <p>
        Early demo in Beecroft and on the Gold Coast. Availability is synthetic, and every profile except
        Dr Saxena’s describes an invented clinician.
      </p>
    </aside>
  );
}

export function WaveformMark({ active = false }: { active?: boolean }) {
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
export function distinguishingSignals(signals: string[], everyone: string[][]): string[] {
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
export function ClinicianPortrait({
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
export function NswTraining({ clinician }: { clinician: Clinician }) {
  if (!clinician.nswAdhdTrained) return null;
  return <p className="credential-line">NSW ADHD training</p>;
}

/**
 * A material interest, stated beside the listing it concerns. One line, not an essay.
 *
 * O158: the label comes FROM THE ENTRY now. It was hardcoded — first "Co-founder of ADHD.ME", then
 * "Owner of ADHD.ME" — and a single fixed string spoke for two people whose relationships are not
 * the same. Dr Saxena owns his clinic and is ADHD.ME's first clinic partner; he does not own the
 * entity, and the hardcoded badge is what let that error render under his name.
 */
export function OwnershipDisclosure({ clinician }: { clinician: Clinician }) {
  if (!clinician.disclosedInterest || !clinician.disclosedInterestLabel) return null;
  return <p className="disclosure-line">{clinician.disclosedInterestLabel}</p>;
}
