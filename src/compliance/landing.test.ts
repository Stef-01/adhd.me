import { describe, expect, it } from "vitest";
import { lintCopyBundle, lintLandingCopy } from "@/compliance/landing";
import { LANDING_COPY } from "@/compliance/landing-copy";

describe("landing copy compliance", () => {
  it("the shipped landing copy is clean", () => {
    expect(lintCopyBundle(LANDING_COPY)).toEqual([]);
  });

  it("flags clinical / therapeutic claims", () => {
    expect(lintLandingCopy("We treat diabetes and improve your health").map((v) => v.rule)).toEqual(
      expect.arrayContaining(["no-clinical-claims", "no-condition-targeting"]),
    );
    expect(lintLandingCopy("proven to cure disease").some((v) => v.rule === "no-clinical-claims")).toBe(true);
  });

  it("flags testimonials and ratings", () => {
    expect(lintLandingCopy("Rated 5/5 by our patients").map((v) => v.rule)).toEqual(
      expect.arrayContaining(["no-ratings"]),
    );
    expect(lintLandingCopy("Read the testimonial from Dr Lee").some((v) => v.rule === "no-testimonials")).toBe(true);
  });

  it("flags superlatives, guarantees, specialist and urgency", () => {
    expect(lintLandingCopy("The best, #1 clinic").some((v) => v.rule === "no-superlatives")).toBe(true);
    expect(lintLandingCopy("Results guaranteed").some((v) => v.rule === "no-guarantees")).toBe(true);
    expect(lintLandingCopy("See a specialist today").some((v) => v.rule === "no-specialist")).toBe(true);
    expect(lintLandingCopy("Act now, limited time").some((v) => v.rule === "no-urgency")).toBe(true);
  });

  it("reports the field path for a nested violation", () => {
    const bundle = { hero: { heading: "clean copy" }, cta: { button: "cure everything" } };
    const found = lintCopyBundle(bundle);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ field: "cta.button", rule: "no-clinical-claims" });
  });

  it("passes ordinary B2B copy that only mentions care and practices", () => {
    expect(lintLandingCopy("Fill unused sessions and measure continuity of care for your practice")).toEqual([]);
  });
});
