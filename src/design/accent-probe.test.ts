// AR9: `e2e/support/accent-load.ts`'s pure half is checked here rather than in a Playwright spec —
// vitest is the only runner in `pnpm verify`'s hard gate, and these two functions decide whether a
// probe run counts as proof. Same split AR6 (`measured.test.ts`) and AR7 (`floors.test.ts`) used.
//
// The browser half — the canvas walk and the injection — cannot be checked here and is checked
// where it lives, in `e2e/support/accent-probe.spec.ts`, against a real rendered page.
import { describe, expect, it } from "vitest";
import {
  ACCENT_RULE_ID,
  MEANINGS_CAP,
  meaningsOf,
  overCapFinding,
  probeVerdict,
} from "../../e2e/support/accent-load";

describe("overCapFinding()", () => {
  it("returns null at and below the cap", () => {
    expect(overCapFinding("/", [])).toBeNull();
    expect(overCapFinding("/", ["mix-percent"])).toBeNull();
    expect(overCapFinding("/", ["mix-percent", "mix-condition"])).toBeNull();
  });

  it("reports the route, the count, the cap and the rule id once the cap is passed", () => {
    const finding = overCapFinding("/clinicians", ["a", "b", "c"]);
    expect(finding).toContain("/clinicians");
    expect(finding).toContain("3");
    expect(finding).toContain(ACCENT_RULE_ID);
  });

  it("names the offending meanings, so the finding says what to go and look at", () => {
    const finding = overCapFinding("/finder", ["dual-input-field", "dual-input-action", "stray-badge"]);
    expect(finding).toContain("stray-badge");
    expect(finding).toContain("dual-input-field");
  });

  it("applies the cap it is given rather than a fixed one, which is what lets the probe move it", () => {
    expect(overCapFinding("/", ["a", "b", "c"], 3)).toBeNull();
    expect(overCapFinding("/", ["a", "b"], 1)).not.toBeNull();
  });

  it("is off by one in neither direction — the cap value is permitted, the next one is not", () => {
    const atCap = Array.from({ length: MEANINGS_CAP }, (_, i) => `m${i}`);
    expect(overCapFinding("/", atCap)).toBeNull();
    expect(overCapFinding("/", [...atCap, "one-more"])).not.toBeNull();
  });
});

describe("meaningsOf()", () => {
  it("collapses repeats, because one class painted twice is one meaning", () => {
    expect(meaningsOf(["mix-percent", "mix-percent", "mix-condition"])).toEqual([
      "mix-percent",
      "mix-condition",
    ]);
  });

  it("preserves first-seen order, so a report reads in the order the page paints", () => {
    expect(meaningsOf(["b", "a", "b"])).toEqual(["b", "a"]);
  });
});

describe("probeVerdict()", () => {
  it("passes only when the probe made the detector fail and the clean page did not", () => {
    const v = probeVerdict(ACCENT_RULE_ID, "/", "/: 3 distinct accent meanings", null);
    expect(v.kind).toBe("discriminates");
    expect(v).toHaveProperty("finding");
  });

  // THE OUTCOME THIS UNIT EXISTS FOR. A green sweep under a live violation is not a pass.
  it("reports VACUOUS when the detector stayed green while the rule was being broken", () => {
    const v = probeVerdict(ACCENT_RULE_ID, "/", null, null);
    expect(v.kind).toBe("vacuous");
    expect(v).toMatchObject({ reason: expect.stringContaining(ACCENT_RULE_ID) });
    expect(v).toMatchObject({ reason: expect.stringContaining("/") });
  });

  it("reports FIRES-WHEN-CLEAN when the unmutated page already had a finding", () => {
    // Checked because it is how a vacuous sweep could otherwise pass this probe: a detector that
    // reported a finding on everything would satisfy the red half and prove nothing at all.
    const v = probeVerdict(ACCENT_RULE_ID, "/", "found", "also found on the clean page");
    expect(v.kind).toBe("fires-when-clean");
    expect(v).toMatchObject({ reason: expect.stringContaining("also found on the clean page") });
  });

  it("prefers fires-when-clean over vacuous when the detector fired on the clean page and not the probed one", () => {
    // Both halves are wrong here. Reporting `vacuous` would send a reader looking for a missing
    // detector when the real fault is a detector firing at random.
    expect(probeVerdict(ACCENT_RULE_ID, "/", null, "clean page finding").kind).toBe("fires-when-clean");
  });

  it("names the route in every verdict, because a probe result with no route is unactionable", () => {
    for (const v of [
      probeVerdict(ACCENT_RULE_ID, "/clinicians", null, null),
      probeVerdict(ACCENT_RULE_ID, "/clinicians", "x", "y"),
    ]) {
      expect(v).toMatchObject({ reason: expect.stringContaining("/clinicians") });
    }
  });
});
