import { cardCount, MODULES } from "./scenes";

export const CURSOR_KEY = "adhdme.learn.cursor.v1";
export type LearnCursor = { v: 1; moduleId: string; step: number };
type CursorStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Deferred access also handles browsers that reject the localStorage getter itself. */
export const deviceLearningStorage: CursorStorage = {
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: key => window.localStorage.removeItem(key),
};

export function readCursor(storage: Pick<Storage, "getItem">): LearnCursor | null {
  try {
    const cursor = JSON.parse(storage.getItem(CURSOR_KEY) ?? "null") as Partial<LearnCursor> | null;
    const module = MODULES.find(module => module.id === cursor?.moduleId);
    if (!cursor || cursor.v !== 1 || !module || !Number.isInteger(cursor.step) || cursor.step! < 0 || cursor.step! >= cardCount(module)) return null;
    // Quiz answers are deliberately never persisted. Reopening a quiz starts at question one.
    return { v: 1, moduleId: module.id, step: module.kind === "quiz" ? 0 : cursor.step! };
  } catch { return null; }
}

export function writeCursor(storage: Pick<Storage, "setItem">, moduleId: string, step: number): void {
  const module = MODULES.find(module => module.id === moduleId);
  if (!module || !Number.isInteger(step) || step < 0 || step >= cardCount(module)) return;
  try { storage.setItem(CURSOR_KEY, JSON.stringify({ v: 1, moduleId, step: module.kind === "quiz" ? 0 : step })); } catch { /* Session remains usable. */ }
}

export function clearCursor(storage: Pick<Storage, "removeItem">): void {
  try { storage.removeItem(CURSOR_KEY); } catch { /* Session remains usable. */ }
}
