// W200 verify gate: the five rail properties are re-derived and enforced, and the declared copy
// surface is checked against the tree in both directions.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EDUCATION_COPY_MODULES, lintEducationCopy } from "@/education/advice-lint";
import {
  ACCEPTED_COPY_FINDINGS,
  type CopyFinding,
  OPERATOR_COPY_SURFACES,
  RAIL_PROPERTIES,
  Y4_FIRST_UNIT,
  copyTexts,
  lintOperatorCopy,
  unacceptedCopy,
} from "./cdss-boundary";

const SRC = path.join(__dirname, "..");

/**
 * Every Y4 module, read off the tree.
 *
 * Membership comes from each module's own `// W<n>` header rather than a list here, so this
 * cannot agree with the register by construction — which is the failure W102 exists against.
 */
function y4Modules(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        const unit = readFileSync(full, "utf8").split("\n")[0]?.match(/^\/\/ W(\d+)/);
        if (unit && Number(unit[1]) >= Y4_FIRST_UNIT) {
          out.push(`src/${path.relative(SRC, full).split(path.sep).join("/")}`);
        }
      }
    }
  };
  walk(SRC);
  return out.sort();
}

/**
 * The namespaces, statically written because vite cannot resolve a computed import path.
 *
 * A hand-written map is exactly the thing this unit found wrong with W150's registry, so it is
 * checked against `y4Modules()` below and a Y4 module added tomorrow fails here until it is added.
 */
const NAMESPACES: Record<string, () => Promise<Record<string, unknown>>> = {
  "src/compliance/cdss-boundary.ts": () => import("./cdss-boundary"),
  "src/compliance/public-surfaces.ts": () => import("@/compliance/public-surfaces"),
  "src/directory/copy-lint.ts": () => import("@/directory/copy-lint"),
  "src/directory/correction.ts": () => import("@/directory/correction"),
  "src/directory/disclosure.ts": () => import("@/directory/disclosure"),
  "src/directory/fees.ts": () => import("@/directory/fees"),
  "src/directory/membership.ts": () => import("@/directory/membership"),
  "src/directory/profile.ts": () => import("@/directory/profile"),
  "src/directory/render.ts": () => import("@/directory/render"),
  "src/directory/search.ts": () => import("@/directory/search"),
  "src/engine/arm-stability.ts": () => import("@/engine/arm-stability"),
  "src/matching/match.ts": () => import("@/matching/match"),
  "src/ops/silence.ts": () => import("@/ops/silence"),
  "src/outcomes/agreement.ts": () => import("@/outcomes/agreement"),
  "src/outcomes/audit-export.ts": () => import("@/outcomes/audit-export"),
  "src/outcomes/dashboard.ts": () => import("@/outcomes/dashboard"),
  "src/outcomes/escalation-monitor.ts": () => import("@/outcomes/escalation-monitor"),
  "src/outcomes/model.ts": () => import("@/outcomes/model"),
  "src/outcomes/response-graph.ts": () => import("@/outcomes/response-graph"),
  "src/outcomes/time-to-escalation.ts": () => import("@/outcomes/time-to-escalation"),
  "src/privacy/automated-decisions.ts": () => import("@/privacy/automated-decisions"),
  "src/quality/latent-findings.ts": () => import("@/quality/latent-findings"),
  "src/quality/order-independence.ts": () => import("@/quality/order-independence"),
  "src/quality/order-regressions.ts": () => import("@/quality/order-regressions"),
  "src/reporting/model.ts": () => import("@/reporting/model"),
  "src/reporting/report.ts": () => import("@/reporting/report"),
  "src/reporting/retention.ts": () => import("@/reporting/retention"),
  "src/reporting/suppression.ts": () => import("@/reporting/suppression"),
  "src/matching/explain.ts": () => import("@/matching/explain"),
  "src/outcomes/counterfactual.ts": () => import("@/outcomes/counterfactual"),
  "src/outcomes/response.ts": () => import("@/outcomes/response"),
  "src/tenancy/store-reads.ts": () => import("@/tenancy/store-reads"),
  "src/verticals/binding.ts": () => import("@/verticals/binding"),
  "src/verticals/completeness.ts": () => import("@/verticals/completeness"),
  "src/verticals/consistency.ts": () => import("@/verticals/consistency"),
  "src/verticals/dermatology.ts": () => import("@/verticals/dermatology"),
  "src/verticals/model.ts": () => import("@/verticals/model"),
  "src/verticals/store.ts": () => import("@/verticals/store"),
};

