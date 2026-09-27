// A key that is wrong, revoked or out of credit fails every call. After one such failure the model
// reads pause for ten minutes (in memory, per server instance) and the finder reads with the lexicon,
// instead of spending a person's wait on calls that cannot succeed.

export const PAUSE_MS = 10 * 60_000;
const KEY_FAILURE = /^HttpError: (401|403)\b|insufficient_quota/;
const state = { until: 0 };

export const keyPaused = (now = Date.now()) => now < state.until;

export function noteKeyFailure(error: string | undefined, now = Date.now()): void {
  if (error && KEY_FAILURE.test(error)) state.until = now + PAUSE_MS;
}

/** Tests only. */
export function resetKeyPause(): void {
  state.until = 0;
}
