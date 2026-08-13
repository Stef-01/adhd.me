// W194 (Q15-1): the two halves of the publication path must agree.
//
// The defect this exists for was not either half being wrong. W184 lints a profile's FIELDS and
// excludes three surnames that collide with the marketing rules, so Dr Sarah Best passes. W187
// lints the COMPOSED lines and reached the heading — which is the name — through the unfiltered
// primitive, so Dr Sarah Best was refused. Both were locally reasonable. Together they said a real
// clinician has a publishable profile that cannot be rendered, and the workaround a practice would
// find is to misspell her name.
//
// A per-half test cannot catch that, because each half passes its own. So the control is the
// AGREEMENT, asserted over the same profiles: anything W184 passes must render, and anything W187
// refuses must have been refused by W184 first. One publication path, one answer.

import { describe, expect, it } from "vitest";
import { scopeStatement } from "@/credentials/scope";
import { NAME_WORD_EXCLUSIONS, lintProfile } from "./copy-lint";
import type { GeneralProfile } from "./profile";
import { renderProfile } from "./render";

const focusOf = (label: string) => {
  const result = scopeStatement({
    credentialId: "cred-1",
    scope: { kind: "condition", conditionCode: "placeholder_register_a" },
    label,
    permits: [],
  });
  if (!result.ok) throw new Error(result.violations.join(", "));
  return result.statement;
};

const profile = (over: Partial<GeneralProfile> = {}): GeneralProfile => ({
  clinicianId: "clin-1",
  displayName: "Dr Jane Smith",
  ahpraRegistrationNumber: "MED0001234567",
  location: { practiceId: "prac-1", suburb: "Coburg", state: "VIC" },
  languages: ["English", "Greek"],
  acceptingNewPatients: true,
  descriptor: { kind: "general_registration", profession: "general_practitioner" },
  focus: [focusOf("women's health")],
  ...over,
});

/** Names and profiles that must publish, and ones that must not. Both halves see the same list. */
const CASES: Array<{ label: string; profile: GeneralProfile; publishable: boolean }> = [
  { label: "an ordinary name", profile: profile(), publishable: true },
  // The regression. Every excluded surname, driven from W184's own list so adding one to that
  // list without teaching the render path about it fails here.
  ...Object.keys(NAME_WORD_EXCLUSIONS).map((word) => ({
    label: `the surname ${word}`,
    profile: profile({ displayName: `Dr Sarah ${word[0]!.toUpperCase()}${word.slice(1)}` }),
    publishable: true,
  })),
  {
    label: "a title claim in the name",
    profile: profile({ displayName: "Dr Jane Smith, Diabetes Specialist" }),
    publishable: false,
  },
  {
    label: "a specialisation claim in the name",
    profile: profile({ displayName: "Dr Jane Smith who specialises in diabetes" }),
    publishable: false,
  },
  {
    label: "a clinical claim in a language entry",
    profile: profile({ languages: ["English", "we treat diabetes"] }),
    publishable: false,
  },
];

describe("W194 Q15-1 — the field lint and the render lint give the same answer", () => {
  it("covers both outcomes, so neither direction is vacuous", () => {
    expect(CASES.filter((c) => c.publishable).length).toBeGreaterThan(1);
    expect(CASES.filter((c) => !c.publishable).length).toBeGreaterThan(1);
    expect(Object.keys(NAME_WORD_EXCLUSIONS).length).toBeGreaterThan(0);
  });

  for (const testCase of CASES) {
    it(`agrees on ${testCase.label}`, () => {
      const fieldLint = lintProfile(testCase.profile);
      const render = renderProfile(testCase.profile);

      expect(
        fieldLint.length === 0,
        `W184 ${fieldLint.length === 0 ? "passed" : "refused"} ${testCase.label}, expected ${testCase.publishable ? "pass" : "refuse"}`,
      ).toBe(testCase.publishable);
      expect(
        render.ok,
        `W187 ${render.ok ? "rendered" : "refused"} ${testCase.label}: ${render.ok ? "" : JSON.stringify(render.violations)}`,
      ).toBe(testCase.publishable);
    });
  }

  it("a profile the field lint passes always renders", () => {
    // Stated as the property rather than case by case, so a new case cannot land on one side.
    for (const testCase of CASES) {
      if (lintProfile(testCase.profile).length > 0) continue;
      expect(
        renderProfile(testCase.profile).ok,
        `${testCase.label} passes W184 but W187 will not render it — the two halves have drifted apart again`,
      ).toBe(true);
    }
  });

  it("and a correction the clinician is allowed to make leaves a profile that still renders", () => {
    // The third path onto the same question. W190 accepts a name correction using W184's rules,
    // so a name it accepts must also be one W187 can render — otherwise a clinician can
    // successfully correct their name into an unpublishable profile.
    for (const word of Object.keys(NAME_WORD_EXCLUSIONS)) {
      const corrected = profile({ displayName: `Dr ${word[0]!.toUpperCase()}${word.slice(1)}` });
      expect(lintProfile(corrected)).toEqual([]);
      expect(renderProfile(corrected).ok, `a corrected name "${corrected.displayName}" cannot render`).toBe(true);
    }
  });
});
