// W192 verify gate (unit half): every public surface classified, checked against the tree. The
// rendered-copy sweep and the axe scan are the e2e half — e2e/public-sweep.spec.ts and
// e2e/a11y.spec.ts.

import { describe, expect, it } from "vitest";
import { LANDING_RULES, lintLandingCopy } from "./landing";
import { MESSAGE_BANNED_RULES } from "@/messaging/templates";
import { discoverSurfaces } from "./surfaces";
import {
  PROFESSIONAL_EXEMPT_RULES,
  PUBLIC_SURFACES,
  STANDING_FLAGS,
  ACCEPTED_FINDINGS,
  VOCABULARY_BOUND,
  rulesFor,
  unaccepted,
  sweepSurface,
} from "./public-surfaces";

const ALL_RULES = [...LANDING_RULES, ...MESSAGE_BANNED_RULES];

/** Routes an unauthenticated visitor can load: everything outside /console and /api. */
function publicRoutes(): string[] {
  return discoverSurfaces("app")
    .filter((s) => s.kind === "page")
    .map((s) => s.path)
    .filter((p) => !p.startsWith("/console") && !p.startsWith("/api"))
    .sort();
}

describe("W192 every public surface is classified", () => {
  it("classifies exactly the routes the tree serves, both directions", () => {
    // W102's shape. A new public page fails until somebody decides who it is for — which is the
    // decision that determines which rules it answers to, so leaving it undeclared would leave
    // the sweep silently choosing.
    expect(PUBLIC_SURFACES.map((s) => s.path).sort()).toEqual(publicRoutes());
    expect(publicRoutes().length).toBeGreaterThan(5);
  });

  it("argues every classification in a sentence somebody can disagree with", () => {
    for (const surface of PUBLIC_SURFACES) {
      expect(surface.why.length, `${surface.path} is classified without a reason`).toBeGreaterThan(60);
      expect(["patient", "professional", "patient_notice"]).toContain(surface.audience);
    }
  });

  it("treats the booking page and the finder as patient-facing", () => {
    // The two that would be most damaging to misclassify: one is reached by somebody who was
    // contacted, the other is shaped as a patient looking for care.
    const byPath = new Map(PUBLIC_SURFACES.map((s) => [s.path, s.audience]));
    expect(byPath.get("/book/[token]")).toBe("patient");
    expect(byPath.get("/finder")).toBe("patient");
    expect(byPath.get("/")).toBe("patient");
  });

  it("keeps at least one surface in each class, so no branch is dead", () => {
    const audiences = new Set(PUBLIC_SURFACES.map((s) => s.audience));
    expect(audiences).toEqual(new Set(["patient", "professional", "patient_notice"]));
  });

  it("classifies the privacy notices as notices, and says why a page class is not an allowlist", () => {
    // Found by the sweep on its first run: /privacy names "diagnoses" and "test results", which
    // APP 1 REQUIRES a privacy policy to do. A whole page class is a classification, not a
    // sentence-by-sentence acceptance — the allowlist is for the founder's one line, this is for
    // a kind of document.
    const byPath = new Map(PUBLIC_SURFACES.map((s) => [s.path, s]));
    expect(byPath.get("/privacy")!.audience).toBe("patient_notice");
    expect(byPath.get("/privacy/automated-decisions")!.audience).toBe("patient_notice");
    expect(byPath.get("/privacy")!.why).toMatch(/APP 1/);
  });

  it("still holds a notice to every marketing rule", () => {
    for (const text of ["Our patients love it", "Rated 5/5", "the best privacy policy"]) {
      expect(sweepSurface("/privacy", "patient_notice", text).length, text).toBeGreaterThan(0);
    }
    // And lets it name the data categories it is required to name.
    expect(sweepSurface("/privacy", "patient_notice", "We hold diagnoses and test results.")).toEqual([]);
    expect(sweepSurface("/", "patient", "We hold diagnoses and test results.").length).toBeGreaterThan(0);
  });
});

describe("W192 the exemption is an audience distinction, not a hole", () => {
  it("exempts only rules written for patient advertising, each with its argument", () => {
    for (const [rule, why] of Object.entries(PROFESSIONAL_EXEMPT_RULES)) {
      expect(ALL_RULES, `${rule} is exempted but no linter owns it`).toContain(rule);
      expect(why.length, `${rule} is exempted without an argument`).toBeGreaterThan(80);
    }
    expect(Object.keys(PROFESSIONAL_EXEMPT_RULES).length).toBeLessThan(4);
  });

  it("holds a professional surface to every other W23 rule", () => {
    const professional = rulesFor("professional", LANDING_RULES, MESSAGE_BANNED_RULES);
    for (const rule of LANDING_RULES) {
      if (rule in PROFESSIONAL_EXEMPT_RULES) continue;
      expect(professional, `${rule} stopped applying to professional copy`).toContain(rule);
    }
    // The ones that must never be exempt anywhere, named rather than left to the list's shape.
    for (const rule of ["no-testimonials", "no-ratings", "no-superlatives", "no-specialist"]) {
      expect(professional, `${rule} must apply to every surface`).toContain(rule);
    }
  });

  it("holds a patient surface to all of them", () => {
    expect(rulesFor("patient", LANDING_RULES, MESSAGE_BANNED_RULES)).toEqual(
      [...new Set(ALL_RULES)].sort(),
    );
  });

  it("does not run W6 over a professional surface at all", () => {
    // The finding. Exempting W6's rules one at a time reached six of eight before it became clear
    // the instrument was wrong: W6 lints a message SENT TO A PATIENT, so every rule in it asks the
    // wrong question of a page addressed to GPs. Absent by construction, not by exemption.
    const professional = rulesFor("professional", LANDING_RULES, MESSAGE_BANNED_RULES);
    for (const rule of MESSAGE_BANNED_RULES) {
      if (LANDING_RULES.includes(rule)) continue;
      expect(professional, `${rule} is a patient-message rule and should not reach a GP page`).not.toContain(rule);
    }
    // A GP page may say "required" without it being clinical necessity aimed at a patient.
    expect(sweepSurface("/practices", "professional", "No credit card required.")).toEqual([]);
    expect(sweepSurface("/", "patient", "No credit card required.").length).toBeGreaterThan(0);
  });

  it("computes the rule set rather than transcribing it", () => {
    // A rule added upstream reaches both audiences without this module being edited.
    expect(rulesFor("patient", ["no-invented-rule"])).toContain("no-invented-rule");
    expect(rulesFor("professional", ["no-invented-rule"])).toContain("no-invented-rule");
  });
});

