// The personal ADHD model's device record — everything the app has learned about this person.
//
// ONE PLACE, ONE KEY, ON THIS DEVICE. `localStorage` under a versioned key, on the same terms as
// the learn progress and the finder's filters: never in a URL, never in a history entry, never in
// a log line or an analytics event. Reflections are free text a person wrote about their own
// life; they live here and reach nothing else (`events.ts` refuses free text by construction).
//
// Pure functions over a storage host, so the model is unit-tested in node with a fake host and
// the React side owns only the wiring. A malformed or older record is treated as empty rather
// than half-read: the version is what lets a later shape refuse an old one.

import { isProfession } from "@/support/professions";
import type { OnboardingAnswers } from "./onboarding";
import { checkSafety, type SafetyRuleId } from "./safety";

export const MODEL_VERSION = 1;
export const MODEL_KEY = `adhdme.model.v${MODEL_VERSION}`;

/** PRD §19: the three resonance answers, stored separately. */
export type Frequency = "often" | "sometimes" | "rarely" | "unsure";
export type Priority = "yes" | "maybe" | "no";

export interface Resonance {
  frequency?: Frequency;
  /** 0–10. */
  cost?: number;
  priority?: Priority;
  at: string;
}

export type InsightVerdict = "yes" | "partly" | "no";

export type ExperimentOutcome = "a-lot" | "a-little" | "no" | "didnt-try";

export interface Experiment {
  /** The strategy id, from the module that offered it. */
  strategyId: string;
  moduleId: string;
  acceptedAt: string;
  outcome?: ExperimentOutcome;
  outcomeAt?: string;
}

export interface Reflection {
  moduleId: string;
  text: string;
  at: string;
}

export interface SafetyEvent {
  ruleId: SafetyRuleId;
  at: string;
  /** Set once the person has seen the safety screen and chosen to continue. */
  acknowledgedAt?: string;
}

export interface ModelRecord {
  v: typeof MODEL_VERSION;
  onboarding: OnboardingAnswers | null;
  /** By module id. */
  resonance: Record<string, Resonance>;
  /** Personalisation answers, keyed `${moduleId}.${questionId}` → option id(s). */
  answers: Record<string, string | string[]>;
  /** By insight id — only a verdict the person gave. Rejected insights are kept as "no" so they are never re-asked. */
  insights: Record<string, InsightVerdict>;
  experiments: Experiment[];
  reflections: Reflection[];
  safety: SafetyEvent[];
  /** Module ids finished, in order (interactive modules; read/quiz progress stays in `src/learn/progress.ts`). */
  completed: string[];
  /** Survey fatigue inputs (PRD §21). */
  survey: { day: string; answeredToday: number; abandons: string[]; lastLongAt: string | null };
  /** Topic surveys (PRD §22): answers by question id, when they were last touched, and when finished. */
  surveys: Record<string, { answers: Record<string, string | number>; at: string; completedAt?: string }>;
  /** My Manual (PRD §27): three sections the person writes themselves. Never written for them; suggestions are offered, never inserted. */
  manual: ManualRecord;
}

export type ManualSection = "helps" | "harder" | "work-with-me";
export interface ManualRecord {
  helps: string;
  harder: string;
  "work-with-me": string;
  updatedAt: string | null;
}
export function emptyManual(): ManualRecord {
  return { helps: "", harder: "", "work-with-me": "", updatedAt: null };
}

type ModelStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function emptyModel(): ModelRecord {
  return {
    v: MODEL_VERSION,
    onboarding: null,
    resonance: {},
    answers: {},
    insights: {},
    experiments: [],
    reflections: [],
    safety: [],
    completed: [],
    survey: { day: "", answeredToday: 0, abandons: [], lastLongAt: null },
    surveys: {},
    manual: emptyManual(),
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string");

/** The device's record, or an empty one when none, another version, or malformed. Never throws. */
export function readModel(storage: Pick<Storage, "getItem">): ModelRecord {
  let raw: string | null;
  try {
    raw = storage.getItem(MODEL_KEY);
  } catch {
    return emptyModel();
  }
  if (!raw) return emptyModel();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || parsed.v !== MODEL_VERSION) return emptyModel();
    const r = parsed as Partial<ModelRecord>;
    const empty = emptyModel();
    return {
      v: MODEL_VERSION,
      onboarding: isObject(r.onboarding) ? (r.onboarding as OnboardingAnswers) : null,
      resonance: isObject(r.resonance) ? (r.resonance as Record<string, Resonance>) : {},
      answers: isObject(r.answers) ? (r.answers as Record<string, string | string[]>) : {},
      insights: isObject(r.insights) ? (r.insights as Record<string, InsightVerdict>) : {},
      experiments: Array.isArray(r.experiments) ? r.experiments.filter(isObject).map((e) => e as unknown as Experiment) : [],
      reflections: Array.isArray(r.reflections) ? r.reflections.filter((x) => isObject(x) && typeof x.text === "string").map((e) => e as unknown as Reflection) : [],
      safety: Array.isArray(r.safety) ? r.safety.filter(isObject).map((e) => e as unknown as SafetyEvent) : [],
      completed: isStringArray(r.completed) ? r.completed : [],
      survey: isObject(r.survey) ? { ...empty.survey, ...(r.survey as ModelRecord["survey"]) } : empty.survey,
      surveys: isObject(r.surveys) ? (r.surveys as ModelRecord["surveys"]) : {},
      manual: isObject(r.manual) ? { ...emptyManual(), ...(r.manual as Partial<ManualRecord>) } : emptyManual(),
    };
  } catch {
    return emptyModel();
  }
}

export function writeModel(storage: Pick<Storage, "setItem">, record: ModelRecord): void {
  try {
    storage.setItem(MODEL_KEY, JSON.stringify(record));
  } catch {
    // Storage refused: the session keeps working from memory; it just does not persist.
  }
}

