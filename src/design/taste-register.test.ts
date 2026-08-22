// AR1 verify gate: the taste register and `.claude/skills/adhdme-taste/SKILL.md` agree in BOTH
// directions. Neither is the sole source — a rule marked in the file and missing from the
// register fails, and so does a register entry with no marked bullet in the file.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { diffTasteRegister, parseSkillRules, TASTE_RULES, type TasteRule } from "./taste-register";

const SKILL_FILE = ".claude/skills/adhdme-taste/SKILL.md";
const skillMarkdown = () => readFileSync(SKILL_FILE, "utf8");

describe("AR1 the taste law is a checked register", () => {
  it("agrees with SKILL.md in both directions, with no unmarked bullets or duplicate ids", () => {
    const diff = diffTasteRegister(skillMarkdown());
    expect(diff.missingFromRegister, "marked in SKILL.md but absent from TASTE_RULES").toEqual([]);
    expect(diff.staleInRegister, "in TASTE_RULES but no longer marked in SKILL.md").toEqual([]);
    expect(diff.duplicateInSkillFile, "id marked on more than one bullet").toEqual([]);
    expect(diff.unmarkedInSkillFile, "content bullet under a rule heading with no {#id} marker").toEqual([]);
    expect(diff.sectionMismatch, "register section disagrees with the heading the id is marked under").toEqual([]);
  });

  it("finds every rule currently in the file — guards against a vacuous pass", () => {
    // A parser that silently matched nothing would make the equality checks above pass by
    // finding zero on both sides. Pin a floor so that failure mode is visible.
    const { rules } = parseSkillRules(skillMarkdown());
    expect(rules.length).toBeGreaterThanOrEqual(20);
    expect(rules.length).toBe(TASTE_RULES.length);
  });

  it("is a non-vacuous check: an unmarked rule, a stale id and a bad section each get caught", () => {
    const base = skillMarkdown();

    const droppedMarker = base.replace("{#layout.one-idea}", "");
    expect(diffTasteRegister(droppedMarker).unmarkedInSkillFile.length).toBeGreaterThan(0);

    const renamedMarker = base.replace("{#layout.one-idea}", "{#layout.one-idea-v2}");
    const renamedDiff = diffTasteRegister(renamedMarker);
    expect(renamedDiff.missingFromRegister).toContain("layout.one-idea-v2");
    expect(renamedDiff.staleInRegister).toContain("layout.one-idea");

    // A register entry filed under the wrong section relative to its marked heading must be visible.
    const wrongSection: readonly TasteRule[] = TASTE_RULES.map((r) =>
      r.id === "interaction.touch-44" ? { ...r, section: "motion" } : r,
    );
    expect(diffTasteRegister(base, wrongSection).sectionMismatch).toContain("interaction.touch-44");
  });

  it("every register entry carries a non-empty statement and incident", () => {
    for (const rule of TASTE_RULES) {
      expect(rule.statement.length, `${rule.id} has no statement`).toBeGreaterThan(10);
      expect(rule.incident.length, `${rule.id} has no incident`).toBeGreaterThan(5);
    }
  });

  it("has no duplicate ids within the register itself", () => {
    const ids = TASTE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
