import { describe, expect, it } from "vitest";
import { signBookingToken, verifyBookingToken } from "@/booking/token";
import type { InvitationId } from "@/domain/types";

const INV = "inv-2026-09-01-clin-demo-0" as InvitationId;

describe("booking token", () => {
  it("round-trips an invitation id", () => {
    expect(verifyBookingToken(signBookingToken(INV))).toBe(INV);
  });

  it("rejects a tampered payload", () => {
    const [, sig] = signBookingToken(INV).split(".");
    const forged = `${Buffer.from("inv-other", "utf8").toString("base64url")}.${sig}`;
    expect(verifyBookingToken(forged)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = signBookingToken(INV);
    expect(verifyBookingToken(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", ".", "abc", "abc.", ".abc", "not a token at all"]) {
      expect(verifyBookingToken(bad)).toBeNull();
    }
  });

  it("produces URL-safe tokens", () => {
    expect(signBookingToken(INV)).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });
});