describe("W192 the sweep catches what it claims to", () => {
  it("flags a clinical claim on a patient surface", () => {
    const found = sweepSurface("/", "patient", "We treat diabetes and improve your health.");
    expect(found.map((v) => v.rule)).toContain("no-clinical-claims");
    expect(found.every((v) => v.path === "/")).toBe(true);
  });

  it("does not flag the same words on a professional surface", () => {
    const clinical = "Diagnostic criteria, and how the practice treats diabetes on its register.";
    // Non-vacuous, and asserted FIRST: the underlying linter really does object to this sentence,
    // so the empty result below is the exemption working rather than the linter being asleep.
    expect(lintLandingCopy(clinical).length).toBeGreaterThan(0);
    expect(sweepSurface("/clinicians", "professional", clinical)).toEqual([]);
  });

  it("is only as strong as the vocabulary W23 and W6 hold, and that bound is stated", () => {
    // Found while writing this unit. The linters know "diagnosis", "diabetes", "kidney" and a
    // short list beside them; they do not know "metformin", "COCP", "Rotterdam" or "titration".
    // So "no clinical claim on any surface" is enforced to the extent of that vocabulary and no
    // further — which is worth pinning, because the sweep passing is otherwise easy to read as
    // the stronger claim.
    for (const unknown of ["Metformin titration", "Rotterdam criteria", "COCP suitability"]) {
      expect(sweepSurface("/", "patient", unknown), unknown).toEqual([]);
    }
    expect(VOCABULARY_BOUND).toMatch(/vocabulary/i);
  });

  it("flags a testimonial on a professional surface, because that exemption does not exist", () => {
    for (const text of ["Our patients love it", "Rated 5/5 by GPs", "The best practice software"]) {
      expect(sweepSurface("/practices", "professional", text).length, text).toBeGreaterThan(0);
    }
  });

  it("passes ordinary copy on both", () => {
    const copy = "Meherr helps a practice see which of its own recalls are outstanding.";
    expect(sweepSurface("/", "patient", copy)).toEqual([]);
    expect(sweepSurface("/practices", "professional", copy)).toEqual([]);
  });
});

describe("W192 an accepted finding is data with a date on it", () => {
  it("accepts by exact path, rule AND matched text — never a rule in general", () => {
    // W53's allowlist pattern. Accepting a RULE would switch it off for the whole surface; the
    // acceptance has to be as narrow as the thing accepted.
    for (const a of ACCEPTED_FINDINGS) {
      expect(a.match.length, "an acceptance with no matched text is a disabled rule").toBeGreaterThan(0);
      expect(a.why.length, `${a.path}/${a.rule} accepted without an argument`).toBeGreaterThan(80);
      expect(a.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(PUBLIC_SURFACES.map((s) => s.path)).toContain(a.path);
    }
    expect(ACCEPTED_FINDINGS.length).toBeGreaterThan(0);
  });

  it("subtracts only the exact finding, leaving anything else failing", () => {
    const accepted = sweepSurface("/", "patient", "my own diagnosis led me here");
    expect(accepted.length).toBeGreaterThan(0);
    expect(unaccepted(accepted)).toEqual([]);
    // A different clinical claim on the same page is NOT covered by that acceptance.
    const other = sweepSurface("/", "patient", "we treat diabetes");
    expect(unaccepted(other).length).toBeGreaterThan(0);
  });

  it("does not carry the acceptance to another surface", () => {
    const elsewhere = sweepSurface("/finder", "patient", "my own diagnosis led me here");
    expect(unaccepted(elsewhere).length).toBeGreaterThan(0);
  });
});

describe("W192 the open question is kept in the suite, not in a document", () => {
  it("flags /clinicians rather than treating its classification as a resolution", () => {
    // Raised in the Y2 dossier, restated in Q13's, unresolved in both. A flag in a document gets
    // re-noticed once a quarter; a flag with a test around it gets read every run.
    expect(STANDING_FLAGS["/clinicians"]).toBeDefined();
    expect(STANDING_FLAGS["/clinicians"]!).toMatch(/does not decide whether/);
    expect(STANDING_FLAGS["/clinicians"]!).toMatch(/G5/);
  });

  it("every flagged path is a surface this sweep actually covers", () => {
    // A flag about a page that has moved is worse than no flag: it reads as coverage.
    const paths = new Set(PUBLIC_SURFACES.map((s) => s.path));
    for (const path of Object.keys(STANDING_FLAGS)) {
      expect(paths, `${path} is flagged but is not a public surface`).toContain(path);
    }
    expect(Object.keys(STANDING_FLAGS).length).toBeGreaterThan(0);
  });
});
