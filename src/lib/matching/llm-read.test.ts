import { afterEach, describe, expect, it, vi } from "vitest";
import { clinicians, rankClinicians } from "@/demo/clinicians";
import { EI_QUALITY_KEYS } from "@/demo/emotional-fit";
import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { BudgetMeter } from "@/lib/llm/meter";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { facetKey, LEXICON_CUES, needForKey, readNeeds } from "@/matching/needs";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { answerFor, CHECKS, checkInput, fromModel, INSTRUCTIONS, lexiconReading, MEANINGS, READS, readRequest, SCHEMA, VOCABULARY } from "./llm-read";

const ENV = { OPENAI_API_KEY: "k" };
const TODAY = new Date("2026-09-27T00:00:00Z");
const EMPTY = { care: [], manner: [], prefs: [], languages: [], negated: [] };
const schemaKeys = () => Object.values(VOCABULARY).flatMap(({ prefix, ids }) => ids.map((id) => `${prefix}:${id}`));

afterEach(() => {
  vi.useRealTimers();
});

describe("one vocabulary (F8, F9)", () => {
  it("the schema's keys are the lexicon's facets and the matchable languages, both ways", () => {
    const lexicon = new Set(LEXICON_CUES.map((cue) => cue.key));
    const corpusKeys = [
      ...CARE_AREA_LABELS.map((area) => `care:${area.id}`),
      ...EI_QUALITY_KEYS.map((trait) => `manner:${trait}`),
      "pref:woman-gp", "pref:telehealth-first", "pref:longer-appointment", "pref:bulk-billing",
    ];
    const languages = MATCHABLE_LANGUAGES.map((name) => `language:${name.toLowerCase()}`);
    expect(new Set(schemaKeys())).toEqual(new Set([...lexicon, ...languages]));
    expect(new Set(schemaKeys())).toEqual(new Set([...corpusKeys, ...languages]));
  });

  it("every key has one meaning line, is in the rendered instructions, and maps to a signal", () => {
    const ids = Object.values(VOCABULARY).flatMap(({ ids }) => ids);
    const withMeaning = ids.filter((id) => !VOCABULARY.languages.ids.includes(id));
    expect(Object.keys(MEANINGS).sort()).toEqual([...withMeaning].sort());
    for (const id of ids) expect(INSTRUCTIONS, id).toMatch(new RegExp(`\\b${id}\\b`));
    for (const key of schemaKeys()) expect(facetKey(needForKey(key)!.facet)).toBe(key);
  });

  it("is a strict schema: flat arrays of enums, every property required, nothing additional", () => {
    const { schema } = SCHEMA;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required.sort()).toEqual(Object.keys(schema.properties).sort());
    expect(schema.properties.negated.items.enum).toHaveLength(schemaKeys().length);
  });
});

describe("fromModel", () => {
  it("returns the signals readNeeds would, so the ranker takes them as they are", () => {
    const [lexical] = readNeeds("my dose needs titration");
    const [model] = fromModel({ ...EMPTY, care: ["titration"] }).needs;
    expect({ ...model, matched: "" }).toEqual({ ...lexical, matched: "" });
  });

  it("ranks through rankClinicians' needs argument, and the default reading is unchanged", () => {
    const woman = fromModel({ ...EMPTY, prefs: ["woman-gp"] }).needs;
    expect(rankClinicians("someone I feel safe with", clinicians, TODAY, woman)[0]!.gender).toBe("woman");
    const query = "a woman GP who bulk bills";
    expect(rankClinicians(query, clinicians, TODAY).map((c) => c.id)).toEqual(
      rankClinicians(query, clinicians, TODAY, undefined).map((c) => c.id),
    );
  });

  it("drops and counts unknown values, merges duplicates, and removes negated keys", () => {
    const reading = fromModel({
      care: ["titration", "titration", "astrology"],
      manner: ["attuned"],
      prefs: ["telehealth-first", "woman-gp"],
      languages: ["klingon", "urdu"],
      negated: ["telehealth-first"],
    });
    expect(reading.keys).toEqual(["care:titration", "manner:attuned", "pref:woman-gp", "language:urdu"]);
    expect(reading.dropped).toBe(2);
    expect(reading.needs.map((need) => need.label)).toContain("Urdu-speaking");
  });

  it("reads answerFor(keys) back as exactly those keys, four at a time", () => {
    const keys = schemaKeys();
    for (let at = 0; at < keys.length; at += 4) expect(fromModel(answerFor(keys.slice(at, at + 4))).keys).toEqual(keys.slice(at, at + 4));
    expect(fromModel(answerFor([])).keys).toEqual([]);
  });

  it("treats a recited list as a malformed answer, and allows any four preferences", () => {
    const care = VOCABULARY.care.ids;
    expect(() => fromModel({ ...answerFor([]), care: care.slice(0, 7) })).toThrow(/care recites 7 keys/);
    expect(() => fromModel({ ...answerFor([]), languages: VOCABULARY.languages.ids })).toThrow(/languages recites/);
    expect(fromModel({ ...answerFor([]), care: care.slice(0, 3) }).keys).toHaveLength(3);
    expect(fromModel({ ...answerFor([]), prefs: VOCABULARY.prefs.ids }).keys).toHaveLength(4);
  });

  it("keeps every key the lexicon hears in the request, unless the model marked it refused", () => {
    const text = "a woman GP who bulk bills";
    expect(lexiconReading(text).keys).toEqual(["pref:bulk-billing", "pref:woman-gp"]);
    expect(fromModel(answerFor([]), text).keys).toEqual(["pref:bulk-billing", "pref:woman-gp"]);
    expect(fromModel(answerFor(["manner:unhurried", "pref:woman-gp"]), text).keys).toEqual(["manner:unhurried", "pref:woman-gp", "pref:bulk-billing"]);
    expect(fromModel({ ...answerFor([]), negated: ["bulk-billing"] }, text).keys).toEqual(["pref:woman-gp"]);
  });
});

