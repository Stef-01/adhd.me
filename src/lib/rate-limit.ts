// W37: minimal fixed-window rate limiter for the unauthenticated entry points
// (sign-in, booking confirm). In-memory is honest for the single-process synthetic
// phase; a real deployment adds infrastructure-level limits in front (dossier item).

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

interface WindowState {
  windowStart: number;
  count: number;
}

const globalStore = globalThis as { __careyieldRateLimit?: Map<string, WindowState> };

function store(): Map<string, WindowState> {
  globalStore.__careyieldRateLimit ??= new Map();
  return globalStore.__careyieldRateLimit;
}

/** True when the call is allowed; false when the (bucket, key) pair is over its limit. */
export function rateLimit(
  bucket: string,
  key: string,
  rule: RateLimitRule,
  nowMs: number = Date.now(),
): boolean {
  const mapKey = `${bucket}|${key}`;
  const state = store().get(mapKey);
  if (!state || nowMs - state.windowStart >= rule.windowMs) {
    store().set(mapKey, { windowStart: nowMs, count: 1 });
    return true;
  }
  state.count += 1;
  return state.count <= rule.limit;
}

export function resetRateLimits(): void {
  store().clear();
}
