// AR7: e2e/support/floors.ts is filesystem-free (like `e2e/site-routes.ts` and `measured.ts`), so
// its own non-vacuity is checked here rather than in a Playwright spec.
import { describe, expect, it } from "vitest";
import { derivedFloor, NonVacuousFloorError } from "../../e2e/support/floors";

describe("derivedFloor()", () => {
  it("multiplies the route count by the per-route rate", () => {
    expect(derivedFloor(15, 26)).toBe(390);
    expect(derivedFloor(30, 20)).toBe(600);
  });

  it("floors a fractional product rather than rounding it up", () => {
    expect(derivedFloor(7, 2.5)).toBe(17);
  });

  // THE POINT OF THE UNIT: the floor MOVES with the route list, in both directions, rather than
  // needing a human to re-measure and re-transcribe it the way O170 and O171 each did by hand.
  it("rises when the route list grows", () => {
    const before = derivedFloor(16, 9);
    const after = derivedFloor(30, 9);
    expect(after).toBeGreaterThan(before);
  });

  it("falls when the route list shrinks", () => {
    const before = derivedFloor(30, 9);
    const after = derivedFloor(16, 9);
    expect(after).toBeLessThan(before);
  });

  it("scales linearly with route count for a fixed rate", () => {
    expect(derivedFloor(20, 5)).toBe(2 * derivedFloor(10, 5));
  });

  // NON-VACUITY: a route list that discovered zero routes, or a rate of zero, must refuse rather
  // than silently agree that any population at all clears the floor.
  it.each([0, -1, -45])("throws when routeCount is %i", (routeCount) => {
    expect(() => derivedFloor(routeCount, 9)).toThrow(NonVacuousFloorError);
  });

  it.each([0, -1, -9])("throws when minPerRoute is %i", (minPerRoute) => {
    expect(() => derivedFloor(15, minPerRoute)).toThrow(NonVacuousFloorError);
  });

  it("throws on non-finite inputs (NaN, Infinity) rather than passing them through", () => {
    expect(() => derivedFloor(NaN, 9)).toThrow(NonVacuousFloorError);
    expect(() => derivedFloor(15, Infinity)).toThrow(NonVacuousFloorError);
  });

  it("names which argument collapsed, so a failure is traceable without a debugger", () => {
    expect(() => derivedFloor(0, 9)).toThrow(/routeCount/);
    expect(() => derivedFloor(15, 0)).toThrow(/minPerRoute/);
  });
});
