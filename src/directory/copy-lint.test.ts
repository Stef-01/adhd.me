// W184 verify gate: W6/W23's rules APPLIED not re-implemented, and the emitting fields checked
// against the tree so a new one fails until it is declared.

import { describe, expect, it } from "vitest";
import { LANDING_RULES, lintLandingCopy } from "@/compliance/landing";
import { MESSAGE_BANNED_RULES, lintMessageText } from "@/messaging/templates";
import {
  DIRECTORY_ONLY_RULES,
  DIRECTORY_RULE_COPY,
  FIELD_LINTING,
  NAME_WORD_EXCLUSIONS,
  directoryCopyRules,
  lintProfile,
  renderableText,
} from "./copy-lint";
import { type GeneralProfile, PROFILE_FIELDS, type SpecialistProfile } from "./profile";
import { scopeStatement } from "@/credentials/scope";

function focusOf(label: string) {
  const result = scopeStatement({
    credentialId: "cred-1",
    scope: { kind: "condition", conditionCode: "placeholder_register_a" },
    label,
    permits: [],
  });
  if (!result.ok) throw new Error(`fixture label rejected: ${result.violations.join(", ")}`);
  return result.statement;
}

const general = (over: Partial<GeneralProfile> = {}): GeneralProfile => ({
  clinicianId: "clin-1",
  displayName: "Dr Jane Smith",
  ahpraRegistrationNumber: "MED0001234567",
  location: { practiceId: "prac-1", suburb: "Coburg", state: "VIC" },
  languages: ["English", "Greek"],
  acceptingNewPatients: true,
  descriptor: { kind: "general_registration", profession: "general_practitioner" },
  focus: [],
  ...over,
});

const specialist = (): SpecialistProfile => ({
  clinicianId: "clin-2",
  displayName: "Dr Ada Okafor",
  ahpraRegistrationNumber: "MED0007654321",
  location: { practiceId: "prac-1", suburb: "Coburg", state: "VIC" },
  languages: ["English"],
  acceptingNewPatients: false,
  descriptor: { kind: "recognised_specialist", specialty: "endocrinology" },
  specialty: "endocrinology",
});

describe("W184 the rules are applied, not re-implemented", () => {
  it("every rule W23 and W6 own applies to a profile", () => {
    // W139's device, second use. If W23 adds a rule tomorrow it reaches directory copy the same
    // day, and this assertion is what says so rather than a comment claiming it.
    const rules = directoryCopyRules();
    for (const rule of [...LANDING_RULES, ...MESSAGE_BANNED_RULES]) {
      expect(rules, `${rule} is owned elsewhere but does not reach directory copy`).toContain(rule);
    }
    expect(LANDING_RULES.length).toBeGreaterThan(5);
    expect(MESSAGE_BANNED_RULES.length).toBeGreaterThan(0);
  });

  it("a rule added upstream appears without this module being edited", () => {
    // Handed a rule list that does not exist in the tree: it still comes back, which is only
    // possible because the union is computed rather than transcribed.
    expect(directoryCopyRules(["no-invented-rule"], [])).toContain("no-invented-rule");
  });

  it("adds only what no existing linter covers", () => {
    // The added set must not overlap the borrowed ones, or it IS a re-implementation.
    for (const rule of DIRECTORY_ONLY_RULES) {
      expect(LANDING_RULES, `${rule} duplicates a W23 rule`).not.toContain(rule);
      expect(MESSAGE_BANNED_RULES, `${rule} duplicates a W6 rule`).not.toContain(rule);
      expect(DIRECTORY_RULE_COPY[rule], `${rule} has no explanation`).toBeDefined();
      expect(DIRECTORY_RULE_COPY[rule]!.length).toBeGreaterThan(80);
    }
    expect(DIRECTORY_ONLY_RULES.length).toBeGreaterThan(0);
  });

  it("catches a borrowed rule through the profile, not just in the list", () => {
    // The union must be wired into `lintProfile`, not merely reported by `directoryCopyRules`.
    const found = lintProfile(general({ languages: ["English", "we treat diabetes"] }));
    expect(found.map((v) => v.rule)).toContain("no-clinical-claims");
    expect(found.every((v) => v.field.startsWith("languages"))).toBe(true);
  });
});

