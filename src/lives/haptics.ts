// §93 haptics: a short buzz on a hit, a miss and the end of a run. Off by default, and never when
// the setting is off or the device has no vibrate. Pure: the renderer hands in the navigator so
// the rule is testable without a browser.

export type HapticMoment = "hit" | "miss" | "end";

/** Milliseconds on (and off) per moment. Short, so the pattern is felt and over before the next beat. */
export const HAPTIC_PATTERNS: Readonly<Record<HapticMoment, readonly number[]>> = {
  hit: [20],
  miss: [60],
  end: [30, 50, 30, 50, 60],
};

export interface Vibrator { vibrate?: (pattern: number | number[]) => boolean }

/** Buzz for `moment` when `enabled` and the device can. Returns whether a buzz was asked for. */
export function haptic(moment: HapticMoment, enabled: boolean, device: Vibrator | undefined = typeof navigator === "undefined" ? undefined : navigator): boolean {
  if (!enabled || !device || typeof device.vibrate !== "function") return false;
  try { return Boolean(device.vibrate([...HAPTIC_PATTERNS[moment]])); } catch { return false; }
}
