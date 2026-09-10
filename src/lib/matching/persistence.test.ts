// M5 verify gate: the journal mirrors every store write in order, never throws into a route,
// hydrates a cold instance from the tables, and the row mapping round-trips every entity.

import { afterEach, describe, expect, it } from "vitest";
import { generateChecklist } from "./checklist";
import { SupabaseJournal, applyRow, fromRow, supabaseEndpointFromEnv, toRow, type JournalWrite } from "./persistence";
import { attachMatchingJournal, eraseMatchingPatient, hydrateMatching, resetMatching, saveChecklist, saveFeedback, saveMatches, savePatient, setMatchStatus } from "./store";
import { embedder, gp, patient } from "./test-fixtures";
import type { Feedback, Match } from "./types";

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };

function fakeServer(options: { failing?: (call: Call) => boolean; tables?: Partial<Record<string, unknown[]>> } = {}) {
  const calls: Call[] = [];
  const fetchFn = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    const call = { url, ...init };
    calls.push(call);
    if (options.failing?.(call)) return { ok: false, status: 500, json: async () => ({}) };
    const table = url.split("/rest/v1/")[1]?.split("?")[0] ?? "";
    return { ok: true, status: init.method === "GET" ? 200 : 201, json: async () => options.tables?.[table] ?? [] };
  };
  return { calls, fetchFn };
}

const match = (overrides: Partial<Match> = {}): Match => ({
  id: "m-p1-g1",
  patientId: "p1",
  gpId: "g1",
  patientRankScore: 0.71,
  gpRankScore: 0.64,
  similarity: 0.52,
  position: 1,
  matchStatus: "proposed",
  rationale: { headline: "Says she often sees adults", points: ["telehealth"], sharedConcepts: ["adult-assessment"] },
  patientBreakdown: [{ criterion: "similarity", weight: 0.4, raw: 0.52, weighted: 0.208, sentence: "Their bio reads close to what you wrote." }],
  createdAt: "2026-09-10T00:00:00.000Z",
  decidedAt: null,
  declineReason: null,
  ...overrides,
});

const feedback: Feedback = {
  id: "f1",
  matchId: "m-p1-g1",
  from: "patient",
  patientRating: { fit: 4, communication: 5, clinicalAppropriateness: 4 },
  gpRating: null,
  freeTextFeedback: "",
  createdAt: "2026-09-10T01:00:00.000Z",
};

afterEach(() => {
  attachMatchingJournal(null);
  resetMatching();
});

describe("M5 the row mapping", () => {
  it("round-trips a patient, a GP, a match, feedback and a checklist", () => {
    const p = patient({ id: "p1", narrativeEmbedding: embedder.embed("adult assessment") });
    expect(fromRow.match_patients(toRow.match_patients(p))).toEqual(p);
    const g = gp({ id: "g1", bioEmbedding: embedder.embed("adults and titration") });
    expect(fromRow.match_gps(toRow.match_gps(g))).toEqual(g);
    const m = match({ matchStatus: "declined", decidedAt: "2026-09-11T00:00:00.000Z", declineReason: "no_capacity" });
    expect(fromRow.match_matches(toRow.match_matches(m))).toEqual(m);
    expect(fromRow.match_feedback(toRow.match_feedback(feedback))).toEqual(feedback);
    const c = generateChecklist(p, embedder, "2026-09-10T00:00:00.000Z");
    expect(fromRow.match_checklists(toRow.match_checklists(c))).toEqual(c);
  });

  it("reads pgvector's text form and numeric strings back into numbers", () => {
    const row = { ...toRow.match_matches(match()), patient_rank_score: "0.710", similarity: "0.520", position: "1" };
    const m = fromRow.match_matches(row);
    expect(m.patientRankScore).toBe(0.71);
    expect(m.similarity).toBe(0.52);
    expect(m.position).toBe(1);
    const p = fromRow.match_patients({ ...toRow.match_patients(patient({ id: "p1" })), narrative_embedding: "[0.5,0.25]" });
    expect(p.narrativeEmbedding).toEqual([0.5, 0.25]);
  });

  it("is off without both variables, and strips a trailing slash", () => {
    expect(supabaseEndpointFromEnv({})).toBeNull();
    expect(supabaseEndpointFromEnv({ SUPABASE_URL: "https://x.supabase.co/" })).toBeNull();
    expect(supabaseEndpointFromEnv({ SUPABASE_URL: "https://x.supabase.co/", SUPABASE_SERVICE_ROLE_KEY: "k" })).toEqual({ url: "https://x.supabase.co", key: "k" });
  });
});

