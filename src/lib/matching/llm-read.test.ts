import { afterEach, describe, expect, it, vi } from "vitest";
import { clinicians, rankClinicians } from "@/demo/clinicians";
import { CASSETTES, cassetteFetch, completed } from "@/lib/llm/cassettes";
import { BudgetMeter } from "@/lib/llm/meter";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { facetKey, LEXICON_CUES, needForKey, readNeeds } from "@/matching/needs";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { withoutPurposes, answerFor, fromModel, grounded, INSTRUCTIONS, lexiconReading, MEANINGS, READ_CALL, readRequest, SCHEMA, TAGS, VOCABULARY } from "./llm-read";

const ENV = { OPENAI_API_KEY: "k" };
const TODAY = new Date("2026-09-27T00:00:00Z");
const NONE = { needs: [], unlisted: [] };
/** One answer as the model gives it. */
const answer = (...needs: [tag: string, quote: string][]) => ({ needs: needs.map(([tag, quote]) => ({ tag, quote })), unlisted: [] });
const replying = (data: object) => async () => new Response(JSON.stringify(completed(data)));

afterEach(() => {
  vi.useRealTimers();
});

describe("one vocabulary", () => {
  it("the tags are every care area, preference and language the roster is matched on, and no manner trait", () => {
    const care = CARE_AREA_LABELS.map((area) => `care:${area.id}`);
    const prefs = ["pref:woman-gp", "pref:man-clinician", "pref:telehealth-first", "pref:longer-appointment", "pref:bulk-billing", "pref:lived-experience", "pref:ndis"];
    const languages = MATCHABLE_LANGUAGES.map((name) => `language:${name.toLowerCase()}`);
    expect(new Set(TAGS)).toEqual(new Set([...care, ...prefs, ...languages]));
    const lexicon = new Set(LEXICON_CUES.map((cue) => cue.key).filter((key) => !key.startsWith("manner:")));
    expect(new Set(TAGS.filter((tag) => !tag.startsWith("language:")))).toEqual(lexicon);
    expect(VOCABULARY.languages.ids).toEqual(MATCHABLE_LANGUAGES.map((name) => name.toLowerCase()));
  });

  it("every tag has one meaning line, is in the instructions, and maps to a signal", () => {
    expect(Object.keys(MEANINGS).sort()).toEqual(TAGS.map((tag) => tag.slice(tag.indexOf(":") + 1)).sort());
    for (const tag of TAGS) expect(INSTRUCTIONS, tag).toContain(`- ${tag}: `);
    for (const tag of TAGS) expect(facetKey(needForKey(tag)!.facet)).toBe(tag);
  });

  it("is a strict schema: a list of tag and quote, every property required, nothing additional", () => {
    const { schema } = SCHEMA;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required.sort()).toEqual(Object.keys(schema.properties).sort());
    expect(schema.properties.needs.items.properties.tag.enum).toEqual([...TAGS]);
    expect(schema.properties.needs.items.required).toEqual(["tag", "quote"]);
    expect(READ_CALL).not.toHaveProperty("model"); // `modelOf` decides, in one place
  });
});

describe("grounded", () => {
  const text = "I’d like a woman GP who bulk bills, by video if I can";

  it("keeps a tag only when its quote is in the text, whatever the case, quotes or spacing", () => {
    const kept = grounded(
      [
        { key: "pref:woman-gp", quote: "Woman GP" },
        { key: "pref:bulk-billing", quote: "bulk bills" },
        { key: "pref:telehealth-first", quote: "by  video" },
        { key: "pref:lived-experience", quote: "has ADHD herself" },
        { key: "care:anxiety", quote: "I'd like" },
      ],
      text,
    );
    expect(kept.map((need) => need.key)).toEqual(["pref:woman-gp", "pref:bulk-billing", "pref:telehealth-first", "care:anxiety"]);
  });

  it("drops an unknown tag, an empty quote, and a repeat", () => {
    expect(grounded([{ key: "manner:attuned", quote: "GP" }, { key: "pref:woman-gp", quote: "" }, { key: "pref:woman-gp", quote: "woman" }, { key: "pref:woman-gp", quote: "GP" }], text)).toEqual([{ key: "pref:woman-gp", quote: "woman" }]);
  });
});

