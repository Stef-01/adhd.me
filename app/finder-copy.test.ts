// Counts the words in the finder's copy table against the caps beside them, and every chip the
// "What we heard" row can show against the chip cap, across the whole vocabulary.

import { describe, expect, it } from "vitest";
import { FINDER_COPY } from "./finder-copy";
import { clinicians, labelInSentence } from "@/demo/clinicians";
import { rosterFor } from "@/demo/synthetic-roster";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { languageNeeds, NEED_SHORT_LABELS, shortLabel, type NeedSignal } from "@/matching/needs";

/** The text budget's own count (scripts/text-budget-lib.mjs): a word is a run with a letter or digit. */
const words = (text: string) => text.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;

const languages = [...new Set([...MATCHABLE_LANGUAGES, ...rosterFor(true).flatMap((c) => c.languages), ...clinicians.flatMap((c) => c.languages)])]
  .filter((l) => l.toLowerCase() !== "english")
  .flatMap((l) => languageNeeds(`I speak ${l}`, [l]));

/** A chip's words inside its name, cased the way `heardChips` cases them. */
const inSentence = (need: Pick<NeedSignal, "facet" | "label">) => labelInSentence({ ...need, matched: "", weight: 0 });

/** Every chip the row can show: each lexicon facet's short label and each language. */
const chips: { label: string; short: string; spoken: string }[] = [
  ...NEED_SHORT_LABELS.map(({ label, short }) => ({ label, short, spoken: inSentence({ label: short, facet: { kind: "care", area: "anxiety" } }) })),
  ...languages.map((need) => ({ label: need.label, short: shortLabel(need), spoken: inSentence({ ...need, label: shortLabel(need) }) })),
];

describe("FINDER_COPY", () => {
  it("keeps every fixed string within its cap", () => {
    expect(words(FINDER_COPY.heardRow.text)).toBeLessThanOrEqual(FINDER_COPY.heardRow.cap);
  });

  it("shows at most four chips of at most two words, as LLM-MATCHING-PLAN §15 caps them", () => {
    expect(FINDER_COPY.heardChip.max).toBe(4);
    expect(FINDER_COPY.heardChip.cap).toBe(2);
  });

  it("holds every chip in the vocabulary to the chip cap", () => {
    expect(chips.length).toBeGreaterThan(30);
    for (const { label, short } of chips) {
      expect(words(short), `"${short}" (for "${label}")`).toBeLessThanOrEqual(FINDER_COPY.heardChip.cap);
    }
  });

  it("uses a label as it is when it already fits", () => {
    for (const { label, short } of chips) {
      if (words(label) <= FINDER_COPY.heardChip.cap) expect(short).toBe(label);
    }
  });

  it("gives no two facets the same chip", () => {
    const shorts = chips.map((c) => c.short);
    expect(new Set(shorts).size).toBe(shorts.length);
  });

  it("keeps each chip's name, what a tap does, within its cap", () => {
    for (const { spoken } of chips) {
      expect(words(FINDER_COPY.removeHeard.text(spoken)), spoken).toBeLessThanOrEqual(FINDER_COPY.removeHeard.cap);
      expect(words(FINDER_COPY.putBackHeard.text(spoken)), spoken).toBeLessThanOrEqual(FINDER_COPY.putBackHeard.cap);
    }
  });

  it("names a chip with its own visible words, so a voice command can find it", () => {
    for (const { short, spoken } of chips) {
      expect(FINDER_COPY.removeHeard.text(spoken).toLowerCase()).toContain(short.toLowerCase());
    }
  });
});
