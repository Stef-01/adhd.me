import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signingSecret } from "@/lib/secret";

const ORIGINAL_SECRET = process.env.CAREYIELD_TOKEN_SECRET;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string | undefined) {
  // NODE_ENV is readonly in the Node typings; assign through a cast for the test.
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(() => {
  delete process.env.CAREYIELD_TOKEN_SECRET;
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CAREYIELD_TOKEN_SECRET;
  else process.env.CAREYIELD_TOKEN_SECRET = ORIGINAL_SECRET;
  setNodeEnv(ORIGINAL_NODE_ENV);
});

describe("signingSecret", () => {
  it("returns the configured secret when set", () => {
    process.env.CAREYIELD_TOKEN_SECRET = "a-real-secret";
    setNodeEnv("production");
    expect(signingSecret()).toBe("a-real-secret");
  });

  it("falls back to the dev secret outside production", () => {
    setNodeEnv("development");
    expect(signingSecret()).toBe("careyield-synthetic-dev-secret");
  });

  it("fails closed in production when the secret is missing", () => {
    setNodeEnv("production");
    expect(() => signingSecret()).toThrow(/CAREYIELD_TOKEN_SECRET/);
  });

  it("treats an empty secret as unset", () => {
    process.env.CAREYIELD_TOKEN_SECRET = "";
    setNodeEnv("production");
    expect(() => signingSecret()).toThrow(/CAREYIELD_TOKEN_SECRET/);
  });
});
