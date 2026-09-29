import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { clinicians, matchQuality, rankBands } from "@/demo/clinicians";
import { emptyFilters } from "./filters";
import { searchRoster } from "./pipeline";
import { EXAMPLE_SEARCHES } from "./examples";

describe("the finder's example chips", () => {
  it("each request produces an informed order on the roster", () => {
    for (const example of eachOf(EXAMPLE_SEARCHES, "the examples")) {
      const roster = searchRoster(clinicians, emptyFilters(), example.request, null);
      expect(matchQuality(example.request, roster), example.label).toBe("informed");
    }
  });

  it("each opens on a list the fold can hold: its tied first band is at most eight rows", () => {
    // The fold never cuts a tied band, so an example whose first band is eleven opens on eleven
    // rows ("A woman GP for ADHD" did: 76 words). A row is about six words, so eight rows is what
    // keeps an example's screen under the 60-word ceiling.
    for (const example of eachOf(EXAMPLE_SEARCHES, "the examples")) {
      const roster = searchRoster(clinicians, emptyFilters(), example.request, null);
      const first = rankBands(example.request, roster)[0]?.clinicians.length ?? 0;
      expect(first, `: a first band of `).toBeLessThanOrEqual(8);
    }
  });

  it("each is short, neutral and passes the patient rules", () => {
    for (const example of eachOf(EXAMPLE_SEARCHES, "the examples")) {
      expect(example.label.split(" ").length, example.label).toBeLessThanOrEqual(3);
      expect(example.request, example.label).not.toMatch(/\b(I|I'm|I've|me|my|mine)\b/i);
      expect(lintLandingCopy(`${example.label}. ${example.request}.`), example.label).toEqual([]);
    }
  });
});
