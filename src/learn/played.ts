// Which of the eight character games a person has played to the end (PLAN.md W7, D2): a tick on
// the Learn list and nothing more. No score, no result and no count is kept, and the day is never
// shown; it is kept so a copy and a later design can say "played", not how often.

import { localDay } from "@/lib/dates";
import type { CharacterId } from "@/lives/types";
import { CHARACTER_IDS } from "@/lives/types";

export const PLAYED_KEY = "adhdme.played.v1";

export interface Played {
  v: 1;
  at: Partial<Record<CharacterId, string>>;
}

export const emptyPlayed = (): Played => ({ v: 1, at: {} });

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** A stored record, or null when it is not exactly this shape. */
export function parsePlayed(v: unknown): Played | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const r = v as { v?: unknown; at?: unknown };
  if (r.v !== 1 || !r.at || typeof r.at !== "object" || Array.isArray(r.at)) return null;
  const at: Played["at"] = {};
  for (const [id, day] of Object.entries(r.at)) {
    if (!(CHARACTER_IDS as readonly string[]).includes(id) || !isDay(day)) return null;
    at[id as CharacterId] = day;
  }
  return { v: 1, at };
}

export function readPlayed(storage: Pick<Storage, "getItem">): Played {
  try {
    return parsePlayed(JSON.parse(storage.getItem(PLAYED_KEY) ?? "null")) ?? emptyPlayed();
  } catch {
    return emptyPlayed();
  }
}

/** The game reached its end. Written once per game; a replay keeps the first day. */
export function markPlayed(storage: Pick<Storage, "getItem" | "setItem">, who: CharacterId, day = localDay()): Played {
  const current = readPlayed(storage);
  if (current.at[who]) return current;
  const next: Played = { v: 1, at: { ...current.at, [who]: day } };
  try {
    storage.setItem(PLAYED_KEY, JSON.stringify(next));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("adhdme:personalisation"));
  } catch {
    // Storage refused: the tick shows for this visit only.
  }
  return next;
}