async function allFindings(): Promise<CopyFinding[]> {
  const out: CopyFinding[] = [];
  for (const surface of OPERATOR_COPY_SURFACES) {
    const load = NAMESPACES[surface.module];
    if (!load) throw new Error(`${surface.module} has no namespace loader`);
    out.push(...lintOperatorCopy(surface, await load()));
  }
  return out;
}

describe("W200 the four rail properties plus the fifth, re-derived", () => {
  it("carries all five, each with a Y4 re-derivation and a test that enforces it", () => {
    expect(RAIL_PROPERTIES.map((p) => p.id).sort()).toEqual([
      "informs-never-advises",
      "never-concludes-from-silence",
      "never-decides-care-transferred",
      "never-selects-a-clinician",
      "writes-no-clinical-text",
    ]);
    for (const property of RAIL_PROPERTIES) {
      expect(property.statement.length, `${property.id} states nothing`).toBeGreaterThan(80);
      expect(property.establishedBy.length, `${property.id} cites no unit`).toBeGreaterThan(0);
      // The gate's word is RE-DERIVED. A one-line "still true" is the thing it forbids.
      expect(property.y4Rederivation.length, `${property.id} is asserted, not re-derived`).toBeGreaterThan(200);
      expect(property.enforcedBy, `${property.id} names no test`).toMatch(/\.test\.ts/);
    }
  });

  it("names a Y4 unit in every re-derivation, so none of them is about the old tree", () => {
    for (const property of RAIL_PROPERTIES) {
      const units = [...property.y4Rederivation.matchAll(/\bW(\d+)\b/g)].map((m) => Number(m[1]));
      expect(units.length, `${property.id} cites no unit at all`).toBeGreaterThan(0);
      expect(
        units.some((u) => u >= Y4_FIRST_UNIT),
        `${property.id} re-derives against no Y4 unit`,
      ).toBe(true);
    }
  });
});

