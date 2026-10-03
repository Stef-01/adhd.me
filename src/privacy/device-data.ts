// Everything this browser holds about a person, as one scope: what "Delete" removes, what "Save a
// copy" writes to a file, and what "Restore a copy" will accept back.
//
// Delete removes every `adhdme.` key except the preferences below, which hold no answers. Deleting
// by rule rather than by list means a store added later is deleted too unless somebody decides it
// is a preference. The consent choice uses `adhdme-` keys and is kept.
//
// Restore checks a file field by field and refuses the whole file if any field is wrong. A copy is
// from outside the app, so it is never trusted the way this browser's own storage is.

import { localDay } from "@/lib/dates";
import { LEARNING_TARGETS } from "@/model/learning-evidence";
import { SUBDOMAINS } from "@/model/layers";
import { QUESTIONS } from "@/model/onboarding";
import { SAFETY_RULES } from "@/model/safety";
import { CHECKPOINTS } from "@/model/checkpoint";
import { sanitisePlan } from "@/model/care-plan";
import { SNAPSHOT_CAP, isSnapshot } from "@/model/snapshot-shape";
import { MODEL_VERSION, emptyModel, readModel, writeModel, type ModelRecord } from "@/model/store";
import { emptyProfile, readProfile, writeProfile } from "@/lives/profile";
import type { LearningProfile } from "@/lives/types";
import { PROGRESS_KEY, PROGRESS_VERSION, readProgress, type Progress } from "@/learn/progress";
import { PLAYED_KEY, parsePlayed, readPlayed, type Played } from "@/learn/played";

/** Preferences about how the app looks, sounds, moves and reads. None of them holds an answer. */
export const KEPT_PREFERENCES: readonly string[] = [
  "adhdme.sound",
  "adhdme.aurora.motion",
  "adhdme.finder.mode",
  "adhdme.lives.relaxed",
  "adhdme.lives.large",
  "adhdme.lives.reduced-flashing",
  "adhdme.lives.reduced-sensory",
  "adhdme.lives.haptics",
  "adhdme.lives.sound",
  "adhdme.lives.tutored",
];
const KEPT_PREFIXES = ["adhdme.play."];

export function isAnswerKey(key: string): boolean {
  return key.startsWith("adhdme.") && !KEPT_PREFERENCES.includes(key) && !KEPT_PREFIXES.some((p) => key.startsWith(p));
}

type Listable = Pick<Storage, "length" | "key" | "getItem" | "removeItem">;

function answerKeys(storage: Listable): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isAnswerKey(key)) keys.push(key);
  }
  return keys;
}

/** True when this browser holds any answer at all, in either store. */
export function hasDeviceData(stores: readonly Listable[]): boolean {
  try {
    return stores.some((s) => answerKeys(s).some((k) => (s.getItem(k) ?? "") !== ""));
  } catch {
    return false;
  }
}

/** Removes every answer from every store given. Preferences and the consent choice stay. */
export function deleteDeviceData(stores: readonly Listable[]): void {
  for (const storage of stores) {
    try {
      for (const key of answerKeys(storage)) storage.removeItem(key);
    } catch {
      // A store that refuses cannot hold anything we could remove either.
    }
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("adhdme:personalisation"));
}

/* ------------------------------------------------------------------ the copy */

const COPY_SCHEMA = 1;

export interface DeviceCopy {
  schema: typeof COPY_SCHEMA;
  savedOn: string;
  model: Omit<ModelRecord, "learning">;
  lives: LearningProfile;
  learn: Progress;
  /** Which character games reached their end (PLAN.md W7). Absent in a copy saved before it existed. */
  played?: Played;
}

export function copyFileName(now = new Date()): string {
  return `adhdme-backup-${localDay(now)}.json`;
}

