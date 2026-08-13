// W19: operational safety switches — the controls that halt sending fast.
//   - killSwitch: a global stop (every practice), for an incident;
//   - pausedPracticeIds: a per-practice pause, for one practice's request.
// Pure state + a single `canSend` predicate the send path (sim now, live rail
// later) consults before every send. Halting is always allowed; only sending is
// gated — bookings already made are never affected.

export interface OpsSwitches {
  killSwitch: boolean;
  pausedPracticeIds: string[];
}

export const ALL_CLEAR: OpsSwitches = { killSwitch: false, pausedPracticeIds: [] };

/** May the loop send an invitation for this practice right now? */
export function canSend(switches: OpsSwitches, practiceId: string): boolean {
  return !switches.killSwitch && !switches.pausedPracticeIds.includes(practiceId);
}

export function setKillSwitch(switches: OpsSwitches, on: boolean): OpsSwitches {
  return { ...switches, killSwitch: on };
}

export function setPracticePaused(
  switches: OpsSwitches,
  practiceId: string,
  paused: boolean,
): OpsSwitches {
  const without = switches.pausedPracticeIds.filter((id) => id !== practiceId);
  return { ...switches, pausedPracticeIds: paused ? [...without, practiceId] : without };
}

export function isPracticePaused(switches: OpsSwitches, practiceId: string): boolean {
  return switches.pausedPracticeIds.includes(practiceId);
}
