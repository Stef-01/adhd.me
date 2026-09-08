import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { SUBDOMAINS } from "./layers";
import { INTERPRETATION_CUES, interpret } from "./interpret";
import { deriveNeeds } from "./needs";
import { confirmInterpretation, readModel, recordReflection, recordResonance, saveOnboarding } from "./store";
import { safeProps } from "./events";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}

describe("reflection interpretation (PRD §29)", () => {
  it("every cue names a real subdomain in its own layer, and every word the person reads passes the patient rules", () => {
    for (const cue of eachOf(INTERPRETATION_CUES, "the cues")) {
      const entry = SUBDOMAINS.find((s) => s.id === cue.subdomain);
      expect(entry, cue.subdomain).toBeDefined();
      expect(entry!.layer).toBe(cue.layer);
      expect(lintLandingCopy(`${cue.note}. It sounds like ${cue.phrase} was part of it.`), cue.subdomain).toEqual([]);
      // A reading is about the moment, never about the person.
      expect(cue.note).not.toMatch(/\byou (are|have)\b/i);
    }
  });

  it("reads a reflection in the order the person's own words reach it, at most two, and nothing from a blank", () => {
    expect(interpret("I hadn't slept and the brief was vague").map((r) => r.subdomain)).toEqual(["sleep", "structure"]);
    expect(interpret("My manager sent it at 5pm, I was tired, and the deadline was the next morning").map((r) => r.subdomain)).toEqual(["manager", "sleep"]);
    expect(interpret("Fine.")).toEqual([]);
    expect(interpret("")).toEqual([]);
    expect(interpret("I put it off")).toEqual([]);
    expect(interpret("scrolling instead")[0]?.sentence).toBe("It sounds like a phone or a feed pulling you was part of it.");
  });

  it("only a confirmed reading enters the model; the text never does, and a declined one leaves nothing", () => {
    const s = memory();
    saveOnboarding(s, { stage: "think-so", hardest: ["starting"], impact: 7, improveFirst: "start-earlier" });
    recordResonance(s, "starting", { frequency: "often", cost: 7, priority: "yes" });
    recordReflection(s, "starting", "I hadn't slept and the brief was vague");
    const before = deriveNeeds(s && readModel(s));
    expect(before[0]!.contributors.some((c) => c.subdomain === "sleep")).toBe(false);
    expect(readModel(s).interpretations).toEqual([]);
    // Declining is not an action on the model.
    expect(readModel(s).interpretations).toEqual([]);
    const [sleep] = interpret("I hadn't slept and the brief was vague");
    confirmInterpretation(s, "starting", sleep!);
    const held = readModel(s).interpretations;
    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ moduleId: "starting", subdomain: "sleep", layer: "body", note: "Short on sleep" });
    expect(JSON.stringify(held)).not.toMatch(/brief|vague|slept/);
    const after = deriveNeeds(readModel(s));
    const need = after.find((n) => n.subdomain === "activation")!;
    expect(need.contributors).toContainEqual({ layer: "body", subdomain: "sleep", note: "Short on sleep" });
    expect(need.confidence).toBe("high");
    // The analytics event may carry the subdomain id and never a sentence.
    expect(safeProps({ module: "starting", subdomain: "sleep" })).toBe(true);
    expect(safeProps({ reading: sleep!.sentence })).toBe(false);
  });
});
