export const SHARED_INTERVAL_MS = 15 * 60_000;
export const SHARED_DURATION_MS = 5 * 60_000;

/** A deterministic UTC schedule shared by every deployment; no participant data is collected. */
export function sharedMeditation(now: number) {
  const startsAt = Math.floor(now / SHARED_INTERVAL_MS) * SHARED_INTERVAL_MS;
  const endsAt = startsAt + SHARED_DURATION_MS;
  return { serverNow: now, startsAt, endsAt, nextStartsAt: startsAt + SHARED_INTERVAL_MS, live: now < endsAt };
}

export const STILLNESS_GUIDE = [
  { at: 0, title: "Arrive as you are.", text: "Find a position that feels comfortable. Your eyes can stay open. There is nothing to get right." },
  { at: .16, title: "Notice the room.", text: "Let your attention settle on a sound nearby, or the place where your body meets the chair." },
  { at: .34, title: "Let breathing be ordinary.", text: "There is no need to change your breath or match the circle. It is simply a gentle visual to return to." },
  { at: .54, title: "A thought can pass through.", text: "If your attention wanders, notice that too. You can return to a sound, a breath, or the circle whenever you like." },
  { at: .76, title: "A little space to stay.", text: "Spend the next few moments just here. You can move, stretch, or stop whenever you want." },
  { at: .93, title: "Take your time coming back.", text: "Notice the room again. Let the next thing you do begin at your own pace." },
] as const;

export function meditationGuide(progress: number) {
  return [...STILLNESS_GUIDE].reverse().find(item => progress >= item.at) ?? STILLNESS_GUIDE[0];
}

export function remainingTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
