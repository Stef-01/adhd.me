import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { manualSuggestions, manualText, MANUAL_SECTIONS, withLine } from "./manual";
import { acceptExperiment, emptyModel, readModel, recordOutcome, recordResonance, saveManual, saveOnboarding } from "./store";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}

describe("My Manual (PRD §27)", () => {
  it("has three sections whose every string passes the patient rules", () => {
    expect(MANUAL_SECTIONS.map((s) => s.id)).toEqual(["helps", "harder", "work-with-me"]);
    for (const s of MANUAL_SECTIONS) for (const text of [s.title, s.prompt, s.placeholder]) expect(lintLandingCopy(text), text).toEqual([]);
  });

  it("starts empty, never writes a line for the person, and keeps what they write on this device", () => {
    const storage = memory();
    expect(readModel(storage).manual).toEqual({ helps: "", harder: "", "work-with-me": "", updatedAt: null });
    expect(manualText(readModel(storage))).toBe("");
    saveManual(storage, "helps", "A clear first step");
    const r = readModel(storage);
    expect(r.manual.helps).toBe("A clear first step");
    expect(r.manual.updatedAt).toBeTruthy();
    expect(r.manual.harder).toBe("");
    expect(manualText(r)).toBe("What helps me\nA clear first step");
  });

  it("offers suggestions from the record only — a strategy that helped, a need the person named — and drops ones already written", () => {
    const storage = memory();
    expect(manualSuggestions(emptyModel())).toEqual({ helps: [], harder: [], "work-with-me": [] });
    saveOnboarding(storage, { stage: "think-so", hardest: ["starting"], impact: 7, improveFirst: "start-earlier" } as never);
    recordResonance(storage, "starting", { frequency: "often", cost: 8, priority: "yes" });
    acceptExperiment(storage, "starting", "first-physical-action");
    recordOutcome(storage, "first-physical-action", "a-lot");
    const s = manualSuggestions(readModel(storage));
    expect(s.helps).toContain("The first physical action");
    expect(s["work-with-me"].length).toBeGreaterThan(0);
    for (const section of MANUAL_SECTIONS) for (const line of s[section.id]) expect(lintLandingCopy(line), line).toEqual([]);
    saveManual(storage, "helps", withLine("", "The first physical action"));
    expect(manualSuggestions(readModel(storage)).helps).not.toContain("The first physical action");
  });

  it("appends a suggestion as its own line", () => {
    expect(withLine("", "A")).toBe("A");
    expect(withLine("A\n", "B")).toBe("A\nB");
  });
});
