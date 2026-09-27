import { afterEach, describe, expect, it, vi } from "vitest";
import { clinicians, rankClinicians } from "@/demo/clinicians";
import { EI_QUALITY_KEYS } from "@/demo/emotional-fit";
import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { BudgetMeter } from "@/lib/llm/meter";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { facetKey, LEXICON_CUES, needForKey, readNeeds } from "@/matching/needs";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { answerFor, fromModel, INSTRUCTIONS, lexiconReading, MEANINGS, readRequest, SCHEMA, VOCABULARY } from "./llm-read";

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

  it("reads answerFor(keys) back as exactly those keys", () => {
    expect(fromModel(answerFor(schemaKeys())).keys).toEqual(schemaKeys());
    expect(fromModel(answerFor([])).keys).toEqual([]);
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
    const bodies: { instructions: string; input: string; reasoning: object; max_output_tokens: number }[] = [];
    const fetch = async (_url: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return new Response(JSON.stringify(completed({ ...EMPTY, prefs: ["woman-gp"] })));
    };
    const reading = await readRequest("a woman GP", { fetch, env: ENV });
    expect(reading).toMatchObject({ keys: ["pref:woman-gp"], source: "llm" });
    expect(bodies[0]).toMatchObject({ instructions: INSTRUCTIONS, input: "a woman GP", reasoning: { effort: "low" }, max_output_tokens: 1600 });
    expect(bodies[0]!.max_output_tokens).toBeGreaterThanOrEqual(400);
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
