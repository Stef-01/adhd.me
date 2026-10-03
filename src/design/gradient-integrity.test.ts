import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("the original gradient and glass worlds", () => {
  it("keeps the liquid-game atmosphere scoped and layered", () => {
    const glass = read("app/styles/glass.css");
    expect(glass).toMatch(/\[data-liquid\]\s*\{[\s\S]*?radial-gradient\([\s\S]*?radial-gradient\([\s\S]*?radial-gradient\(/);
    expect(glass).toContain("html.has-liquid [data-liquid]");
  });

  it("keeps the voice orb and authored game worlds gradient-backed", () => {
    expect(read("app/styles/voice.css")).toMatch(/\.voice-orb[\s\S]*?radial-gradient\(/);
    for (const path of ["app/styles/mia-world.css", "app/styles/zoe-world.css", "app/styles/leo.css"]) {
      expect(read(path), path).toMatch(/(?:linear|radial)-gradient\(/);
    }
  });

  it("does not let the shared brand layer flatten the game scope", () => {
    expect(read("app/styles/brand.css")).not.toContain("[data-liquid]");
  });
});
