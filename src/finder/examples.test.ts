import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { matchQuality } from "@/demo/clinicians";
import { rosterFor } from "@/demo/synthetic-roster";
import { emptyFilters } from "./filters";
import { searchRoster } from "./pipeline";
import { EXAMPLE_SEARCHES } from "./examples";

describe("the finder's example chips", () => {
  it("each request produces an informed order, on the real roster and with the examples on", () => {
    for (const example of eachOf(EXAMPLE_SEARCHES, "the examples")) {
      for (const synthetic of [false, true]) {
        const roster = searchRoster(rosterFor(synthetic), emptyFilters(), example.request, null);
        expect(matchQuality(example.request, roster), `${example.label}, examples ${synthetic ? "on" : "off"}`).toBe("informed");
      }
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
