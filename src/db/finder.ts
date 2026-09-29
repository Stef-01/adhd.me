// The finder's record (supabase/migrations/0008_finder.sql, docs/data/FINDER-DATA.md): searches, voice
// calls, what a person did with a list, the handoff to a practice, and the stars after the visit.
//
// Every write arrives from the browser as JSON, so each kind has a parser that returns a typed
// record or null: nothing unchecked reaches the store. The store is memory on this instance, capped,
// like every store here; with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set, each write is also
// sent to its table over PostgREST, in order, fire and forget, and a failure is counted, never logged
// with its row. Ratings are never shown to anyone: src/db/learn.ts turns them into bounded weights
// per ask, never per clinician.

import { MAX_FOLLOW_UPS } from "@/voice/interviewer";

export type SearchSource = "typed" | "dictation" | "voice";
export type EventKind = "profile" | "compare" | "more" | "heard" | "filter";
type CallOutcome = "revealed" | "stopped" | "failed" | "urgent";

interface SearchRecord {
  id: string;
  deviceId: string;
  createdAt: string;
  source: SearchSource;
  requestText: string;
  place: string;
  filters: Record<string, unknown>;
  readSource: "lexicon" | "llm";
  asked: string[];
  shown: string[];
}

interface VoiceCallRecord {
  id: string;
  deviceId: string;
  searchId: string | null;
  createdAt: string;
  model: string;
  questions: number;
  seconds: number;
  outcome: CallOutcome;
}

interface EventRecord {
  id: string;
  searchId: string;
  createdAt: string;
  kind: EventKind;
  clinicianId: string | null;
}

interface HandoffRecord {
  id: string;
  searchId: string | null;
  deviceId: string;
  clinicianId: string;
  createdAt: string;
  asked: string[];
  met: string[];
}

export interface RatingRecord {
  id: string;
  source: "finder" | "match";
  handoffId: string | null;
  matchId: string | null;
  clinicianId: string;
  deviceId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  feedback: string;
  asked: string[];
  met: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Parsing: the browser's JSON to a record, or null ───────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const KEY = /^[a-z]+:[a-z0-9_-]{1,40}$/;
const MAX_TEXT = 2000;
const MAX_FEEDBACK = 1000;
const MAX_LIST = 40;

type Json = Record<string, unknown>;
const object = (value: unknown): Json | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null);
const uuid = (value: unknown): string | null => (typeof value === "string" && UUID.test(value) ? value.toLowerCase() : null);
const text = (value: unknown, max: number): string | null => (typeof value === "string" && value.length <= max ? value.trim() : null);
const keys = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((k): k is string => typeof k === "string" && KEY.test(k)))].slice(0, MAX_LIST) : [];
const ids = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((k): k is string => typeof k === "string" && ID.test(k)).slice(0, MAX_LIST) : [];
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;

export function parseSearch(input: unknown, now = new Date()): SearchRecord | null {
  const o = object(input);
  const id = uuid(o?.id);
  const deviceId = uuid(o?.deviceId);
  const source = oneOf(o?.source, ["typed", "dictation", "voice"] as const);
  const requestText = text(o?.requestText, MAX_TEXT);
  const readSource = oneOf(o?.readSource, ["lexicon", "llm"] as const);
  if (!o || !id || !deviceId || !source || !requestText || !readSource) return null;
  const filters = object(o.filters) ?? {};
  if (JSON.stringify(filters).length > 2000) return null;
  return {
    id,
    deviceId,
    createdAt: now.toISOString(),
    source,
    requestText,
    place: text(o.place, 80) ?? "",
    filters,
    readSource,
    asked: keys(o.asked),
    shown: ids(o.shown),
  };
}

export function parseVoiceCall(input: unknown, now = new Date()): VoiceCallRecord | null {
  const o = object(input);
  const id = uuid(o?.id);
  const deviceId = uuid(o?.deviceId);
  const outcome = oneOf(o?.outcome, ["revealed", "stopped", "failed", "urgent"] as const);
  const model = text(o?.model, 60);
  const questions = o?.questions;
  const seconds = o?.seconds;
  if (!o || !id || !deviceId || !outcome || !model) return null;
  if (!Number.isInteger(questions) || (questions as number) < 0 || (questions as number) > MAX_FOLLOW_UPS) return null;
  if (!Number.isInteger(seconds) || (seconds as number) < 0 || (seconds as number) > 3600) return null;
  return { id, deviceId, searchId: uuid(o.searchId), createdAt: now.toISOString(), model, questions: questions as number, seconds: seconds as number, outcome };
}

