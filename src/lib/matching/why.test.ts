// Why this clinician, in their own words: the finder writes the first half from its strongest
// evidence, the model sees only the request and the listing and writes the second half, the screen
// sees only what is short, clean and never a key, and a failure leaves the keys alone.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clinicians, matchEvidence } from "@/demo/clinicians";
import { completed } from "@/lib/llm/cassettes";
import { EI_QUALITIES } from "@/demo/emotional-fit";
import { askedFor, askToWrite, cachedWhy, clauseBudget, clinicianInWords, keepClause, MAX_CLAUSE_WORDS, MAX_WORDS, MIN_CLAUSE_WORDS, resetWhyCache, whyInput, whyMatched, whySentence } from "./why";

const anubhav = clinicians.find((c) => c.id === "anubhav-saxena")!;
const REQUEST = "an ADHD assessment by telehealth, and I don't want to be rushed";
const answer = (says: unknown) => async () => new Response(JSON.stringify(completed({ says })));

beforeEach(() => resetWhyCache());
afterEach(() => vi.restoreAllMocks());

describe("what the model is given", () => {
  it("is the person's words, the clinician's own listing and the one thing to finish, and nothing else", () => {
    const input = whyInput(REQUEST, anubhav, "telehealth");
    expect(input.startsWith(`Person asked: "${REQUEST}"`)).toBe(true);
    expect(input.endsWith(`Finish, in at most 12 words: "You asked for telehealth; ${anubhav.shortName} says"`)).toBe(true);
    const words = clinicianInWords(anubhav);
    for (const piece of [anubhav.name, anubhav.focus, anubhav.about, "Takes time with you", "Hindi"]) expect(words).toContain(piece);
    expect(words).not.toMatch(/manner:|care:|pref:/);
  });

  it("writes about a care, manner or language ask before a bare preference, which has no listing text behind it", () => {
    const evidence = matchEvidence(anubhav, "a woman GP for an ADHD assessment by telehealth");
    const preference = evidence.find((need) => need.facet.kind === "preference")!;
    const care = evidence.find((need) => need.facet.kind === "care")!;
    expect(askToWrite([preference, care])).toBe(care);
    expect(askToWrite([preference])).toBe(preference);
  });

  it("says the ask the way a sentence would: a manner as someone who does it, a language as someone who speaks it", () => {
    const needs = matchEvidence(anubhav, "an ADHD assessment with someone who speaks Hindi and doesn't rush me");
    const said = needs.map(askedFor);
    expect(said).toContain("ADHD assessment");
    expect(said).toContain("someone who speaks Hindi");
    expect(said).toContain("someone who takes time with you");
  });

  it("asks for every manner in six words or fewer, in words a sentence can carry", () => {
    for (const [trait, quality] of Object.entries(EI_QUALITIES)) {
      const count = quality.asked.trim().split(/\s+/).length;
      expect(count, `${trait}: "${quality.asked}"`).toBeLessThanOrEqual(6);
      expect(quality.asked, trait).toMatch(/^[a-z]/);
    }
  });

  it("gives the clause what the frame leaves of the sentence, never more than the clause's own bound", () => {
    expect(clauseBudget("ADHD assessment", anubhav)).toBe(MAX_CLAUSE_WORDS);
    const kalra = clinicians.find((c) => c.id === "yogesh-kalra")!;
    expect(clauseBudget("someone who takes time with you", kalra)).toBe(MAX_WORDS - 4 - 6 - kalra.shortName.split(" ").length);
    expect(clauseBudget("someone who takes time with you", kalra)).toBeGreaterThanOrEqual(MIN_CLAUSE_WORDS);
    // A clause over its budget is refused even when it is under the clause's own bound.
    expect(keepClause("he books a longer first appointment and takes time with you", anubhav, 7)).toBeNull();
    expect(keepClause("he books a longer first appointment", anubhav, 7)).toBe("he books a longer first appointment");
  });
});

