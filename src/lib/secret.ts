// Signing-secret resolver shared by booking tokens and console sessions.
// Fails CLOSED in production: a missing CAREYIELD_TOKEN_SECRET throws at first use
// rather than silently signing with the committed synthetic-phase fallback.

const DEV_FALLBACK = "careyield-synthetic-dev-secret";

export function signingSecret(): string {
  const secret = process.env.CAREYIELD_TOKEN_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CAREYIELD_TOKEN_SECRET must be set in production");
  }
  return DEV_FALLBACK;
}
