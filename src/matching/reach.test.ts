import { describe, expect, it } from "vitest";
import { clinicians, matchQuality, scoreAgainst, unservedAsks } from "@/demo/clinicians";
import { facetKey, readNeeds, LEXICON_CUES } from "./needs";
import { stem } from "./read";
import { CARE_PROMPTS, MANNER_PROMPTS, PREF_PROMPTS } from "./clarify";

/**
 * W221 follow-up: the lexicon's reach, measured and pinned.
 *
 * WHY THIS FILE EXISTS RATHER THAN A NUMBER IN A DOCUMENT. A one-off probe found the lexicon
 * reached nothing on nine of seventeen realistic queries and that ten tied exactly. Writing that
 * in the plan would have recorded it; it would not have stopped it coming back, and a
 * paraphrase-matching lexicon regresses silently — the tests all pass, the ranking still works,
 * and it quietly stops understanding anybody.
 *
 * THE CORPUS IS FIRST-PERSON AND DELIBERATELY NOT WRITTEN FROM THE LEXICON. Half of it is how
 * people actually describe these things: not "unhurried" but "I can never get a word in". If the
 * corpus were written by reading the lexicon it would measure nothing except that somebody can
 * copy a list, which is the trap that makes most coverage numbers meaningless.
 *
 * THE CEILING IS A RATCHET, NOT A TARGET. It is set just above where the lexicon actually sits so
 * a regression fails, and it is meant to be lowered as reach improves — never raised to make a
 * failing build pass. Raising it is how a control becomes a comment.
 */
const CORPUS: readonly string[] = [
  // Phrased close to the vocabulary.
  "I need an ADHD assessment and my dose keeps wearing off",
  "a thorough structured assessment with the heart checked first",
  "I get rushed every time and I want a longer first appointment",
  "a calm GP who speaks Hindi, I was treated for anxiety for years",
  "somewhere I can be honest about how much I drink",
  // Phrased the way people actually write. None of these use a lexicon word for the thing they want.
  "I can never get a word in before the appointment is over",
  "every doctor I've seen decides before I finish the sentence",
  "I want someone who won't make me feel like I'm making it up",
  "I need to know it's not going to hurt my heart before I start anything",
  "my brain has never let me finish anything and I'm 34",
  "I've been on antidepressants for six years and nothing shifted",
  "I want to actually understand what's happening to me",
  "my mum thinks this is nonsense and she'll be in the room",
  // Genuinely uninformative. These SHOULD reach nothing; the product's job is to say so.
  "I think I might have ADHD",
  "help",
  "I don't know where to start",
];

const reached = (query: string) => readNeeds(query).length > 0;

