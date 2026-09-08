// The ten-question onboarding (PRD §8–§10): the questions as data, the answer shape, and what the
// first screen after it says.
//
// EDUCATION FIRST, NOT INTAKE. Nothing here is a symptom scale and nothing produces a score. The
// questions ask where a person is, what feels hardest, what sounds familiar, where it lands, how
// much it is affecting life right now, when it gets easier, what they would like to improve first,
// and how they want to use the app. The output is a recommended first module and a sentence about
// their priority — never a number about them. The copy is held to the patient linters by the test.

import type { Domain, Subdomain } from "./layers";

export type Stage = "have-assessment" | "being-assessed" | "think-so" | "supporting" | "learning";
export type Hardest =
  | "starting" | "finishing" | "work" | "study" | "relationships" | "organisation" | "emotions"
  | "sleep" | "exercise" | "food" | "money" | "medication" | "overwhelmed";
export type Familiar = "cannot-start" | "forget" | "rely-on-deadlines" | "distracted" | "overwhelmed" | "motivation" | "none";
export type Affects = "work" | "study" | "home" | "relationships" | "health" | "wellbeing" | "several";
export type Easier = "urgent" | "interested" | "structure" | "alongside" | "slept" | "exercise" | "clear" | "not-really" | "not-sure";
export type Medication = "yes" | "no" | "previously" | "prefer-not";
export type LookingFor = "understand" | "try" | "professional" | "unsure";
export type Depth = "short" | "medium" | "deep";

export interface OnboardingAnswers {
  stage?: Stage;
  hardest?: Hardest[];
  familiar?: Familiar;
  affects?: Affects;
  /** 0–10. */
  impact?: number;
  easier?: Easier[];
  /** One of `improveOptions(answers)`' ids, or "other". */
  improveFirst?: string;
  medication?: Medication;
  lookingFor?: LookingFor;
  depth?: Depth;
  /** ISO datetime, set when the last screen is passed. */
  completedAt?: string;
}

export interface Option<T extends string = string> {
  readonly id: T;
  readonly label: string;
}

export interface OnboardingQuestion {
  readonly key: keyof Omit<OnboardingAnswers, "completedAt">;
  readonly prompt: string;
  readonly kind: "single" | "multi" | "scale";
  readonly options?: readonly Option[];
  /** Multi-select ceiling. */
  readonly max?: number;
  readonly skippable: boolean;
  /** A line under the prompt, when the question needs one. */
  readonly note?: string;
}

export const HARDEST_OPTIONS: readonly Option<Hardest>[] = [
  { id: "starting", label: "Starting things" },
  { id: "finishing", label: "Finishing things" },
  { id: "work", label: "Work" },
  { id: "study", label: "Study" },
  { id: "relationships", label: "Relationships" },
  { id: "organisation", label: "Organisation" },
  { id: "emotions", label: "Emotions" },
  { id: "sleep", label: "Sleep" },
  { id: "exercise", label: "Exercise" },
  { id: "food", label: "Food" },
  { id: "money", label: "Money" },
  { id: "medication", label: "Medication" },
  { id: "overwhelmed", label: "Feeling overwhelmed" },
];

export const FAMILIAR_OPTIONS: readonly Option<Familiar>[] = [
  { id: "cannot-start", label: "I know what to do but cannot start" },
  { id: "forget", label: "I forget things constantly" },
  { id: "rely-on-deadlines", label: "I rely on deadlines" },
  { id: "distracted", label: "I become distracted easily" },
  { id: "overwhelmed", label: "I get overwhelmed" },
  { id: "motivation", label: "My motivation feels unpredictable" },
  { id: "none", label: "None of these quite fit" },
];

export const AFFECTS_OPTIONS: readonly Option<Affects>[] = [
  { id: "work", label: "Work" },
  { id: "study", label: "Study" },
  { id: "home", label: "Home" },
  { id: "relationships", label: "Relationships" },
  { id: "health", label: "Health" },
  { id: "wellbeing", label: "Emotional wellbeing" },
  { id: "several", label: "Several equally" },
];

export const EASIER_OPTIONS: readonly Option<Easier>[] = [
  { id: "urgent", label: "When something is due right now" },
  { id: "interested", label: "When I am interested" },
  { id: "structure", label: "When somebody gives me structure" },
  { id: "alongside", label: "When I work alongside someone" },
  { id: "slept", label: "When I have slept well" },
  { id: "exercise", label: "When I exercise regularly" },
  { id: "clear", label: "When tasks are very clear" },
  { id: "not-really", label: "Not really" },
  { id: "not-sure", label: "Not sure" },
];