describe("M5 the journal", () => {
  it("flushes writes in the order they were queued, as PostgREST upserts and deletes", async () => {
    const server = fakeServer();
    const journal = new SupabaseJournal({ url: "https://x.supabase.co", key: "k" }, server.fetchFn);
    const writes: JournalWrite[] = [
      { table: "match_patients", op: "upsert", id: "p1", row: { id: "p1" } },
      { table: "match_matches", op: "upsert", id: "m1", row: { id: "m1" } },
      { table: "match_matches", op: "delete", id: "m1" },
    ];
    for (const w of writes) journal.record(w);
    await journal.settle();
    expect(server.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST https://x.supabase.co/rest/v1/match_patients",
      "POST https://x.supabase.co/rest/v1/match_matches",
      "DELETE https://x.supabase.co/rest/v1/match_matches?id=eq.m1",
    ]);
    expect(server.calls[0]!.headers.prefer).toBe("resolution=merge-duplicates,return=minimal");
    expect(server.calls[0]!.headers.apikey).toBe("k");
    expect(server.calls[0]!.headers.authorization).toBe("Bearer k");
    expect(journal.stats).toEqual({ queued: 3, flushed: 3, failed: 0, hydrated: false });
  });

  it("counts a failed flush and keeps going; nothing reaches the caller", async () => {
    const server = fakeServer({ failing: (c) => c.url.endsWith("match_matches") });
    const journal = new SupabaseJournal({ url: "https://x.supabase.co", key: "k" }, server.fetchFn);
    journal.record({ table: "match_matches", op: "upsert", id: "m1", row: {} });
    journal.record({ table: "match_patients", op: "upsert", id: "p1", row: {} });
    await journal.settle();
    expect(journal.stats.failed).toBe(1);
    expect(journal.stats.flushed).toBe(1);
    const thrower = new SupabaseJournal({ url: "https://x.supabase.co", key: "k" }, async () => {
      throw new Error("network");
    });
    thrower.record({ table: "match_patients", op: "upsert", id: "p1", row: {} });
    await expect(thrower.settle()).resolves.toBeUndefined();
    expect(thrower.stats.failed).toBe(1);
  });

  it("hydrates every table into the state once, and retries only after a failure", async () => {
    const p = patient({ id: "p1" });
    const server = fakeServer({
      tables: {
        match_gps: [toRow.match_gps(gp({ id: "g1", acceptingNewPatients: false }))],
        match_patients: [toRow.match_patients(p)],
        match_matches: [toRow.match_matches(match())],
        match_feedback: [toRow.match_feedback(feedback)],
        match_checklists: [toRow.match_checklists(generateChecklist(p, embedder, "2026-09-10T00:00:00.000Z"))],
      },
    });
    const journal = new SupabaseJournal({ url: "https://x.supabase.co", key: "k" }, server.fetchFn);
    const state = resetMatching();
    await journal.hydrate(state);
    await journal.hydrate(state);
    expect(server.calls.filter((c) => c.method === "GET")).toHaveLength(5);
    expect(state.gps.get("g1")?.acceptingNewPatients).toBe(false);
    expect(state.patients.get("p1")?.narrativeText).toBe(p.narrativeText);
    expect(state.matches.get("m-p1-g1")?.position).toBe(1);
    expect(state.feedback.get("f1")?.from).toBe("patient");
    expect(state.checklists.get("p1")?.items.length).toBeGreaterThan(0);
    expect(journal.stats.hydrated).toBe(true);

    let fail = true;
    const flaky = fakeServer({ failing: () => fail });
    const retrying = new SupabaseJournal({ url: "https://x.supabase.co", key: "k" }, flaky.fetchFn);
    await retrying.hydrate(resetMatching());
    expect(retrying.stats.hydrated).toBe(false);
    fail = false;
    await retrying.hydrate(resetMatching());
    expect(retrying.stats.hydrated).toBe(true);
  });

  it("applyRow keys a checklist by its patient, like the store", () => {
    const state = resetMatching();
    applyRow(state, "match_checklists", { id: "c1", patient_id: "p9", items: [], generated_at: "2026-09-10T00:00:00.000Z" });
    expect(state.checklists.get("p9")?.id).toBe("c1");
  });
});

describe("M5 the store with a journal attached", () => {
  it("mirrors a patient, their matches, an acceptance's three rows, feedback, a checklist tick and an erasure", async () => {
    const server = fakeServer();
    const journal = new SupabaseJournal({ url: "https://x.supabase.co", key: "k" }, server.fetchFn);
    attachMatchingJournal(journal);
    const state = await hydrateMatching(resetMatching());
    const p = savePatient(patient({ id: "p1" }), state);
    state.gps.set("g1", gp({ id: "g1" }));
    saveMatches([match()], state);
    expect(setMatchStatus("m-p1-g1", "accepted", "2026-09-11T00:00:00.000Z", null, state).ok).toBe(true);
    saveFeedback(feedback, state);
    saveChecklist(generateChecklist(p, embedder, "2026-09-10T00:00:00.000Z"), state);
    eraseMatchingPatient("p1", state);
    await journal.settle();
    const writes = server.calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.url.split("/rest/v1/")[1]}`);
    expect(writes).toEqual([
      "POST match_patients",
      "POST match_matches",
      "POST match_matches",
      "POST match_patients",
      "POST match_gps",
      "POST match_feedback",
      "POST match_checklists",
      "DELETE match_feedback?id=eq.f1",
      "DELETE match_matches?id=eq.m-p1-g1",
      "DELETE match_checklists?id=eq.chk-p1",
      "DELETE match_patients?id=eq.p1",
    ]);
    const accepted = JSON.parse(server.calls.filter((c) => c.method === "POST")[2]!.body!) as { match_status: string; decided_at: string };
    expect(accepted.match_status).toBe("accepted");
    expect(accepted.decided_at).toBe("2026-09-11T00:00:00.000Z");
    expect(journal.stats.failed).toBe(0);
  });

  it("without a journal the store is exactly what it was: in memory, and hydrate is a no-op", async () => {
    attachMatchingJournal(null);
    const state = await hydrateMatching(resetMatching());
    savePatient(patient({ id: "p1" }), state);
    expect(state.patients.size).toBe(1);
  });
});
