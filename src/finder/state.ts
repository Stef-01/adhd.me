// U8 (O229): the finder's state model — where a stage lives when the page is not looking.
//
// Until U8 the finder was one React `useState` on one URL: Back left the site from the booking
// screen, reload dropped the person back on the welcome screen with their words gone, and the
// suburb they typed lived nowhere a link could carry. This module decides the three homes a piece
// of finder state may have, and the plan's §2.8 Q-A rule is the law that assigns them:
//
//   PATIENT TEXT NEVER APPEARS IN A URL, A HISTORY ENTRY, A LOG LINE OR AN ANALYTICS EVENT.
//
//   1. The URL carries `place` and nothing else. `finderSearch` is the ONLY serialiser and it
//      takes one argument, so nothing else can reach the address bar; `placeFrom` is its inverse
//      and reads one key. A suburb is a public word the person chose to share with a ranking, and
//      a link that carries it re-ranks the same way — the request never travels with it.
//   2. `history.state` carries the stage and its position in the trail — two words, no text — so
//      Back and Forward walk the stages instead of leaving the site, and Next's router (which
//      reloads the page on a popstate whose state it did not stamp) sees an object it can stamp.
//   3. `sessionStorage`, under a versioned key, carries the request, the draft, the chosen
//      clinician's id and the trail of stages: a reload resumes the same tab, a fresh tab starts
//      clean, and closing the tab ends it. The version is what lets a later shape refuse an old
//      record instead of misreading it.
//
// Every function here is pure over a `FinderHost` — the four browser facts it needs, handed in —
// so the model is unit-tested in node with a fake host and the React side (`app/care-finder.tsx`)
// owns only the wiring: which stage follows which is the state machine's, where a stage lives is
// this module's. `state.test.ts` plants a sentence and proves it reaches storage and nowhere else.

/** The finder's screens, in no particular order; the trail records the order a person walked. */
export const STAGES = ["welcome", "scenarios", "listening", "type", "results", "profile", "compare", "booking"] as const;
export type Stage = (typeof STAGES)[number];

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

/** Bumped when `FinderRecord` or `FinderEntry` changes shape; an older record is ignored, not migrated. */
export const STATE_VERSION = 1;
/** The sessionStorage key. Versioned in the name too, so two shapes never share one slot. */
export const STORAGE_KEY = `adhdme.finder.v${STATE_VERSION}`;

/** What survives a reload — in the tab, never in the address bar. */
export interface FinderRecord {
  v: typeof STATE_VERSION;
  request: string;
  draft: string;
  /** The chosen clinician's id, or null before one is chosen. */
  matchId: string | null;
  /** The stages walked, by history index; `trail[0]` is the entry the finder arrived on. */
  trail: Stage[];
}

/** What a history entry carries: the stage and its index into the trail. Two words. */
export interface FinderEntry {
  v: typeof STATE_VERSION;
  stage: Stage;
  index: number;
}

/** The browser facts the model needs, as a fake in tests and as `window` in the finder. */
export interface FinderHost {
  history: Pick<History, "state" | "pushState" | "replaceState" | "go">;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  /** `location.pathname`, so an entry keeps the URL it is on. */
  pathname: string;
  /** `location.search`, the source of `place` on arrival. */
  search: string;
}

// ---------------------------------------------------------------------------------------------
// 1. The URL: `place` and nothing else.

const PLACE_KEY = "place";

/** The finder's search string for a place — `?place=…` or the empty string. The only serialiser. */
export function finderSearch(place: string): string {
  const trimmed = place.trim();
  if (!trimmed) return "";
  const params = new URLSearchParams();
  params.set(PLACE_KEY, trimmed);
  return `?${params.toString()}`;
}

/** The place a search string carries; "" when none. The inverse of `finderSearch`, and the only reader. */
export function placeFrom(search: string): string {
  return (new URLSearchParams(search).get(PLACE_KEY) ?? "").trim().slice(0, 80);
}

/**
 * U10: whether the address bar carried `?debug=1` — the founder's own phone (O18), where the mic
 * banner appends the raw error code and the O70 environment facts. Read ONCE, here, on arrival:
 * the orchestrator used to re-read the URL at each failure, and `finderSearch` — which carries
 * `place` and nothing else, by the law above — had rewritten it by then, so a place edit silently
 * switched the debug banner off. Nothing writes this key; it is honoured as it arrived.
 */
export function debugFrom(search: string): boolean {
  return new URLSearchParams(search).has("debug");
}

// ---------------------------------------------------------------------------------------------
// 3. The tab: the record.

export function emptyRecord(): FinderRecord {
  return { v: STATE_VERSION, request: "", draft: "", matchId: null, trail: ["welcome"] };
}

/** The tab's record, or null when there is none, it is another version, or it is malformed. */
export function readRecord(storage: FinderHost["storage"]): FinderRecord | null {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const r = parsed as Partial<FinderRecord>;
    if (r.v !== STATE_VERSION || typeof r.request !== "string" || typeof r.draft !== "string") return null;
    if (r.matchId !== null && typeof r.matchId !== "string") return null;
    if (!Array.isArray(r.trail) || r.trail.length === 0 || !r.trail.every(isStage)) return null;
    return { v: STATE_VERSION, request: r.request, draft: r.draft, matchId: r.matchId, trail: [...r.trail] };
  } catch {
    return null;
  }
}

