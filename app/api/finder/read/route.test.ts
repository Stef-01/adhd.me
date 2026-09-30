// The finder's read route with no paid call: the network is a stub that fails the test if a level
// that must not reach it does, and at level 1 it answers from the committed cassettes.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { lexiconReading } from "@/lib/matching/llm-read";
import { resetRateLimits } from "@/lib/rate-limit";
import { PAUSE_MS, resetKeyPause } from "@/lib/llm/key-pause";
import { resetReadCache } from "@/lib/matching/read-cache";
import { facetKey } from "@/matching/needs";
import { POST } from "./route";

const cassette = (name: string) => CASSETTES.find((c) => c.class === name && c.expect.source === "llm")!;
const INCOMPLETE = CASSETTES.find((c) => c.response && (c.response as { status?: string }).status === "incomplete")!;
const read = async (text: unknown) => {
  const reply = await POST(new Request("http://local/api/finder/read", { method: "POST", body: JSON.stringify({ text }) }));
  return { status: reply.status, body: await reply.json() };
};
/** The lexicon's answer for these words, as the route gives it. */
const lexicon = (text: string) => ({ needs: lexiconReading(text).needs.map((need) => ({ key: facetKey(need.facet), quote: need.matched })), source: "lexicon", unlisted: [] });
const keysOf = (body: { needs: { key: string }[] }) => body.needs.map((need) => need.key);

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
    expect(await read(input)).toEqual({ status: 200, body: lexicon(input) });
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("ADHDME_LLM_LEVEL", "0");
    expect((await read(input)).body.source).toBe("lexicon");
    expect(network).not.toHaveBeenCalled();
  });

  it("is at level 1 wherever there is a key and no level is set", async () => {
    vi.stubEnv("OPENAI_API_KEY", "k");
    const { input, expect: want } = cassette("C7");
    const { body } = await read(input);
    expect({ keys: keysOf(body), source: body.source }).toEqual(want);
  });

  it("at level 1 with no key reads with the lexicon and never calls fetch", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    const { input } = cassette("C7");
    expect((await read(input)).body).toEqual(lexicon(input));
    expect(network).not.toHaveBeenCalled();
  });

  it("at level 1 returns the model's needs with the person's words for each, in one call, once per set of words", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const { input } = cassette("C7");
    const { body } = await read(input);
    expect(body).toEqual({ needs: [{ key: "pref:longer-appointment", quote: "more than fifteen minutes" }], source: "llm", unlisted: [] });
    // The same words, spaced and cased differently, read the same way from memory, with no call.
    expect((await read(`  ${input.toUpperCase()}  `)).body).toEqual(body);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("answers with the asks no key covers, and remembers them with the needs", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const { input } = cassette("C7");
    network = vi.fn(async () => new Response(JSON.stringify(completed({ needs: [], unlisted: ["relates to postpartum"] })), { status: 200 }));
    vi.stubGlobal("fetch", network);
    const first = await read(input);
    expect(first.body).toEqual({ needs: [], source: "llm", unlisted: ["relates to postpartum"] });
    expect((await read(input)).body).toEqual(first.body);
    expect(network, "the second read came from memory").toHaveBeenCalledTimes(1);
  });

  it("answers a model failure with the lexicon's needs and source lexicon", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    expect((await read(INCOMPLETE.input)).body).toEqual(lexicon(INCOMPLETE.input));
    network.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await read("a woman GP")).body).toEqual({ needs: [{ key: "pref:woman-gp", quote: "woman gp" }], source: "lexicon", unlisted: [] });
  });

  it("in cassette mode replays the recordings with no network, and reads other words as the lexicon does, quoting them", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("ADHDME_LLM_CASSETTES", "1");
    const { body } = await read(cassette("C6").input);
    expect({ keys: keysOf(body), source: body.source }).toEqual(cassette("C6").expect);
    const other = (await read("a woman GP who bulk bills")).body;
    expect(other.source).toBe("llm");
    expect(new Set(keysOf(other))).toEqual(new Set(["pref:woman-gp", "pref:bulk-billing"]));
    for (const need of other.needs) expect("a woman gp who bulk bills").toContain(need.quote.toLowerCase());
    expect(network).not.toHaveBeenCalled();
  });

  it("refuses text over 2,000 characters, or no text, before any call", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    expect((await read("a".repeat(2001))).status).toBe(400);
    expect((await read(42)).status).toBe(400);
    expect((await read("a".repeat(2000))).status).toBe(200);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("after a key fails, reads with the lexicon for ten minutes without a call, then tries again", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    const refused = vi.fn(async () => new Response(JSON.stringify({ error: { message: "Incorrect API key provided", code: "invalid_api_key" } }), { status: 401 }));
    vi.stubGlobal("fetch", refused);
    const { input } = cassette("C7");
    expect((await read(input)).body).toEqual(lexicon(input));
    expect(refused).toHaveBeenCalledTimes(1);
    expect((await read(input)).body).toEqual(lexicon(input));
    expect(refused).toHaveBeenCalledTimes(1);
    vi.useFakeTimers({ now: Date.now() + PAUSE_MS + 1, toFake: ["Date"] });
    await read(input);
    vi.useRealTimers();
    expect(refused).toHaveBeenCalledTimes(2);
  });

  it("stops paying once the day's budget is spent, and answers with the lexicon without a call", async () => {
    vi.stubEnv("ADHDME_LLM_LEVEL", "1");
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("ADHDME_LLM_DAILY_USD", "0");
    const { input } = cassette("C7");
    expect((await read(input)).body).toEqual(lexicon(input));
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
    expect(network).toHaveBeenCalledTimes(20);
  });
});
