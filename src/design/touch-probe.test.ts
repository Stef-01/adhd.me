// AR10: `e2e/support/touch-load.ts`'s pure half, checked in the hard gate (AR6/AR7/AR9's split —
// vitest is the only runner in `pnpm verify`, and floorFinding decides what a red sweep says).
// The browser half — the DOM walk and the injection — is checked in touch-probe.spec.ts against
// a real rendered page.
import { describe, expect, it } from "vitest";
import { TOUCH_FLOOR_PX, TOUCH_RULE_ID, floorFinding } from "../../e2e/support/touch-load";

describe("floorFinding()", () => {
  it("returns null on a clean route", () => {
    expect(floorFinding("/", [])).toBeNull();
  });

  it("names the route, the count, the floor and the rule id", () => {
    const finding = floorFinding("/clinicians", ['<button> "x" 30x30', '<a> "y" 44x40']);
    expect(finding).toContain("/clinicians");
    expect(finding).toContain("2 control(s)");
    expect(finding).toContain(String(TOUCH_FLOOR_PX));
    expect(finding).toContain(TOUCH_RULE_ID);
  });

  it("carries every offender, so the finding says what to go and look at", () => {
    const finding = floorFinding("/finder", ['<button> "start" 30x30', '<summary> "more" 20x44']);
    expect(finding).toContain('"start" 30x30');
    expect(finding).toContain('"more" 20x44');
  });
});

describe("the floor constant", () => {
  it("is O14's 44, and the register's rule id matches the sweep's tag", () => {
    // Two constants the whole probe hangs off. If someone lowers the floor or renames the rule,
    // this fails HERE, in the hard gate, before the e2e suite is even reached.
    expect(TOUCH_FLOOR_PX).toBe(44);
    expect(TOUCH_RULE_ID).toBe("interaction.touch-44");
  });
});
