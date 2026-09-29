// The finder's record: every browser write is parsed into a typed record or refused whole, a visit
// has one rating that a note can follow, and each write reaches its Supabase table when one is
// configured. The learner turns ratings into bounded weights per ask, never per clinician.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAP,
  eraseFinderDevice,
  exportFinderDevice,
  finderDbCounts,
  journalSettled,
  parseEvent,
  parseHandoff,
  parseRating,
  parseSearch,
  parseVoiceCall,
  rateVisit,
  ratings,
  recordSearch,
  recordVoiceCall,
  resetFinderDb,
} from "./finder";
import { askSignals, learnAskWeights, MAX_SHIFT, MIN_SAMPLES } from "./learn";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const D = "33333333-3333-4333-8333-333333333333";

beforeEach(() => resetFinderDb());
afterEach(() => vi.restoreAllMocks());

const search = {
  id: A,
  deviceId: D,
  source: "voice",
  requestText: "An ADHD assessment for my son, 9",
  place: "Parramatta",
  filters: { telehealth: false },
  readSource: "llm",
  asked: ["care:adhd-assessment", "care:child-adolescent-adhd", "not a key", 7],
  shown: ["mei-chao", "a b", "gp-2"],
};

describe("parsing what the browser sends", () => {
  it("keeps a whole search and drops only malformed list items", () => {
    const record = parseSearch(search)!;
    expect(record).toMatchObject({ id: A, source: "voice", readSource: "llm", place: "Parramatta" });
    expect(record.asked).toEqual(["care:adhd-assessment", "care:child-adolescent-adhd"]);
    expect(record.shown).toEqual(["mei-chao", "gp-2"]);
  });

  it("refuses a search with a bad id, source, read or oversized words", () => {
    expect(parseSearch({ ...search, id: "nope" })).toBeNull();
    expect(parseSearch({ ...search, source: "example" })).toBeNull();
    expect(parseSearch({ ...search, readSource: "guess" })).toBeNull();
    expect(parseSearch({ ...search, requestText: "x".repeat(2001) })).toBeNull();
    expect(parseSearch({ ...search, filters: { big: "x".repeat(3000) } })).toBeNull();
    expect(parseSearch(null)).toBeNull();
  });

  it("keeps a voice call, its counts bounded rather than refused (a call that ran long still happened)", () => {
    const call = { id: A, deviceId: D, model: "gpt-realtime-2.1-mini", questions: 5, seconds: 98, outcome: "revealed" };
    expect(parseVoiceCall(call)).toMatchObject({ questions: 5, searchId: null });
    // 2026-09-29: the founder's two calls with the most questions were refused whole on this bound and left no record.
    expect(parseVoiceCall({ ...call, questions: 9 })).toMatchObject({ questions: 9 });
    expect(parseVoiceCall({ ...call, questions: 400 })).toMatchObject({ questions: 32 });
    expect(parseVoiceCall({ ...call, seconds: 7200.4 })).toMatchObject({ seconds: 3600 });
    expect(parseVoiceCall({ ...call, seconds: -1 })).toBeNull();
    expect(parseVoiceCall({ ...call, questions: "five" })).toBeNull();
    expect(parseVoiceCall({ ...call, outcome: "great" })).toBeNull();
  });

  it("keeps a call's transcript, its request and place; drops a turn that is not one and cuts a long one, refusing only a transcript that is not a list", () => {
    const call = { id: A, deviceId: D, model: "gpt-realtime-2.1-mini", questions: 5, seconds: 98, outcome: "revealed" };
    const turns = [{ who: "assistant", text: "Hi." }, { who: "person", text: "I had a baby last year" }, { who: "tool", text: "show_matches {}" }];
    const kept = parseVoiceCall({ ...call, transcript: turns, request: "An ADHD assessment, postpartum", place: "Hornsby" });
    expect(kept).toMatchObject({ transcript: turns, request: "An ADHD assessment, postpartum", place: "Hornsby" });
    expect(parseVoiceCall(call)).toMatchObject({ transcript: [], request: "", place: "" });
    expect(parseVoiceCall({ ...call, transcript: [{ who: "narrator", text: "x" }, ...turns] })?.transcript).toEqual(turns);
    expect(parseVoiceCall({ ...call, transcript: [{ who: "person", text: "y".repeat(2500) }] })?.transcript[0]?.text).toHaveLength(2000);
    expect(parseVoiceCall({ ...call, transcript: Array.from({ length: 130 }, () => turns[0]) })?.transcript).toHaveLength(120);
    expect(parseVoiceCall({ ...call, transcript: "everything" })).toBeNull();
  });

  it("keeps one record per call: a call reported again under its id replaces its earlier report (stage 5)", () => {
    const call = parseVoiceCall({ id: A, deviceId: D, model: "gpt-realtime-2.1-mini", questions: 1, seconds: 20, outcome: "stopped", transcript: [{ who: "person", text: "an assessment" }] })!;
    recordVoiceCall(call);
    recordVoiceCall(parseVoiceCall({ id: B, deviceId: D, model: "gpt-realtime-2.1-mini", questions: 0, seconds: 3, outcome: "stopped" })!);
    recordVoiceCall({ ...call, questions: 3, seconds: 70, outcome: "revealed", transcript: [...call.transcript, { who: "person", text: "Hornsby" }] });
    const calls = exportFinderDevice(D).calls;
    expect(calls.map((held) => held.id)).toEqual([B, A]);
    expect(calls[1]).toMatchObject({ questions: 3, outcome: "revealed" });
    expect(calls[1]!.transcript).toHaveLength(2);
  });

  it("keeps a search's unlisted asks, bounded, and never a key among them", () => {
    const search = { id: A, deviceId: B, source: "voice", requestText: "help", readSource: "llm", unlisted: ["relates to postpartum", "  ", 7, "x".repeat(81), ...Array.from({ length: 12 }, (_, i) => `ask ${i}`)] };
    expect(parseSearch(search)?.unlisted).toEqual(["relates to postpartum", ...Array.from({ length: 9 }, (_, i) => `ask ${i}`)]);
    expect(parseSearch({ ...search, unlisted: undefined })?.unlisted).toEqual([]);
  });

  it("keeps an event of a known kind for a search", () => {
    expect(parseEvent({ id: A, searchId: B, kind: "profile", clinicianId: "mei-chao" })).toMatchObject({ kind: "profile", clinicianId: "mei-chao" });
    expect(parseEvent({ id: A, searchId: B, kind: "click" })).toBeNull();
    expect(parseEvent({ id: A, kind: "more" })).toBeNull();
  });

  it("keeps only met asks that were asked, on a handoff and a rating", () => {
    const handoff = parseHandoff({ id: A, deviceId: D, clinicianId: "mei-chao", asked: ["pref:woman-gp"], met: ["pref:woman-gp", "pref:bulk-billing"] })!;
    expect(handoff.met).toEqual(["pref:woman-gp"]);
    const rating = parseRating({ handoffId: A, clinicianId: "mei-chao", stars: 4, asked: ["pref:woman-gp"], met: ["pref:bulk-billing"] })!;
    expect(rating).toMatchObject({ source: "finder", stars: 4, met: [], feedback: "" });
  });

  it("refuses a rating without exactly one visit, or with stars off the scale", () => {
    expect(parseRating({ clinicianId: "mei-chao", stars: 4 })).toBeNull();
    expect(parseRating({ handoffId: A, matchId: "m-1", clinicianId: "mei-chao", stars: 4 })).toBeNull();
    for (const stars of [0, 6, 3.5, "4"]) expect(parseRating({ handoffId: A, clinicianId: "mei-chao", stars })).toBeNull();
    expect(parseRating({ handoffId: A, clinicianId: "mei-chao", stars: 3, feedback: "x".repeat(1001) })).toBeNull();
    expect(parseRating({ matchId: "m-1", clinicianId: "gp-1", stars: 5 })).toMatchObject({ source: "match" });
  });
});