export function parseEvent(input: unknown, now = new Date()): EventRecord | null {
  const o = object(input);
  const id = uuid(o?.id);
  const searchId = uuid(o?.searchId);
  const kind = oneOf(o?.kind, ["profile", "compare", "more", "heard", "filter"] as const);
  if (!o || !id || !searchId || !kind) return null;
  const clinicianId = typeof o.clinicianId === "string" && ID.test(o.clinicianId) ? o.clinicianId : null;
  return { id, searchId, createdAt: now.toISOString(), kind, clinicianId };
}

export function parseHandoff(input: unknown, now = new Date()): HandoffRecord | null {
  const o = object(input);
  const id = uuid(o?.id);
  const deviceId = uuid(o?.deviceId);
  const clinicianId = typeof o?.clinicianId === "string" && ID.test(o.clinicianId) ? o.clinicianId : null;
  if (!o || !id || !deviceId || !clinicianId) return null;
  const asked = keys(o.asked);
  return { id, searchId: uuid(o.searchId), deviceId, clinicianId, createdAt: now.toISOString(), asked, met: keys(o.met).filter((k) => asked.includes(k)) };
}

/** A rating of a finder visit (a handoff) or a /match one (a match); the asks travel with it. */
export function parseRating(input: unknown, now = new Date()): Omit<RatingRecord, "createdAt" | "updatedAt" | "id"> & { at: string } | null {
  const o = object(input);
  const stars = o?.stars;
  const clinicianId = typeof o?.clinicianId === "string" && ID.test(o.clinicianId) ? o.clinicianId : null;
  const feedback = o?.feedback === undefined ? "" : text(o.feedback, MAX_FEEDBACK);
  if (!o || !clinicianId || feedback === null) return null;
  if (stars !== 1 && stars !== 2 && stars !== 3 && stars !== 4 && stars !== 5) return null;
  const handoffId = uuid(o.handoffId);
  const matchId = typeof o.matchId === "string" && ID.test(o.matchId) ? o.matchId : null;
  if (Boolean(handoffId) === Boolean(matchId)) return null;
  const asked = keys(o.asked);
  return {
    source: handoffId ? "finder" : "match",
    handoffId,
    matchId,
    clinicianId,
    deviceId: uuid(o.deviceId) ?? "",
    stars,
    feedback,
    asked,
    met: keys(o.met).filter((k) => asked.includes(k)),
    at: now.toISOString(),
  };
}

// ── The store ───────────────────────────────────────────────────────────────────────────────────

/** The most of each kind this instance holds; the oldest goes first. The tables hold everything. */
export const CAP = 5000;

type Table = "finder_searches" | "voice_calls" | "finder_events" | "finder_handoffs" | "visit_ratings";

interface State {
  searches: SearchRecord[];
  calls: VoiceCallRecord[];
  events: EventRecord[];
  handoffs: HandoffRecord[];
  ratings: Map<string, RatingRecord>;
  journal: { sent: number; failed: number; chain: Promise<void> };
}

const holder = globalThis as { __adhdMeFinderDb?: State };
function fresh(): State {
  return { searches: [], calls: [], events: [], handoffs: [], ratings: new Map(), journal: { sent: 0, failed: 0, chain: Promise.resolve() } };
}
function state(): State {
  holder.__adhdMeFinderDb ??= fresh();
  return holder.__adhdMeFinderDb;
}

/** Registered in src/lib/stores.ts, so a reset of every store clears it too. */
export function resetFinderDb(): void {
  holder.__adhdMeFinderDb = fresh();
}

function capped<T>(list: T[], item: T): void {
  list.push(item);
  if (list.length > CAP) list.splice(0, list.length - CAP);
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean }>;

