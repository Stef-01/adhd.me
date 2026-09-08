// Runs held to PLAY-PLAN.md §8: word budgets, the copy rules, the structure, the mechanics'
// contracts, and the promise that a run writes what a module wrote.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { INTERACTIVE_MODULES, strategyById } from "./interactive";
import {expiryIsHit, INSTRUCTION_WORDS, MAX_TAPS, MECHANICS, MIN_MECHANICS, rampedSeconds, RAMP_FLOOR, RESULT_WORDS, runPhaseAt, runStepCount, runText, words, fasterBefore, FASTER_EVERY , CLUE_WORDS, needsClue, relateFormFor, RELATE_BUTTONS, RELATE_PROMPT } from "./play";
import { RUNS, runFor } from "./runs";
import { cardCount, MODULES } from "./scenes";

describe("the runs", () => {
  it("are the twenty modules, each six to eight rounds, three to five minutes, keeping their module's id", () => {
    expect(RUNS.length).toBe(20);
    expect(new Set(RUNS.map((r) => r.id)).size).toBe(20);
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
        if (["recall", "swipe", "drag-capture", "hold", "catch"].includes(r.mechanic)) expect(r.items?.length, `${run.id}/${r.id}`).toBeGreaterThan(0);
        if (r.mechanic === "balance") expect(r.options?.some((o) => o.correct), `${run.id}/${r.id} needs a steadying move`).toBe(true);
        // The sense gate (PLAY-QA.md): a timing round says what the line is and what the tap does.
        if (r.mechanic === "timing") { expect(r.scale?.length, `${run.id}/${r.id} needs a scale`).toBeGreaterThanOrEqual(3); expect(r.verb, `${run.id}/${r.id} needs a verb`).toBeTruthy(); expect(r.options?.some((o) => o.correct), `${run.id}/${r.id} needs the moment`).toBe(true); }
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
  });

  it("make every right answer inferable: a round with a right answer carries a clue a stranger can read (founder, 2026-09-08)", () => {
    for (const run of eachOf(RUNS, "the runs")) {
      for (const r of run.rounds) {
        if (needsClue(r)) {
          expect(r.clue, `${run.id}/${r.id} has a right answer and no clue`).toBeTruthy();
          expect(words(r.clue!), `${run.id}/${r.id} clue too long`).toBeLessThanOrEqual(CLUE_WORDS);
          expect(lintLandingCopy(r.clue!), `${run.id}/${r.id} clue`).toEqual([]);
        }
      }
    }
  });

  it("ask how much each round was you, buttons and slider alternating, never on a round that already asks about you", () => {
    for (const run of eachOf(RUNS, "the runs")) {
      const forms = run.rounds.map((r, i) => relateFormFor(r, i));
      expect(forms, run.id).toContain("buttons");
      expect(forms, run.id).toContain("slider");
      run.rounds.forEach((r, i) => { if (r.writes) expect(forms[i], `${run.id}/${r.id}`).toBeNull(); });
    }
    expect(RELATE_BUTTONS.map((b) => b.value)).toEqual([0, 5, 10]);
    expect(lintLandingCopy(RELATE_PROMPT)).toEqual([]);
    for (const b of RELATE_BUTTONS) expect(lintLandingCopy(b.label)).toEqual([]);
    expect(expiryIsHit("hold")).toBe(true);
    expect(expiryIsHit("tap")).toBe(false);
  });

  it("ramp the tempo: each round a little faster, never below the floor, and never on a round that asks about you", () => {
    const run = runFor("starting")!;
    expect(rampedSeconds(run, 0)).toBe(run.rounds[0]!.seconds);
    expect(rampedSeconds(run, 1)).toBeLessThan(run.rounds[1]!.seconds);
    for (const r of RUNS) r.rounds.forEach((round, i) => {
      const s = rampedSeconds(r, i);
      expect(s).toBeGreaterThanOrEqual(round.seconds * RAMP_FLOOR - 0.05);
      if (round.writes) expect(s).toBe(round.seconds);
    });
    expect(rampedSeconds(run, 99)).toBe(0);
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

describe("the Faster card", () => {
  it("never shows before the first round, and never before a round that asks about you", () => {
    for (const run of RUNS) {
      expect(fasterBefore(run, 0)).toBe(false);
      run.rounds.forEach((round, i) => { if (round.writes) expect(fasterBefore(run, i)).toBe(false); });
    }
  });
  it("shows before every third round otherwise, and at least once in a run of seven", () => {
    for (const run of RUNS) {
      run.rounds.forEach((round, i) => {
        if (i > 0 && !round.writes) expect(fasterBefore(run, i)).toBe(i % FASTER_EVERY === 0);
      });
      const shown = run.rounds.filter((_, i) => fasterBefore(run, i)).length;
      if (run.rounds.length >= 7 && run.rounds.every((r) => !r.writes)) expect(shown).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("the QA gate on variety (PLAY-QA.md)", () => {
  it("every run uses several mechanics and is never mostly tapping", () => {
    for (const run of RUNS) {
      const games = run.rounds.filter((r) => !r.writes);
      expect(new Set(games.map((r) => r.mechanic)).size, `${run.id} mechanics`).toBeGreaterThanOrEqual(MIN_MECHANICS);
      expect(games.filter((r) => r.mechanic === "tap").length, `${run.id} taps`).toBeLessThanOrEqual(MAX_TAPS);
      expect(games.length, `${run.id} games`).toBeGreaterThanOrEqual(6);
    }
  });
});
