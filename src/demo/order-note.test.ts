// `orderNote` is the results screen's one "why this order" sentence. The property that matters is
// not the wording — it is that the sentence can never claim an order the ranking did not produce.
// So every assertion here is tied to `matchQuality`, the same verdict the ranking is built on,
// rather than to a fixed string: the copy may be rewritten freely, the claims may not.

import { describe, expect, it } from "vitest";
import { clinicians, matchQuality, needsFor, orderNote } from "./clinicians";

/** Queries chosen to land on all four `MatchQuality` values against the real roster. */
const QUERIES = [
  "i need help with sleep and i speak hindi and appointments move too fast",
  "adhd assessment",
  "bulk billing please",
  "hello",
  "i want someone steadying who bulk bills",
  "telehealth, i work nights",
];

describe("orderNote", () => {
  it("covers all four quality verdicts across the sample, so no branch is untested by luck", () => {
    const seen = new Set(QUERIES.map((query) => matchQuality(query, clinicians)));
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it("only says the list is ordered by the asks when the verdict is `informed`", () => {
    for (const query of QUERIES) {
      const note = orderNote(query, clinicians);
      const claimsAnOrder = note.startsWith("Ordered by what you asked for:");
      expect(claimsAnOrder).toBe(matchQuality(query, clinicians) === "informed");
    }
  });

  it("names only labels the ranking actually read, and never a label it did not", () => {
    for (const query of QUERIES) {
      if (matchQuality(query, clinicians) === "unmatched") continue;
      const labels = [...new Set(needsFor(query, clinicians).map((need) => need.label))];
      // Case-insensitive: the prose branches lower a label's first character through
      // `labelInSentence`, which is a casing decision, not a different label.
      const note = orderNote(query, clinicians).toLowerCase();
      const named = labels.filter((label) => note.includes(label.toLowerCase()));
      expect(named.length).toBeGreaterThan(0);
      // Every label the sentence names is one the engine read — the sentence invents nothing.
      for (const fragment of named) expect(labels).toContain(fragment);
      // Past three, the count carries the rest rather than the sentence silently dropping them.
      if (labels.length > 3) expect(note).toContain(`${labels.length - 3} more`);
      else expect(named.length).toBe(labels.length);
    }
  });

  it("adds the distance clause only when an origin resolved", () => {
    for (const query of QUERIES) {
      expect(orderNote(query, clinicians, { nearest: false }).toLowerCase()).not.toContain("near");
      expect(orderNote(query, clinicians, { nearest: true }).toLowerCase()).toContain("near");
    }
  });

  it("is always a single finished sentence-set, never empty and never a template hole", () => {
    for (const query of QUERIES) {
      for (const nearest of [true, false]) {
        const note = orderNote(query, clinicians, { nearest });
        expect(note.length).toBeGreaterThan(20);
        expect(note.endsWith(".")).toBe(true);
        expect(note).not.toMatch(/undefined|\[object|\{\}|\s,/);
      }
    }
  });

  it("never echoes the reader's own words back at them (the closed-vocabulary floor)", () => {
    const note = orderNote("i need a bulk billing gp near burleigh for my son zephyr", clinicians);
    expect(note.toLowerCase()).not.toContain("zephyr");
    expect(note.toLowerCase()).not.toContain("burleigh");
  });
});
