// The why route with no paid call: empty at level 0 without touching the network, the cassette
// answer at level 1 for e2e, and a refusal for anything that is not a request about a listed clinician.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { resetKeyPause } from "@/lib/llm/key-pause";
import { resetWhyCache } from "@/lib/matching/why";
import { resetRateLimits } from "@/lib/rate-limit";
import { POST } from "./route";

const anubhav = clinicians.find((c) => c.id === "anubhav-saxena")!;
const REQUEST = "an ADHD assessment by telehealth, and I don't want to be rushed";
const why = async (body: unknown) => {
  const reply = await POST(new Request("http://local/api/finder/why", { method: "POST", body: JSON.stringify(body) }));
  return { status: reply.status, body: await reply.json() };
};

let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  resetRateLimits();
  resetKeyPause();
  resetWhyCache();
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("ADHDME_LLM_LEVEL", "");
  vi.stubEnv("ADHDME_LLM_CASSETTES", "");
  network = vi.fn(async () => new Response("{}", { status: 500 }));
  vi.stubGlobal("fetch", network);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/finder/why", () => {
  it("at level 0 answers none and never calls fetch", async () => {
    expect(await why({ text: REQUEST, clinicianId: anubhav.id })).toEqual({ status: 200, body: { sentences: [], source: "none" } });
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("ADHDME_LLM_LEVEL", "0");
    expect((await why({ text: REQUEST, clinicianId: anubhav.id })).body.source).toBe("none");
    expect(network).not.toHaveBeenCalled();
  });

  it("at level 1 with the cassettes finishes the sentence the finder began from the strongest key", async () => {
    vi.stubEnv("ADHDME_LLM_CASSETTES", "1");
    const { status, body } = await why({ text: REQUEST, clinicianId: anubhav.id });
    expect(status).toBe(200);
    expect(body.source).toBe("llm");
    expect(body.sentences.length).toBeGreaterThan(0);
    expect(body.sentences[0]).toBe(`You asked for ADHD assessment; ${anubhav.shortName} says they list it, in their own words.`);
    for (const sentence of body.sentences) expect(sentence).not.toMatch(/(care|manner|pref|language):[a-z_-]+/);
    expect(network).not.toHaveBeenCalled();
  });

  it("refuses a malformed body and an unlisted clinician", async () => {
    expect((await why({ text: REQUEST })).status).toBe(400);
    expect((await why({ text: "x".repeat(2001), clinicianId: anubhav.id })).status).toBe(400);
    expect((await why({ text: REQUEST, clinicianId: "nobody" })).status).toBe(404);
  });
});
