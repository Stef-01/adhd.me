// The two figures every public page quotes, held to one value each. The story rail said one cost,
// the learn page another and the practices copy a third under the same label; this is the check
// that a fourth cannot appear: every place that renders them reads the register.
import { describe, expect, it } from "vitest";
import { INDICATIVE_FIGURES, LANDING_COPY } from "./landing-copy";
import { scenesOf, MODULES } from "../learn/scenes";

describe("the indicative figures", () => {
  it("are the practices page's evidence, not a copy of it", () => {
    expect(LANDING_COPY.practiceStory.evidence).toContain(INDICATIVE_FIGURES.wait);
    expect(LANDING_COPY.practiceStory.evidence).toContain(INDICATIVE_FIGURES.cost);
  });

  it("are what the learn scene's footnote states", () => {
    const foots = MODULES.flatMap((m) => scenesOf(m).map((s) => s.foot ?? "")).join("\n");
    expect(foots).toContain(INDICATIVE_FIGURES.wait.value);
    expect(foots).toContain(INDICATIVE_FIGURES.cost.value);
  });

  it("are ranges, not decimals — nothing here has a confirmed source", () => {
    for (const figure of Object.values(INDICATIVE_FIGURES)) expect(figure.value).not.toMatch(/\d\.\d/);
  });
});
