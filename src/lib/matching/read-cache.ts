// The finder's readings, remembered per request on this server instance, under a hash of its words
// (the words themselves are never held): the same words read the same way every time, and a repeated
// search, such as an example chip, costs nothing and waits for nothing. Only the model's own readings are kept, never
// a fallback; at most MAX, the oldest going first, each for a day.

import { createHash } from "node:crypto";

const MAX = 500;
const TTL_MS = 24 * 60 * 60 * 1000;

/** A model reading as the route answers it: each need with the person's words for it, and the asks no key covers. */
export interface HeldReading {
  needs: { key: string; quote: string }[];
  unlisted: string[];
}
interface Held extends HeldReading {
  at: number;
}

const holder = globalThis as { __adhdMeReadCache?: Map<string, Held> };
function cache(): Map<string, Held> {
  holder.__adhdMeReadCache ??= new Map();
  return holder.__adhdMeReadCache;
}

/** Words that differ only in case, spacing or a closing full stop are the same request; the key is their hash. */
function readKey(text: string): string {
  const words = text.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!]+$/, "");
  return createHash("sha256").update(words).digest("hex");
}

export function cachedReading(text: string, now = Date.now()): HeldReading | null {
  const key = readKey(text);
  const held = cache().get(key);
  if (!held) return null;
  if (now - held.at > TTL_MS) {
    cache().delete(key);
    return null;
  }
  return { needs: held.needs, unlisted: held.unlisted };
}

export function rememberReading(text: string, reading: HeldReading, now = Date.now()): void {
  const key = readKey(text);
  const map = cache();
  map.delete(key);
  map.set(key, { needs: reading.needs.map((need) => ({ ...need })), unlisted: [...reading.unlisted], at: now });
  if (map.size > MAX) map.delete(map.keys().next().value!);
}

/** Registered in src/lib/stores.ts, so a reset of every store clears it too. */
export function resetReadCache(): void {
  cache().clear();
}
