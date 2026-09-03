// O239/O244: the Learn tab's modules and quizzes, and the device record of which are finished.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintMessageText } from "@/messaging/templates";
import { lintLandingCopy } from "@/compliance/landing";
import { clearProgress, emptyProgress, markDone, PROGRESS_KEY, readProgress } from "./progress";
import { cardCount, MODULES, SCENES, scenesOf, SHELVES } from "./scenes";

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
  it("the reading modules cover every scene exactly once — nothing argued is left out or said twice", () => {
    const named = MODULES.filter((m) => m.kind === "read").flatMap((m) => m.scenes ?? []);
    expect([...named].sort()).toEqual(SCENES.map((s) => s.n).sort());
    expect(new Set(named).size).toBe(named.length);
  });

  it("resolve every scene they name, and every quiz has questions with a valid answer", () => {
    for (const module of eachOf(MODULES, "the learn modules")) {
      if (module.kind === "read") {
        expect(scenesOf(module).map((s) => s.n)).toEqual([...module.scenes!]);
        expect(cardCount(module)).toBeGreaterThan(0);
      } else {
        const questions = module.questions ?? [];
        expect(questions.length).toBeGreaterThanOrEqual(3);
        for (const q of questions) {
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
          expect(q.explain.length).toBeGreaterThan(20);
        }
      }
    }
  });

  it("the shelves show every module exactly once", () => {
    const shelved = SHELVES.flatMap((s) => s.modules);
    expect([...shelved].sort()).toEqual(MODULES.map((m) => m.id).sort());
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

  it("every word a reader meets passes the patient-surface rules — no diagnosis, no urgency, no claims", () => {
    const text = [
      ...SCENES.flatMap((s) => [s.eyebrow, s.heading, s.body, ...(s.detail ?? []), s.foot ?? ""]),
      ...MODULES.flatMap((m) => [m.title, m.subtitle, ...(m.questions ?? []).flatMap((q) => [q.prompt, ...q.options, q.explain])]),
    ].join("\n");
    expect(text.length).toBeGreaterThan(1000);
    expect(lintMessageText(text).map((v) => `${v.rule}: ${v.match}`)).toEqual([]);
    expect(lintLandingCopy(text).map((v) => `${v.rule}: ${v.match}`)).toEqual([]);
  });

  it("no quiz asks about the reader — every prompt is about ADHD in general", () => {
    for (const module of eachOf(MODULES.filter((m) => m.kind === "quiz"), "the quizzes")) {
      for (const q of module.questions ?? []) {
        expect(q.prompt, q.prompt).not.toMatch(/\b(do you|are you|have you|your)\b/i);
      }
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
    expect(markDone(storage, "myth-or-fact").done).toEqual(["cost", "myth-or-fact"]);
    expect(markDone(storage, "nope").done).toEqual(["cost", "myth-or-fact"]);
    expect(readProgress(storage).done).toEqual(["cost", "myth-or-fact"]);
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
