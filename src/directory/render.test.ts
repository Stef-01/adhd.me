// W187 verify gate: "s 133 compliance asserted on rendered copy; the compile-time guarantee
// from W183 exercised by a `@ts-expect-error` case."
//
// "On rendered copy" is the load-bearing phrase. W184 asserts compliance per field and this
// asserts it on what a reader actually sees — which is a different string, because a template
// joins fields and the join is where the claim appears.

import { describe, expect, it } from "vitest";
import {
  PROFESSION_COPY,
  REGISTRATION_FRAMING,
  REGISTRATION_WORDS,
  SCOPE_FRAMING,
  SPECIALIST_NOT_PUBLISHED,
  renderProfile,
  renderProfileText,
  renderedLines,
} from "./render";
import { lintDirectoryText } from "./copy-lint";
import type { GeneralProfile, SpecialistProfile } from "./profile";
import { scopeStatement, type ScopeStatement } from "@/credentials/scope";

const focus = (label: string): ScopeStatement => {
  const result = scopeStatement({
    credentialId: "cred-1",
    scope: { kind: "condition", conditionCode: "E28.2" },
    label,
    permits: ["record_only"],
  });
  if (!result.ok) throw new Error(`fixture rejected: ${JSON.stringify(result.violations)}`);
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

const GP: GeneralProfile = {
  ...CORE,
  descriptor: { kind: "general_registration", profession: "general_practitioner" },
  focus: [focus("Women's health"), focus("Long-term conditions")],
};

const SPECIALIST: SpecialistProfile = {
  ...CORE,
  descriptor: { kind: "recognised_specialist", specialty: "endocrinology" },
  specialty: "endocrinology",
};

const ok = (profile: GeneralProfile) => {
  const result = renderProfile(profile);
  if (!result.ok) throw new Error(`render refused: ${JSON.stringify(result.violations)}`);
  return result.rendered;
};

describe("W187 the scope is stated without implying a specialty", () => {
  it("passes the full rule union on every COMPOSED line, not just on the fields", () => {
    // The gate. W184 lints fields; this lints what a template made out of them.
    for (const { field, text } of renderedLines(ok(GP))) {
      expect(lintDirectoryText(text, field), `${field}: ${text}`).toEqual([]);
    }
  });

  it("never puts a focus area on the same line as how the clinician is registered", () => {
    // THIS is what makes "Dr Jane Smith — Women's Health GP" unrenderable rather than merely
    // discouraged. Every individual string is compliant; the juxtaposition is the claim, and
    // no per-field linter can see a string that does not exist until a template builds it.
    const rendered = ok(GP);
    const labels = GP.focus.map((f) => f.label.toLowerCase());
    for (const { field, text } of renderedLines(rendered)) {
      const lower = text.toLowerCase();
      const carriesFocus = labels.some((label) => lower.includes(label));
      if (!carriesFocus) continue;
      for (const word of REGISTRATION_WORDS) {
        expect(lower, `${field} joins a focus area to "${word}"`).not.toContain(word);
      }
    }
  });

  it("keeps the heading to the name alone", () => {
    const rendered = ok(GP);
    expect(rendered.heading).toBe("Dr Example Name");
    for (const label of GP.focus.map((f) => f.label)) {
      expect(rendered.heading).not.toContain(label);
    }
  });

  it("says whose claim the scope is, because the reader cannot tell otherwise", () => {
    // W111's rule in public copy: registration is checked, the interests are not, and only one
    // of those two facts is visible to a reader unless the page says so.
    const rendered = ok(GP);
    expect(rendered.scope.join(" ")).toContain("Told to us by the clinician");
    expect(rendered.scope.join(" ")).toContain("have not checked");
    expect(rendered.registration.join(" ")).toContain("confirm it yourself");
  });

  it("denies the specialty reading explicitly rather than leaving it unsaid", () => {
    // A list of narrow interests under a doctor's name reads as a specialty unless something
    // says it is not one. Silence is where the inference lives — W120, at its most expensive.
    expect(ok(GP).scope.join(" ")).toContain("not a specialty");
    expect(ok(GP).scope.join(" ")).toContain("general registration");
  });

  it("frames the scope on every profile, not only where somebody remembered", () => {
    // A one-focus profile is the likely place for the framing to be judged unnecessary.
    const single: GeneralProfile = { ...GP, focus: [focus("Women's health")] };
    expect(ok(single).scope).toContain(SCOPE_FRAMING.denial);
    expect(ok(single).scope).toContain(SCOPE_FRAMING.attribution);
  });

  it("frames it even when a clinician has declared nothing", () => {
    // The zero case: an empty scope block that still carries the denial, so a reader of a
    // sparse profile is not left to conclude the interests are simply elsewhere.
    const none: GeneralProfile = { ...GP, focus: [] };
    const rendered = ok(none);
    expect(rendered.scope).toContain(SCOPE_FRAMING.denial);
  });
});

describe("W187 the framing text is itself copy, and is linted as such", () => {
  it("passes the union it is there to satisfy", () => {
    // Framing appears on EVERY profile, so a claim smuggled into it is the most expensive one
    // available. It is checked against the same rules as the fields it frames.
    for (const [key, text] of Object.entries({ ...SCOPE_FRAMING, ...REGISTRATION_FRAMING })) {
      expect(lintDirectoryText(text, `framing.${key}`), `${key}: ${text}`).toEqual([]);
    }
  });

  it("names professions in full rather than abbreviating them", () => {
    // "GP" is correct and unsafe: an abbreviation is short enough to sit on a line with an
    // interest, which is the juxtaposition the whole unit is about.
    for (const copy of Object.values(PROFESSION_COPY)) {
      expect(copy).not.toMatch(/\bGP\b/);
      expect(copy.length).toBeGreaterThan(8);
    }
  });
});

describe("W187 W183's compile-time guarantee, exercised", () => {
  it("cannot be handed a specialist profile carrying a focus list", () => {
    // The gate names this case. The renderer never has to decide what to do with a specialist's
    // focus areas, because such a profile does not typecheck — the branch does not exist rather
    // than existing and being correct.
    const attempt: SpecialistProfile = {
      ...CORE,
      descriptor: { kind: "recognised_specialist", specialty: "endocrinology" },
      specialty: "endocrinology",
      // @ts-expect-error — `focus` is `never` on a specialist profile (W183).
      focus: [focus("Women's health")],
    };
    expect(attempt.specialty).toBe("endocrinology");
  });
});

describe("W187 the specialist variant is representable and unpublishable", () => {
  it("refuses to render one, by name", () => {
    // THE FINDING THIS UNIT SURFACED. W183 modelled a specialist profile because s 133
    // recognises the title and a model denying it would misstate the law. W114 ruled that
    // Meherr publishes no specialist titles at all, stricter than the law on purpose, because
    // whether a clinician may use one is a fact on the specialist register this tree does not
    // read. Both are right; they collide in the first unit that turns a profile into copy.
    const result = renderProfile(SPECIALIST);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]!.rule).toBe(SPECIALIST_NOT_PUBLISHED.rule);
      expect(result.violations[0]!.field).toBe("descriptor");
    }
  });

  it("refuses it as a GATE, not as a lint violation, because nobody chose bad words", () => {
    // The distinction is the reason a reader gets: "your copy breaks a rule" would send a
    // clinician away to rewrite something, and no rewording would help.
    expect(SPECIALIST_NOT_PUBLISHED.rule).not.toContain("copy");
    expect(SPECIALIST_NOT_PUBLISHED.why).toContain("founder decision");
    expect(SPECIALIST_NOT_PUBLISHED.why).toContain("stricter than the law");
  });

  it("would trip its own linter if it rendered, which is why it does not try", () => {
    // Proof the refusal is necessary rather than cautious: any honest wording of specialist
    // registration contains the protected word, and the union refuses that word outright.
    const honest = "Holds specialist registration in endocrinology.";
    expect(lintDirectoryText(honest, "registration[0]").map((v) => v.rule)).toContain(
      "no-specialist",
    );
  });

  it("keeps the shape representable, because the law recognises it", () => {
    // The refusal is about copy, not about modelling. Deleting the variant would make the model
    // claim no such registration exists, which is a different and worse untruth.
    expect(SPECIALIST.descriptor.kind).toBe("recognised_specialist");
  });
});

