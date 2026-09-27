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
    expect(sourceLine(["survey:work", "starting", "ambiguity"])).toBe("From a check-in and two games.");
    expect(sourceLine(["goal:sleep"])).toBe("From a goal.");
    expect(sourceLine(["goal:sleep", "goal:focus"])).toBe("From two goals.");
    expect(sourceLine(["lives:character:nina", "goal:sleep"])).toBe("From a character and a goal.");
    expect(sourceLine([])).toBeNull();
    expect(sourceLine(["onboarding", "starting"], true)).toBe("From your first answers.");
  });

  it("names the first two kinds in order and leaves the rest to the sheet", () => {
    expect(sourceLine(["starting", "ambiguity", "survey:work", "lives:character:nina"])).toBe("From a check-in and two games.");
    expect(sourceLine(["onboarding", "goal:q", "goal:r"])).toBe("From your first answers and two goals.");
    expect(sourceLine(["onboarding", "a", "survey:x", "lives:game:g", "goal:q"])).toBe("From your first answers and a check-in.");
  });

  it("is seven words at most, whatever is on file", () => {
    const kinds = [
      ["onboarding"],
      ["survey:x", "survey:y", "survey:z"],
      ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"],
      ["lives:character:nina", "lives:game:g"],
      ["goal:q", "goal:r"],
    ];
    const lines: string[] = [];
    // Every combination of the five kinds, each at one source and at many.
    for (let mask = 1; mask < 1 << kinds.length; mask++) {
      for (const many of [false, true]) {
        const sources = kinds.flatMap((k, i) => (mask & (1 << i) ? (many ? k : k.slice(0, 1)) : []));
        for (const firstOnly of [false, true]) lines.push(sourceLine(sources, firstOnly)!);
      }
    }
    expect(lines.length).toBe(124);
    for (const line of lines) expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(7);
    expect(lines).toContain("From your first answers and two goals.");
  });

  it("never carries a digit, and reads as the patient rules allow", () => {
    const line = sourceLine(["onboarding", "a", "b", "c", "survey:x", "survey:y", "lives:game:g", "goal:q", "goal:r"])!;
    expect(line).not.toMatch(/\d/);
    expect(lintLandingCopy(line)).toEqual([]);
    const goals = sourceLine(["goal:q", "goal:r", "goal:s"])!;
    expect(goals).not.toMatch(/\d/);
    expect(lintLandingCopy(goals)).toEqual([]);
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
