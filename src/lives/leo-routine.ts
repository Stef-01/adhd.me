// What Leo does after the swatting stops (founder, 2026-09-11).
//
// THE GAME WAS THE WRONG LESSON ON ITS OWN. Leo's round asks somebody to catch every mosquito, and
// then — caught or not — the screen offered "Play again" and a link to a module. So the only thing
// the game taught was that the answer to a sound you cannot stand is to hit it faster, which is
// the opposite of the strategy it is attached to. `lower_sensory_floor` (src/lives/strategies.ts,
// and the module of the same name) says the move is not to remove the noise, which nobody can do,
// but to change the room it lands in.
//
// So the round now ENDS INTO the routine rather than into a menu, in the same bedroom, drawn the
// same way: three things Leo does, each one a tap that changes the room, and then he is asleep with
// the mosquito still out there. That last part is the lesson and it is stated rather than implied.
//
// EACH STEP IS IN THE MODULE ALREADY. Quiet audio and a lowered sensory floor are its checklist;
// the window and the light are the wind-down. Nothing here is a new claim about what helps — this
// is Leo's night, not advice to the reader, and the module beside it is where the hedge lives
// ("may make individual noises less salient for some people; try it once and keep it only if it
// helps"). The link to it is still at the end.

export const LEO_ROUTINE = [
  { id: "window", label: "Close the window", line: "Nothing else gets in." },
  { id: "headphones", label: "Headphones on", line: "Something quiet, read out loud." },
  { id: "light", label: "Light off", line: "The room says it is night." },
] as const;

export type LeoRoutineStep = (typeof LEO_ROUTINE)[number];
export type LeoRoutineId = LeoRoutineStep["id"];

/** The point of the whole thing, and the reason the round's outcome does not change it. */
export const LEO_SETTLED = "The mosquito is still out there. Leo is asleep.";

/** What the room looks like after the first `done` steps. The scene reads this; it owns no state. */
export function leoRoom(done: number): Readonly<Record<LeoRoutineId, boolean>> {
  const taken = LEO_ROUTINE.slice(0, Math.max(0, Math.min(done, LEO_ROUTINE.length)));
  return {
    window: taken.some((s) => s.id === "window"),
    headphones: taken.some((s) => s.id === "headphones"),
    light: taken.some((s) => s.id === "light"),
  };
}