describe("readRequest", () => {
  it("sends the static instructions and the request as input, at low effort with room to reason", async () => {
    const bodies: { instructions: string; input: string; reasoning: object; max_output_tokens: number; prompt_cache_key?: string; prompt_cache_retention?: string }[] = [];
    const fetch = async (_url: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return new Response(JSON.stringify(completed({ ...EMPTY, prefs: ["woman-gp"] })));
    };
    const reading = await readRequest("a woman GP", { fetch, env: ENV });
    expect(reading).toMatchObject({ keys: ["pref:woman-gp"], source: "llm" });
    expect(bodies[0]).toMatchObject({ instructions: INSTRUCTIONS, input: "a woman GP", reasoning: { effort: "low" }, max_output_tokens: 1600, prompt_cache_key: "adhdme-l1-read", prompt_cache_retention: "24h" });
    expect(bodies[0]!.max_output_tokens).toBeGreaterThanOrEqual(400);
  });

  it(`reads ${READS} times at once, and keeps a key only when every read gives it`, async () => {
    const answers = [
      { ...EMPTY, prefs: ["woman-gp"], manner: ["attuned", "unhurried"] },
      { ...EMPTY, prefs: ["woman-gp"], manner: ["unhurried"] },
      { ...EMPTY, prefs: ["woman-gp"], manner: ["unhurried", "steadying"] },
    ];
    let [reads, checks] = [0, 0];
    const fetch = async (_url: string, init: { body: string }) => {
      if (JSON.parse(init.body).input === "someone patient") return new Response(JSON.stringify(completed(answers[reads++ % answers.length]!)));
      checks += 1;
      return new Response(JSON.stringify(completed({ verdicts: [] })));
    };
    const reading = await readRequest("someone patient", { fetch, env: ENV });
    expect([reads, checks]).toEqual([READS, CHECKS]);
    expect(reading).toMatchObject({ keys: ["manner:unhurried", "pref:woman-gp"], source: "llm" });
  });

  it("checks only the keys the reads add beyond the lexicon, and drops one most checks say is not asked", async () => {
    const text = "it has to be bulk billed";
    expect(lexiconReading(text).keys).toEqual(["pref:bulk-billing"]);
    const inputs: string[] = [];
    let check = 0;
    const fetch = async (_url: string, init: { body: string }) => {
      const { input } = JSON.parse(init.body) as { input: string };
      inputs.push(input);
      if (input === text) return new Response(JSON.stringify(completed({ ...EMPTY, prefs: ["woman-gp", "bulk-billing"] })));
      const asks = check++ === 0; // one check says asked, two say not
      return new Response(JSON.stringify(completed({ verdicts: [{ key: "pref:woman-gp", asks }] })));
    };
    const reading = await readRequest(text, { fetch, env: ENV });
    expect(inputs.filter((input) => input !== text)).toEqual(Array(CHECKS).fill(checkInput(text, ["pref:woman-gp"])));
    expect(reading.keys).toEqual(["pref:bulk-billing"]);
  });

  it("keeps the reads' unlisted asks for the report, once each, never as keys", async () => {
    const answers = [
      { ...EMPTY, unlisted: ["after hours"] },
      { ...EMPTY, unlisted: ["After hours", "a small practice"] },
      { ...EMPTY, unlisted: [] },
    ];
    let n = 0;
    const fetch = async () => new Response(JSON.stringify(completed(answers[n++ % 3]!)));
    const reading = await readRequest("after-hours only, I do night shifts at the mine", { fetch, env: ENV });
    expect(reading).toMatchObject({ keys: [], source: "llm", unlisted: ["after hours", "a small practice"] });
  });

  it("settles on two reads that add nothing beyond the lexicon, without waiting for the third", async () => {
    let n = 0;
    const fetch = () => (n++ < 2 ? Promise.resolve(new Response(JSON.stringify(completed({ ...EMPTY, prefs: ["woman-gp"] })))) : new Promise<Response>(() => {}));
    const reading = await Promise.race([readRequest("a woman GP", { fetch, env: ENV }), new Promise((resolve) => setTimeout(() => resolve("waited"), 1000))]);
    expect(reading).toMatchObject({ keys: ["pref:woman-gp"], source: "llm" });
  });

  it("waits for the third read when the first two add a key, which the third can take away", async () => {
    let n = 0;
    const added = { ...EMPTY, manner: ["unhurried"] };
    const fetch = async () => {
      const at = n++;
      if (at === 2) await new Promise((resolve) => setTimeout(resolve, 30));
      return new Response(JSON.stringify(completed(at === 2 ? EMPTY : added)));
    };
    expect((await readRequest("someone patient", { fetch, env: ENV })).keys).toEqual([]);
  });

  it("settles the checks once two agree a key is not asked, without waiting for the third", async () => {
    let check = 0;
    const fetch = (_url: string, init: { body: string }) => {
      if (JSON.parse(init.body).input === "it has to be bulk billed") return Promise.resolve(new Response(JSON.stringify(completed({ ...EMPTY, prefs: ["woman-gp", "bulk-billing"] }))));
      return check++ < 2 ? Promise.resolve(new Response(JSON.stringify(completed({ verdicts: [{ key: "pref:woman-gp", asks: false }] })))) : new Promise<Response>(() => {});
    };
    const reading = await Promise.race([readRequest("it has to be bulk billed", { fetch, env: ENV }), new Promise((resolve) => setTimeout(() => resolve("waited"), 1000))]);
    expect(reading).toMatchObject({ keys: ["pref:bulk-billing"] });
  });

  it("makes no check when the reads add nothing beyond the lexicon", async () => {
    let calls = 0;
    const fetch = async () => (calls += 1, new Response(JSON.stringify(completed({ ...EMPTY, prefs: ["woman-gp"] }))));
    expect((await readRequest("a woman GP", { fetch, env: ENV })).keys).toEqual(["pref:woman-gp"]);
    expect(calls).toBe(READS);
  });

  it("drops a key the lexicon hears when most reads refuse it, and keeps it when one does", async () => {
    const text = "a woman GP who bulk bills";
    const reads = (refusals: string[][]) => {
      let n = 0;
      return async () => new Response(JSON.stringify(completed({ ...EMPTY, negated: refusals[n++ % 3]! })));
    };
    expect((await readRequest(text, { fetch: reads([["bulk-billing"], ["bulk-billing"], []]), env: ENV })).keys).toEqual(["pref:woman-gp"]);
    expect((await readRequest(text, { fetch: reads([["bulk-billing"], [], []]), env: ENV })).keys).toEqual(["pref:bulk-billing", "pref:woman-gp"]);
  });

  it("lets the reads that answered decide when one fails, and keeps its error", async () => {
    let n = 0;
    const fetch = async () =>
      new Response(JSON.stringify(n++ === 0 ? completed({ ...EMPTY, care: VOCABULARY.care.ids }) : completed({ ...EMPTY, care: ["titration"] })));
    const reading = await readRequest("my dose wears off", { fetch, env: ENV });
    expect(reading).toMatchObject({ keys: expect.arrayContaining(["care:titration"]), source: "llm", error: expect.stringMatching(/^SchemaError: care recites/) });
  });

  it("makes no call for empty or whitespace text", async () => {
    const fetch = vi.fn();
    expect(await readRequest("  \n ", { fetch, env: ENV })).toEqual({ keys: [], needs: [], source: "llm", dropped: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(CASSETTES.map((cassette) => [cassette.class, cassette.input.slice(0, 40), cassette] as const))(
    "replays the %s cassette: %s",
    async (_class, _input, cassette) => {
      const reading = await readRequest(cassette.input, { fetch: cassetteFetch(CASSETTES), env: ENV });
      expect({ keys: reading.keys, source: reading.source }).toEqual(cassette.expect);
    },
  );

  it("covers every class once, plus an incomplete and a refusal", () => {
    expect(CASSETTES.filter((c) => c.expect.source === "llm").map((c) => c.class)).toEqual(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"]);
    expect(CASSETTES.map((c) => (c.response as { status: string }).status)).toContain("incomplete");
    expect(JSON.stringify(CASSETTES)).toContain('"type":"refusal"');
  });

  it("falls back to the lexicon on a timeout, a budget refusal or a malformed answer", async () => {
    const text = "I would prefer a woman GP";
    const lexicon = lexiconReading(text);
    const malformed = async () => new Response(JSON.stringify(completed({ care: "titration" })));
    const budget = await readRequest(text, { fetch: malformed, env: ENV, meter: new BudgetMeter(0) });
    expect(budget).toMatchObject({ keys: lexicon.keys, source: "lexicon", error: expect.stringMatching(/^BudgetError/) });
    expect(await readRequest(text, { fetch: malformed, env: ENV })).toMatchObject({ source: "lexicon", error: expect.stringMatching(/^SchemaError/) });

    vi.useFakeTimers();
    const hung = (_url: string, init: { signal: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
    const pending = readRequest(text, { fetch: hung, env: ENV });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await pending).toMatchObject({ keys: lexicon.keys, source: "lexicon", error: expect.stringMatching(/^TimeoutError/) });
  });
});