/** Sends one row to its table when Supabase is configured; in order, never awaited by a request. */
function journal(table: Table, row: Record<string, unknown>, env: Record<string, string | undefined>, fetchFn: FetchLike = fetch): void {
  const url = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return;
  const s = state();
  s.journal.chain = s.journal.chain.then(async () => {
    const reply = await fetchFn(`${url}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
    }).catch(() => ({ ok: false }));
    if (reply.ok) s.journal.sent += 1;
    else s.journal.failed += 1;
  });
}

interface Deps {
  env?: Record<string, string | undefined>;
  fetch?: FetchLike;
}

export function recordSearch(record: SearchRecord, deps: Deps = {}): void {
  capped(state().searches, record);
  journal("finder_searches", {
    id: record.id, device_id: record.deviceId, created_at: record.createdAt, source: record.source, request_text: record.requestText,
    place: record.place, filters: record.filters, read_source: record.readSource, asked: record.asked, shown: record.shown,
  }, deps.env ?? process.env, deps.fetch);
}

export function recordVoiceCall(record: VoiceCallRecord, deps: Deps = {}): void {
  capped(state().calls, record);
  journal("voice_calls", {
    id: record.id, device_id: record.deviceId, search_id: record.searchId, created_at: record.createdAt,
    model: record.model, questions: record.questions, seconds: record.seconds, outcome: record.outcome,
  }, deps.env ?? process.env, deps.fetch);
}

export function recordEvent(record: EventRecord, deps: Deps = {}): void {
  capped(state().events, record);
  journal("finder_events", { id: record.id, search_id: record.searchId, created_at: record.createdAt, kind: record.kind, clinician_id: record.clinicianId }, deps.env ?? process.env, deps.fetch);
}

export function recordHandoff(record: HandoffRecord, deps: Deps = {}): void {
  capped(state().handoffs, record);
  journal("finder_handoffs", {
    id: record.id, search_id: record.searchId, device_id: record.deviceId, clinician_id: record.clinicianId,
    created_at: record.createdAt, asked: record.asked, met: record.met,
  }, deps.env ?? process.env, deps.fetch);
}

/** One rating per visit: a second answer for the same handoff or match replaces the first. */
export function rateVisit(input: NonNullable<ReturnType<typeof parseRating>>, deps: Deps = {}): RatingRecord {
  const s = state();
  const visit = input.handoffId ?? `match:${input.matchId}`;
  const held = s.ratings.get(visit);
  const record: RatingRecord = {
    id: held?.id ?? crypto.randomUUID(),
    source: input.source,
    handoffId: input.handoffId,
    matchId: input.matchId,
    clinicianId: input.clinicianId,
    deviceId: input.deviceId,
    stars: input.stars,
    // A note can follow the stars; the stars alone never erase one already given.
    feedback: input.feedback || held?.feedback || "",
    asked: input.asked.length ? input.asked : held?.asked ?? [],
    met: input.asked.length ? input.met : held?.met ?? [],
    createdAt: held?.createdAt ?? input.at,
    updatedAt: input.at,
  };
  s.ratings.delete(visit);
  s.ratings.set(visit, record);
  if (s.ratings.size > CAP) s.ratings.delete(s.ratings.keys().next().value!);
  journal("visit_ratings", {
    id: record.id, source: record.source, handoff_id: record.handoffId, match_id: record.matchId, clinician_id: record.clinicianId,
    device_id: record.deviceId, stars: record.stars, feedback: record.feedback, asked: record.asked, met: record.met,
    created_at: record.createdAt, updated_at: record.updatedAt,
  }, deps.env ?? process.env, deps.fetch);
  return record;
}

/** Every row one device made, for an access request. */
export function exportFinderDevice(deviceId: string) {
  const s = state();
  const searches = s.searches.filter((r) => r.deviceId === deviceId);
  const ids = new Set(searches.map((r) => r.id));
  return {
    searches,
    events: s.events.filter((r) => ids.has(r.searchId)),
    calls: s.calls.filter((r) => r.deviceId === deviceId),
    handoffs: s.handoffs.filter((r) => r.deviceId === deviceId),
    ratings: [...s.ratings.values()].filter((r) => r.deviceId === deviceId),
  };
}

/** Removes every row one device made, here and, when configured, in the tables (events go with their searches). */
export function eraseFinderDevice(deviceId: string, deps: Deps = {}): void {
  const s = state();
  const gone = new Set(s.searches.filter((r) => r.deviceId === deviceId).map((r) => r.id));
  s.searches = s.searches.filter((r) => r.deviceId !== deviceId);
  s.events = s.events.filter((r) => !gone.has(r.searchId));
  s.calls = s.calls.filter((r) => r.deviceId !== deviceId);
  s.handoffs = s.handoffs.filter((r) => r.deviceId !== deviceId);
  for (const [visit, r] of s.ratings) if (r.deviceId === deviceId) s.ratings.delete(visit);
  const env = deps.env ?? process.env;
  const url = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || !UUID.test(deviceId)) return;
  const fetchFn = deps.fetch ?? fetch;
  for (const table of ["visit_ratings", "finder_handoffs", "voice_calls", "finder_searches"] as const) {
    s.journal.chain = s.journal.chain.then(async () => {
      const reply = await fetchFn(`${url}/rest/v1/${table}?device_id=eq.${encodeURIComponent(deviceId)}`, {
        method: "DELETE",
        headers: { apikey: key, authorization: `Bearer ${key}`, prefer: "return=minimal" },
        body: "",
      }).catch(() => ({ ok: false }));
      if (reply.ok) s.journal.sent += 1;
      else s.journal.failed += 1;
    });
  }
}

export function ratings(): RatingRecord[] {
  return [...state().ratings.values()];
}

/** What this instance holds, for the tests and the ops view; no row leaves through here. */
export function finderDbCounts() {
  const s = state();
  return { searches: s.searches.length, calls: s.calls.length, events: s.events.length, handoffs: s.handoffs.length, ratings: s.ratings.size, journal: { sent: s.journal.sent, failed: s.journal.failed } };
}

/** Waits for the journal's queued writes; the tests use it. */
export function journalSettled(): Promise<void> {
  return state().journal.chain;
}
