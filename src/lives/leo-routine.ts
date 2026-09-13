export const LEO_ROUTINE = [
  { id: "window", label: "Close the window", line: "Nothing else gets in." },
  { id: "phone", label: "Phone off", line: "No more scrolling tonight." },
  { id: "headphones", label: "Headphones on", line: "Leo chooses quiet brown noise." },
  { id: "book", label: "Read a little", line: "A few pages to wind down." },
  { id: "light", label: "Light off", line: "The room says it is night." },
] as const;

export type LeoRoutineStep = (typeof LEO_ROUTINE)[number];
export type LeoRoutineId = LeoRoutineStep["id"];
export const LEO_SETTLED = "The mosquito is still out there. Leo is asleep.";

export function leoRoom(done: number): Readonly<Record<LeoRoutineId, boolean>> {
  return Object.fromEntries(LEO_ROUTINE.map((step, index) => [step.id, index < Math.max(0, Math.floor(done))])) as Record<LeoRoutineId, boolean>;
}
