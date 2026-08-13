// W183 verify gate: "the type admits no rating, no testimonial and no free-text endorsement; a
// niche scope beside the word 'specialist' is unrepresentable rather than linted out."
//
// The second clause is the one that decides the shape of this file. "Unrepresentable" is a claim
// about the COMPILER, so the tests that carry it are `@ts-expect-error` cases — a directive that
// fails the build when the line it guards stops being an error. A runtime `expect(() => …)
// .toThrow()` would prove the opposite of what the gate asks: that the combination can be
// written and is caught afterwards.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROFILE_FIELDS,
  REFUSED_FIELDS,
  SHIPPED_DIRECTORY_PROFILES,
  isSpecialist,
  publishedFocus,
  type DirectoryProfile,
  type GeneralProfile,
  type SpecialistProfile,
} from "./profile";
import { scopeStatement, type ScopeStatement } from "@/credentials/scope";

const focus = (label: string): ScopeStatement => {
  const result = scopeStatement({
    credentialId: "cred-1",
    scope: { kind: "condition", conditionCode: "E28.2" },
    label,
    permits: ["record_only"],
  });
  if (!result.ok) throw new Error(`fixture label rejected: ${JSON.stringify(result.violations)}`);
  return result.statement;
};

const CORE = {
  clinicianId: "clin-1",
  displayName: "Dr Example Name",
  ahpraRegistrationNumber: "MED0001234567",
  location: { practiceId: "prac-1", suburb: "Parramatta", state: "NSW" as const },
  languages: ["English", "Hindi"],
  acceptingNewPatients: true,
};

const GENERAL: GeneralProfile = {
  ...CORE,
  descriptor: { kind: "general_registration", profession: "general_practitioner" },
  focus: [focus("Women's health")],
};

const SPECIALIST: SpecialistProfile = {
  ...CORE,
  descriptor: { kind: "recognised_specialist", specialty: "endocrinology" },
  specialty: "endocrinology",
};

describe("W183 a niche focus beside a specialty is unrepresentable", () => {
  it("refuses the combination at COMPILE time, not at call time", () => {
    // The gate, and the whole reason the model is shaped as two exclusive variants. This is the
    // representation s 133 exists to stop — a narrow interest rendering as "specialist in
    // <thing>" — and it does not typecheck.
    const attempt: SpecialistProfile = {
      ...CORE,
      descriptor: { kind: "recognised_specialist", specialty: "endocrinology" },
      specialty: "endocrinology",
      // @ts-expect-error — a specialist profile has no focus list; `focus` is typed `never`.
      focus: [focus("Women's health")],
    };
    expect(attempt.descriptor.kind).toBe("recognised_specialist");
  });

  it("refuses a specialty on a general profile just as firmly", () => {
    // The other direction: a general-registration clinician cannot acquire a specialty field,
    // so "GP, specialist in women's health" has no representation either.
    const attempt: GeneralProfile = {
      ...CORE,
      descriptor: { kind: "general_registration", profession: "general_practitioner" },
      focus: [],
      // @ts-expect-error — `specialty` is `never` on a general profile.
      specialty: "endocrinology",
    };
    expect(attempt.descriptor.kind).toBe("general_registration");
  });

  it("admits no invented specialty, because the list is closed", () => {
    const attempt: SpecialistProfile = {
      ...CORE,
      // @ts-expect-error — "PMOS" is not a specialty Ahpra recognises, so it cannot be claimed.
      descriptor: { kind: "recognised_specialist", specialty: "pmos" },
      specialty: "endocrinology",
    };
    expect(attempt.specialty).toBe("endocrinology");
  });

  it("leaves the nearest REPRESENTABLE thing being what such a clinician actually is", () => {
    // Refusing a shape is only half an answer; the other half is what to write instead. A
    // clinician with a deep interest and no specialist registration is a general profile with a
    // declared focus, which is both compliant and true.
    expect(isSpecialist(GENERAL)).toBe(false);
    expect(publishedFocus(GENERAL)).toHaveLength(1);
  });

  it("publishes no focus for a specialist, by absence rather than by filtering", () => {
    expect(publishedFocus(SPECIALIST)).toEqual([]);
    expect(isSpecialist(SPECIALIST)).toBe(true);
  });
});

