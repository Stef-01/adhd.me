import { describe, expect, it } from "vitest";
import { findCue, stem, tokenise } from "./read";
import { readNeeds } from "./needs";

describe("W221 the two failure classes this replaced substring matching for", () => {
  /** "my brain has never let me finish anything" vs the cue "never finish anything". */
  it("matches a cue with words inserted into the middle of it", () => {
    const sentence = tokenise("my brain has never let me finish anything and I'm 34");
    expect(findCue(sentence, tokenise("never finish anything"))).not.toBeNull();
  });

  /** "she rushes me" vs the cue "rushed"; "who explains things" vs the cue "explain". */
  it.each([
    ["rushes", "rushed"],
    ["explains", "explain"],
    ["listened", "listen"],
    ["appointments", "appointment"],
  ])("matches %s against the cue %s", (inSentence, inCue) => {
    expect(stem(inSentence)).toBe(stem(inCue));
  });
});

describe("W221 what it must NOT match, which is the whole cost of the change", () => {
  it("refuses a cue whose words are scattered too far apart", () => {
    // Not a phrase any more: a heart in one clause and safety three clauses later is a different
    // statement from "is it safe for my heart".
    const far = tokenise("my heart is fine and honestly the parking there is safe and easy");
    expect(findCue(far, tokenise("heart safe"))).toBeNull();
  });

  it("refuses a cue whose words appear in the wrong order", () => {
    expect(findCue(tokenise("anything finish never"), tokenise("never finish anything"))).toBeNull();
  });

  /**
   * THE ONE THE STOPWORD LIST EXISTS FOR. "not" is the difference between somebody asking for
   * alternatives and somebody asking for the opposite, so it is never dropped as a stopword.
   */
  it("keeps negations, so the specific cue still beats the general one inside it", () => {
    expect(tokenise("not just medication")).toContain("not");
    const labels = readNeeds("I want alternatives, not just medication").map((n) => n.label);
    expect(labels).toContain("Non-medication supports");
  });

  it("leaves short words alone rather than stemming them into nonsense", () => {
    // "sees" left this list at O50: it now reduces to "see" via the explicit INFLECTIONS
    // table, which is a per-word review, not the blind suffix stripping this pin refuses —
    // the length guards themselves still stand, as the words below prove.
    for (const word of ["does", "this", "used", "goes", "gets"]) expect(stem(word)).toBe(word);
  });

  it("bridges the table's wart families to one canonical stem (O50)", () => {
    // Each family has a named sentence behind it — see INFLECTIONS in read.ts. A cue and a
    // sentence inflect differently and must still meet.
    expect(stem("taken")).toBe(stem("takes"));
    expect(stem("took")).toBe(stem("take"));
    expect(stem("sees")).toBe("see");
    expect(stem("seeing")).toBe("see");
    expect(stem("seen")).toBe("see");
    expect(stem("believed")).toBe(stem("believe"));
    expect(stem("believes")).toBe(stem("believe"));
    expect(stem("judged")).toBe(stem("judge"));
    expect(stem("judges")).toBe(stem("judge"));
    expect(stem("minutes")).toBe(stem("minute"));
    // And the table must not leak: neighbours of a family keep their own stems.
    expect(stem("mistaken")).not.toBe("take");
    expect(stem("juggle")).not.toBe("judge");
  });

  /** Precision guard. None of these express a want; firing on them would be a false positive. */
  it.each([
    "I would like to book an appointment please",
    "my postcode is 2119",
    "is there parking at the practice",
    "what time do you open on Saturday",
  ])("reads nothing from %s", (query) => {
    expect(readNeeds(query)).toEqual([]);
  });

  it("is deterministic", () => {
    const q = "she rushes me and my family think it is an excuse";
    expect(readNeeds(q)).toEqual(readNeeds(q));
  });
});