export function writeRecord(storage: FinderHost["storage"], record: FinderRecord): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // A full or refused storage costs a reload its resume, nothing else.
  }
}

export function clearRecord(storage: FinderHost["storage"]): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // As above.
  }
}

// ---------------------------------------------------------------------------------------------
// 2. History: one entry per stage.

/** The finder's entry inside a history state, or null when the state is not the finder's. */
export function entryOf(state: unknown): FinderEntry | null {
  if (!state || typeof state !== "object") return null;
  const entry = (state as { finder?: unknown }).finder;
  if (!entry || typeof entry !== "object") return null;
  const e = entry as Partial<FinderEntry>;
  if (e.v !== STATE_VERSION || !isStage(e.stage) || typeof e.index !== "number" || e.index < 0) return null;
  return { v: STATE_VERSION, stage: e.stage, index: Math.floor(e.index) };
}

/** A history state carrying the entry. Always an object: Next reloads on a popstate whose state is null. */
function stateFor(entry: FinderEntry): { finder: FinderEntry } {
  return { finder: entry };
}

/**
 * The stage a person lands on when an entry is REVISITED — by Back, Forward or a reload — rather
 * than reached. `listening` is the one stage that cannot be resumed: the microphone starts only
 * from a tap (WebKit's rule, O48), so revisiting it lands on the typing screen with the draft
 * intact, one tap from the microphone. Every other stage is its own destination.
 */
export function stageOnRevisit(stage: Stage): Stage {
  return stage === "listening" ? "type" : stage;
}

/** Where a person is after arriving: the position, the place, and the record to resume from. */
export interface Arrival {
  stage: Stage;
  index: number;
  /** The place the address bar carried in, "" when none — home 1, read on every arrival. */
  place: string;
  /** Whether the address bar carried `?debug=1` (U10) — read here once, never re-read, never written. */
  debug: boolean;
  record: FinderRecord;
  /** True when the finder resumed an entry it had left (reload, or Back into it) rather than starting. */
  resumed: boolean;
}

/**
 * On mount. An entry already stamped on the current history state means the finder is being
 * revisited — a reload, or Back from another page into a stage it left — and it resumes there
 * with the tab's record. Anything else is a fresh start: the current entry becomes trail index 0
 * (`replaceState`, so the page the person came from is still one Back away), the tab's record is
 * cleared, and the stage is welcome. The URL is kept as it is — `place` came in on it, and it is
 * read HERE, on the client, never on the server: a page that reads `searchParams` keys its
 * segment on the query, and after a place edit the entries behind the person carry the old key,
 * so a reload followed by Back has Next patch the page from the server and rewrite the entry
 * without the finder's stamp. A static page has one key for every query and the entries hold.
 */
export function arrive(host: FinderHost): Arrival {
  const place = placeFrom(host.search);
  const debug = debugFrom(host.search);
  const entry = entryOf(host.history.state);
  if (entry) {
    const record = readRecord(host.storage) ?? emptyRecord();
    // The trail is the record's; the entry's index is authoritative for WHERE, and a trail the
    // record lost (storage cleared) is rebuilt as far as the entry so later Backs still resolve.
    while (record.trail.length <= entry.index) record.trail.push(record.trail.at(-1) ?? "welcome");
    record.trail[entry.index] = entry.stage;
    return { stage: stageOnRevisit(entry.stage), index: entry.index, place, debug, record, resumed: true };
  }
  const start: FinderEntry = { v: STATE_VERSION, stage: "welcome", index: 0 };
  host.history.replaceState(stateFor(start), "", host.pathname + host.search);
  clearRecord(host.storage);
  return { stage: "welcome", index: 0, place, debug, record: emptyRecord(), resumed: false };
}

/**
 * A forward move: the trail is cut at the current index (Forward entries the person is leaving
 * behind are gone, exactly as the browser's own are) and the new stage pushed after it. The URL
 * does not change — the stage is in the entry, not the address bar.
 */
export function advance(host: FinderHost, record: FinderRecord, index: number, stage: Stage): { record: FinderRecord; index: number } {
  const next = index + 1;
  const trail = [...record.trail.slice(0, next), stage];
  const updated = { ...record, trail };
  host.history.pushState(stateFor({ v: STATE_VERSION, stage, index: next }), "");
  writeRecord(host.storage, updated);
  return { record: updated, index: next };
}

/**
 * An in-app Back control walks the REAL history: the delta (negative) to the nearest earlier
 * entry for the target stage, so the browser's Forward still works afterwards and the stack does
 * not grow with every tap. Null when the target is not behind the person — a stage reached by a
 * route that skipped it — in which case the caller advances instead.
 */
export function stepsBackTo(trail: readonly Stage[], index: number, target: Stage): number | null {
  for (let i = Math.min(index, trail.length) - 1; i >= 0; i -= 1) {
    if (trail[i] === target) return i - index;
  }
  return null;
}

/** The place in the address bar, rewritten in place — never a new entry, never anything else. */
export function writePlace(host: FinderHost, place: string): void {
  try {
    host.history.replaceState(host.history.state ?? {}, "", host.pathname + finderSearch(place));
  } catch {
    // Safari throttles replaceState (100 calls in 30 s, then a SecurityError) and a fast typist
    // can reach it; the address bar lags a keystroke and catches up on the next one.
  }
}
