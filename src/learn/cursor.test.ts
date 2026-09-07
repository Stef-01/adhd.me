import { describe, expect, it } from "vitest";
import { CURSOR_KEY, readCursor, writeCursor } from "./cursor";
import { markDone, PROGRESS_KEY, readProgress } from "./progress";

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
});
