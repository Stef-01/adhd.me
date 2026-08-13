// W7: tokenised booking deep links. An invitation's SMS carries /book/<token>;
// the token is an HMAC-signed invitation id, so links can't be guessed or altered.
// Synthetic phase only — secret defaults for dev; production supplies CAREYIELD_TOKEN_SECRET.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { InvitationId } from "@/domain/types";
import { signingSecret } from "@/lib/secret";

function sig(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function signBookingToken(invitationId: InvitationId): string {
  const payload = Buffer.from(invitationId, "utf8").toString("base64url");
  return `${payload}.${sig(payload)}`;
}

/** Returns the invitation id for a well-formed, correctly signed token; null otherwise. */
export function verifyBookingToken(token: string): InvitationId | null {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const payload = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = sig(payload);
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8") as InvitationId;
  } catch {
    return null;
  }
}
