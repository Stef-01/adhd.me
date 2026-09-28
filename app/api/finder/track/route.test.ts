// The finder's record route: a beacon's text body of one typed record, kept or refused whole.

import { beforeEach, describe, expect, it } from "vitest";
import { finderDbCounts, resetFinderDb } from "@/db/finder";
import { resetRateLimits } from "@/lib/rate-limit";
import { POST } from "./route";

const A = "11111111-1111-4111-8111-111111111111";
const D = "33333333-3333-4333-8333-333333333333";
const send = (body: unknown, caller = "203.0.113.4") =>
  POST(new Request("http://local/api/finder/track", { method: "POST", headers: { "content-type": "text/plain", "x-forwarded-for": caller }, body: typeof body === "string" ? body : JSON.stringify(body) }));

beforeEach(() => {
  resetFinderDb();
  resetRateLimits();
});

describe("POST /api/finder/track", () => {
  it("keeps a search, a voice call, an event and a handoff sent as beacon text", async () => {
    expect((await send({ type: "search", record: { id: A, deviceId: D, source: "typed", requestText: "a GP who bulk bills", readSource: "lexicon", asked: ["pref:bulk-billing"], shown: ["mei-chao"] } })).status).toBe(204);
    expect((await send({ type: "voice", record: { id: A, deviceId: D, model: "gpt-realtime-2.1-mini", questions: 3, seconds: 70, outcome: "stopped" } })).status).toBe(204);
    expect((await send({ type: "event", record: { id: A, searchId: A, kind: "profile", clinicianId: "mei-chao" } })).status).toBe(204);
    expect((await send({ type: "handoff", record: { id: A, deviceId: D, clinicianId: "mei-chao", asked: [], met: [] } })).status).toBe(204);
    expect(finderDbCounts()).toMatchObject({ searches: 1, calls: 1, events: 1, handoffs: 1 });
  });

  it("refuses an unknown type, a record that does not parse, bad JSON and an oversized body", async () => {
    expect((await send({ type: "rating", record: {} })).status).toBe(400);
    expect((await send({ type: "search", record: { id: "x" } })).status).toBe(400);
    expect((await send("{not json")).status).toBe(400);
    expect((await send("x".repeat(8001))).status).toBe(413);
    expect(finderDbCounts()).toMatchObject({ searches: 0, calls: 0, events: 0, handoffs: 0 });
  });
});
