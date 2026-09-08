// Play (docs/adhd-life/PLAY-PLAN.md): a module as a RUN of micro-games.
//
// A run is a title card, six to eight rounds, a recognition round, an insight, one strategy and
// one next action. A round is one mechanic from a closed catalogue, one instruction of at most
// fourteen words, a few seconds, and two result lines — hit and miss — that ARE the teaching.
// There is no paragraph in a run; the long form is the read modules on the shelf.
//
// A miss never costs anything (PRD §34): the bean reacts, one line says why, the run goes on.
// What a run writes to the personal model is exactly what the nine-stage module wrote —
// resonance, the answers its rounds declare, the insight verdict, the experiment — so
// `src/model/needs.ts` sees no difference between a run and a module.

import type { Character, Mood, Prop, Step, Strategy } from "./interactive";
import type { Layer } from "@/model/layers";

export const MECHANICS = ["tap", "dont-tap", "hold", "swipe", "drag-capture", "order", "timing", "recall", "sort", "flip", "pause", "pick-bean", "catch", "balance"] as const;
/** A run must use at least this many distinct mechanics, and at most MAX_TAPS plain tap rounds (PLAY-QA.md). */
export const MIN_MECHANICS = 4;
export const MAX_TAPS = 3;
export type Mechanic = (typeof MECHANICS)[number];

export interface RoundOption {
  readonly id: string;
  readonly label: string;
  /** For `tap` and `order`: the right answer(s). For `order`, options are listed in the right order. */
  readonly correct?: boolean;
  /** For `sort`: the layer this cause belongs to. */
  readonly layer?: Layer;
  /** For `flip` and `pick-bean`: the bean and what it is thinking. */
  readonly bean?: Character;
  readonly thought?: string;
}

export interface Round {
  readonly id: string;
  readonly mechanic: Mechanic;
  /** At most fourteen words. */
  readonly instruction: string;
  /**
   * The clue (founder, 2026-09-08: "make the correct and incorrect make sense with the context
   * and clues in the game — it's impossible to guess"). What the scene shows that makes the hit
   * inferable, the way the clone shows the wires sparking before "don't touch the wires". At most
   * sixteen words, drawn on the scene. REQUIRED on every round that has a right answer, and the
   * result lines must follow from it: a stranger reading the clue can say which option is the hit.
   */
  readonly clue?: string;
  /**
   * The relate beat (founder, 2026-09-08: "then it will ask how much it related to you, sometimes
   * the buttons, other times the Likert scale"). After the result: "How much is this you?" as
   * three buttons or a 0–10 slider. Unset → alternates by round index (`relateFormFor`). "none" →
   * no beat (rounds that already ask about you).
   */
  readonly relate?: RelateForm | "none";
  /** How long the timer runs. Under reduced motion there is no timer. */
  readonly seconds: number;
  readonly who: Character;
  readonly mood?: Mood;
  /** How the bean is drawn in this round: "fit" adds arms and abs (the exercise run). */
  readonly look?: "fit";
  /** `timing`: the marks along the line, in order, the last one being the moment to act (PLAY-QA.md, the sense gate). */
  readonly scale?: readonly string[];
  /** What the bean's label says for hold, timing, pause and balance — the act, in one or two words ("Start", "Walk out"). */
  readonly verb?: string;
  readonly prop?: Prop;
  readonly options?: readonly RoundOption[];
  /** `recall`: the list; `swipe` and `hold`: the distractions; `drag-capture`: the requests; `catch`: what falls and must be caught (`options` are the decoys that fall too). */
  readonly items?: readonly string[];
  /** At most sixteen words each. The teaching. */
  readonly hit: string;
  readonly miss: string;
  /** `pick-bean` and `tap` may record the chosen option as a personalisation answer. */
  readonly writes?: { readonly question: string; readonly multi?: boolean };
}

export interface Run {
  readonly id: string;
  readonly title: string;
  /** Under the title on the card. ≤ 10 words. */
  readonly tagline: string;
  readonly minutes: number;
  readonly bean: Character;
  readonly rounds: readonly Round[];
  /** The recognition round's question (PRD §19). */
  readonly recognition: string;
  readonly insight: Extract<Step, { kind: "insight" }>;
  /** Optional reflection beat (PRD §28), after the insight: one prompt, a few suggestions, type or say it, skip. */
  readonly reflect?: { readonly prompt: string; readonly suggestions: readonly string[] };
  readonly strategy: Strategy;
  readonly next: Extract<Step, { kind: "next" }>;
}

export type RelateForm = "buttons" | "slider";
export const RELATE_FORMS: readonly RelateForm[] = ["buttons", "slider"];
/** The three buttons, as points on the same 0–10 scale the slider writes. */
export const RELATE_BUTTONS: ReadonlyArray<{ readonly id: string; readonly label: string; readonly value: number }> = [
  { id: "not-me", label: "Not me", value: 0 },
  { id: "a-bit", label: "A bit", value: 5 },
  { id: "very-me", label: "Very me", value: 10 },
];
export const RELATE_PROMPT = "How much is this you?";

/** Buttons on even rounds, the slider on odd ones, unless the round says; none on a round that asks about you. */
export function relateFormFor(round: Round, index: number): RelateForm | null {
  if (round.relate === "none" || round.writes) return null;
  if (round.relate) return round.relate;
  return RELATE_FORMS[index % RELATE_FORMS.length]!;
}

