// The voice orb's mesh: a closed unit sphere whose every triangle faces out, so back-face culling
// shows the near side and nothing else; and a camera that frames it.

import { describe, expect, it } from "vitest";
import { cameraMatrices, cubeSphere } from "./sphere";

describe("the orb's sphere", () => {
  const segments = 64;
  const { positions, indices } = cubeSphere(segments);
  const point = (i: number) => [positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!] as const;

  it("has six faces of (segments + 1)² points, all on the unit sphere, indexable in 16 bits", () => {
    expect(positions.length).toBe(6 * (segments + 1) ** 2 * 3);
    expect(indices.length).toBe(6 * segments ** 2 * 6);
    for (let i = 0; i < positions.length / 3; i += 1) expect(Math.hypot(...point(i))).toBeCloseTo(1, 5);
    expect(indices.reduce((most, i) => Math.max(most, i), 0)).toBeLessThan(positions.length / 3);
    expect(positions.length / 3).toBeLessThan(65536);
  });

  it("winds every triangle counter-clockwise from outside", () => {
    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, c] = [point(indices[t]!), point(indices[t + 1]!), point(indices[t + 2]!)];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
      const centre = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      expect(n[0]! * centre[0]! + n[1]! * centre[1]! + n[2]! * centre[2]!).toBeGreaterThan(0);
    }
  });

  it("puts the camera back along z and projects with the given field of view", () => {
    const { projection, view } = cameraMatrices(20, 5);
    expect(view[14]).toBe(-5);
    expect(projection[5]).toBeCloseTo(1 / Math.tan((10 * Math.PI) / 180), 6);
    expect(projection[11]).toBe(-1);
  });
});
