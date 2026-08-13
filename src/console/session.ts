// W11: console session tokens — an HMAC-signed staff identity carried in a cookie.
// Auth provider abstraction: the mock provider signs anyone in by email (synthetic
// phase — founder gate blocks production credentials). Supabase auth replaces the
// provider behind CAREYIELD_AUTH_PROVIDER without touching session handling.
// W37: sessions carry an issued-at and expire — a captured cookie value is not a
// forever-credential. Legacy (pre-W37) cookie values fail closed: re-sign-in.

import { createHmac, timingSafeEqual } from "node:crypto";
import { signingSecret } from "@/lib/secret";

export const SESSION_COOKIE = "cy_session";

/** Sessions expire after 7 days; small forward skew tolerated for clock drift. */
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FORWARD_SKEW_MS = 60_000;

function sig(payload: string): string {
  // Domain-separated from booking tokens: distinct HMAC key prevents a booking
  // token from ever validating as a session cookie or vice versa.
  return createHmac("sha256", `session:${signingSecret()}`).update(payload).digest("base64url");
}

export function signSession(email: string, nowMs: number = Date.now()): string {
  const payload = Buffer.from(`${email}|${nowMs}`, "utf8").toString("base64url");
  return `${payload}.${sig(payload)}`;
}

/** Returns the signed-in email for a valid, unexpired session value; null otherwise. */
export function verifySession(value: string | undefined, nowMs: number = Date.now()): string | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot <= 0 || dot === value.length - 1) return null;
  const payload = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1), "utf8");
  const expected = Buffer.from(sig(payload), "utf8");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const sep = decoded.lastIndexOf("|");
  if (sep <= 0) return null; // legacy or malformed payload — fail closed
  const email = decoded.slice(0, sep);
  const issuedAtMs = Number(decoded.slice(sep + 1));
  if (!Number.isFinite(issuedAtMs)) return null;
  if (issuedAtMs > nowMs + FORWARD_SKEW_MS) return null; // future-dated — refuse
  if (nowMs - issuedAtMs > SESSION_MAX_AGE_MS) return null; // expired
  return email.includes("@") ? email : null;
}
