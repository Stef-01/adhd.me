import { describe, expect, it } from "vitest";
import { lintCopyBundle, lintLandingCopy } from "@/compliance/landing";
import { LANDING_COPY } from "@/compliance/landing-copy";

describe("landing copy compliance", () => {
  /**
   * O164: `no-ratings` used to match a bare `\breviews?\b`, which fired on the language this
   * product is made of — "scheduled reviews", "review at set intervals", `/privacy/counsel-review`,
   * and once on a className in a source scan. Each trip bought an acceptance entry, and a register
   * full of acceptances reads as coverage while permitting the thing it was written to stop.
   *
   * Narrowing a compliance regex is only honest if the narrowing is PROVED not to open a hole, so
   * both directions are pinned by example. Law 6 — no testimonials or ratings anywhere — is not a
   * law that may rot.
   */
  const ratingsRule = (text: string) =>
    lintLandingCopy(text).some((v) => v.rule === "no-ratings");

  it("still catches ratings, which is what the rule is for", () => {
    for (const text of [
      "4.8/5 from our patients",
      "a 5-star clinic",
      "★★★★★",
      "highly rated by patients",
      "patient reviews",
      "read our reviews",
      "127 reviews",
      "reviews from patients",
      "Google reviews",
      "verified reviews",
    ]) {
      expect(ratingsRule(text), `ratings language slipped through: "${text}"`).toBe(true);
    }
  });

  it("no longer fires on clinical review, which is what this product does", () => {
    for (const text of [
      "Long first appointment, scheduled reviews",
      "review at set intervals",
      "titration reviewed on a schedule",
      "peer review",
      "counsel review",
      "we review your answers",
      "under review",
      // O164: the newline case. The rendered profile reads "…scheduled reviews\nby telehealth,
      // wherever you are", and the first narrowing used `\s+`, which matches a newline — so
      // "reviews by telehealth" matched across the line break. A rule scanning rendered text has
      // to know that a line break is not a space.
      "Long first appointment, scheduled reviews\nby telehealth, wherever you are",
    ]) {
      expect(ratingsRule(text), `clinical review still trips the ratings rule: "${text}"`).toBe(false);
    }
  });

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
