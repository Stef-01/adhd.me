// O239: what the Learn tab remembers — which modules this device has finished. Nothing else.
//
// Held in `localStorage` under a versioned key, on the same terms as the finder's filters: a
// preference-shaped fact about this device, never a sentence, never in a URL, a log line or an
// analytics event. Finishing a module is the only write; there is no score, no streak and no
// nudge, because the module teaches how the product works and a person who has read it is done.

import { MODULES } from "./scenes";

export const PROGRESS_VERSION = 1;
export const PROGRESS_KEY = `adhdme.learn.v${PROGRESS_VERSION}`;

export interface Progress {
  v: typeof PROGRESS_VERSION;
  /** Module ids finished on this device, in the order they were finished. */
  done: string[];
}

const KNOWN = new Set(MODULES.map((m) => m.id));

export function emptyProgress(): Progress {
  return { v: PROGRESS_VERSION, done: [] };
}

/** The device's record, or an empty one when none, another version, or malformed. Never throws. */
export function readProgress(storage: Pick<Storage, "getItem">): Progress {
  let raw: string | null;
  try {
    raw = storage.getItem(PROGRESS_KEY);
  } catch {
    return emptyProgress();
  }
  if (!raw) return emptyProgress();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyProgress();
    const r = parsed as Partial<Progress>;
    if (r.v !== PROGRESS_VERSION || !Array.isArray(r.done)) return emptyProgress();
    // A module that no longer exists is dropped rather than kept as a ghost tick.
    return { v: PROGRESS_VERSION, done: r.done.filter((id): id is string => typeof id === "string" && KNOWN.has(id)) };
  } catch {
    return emptyProgress();
  }
}

export function markDone(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, id: string): Progress {
  const current = readProgress(storage);
  if (!KNOWN.has(id) || current.done.includes(id)) return current;
  const next: Progress = { v: PROGRESS_VERSION, done: [...current.done, id] };
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Storage refused: the tick still shows for this visit; it just does not persist.
  }
  return next;
}

export function clearProgress(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(PROGRESS_KEY);
  } catch {
    // Nothing to clear.
  }
}
