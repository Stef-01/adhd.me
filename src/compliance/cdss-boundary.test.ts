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
import { eachOf } from "@/quality/non-vacuous";

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
  "src/demo/pending-clinicians.ts": () => import("@/demo/pending-clinicians"),
  "src/matching/corpus.ts": () => import("@/matching/corpus"),
  "src/matching/tie-quality.ts": () => import("@/matching/tie-quality"),
  "src/matching/allocation.ts": () => import("@/matching/allocation"),
  "src/attribution/outbound-store.ts": () => import("@/attribution/outbound-store"),
  "src/onboarding/capture.ts": () => import("@/onboarding/capture"),
  "src/onboarding/applications-view.ts": () => import("@/onboarding/applications-view"),
  "src/onboarding/reach-report.ts": () => import("@/onboarding/reach-report"),
  "src/onboarding/expertise.ts": () => import("@/onboarding/expertise"),
  "src/demo/emotional-fit.ts": () => import("@/demo/emotional-fit"),
  "src/demo/roster.ts": () => import("@/demo/roster"),
  "src/quality/contradictions.ts": () => import("@/quality/contradictions"),
  "src/demo/synthetic-clinician.ts": () => import("@/demo/synthetic-clinician"),
  "src/matching/clarify.ts": () => import("@/matching/clarify"),
  "src/matching/needs.ts": () => import("@/matching/needs"),
  "src/matching/languages.ts": () => import("@/matching/languages"),
  "src/matching/provenance.ts": () => import("@/matching/provenance"),
  "src/matching/known-fps.ts": () => import("@/matching/known-fps"),
  "src/matching/read.ts": () => import("@/matching/read"),
  "src/matching/refused-cues.ts": () => import("@/matching/refused-cues"),
  "src/demo/real-person-fields.ts": () => import("@/demo/real-person-fields"),
  "src/matching/scale-fixture.ts": () => import("@/matching/scale-fixture"),
  "src/onboarding/background-store.ts": () => import("@/onboarding/background-store"),
  "src/onboarding/background.ts": () => import("@/onboarding/background"),
  "src/onboarding/interview.ts": () => import("@/onboarding/interview"),
  "src/onboarding/transcript.ts": () => import("@/onboarding/transcript"),
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
  "src/geo/suburbs.ts": () => import("@/geo/suburbs"),
  "src/matching/explain.ts": () => import("@/matching/explain"),
  "src/onboarding/store.ts": () => import("@/onboarding/store"),
  "src/onboarding/types.ts": () => import("@/onboarding/types"),
  "src/console/capacity.ts": () => import("@/console/capacity"),
  "src/capacity/coupling.ts": () => import("@/capacity/coupling"),
  "src/capacity/drift.ts": () => import("@/capacity/drift"),
  "src/console/interop.ts": () => import("@/console/interop"),
  "src/verticals/declare.ts": () => import("@/verticals/declare"),
  "src/verticals/undecided.ts": () => import("@/verticals/undecided"),
  "src/verticals/third.ts": () => import("@/verticals/third"),
  "src/platform/scope.ts": () => import("@/platform/scope"),
  "src/platform/scopes.ts": () => import("@/platform/scopes"),
  "src/platform/refusals.ts": () => import("@/platform/refusals"),
  "src/platform/api.ts": () => import("@/platform/api"),
  "src/interop/exchange.ts": () => import("@/interop/exchange"),
  "src/interop/disclosure-consent.ts": () => import("@/interop/disclosure-consent"),
  "src/interop/credentials.ts": () => import("@/interop/credentials"),
  "src/interop/disclosure-ledger.ts": () => import("@/interop/disclosure-ledger"),
  "src/interop/terminology.ts": () => import("@/interop/terminology"),
  "src/interop/contract.ts": () => import("@/interop/contract"),
  "src/interop/referral-profile.ts": () => import("@/interop/referral-profile"),
  "src/interop/fhir.ts": () => import("@/interop/fhir"),
  "src/capacity/attribution.ts": () => import("@/capacity/attribution"),
  "src/capacity/calendar.ts": () => import("@/capacity/calendar"),
  "src/capacity/copy.ts": () => import("@/capacity/copy"),
  "src/capacity/recommendation.ts": () => import("@/capacity/recommendation"),
  "src/capacity/score.ts": () => import("@/capacity/score"),
  "src/capacity/forecast.ts": () => import("@/capacity/forecast"),
  "src/capacity/model.ts": () => import("@/capacity/model"),
  "src/console/responses.ts": () => import("@/console/responses"),
  "src/outcomes/attribution-v2.ts": () => import("@/outcomes/attribution-v2"),
  "src/outcomes/counterfactual.ts": () => import("@/outcomes/counterfactual"),
  "src/outcomes/response.ts": () => import("@/outcomes/response"),
  "src/tenancy/store-reads.ts": () => import("@/tenancy/store-reads"),
  "src/verticals/binding.ts": () => import("@/verticals/binding"),
  "src/verticals/completeness.ts": () => import("@/verticals/completeness"),
  "src/verticals/consistency.ts": () => import("@/verticals/consistency"),
  "src/verticals/dermatology.ts": () => import("@/verticals/dermatology"),
  "src/verticals/model.ts": () => import("@/verticals/model"),
  "src/verticals/store.ts": () => import("@/verticals/store"),
  "src/voice/speech.ts": () => import("@/voice/speech"),
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
      for (const rederivation of property.rederivations) {
        expect(
          rederivation.note.length,
          `${property.id} ${rederivation.year} is asserted, not re-derived`,
        ).toBeGreaterThan(200);
      }
      expect(property.enforcedBy, `${property.id} names no test`).toMatch(/\.test\.ts/);
    }
  });

  it("re-derives every property against every year that has closed", () => {
    // W259 made this a list so a later year cannot overwrite an earlier answer. The years are
    // checked rather than counted: a property carrying only Y4 has not been re-derived at five.
    for (const property of eachOf(RAIL_PROPERTIES, "the G7 rail properties")) {
      const years = property.rederivations.map((r) => r.year);
      expect(years, `${property.id} is missing a year`).toEqual(["Y4", "Y5"]);
      expect(new Set(years).size, `${property.id} re-derives one year twice`).toBe(years.length);
    }
  });

  it("names a unit from the right year in each re-derivation, so none is about the old tree", () => {
    // Y4's re-derivations must cite a Y4 unit; Y5's must cite one from Y5, or it is a Y4 answer
    // with a new label — the exact carrying-forward the gate forbids.
    const FIRST_OF = { Y4: Y4_FIRST_UNIT, Y5: 209 } as const;
    // O211: BOTH loops are guarded, because they can go empty independently. An empty
    // RAIL_PROPERTIES is the silent catastrophe the rail register exists against; a property whose
    // `rederivations` is empty would skip this check for that property alone while the suite stayed
    // green — and the sibling test above only catches that because it happens to assert the year
    // list, which is a different claim that could be relaxed without anybody noticing this one lost
    // its subject.
    for (const property of eachOf(RAIL_PROPERTIES, "the G7 rail properties")) {
      for (const { year, note } of eachOf(property.rederivations, `${property.id}'s re-derivations`)) {
        const units = [...note.matchAll(/\bW(\d+)\b/g)].map((m) => Number(m[1]));
        expect(units.length, `${property.id} ${year} cites no unit at all`).toBeGreaterThan(0);
        const floor = FIRST_OF[year as keyof typeof FIRST_OF];
        expect(
          units.some((u) => u >= floor),
          `${property.id} ${year} re-derives against no ${year} unit — it cites ${units.join(", ")}`,
        ).toBe(true);
      }
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
    for (const surface of eachOf(OPERATOR_COPY_SURFACES, "the operator-copy surfaces")) {
      expect(surface.notCopy.length, `${surface.module} declares no reason`).toBeGreaterThan(60);
    }
  });

  it("names only exports that exist, and only exports with text in them", async () => {
    // The vacuity guard. `SILENCE_COPY` is a record of OBJECTS, and the first version of
    // `lintOperatorCopy` walked one level and returned zero texts for it — a clean result over
    // nothing. A lint that reaches no string cannot fail.
    for (const surface of eachOf(OPERATOR_COPY_SURFACES, "the operator-copy surfaces")) {
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