export function makeCopy(storage: Pick<Storage, "getItem">, now = new Date()): DeviceCopy {
  const { learning: _learning, ...model } = readModel(storage);
  return { schema: COPY_SCHEMA, savedOn: now.toISOString(), model, lives: readProfile(storage), learn: readProgress(storage), played: readPlayed(storage) };
}

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isTime = (v: unknown): v is string => isString(v) && !Number.isNaN(Date.parse(v));
const optional = (v: unknown, check: (x: unknown) => boolean) => v === undefined || check(v);
const oneOf = (values: readonly unknown[]) => (v: unknown) => values.includes(v);
const arrayOf = (check: (x: unknown) => boolean) => (v: unknown) => Array.isArray(v) && v.every(check);
const recordOf = (check: (x: unknown) => boolean) => (v: unknown) => isObject(v) && Object.values(v).every(check);
const inRange = (lo: number, hi: number) => (v: unknown) => isNumber(v) && v >= lo && v <= hi;

const SUBDOMAIN_IDS = SUBDOMAINS.map((s) => s.id);
const LAYERS = [...new Set(SUBDOMAINS.map((s) => s.layer))];
const RULE_IDS = SAFETY_RULES.map((r) => r.id);

function validOnboarding(v: unknown): boolean {
  if (v === null) return true;
  if (!isObject(v)) return false;
  for (const [key, value] of Object.entries(v)) {
    if (key === "completedAt") {
      if (!isTime(value)) return false;
      continue;
    }
    // A question the app no longer asks is ignored on read, so an older copy is not refused for it.
    const q = QUESTIONS.find((x) => x.key === key);
    if (!q) continue;
    const ids = q.options?.map((o) => o.id);
    if (q.kind === "scale" && !inRange(0, 10)(value)) return false;
    if (q.kind === "single" && !(ids ? oneOf(ids)(value) : isString(value))) return false;
    if (q.kind === "multi" && !(ids ? arrayOf(oneOf(ids)) : arrayOf(isString))(value)) return false;
  }
  return true;
}

const validResonance = (v: unknown) =>
  isObject(v) &&
  isTime(v.at) &&
  optional(v.frequency, oneOf(["often", "sometimes", "rarely", "unsure"])) &&
  optional(v.cost, inRange(0, 10)) &&
  optional(v.priority, oneOf(["yes", "maybe", "no"]));

const validExperiment = (v: unknown) =>
  isObject(v) &&
  isString(v.strategyId) &&
  isString(v.moduleId) &&
  isTime(v.acceptedAt) &&
  optional(v.outcome, oneOf(["a-lot", "a-little", "no", "didnt-try"])) &&
  optional(v.outcomeAt, isTime);

const validModel = (v: unknown): v is DeviceCopy["model"] =>
  isObject(v) &&
  v.v === MODEL_VERSION &&
  validOnboarding(v.onboarding) &&
  recordOf(validResonance)(v.resonance) &&
  recordOf((a) => isString(a) || arrayOf(isString)(a))(v.answers) &&
  recordOf(oneOf(["yes", "partly", "no"]))(v.insights) &&
  arrayOf(validExperiment)(v.experiments) &&
  arrayOf((r) => isObject(r) && isString(r.moduleId) && isString(r.text) && isTime(r.at))(v.reflections) &&
  recordOf(recordOf(inRange(0, 10)))(v.relates) &&
  arrayOf((i) => isObject(i) && isString(i.moduleId) && oneOf(SUBDOMAIN_IDS)(i.subdomain) && oneOf(LAYERS)(i.layer) && isString(i.note) && isTime(i.at))(v.interpretations) &&
  arrayOf((s) => isObject(s) && oneOf(RULE_IDS)(s.ruleId) && isTime(s.at) && optional(s.acknowledgedAt, isTime))(v.safety) &&
  arrayOf(isString)(v.completed) &&
  isObject(v.survey) && isString(v.survey.day) && isNumber(v.survey.answeredToday) && arrayOf(isString)(v.survey.abandons) && (v.survey.lastLongAt === null || isTime(v.survey.lastLongAt)) &&
  recordOf((s) => isObject(s) && recordOf((a) => isString(a) || isNumber(a))(s.answers) && isTime(s.at) && optional(s.completedAt, isTime))(v.surveys) &&
  isObject(v.manual) && isString(v.manual.helps) && isString(v.manual.harder) && isString(v.manual["work-with-me"]) && (v.manual.updatedAt === null || isTime(v.manual.updatedAt)) &&
  isObject(v.medication) && isString(v.medication.changes) && isString(v.medication.untouched) && isString(v.medication.unwanted) && (v.medication.updatedAt === null || isTime(v.medication.updatedAt)) &&
  arrayOf((c) => isObject(c) && oneOf(CHECKPOINTS)(c.months) && oneOf(["still-looking", "found-care", "not-now"])(c.answer) && isTime(c.at))(v.checkpoints) &&
  isObject(v.carePlan) &&
  JSON.stringify(sanitisePlan(v.carePlan)) === JSON.stringify(v.carePlan) &&
  optional(v.snapshots, (s) => Array.isArray(s) && s.length <= SNAPSHOT_CAP && s.every(isSnapshot)) &&
  optional(v.onboardingDraft, (d) => d === null || validOnboarding(d));

