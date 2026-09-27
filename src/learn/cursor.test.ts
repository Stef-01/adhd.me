import { describe, expect, it } from "vitest";
import { CURSOR_KEY, openingStep, readCursor, resumable, writeCursor } from "./cursor";
import { markDone, PROGRESS_KEY, readProgress } from "./progress";
import { cardCount, MODULES } from "./scenes";

function storage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}
describe("learning resume", () => {
  it("preserves v1 completion while recording the current reading step separately", () => {
    const device = storage();
    markDone(device, "adhd");
    const completion = device.getItem(PROGRESS_KEY);
    writeCursor(device, "everyday", 2);
    expect(readCursor(device)).toEqual({ v: 1, moduleId: "everyday", step: 2 });
    expect(device.getItem(PROGRESS_KEY)).toBe(completion);
    expect(readProgress(device).done).toEqual(["adhd"]);
  });
  it("restarts quizzes without storing answers or a score", () => {
    const device = storage();
    writeCursor(device, "myth-or-fact", 3);
    expect(JSON.parse(device.getItem(CURSOR_KEY)!)).toEqual({ v: 1, moduleId: "myth-or-fact", step: 0 });
  });
  it.each([null, "broken", '{"v":2,"moduleId":"adhd","step":0}', '{"v":1,"moduleId":"missing","step":0}', '{"v":1,"moduleId":"adhd","step":99}', '{"v":1,"moduleId":"adhd","step":-1}'])("rejects unusable stored progress: %s", raw => {
    expect(readCursor({ getItem: () => raw })).toBeNull();
  });
  it("still works when device storage is unavailable", () => {
    const denied = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(readCursor(denied)).toBeNull();
    expect(() => writeCursor(denied, "adhd", 1)).not.toThrow();
  });
  it("offers Continue only for a module not yet finished", () => {
    const cursor = { v: 1, moduleId: "mornings", step: 3 } as const;
    expect(resumable(cursor, [])).toEqual(cursor);
    expect(resumable(cursor, ["adhd"])).toEqual(cursor);
    expect(resumable(cursor, ["mornings"])).toBeNull();
    expect(resumable(null, [])).toBeNull();
  });
  it("reopens a finished run on its last card on Back, and at its title from anywhere else", () => {
    const last = cardCount(MODULES.find((m) => m.id === "mornings")!) - 1;
    const left = { v: 1, moduleId: "mornings", step: last } as const;
    expect(openingStep("mornings", left, ["mornings"], true)).toBe(last);
    expect(openingStep("mornings", left, ["mornings"], false)).toBe(0);
    // Not finished, or not on the last card: the cursor is where the person is, however they arrive.
    expect(openingStep("mornings", left, [], false)).toBe(last);
    expect(openingStep("mornings", { v: 1, moduleId: "mornings", step: 2 }, ["mornings"], false)).toBe(2);
    // A cursor on another module, or none, opens at the start.
    expect(openingStep("starting", left, [], true)).toBe(0);
    expect(openingStep("mornings", null, [], true)).toBe(0);
  });
});
