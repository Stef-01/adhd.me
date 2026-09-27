import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TASTE_REGISTER } from "./taste-register";

const ROOT = resolve(__dirname, "../..");
const SKILL = readFileSync(resolve(ROOT, ".claude/skills/adhdme-taste/SKILL.md"), "utf8");
const skillIds = [...SKILL.matchAll(/\{#([a-z]+\.[a-z0-9-]+)\}/g)].map((m) => m[1]!);
const registerIds = TASTE_REGISTER.map((r) => r.id);

describe("the taste register and SKILL.md are twins (AR1, PLAN.md N11)", () => {
  it("every rule in the skill has one register entry, and every entry is a rule in the skill", () => {
    expect(skillIds.length).toBeGreaterThan(20);
    expect(new Set(registerIds).size).toBe(registerIds.length);
    expect([...registerIds].sort()).toEqual([...new Set(skillIds)].sort());
  });

  it("every test a rule names exists", () => {
    for (const r of TASTE_REGISTER) {
      if (r.checkedBy === "review") continue;
      expect(r.checkedBy.length, r.id).toBeGreaterThan(0);
      for (const file of r.checkedBy) expect(existsSync(resolve(ROOT, file)), `${r.id}: ${file}`).toBe(true);
    }
  });

  it("every taste-rule tag in the tree names a rule in the register", () => {
    const out = execFileSync("git", ["grep", "-h", "-o", "-E", "taste-rule: [a-z]+\\.[a-z0-9-]+", "--", "e2e", "src"], { cwd: ROOT, encoding: "utf8" });
    const tagged = [...new Set(out.split("\n").filter(Boolean).map((l) => l.replace("taste-rule: ", "")))];
    expect(tagged.length).toBeGreaterThan(0);
    for (const id of tagged) expect(registerIds, id).toContain(id);
  });
});
