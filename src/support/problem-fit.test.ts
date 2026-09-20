import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { deriveNeeds } from "@/model/needs";
import { emptyModel, type ModelRecord } from "@/model/store";
import { SUBDOMAINS } from "@/model/layers";
import { EXPERTISE_TAGS } from "./professions";
import { EXPERTISE_FOR, fitReason, orderByProblemFit, problemFit, strengthFit, strengthReason, wantsAccountability } from "./problem-fit";
import type { Need } from "@/model/needs";

const need = (): ModelRecord => ({
  ...emptyModel(),
  resonance: { starting: { frequency: "often", cost: 8, priority: "yes", at: "2026-09-08T00:00:00Z" } },
  answers: { "starting.hardest-to-start": ["vague"], "starting.what-helps-start": ["person"] },
});

describe("problem fit (§42)", () => {
  it("maps only real tags, and covers every subdomain a module targets", () => {
    for (const tags of Object.values(EXPERTISE_FOR)) for (const t of tags) expect(EXPERTISE_TAGS).toContain(t);
    for (const s of SUBDOMAINS) if (s.layer === "brain") expect(EXPERTISE_FOR[s.id], s.id).toBeTruthy();
  });

  it("scores the need's own subdomain double, its contributors single, and nothing without expertise", () => {
    const top = deriveNeeds(need())[0]!;
    expect(top.subdomain).toBe("activation");
    expect(problemFit({ profession: "occupational-therapist", expertise: ["task-initiation", "adhd-work-systems"] }, top)).toBe(4);
    expect(problemFit({ profession: "psychologist", expertise: ["emotional-regulation"] }, top)).toBe(0);
    expect(problemFit({ profession: "adhd-coach", expertise: ["university-adhd"] }, top)).toBe(1);
    expect(problemFit({ profession: "gp" }, top)).toBe(0);
    expect(problemFit({ expertise: ["task-initiation"] }, null)).toBe(0);
  });

  it("says why in the closed vocabulary, and passes the patient rules", () => {
    const top = deriveNeeds(need())[0]!;
    const why = fitReason({ expertise: ["adhd-work-systems", "task-initiation"] }, top);
    expect(why).toBe("Works on task initiation, the thing you said is hardest.");
    expect(lintLandingCopy(why!)).toEqual([]);
    expect(fitReason({ expertise: ["university-adhd"] }, top)).toMatch(/part of what you described/);
    expect(fitReason({ expertise: ["sleep-routine"] }, top)).toBeNull();
  });

  it("reorders allied entries among their own positions and never moves a GP", () => {
    const top = deriveNeeds(need())[0]!;
    const gp1 = { id: "gp1", profession: "gp" as const };
    const gp2 = { id: "gp2", profession: undefined };
    const psych = { id: "psych", profession: "psychologist" as const, expertise: ["emotional-regulation" as const] };
    const ot = { id: "ot", profession: "occupational-therapist" as const, expertise: ["task-initiation" as const] };
    const coach = { id: "coach", profession: "adhd-coach" as const, expertise: ["university-adhd" as const] };
    const out = orderByProblemFit([gp1, psych, gp2, coach, ot], top);
    expect(out.map((x) => x.id)).toEqual(["gp1", "ot", "gp2", "coach", "psych"]);
    expect(orderByProblemFit([gp1, psych, gp2, coach, ot], null).map((x) => x.id)).toEqual(["gp1", "psych", "gp2", "coach", "ot"]);
    // Ties keep the engine's order.
    expect(orderByProblemFit([psych, coach], { ...top, subdomain: "sleep", contributors: [] }).map((x) => x.id)).toEqual(["psych", "coach"]);
  });
});

describe("strengths in the match", () => {
  const aNeed = (over: Partial<Need> = {}): Need => ({
    id: "activation", domain: "work-study", subdomain: "activation",
    label: "Starting work", signalStrength: 1, functionalCost: 8, userPriority: "yes",
    confidence: "high", contributors: [], strengths: [], context: [], strategies: [],
    sources: ["starting"], persistence: 2, ...over,
  });

  it("reads one closed signal out of what the person said, not a general vibe", () => {
    expect(wantsAccountability(aNeed({ strengths: ["Company lowers the threshold"] }))).toBe(true);
    expect(wantsAccountability(aNeed({ context: ["Easier working alongside someone"] }))).toBe(true);
    expect(wantsAccountability(aNeed({ strengths: ["Deep focus once engaged"] }))).toBe(false);
    expect(wantsAccountability(null)).toBe(false);
  });

  it("gives at most one point, and only to a kind of care that works in check-ins", () => {
    const n = aNeed({ context: ["Easier working alongside someone"] });
    expect(strengthFit({ profession: "adhd-coach" }, n)).toBe(1);
    expect(strengthFit({ profession: "occupational-therapist" }, n)).toBe(1);
    expect(strengthFit({ profession: "psychologist" }, n)).toBe(0);
    expect(strengthFit({ profession: "adhd-coach" }, aNeed())).toBe(0);
  });

  it("says why, in an authored sentence, or says nothing", () => {
    const n = aNeed({ context: ["Easier working alongside someone"] });
    expect(strengthReason({ profession: "adhd-coach" }, n)).toMatch(/check-ins/);
    expect(strengthReason({ profession: "psychologist" }, n)).toBeNull();
    expect(strengthReason({ profession: "adhd-coach" }, null)).toBeNull();
  });

  it("never moves a GP, whatever the strength says", () => {
    const n = aNeed({ context: ["Easier working alongside someone"] });
    const ranked = [
      { profession: "gp" as const, expertise: [] },
      { profession: "psychologist" as const, expertise: ["perfectionism" as const] },
      { profession: "gp" as const, expertise: [] },
      { profession: "adhd-coach" as const, expertise: ["perfectionism" as const] },
    ];
    const out = orderByProblemFit(ranked, n);
    expect(out.map((p) => p.profession)).toEqual(["gp", "adhd-coach", "gp", "psychologist"]);
  });
});
