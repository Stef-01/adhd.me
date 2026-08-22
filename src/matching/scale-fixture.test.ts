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
  /**
   * O151: THIS WALKS `src/` TOO, AND THAT IS THE WHOLE POINT OF THE WIDENING.
   *
   * O142 shipped this guard walking `app/` only, which left a hole the width of `src/`: `app/`
   * imports dozens of `src/` modules, so any one of them importing the fixture would carry twenty
   * fabricated doctors to a patient surface with this test silent. The law it enforces is the
   * strongest in the tree — publishing an invented clinician on a health directory is precisely
   * what W193 exists to prevent — and an absolute law with a scoped guard is a guard that has
   * only ever checked the easy half.
   *
   * It matches IMPORTS, not mentions, and that distinction was earned: the first version of this
   * widening flagged three files that are all correct — `cdss-boundary.ts` NAMES the module in a
   * W200 census declaration, `cdss-boundary.test.ts` dynamically imports it because the census has
   * to load every module it lints, and `clarify.ts` mentions the scale report in a comment. A
   * guard that cannot tell a citation from a dependency reports the tree's own bookkeeping as a
   * breach, and would have been switched off within a week.
   *
   * Test files may import it — that is what the fixture is for. A NON-TEST module under `app/` or
   * `src/` may not, because `app/` imports `src/` freely and that is the whole path to a patient.
   */
  it("is imported by no non-test module under app/ or src/", () => {
    const IMPORTS_IT = /(?:from\s*["'][^"']*scale-fixture["']|import\s*\(\s*["'][^"']*scale-fixture["'])/;
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue;
        if (IMPORTS_IT.test(readFileSync(full, "utf8"))) offenders.push(path.relative(ROOT, full));
      }
    };
    walk(path.join(ROOT, "app"));
    walk(path.join(ROOT, "src"));
    expect(offenders, `these would carry fabricated clinicians to a patient:\n${offenders.join("\n")}`).toEqual([]);
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
    // O179: two since Dr Yadav left. The premise is unchanged and if anything stronger — a
    // two-person roster gives the clarifier sort even less to do than a three-person one.
    expect(report.rosterSize).toBe(2);
    expect(report.distinctEvenness).toBe(1);
  });

  /**
   * And the other half of the premise — "will matter a lot at twenty" — is EARNED. Pinned both
   * ways: a regression fails, and an improvement has to move the number deliberately.
   */
  it("acquires real choices as the roster grows", () => {
    const measured = [3, 8, 20, 40].map((size) => clarifierScaleReport(ASK, syntheticRoster(size)));
    // O179: re-measured at [1, 4, 6, 8], down from [1, 4, 7, 9]. NOT a regression in the sort —
    // `syntheticRoster` draws its facet rates from the REAL roster (`rateAmongReal`), so removing a
    // clinician changes the distribution the synthetic entries are sampled from, and a two-person
    // base is a slightly narrower world to grow out of. The CLAIM being pinned is unchanged and
    // still holds: the number rises with roster size, so scale really does buy distinct questions.
    expect(measured.map((r) => r.distinctEvenness)).toEqual([1, 4, 6, 8]);
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
    // O179: fourteen askable questions collapse into TWO distinct reorderings, where sixteen used
    // to collapse into five. Both halves moved for the same reason: the askable set is built from
    // what the roster declares, and Dr Yadav's declarations (`unhurried` above all) left with him,
    // so there are two fewer questions to ask AND far less for any of them to separate. At two
    // clinicians almost every question is the same question, which is the premise stated sharply.
    expect([real.candidates, real.distinctSignatures]).toEqual([14, 2]);
    const atTwenty = clarifierScaleReport(ASK, syntheticRoster(20));
    expect([atTwenty.candidates, atTwenty.distinctSignatures]).toEqual([14, 14]);
  });

  /** Non-vacuity for the whole report: the selector's order is not the tie-break's order. */
  it("offers something the alphabetical tie-break alone would not", () => {
    const atTwenty = clarifierScaleReport(ASK, syntheticRoster(20));
    expect(atTwenty.offered).not.toEqual(atTwenty.offeredIfAlphabetical);
  });
});