describe("what the screen may show", () => {
  it("keeps a short clean clause, without a name or 'says' the model repeated", () => {
    expect(keepClause("he books a longer first appointment and takes time with you.", anubhav)).toBe("he books a longer first appointment and takes time with you");
    expect(keepClause(`${anubhav.shortName} says he speaks Hindi and Urdu`, anubhav)).toBe("he speaks Hindi and Urdu");
    expect(keepClause(`"${anubhav.name} says he speaks Hindi"`, anubhav)).toBe("he speaks Hindi");
  });

  it("refuses a key, a verdict, a promise, a superlative, a long clause and a non-string", () => {
    expect(keepClause("he meets manner:not_rushed", anubhav)).toBeNull();
    expect(keepClause("he can diagnose and cure your ADHD", anubhav)).toBeNull();
    expect(keepClause("he is the best ADHD specialist in Sydney", anubhav)).toBeNull();
    expect(keepClause("I recommend him; you will see an improvement", anubhav)).toBeNull();
    expect(keepClause(Array.from({ length: MAX_CLAUSE_WORDS + 1 }, () => "word").join(" "), anubhav)).toBeNull();
    expect(keepClause(["a list"], anubhav)).toBeNull();
  });

  it("composes the sentence, and drops one the two halves together would not fit", () => {
    expect(whySentence("telehealth", anubhav, "he sees new people by video first")).toBe(`You asked for telehealth; ${anubhav.shortName} says he sees new people by video first.`);
    const long = Array.from({ length: MAX_WORDS }, () => "word").join(" ");
    expect(whySentence(long, anubhav, "he does")).toBeNull();
  });
});

describe("the call", () => {
  it("answers from the model once, then from memory for the same words", async () => {
    const fetchFn = vi.fn(answer("he offers telehealth for a first appointment"));
    const first = await whyMatched(REQUEST, anubhav, { fetch: fetchFn, env: { OPENAI_API_KEY: "k" } });
    expect(first.source).toBe("llm");
    expect(first.sentences).toHaveLength(1);
    expect(first.sentences[0]).toMatch(new RegExp(`^You asked for .+; ${anubhav.shortName} says he offers telehealth for a first appointment\\.$`));
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

  it("asks once more, with the count, when the first clause runs over its budget", async () => {
    const long = "he offers a structured adult ADHD assessment with a documented baseline and long first appointment";
    const fetchFn = vi.fn().mockImplementationOnce(answer(long)).mockImplementationOnce(answer("he offers a structured adult ADHD assessment"));
    const result = await whyMatched(REQUEST, anubhav, { fetch: fetchFn, env: { OPENAI_API_KEY: "k" } });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const second = JSON.parse((fetchFn.mock.calls[1] as [string, { body: string }])[1].body) as { input: string };
    expect(second.input).toContain(`Your last answer, "${long}", had ${long.split(" ").length} words.`);
    expect(result.sentences).toHaveLength(1);
    expect(result.sentences[0]).toMatch(/says he offers a structured adult ADHD assessment\.$/);
  });

  it("does not ask again when the first clause was clean, empty or refused for its words", async () => {
    const once = vi.fn(answer("he is the best ADHD specialist"));
    expect((await whyMatched(REQUEST, anubhav, { fetch: once, env: { OPENAI_API_KEY: "k" } })).sentences).toEqual([]);
    expect(once).toHaveBeenCalledTimes(1);
    const empty = vi.fn(answer(""));
    expect((await whyMatched(REQUEST, anubhav, { fetch: empty, env: { OPENAI_API_KEY: "k" } })).sentences).toEqual([]);
    expect(empty).toHaveBeenCalledTimes(1);
  });

  it("does not remember an empty answer, so the next ask may draw a clause that fits", async () => {
    // A clause refused for its words, not its length: the length case asks once more (above).
    const fetchFn = vi.fn(answer("he is the best ADHD specialist in Sydney"));
    expect((await whyMatched(REQUEST, anubhav, { fetch: fetchFn, env: { OPENAI_API_KEY: "k" } })).sentences).toEqual([]);
    expect(cachedWhy(REQUEST, anubhav.id)).toBeNull();
    await whyMatched(REQUEST, anubhav, { fetch: fetchFn, env: { OPENAI_API_KEY: "k" } });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("makes no call where the listing answers nothing the person asked", async () => {
    const fetchFn = vi.fn(answer("anything"));
    const ot = clinicians.find((c) => c.profession === "occupational-therapist")!;
    expect(await whyMatched("a woman GP who speaks Hindi", ot, { fetch: fetchFn, env: { OPENAI_API_KEY: "k" } })).toEqual({ sentences: [], source: "none" });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
