import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { deriveNeeds } from "@/model/needs";
import { emptyModel, type ModelRecord } from "@/model/store";
import { SUBDOMAINS } from "@/model/layers";
import { EXPERTISE_TAGS } from "./professions";
import { EXPERTISE_FOR, fitReason, orderByProblemFit, problemFit } from "./problem-fit";

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