describe("W183 W114's linter still guards the words, as the second line", () => {
  it("mints no focus statement carrying the specialist title beside a narrow scope", () => {
    // The type stops the SHAPE; this stops the STRING. Both are needed: a general profile is
    // allowed a focus list, so nothing in the type prevents the label itself saying it.
    const result = scopeStatement({
      credentialId: "cred-1",
      scope: { kind: "condition", conditionCode: "E28.2" },
      label: "Specialist in women's health",
      permits: ["record_only"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violations.map((v) => v.rule)).toContain("no-specialist-title");
  });

  it("reaches W114's constructor rather than re-linting here", () => {
    // W184's rule, applied a unit early: a second implementation of the same check drifts from
    // the first, and the drift is invisible until it matters.
    const source = readFileSync(path.join(__dirname, "profile.ts"), "utf8");
    expect(source).toContain('from "@/credentials/scope"');
    expect(source, "profile.ts re-implements a linter instead of importing one").not.toMatch(
      /\bnew RegExp\(|\.test\(|BANNED|lint[A-Z]/,
    );
  });

  it("types every human-authored description as a linted statement", () => {
    // `focus` cannot hold a plain string, so there is no unlinted sentence on a profile.
    const attempt: GeneralProfile = {
      ...CORE,
      descriptor: { kind: "general_registration", profession: "general_practitioner" },
      // @ts-expect-error — a raw string is not a ScopeStatement and cannot be published.
      focus: ["Women's health"],
    };
    expect(attempt.focus).toHaveLength(1);
  });
});

describe("W183 the type admits no rating, testimonial or endorsement", () => {
  const source = readFileSync(path.join(__dirname, "profile.ts"), "utf8");

  /**
   * The bodies of the interfaces only.
   *
   * Scanning the whole file matched `REFUSED_FIELDS`, whose keys ARE the banned names — the
   * registry that documents the refusals looked exactly like a declaration of them. A test
   * that cannot tell "we refuse a rating field" from "we have a rating field" reports the
   * refusal itself as the violation.
   */
  const interfaceBodies = [...source.matchAll(/^interface \w+[^{]*\{([\s\S]*?)^\}/gm)]
    .map((match) => match[1]!)
    .concat([...source.matchAll(/^export interface \w+[^{]*\{([\s\S]*?)^\}/gm)].map((m) => m[1]!))
    .join("\n")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
    .join("\n");

  it("declares no field of a banned kind", () => {
    // Scanned against the source rather than a constructed object, because the claim is about
    // what the TYPE admits — an optional field nobody happened to populate would pass an
    // object check while still being publishable.
    expect(interfaceBodies, "found no interface bodies to scan").toContain("clinicianId");
    for (const banned of ["rating", "review", "testimonial", "endorse", "star", "score", "bio"]) {
      const declared = new RegExp(`^\\s*(readonly\\s+)?\\w*${banned}\\w*\\??:`, "im");
      expect(interfaceBodies, `profile.ts declares a "${banned}" field`).not.toMatch(declared);
    }
  });

  it("states WHY each is refused, so removing one means deleting an argument", () => {
    // A refusal nobody wrote down is indistinguishable from an oversight, and gets "fixed".
    for (const key of ["rating", "review", "testimonial", "endorsement", "score", "bio"]) {
      expect(Object.keys(REFUSED_FIELDS)).toContain(key);
      expect(REFUSED_FIELDS[key]!.length).toBeGreaterThan(30);
    }
  });

  it("names no refused field among the fields it can emit", () => {
    for (const field of PROFILE_FIELDS) {
      expect(Object.keys(REFUSED_FIELDS)).not.toContain(field);
    }
  });
});

describe("W183 the emitted field list is checked against the type, not maintained by hand", () => {
  it("matches the keys a real profile of each shape actually has", () => {
    // This is what lets W184 promise its linter reaches EVERY field a profile can emit. A field
    // added to the type without being declared here fails now, rather than being silently
    // unlinted when the directory ships.
    const keys = new Set([...Object.keys(GENERAL), ...Object.keys(SPECIALIST)]);
    expect([...keys].sort()).toEqual(PROFILE_FIELDS.filter((f) => keys.has(f)));
    for (const key of keys) {
      expect(PROFILE_FIELDS, `profile field "${key}" is not declared`).toContain(key);
    }
  });

  it("declares the fields only one shape has", () => {
    // `focus` and `specialty` each exist on one variant. Both must be declared, because W184
    // lints what a profile CAN emit and either shape can be the one published.
    expect(PROFILE_FIELDS).toContain("focus");
    expect(PROFILE_FIELDS).toContain("specialty");
  });
});

describe("W183 founder gate G6 — nothing is published", () => {
  it("ships no profiles", () => {
    // Same device as the nine SHIPPED_* registries: the model may exist before the Ahpra
    // advertising review; the content may not. This is the line that makes the unit safe to
    // build ahead of a founder decision.
    expect(SHIPPED_DIRECTORY_PROFILES).toEqual([]);
  });

  it("has no constructor that could populate it from elsewhere", () => {
    const source = readFileSync(path.join(__dirname, "profile.ts"), "utf8");
    expect(source).not.toMatch(/SHIPPED_DIRECTORY_PROFILES\s*[:=][^=]*\[[^\]]/);
  });
});

describe("W183 a profile carries facts a reader can check", () => {
  it("keeps the registration number, so the claim is verifiable off-product", () => {
    // The alternative to testimonials is not silence — it is checkable facts. A reader can take
    // this number to the public register and confirm the one claim the profile makes.
    const profile: DirectoryProfile = GENERAL;
    expect(profile.ahpraRegistrationNumber).toMatch(/^[A-Z]{3}\d{10}$/);
  });

  it("says whether they are accepting patients, which is the question being asked", () => {
    expect(typeof GENERAL.acceptingNewPatients).toBe("boolean");
  });
});