/** A round with a right answer is a guess unless the scene says which; the clue is that saying. */
export function needsClue(round: Round): boolean {
  return round.mechanic === "order" || round.mechanic === "sort" || round.mechanic === "recall" || Boolean(round.options?.some((o) => o.correct));
}

export const CLUE_WORDS = 16;

export type RunPhase = "title" | "round" | "recognition" | "insight" | "reflect" | "try" | "next";

function tailOf(run: Run): RunPhase[] {
  return run.reflect ? ["recognition", "insight", "reflect", "try", "next"] : ["recognition", "insight", "try", "next"];
}

/** Title, rounds, recognition, insight, (reflect), try, next. */
export function runStepCount(run: Run): number {
  return run.rounds.length + 1 + tailOf(run).length;
}

export function runPhaseAt(run: Run, step: number): { phase: RunPhase; round?: Round; index?: number } {
  if (step <= 0) return { phase: "title" };
  const n = run.rounds.length;
  if (step <= n) return { phase: "round", round: run.rounds[step - 1], index: step - 1 };
  const tail = tailOf(run);
  return { phase: tail[Math.min(step - n - 1, tail.length - 1)]! };
}

/**
 * Tempo ramp (PLAY-PLAN.md §1.4, founder-approved 2026-09-08): each round runs a little faster
 * than the last — five percent a round, never below seventy percent of the round's own seconds —
 * so a run has a rhythm you can feel. Rounds that write an answer are not ramped: choosing
 * which bean is you is not a race.
 */
export const RAMP_PER_ROUND = 0.05;
export const RAMP_FLOOR = 0.7;

export function rampedSeconds(run: Run, index: number): number {
  const round = run.rounds[index];
  if (!round) return 0;
  if (round.writes) return round.seconds;
  const factor = Math.max(RAMP_FLOOR, 1 - RAMP_PER_ROUND * index);
  return Math.round(round.seconds * factor * 10) / 10;
}

/** Whether the timer running out is a hit (the "don't" mechanics) or a miss. */
/**
 * The "Faster" card (PLAY-PLAN.md §10, founder 2026-09-08): the clone flashes one word between
 * levels as the time limit drops. Ours shows it before every third round, where the ramp has
 * bitten — never before the first round, never before a round that asks about you (those do not
 * ramp), and the player skips it under reduced motion.
 */
export const FASTER_EVERY = 3;
export function fasterBefore(run: Run, index: number): boolean {
  const round = run.rounds[index];
  if (!round || index === 0 || round.writes) return false;
  return index % FASTER_EVERY === 0;
}

/**
 * The rule of each mechanic, said on screen in one line (PLAY-QA.md, the sense gate): what the
 * bar is, and what the tap does. Two readings: with the clock, and under reduced motion.
 */
export const RULES: Readonly<Record<Mechanic, { readonly motion: string; readonly reduced: string }>> = {
  tap: { motion: "Tap one answer.", reduced: "Tap one answer." },
  "dont-tap": { motion: "Do nothing. Let the bar run out.", reduced: "Say whether you held off." },
  hold: { motion: "Press and keep holding until the bar runs out.", reduced: "Say whether you held on." },
  swipe: { motion: "Swipe or tap each one away before the bar runs out.", reduced: "Tap each one away." },
  "drag-capture": { motion: "Tap a thing, then tap the note.", reduced: "Tap a thing, then tap the note." },
  order: { motion: "Tap them in the right order.", reduced: "Tap them in the right order." },
  timing: { motion: "The marker moves along the line. Tap the bean when it reaches the last mark.", reduced: "Choose the moment." },
  recall: { motion: "Read the list, get interrupted, then pick what was on it.", reduced: "Read the list, get interrupted, then pick what was on it." },
  sort: { motion: "Tap a cause, then the layer it belongs to.", reduced: "Tap a cause, then the layer it belongs to." },
  flip: { motion: "Tap each bean to hear its side, then ‘Both are true’.", reduced: "Tap each bean to hear its side, then ‘Both are true’." },
  pause: { motion: "Hold the bean until the heat drops, then let go.", reduced: "Choose the move." },
  "pick-bean": { motion: "Tap the bean that is you.", reduced: "Tap the bean that is you." },
  catch: { motion: "Tap the falling things before they land. Leave the grey ones.", reduced: "Choose what to keep." },
  balance: { motion: "Tap the bean to steady the marker. Keep it in the middle until the bar runs out.", reduced: "Choose the steadying move." },
};

export function expiryIsHit(mechanic: Mechanic): boolean {
  return mechanic === "dont-tap" || mechanic === "hold";
}

export const INSTRUCTION_WORDS = 14;
export const RESULT_WORDS = 16;

export function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Every string a run renders, for the linters. */
export function runText(run: Run): string[] {
  const out = [run.title, run.tagline, run.recognition, run.insight.heading, run.insight.body, ...Object.values(run.insight.byAnswer?.map ?? {}), run.strategy.title, ...run.strategy.steps, run.next.heading, run.next.body, run.reflect?.prompt ?? "", ...(run.reflect?.suggestions ?? [])];
  for (const r of run.rounds) out.push(r.instruction, r.clue ?? "", r.hit, r.miss, ...(r.items ?? []), ...(r.options ?? []).flatMap((o) => [o.label, o.thought ?? ""]));
  return out.filter(Boolean);
}
