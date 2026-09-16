import { describe, expect, it } from "vitest";
import { JOURNEYS } from "./journeys";
import { game } from "./games";
import { strategy } from "./strategies";

describe("complete character journeys", () => {
  it("fills all six lives beyond Leo and Theo with unique routes", () => {
    expect(JOURNEYS.map(j => j.who).sort()).toEqual(["arjun", "jax", "maya", "mia", "nina", "zoe"]);
    expect(new Set(JOURNEYS.map(j => j.slug)).size).toBe(6);
  });
  for (const journey of JOURNEYS) it(`${journey.who} has varied playable rounds and a relevant practical ending`, () => {
    expect(journey.rounds.length).toBeGreaterThanOrEqual(2);
    const definitions = journey.rounds.map(r => game(r.game));
    expect(definitions.every(g => g.character === journey.who)).toBe(true);
    expect(new Set(definitions.map(g => g.engine)).size).toBeGreaterThanOrEqual(2);
    expect(strategy(journey.strategy).characterIds).toContain(journey.who);
    expect(journey.practice.length).toBeGreaterThanOrEqual(2);
    for (const step of journey.practice) {
      expect(step.correct).toBeGreaterThanOrEqual(0);
      expect(step.correct).toBeLessThan(step.choices.length);
      expect(new Set(step.choices).size).toBe(step.choices.length);
    }
  });
});