describe("W221 how much of a real sentence the lexicon can hear", () => {
  it("reaches all but the queries that express no need", () => {
    const misses = CORPUS.filter((query) => !reached(query));
    const rate = misses.length / CORPUS.length;
    expect(
      rate,
      `miss rate ${(rate * 100).toFixed(0)}% — unreached: ${JSON.stringify(misses)}`,
    ).toBeLessThanOrEqual(0.15);
  });

  /**
   * The paraphrase half is the half that matters. A lexicon can score well overall by handling the
   * sentences that were written from it, which measures nothing.
   */
  it("reaches most of the sentences that avoid its own vocabulary", () => {
    const paraphrase = CORPUS.slice(5, 13);
    const misses = paraphrase.filter((query) => !reached(query));
    expect(misses.length, `unreached paraphrase: ${JSON.stringify(misses)}`).toBeLessThanOrEqual(1);
  });

  /**
   * THE INTEGRITY PROPERTY, and the reason `matchQuality` exists. Every query is either ordered on
   * something the reader said, or the finder says the order is not a ranking. There is no third
   * case where an arbitrary order is presented as a meaningful one.
   */
  it("never presents an unearned order as a ranking", () => {
    for (const query of CORPUS) {
      const quality = matchQuality(query);
      const needs = readNeeds(query);
      const scores = clinicians.map((clinician) => scoreAgainst(clinician, needs));

      if (quality === "informed") {
        expect(new Set(scores).size, `${query} is "informed" but every clinician scores the same`)
          .toBeGreaterThan(1);
      } else {
        // Tied or unmatched: the finder must have copy for it, so the reader is told.
        expect(quality === "tied" || quality === "unmatched").toBe(true);
      }
    }
  });

  it("says nothing is a ranking when nothing was understood", () => {
    expect(matchQuality("help")).toBe("unmatched");
    expect(matchQuality("I don't know where to start")).toBe("unmatched");
  });

  /**
   * The single likeliest sentence anybody types. It reaches only the generic assessment facet,
   * which BOTH GPs declare, so it cannot separate them — and the finder has to admit that rather
   * than put one of two real doctors first for no reason.
   */
  it("admits that the commonest query does not separate anybody", () => {
    expect(matchQuality("I think I might have ADHD")).toBe("tied");
  });

  it("names a care area nobody declares instead of returning a silent list", () => {
    // Nine of the seventeen care areas are declared by neither GP while the roster is two people.
    const asks = unservedAsks("I need trauma-informed care, I have a difficult childhood");
    expect(asks.length).toBeGreaterThan(0);
    expect(unservedAsks("titration and a longer appointment")).toEqual([]);
  });
});

describe("O7 every clarifier answer keeps reaching its facet (F10)", () => {
  /**
   * Clarifier answers are re-read by the same `readNeeds` as anything else, so a lexicon edit
   * could orphan a prompt invisibly: the question still renders, the tap still appends, and the
   * appended sentence reaches nothing. Every answer is pinned to its facet here, which makes the
   * prompt tables part of the reach ratchet.
   */
  it("re-reads every prompt table answer to the facet its question is about", () => {
    const tables = { ...CARE_PROMPTS, ...MANNER_PROMPTS, ...PREF_PROMPTS };
    for (const [key, copy] of Object.entries(tables)) {
      const reachedKeys = readNeeds(copy.answer).map((need) => facetKey(need.facet));
      expect(reachedKeys, `"${copy.answer}" no longer reaches ${key}`).toContain(key);
    }
  });
});

describe("O7 the lexicon reaches itself (F10)", () => {
  /**
   * The bespoke stemmer is the right call versus Porter for this vocabulary size — but pairs
   * like "assessed"→"asses" vs "assessment"→"assessment" mean cue and word can share a root and
   * still miss. This pins every phrase in the lexicon as reachable through the full pipeline,
   * so a stemmer or tokeniser edit that unhooks a cue from its own facet fails here, by name.
   */
  it("reads every lexicon phrase back to its own facet", () => {
    for (const { phrase, key } of LEXICON_CUES) {
      const reachedKeys = readNeeds(phrase).map((need) => facetKey(need.facet));
      expect(reachedKeys, `lexicon phrase "${phrase}" no longer reaches ${key}`).toContain(key);
    }
  });

  it("records the stemmer's known conflation edge so it is not rediscovered", () => {
    // "assessed" and "assessment" share a root and do NOT share a stem. A cue written with one
    // inflection will not hear the other; the lexicon must carry both spellings where it cares.
    expect(stem("assessed")).toBe("asses");
    expect(stem("assessment")).toBe("assessment");
    expect(stem("assessed")).not.toBe(stem("assessment"));
  });
});

describe("O7 a cue cannot cross a full stop (F10)", () => {
  it("refuses the two-token bridge across a sentence boundary", () => {
    // Both content words present, two statements apart. Before the boundary marker this was
    // representable: sentence punctuation was deleted, so [heart, safe] saw "heart safe".
    expect(readNeeds("they said it could affect my heart. safe parking would be good").map((n) => n.label))
      .not.toContain("Cardiac and physical baseline first");
    // And the same words inside ONE clause still match.
    expect(readNeeds("I want my heart checked so it is safe").length).toBeGreaterThan(0);
  });
});
