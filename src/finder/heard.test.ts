import { describe, expect, it } from "vitest";
import { clinicians, matchQuality, needsFor } from "@/demo/clinicians";
import { REACH_CORPUS } from "@/matching/corpus";
import { facetKey } from "@/matching/needs";
import { heardChips } from "./heard";

const roster = clinicians;
const chipsFor = (text: string) => heardChips(needsFor(text, roster), 4);

describe("heardChips", () => {
  it("reads the text budget's request as two chips, access first, then care; the manner it heard is shown nowhere (O259)", () => {
    const chips = chipsFor("an adult ADHD assessment, telehealth, not rushed");
    expect(chips.map((c) => c.label)).toEqual(["Telehealth", "ADHD assessment"]);
    expect(chips.map((c) => c.spoken)).toEqual(["telehealth", "ADHD assessment"]);
  });

  it("shows the four strongest of five, in the ranker's order, and nothing else", () => {
    const text = "I want a woman GP who bulk bills and speaks Hindi, my anxiety is bad and I need a longer appointment";
    expect(new Set(needsFor(text, roster).map((n) => facetKey(n.facet))).size).toBe(5);
    expect(chipsFor(text).map((c) => c.label)).toEqual(["Hindi-speaking", "Bulk billing", "Woman clinician", "Longer appointment"]);
  });

  it("gives a long label its short one", () => {
    expect(chipsFor("my son Oliver cannot sit still in class and the school keeps calling").map((c) => c.label)).toEqual(["Children, teens"]);
  });

  it("shows nothing when nothing was read", () => {
    expect(chipsFor("hello")).toEqual([]);
  });

  it("across the corpus: at most four chips, one per facet, each a facet the ranking read", () => {
    for (const { text } of REACH_CORPUS) {
      const read = needsFor(text, roster);
      const chips = heardChips(read, 4);
      // O259: a manner trait is read and never shown, so the chips are the other facets, at most four.
      const keys = new Set(read.filter((n) => n.facet.kind !== "manner").map((n) => facetKey(n.facet)));
      expect(chips.length).toBe(Math.min(4, keys.size));
      expect(new Set(chips.map((c) => c.key)).size).toBe(chips.length);
      for (const chip of chips) expect(keys.has(chip.key), text).toBe(true);
    }
  });
});

describe("matchQuality on the chips that are kept", () => {
  it("claims no order once every heard facet is taken out", () => {
    expect(matchQuality("an adult ADHD assessment, telehealth, not rushed", roster, [])).toBe("unmatched");
  });
});
