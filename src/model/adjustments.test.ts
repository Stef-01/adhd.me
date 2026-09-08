import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { PROFESSIONS } from "@/support/professions";
import { ADJUSTMENT_TRACKS, adjustmentTrack, leadingTrack, trackForSubdomain } from "./adjustments";
import { emptyModel, saveOnboarding } from "./store";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}

describe("institutional navigation (PRD §45)", () => {
  it("two tracks, every line of which passes the patient rules and names no diagnosis", () => {
    expect(ADJUSTMENT_TRACKS.map((t) => t.id)).toEqual(["university", "work"]);
    for (const t of eachOf(ADJUSTMENT_TRACKS, "the tracks")) {
      const lines = [t.title, t.lede, ...t.commonlyAvailable, ...t.whoToAsk, ...t.bring, ...t.steps];
      for (const line of eachOf(lines, `${t.id} copy`)) {
        expect(lintLandingCopy(line), line).toEqual([]);
        // The content never tells a person they must disclose, and never says "entitled" of a specific thing.
        expect(line).not.toMatch(/\bmust disclose\b/i);
      }
      expect(t.commonlyAvailable.length).toBeGreaterThanOrEqual(4);
      expect(t.steps.length).toBeGreaterThanOrEqual(3);
      for (const p of t.professions) expect(PROFESSIONS).toContain(p);
      expect(t.subdomains.length).toBeGreaterThan(0);
    }
    expect(adjustmentTrack("work").professions[0]).toBe("occupational-therapist");
    expect(adjustmentTrack("university").professions[0]).toBe("university-support");
  });

  it("a need's subdomain names the track, and a non-institutional need names none", () => {
    expect(trackForSubdomain("study-context")).toBe("university");
    expect(trackForSubdomain("manager")).toBe("work");
    expect(trackForSubdomain("sleep")).toBeNull();
  });

  it("leads with the need's track, then what ADHD affects most, then university", () => {
    const storage = memory();
    expect(leadingTrack(emptyModel(), null)).toBe("university");
    expect(leadingTrack(emptyModel(), "workload")).toBe("work");
    const work = saveOnboarding(storage, { stage: "think-so", hardest: ["starting"], impact: 6, improveFirst: "start-earlier", affects: "work" });
    expect(leadingTrack(work, null)).toBe("work");
    expect(leadingTrack(work, "study-context")).toBe("university");
  });
});
