// §63–§65: the learning profile, device-local, no login. Every write is a reducer over the record
// so the Toolkit, the saved queue and the resonance signals are one object the tests can hold.
import type { LearningDomain, LearningProfile, PersonalStrategy, ResonanceSignal, SavedLearningItem } from "./types";

export const PROFILE_KEY = "adhdme.lives.v1";
type ProfileStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function emptyProfile(): LearningProfile {
  return { v: 1, savedStrategyIds: [], completedModuleIds: [], startedModuleIds: [], dismissedStrategyIds: [], resonanceSignals: [], selectedGoals: [], personalStrategies: [], saved: [], highScore: 0, completedAt: {} };
}

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function readProfile(storage: Pick<Storage, "getItem">): LearningProfile {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PROFILE_KEY) ?? "null");
    if (!isObject(parsed) || parsed.v !== 1) return emptyProfile();
    const e = emptyProfile();
    return {
      v: 1,
      savedStrategyIds: strings(parsed.savedStrategyIds),
      completedModuleIds: strings(parsed.completedModuleIds),
      startedModuleIds: strings(parsed.startedModuleIds),
      dismissedStrategyIds: strings(parsed.dismissedStrategyIds),
      resonanceSignals: Array.isArray(parsed.resonanceSignals) ? (parsed.resonanceSignals.filter(isObject) as unknown as ResonanceSignal[]) : e.resonanceSignals,
      selectedGoals: strings(parsed.selectedGoals) as LearningDomain[],
      personalStrategies: Array.isArray(parsed.personalStrategies) ? (parsed.personalStrategies.filter(isObject) as unknown as PersonalStrategy[]) : e.personalStrategies,
      saved: Array.isArray(parsed.saved) ? (parsed.saved.filter(isObject) as unknown as SavedLearningItem[]) : e.saved,
      highScore: typeof parsed.highScore === "number" ? parsed.highScore : 0,
      completedAt: isObject(parsed.completedAt) ? (parsed.completedAt as Record<string, number>) : {},
    };
  } catch {
    return emptyProfile();
  }
}

export function writeProfile(storage: Pick<Storage, "setItem">, profile: LearningProfile): void {
  try { storage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* memory only */ }
}

function update(storage: ProfileStorage, change: (p: LearningProfile) => LearningProfile): LearningProfile {
  const next = change(readProfile(storage));
  writeProfile(storage, next);
  return next;
}

export function recordHighScore(storage: ProfileStorage, score: number): LearningProfile {
  return update(storage, (p) => ({ ...p, highScore: Math.max(p.highScore, score) }));
}

/** §35: the one thing that may drive personalisation. */
export function recordResonance(storage: ProfileStorage, signal: Omit<ResonanceSignal, "createdAt">, now = Date.now()): LearningProfile {
  return update(storage, (p) => ({ ...p, resonanceSignals: [...p.resonanceSignals.filter((s) => !(s.sourceType === signal.sourceType && s.sourceId === signal.sourceId)), { ...signal, createdAt: now }] }));
}

export function selectGoals(storage: ProfileStorage, goals: readonly LearningDomain[]): LearningProfile {
  return update(storage, (p) => ({ ...p, selectedGoals: goals.slice(0, 3) }));
}

/** §7 SAVE: into the Learn Later queue and the Toolkit as "saved". */
export function saveStrategy(storage: ProfileStorage, item: Omit<SavedLearningItem, "savedAt" | "status">, now = Date.now()): LearningProfile {
  return update(storage, (p) => ({
    ...p,
    savedStrategyIds: p.savedStrategyIds.includes(item.strategyId) ? p.savedStrategyIds : [...p.savedStrategyIds, item.strategyId],
    dismissedStrategyIds: p.dismissedStrategyIds.filter((id) => id !== item.strategyId),
    saved: [...p.saved.filter((s) => s.strategyId !== item.strategyId), { ...item, savedAt: now, status: "saved" }],
    personalStrategies: p.personalStrategies.some((s) => s.strategyId === item.strategyId) ? p.personalStrategies : [...p.personalStrategies, { strategyId: item.strategyId, addedAt: now, status: "saved" }],
  }));
}

/** §7 NOT FOR ME: excluded from recommendation from now on. */
export function dismissStrategy(storage: ProfileStorage, strategyId: string): LearningProfile {
  return update(storage, (p) => ({ ...p, dismissedStrategyIds: p.dismissedStrategyIds.includes(strategyId) ? p.dismissedStrategyIds : [...p.dismissedStrategyIds, strategyId], saved: p.saved.map((s) => (s.strategyId === strategyId ? { ...s, status: "dismissed" } : s)) }));
}

export function startModule(storage: ProfileStorage, moduleId: string, strategyId?: string): LearningProfile {
  return update(storage, (p) => ({ ...p, startedModuleIds: p.startedModuleIds.includes(moduleId) ? p.startedModuleIds : [...p.startedModuleIds, moduleId], saved: strategyId ? p.saved.map((s) => (s.strategyId === strategyId && s.status === "saved" ? { ...s, status: "started" } : s)) : p.saved }));
}

/** §38–§39: completing a module adds the strategy to the Toolkit as "trying", with its personal configuration. */
export function completeModule(storage: ProfileStorage, moduleId: string, strategyId: string, personalConfig?: PersonalStrategy["personalConfig"], now = Date.now()): LearningProfile {
  return update(storage, (p) => {
    const existing = p.personalStrategies.find((s) => s.strategyId === strategyId);
    const personal: PersonalStrategy = { strategyId, addedAt: existing?.addedAt ?? now, status: "trying", customNote: existing?.customNote, personalConfig: personalConfig ?? existing?.personalConfig };
    return {
      ...p,
      completedModuleIds: p.completedModuleIds.includes(moduleId) ? p.completedModuleIds : [...p.completedModuleIds, moduleId],
      completedAt: { ...p.completedAt, [moduleId]: now },
      savedStrategyIds: p.savedStrategyIds.includes(strategyId) ? p.savedStrategyIds : [...p.savedStrategyIds, strategyId],
      saved: p.saved.map((s) => (s.strategyId === strategyId ? { ...s, status: "completed" } : s)),
      personalStrategies: [...p.personalStrategies.filter((s) => s.strategyId !== strategyId), personal],
    };
  });
}

export function markStrategy(storage: ProfileStorage, strategyId: string, status: PersonalStrategy["status"], customNote?: string): LearningProfile {
  return update(storage, (p) => ({ ...p, personalStrategies: p.personalStrategies.map((s) => (s.strategyId === strategyId ? { ...s, status, customNote: customNote ?? s.customNote } : s)) }));
}

export function removeFromToolkit(storage: ProfileStorage, strategyId: string): LearningProfile {
  return update(storage, (p) => ({ ...p, personalStrategies: p.personalStrategies.filter((s) => s.strategyId !== strategyId), savedStrategyIds: p.savedStrategyIds.filter((id) => id !== strategyId), saved: p.saved.filter((s) => s.strategyId !== strategyId) }));
}

/** §34: "completed recently" is within a week. */
export const RECENT_MS = 7 * 24 * 60 * 60 * 1000;
export function recentlyCompleted(profile: LearningProfile, now = Date.now()): string[] {
  return Object.entries(profile.completedAt).filter(([, at]) => now - at < RECENT_MS).map(([id]) => id);
}
