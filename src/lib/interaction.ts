// What the person has done since the page loaded (PLAN.md N12). A heading that takes focus after
// a press was asked for; one that takes it on arrival draws a ring nobody asked for. The listeners
// go in when this module first runs, so app/page-arrival.tsx, which every app route renders,
// imports it: a module opened from another screen by keyboard still finds the press counted.

let interacted = false;
/**
 * The address the browser's Back or Forward last arrived at, until a press or a key starts
 * something else. A finished run reopens on its last card only then (openingStep).
 */
let returnedTo: string | null = null;
if (typeof window !== "undefined") {
  const mark = () => { interacted = true; };
  window.addEventListener("pointerdown", mark, { capture: true, once: true });
  window.addEventListener("keydown", mark, { capture: true, once: true });
  const forget = () => { returnedTo = null; };
  window.addEventListener("pointerdown", forget, { capture: true });
  window.addEventListener("keydown", forget, { capture: true });
  window.addEventListener("popstate", () => { returnedTo = window.location.href; });
}

export const hasInteracted = (): boolean => interacted;

/** Whether the browser's Back or Forward brought the person to this address. */
export const returnedByHistory = (): boolean => typeof window !== "undefined" && returnedTo === window.location.href;
