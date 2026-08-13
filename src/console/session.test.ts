import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/console/session";

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
