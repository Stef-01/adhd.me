// Platform checklist: every learning module has its own artwork case in the scene component, so
// an eighth module without art fails here rather than rendering the hero fallback unnoticed.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MODULES } from "./scenes";

describe("learning artwork covers every module", () => {
  const source = readFileSync(new URL("../../app/learning-scene.tsx", import.meta.url), "utf8");
  const cases = [...source.matchAll(/case "([\w-]+)":/g)].map((m) => m[1]!);

  it("has one TopicArtwork case per read and quiz module", () => {
    const ids = MODULES.filter((m) => m.kind !== "run").map((m) => m.id);
    expect(ids.length).toBeGreaterThanOrEqual(7);
    for (const id of ids) expect(cases, `no artwork case for ${id}`).toContain(id);
  });

  it("has no artwork case for a module that does not exist", () => {
    const ids = new Set(MODULES.map((m) => m.id));
    for (const c of cases) expect(ids.has(c), `artwork case ${c} names no module`).toBe(true);
  });
});