describe("one rating per visit", () => {
  it("lets a note follow the stars, and new stars keep the note", () => {
    const at = new Date("2026-09-28T10:00:00Z");
    rateVisit(parseRating({ handoffId: A, clinicianId: "mei-chao", stars: 4, asked: ["pref:woman-gp"], met: ["pref:woman-gp"] }, at)!);
    rateVisit(parseRating({ handoffId: A, clinicianId: "mei-chao", stars: 4, feedback: "Listened properly." }, new Date("2026-09-28T10:01:00Z"))!);
    rateVisit(parseRating({ handoffId: A, clinicianId: "mei-chao", stars: 5 }, new Date("2026-09-28T10:02:00Z"))!);
    const [only, ...rest] = ratings();
    expect(rest).toEqual([]);
    expect(only).toMatchObject({ stars: 5, feedback: "Listened properly.", asked: ["pref:woman-gp"], met: ["pref:woman-gp"], createdAt: at.toISOString() });
  });

  it("holds at most CAP of each kind, dropping the oldest", () => {
    for (let i = 0; i < CAP + 3; i++) recordSearch({ ...parseSearch(search)!, id: `${A.slice(0, -4)}${String(i).padStart(4, "0")}` });
    expect(finderDbCounts().searches).toBe(CAP);
  });
});

