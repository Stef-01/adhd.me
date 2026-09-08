// The interactive modules held to the PRD's definition of done for a module (§94) and to the
// patient copy rules — every module, every stage, every string.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { SUBDOMAINS } from "@/model/layers";
import { PROFESSIONS } from "@/support/professions";
import { CHARACTER_BIOS, INTERACTIVE_MODULES, moduleText, RESONANCE_HEADING, strategyById } from "./interactive";
import { cardCount, MODULES, SHELVES } from "./scenes";

const known = new Set(SUBDOMAINS.map((s) => s.id));

describe("the fifteen modules", () => {
  it("are fifteen, each seven to twelve minutes, each in the shelves and the module list exactly once", () => {
    expect(INTERACTIVE_MODULES.length).toBe(15);
    const ids = INTERACTIVE_MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const shelved = SHELVES.flatMap((s) => s.modules);
    for (const id of ids) {
      expect(shelved.filter((s) => s === id).length, id).toBe(1);
      expect(["interactive", "run"]).toContain(MODULES.find((m) => m.id === id)?.kind);
    }
    for (const m of INTERACTIVE_MODULES) {
      expect(m.minutes).toBeGreaterThanOrEqual(6);
      expect(m.minutes).toBeLessThanOrEqual(12);
    }
  });

  it("every module carries every mandatory stage in order: hook, experience, resonance, explanation, personalisation, strategy, insight, one next action", () => {
    for (const m of eachOf(INTERACTIVE_MODULES, "the interactive modules")) {
      const kinds = m.steps.map((s) => s.kind);
      expect(kinds[0], m.id).toBe("scene");
      expect(m.steps[0]?.kind === "scene" && m.steps[0].stage).toBe("hook");
      expect(kinds.filter((k) => k === "resonance").length, m.id).toBe(1);
      expect(kinds, m.id).toContain("explain");
      expect(kinds, m.id).toContain("personalise");
      expect(kinds, m.id).toContain("strategy");
      expect(kinds, m.id).toContain("insight");
      expect(kinds.filter((k) => k === "next").length, m.id).toBe(1);
      expect(kinds.at(-1), m.id).toBe("next");
      expect(kinds.indexOf("resonance")).toBeLessThan(kinds.indexOf("explain"));
      expect(kinds.indexOf("explain")).toBeLessThan(kinds.indexOf("strategy"));
      const listed = MODULES.find((x) => x.id === m.id)!;
      if (listed.kind === "interactive") expect(cardCount(listed)).toBe(m.steps.length);
    }
  });

  it("names only real subdomains, characters and professions, and two to four personalisation questions", () => {
    for (const m of eachOf(INTERACTIVE_MODULES, "the interactive modules")) {
      expect(m.targets.length).toBeGreaterThan(0);
      for (const t of m.targets) expect(known.has(t), `${m.id} ${t}`).toBe(true);
      for (const c of m.characters) expect(CHARACTER_BIOS[c]).toBeTruthy();
      for (const p of m.professions) expect(PROFESSIONS).toContain(p);
      for (const step of m.steps) {
        if (step.kind === "personalise") {
          expect(step.questions.length).toBeGreaterThanOrEqual(2);
          expect(step.questions.length).toBeLessThanOrEqual(4);
        }
        if (step.kind === "strategy") {
          expect(step.strategies.length).toBeGreaterThanOrEqual(1);
          expect(step.strategies.length).toBeLessThanOrEqual(2);
          for (const s of step.strategies) expect(s.steps.length).toBeGreaterThanOrEqual(2);
        }
        if (step.kind === "insight") expect(step.id.startsWith(m.id.split("-")[0]!)).toBe(true);
        if (step.kind === "next" && step.moduleId) expect(INTERACTIVE_MODULES.some((x) => x.id === step.moduleId)).toBe(true);
        if (step.kind === "insight" && step.byAnswer) {
          const q = m.steps.find((s) => s.kind === "personalise" && s.questions.some((x) => x.id === step.byAnswer!.question));
          expect(q, `${m.id} insight refers to ${step.byAnswer.question}`).toBeTruthy();
        }
      }
    }
  });

  it("every screen stays near the sixty-word ceiling, and every string passes the patient rules", () => {
    for (const m of eachOf(INTERACTIVE_MODULES, "the interactive modules")) {
      for (const text of moduleText(m)) {
        expect(text.split(/\s+/).length, `${m.id}: ${text.slice(0, 40)}`).toBeLessThanOrEqual(70);
        expect(lintLandingCopy(text), `${m.id}: ${text}`).toEqual([]);
      }
    }
    expect(lintLandingCopy(RESONANCE_HEADING)).toEqual([]);
  });

  it("strategy ids are unique across modules and resolvable", () => {
    const ids = INTERACTIVE_MODULES.flatMap((m) => m.steps.flatMap((s) => (s.kind === "strategy" ? s.strategies.map((x) => x.id) : [])));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(strategyById(id)?.strategy.id).toBe(id);
    expect(strategyById("nope")).toBeUndefined();
  });

  it("the relationship modules switch perspective and three modules simulate", () => {
    const perspective = INTERACTIVE_MODULES.filter((m) => m.steps.some((s) => s.kind === "perspective"));
    expect(perspective.map((m) => m.domain)).toEqual(["relationships", "relationships", "relationships"]);
    const sims = INTERACTIVE_MODULES.flatMap((m) => m.steps.filter((s) => s.kind === "simulation").map((s) => (s.kind === "simulation" ? s.sim : "")));
    expect(sims.sort()).toEqual(["ambiguity", "interruption", "working-memory"]);
  });
});
