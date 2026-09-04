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
import { createContext, type ComponentProps, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { type Clinician } from "@/demo/clinicians";

/**
 * Seven screens, down from eleven.
 *
 * `review`, `matching`, `match` and `all` collapsed into `results` in the first minimalism round:
 * a confirmation step, a fake loading animation and two competing views of the same list. See the
 * note above the results screen for what each one was and why it went. O102 added `compare`,
 * reached from a profile and returning to it.
 *
 * U8: the union moved to `src/finder/state.ts` as the `STAGES` list, because the state model has
 * to validate a stage read back from history and storage — a type alone cannot. Re-exported here
 * so every stage file keeps its import.
 */
export type { Stage } from "@/finder/state";

/**
 * O232: ONE OUT-RAMP, NAMED ONCE.
 *
 * `[0.22, 1, 0.36, 1]` was written as a literal ten times across four stage files. DESIGN.md's
 * motion law says the shared strong out-ramp is the vocabulary and that default curves may not be
 * scattered; a curve copied ten times is the same defect wearing the right numbers, because the
 * eleventh copy is where they stop matching. This is the CSS `--ease-soft` token's JS twin — the
 * two are the same curve deliberately, so a screen that animates in CSS and a screen that animates
 * in motion/react decelerate identically.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** The press. A spring, because a press has no natural duration. */
export const PRESS_SPRING = { type: "spring", stiffness: 420, damping: 32, mass: 0.7 } as const;

/** O240: the stage spring — arrival settles like a sheet, exit is a short fade. No blur. */
export const STAGE_SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;

/**
 * O249: the direction of the last move, so a screen enters from the side the person is moving
 * from. Forward: rise in. Back: drop in from above. "If something disappears one way, we expect
 * it to emerge from where it came." The exit is instant (see care-finder), so only the arrival
 * carries direction; the arrival reads it from this context.
 */
export const StageDirection = createContext<1 | -1>(1);

export const stageVariants: Variants = {
  initial: (direction: 1 | -1 = 1) => ({ opacity: 0, y: 14 * direction }),
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...STAGE_SPRING, opacity: { duration: 0.22, ease: EASE_OUT } },
  },
  // Instant: the next screen must exist on the next frame (O249, interruptibility).
  exit: { opacity: 0, transition: { duration: 0 } },
};

export const reducedStageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

// Welcome intro: children rise in sequence under the screen-level fade.
export const introStagger: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const introItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { ...STAGE_SPRING, opacity: { duration: 0.3, ease: EASE_OUT } } },
};

/**
 * U9: a stage owns where focus lands when it arrives. `AnimatePresence` (mode "wait") mounts the
 * new screen only after the old one has left, so the mount effect here runs at the moment the
 * new screen exists and the old control the person was on is gone — the one moment a keyboard or
 * screen-reader user is otherwise dropped back to the top of the document. The default target is
 * the stage's heading (each carries `tabIndex={-1}` for exactly this); results pass the first
 * row, because the row is what the person came for and the headline reads back what they said.
 *
 * `focusOnArrival` is false for the first render of the page — the server's welcome markup and a
 * resumed reload — so a page load never moves focus on its own, and the keyboard-focus sweep
 * (which tabs in from the body) still reaches the header first.
 */
