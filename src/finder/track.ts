// The finder's side of its record (src/db/finder.ts, docs/data/FINDER-DATA.md): what it sends, and
// the visits it will ask about. Sends go by sendBeacon, so a search or a handoff is kept even as the
// page leaves, and nothing waits on them. The device id is a random one this browser keeps; it names
// no person. The visits waiting for their stars live on this device only.

import type { SearchSource } from "@/db/finder";

const DEVICE = "adhdme.device";
const VISITS = "adhdme.visits";
/** A visit is asked about once a day has passed since the tap on "Book": the visit is likely done. */
export const ASK_AFTER_MS = 20 * 60 * 60 * 1000;
/** "Not yet" asks again this much later, and a visit is let go after this many asks. */
export const SNOOZE_MS = 2 * 24 * 60 * 60 * 1000;
export const MOST_ASKS = 3;

export function newId(): string {
  return crypto.randomUUID();
}

export function deviceId(storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage): string {
  try {
    const held = storage.getItem(DEVICE);
    if (held) return held;
    const id = newId();
    storage.setItem(DEVICE, id);
    return id;
  } catch {
    return newId();
  }
}

/**
 * Erases what the server holds for this device, before the browser's own copy goes: called by the
 * settings sheet's Delete. A browser that never searched has no device id, and nothing to erase.
 */
export function eraseServerRecord(storage: Pick<Storage, "getItem"> = window.localStorage): void {
  try {
    const id = storage.getItem(DEVICE);
    if (id) void fetch("/api/finder/device", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId: id }), keepalive: true }).catch(() => undefined);
  } catch {
    // Storage blocked: there is no id to erase by.
  }
}

type TrackType = "search" | "voice" | "event" | "handoff";

/** Fire and forget: the record either lands or does not, and the person never waits for it. */
export function track(type: TrackType, record: Record<string, unknown>): void {
  try {
    const body = JSON.stringify({ type, record });
    if (navigator.sendBeacon?.(new URL("/api/finder/track", window.location.href), new Blob([body], { type: "text/plain" }))) return;
    void fetch("/api/finder/track", { method: "POST", body, keepalive: true }).catch(() => undefined);
  } catch {
    // A browser that cannot send loses a record, never a screen.
  }
}

export function trackSearch(record: {
  id: string;
  source: SearchSource;
  requestText: string;
  place: string;
  filters: Record<string, unknown>;
  readSource: "lexicon" | "llm";
  asked: string[];
  shown: string[];
}): void {
  track("search", { ...record, deviceId: deviceId() });
}

/** A voice call's summary (src/voice): how it went, never what was said. */
export function trackVoiceCall(call: { model: string; questions: number; seconds: number; outcome: "revealed" | "stopped" | "failed" | "urgent" }, searchId: string | null): void {
  track("voice", { id: newId(), deviceId: deviceId(), searchId, ...call });
}

// ── The visits waiting for their stars ─────────────────────────────────────────────────────────

export interface PendingVisit {
  handoffId: string;
  clinicianId: string;
  /** How the card names them: "Dr Mei Chao". */
  name: string;
  at: number;
  asked: string[];
  met: string[];
  asks: number;
  nextAt: number;
}

export function readVisits(storage: Pick<Storage, "getItem"> = window.localStorage): PendingVisit[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(VISITS) ?? "[]");
    return Array.isArray(value) ? (value as PendingVisit[]).filter((v) => v && typeof v.handoffId === "string") : [];
  } catch {
    return [];
  }
}

function writeVisits(visits: PendingVisit[], storage: Pick<Storage, "setItem"> = window.localStorage): void {
  try {
    storage.setItem(VISITS, JSON.stringify(visits.slice(-10)));
  } catch {
    // Storage blocked: the card is not asked, nothing breaks.
  }
}

/** The tap that leaves for the practice: recorded, and remembered here so the visit can be asked about. */
export function handOff(visit: { searchId: string | null; clinicianId: string; name: string; asked: string[]; met: string[] }, now = Date.now()): void {
  const handoffId = newId();
  track("handoff", { id: handoffId, searchId: visit.searchId, deviceId: deviceId(), clinicianId: visit.clinicianId, asked: visit.asked, met: visit.met });
  // One visit per clinician is asked about: the latest tap wins.
  const others = readVisits().filter((v) => v.clinicianId !== visit.clinicianId);
  writeVisits([...others, { handoffId, clinicianId: visit.clinicianId, name: visit.name, at: now, asked: visit.asked, met: visit.met, asks: 0, nextAt: now + ASK_AFTER_MS }]);
}

/** The visit to ask about now, if any: the oldest whose time has come. */
export function visitDue(now = Date.now(), visits = readVisits()): PendingVisit | null {
  return visits.filter((v) => v.nextAt <= now && v.asks < MOST_ASKS).sort((a, b) => a.at - b.at)[0] ?? null;
}

/** "Not yet": ask again later, and let the visit go after the last ask. */
export function snoozeVisit(handoffId: string, now = Date.now()): void {
  writeVisits(readVisits().map((v) => (v.handoffId === handoffId ? { ...v, asks: v.asks + 1, nextAt: now + SNOOZE_MS } : v)).filter((v) => v.asks < MOST_ASKS));
}

/** Rated: the visit is done with. */
export function forgetVisit(handoffId: string): void {
  writeVisits(readVisits().filter((v) => v.handoffId !== handoffId));
}

/** The stars, and later the note: one rating per visit, the note replacing nothing but itself. */
export async function rateVisit(visit: PendingVisit, stars: number, feedback = ""): Promise<boolean> {
  const reply = await fetch("/api/ratings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handoffId: visit.handoffId, clinicianId: visit.clinicianId, stars, feedback, deviceId: deviceId(), asked: visit.asked, met: visit.met }),
  }).catch(() => null);
  return Boolean(reply?.ok);
}
