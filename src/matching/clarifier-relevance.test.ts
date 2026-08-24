// M10: the relevance gate — its map, its threshold, and its measured effect on the tied queue.
import { describe, expect, it } from "vitest";
import { clinicians, matchQuality, needsFor } from "@/demo/clinicians";
import { clarifiers } from "./clarify";
import { MIN_COOCCURRENCE, cooccurrenceCounts, requestSuggests } from "./clarifier-relevance";
import { REACH_CORPUS } from "./corpus";
import { facetKey } from "./needs";

describe("M10 the co-occurrence map is derived, not authored", () => {
  it("counts an edge once per entry holding both facets, in both directions", () => {
    const counts = cooccurrenceCounts([
      { text: "a", reaches: ["care:x", "manner:y"] },
      { text: "b", reaches: ["care:x", "manner:y", "care:z"] },
      { text: "c", reaches: ["care:x"] },
    ]);
    expect(counts.get("care:x→manner:y")).toBe(2);
    expect(counts.get("manner:y→care:x")).toBe(2);
    expect(counts.get("care:x→care:z")).toBe(1);
    expect(counts.get("care:z→care:x")).toBe(1);
    // A single-facet entry contributes no edges: co-occurrence needs company.
    expect(counts.get("care:x→care:x")).toBeUndefined();
  });

  it("a duplicated key inside one entry still counts that entry once", () => {
    const counts = cooccurrenceCounts([{ text: "a", reaches: ["care:x", "care:x", "manner:y"] }]);
    expect(counts.get("care:x→manner:y")).toBe(1);
  });

  it("the threshold is live: one authored example is a pattern's existence, not evidence of one", () => {
    const counts = cooccurrenceCounts([{ text: "a", reaches: ["care:x", "manner:y"] }]);
    expect(requestSuggests(["care:x"], "manner:y", counts)).toBe(false);
    const twice = cooccurrenceCounts([
      { text: "a", reaches: ["care:x", "manner:y"] },
      { text: "b", reaches: ["care:x", "manner:y"] },
    ]);
    expect(requestSuggests(["care:x"], "manner:y", twice)).toBe(true);
  });

  it("an empty request suggests nothing through this predicate — the carve-out lives in the caller", () => {
    expect(requestSuggests([], "care:anything")).toBe(false);
  });

  /**
   * The real map's shape, pinned so growth is visible rather than silent. 90 of the corpus's
   * multi-facet entries produce 140 ordered pairs, 54 of which clear MIN_COOCCURRENCE. These
   * figures move when the corpus grows — that is the design (the map widens as authored evidence
   * accumulates) — and the pin makes each widening a measured, deliberate diff.
   */
  it("holds the measured shape of the real corpus", () => {
    const counts = cooccurrenceCounts();
    expect(REACH_CORPUS.filter((e) => new Set(e.reaches ?? []).size >= 2).length).toBe(90);
    expect(counts.size).toBe(140);
    expect([...counts.values()].filter((n) => n >= MIN_COOCCURRENCE).length).toBe(54);
  });

  it("names blind spot (1): corpus gold sets carry no language keys, so language suggests nothing yet", () => {
    // The day a corpus entry's reaches includes a language key, this pin fails and the module
    // header's blind-spot paragraph is the thing to update — the map itself will already work.
    expect(REACH_CORPUS.some((e) => e.reaches?.some((k) => k.startsWith("language:")))).toBe(false);
  });
});

describe("M10 the gate's measured effect on the tied queue (the unit's verify line)", () => {
  /**
   * The year plan's verify: "measured against the unseparated queue the tie-quality report
   * already counts." At today's roster size the tied outcome IS that queue (tie-quality.ts:
   * "at roster size 3, unseparated IS the plan's clarifier-failed-to-separate"). The corpus
   * texts whose ranking ties are re-ranked here with the gated selector and the whole
   * distribution is pinned: who keeps a full offer, who keeps a partial one, who gets none.
   */
  it("holds the pinned offer distribution over every tied corpus query", () => {
    let zero = 0;
    let partial = 0;
    let full = 0;
    const zeroed: string[] = [];
    for (const entry of REACH_CORPUS) {
      if (!entry.reaches?.length) continue;
      if (matchQuality(entry.text, clinicians) !== "tied") continue;
      const offered = clarifiers(entry.text, clinicians);
      if (offered.length === 0) {
        zero += 1;
        zeroed.push(entry.text);
      } else if (offered.length < 3) partial += 1;
      else full += 1;
    }
    // 57 tied queries before the gate, 57 after: the gate changes WHICH questions, mostly not
    // WHETHER. 54 keep a full offer, 2 keep one relevant question (pinned below), 1 gets none —
    // and the one zero is the gate's designed outcome, pinned by name below. Gating BEFORE the
    // top-3 cut matters here: an external filter over the old top three would have zeroed two of
    // these readers, where the integrated gate promotes a suggested candidate from further down
    // the ranking instead.
    expect(full).toBe(54);
    expect(partial).toBe(2);
    expect(zero).toBe(1);
    expect(zeroed).toEqual(["a calm doctor for my anxious mum, she speaks Hindi"]);
  });

  it("zero questions is the designed outcome when everything the request suggests is already heard", () => {
    // This reader's words reached care:anxiety, manner:steadying and their mother's language —
    // so the anxiety question, the one their request most suggests, is excluded as already
    // asked, and nothing else the corpus links to what they said splits this roster. Before
    // this unit they were offered child assessment, shared care and depression; the year plan
    // calls that interrogation, and none beats it.
    const query = "a calm doctor for my anxious mum, she speaks Hindi";
    const reached = needsFor(query, clinicians).map((n) => facetKey(n.facet as never));
    expect(reached).toContain("care:anxiety");
    expect(reached).toContain("manner:steadying");
    expect(clarifiers(query, clinicians)).toEqual([]);
  });

  it("the gate promotes a suggested question over a splitting one, not merely fewer questions", () => {
    // The pace-and-language reader used to get anxiety/shared-care/child-assessment — the
    // roster's split axes. Now they get exactly one question, and it is one their own words
    // suggest: unhurried co-occurs with structured in the corpus ("not rushed" and "done to a
    // plan, follow-up booked" are asked together), so the selector reaches PAST the splitting
    // facets to the relevant one further down its own ranking.
    const query = "English is my second language and appointments move too fast";
    expect(clarifiers(query, clinicians).map((c) => c.facetKey)).toEqual(["manner:structured"]);
  });

  it("the commonest query in the product keeps its full offer under the gate", () => {
    // W225's whole reason to exist: "I think I might have ADHD" reaches only the generic
    // assessment facet. Assessment co-occurs widely in the corpus, so all three questions
    // survive — the gate removes interrogation, not the product's main recovery path.
    expect(clarifiers("I think I might have ADHD", clinicians).length).toBe(3);
  });

  it("a request that reached nothing is ungated — there is no stated interest to divert from", () => {
    expect(needsFor("help", clinicians)).toEqual([]);
    expect(clarifiers("help", clinicians).length).toBeGreaterThan(0);
  });

  it("the gate removes the interrogation-shaped offer, named", () => {
    // Measured before this unit: this language-and-pace request was offered anxiety, shared
    // care and child assessment — the roster's three splitting axes, none suggested by a word
    // the reader said. The gate is the difference between those three questions and none.
    const query = "English is my second language and appointments move too fast";
    const before = ["care:anxiety", "care:shared-care", "care:child-adolescent-adhd"];
    const offeredNow = clarifiers(query, clinicians).map((c) => c.facetKey);
    for (const gated of before) expect(offeredNow).not.toContain(gated);
  });
});
