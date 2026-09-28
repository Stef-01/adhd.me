// The finder's read route with no paid call: the network is a stub that fails the test if a level
// that must not reach it does, and at level 1 it answers from the committed cassettes.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { CHECKS, lexiconReading, READS } from "@/lib/matching/llm-read";
import { resetRateLimits } from "@/lib/rate-limit";
import { PAUSE_MS, resetKeyPause } from "@/lib/llm/key-pause";
import { resetReadCache } from "@/lib/matching/read-cache";
import { POST } from "./route";

const cassette = (name: string) => CASSETTES.find((c) => c.class === name && c.expect.source === "llm")!;
const INCOMPLETE = CASSETTES.find((c) => c.response && (c.response as { status?: string }).status === "incomplete")!;
const read = async (text: unknown) => {
  const reply = await POST(new Request("http://local/api/finder/read", { method: "POST", body: JSON.stringify({ text }) }));
  return { status: reply.status, body: await reply.json() };
};

let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  resetRateLimits();
  resetKeyPause();
  resetReadCache();
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("ADHDME_LLM_LEVEL", "");
  vi.stubEnv("ADHDME_LLM_CASSETTES", "");
  network = vi.fn(cassetteFetch(CASSETTES));
  vi.stubGlobal("fetch", network);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/finder/read", () => {
  it("at level 0 reads with the lexicon and never calls fetch, with or without a key", async () => {
    const { input } = cassette("C7");
    vi.stubEnv("OPENAI_API_KEY", "k");
    expect(await read(input)).toEqual({ status: 200, body: { keys: lexiconReading(input).keys, source: "lexicon" } });
    vi.stubEnv("ADHDME_LLM_LEVEL", "0");
    await read(input);
    expect(network).not.toHaveBeenCalled();
  });

  it("at level 1 with no key reads with the lexicon and never calls fetch", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    const { input } = cassette("C7");
    expect((await read(input)).body).toEqual({ keys: lexiconReading(input).keys, source: "lexicon" });
    expect(network).not.toHaveBeenCalled();
  });

  it("at level 1 returns the model's keys, three reads and a check of what they add, once per set of words", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const { input, expect: want } = cassette("C7");
    expect(want.keys).not.toEqual(lexiconReading(input).keys);
    // Every call answered, the check too, so the reading is whole and is remembered.
    network = vi.fn(cassetteFetch(CASSETTES, () => completed({ verdicts: [] })));
    vi.stubGlobal("fetch", network);
    expect((await read(input)).body).toEqual(want);
    // The same words, spaced and cased differently, read the same way from memory, with no call.
    expect((await read(`  ${input.toUpperCase()}  `)).body).toEqual(want);
    expect(network).toHaveBeenCalledTimes(READS + CHECKS);
  });

  it("answers a model failure with the lexicon's keys and source lexicon", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    expect((await read(INCOMPLETE.input)).body).toEqual({ keys: lexiconReading(INCOMPLETE.input).keys, source: "lexicon" });
    network.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await read("a woman GP")).body).toEqual({ keys: ["pref:woman-gp"], source: "lexicon" });
  });

  it("in cassette mode replays the recordings with no network, and reads other words as the lexicon does", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("ADHDME_LLM_CASSETTES", "1");
    expect((await read(cassette("C6").input)).body).toEqual(cassette("C6").expect);
    const other = (await read("a woman GP who bulk bills")).body;
    expect(other.source).toBe("llm");
    expect(new Set(other.keys)).toEqual(new Set(["pref:woman-gp", "pref:bulk-billing"]));
    expect(network).not.toHaveBeenCalled();
  });

  it("refuses text over 2,000 characters, or no text, before any call", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    expect((await read("a".repeat(2001))).status).toBe(400);
    expect((await read(42)).status).toBe(400);
    expect((await read("a".repeat(2000))).status).toBe(200);
    expect(network).toHaveBeenCalledTimes(READS);
  });

  it("after a key fails, reads with the lexicon for ten minutes without a call, then tries again", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const refused = vi.fn(async () => new Response(JSON.stringify({ error: { message: "Incorrect API key provided", code: "invalid_api_key" } }), { status: 401 }));
    vi.stubGlobal("fetch", refused);
    const { input } = cassette("C7");
    const lexicon = { keys: lexiconReading(input).keys, source: "lexicon" };
    expect((await read(input)).body).toEqual(lexicon);
    expect(refused).toHaveBeenCalledTimes(READS);
    expect((await read(input)).body).toEqual(lexicon);
    expect(refused).toHaveBeenCalledTimes(READS);
    vi.useFakeTimers({ now: Date.now() + PAUSE_MS + 1, toFake: ["Date"] });
    await read(input);
    vi.useRealTimers();
    expect(refused).toHaveBeenCalledTimes(2 * READS);
  });

  it("stops paying once the day's budget is spent, and answers with the lexicon without a call", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("ADHDME_LLM_DAILY_USD", "0");
    const { input } = cassette("C7");
    expect((await read(input)).body).toEqual({ keys: lexiconReading(input).keys, source: "lexicon" });
    expect(network).not.toHaveBeenCalled();
  });

  it("stops paying after 20 reads a minute from one caller, and answers with the lexicon", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const { input } = cassette("C7");
    // Each read paid for: the memory of the last is cleared, so none is answered from it.
    for (let i = 0; i < 20; i += 1) {
      resetReadCache();
      expect((await read(input)).body.source).toBe("llm");
    }
    resetReadCache();
    expect((await read(input)).body.source).toBe("lexicon");
    expect(network).toHaveBeenCalledTimes(20 * (READS + CHECKS));
  });
});
