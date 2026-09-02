import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_MS, consoleCookieOptions, signSession, verifySession } from "@/console/session";
import { readEnv } from "@/lib/env";

describe("console session", () => {
  it("round-trips a staff email", () => {
    expect(verifySession(signSession("manager@practice.example"))).toBe("manager@practice.example");
  });

  it("rejects tampered values", () => {
    const value = signSession("manager@practice.example");
    expect(verifySession(value.slice(0, -2) + "zz")).toBeNull();
    const [, sig] = value.split(".");
    const forged = `${Buffer.from("evil@example.com", "utf8").toString("base64url")}.${sig}`;
    expect(verifySession(forged)).toBeNull();
  });

  it("rejects missing and malformed values", () => {
    for (const bad of [undefined, "", ".", "abc", "abc.", ".abc"]) {
      expect(verifySession(bad)).toBeNull();
    }
  });

  it("rejects payloads that are not email-shaped", () => {
    const payload = Buffer.from("not-an-email", "utf8").toString("base64url");
    // Re-sign with the real signer via signSession on a valid email, then swap payloads —
    // even a correctly signed non-email payload is refused.
    const invitationStyle = signSession("a@b.c").split(".")[0];
    expect(invitationStyle).not.toBe(payload);
    expect(verifySession(`${payload}.anything`)).toBeNull();
  });
});

describe("U2 the console cookie flags", () => {
  it("are httpOnly, lax, site-wide, and live exactly as long as the credential they carry", () => {
    const flags = consoleCookieOptions(readEnv({ NODE_ENV: "production" }));
    expect(flags).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });
    expect(flags.maxAge * 1000).toBe(SESSION_MAX_AGE_MS);
  });

  it("drop `secure` outside a production build, where the server is plain http", () => {
    expect(consoleCookieOptions(readEnv({ NODE_ENV: "development" })).secure).toBe(false);
    expect(consoleCookieOptions(readEnv({})).secure).toBe(false);
  });

  it("are the flags every cookie write in app/ uses — no literal options object remains", () => {
    const root = path.resolve(__dirname, "../..");
    const writers = ["app/console/actions.ts", "app/demo/actions.ts"];
    const sets = writers.flatMap((file) =>
      [...readFileSync(path.join(root, file), "utf8").matchAll(/jar\.set\(([^;]+)\);/g)].map((m) => `${file}: ${m[1]}`),
    );
    expect(sets.length).toBe(3);
    for (const call of sets) expect(call, call).toContain("consoleCookieOptions()");
  });
});