describe("the journal to Supabase", () => {
  it("sends nothing without Supabase configured", async () => {
    const send = vi.fn(async () => ({ ok: true }));
    recordSearch(parseSearch(search)!, { env: {}, fetch: send });
    await journalSettled();
    expect(send).not.toHaveBeenCalled();
  });

  it("upserts each write to its table with the service role, and counts a failure without its row", async () => {
    const send = vi.fn(async () => ({ ok: true }));
    const env = { SUPABASE_URL: "https://db.example/", SUPABASE_SERVICE_ROLE_KEY: "service" };
    recordSearch(parseSearch(search)!, { env, fetch: send });
    rateVisit(parseRating({ handoffId: A, clinicianId: "mei-chao", stars: 2 })!, { env, fetch: async () => ({ ok: false }) });
    await journalSettled();
    const [url, init] = send.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe("https://db.example/rest/v1/finder_searches");
    expect(init.headers).toMatchObject({ apikey: "service", authorization: "Bearer service", prefer: "resolution=merge-duplicates,return=minimal" });
    expect(JSON.parse(init.body)).toMatchObject({ id: A, request_text: search.requestText, read_source: "llm" });
    expect(finderDbCounts().journal).toEqual({ sent: 1, failed: 1, refused: 0, failedLast: expect.stringMatching(/^[a-z_]+ \d+$/) });
  });
});

describe("what the ratings teach", () => {
  const visit = (stars: number, met: boolean) => ({ stars: stars as 1 | 2 | 3 | 4 | 5, asked: ["manner:not_rushed", "pref:telehealth-first"], met: met ? ["manner:not_rushed"] : [] });

  it("groups each ask's visits by whether the clinician declared it", () => {
    const [takesTime, telehealth] = askSignals([visit(5, true), visit(3, false), visit(4, true)]);
    expect(takesTime).toEqual({ key: "manner:not_rushed", metN: 2, metStars: 4.5, unmetN: 1, unmetStars: 3 });
    expect(telehealth).toMatchObject({ metN: 0, unmetN: 3 });
  });

  it("learns nothing until each side has enough visits", () => {
    const few = [...Array(MIN_SAMPLES - 1)].flatMap(() => [visit(5, true), visit(2, false)]);
    expect(learnAskWeights(askSignals(few))).toEqual({});
  });

  it("raises an ask that went with better visits and lowers one that went with worse, within the bound", () => {
    const better = [...Array(MIN_SAMPLES)].flatMap(() => [visit(5, true), visit(3, false)]);
    expect(learnAskWeights(askSignals(better))).toEqual({ "manner:not_rushed": 1.25 });
    const worse = [...Array(MIN_SAMPLES)].flatMap(() => [visit(1, true), visit(5, false)]);
    expect(learnAskWeights(askSignals(worse))["manner:not_rushed"]).toBe(1 - MAX_SHIFT);
  });

  it("never keys a weight to a clinician", () => {
    const many = [...Array(MIN_SAMPLES)].flatMap(() => [visit(5, true), visit(1, false)]);
    for (const key of Object.keys(learnAskWeights(askSignals(many)))) expect(key).toMatch(/^(care|manner|pref|language):/);
  });
});

describe("a device's rows, for access and erasure", () => {
  it("returns every row one device made, and erases them all, here and in the tables", async () => {
    const other = "44444444-4444-4444-8444-444444444444";
    recordSearch(parseSearch(search)!);
    recordSearch(parseSearch({ ...search, id: B, deviceId: other })!);
    rateVisit(parseRating({ handoffId: A, clinicianId: "mei-chao", stars: 4, deviceId: D })!);
    expect(exportFinderDevice(D)).toMatchObject({ searches: [{ id: A }], ratings: [{ stars: 4 }] });
    const send = vi.fn(async (_url: string, _init: unknown) => ({ ok: true }));
    eraseFinderDevice(D, { env: { SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "service" }, fetch: send });
    await journalSettled();
    expect(exportFinderDevice(D)).toEqual({ searches: [], events: [], calls: [], handoffs: [], ratings: [] });
    expect(finderDbCounts().searches).toBe(1);
    expect(send.mock.calls.map(([url]) => url)).toEqual(["visit_ratings", "finder_handoffs", "voice_calls", "finder_searches"].map((t) => `https://db.example/rest/v1/${t}?device_id=eq.${D}`));
  });
});