describe("W184 the s 133 claim made without the banned word", () => {
  it("refuses 'specialises in' in a name, which no other check in the tree sees", () => {
    // The finding. W183's type refuses the specialty FIELD beside a narrow scope; the same claim
    // typed into the name field passed everything before this unit.
    const found = lintProfile(general({ displayName: "Dr Jane Smith, specialises in diabetes" }));
    expect(found.map((v) => v.rule)).toContain("no-specialisation-claim");
    expect(found[0]!.field).toBe("displayName");
  });

  it("refuses the noun in a name too, and W23 alone would not have been asked", () => {
    // "Diabetes Specialist" in a display name: the word IS in W23's list, but W23 was never run
    // over this field — which is the difference between a rule existing and a rule applying.
    expect(lintLandingCopy("Dr Jane Smith, Diabetes Specialist").length).toBeGreaterThan(0);
    const found = lintProfile(general({ displayName: "Dr Jane Smith, Diabetes Specialist" }));
    expect(found.length).toBeGreaterThan(0);
  });

  it("refuses expertise and comparative claims", () => {
    const expertise = lintProfile(general({ languages: ["expert in kidney care"] }));
    expect(expertise.map((v) => v.rule)).toContain("no-expertise-claim");
    const comparative = lintProfile(general({ languages: ["the only GP in Coburg doing this"] }));
    expect(comparative.map((v) => v.rule)).toContain("no-comparative-clinician-claim");
  });

  it("publishes an ordinary profile without complaint", () => {
    // Non-vacuous from the other side: a linter that refused everything would pass every test
    // above and be useless.
    expect(lintProfile(general())).toEqual([]);
    expect(lintProfile(specialist())).toEqual([]);
  });

  it("does not refuse a real surname that collides with a marketing superlative", () => {
    // The stated narrowing. W23 bans "best" and "leading"; Best and Leading are surnames, and
    // refusing to publish Dr Sarah Best protects nobody. Claim rules only on a name.
    expect(lintProfile(general({ displayName: "Dr Sarah Best" }))).toEqual([]);
    expect(lintProfile(general({ displayName: "Dr Michael Leading" }))).toEqual([]);
    // And the narrowing is genuinely narrow — the same words in COPY are still refused.
    expect(lintProfile(general({ languages: ["best care in Coburg"] })).length).toBeGreaterThan(0);
    // Excluding by WORD, not by rule: `no-benefit-claims` bundles best|leading|expert|specialist,
    // so exempting the rule would have exempted the title claims from names too.
    for (const name of ["Dr Jane Specialist Smith", "Dr Jane Smith, expert"]) {
      expect(lintProfile(general({ displayName: name })).length, name).toBeGreaterThan(0);
    }
    for (const [word, why] of Object.entries(NAME_WORD_EXCLUSIONS)) {
      expect(why.length, `${word} is exempt without an argument`).toBeGreaterThan(40);
      // W194 (Q15-2). Both directions, the way every register in this tree is checked: an entry
      // that no rule would have caught is DEAD, and a dead entry makes the list look like it is
      // doing more than it is. `top` was here and excluded nothing — `no-superlatives` carries
      // "top-rated", not "top" — and only a mutation check noticed.
      expect(
        lintLandingCopy(`Dr Sarah ${word}`).length + lintMessageText(`Dr Sarah ${word}`).length,
        `"${word}" is excluded from name checks but no rule objects to it — a dead exemption`,
      ).toBeGreaterThan(0);
    }
  });
});

describe("W184 every emitting field is disposed of, checked against the tree", () => {
  it("declares one disposition per emitted field, both directions", () => {
    // W102's shape. A new field on the profile fails here until somebody says how it is linted,
    // and a disposition for a field that no longer exists fails too — a register describing a
    // field that has gone reads as coverage.
    expect(Object.keys(FIELD_LINTING).sort()).toEqual([...PROFILE_FIELDS].sort());
    expect(PROFILE_FIELDS.length).toBeGreaterThan(5);
  });

  it("every structured field says why there is no prose in it", () => {
    // "Structured" is a reviewed answer, not an exemption — W106's rule for `derived`.
    for (const [field, disposition] of Object.entries(FIELD_LINTING)) {
      if (disposition.kind === "structured") {
        expect(disposition.why.length, `${field} is exempt without a reason`).toBeGreaterThan(40);
      }
      if (disposition.kind === "brand_checked") {
        expect(disposition.by, `${field} does not name what checks it`).toMatch(/^src\/.+\.ts ::/);
      }
    }
  });

  it("does not re-lint what a brand already checked at mint time", () => {
    // `focus` is a ScopeStatement, mintable only through W114's constructor, which runs the same
    // rules. Linting it again here would be the re-implementation the unit forbids — and the
    // constructor is what makes it safe, proved by asking it to mint a bad label.
    expect(FIELD_LINTING.focus!.kind).toBe("brand_checked");
    const refused = scopeStatement({
      credentialId: "cred-1",
      scope: { kind: "condition", conditionCode: "placeholder_register_a" },
      label: "specialist diabetes care",
      permits: [],
    });
    expect(refused.ok).toBe(false);
  });

  it("what is rendered and what is linted come from the same list", () => {
    // A page rendering a field the linter does not walk would be showing unchecked copy.
    const profile = general({ focus: [focusOf("women's health")] });
    const rendered = renderableText(profile);
    expect(rendered).toContain("Dr Jane Smith");
    expect(rendered).toContain("Coburg");
    expect(rendered).toContain("women's health");
    // The specialist shape renders no focus, because it has none to render.
    expect(renderableText(specialist())).not.toContain("women's health");
  });

  it("skips nothing silently — every non-structured field is actually walked", () => {
    // Seed the same violation into each linted field in turn and require it to be reported.
    // A `continue` added to `lintProfile` would pass every other test in this file.
    const seeded: Array<[string, GeneralProfile]> = [
      ["displayName", general({ displayName: "Dr Jane Smith, expert" })],
      ["languages[0]", general({ languages: ["expert"] })],
      ["location.suburb", general({ location: { practiceId: "p", suburb: "expert", state: "VIC" } })],
    ];
    for (const [field, profile] of seeded) {
      const found = lintProfile(profile);
      expect(found.map((v) => v.field), `${field} was not walked`).toContain(field);
    }
  });
});
