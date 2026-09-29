// Why this clinician, in their own words: the model sees only the request and the listing, the
// screen sees only what is short, clean and never a key, and a failure leaves the keys alone.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { completed } from "@/lib/llm/cassettes";
import { cachedWhy, clinicianInWords, keepSentences, MAX_SENTENCES, MAX_WORDS, resetWhyCache, whyInput, whyMatched } from "./why";

const anubhav = clinicians.find((c) => c.id === "anubhav-saxena")!;
const REQUEST = "an ADHD assessment by telehealth, and I don't want to be rushed";
const answer = (sentences: unknown) => async () => new Response(JSON.stringify(completed({ sentences })));

beforeEach(() => resetWhyCache());
afterEach(() => vi.restoreAllMocks());

describe("what the model is given", () => {
  it("is the person's words and the clinician's own listing, labelled, and nothing else", () => {
    const input = whyInput(REQUEST, anubhav);
    expect(input.startsWith(`Person asked: "${REQUEST}"`)).toBe(true);
    const words = clinicianInWords(anubhav);
    for (const piece of [anubhav.name, anubhav.focus, anubhav.about, "Takes time with you", "Hindi"]) expect(words).toContain(piece);
    expect(words).not.toMatch(/manner:|care:|pref:/);
  });
});

describe("what the screen may show", () => {
  it("keeps at most two short, clean sentences and drops the rest", () => {
    const kept = keepSentences([
      "You asked not to be rushed; Anubhav books a longer first appointment.",
      "  ",
      "You asked for Hindi; he consults in Hindi and Urdu.",
      "A third sentence that is fine but one too many.",
    ]);
    expect(kept).toHaveLength(MAX_SENTENCES);
    expect(kept[0]).toBe("You asked not to be rushed; Anubhav books a longer first appointment.");
  });

  it("refuses a key, a claim the patient rules forbid, a superlative and a long sentence", () => {
    expect(keepSentences(["Your ask manner:not_rushed is met."])).toEqual([]);
    expect(keepSentences(["He can diagnose and treat your ADHD quickly."])).toEqual([]);
    expect(keepSentences(["She is the best ADHD specialist in Sydney."])).toEqual([]);
    expect(keepSentences([Array.from({ length: MAX_WORDS + 1 }, () => "word").join(" ")])).toEqual([]);
    expect(keepSentences("not a list")).toEqual([]);
  });
});

describe("the call", () => {
  it("answers from the model once, then from memory for the same words", async () => {
    const fetchFn = vi.fn(answer(["You asked for telehealth; Anubhav sees new people by video first."]));
    const first = await whyMatched(REQUEST, anubhav, { fetch: fetchFn, env: { OPENAI_API_KEY: "k" } });
    expect(first).toEqual({ sentences: ["You asked for telehealth; Anubhav sees new people by video first."], source: "llm" });
    const again = await whyMatched(`${REQUEST}.`, anubhav, { fetch: fetchFn, env: { OPENAI_API_KEY: "k" } });
    expect(again.sentences).toEqual(first.sentences);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(cachedWhy(REQUEST, anubhav.id)).toEqual(first.sentences);
  });

  it("is none, with the error named, when the model fails or the key is missing", async () => {
    const failed = await whyMatched(REQUEST, anubhav, { fetch: async () => new Response("{}", { status: 400 }), env: { OPENAI_API_KEY: "k" } });
    expect(failed.source).toBe("none");
    expect(failed.sentences).toEqual([]);
    expect(failed.error).toMatch(/HttpError/);
    expect((await whyMatched(REQUEST, anubhav, { env: {} })).source).toBe("none");
  });
});
