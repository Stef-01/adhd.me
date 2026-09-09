import { describe, expect, it } from "vitest";
import { game } from "./games";
import { layoutGame } from "./layout";
import { leoFlightAt } from "./leo-flight";

describe("Leo's flight area", () => {
  it("keeps targets inside the room and above the bed across levels and seeded paths", () => {
    for (let level = 1; level <= 8; level++) for (let seed = 0; seed < 30; seed++) {
      const scene = layoutGame(game("leo_mosquito"), level, seed);
      for (const entity of scene.entities) for (let time = 0; time <= 8; time += .25) {
        const point = leoFlightAt(entity, time, false);
        expect(point.x).toBeGreaterThanOrEqual(48);
        expect(point.x).toBeLessThanOrEqual(342);
        expect(point.y).toBeGreaterThanOrEqual(90);
        expect(point.y).toBeLessThanOrEqual(290);
      }
    }
  });
  it("keeps the untimed and keyboard target still regardless of elapsed time", () => {
    const entity = layoutGame(game("leo_mosquito"), 8, 42).entities[0]!;
    expect(leoFlightAt(entity, 300, true)).toEqual(leoFlightAt(entity, 0, true));
  });
});
