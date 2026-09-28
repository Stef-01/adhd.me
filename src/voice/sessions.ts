// How many voice calls this server instance has started today (UTC), against
// ADHDME_VOICE_DAILY_SESSIONS (default 40). In memory, like the read route's spend meter: the
// OpenAI project's budget is the ring outside it.

export const DEFAULT_DAILY_SESSIONS = 40;
const day = { date: "", count: 0 };

export function dailyCap(env: Record<string, string | undefined>): number {
  const set = Number(env.ADHDME_VOICE_DAILY_SESSIONS);
  return env.ADHDME_VOICE_DAILY_SESSIONS?.trim() && Number.isInteger(set) && set >= 0 ? set : DEFAULT_DAILY_SESSIONS;
}

/** Counts a call if today's cap has room; false when it is spent. */
export function takeVoiceSession(env: Record<string, string | undefined>, now = new Date()): boolean {
  const date = now.toISOString().slice(0, 10);
  if (day.date !== date) Object.assign(day, { date, count: 0 });
  if (day.count >= dailyCap(env)) return false;
  day.count += 1;
  return true;
}

/** Registered in src/lib/stores.ts, so a reset of every store clears it too. */
export function resetVoiceSessions(): void {
  Object.assign(day, { date: "", count: 0 });
}