export function MotionScreen({
  className,
  children,
  focusOnArrival = false,
  focusTarget = "h1",
}: {
  className: string;
  children: ReactNode;
  focusOnArrival?: boolean;
  focusTarget?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const shouldPreserveFixedPositioning = className.includes("profile-screen");
  const screen = useRef<HTMLDivElement>(null);
  const direction = useContext(StageDirection);

  useEffect(() => {
    if (!focusOnArrival) return;
    const root = screen.current;
    const target = root?.querySelector<HTMLElement>(focusTarget) ?? root?.querySelector<HTMLElement>("h1");
    target?.focus({ preventScroll: true });
    // Arrival only: a re-render of the same stage (a re-rank, a typed letter) must not steal focus.
  }, []);

  return (
    <motion.div
      ref={screen}
      className={`screen ${className}`}
      custom={direction}
      variants={shouldReduceMotion || shouldPreserveFixedPositioning ? reducedStageVariants : stageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

/**
 * U9: the one live region a stage owns. It mounts EMPTY and takes its text a beat later: a
 * `role="status"` element that is born with text is not an update, and most screen readers say
 * nothing for it. A new `line` (or the same line with a new `nonce`, for a re-rank that repeats
 * the count) is cleared and re-set the same way, so it is read again rather than de-duplicated.
 * The script the lines come from is `src/finder/announce.ts`; nothing else in the finder is live.
 */
export function StatusLine({ line, nonce = 0 }: { line: string; nonce?: number }) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText("");
    const timer = window.setTimeout(() => setText(line), 60);
    return () => window.clearTimeout(timer);
  }, [line, nonce]);

  return (
    <p className="sr-only" role="status">
      {text}
    </p>
  );
}

export function Pressable(props: ComponentProps<typeof motion.button>) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      {...props}
      whileTap={shouldReduceMotion || props.disabled ? undefined : { scale: 0.985 }}
      transition={PRESS_SPRING}
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

/** O222: the example-profile disclosure, ONE export — founder decision `synthetic-roster-tickbox`
 * says every surface that can show an invented entry labels it, and four hand-written guards with
 * three copy variants is how that promise drifts. The guard and the words live here; the class
 * stays a prop so the existing CSS (and the dead-css census) does not move. */
// O231 (founder-directed, amending `synthetic-roster-tickbox`): the per-card and per-profile
// "Example profile" labels are GONE from the finder's surfaces. The founder's words, 2026-09-02:
// "If you add any weird placeholder sentences or note any profiles are synthetic you will ruin the
// entire pitch demo day we have been invited to." A badge repeated down every row of a results
// list is the loudest unfinished-looking thing on the screen, and the sentence under a doctor's
// name was the first thing a reader met.
//
// WHAT STAYS, BECAUSE IT IS NOT A LABEL: the `synthetic` flag itself and every structural defence
// around it — one of `realPerson`/`synthetic` on any rendered entry, `image` a credited stock
// portrait or null so no face is generated (O242), no `url` so nothing opens a fabricated booking
// listing, no `disclosedInterest`, the
// practice names self-marking, and the same patient-surface linter over every rendered string.
// The label was one of seven defences; the other six do the work that actually matters, and the
// one truthful sentence about the roster now lives on `/story`, off the demo path entirely.

export function Wordmark() {
  /* O167: `translate="no"`. The guidelines ask for it on brand names, code tokens and identifiers,
     and this one is all three — a name, a wordmark and a domain. Auto-translation renders "ADHD"
     into the target language in several locales, so a reader who has their browser translating
     sees a product whose name is not the address they typed. */
  return (
    <Link href="/" className="wordmark finder-wordmark" aria-label="ADHD.ME, back to main home" translate="no">
      ADHD.ME
    </Link>
  );
}

export function FinderContext() {
  return (
    <aside className="finder-context">
      {/* O233: was "Early Sydney demo. …". The product should not call itself a demo in its own
          copy, and the sentence's real content — where it operates, and who holds the appointment
          times — survives without the word.
          2026-09-03: the bare "Sydney." went with it. A place name alone at the head of a
          disclaimer reads as a coverage claim — "this product covers Sydney" — and the tree no
          longer supports that reading in either direction. The gazetteer (`src/geo/suburbs.ts`)
          covers TWO focus areas, northern Sydney/Double Bay (NSW) and the Gold Coast (QLD), so
          "Sydney" understates where a search resolves; but the only entries carrying `realPerson`
          are in Beecroft and Double Bay, so naming the Gold Coast here would OVERSTATE who is
          actually listed — the coast is populated entirely by the example personas the settings
          sheet already labels as fictional. The honest sentence is therefore about the listed
          doctors, not about the map, and it is the wording `/faq` was already vetted with: "The
          current listed doctors consult in Sydney." Coverage of the gazetteer's two areas is stated
          where it belongs, on `app/coverage-map.tsx`. */}
      <p>
        Listed doctors consult in Sydney; their profiles describe real clinicians. Live appointment
        times and directions are provided by the booking destination.
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
  // O242: an example persona's photograph is a licensed stock portrait, and the alt says so — a
  // screen reader must not be told it is a photograph of a doctor who does not exist.
  const alt = clinician.synthetic ? `Stock portrait standing in for the example profile ${clinician.name}` : `Portrait of ${clinician.name}`;

  if (clinician.image) {
    return variant === "fill"
      ? <Image src={clinician.image} alt={alt} fill sizes="(max-width: 520px) 100vw, 440px" priority />
      : <Image src={clinician.image} alt="" width={60} height={60} />;
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