describe("fromModel", () => {
  it("returns the signals readNeeds would, quoting the person's words, so the ranker takes them as they are", () => {
    const [lexical] = readNeeds("my dose needs titration");
    const [model] = fromModel(answer(["care:titration", "needs titration"]), "my dose needs titration").needs;
    expect(model).toEqual({ ...lexical, matched: "needs titration" });
  });

  it("ranks through rankClinicians' needs argument, and the default reading is unchanged", () => {
    const woman = fromModel(answer(["pref:woman-gp", "a woman"]), "a woman I feel safe with").needs;
    expect(rankClinicians("someone I feel safe with", clinicians, TODAY, woman)[0]!.gender).toBe("woman");
    const query = "a woman GP who bulk bills";
    expect(rankClinicians(query, clinicians, TODAY).map((c) => c.id)).toEqual(rankClinicians(query, clinicians, TODAY, undefined).map((c) => c.id));
  });

  it("drops and counts what it cannot quote or does not know, and takes a language the model quotes", () => {
    const text = "a psychologist who speaks Urdu, for my anxiety";
    const reading = fromModel({ needs: [{ tag: "care:anxiety", quote: "my anxiety" }, { tag: "language:urdu", quote: "speaks Urdu" }, { tag: "care:depression", quote: "feeling low" }, { tag: "care:astrology", quote: "anxiety" }], unlisted: ["evening appointments", " ", "evening appointments"] }, text);
    expect(reading.keys).toEqual(["care:anxiety", "language:urdu"]);
    expect(reading.dropped).toBe(2);
    expect(reading.needs.map((need) => need.label)).toContain("Urdu-speaking");
    expect(reading.needs[1]!.matched).toBe("speaks Urdu");
    expect(reading.unlisted).toEqual(["evening appointments", "evening appointments"]);
    // A language named as a culture is the model's to leave out; nothing here adds it by name.
    expect(fromModel(answer(["care:cultural-background", "understands Hindi culture"]), "someone who understands Hindi culture").keys).toEqual(["care:cultural-background"]);
  });

  it("adds nothing from the lexicon: a tag the model did not quote is not there", () => {
    const text = "a woman GP who bulk bills";
    expect(lexiconReading(text).keys).toEqual(["pref:bulk-billing", "pref:woman-gp"]);
    expect(fromModel(NONE, text).keys).toEqual([]);
    expect(fromModel(answer(["pref:woman-gp", "woman GP"]), text).keys).toEqual(["pref:woman-gp"]);
  });

  it("reads answerFor(keys, text) back as exactly those keys, four at a time", () => {
    for (let at = 0; at < TAGS.length; at += 4) expect(fromModel(answerFor(TAGS.slice(at, at + 4), "help"), "help").keys).toEqual(TAGS.slice(at, at + 4));
    expect(fromModel(answerFor([], "help"), "help").keys).toEqual([]);
    expect(answerFor(["manner:attuned", "language:klingon"], "help").needs).toEqual([]);
  });
});