describe("W200 the declared copy surface is checked against the tree", () => {
  it("declares every Y4 module, and declares no module that is not one", () => {
    // Both directions. A missing module is an unlinted surface; a stale entry is a register that
    // has stopped describing the tree, and W102's rule is that both fail.
    expect(OPERATOR_COPY_SURFACES.map((s) => s.module).sort()).toEqual(y4Modules());
    expect(y4Modules().length).toBeGreaterThan(20);
  });

  it("declares each module once", () => {
    // Named separately because the set comparison above reports a duplicate as a length mismatch
    // and buries which module it was. Two parallel builders declared `reporting/report.ts` in the
    // same merge window — W205 and W201 — and the diff took longer to read than the fix.
    const declared = OPERATOR_COPY_SURFACES.map((s) => s.module);
    const twice = declared.filter((m, i) => declared.indexOf(m) !== i);
    expect(twice, "declared twice").toEqual([]);
  });

  it("has a namespace loader for every declared module", () => {
    expect(Object.keys(NAMESPACES).sort()).toEqual(y4Modules());
  });

  it("says why the rest of a module is not operator copy, especially when nothing is", () => {
    for (const surface of OPERATOR_COPY_SURFACES) {
      expect(surface.notCopy.length, `${surface.module} declares no reason`).toBeGreaterThan(60);
    }
  });

  it("names only exports that exist, and only exports with text in them", async () => {
    // The vacuity guard. `SILENCE_COPY` is a record of OBJECTS, and the first version of
    // `lintOperatorCopy` walked one level and returned zero texts for it — a clean result over
    // nothing. A lint that reaches no string cannot fail.
    for (const surface of OPERATOR_COPY_SURFACES) {
      const namespace = await NAMESPACES[surface.module]!();
      for (const exportName of surface.operatorCopy) {
        expect(namespace, `${surface.module} has no export ${exportName}`).toHaveProperty(exportName);
        expect(
          copyTexts(namespace[exportName]).length,
          `${surface.module}#${exportName} yields no text to lint`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("reaches copy outside src/education/, which is the gap this unit found", () => {
    // W150's declared surface is six education files. The point of this register is that it is
    // not those six, so the disjointness is asserted rather than assumed.
    for (const declared of EDUCATION_COPY_MODULES) {
      expect(OPERATOR_COPY_SURFACES.map((s) => s.module)).not.toContain(declared);
    }
    const linted = OPERATOR_COPY_SURFACES.filter((s) => s.operatorCopy.length > 0);
    expect(linted.length, "nothing outside education is actually linted").toBeGreaterThan(10);
  });
});

describe("W200 the product informs and never advises, across everything Y4 added", () => {
  it("finds no unaccepted advice in any operator copy Y4 added", async () => {
    const unaccepted = unacceptedCopy(await allFindings());
    expect(
      unaccepted.map((f) => `${f.module}#${f.exportName}: ${f.rule} on "${f.match}"`),
    ).toEqual([]);
  });

  it("still fires on advice, so the clean result means something", () => {
    // Non-vacuous: the rules that returned nothing above do catch the sentence they exist for.
    expect(lintEducationCopy("You should review this patient against the new criteria.").map((v) => v.rule))
      .toContain("no-clinician-instruction");
    expect(lintEducationCopy("Consider a follow-up for this patient.").map((v) => v.rule))
      .toContain("no-soft-recommendation");
    expect(lintEducationCopy("This patient needs a review.").map((v) => v.rule))
      .toContain("no-patient-directed-claim");
  });

  it("accepts by module, export, rule and matched string, and every acceptance is live", async () => {
    // Both directions again. An acceptance that no longer matches anything is a rule quietly
    // relaxed for a sentence somebody has since deleted or reworded.
    const findings = await allFindings();
    for (const accepted of ACCEPTED_COPY_FINDINGS) {
      expect(
        findings.some(
          (f) =>
            f.module === accepted.module &&
            f.exportName === accepted.exportName &&
            f.rule === accepted.rule &&
            f.match.toLowerCase() === accepted.match.toLowerCase(),
        ),
        `${accepted.module}#${accepted.exportName} no longer produces ${accepted.rule} on "${accepted.match}"`,
      ).toBe(true);
      expect(accepted.why.length, `${accepted.module} is accepted without an argument`).toBeGreaterThan(150);
      expect(accepted.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // W205: compared against the CLOCK, not a frozen date. It was `> "2026-08-11"`, so every
      // acceptance passed forever — the review date was recorded and never enforced, which is a
      // control that looks exactly like a control that works. `src/security/audit-gate.ts` uses
      // a real clock for the same reason: an expiry a test cannot reach is a comment.
      const today = new Date().toISOString().slice(0, 10);
      expect(
        accepted.reviewBy > today,
        `${accepted.module}'s copy acceptance expired on ${accepted.reviewBy} and needs re-reviewing`,
      ).toBe(true);
    }
    expect(ACCEPTED_COPY_FINDINGS.length, "an acceptance list nobody had to write").toBeGreaterThan(0);
  });

  it("keeps the acceptances narrow — no rule is switched off anywhere", () => {
    // The failure mode this shape exists against: accepting a RULE rather than a string. Two
    // acceptances of the same rule in different modules are fine; a wildcard is not.
    for (const accepted of ACCEPTED_COPY_FINDINGS) {
      expect(accepted.match.trim().length, "an empty match accepts everything").toBeGreaterThan(0);
      expect(accepted.match, "a wildcard acceptance").not.toMatch(/^[*.]+$/);
      // The accepted string really is what the rule matches, not a paraphrase of it.
      expect(
        lintEducationCopy(accepted.match).map((v) => v.rule),
        `"${accepted.match}" does not itself trip ${accepted.rule}`,
      ).toContain(accepted.rule);
    }
  });
});
