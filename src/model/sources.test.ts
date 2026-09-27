import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { sourceLine } from "./sources";
import { answerAgain, completeOnboarding, emptyModel, onboardingArrival, readModel, saveOnboarding, writeModel } from "./store";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}

describe("where an axis came from", () => {
  it("names each kind of source and counts it in words", () => {
    expect(sourceLine(["onboarding", "starting"])).toBe("From your first answers and one game.");
    expect(sourceLine(["starting", "ambiguity", "survey:work", "lives:character:nina"])).toBe("From a check-in, two games and a character.");
    expect(sourceLine(["goal:sleep"])).toBe("From a goal you chose.");
    expect(sourceLine([])).toBeNull();
    expect(sourceLine(["onboarding", "starting"], true)).toBe("From your first answers.");
  });

  it("never carries a digit, and reads as the patient rules allow", () => {
    const line = sourceLine(["onboarding", "a", "b", "c", "survey:x", "survey:y", "lives:game:g", "goal:q", "goal:r"])!;
    expect(line).not.toMatch(/\d/);
    expect(lintLandingCopy(line)).toEqual([]);
  });
});

describe("answer again", () => {
  it("keeps the old answers on the map until the new set is finished, then swaps them in", () => {
    const s = memory();
    writeModel(s, { ...emptyModel(), onboarding: { improveFirst: "start-earlier", impact: 8, completedAt: "2026-08-01T00:00:00.000Z" } });
    answerAgain(s);
    saveOnboarding(s, { impact: 3 });
    // Part way: the map still reads the old answers.
    expect(readModel(s).onboarding).toMatchObject({ impact: 8, completedAt: "2026-08-01T00:00:00.000Z" });
    expect(readModel(s).onboardingDraft).toMatchObject({ impact: 3, improveFirst: "start-earlier" });
    completeOnboarding(s);
    const after = readModel(s);
    expect(after.onboarding?.impact).toBe(3);
    expect(after.onboarding?.completedAt).not.toBe("2026-08-01T00:00:00.000Z");
    expect(after.onboardingDraft).toBeUndefined();
  });

  it("a reload part way resumes the questions on the draft, and the map keeps the old answers", () => {
    const s = memory();
    writeModel(s, { ...emptyModel(), onboarding: { improveFirst: "start-earlier", impact: 8, completedAt: "2026-08-01T00:00:00.000Z" } });
    expect(onboardingArrival(readModel(s), false)).toBe("end");
    expect(onboardingArrival(readModel(s), true)).toBe("again");
    answerAgain(s);
    saveOnboarding(s, { impact: 3 });
    // The reload: ?again was stripped on the way in, and the draft is on file.
    const reloaded = readModel(s);
    expect(onboardingArrival(reloaded, false)).toBe("resume");
    expect(reloaded.onboarding).toMatchObject({ impact: 8, completedAt: "2026-08-01T00:00:00.000Z" });
    expect(reloaded.onboardingDraft).toMatchObject({ impact: 3 });
    // Asking again on purpose starts afresh from the answers on file.
    expect(onboardingArrival(reloaded, true)).toBe("again");
    completeOnboarding(s);
    expect(onboardingArrival(readModel(s), false)).toBe("end");
  });

  it("nobody who has not finished is sent past the welcome", () => {
    expect(onboardingArrival(emptyModel(), false)).toBe("welcome");
    expect(onboardingArrival(emptyModel(), true)).toBe("welcome");
    expect(onboardingArrival({ ...emptyModel(), onboarding: { impact: 4 } }, false)).toBe("welcome");
  });
});