describe("readRequest", () => {
  it("makes one call: the static instructions and the request as input, at low effort with room to reason", async () => {
    const bodies: { instructions: string; input: string; reasoning: object; max_output_tokens: number; prompt_cache_key?: string; prompt_cache_retention?: string; model: string }[] = [];
    const fetch = async (_url: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return new Response(JSON.stringify(completed(answer(["pref:woman-gp", "a woman GP"]))));
    };
    const reading = await readRequest("a woman GP", { fetch, env: ENV });
    expect(reading).toMatchObject({ keys: ["pref:woman-gp"], source: "llm", dropped: 0 });
    expect(reading.needs[0]!.matched).toBe("a woman GP");
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ model: "gpt-5-mini", instructions: INSTRUCTIONS, input: "a woman GP", reasoning: { effort: "low" }, max_output_tokens: 1600, prompt_cache_key: "adhdme-l1-read", prompt_cache_retention: "24h" });
  });

  it("keeps the unlisted asks for the report, never as keys", async () => {
    const reading = await readRequest("after-hours only, I am rarely free before seven", { fetch: replying({ needs: [], unlisted: ["after hours"] }), env: ENV });
    expect(reading).toMatchObject({ keys: [], source: "llm", unlisted: ["after hours"] });
  });

  it("makes no call for empty or whitespace text", async () => {
    const fetch = vi.fn();
    expect(await readRequest("  \n ", { fetch, env: ENV })).toEqual({ keys: [], needs: [], source: "llm", dropped: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(CASSETTES.map((cassette) => [cassette.class, cassette.input.slice(0, 40), cassette] as const))("replays the %s cassette: %s", async (_class, _input, cassette) => {
    const reading = await readRequest(cassette.input, { fetch: cassetteFetch(CASSETTES), env: ENV });
    expect({ keys: reading.keys, source: reading.source }).toEqual(cassette.expect);
    for (const need of reading.needs) if (reading.source === "llm" && need.facet.kind !== "language") expect(cassette.input).toContain(need.matched);
  });

  it("covers every class once, plus an incomplete and a refusal", () => {
    expect(CASSETTES.filter((c) => c.expect.source === "llm").map((c) => c.class)).toEqual(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"]);
    expect(CASSETTES.map((c) => (c.response as { status: string }).status)).toContain("incomplete");
    expect(JSON.stringify(CASSETTES)).toContain('"type":"refusal"');
  });

  it("falls back to the lexicon on a timeout, a budget refusal or a malformed answer, and says so", async () => {
    const text = "I would prefer a woman GP";
    const lexicon = lexiconReading(text);
    const malformed = replying({ needs: "woman-gp" });
    const budget = await readRequest(text, { fetch: malformed, env: ENV, meter: new BudgetMeter(0) });
    expect(budget).toMatchObject({ keys: lexicon.keys, source: "lexicon", error: expect.stringMatching(/^BudgetError/) });
    expect(await readRequest(text, { fetch: malformed, env: ENV })).toMatchObject({ source: "lexicon", error: expect.stringMatching(/^SchemaError/) });

    vi.useFakeTimers();
    const hung = (_url: string, init: { signal: AbortSignal }) => new Promise<Response>((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));
    const pending = readRequest(text, { fetch: hung, env: ENV });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await pending).toMatchObject({ keys: lexicon.keys, source: "lexicon", error: expect.stringMatching(/^TimeoutError/) });
  });
});

describe("a quote shown as the person's words", () => {
  it("leaves out the label the voice finder wrote before the answer", () => {
    const text = "My child's age: She's nine. Hardest for my child: She cries over homework";
    expect(grounded([{ key: "care:child-adolescent-adhd", quote: "My child's age: She's nine." }, { key: "care:study-school", quote: "Hardest for my child: She cries over homework" }], text).map((n) => n.quote)).toEqual(["She's nine.", "She cries over homework"]);
  });
});

describe("a tag quoting only the finder's label", () => {
  it("is dropped: it quotes nothing the person said", () => {
    expect(grounded([{ key: "care:work-career", quote: "Hardest at work:" }], "Hardest at work: deadlines")).toEqual([]);
  });
});

describe("a purpose clause (2026-10-01)", () => {
  it("drops focus, work or study quoted only from what the help asked for is meant to do", () => {
    const text = "help with sleep so I can focus at work";
    const needs = [{ key: "care:sleep", quote: "help with sleep" }, { key: "care:executive-function", quote: "focus" }, { key: "care:work-career", quote: "at work" }];
    expect(withoutPurposes(needs, text).map((n) => n.key)).toEqual(["care:sleep"]);
  });
  it("keeps them when nothing is asked before the clause, or when they are asked before it", () => {
    expect(withoutPurposes([{ key: "care:executive-function", quote: "focus" }], "so I can focus at work").map((n) => n.key)).toEqual(["care:executive-function"]);
    const text = "help at work with focus, and sleep so I can rest";
    expect(withoutPurposes([{ key: "care:work-career", quote: "help at work" }, { key: "care:sleep", quote: "sleep" }], text).map((n) => n.key)).toEqual(["care:work-career", "care:sleep"]);
  });
});

describe("'X-based help with Y'", () => {
  it("asks for X; Y is what it is for", () => {
    const text = "nutrition based help with focus";
    expect(withoutPurposes([{ key: "care:eating-body", quote: "nutrition" }, { key: "care:executive-function", quote: "help with focus" }], text).map((n) => n.key)).toEqual(["care:eating-body"]);
  });
});
