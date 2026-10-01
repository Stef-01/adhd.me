// The recommendation engine, fuzzed (2026-10-01): records built the way the app builds them, from
// random onboarding, resonance and experiments, and held to what the PRD says must always hold.
import { describe, expect, it } from "vitest";
import { INTERACTIVE_MODULES } from "@/learn/interactive";
import { recommend } from "./recommend";
import { deriveNeeds } from "./needs";
import { completeOnboarding, readModel, recordResonance, saveOnboarding, writeModel, emptyModel, type ModelRecord } from "./store";
import { improveOptions } from "./onboarding";

function storage() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; }
function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648); }

describe("the recommendation engine, fuzzed", () => {
  it("never throws, is deterministic, escalates only past the PRD's bar, and always says why, over 3,000 records", () => {
    const random = rng(11);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)]!;
    const some = <T,>(xs: readonly T[]) => xs.filter(() => random() < 0.3);
    const actions = new Map<string, number>();
    const now = new Date("2026-10-01T09:00:00Z");
    for (let n = 0; n < 3000; n++) {
      const s = storage();
      writeModel(s, emptyModel());
      if (random() < 0.85) {
        const answers = {
          stage: pick(["have-assessment", "being-assessed", "think-so", "supporting", "learning"] as const),
          familiar: pick(["cannot-start", "forget", "rely-on-deadlines", "distracted", "overwhelmed", "motivation", "none"] as const),
          affects: pick(["work", "study", "home", "relationships", "health", "wellbeing", "several"] as const),
          impact: Math.floor(random() * 11),
          easier: some(["urgent", "interested", "structure", "alongside", "slept", "exercise", "clear", "not-really", "not-sure"] as const),
          lookingFor: pick(["understand", "try", "professional", "unsure"] as const),
          depth: pick(["short", "medium", "deep"] as const),
        };
        saveOnboarding(s, answers);
        const options = improveOptions(answers);
        if (options.length && random() < 0.8) saveOnboarding(s, { improveFirst: pick(options).id });
        if (random() < 0.7) completeOnboarding(s);
      }
      for (const module of some(INTERACTIVE_MODULES.slice(0, 8))) {
        recordResonance(s, module.id, { frequency: pick(["rarely", "sometimes", "often"] as never[]), cost: Math.floor(random() * 11), priority: pick(["yes", "no", "not-now"] as never[]) } as never);
      }
      const record: ModelRecord = readModel(s);
      const rec = recommend(record, now);
      expect(recommend(record, now)).toEqual(rec);
      expect(rec.why.length, rec.action).toBeGreaterThan(10);
      expect(rec.heading.split(/\s+/).length, rec.heading).toBeLessThanOrEqual(12);
      actions.set(rec.action, (actions.get(rec.action) ?? 0) + 1);
      const need = deriveNeeds(record)[0];
      if (rec.action === "EXPLORE_PROVIDER") {
        expect(need, "a professional recommendation always rests on a need").toBeDefined();
        expect(need!.functionalCost, `escalated at cost ${need!.functionalCost}`).toBeGreaterThanOrEqual(7);
        // The reason given is the reason that fired: "0 strategies did not help" is never said.
        expect(rec.why, rec.why).not.toMatch(/\b0 strategies/);
        if (!/strategies did not help/.test(rec.why)) expect(rec.body, rec.body).not.toMatch(/after what you have tried/);
      }
    }
    console.log("ACTIONS", JSON.stringify(Object.fromEntries(actions)));
  });
});
