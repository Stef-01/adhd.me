// Signing-secret resolver shared by booking tokens and console sessions.
// Fails CLOSED in production: a missing ADHDME_TOKEN_SECRET throws at first use
// rather than silently signing with the committed synthetic-phase fallback.

// U2: read through `env.ts`, the one reader of the posture keys; `instrumentation.ts` refuses a
// production boot without the secret before any request can reach this fallback.

import { readEnv } from "./env";

const DEV_FALLBACK = "adhd-me-synthetic-dev-secret";

export function signingSecret(): string {
  const env = readEnv();
  if (env.tokenSecret) return env.tokenSecret;
  if (env.production) {
    throw new Error("ADHDME_TOKEN_SECRET must be set in production");
  }
  return DEV_FALLBACK;
}
