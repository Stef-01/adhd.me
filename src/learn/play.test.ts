// Runs held to PLAY-PLAN.md §8: word budgets, the copy rules, the structure, the mechanics'
// contracts, and the promise that a run writes what a module wrote.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { INTERACTIVE_MODULES, strategyById } from "./interactive";
import { expiryIsHit, INSTRUCTION_WORDS, MECHANICS, RESULT_WORDS, runPhaseAt, runStepCount, runText, words } from "./play";
import { RUNS, runFor } from "./runs";
import { cardCount, MODULES } from "./scenes";

describe("the runs", () => {
  it("are the fifteen modules, each six to eight rounds, three to five minutes, keeping their module's id", () => {
    expect(RUNS.length).toBe(15);
    expect(new Set(RUNS.map((r) => r.id)).size).toBe(15);
    for (const m of INTERACTIVE_MODULES) expect(RUNS.some((r) => r.id === m.id), m.id).toBe(true);
    for (const run of eachOf(RUNS, "the runs")) {
      expect(run.rounds.length).toBeGreaterThanOrEqual(6);
      expect(run.rounds.length).toBeLessThanOrEqual(8);
      expect(run.minutes).toBeGreaterThanOrEqual(3);
      expect(run.minutes).toBeLessThanOrEqual(5);
      expect(INTERACTIVE_MODULES.some((m) => m.id === run.id), run.id).toBe(true);
      expect(new Set(run.rounds.map((r) => r.id)).size).toBe(run.rounds.length);
      expect(strategyById(run.strategy.id)?.module.id).toBe(run.id);
      expect(MODULES.find((m) => m.id === run.id)?.kind).toBe("run");
      expect(cardCount(MODULES.find((m) => m.id === run.id)!)).toBe(runStepCount(run));
    }
  });

  it("keep every instruction to fourteen words and every result line to sixteen, and pass the patient rules", () => {
    for (const run of eachOf(RUNS, "the runs")) {
      expect(words(run.tagline)).toBeLessThanOrEqual(10);
      for (const r of run.rounds) {
        expect(words(r.instruction), `${run.id}/${r.id}: ${r.instruction}`).toBeLessThanOrEqual(INSTRUCTION_WORDS);
        expect(words(r.hit), `${run.id}/${r.id} hit`).toBeLessThanOrEqual(RESULT_WORDS);
        expect(words(r.miss), `${run.id}/${r.id} miss`).toBeLessThanOrEqual(RESULT_WORDS);
        expect(r.seconds).toBeGreaterThanOrEqual(4);
        expect(r.seconds).toBeLessThanOrEqual(12);
      }
      for (const text of runText(run)) expect(lintLandingCopy(text), `${run.id}: ${text}`).toEqual([]);
    }
  });

  it("use only catalogued mechanics, with the options each needs, and a written answer the model already reads", () => {
    for (const run of eachOf(RUNS, "the runs")) {
      for (const r of run.rounds) {
        expect(MECHANICS).toContain(r.mechanic);
        if (["tap", "order", "sort", "flip", "pick-bean", "dont-tap"].includes(r.mechanic)) expect(r.options?.length, `${run.id}/${r.id}`).toBeGreaterThan(0);
        if (["recall", "swipe", "drag-capture", "hold"].includes(r.mechanic)) expect(r.items?.length, `${run.id}/${r.id}`).toBeGreaterThan(0);
        if (r.mechanic === "tap") expect(r.options!.some((o) => o.correct), `${run.id}/${r.id} needs a right answer`).toBe(true);
        if (r.mechanic === "sort") expect(r.options!.every((o) => o.layer), `${run.id}/${r.id}`).toBe(true);
        if (r.writes) {
          // The answer ids must be ones the module's personalisation step already asks, so needs.ts reads them.
          const module = INTERACTIVE_MODULES.find((m) => m.id === run.id)!;
          const q = module.steps.flatMap((s) => (s.kind === "personalise" ? s.questions : [])).find((x) => x.id === r.writes!.question);
          expect(q, `${run.id}/${r.id} writes ${r.writes.question}`).toBeTruthy();
          for (const o of r.options ?? []) expect(q!.options.some((x) => x.id === o.id), `${run.id}/${r.id} option ${o.id}`).toBe(true);
        }
      }
    }
    expect(expiryIsHit("dont-tap")).toBe(true);
    expect(expiryIsHit("hold")).toBe(true);
    expect(expiryIsHit("tap")).toBe(false);
  });

  it("walk title, rounds, recognition, insight, (reflect), try, next", () => {
    const withReflect = runFor("perfectionism")!;
    expect(runPhaseAt(withReflect, withReflect.rounds.length + 3).phase).toBe("reflect");
    expect(runPhaseAt(withReflect, withReflect.rounds.length + 4).phase).toBe("try");
    expect(runStepCount(withReflect)).toBe(withReflect.rounds.length + 6);
    // Reflection — and with it the safety pathway — survives the conversion on at least the two modules that carried it.
    expect(RUNS.filter((r) => r.reflect).map((r) => r.id).sort()).toEqual(["conflict", "perfectionism"]);
    const run = runFor("starting")!;
    expect(runPhaseAt(run, 0).phase).toBe("title");
    expect(runPhaseAt(run, 1)).toMatchObject({ phase: "round", index: 0 });
    expect(runPhaseAt(run, run.rounds.length).phase).toBe("round");
    expect(runPhaseAt(run, run.rounds.length + 1).phase).toBe("recognition");
    expect(runPhaseAt(run, run.rounds.length + 2).phase).toBe("insight");
    expect(runPhaseAt(run, run.rounds.length + 3).phase).toBe("try");
    expect(runPhaseAt(run, run.rounds.length + 4).phase).toBe("next");
    expect(runPhaseAt(run, 99).phase).toBe("next");
  });
});
