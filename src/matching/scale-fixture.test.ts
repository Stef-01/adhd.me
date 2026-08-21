// W234 (O142): the clarifier at scale — Q3 item 10's premise, measured.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { clarifierScaleReport, syntheticRoster } from "@/matching/scale-fixture";

const ROOT = path.resolve(__dirname, "..", "..");
const ASK = "I need an ADHD assessment";

describe("the fixture never reaches a patient", () => {
  /**
   * THE LAW OF THE FIXTURE, MADE EXECUTABLE.
   *
   * These entries are not people. Rendering one would publish a fabricated doctor, which is the
   * thing W193's real-person law exists to prevent and the thing the founder gates forbid outright.
   * A comment saying so decays; this fails.
   */
  it("is imported from nowhere under app/", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name) && readFileSync(full, "utf8").includes("scale-fixture")) {
          offenders.push(path.relative(ROOT, full));
        }
      }
    };
    walk(path.join(ROOT, "app"));
    expect(offenders).toEqual([]);
  });

  it("carries no entry that could be mistaken for a real clinician", () => {
    for (const entry of syntheticRoster(20)) {
      expect(entry.realPerson).toBeUndefined();
      expect(entry.image).toBeNull();
      expect(entry.id).toMatch(/^synthetic-/);
      expect(entry.name).toContain("Synthetic fixture");
    }
  });

  it("is deterministic, so the measurements below are pins and not flakes", () => {
    expect(syntheticRoster(20)).toEqual(syntheticRoster(20));
  });

  /**
   * The rates are DERIVED from the real roster, not chosen. This is the non-vacuity proof for
   * that claim: a roster of only women produces a synthetic roster of only women. If somebody
   * later hardcodes the rates, this fails.
   */
  it("inherits the real roster's marginal rates rather than invented ones", () => {
    expect(clinicians.every((c) => c.languages.includes("English"))).toBe(true);
    const womenInReal = clinicians.filter((c) => c.gender === "woman").length;
    const womenInSynthetic = syntheticRoster(40).filter((c) => c.gender === "woman").length;
    if (womenInReal === 0) expect(womenInSynthetic).toBe(0);
    else expect(womenInSynthetic).toBeGreaterThan(0);
  });
});

describe("Q3 item 10's premise", () => {
  /**
   * THE FINDING, PINNED BOTH DIRECTIONS.
   *
   * `clarifiers()` sorts candidates by `|heldBy/size - 0.5|`. On a three-clinician roster every
   * splitting facet is held by one or by two, and |1/3 - 0.5| === |2/3 - 0.5| — so EVERY candidate
   * has the same evenness and the sort decides nothing at all. The selector's real work today is
   * done entirely by O33's greedy holder-signature dedup underneath it.
   *
   * This is a stronger statement than the doc comment's "the order barely matters today", and it
   * is why the comment was rewritten rather than left standing. If the roster grows, this fails —
   * which is correct: the sort waking up is exactly the event Q3 item 10 is waiting for.
   */
  it("is inert on the real roster: one evenness value across every question", () => {
    const report = clarifierScaleReport(ASK, clinicians);
    expect(report.rosterSize).toBe(3);
    expect(report.distinctEvenness).toBe(1);
  });

  /**
   * And the other half of the premise — "will matter a lot at twenty" — is EARNED. Pinned both
   * ways: a regression fails, and an improvement has to move the number deliberately.
   */
  it("acquires real choices as the roster grows", () => {
    const measured = [3, 8, 20, 40].map((size) => clarifierScaleReport(ASK, syntheticRoster(size)));
    expect(measured.map((r) => r.distinctEvenness)).toEqual([1, 4, 7, 9]);
    // Monotone by construction of the evenness function, but pinned because the CLAIM is that it
    // grows — a change that made it non-monotone would falsify the claim while passing the above.
    const evenness = measured.map((r) => r.distinctEvenness);
    expect([...evenness].sort((a, b) => a - b)).toEqual(evenness);
  });

  /**
   * The second half of what scale buys, and the more useful half. At three, sixteen askable
   * questions collapse into five distinct reorderings: most of the questions are, in effect,
   * the same question. At twenty every one is distinct.
   */
  it("turns duplicate questions into distinct ones", () => {
    const real = clarifierScaleReport(ASK, clinicians);
    expect([real.candidates, real.distinctSignatures]).toEqual([16, 5]);
    const atTwenty = clarifierScaleReport(ASK, syntheticRoster(20));
    expect([atTwenty.candidates, atTwenty.distinctSignatures]).toEqual([16, 16]);
  });

  /** Non-vacuity for the whole report: the selector's order is not the tie-break's order. */
  it("offers something the alphabetical tie-break alone would not", () => {
    const atTwenty = clarifierScaleReport(ASK, syntheticRoster(20));
    expect(atTwenty.offered).not.toEqual(atTwenty.offeredIfAlphabetical);
  });
});
