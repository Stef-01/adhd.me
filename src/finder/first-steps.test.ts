import { describe, expect, it } from "vitest";
import { firstSteps, scenarioFor } from "./first-steps";

const child = (...tags: string[]) => ["care:child-adolescent-adhd", ...tags.map((tag) => `care:${tag}`)];

describe("first steps for a parent", () => {
  it("shows nothing when the request is not about a child", () => {
    expect(firstSteps(["care:adhd-assessment", "care:study-school"])).toBeNull();
  });

  it("reads the ten school scenarios, most specific first", () => {
    expect(scenarioFor(child("adhd-assessment", "study-school"))).toBe("assessment");
    expect(scenarioFor(child("titration", "study-school"))).toBe("wears-off");
    expect(scenarioFor(child("anxiety", "study-school"))).toBe("worry");
    expect(scenarioFor(child("social-connection"))).toBe("friends");
    expect(scenarioFor(child("autism-adhd", "study-school"))).toBe("sensory");
    expect(scenarioFor(child("emotional-regulation", "study-school"))).toBe("behaviour");
    expect(scenarioFor(child("executive-function", "study-school"))).toBe("focus");
    expect(scenarioFor(child("study-school"))).toBe("school");
    expect(scenarioFor(child())).toBe("start");
  });

  it("keeps every step to six words, 16 in all", () => {
    for (const tags of [["adhd-assessment"], ["titration"], ["anxiety"], ["social-connection"], ["autism-adhd"], ["parenting"], ["executive-function"], ["study-school"], []]) {
      const steps = firstSteps(child(...tags))!.steps;
      for (const step of steps) expect(step.split(/\s+/).length).toBeLessThanOrEqual(6);
      expect(steps.join(" ").split(/\s+/).length).toBeLessThanOrEqual(16);
    }
  });

  it("says medication is weighed with other help, never as the answer", () => {
    expect(firstSteps(child("adhd-assessment"))!.steps).toContain("Skills and medication, weighed together");
  });
});
