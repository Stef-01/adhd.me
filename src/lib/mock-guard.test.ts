import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mockRoutesEnabled } from "@/lib/mock-guard";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_FLAG = process.env.CAREYIELD_ENABLE_MOCK_ROUTES;

function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(() => {
  delete process.env.CAREYIELD_ENABLE_MOCK_ROUTES;
});

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
  if (ORIGINAL_FLAG === undefined) delete process.env.CAREYIELD_ENABLE_MOCK_ROUTES;
  else process.env.CAREYIELD_ENABLE_MOCK_ROUTES = ORIGINAL_FLAG;
});

describe("mockRoutesEnabled", () => {
  it("is enabled outside production regardless of the flag", () => {
    setNodeEnv("development");
    expect(mockRoutesEnabled()).toBe(true);
    setNodeEnv("test");
    expect(mockRoutesEnabled()).toBe(true);
  });

  it("is disabled in a production build with no opt-in", () => {
    setNodeEnv("production");
    expect(mockRoutesEnabled()).toBe(false);
  });

  it("is enabled in production only with the explicit opt-in flag", () => {
    setNodeEnv("production");
    process.env.CAREYIELD_ENABLE_MOCK_ROUTES = "1";
    expect(mockRoutesEnabled()).toBe(true);
  });

  it("requires exactly '1' for the opt-in", () => {
    setNodeEnv("production");
    for (const value of ["true", "yes", "0", ""]) {
      process.env.CAREYIELD_ENABLE_MOCK_ROUTES = value;
      expect(mockRoutesEnabled()).toBe(false);
    }
  });
});