export const QUESTIONS: readonly OnboardingQuestion[] = [
  {
    key: "stage",
    prompt: "Where are you with ADHD?",
    kind: "single",
    skippable: false,
    options: [
      { id: "have-assessment", label: "I have had an assessment" },
      { id: "being-assessed", label: "Currently being assessed" },
      { id: "think-so", label: "I think I may have ADHD" },
      { id: "supporting", label: "Supporting someone with ADHD" },
      { id: "learning", label: "Just learning" },
    ],
  },
  { key: "hardest", prompt: "What feels hardest right now?", kind: "multi", max: 3, skippable: true, note: "Choose up to three.", options: HARDEST_OPTIONS },
  { key: "familiar", prompt: "What sounds most familiar?", kind: "single", skippable: true, options: FAMILIAR_OPTIONS },
  { key: "affects", prompt: "Where does this affect you most?", kind: "single", skippable: true, options: AFFECTS_OPTIONS },
  { key: "impact", prompt: "How much is this affecting your life right now?", kind: "scale", skippable: true, note: "0 is not at all, 10 is constantly." },
  { key: "easier", prompt: "Are there situations where these difficulties become much easier?", kind: "multi", max: 9, skippable: true, note: "Choose any that apply.", options: EASIER_OPTIONS },
  { key: "improveFirst", prompt: "What would you most like to improve first?", kind: "single", skippable: true },
  {
    key: "medication",
    prompt: "Are you currently taking ADHD medication?",
    kind: "single",
    skippable: true,
    options: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
      { id: "previously", label: "Previously" },
      { id: "prefer-not", label: "Prefer not to say" },
    ],
  },
  {
    key: "lookingFor",
    prompt: "What are you mainly looking for?",
    kind: "single",
    skippable: false,
    options: [
      { id: "understand", label: "Understand myself" },
      { id: "try", label: "Practical things to try" },
      { id: "professional", label: "Professional support" },
      { id: "unsure", label: "Not sure yet" },
    ],
  },
  {
    key: "depth",
    prompt: "How much time do you want to spend at once?",
    kind: "single",
    skippable: false,
    options: [
      { id: "short", label: "2 to 5 minutes" },
      { id: "medium", label: "Around 10 minutes" },
      { id: "deep", label: "I want to go deeper" },
    ],
  },
];

/**
 * A goal a person might choose first — generated from Q2–Q5 (PRD §9 Q7). Each carries the
 * domain and subdomain it is about, which is what lets the goal become the model's first need.
 */
export interface ImproveOption extends Option {
  readonly domain: Domain;
  readonly subdomain: Subdomain;
}

const GOALS: ReadonlyArray<ImproveOption & { when: (a: OnboardingAnswers) => boolean }> = [
  { id: "start-earlier", label: "Start assignments and work earlier", domain: "work-study", subdomain: "activation", when: (a) => has(a, "starting") || a.familiar === "cannot-start" || a.familiar === "rely-on-deadlines" },
  { id: "finish-things", label: "Finish what I start", domain: "work-study", subdomain: "switching", when: (a) => has(a, "finishing") },
  { id: "reduce-work-overwhelm", label: "Reduce work overwhelm", domain: "work-study", subdomain: "workload", when: (a) => has(a, "work") || a.affects === "work" },
  { id: "study-structure", label: "Get study under control", domain: "work-study", subdomain: "study-context", when: (a) => has(a, "study") || a.affects === "study" },
  { id: "communicate-partner", label: "Communicate better with the people close to me", domain: "relationships", subdomain: "partner", when: (a) => has(a, "relationships") || a.affects === "relationships" },
  { id: "more-organised", label: "Become more organised", domain: "daily-life", subdomain: "living-environment", when: (a) => has(a, "organisation") || a.familiar === "forget" || a.affects === "home" },
  { id: "understand-procrastination", label: "Understand why I procrastinate", domain: "understand", subdomain: "activation", when: (a) => a.familiar === "cannot-start" || a.familiar === "motivation" },
  { id: "steadier-emotions", label: "Feel less overwhelmed", domain: "mind-emotions", subdomain: "emotional-regulation", when: (a) => has(a, "emotions") || has(a, "overwhelmed") || a.familiar === "overwhelmed" || a.affects === "wellbeing" },
  { id: "better-sleep", label: "Sleep more regularly", domain: "sleep-body", subdomain: "sleep", when: (a) => has(a, "sleep") },
  { id: "keep-exercising", label: "Keep exercise going", domain: "sleep-body", subdomain: "movement", when: (a) => has(a, "exercise") },
  { id: "eat-regularly", label: "Eat more regularly", domain: "sleep-body", subdomain: "appetite", when: (a) => has(a, "food") },
  { id: "money-admin", label: "Stay on top of money and admin", domain: "daily-life", subdomain: "living-environment", when: (a) => has(a, "money") },
  { id: "medication-picture", label: "Understand what medication does and does not change", domain: "sleep-body", subdomain: "medication-experience", when: (a) => has(a, "medication") },
  { id: "less-distracted", label: "Stay with one thing longer", domain: "understand", subdomain: "attention", when: (a) => a.familiar === "distracted" },
];

function has(a: OnboardingAnswers, h: Hardest): boolean {
  return (a.hardest ?? []).includes(h);
}

/** Q7's options: the goals Q2–Q5 make plausible, at most five, then "Something else". Never empty. */
export function improveOptions(answers: OnboardingAnswers): ImproveOption[] {
  const fitting = GOALS.filter((g) => g.when(answers)).slice(0, 5);
  const list = fitting.length > 0 ? fitting : [GOALS[0]!, GOALS[6]!, GOALS[5]!];
  return list.map(({ when: _when, ...rest }) => rest);
}

export function improveOption(id: string | undefined): ImproveOption | null {
  if (!id) return null;
  const found = GOALS.find((g) => g.id === id);
  if (!found) return null;
  const { when: _when, ...rest } = found;
  return rest;
}

export function isComplete(answers: OnboardingAnswers | null | undefined): answers is OnboardingAnswers & { completedAt: string } {
  return Boolean(answers?.completedAt);
}

/** How many of the ten have an answer (skips count as passed only once the flow moved on). */
export function questionIndexFor(key: OnboardingQuestion["key"]): number {
  return QUESTIONS.findIndex((q) => q.key === key);
}
