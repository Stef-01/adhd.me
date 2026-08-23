// AR6: e2e/support/measured.ts is filesystem-free (like `e2e/site-routes.ts`), so its own
// non-vacuity is checked here rather than in a Playwright spec — vitest is the only runner that
// participates in `pnpm verify`'s hard gate, and this harness is precisely the thing every e2e
// sweep will trust to fail correctly.
import { describe, expect, it, vi } from "vitest";
import { measured, NonVacuityError } from "../../e2e/support/measured";

describe("measured()", () => {
  it("returns the label and count for a real, non-zero population", () => {
    expect(measured("touch-floor.public", 163)).toEqual({ label: "touch-floor.public", count: 163 });
  });

  it("reports the number rather than swallowing it", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    measured("semantics.headings", 214);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("semantics.headings"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("214"));
    log.mockRestore();
  });

  // NON-VACUITY OF THE NON-VACUITY CHECK: a sweep whose selector stopped matching and a sweep
  // whose selector never matched anything measure the same thing — zero — so both must be caught
  // by the identical path, not by two implementations that could drift apart.
  it.each([0, -1, -160])("throws NonVacuityError when count is %i", (count) => {
    expect(() => measured("collapsed-sweep", count)).toThrow(NonVacuityError);
  });

  it("throws on non-finite counts (NaN, Infinity) rather than passing them through", () => {
    expect(() => measured("broken-accumulator", NaN)).toThrow(NonVacuityError);
    expect(() => measured("broken-accumulator", Infinity)).toThrow(NonVacuityError);
  });

  it("names the sweep and the count in the thrown error, so a failure is traceable without a debugger", () => {
    expect(() => measured("touch-floor.console", 0)).toThrow(/touch-floor\.console/);
    expect(() => measured("touch-floor.console", 0)).toThrow(/counted 0/);
  });

  it("does not report anything when it throws", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(() => measured("collapsed-sweep", 0)).toThrow();
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