const validLives = (v: unknown): v is LearningProfile =>
  isObject(v) &&
  v.v === 1 &&
  arrayOf(isString)(v.savedStrategyIds) &&
  arrayOf(isString)(v.completedModuleIds) &&
  arrayOf(isString)(v.startedModuleIds) &&
  arrayOf(isString)(v.dismissedStrategyIds) &&
  arrayOf((s) => isObject(s) && oneOf(["game", "character", "moment"])(s.sourceType) && isString(s.sourceId) && oneOf(["this_is_me", "sometimes", "not_me"])(s.response) && isNumber(s.createdAt))(v.resonanceSignals) &&
  arrayOf(oneOf(Object.keys(LEARNING_TARGETS)))(v.selectedGoals) &&
  arrayOf((p) => isObject(p) && isString(p.strategyId) && isNumber(p.addedAt) && oneOf(["saved", "trying", "useful", "not_useful"])(p.status) && optional(p.customNote, isString) && optional(p.personalConfig, isObject))(v.personalStrategies) &&
  arrayOf((s) => isObject(s) && isString(s.strategyId) && isNumber(s.savedAt) && oneOf(["score_screen", "character", "learn", "module"])(s.source) && oneOf(["saved", "started", "completed", "dismissed"])(s.status) && optional(s.relatedCharacterId, isString) && optional(s.relatedGameId, isString))(v.saved) &&
  isNumber(v.highScore) &&
  recordOf(isNumber)(v.completedAt) &&
  optional(v.goalsSkipped, (x) => x === true);

const validLearn = (v: unknown): v is Progress =>
  isObject(v) && v.v === PROGRESS_VERSION && arrayOf(isString)(v.done) && optional(v.at, recordOf((d) => isString(d) && /^\d{4}-\d{2}-\d{2}$/.test(d)));

/** The copy, or null when any part of it is not exactly what this app writes. */
export function parseCopy(text: string): DeviceCopy | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(parsed) || parsed.schema !== COPY_SCHEMA || !isTime(parsed.savedOn)) return null;
  if (!validModel(parsed.model) || !validLives(parsed.lives) || !validLearn(parsed.learn)) return null;
  const played = parsed.played === undefined ? undefined : parsePlayed(parsed.played);
  if (played === null) return null;
  return { schema: COPY_SCHEMA, savedOn: parsed.savedOn, model: parsed.model, lives: parsed.lives, learn: parsed.learn, ...(played ? { played } : {}) };
}

/** Replaces this browser's answers with the copy's. Clears first, so nothing from before survives. */
export function restoreCopy(local: Listable & Pick<Storage, "setItem">, session: Listable | null, copy: DeviceCopy): void {
  deleteDeviceData(session ? [local, session] : [local]);
  // An empty part stays unwritten, so a restored empty copy leaves an empty browser.
  if (JSON.stringify(copy.model) !== JSON.stringify(emptyModel())) writeModel(local, copy.model as ModelRecord);
  if (JSON.stringify(copy.lives) !== JSON.stringify(emptyProfile())) writeProfile(local, copy.lives);
  try {
    if (copy.learn.done.length) local.setItem(PROGRESS_KEY, JSON.stringify(copy.learn));
    if (copy.played && Object.keys(copy.played.at).length) local.setItem(PLAYED_KEY, JSON.stringify(copy.played));
  } catch {
    // Storage refused: the map and profile are back; the Learn ticks are not.
  }
}
