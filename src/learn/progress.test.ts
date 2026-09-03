// O239: the Learn tab's modules and the device record of which are finished.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { clearProgress, emptyProgress, markDone, PROGRESS_KEY, readProgress } from "./progress";
import { MODULES, SCENES, scenesOf } from "./scenes";

function fakeStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

describe("the modules", () => {
  it("cover every scene exactly once, in order — nothing the story argued is left out or said twice", () => {
    const named = MODULES.flatMap((m) => m.scenes);
    expect(named).toEqual(SCENES.map((s) => s.n));
  });

  it("resolve every scene they name", () => {
    for (const module of eachOf(MODULES, "the learn modules")) {
      expect(scenesOf(module).map((s) => s.n)).toEqual([...module.scenes]);
    }
  });

  it("keep the two headings the suite pins", () => {
    expect(SCENES.some((s) => /NSW and QLD/i.test(s.heading))).toBe(true);
    expect(SCENES.some((s) => /How it works/i.test(s.heading))).toBe(true);
  });

  it("state a reading time a person can plan for", () => {
    for (const module of eachOf(MODULES, "the learn modules")) {
      expect(module.minutes).toBeGreaterThan(0);
      expect(module.minutes).toBeLessThanOrEqual(5);
    }
  });
});

describe("the device record", () => {
  it("reads empty when nothing is held, and never throws on a storage that does", () => {
    expect(readProgress(fakeStorage())).toEqual(emptyProgress());
    expect(readProgress({ getItem: () => { throw new Error("private mode"); } })).toEqual(emptyProgress());
  });

  it("marks a module done once, in order, and only for modules that exist", () => {
    const storage = fakeStorage();
    expect(markDone(storage, "cost").done).toEqual(["cost"]);
    expect(markDone(storage, "cost").done).toEqual(["cost"]);
    expect(markDone(storage, "finding").done).toEqual(["cost", "finding"]);
    expect(markDone(storage, "nope").done).toEqual(["cost", "finding"]);
    expect(readProgress(storage).done).toEqual(["cost", "finding"]);
  });

  it.each([
    ["another version", JSON.stringify({ v: 9, done: ["cost"] })],
    ["not JSON", "{nope"],
    ["a done list that is not a list", JSON.stringify({ v: 1, done: "cost" })],
  ])("refuses %s rather than misreading it", (_label, raw) => {
    expect(readProgress(fakeStorage({ [PROGRESS_KEY]: raw }))).toEqual(emptyProgress());
  });

  it("drops a ghost tick for a module that no longer exists", () => {
    const held = readProgress(fakeStorage({ [PROGRESS_KEY]: JSON.stringify({ v: 1, done: ["cost", "retired-module"] }) }));
    expect(held.done).toEqual(["cost"]);
  });

  it("clears", () => {
    const storage = fakeStorage({ [PROGRESS_KEY]: JSON.stringify({ v: 1, done: ["cost"] }) });
    clearProgress(storage);
    expect(storage.store.size).toBe(0);
  });
});
