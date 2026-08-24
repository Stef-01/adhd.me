import { afterEach, describe, expect, it, vi } from "vitest";
import { serverNow, SERVER_FIXED_CLOCK_ENV } from "./server-clock";

// AR15: both directions of the double guard, plus the malformed-pin fallback. NODE_ENV is
// "test" here so mockRoutesEnabled() is true — the production-off direction is asserted via
// vi.stubEnv on NODE_ENV, the same seam mock-guard itself keys on.

describe("serverNow — the capture clock's server half", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns the real clock when no pin is set", () => {
    vi.stubEnv(SERVER_FIXED_CLOCK_ENV, "");
    const before = Date.now();
    const got = serverNow().getTime();
    expect(got).toBeGreaterThanOrEqual(before);
    expect(got).toBeLessThanOrEqual(Date.now());
  });

  it("returns the pinned instant when the env is set and the mock guard is on", () => {
    vi.stubEnv(SERVER_FIXED_CLOCK_ENV, "2026-03-03T03:03:03.000Z");
    expect(serverNow().toISOString()).toBe("2026-03-03T03:03:03.000Z");
  });

  it("ignores the pin in a production build without the mock opt-in — the guard mock routes use", () => {
    vi.stubEnv(SERVER_FIXED_CLOCK_ENV, "2026-03-03T03:03:03.000Z");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADHDME_ENABLE_MOCK_ROUTES", "");
    const got = serverNow().getTime();
    expect(Math.abs(got - Date.now())).toBeLessThan(5_000);
  });

  it("falls back to the real clock on a malformed pin rather than rendering Invalid Date", () => {
    vi.stubEnv(SERVER_FIXED_CLOCK_ENV, "not-a-date");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const got = serverNow().getTime();
    expect(Math.abs(got - Date.now())).toBeLessThan(5_000);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