export function clearModel(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(MODEL_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Read, change, write — the one shape every mutation below takes. */
export function updateModel(storage: ModelStorage, change: (record: ModelRecord) => ModelRecord): ModelRecord {
  const next = change(readModel(storage));
  writeModel(storage, next);
  return next;
}

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

export function saveOnboarding(storage: ModelStorage, patch: Partial<OnboardingAnswers>): ModelRecord {
  return updateModel(storage, (r) => ({ ...r, onboarding: { ...(r.onboarding ?? {}), ...patch } }));
}

export function completeOnboarding(storage: ModelStorage): ModelRecord {
  return updateModel(storage, (r) => ({ ...r, onboarding: { ...(r.onboarding ?? {}), completedAt: now() } }));
}

export function recordResonance(storage: ModelStorage, moduleId: string, patch: Omit<Resonance, "at">): ModelRecord {
  return updateModel(storage, (r) => ({
    ...r,
    resonance: { ...r.resonance, [moduleId]: { ...(r.resonance[moduleId] ?? {}), ...patch, at: now() } },
    survey: countAnswered(r.survey, 1),
  }));
}

export function recordAnswer(storage: ModelStorage, moduleId: string, questionId: string, value: string | string[]): ModelRecord {
  return updateModel(storage, (r) => ({
    ...r,
    answers: { ...r.answers, [`${moduleId}.${questionId}`]: value },
    survey: countAnswered(r.survey, 1),
  }));
}

export function recordInsight(storage: ModelStorage, insightId: string, verdict: InsightVerdict): ModelRecord {
  return updateModel(storage, (r) => ({ ...r, insights: { ...r.insights, [insightId]: verdict } }));
}

export function acceptExperiment(storage: ModelStorage, moduleId: string, strategyId: string): ModelRecord {
  return updateModel(storage, (r) => {
    if (r.experiments.some((e) => e.strategyId === strategyId && !e.outcome)) return r;
    return { ...r, experiments: [...r.experiments, { strategyId, moduleId, acceptedAt: now() }] };
  });
}

export function recordOutcome(storage: ModelStorage, strategyId: string, outcome: ExperimentOutcome): ModelRecord {
  return updateModel(storage, (r) => ({
    ...r,
    experiments: r.experiments.map((e) => (e.strategyId === strategyId && !e.outcome ? { ...e, outcome, outcomeAt: now() } : e)),
  }));
}

/**
 * A reflection is kept on the device and read for safety at the moment it is written: a trigger
 * records a safety event, which is what suppresses ordinary recommendations (PRD §49, §72).
 */
export function recordReflection(storage: ModelStorage, moduleId: string, text: string): { record: ModelRecord; safety: SafetyRuleId | null } {
  const trimmed = text.trim().slice(0, 2000);
  const hit = checkSafety(trimmed);
  const record = updateModel(storage, (r) => ({
    ...r,
    reflections: trimmed ? [...r.reflections, { moduleId, text: trimmed, at: now() }] : r.reflections,
    safety: hit ? [...r.safety, { ruleId: hit.id, at: now() }] : r.safety,
  }));
  return { record, safety: hit?.id ?? null };
}

export function acknowledgeSafety(storage: ModelStorage): ModelRecord {
  return updateModel(storage, (r) => ({ ...r, safety: r.safety.map((e) => (e.acknowledgedAt ? e : { ...e, acknowledgedAt: now() })) }));
}

/** The safety event still standing — triggered and not yet acknowledged — or null. */
export function activeSafety(record: ModelRecord): SafetyEvent | null {
  return record.safety.find((e) => !e.acknowledgedAt) ?? null;
}

export function markModuleComplete(storage: ModelStorage, moduleId: string): ModelRecord {
  return updateModel(storage, (r) => (r.completed.includes(moduleId) ? r : { ...r, completed: [...r.completed, moduleId] }));
}

export function recordSurveyAnswer(storage: ModelStorage, surveyId: string, questionId: string, value: string | number): ModelRecord {
  return updateModel(storage, (r) => ({
    ...r,
    surveys: { ...r.surveys, [surveyId]: { ...(r.surveys[surveyId] ?? { answers: {} }), answers: { ...(r.surveys[surveyId]?.answers ?? {}), [questionId]: value }, at: now() } },
    survey: countAnswered(r.survey, 1),
  }));
}

/** Finishing a topic survey is the "long survey" the fatigue engine dates. */
export function completeSurvey(storage: ModelStorage, surveyId: string): ModelRecord {
  return updateModel(storage, (r) => ({
    ...r,
    surveys: { ...r.surveys, [surveyId]: { ...(r.surveys[surveyId] ?? { answers: {} }), at: now(), completedAt: now() } },
    survey: { ...r.survey, lastLongAt: now() },
  }));
}

/** My Manual (PRD §27): the person's own words for one section. The whole text, as typed; nothing is added to it. */
export function saveManual(storage: ModelStorage, section: ManualSection, text: string): ModelRecord {
  return updateModel(storage, (r) => ({ ...r, manual: { ...r.manual, [section]: text.slice(0, 4000), updatedAt: now() } }));
}

export function recordAbandon(storage: ModelStorage, surveyId: string): ModelRecord {
  return updateModel(storage, (r) => ({ ...r, survey: { ...r.survey, abandons: [...r.survey.abandons, `${today()}:${surveyId}`].slice(-30) } }));
}

function countAnswered(survey: ModelRecord["survey"], n: number): ModelRecord["survey"] {
  const day = today();
  return survey.day === day ? { ...survey, answeredToday: survey.answeredToday + n } : { ...survey, day, answeredToday: n };
}

/** The experiment awaiting "Did this help?" — the oldest accepted one with no outcome, or null. */
export function pendingExperiment(record: ModelRecord): Experiment | null {
  return record.experiments.find((e) => !e.outcome) ?? null;
}

/** Whether the record holds anything at all beyond an empty shell. */
export function hasSignals(record: ModelRecord): boolean {
  return Boolean(record.onboarding) || Object.keys(record.resonance).length > 0 || Object.keys(record.answers).length > 0;
}

/** PRD §37's last step: the profession the support path chose, held with the finder's filters. Validated on read. */
export function professionChoice(value: unknown): string | null {
  return isProfession(value) ? value : null;
}