describe("W187 rendering fails closed", () => {
  it("refuses the document rather than returning it with violations attached", () => {
    // A page plus a warning is a page. W6's posture: the compliant-looking artefact must not
    // exist. `displayName` is the reachable hole — W184 lints it, but a caller can construct a
    // profile object directly, and this is the last gate before a reader sees it.
    const bad: GeneralProfile = { ...GP, displayName: "Dr Example Name, Diabetes Specialist" };
    const result = renderProfile(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.map((v) => v.rule)).toContain("no-specialist");
      expect(result.violations[0]!.field).toBe("heading");
    }
  });

  it("catches the s 133 claim made as a verb, in composed copy", () => {
    const bad: GeneralProfile = { ...GP, displayName: "Dr Example Name who specialises in PMOS" };
    const result = renderProfile(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.map((v) => v.rule)).toContain("no-specialisation-claim");
    }
  });

  it("reports every violated line, not the first", () => {
    const bad: GeneralProfile = {
      ...GP,
      displayName: "Dr Expert Name",
      location: { ...GP.location, suburb: "Specialist Hill" },
    };
    const result = renderProfile(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(new Set(result.violations.map((v) => v.field)).size).toBeGreaterThan(1);
    }
  });
});

describe("W187 the rendered document keeps the structure it was checked in", () => {
  it("renders every line the linter walked, so nothing reaches a reader unchecked", () => {
    // If the text renderer emitted a line `renderedLines` does not report, that line would be
    // published without ever having been linted.
    const rendered = ok(GP);
    const text = renderProfileText(rendered);
    for (const { text: line } of renderedLines(rendered)) {
      expect(text, `rendered document omits a checked line: ${line}`).toContain(line);
    }
  });

  it("adds no prose of its own to the document", () => {
    // Anything the text renderer invents is copy nobody linted. Every non-empty line must come
    // from the structured object it was handed.
    const rendered = ok(GP);
    const known = new Set(renderedLines(rendered).map(({ text }) => text));
    for (const line of renderProfileText(rendered).split("\n")) {
      const stripped = line.replace(/^#+\s*/, "").trim();
      if (stripped === "") continue;
      expect(known, `renderer introduced unlinted copy: ${stripped}`).toContain(stripped);
    }
  });
});
