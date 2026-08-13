// W201 verify gate: the ADM page enumerates every decision the tree makes, checked against the
// source rather than written from memory.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OPERATOR_COPY_SURFACES } from "@/compliance/cdss-boundary";
import { ACCEPTED_FINDINGS, sweepSurface, unaccepted } from "@/compliance/public-surfaces";
import {
  AUTOMATED_DECISIONS,
  HUMAN_CONTROLS,
  INFORMATION_USED,
  NEVER_AUTOMATED,
  NOT_A_DECISION,
  declaredModules,
  pageCopy,
} from "./automated-decisions";

const SRC = path.join(__dirname, "..");
const PAGE = path.join(SRC, "..", "app", "privacy", "automated-decisions", "page.tsx");
const ADM_PATH = "/privacy/automated-decisions";

function sourceFiles(): Array<{ module: string; text: string }> {
  const out: Array<{ module: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        out.push({
          module: `src/${path.relative(SRC, full).split(path.sep).join("/")}`,
          text: readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(SRC);
  return out;
}

/**
 * Modules that could be taking a decision about a patient.
 *
 * The union of two scans, because neither is sound alone — see the module note. The union scan
 * misses `registers/escalation.ts`, whose outcomes are an `EscalationRoute`; the identifier scan
 * misses `engine/eligibility.ts`, which takes ids as plain strings. This register is what closed
 * both holes, so the detector keeps both halves.
 */
function patientTouchingModules(): string[] {
  const namesAPatient = /\bPatientId\b|\bpatientId\b/;
  const decidesAnOutcome = /^export type [A-Za-z]*(Reason|Refusal|Exclusion|Verdict)\b/m;
  return sourceFiles()
    .filter(({ module, text }) => {
      // This register and its own machinery are excluded by PATH, which is the only exclusion
      // here and is stated rather than pattern-matched: a register that declared itself would be
      // answering its own question.
      if (module === "src/privacy/automated-decisions.ts") return false;
      return namesAPatient.test(text) || decidesAnOutcome.test(text);
    })
    .map((f) => f.module)
    .sort();
}

describe("W201 every decision the tree makes is accounted for", () => {
  it("finds the decision sites with a detector that is not vacuous", () => {
    const found = patientTouchingModules();
    expect(found.length).toBeGreaterThan(50);
    // Both halves of the detector earn their place. Drop either and a real decision goes missing.
    expect(found, "the identifier scan is what finds the escalation router").toContain(
      "src/registers/escalation.ts",
    );
    expect(found, "the outcome-union scan is what finds the eligibility engine").toContain(
      "src/engine/eligibility.ts",
    );
  });

  it("classifies every one of them, exactly once, in both directions", () => {
    // W102's shape. A module that starts deciding something about a patient fails here until
    // somebody says whether the published statement has to mention it.
    expect(declaredModules()).toEqual(patientTouchingModules());
  });

  it("declares no module twice and none that has left the tree", () => {
    const declared = declaredModules();
    expect(new Set(declared).size, "a module is declared twice").toBe(declared.length);
    for (const module of declared) {
      expect(existsSync(path.join(SRC, "..", module)), `${module} is declared and does not exist`).toBe(true);
    }
  });

  it("gives a reason for every module it rules out", () => {
    for (const [module, why] of Object.entries(NOT_A_DECISION)) {
      expect(why.length, `${module} is ruled out without a reason`).toBeGreaterThan(40);
    }
  });
});

describe("W201 the status of each decision is read from the tree, not asserted", () => {
  it("checks every content registry against what it actually holds", async () => {
    // The heart of the unit. "Built but not in use" is a claim in a published legal notice, and
    // the thing that makes it true is an empty registry — so the test imports the registry and
    // looks. A gate opening without this page changing fails here.
    for (const decision of AUTOMATED_DECISIONS) {
      if (!decision.registry) continue;
      const specifier = `@/${decision.registry.module.replace(/^src\//, "").replace(/\.ts$/, "")}`;
      const namespace = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>;
      const held = namespace[decision.registry.exportName];
      expect(Array.isArray(held), `${decision.registry.exportName} is not a registry`).toBe(true);
      const count = (held as unknown[]).length;
      if (decision.status === "built_not_in_use") {
        expect(count, `${decision.id} claims to be dormant but its registry has filled up`).toBe(0);
      } else {
        expect(count, `${decision.id} claims to be live over an empty registry`).toBeGreaterThan(0);
      }
    }
  });

  it("has at least one of each status, so neither branch is untested", () => {
    const statuses = AUTOMATED_DECISIONS.map((d) => d.status);
    expect(statuses).toContain("in_use");
    expect(statuses).toContain("built_not_in_use");
    // Both branches of the check above run against a real registry rather than skipping.
    expect(AUTOMATED_DECISIONS.filter((d) => d.registry && d.status === "in_use").length).toBeGreaterThan(0);
    expect(AUTOMATED_DECISIONS.filter((d) => d.registry && d.status === "built_not_in_use").length).toBeGreaterThan(0);
  });

  it("discloses the holdout arm, which three years of this page did not", () => {
    // Named, because the finding is the unit. A decision that withholds an offer of an
    // appointment from a specific person is the one an ADM notice most has to carry.
    const holdout = AUTOMATED_DECISIONS.find((d) => d.id === "holdout-arm");
    expect(holdout, "the holdout arm is not disclosed").toBeDefined();
    expect(holdout!.decidedBy).toContain("src/engine/holdout.ts");
    expect(holdout!.status).toBe("in_use");
    expect(AUTOMATED_DECISIONS[0]!.id, "the undisclosed one is not buried").toBe("holdout-arm");
  });
});

describe("W201 the page is the register, and the copy answers to the sweep", () => {
  it("renders from the register rather than restating it", () => {
    const page = readFileSync(PAGE, "utf8");
    // Each list must MAP over its register. Asserting the import alone was the first version and
    // it passed with the list replaced by `[].map` — the import survived, the page rendered
    // nothing, and a mutation check is the only reason that is not still true.
    for (const register of ["AUTOMATED_DECISIONS", "NEVER_AUTOMATED", "INFORMATION_USED", "HUMAN_CONTROLS"]) {
      expect(page, `the page does not render ${register}`).toContain(`{${register}.map(`);
    }
    // A hardcoded copy of a decision is the exact drift this unit exists to end, so the page must
    // not contain the text — it must map over it.
    for (const decision of AUTOMATED_DECISIONS) {
      expect(page, `${decision.id} is hardcoded into the page`).not.toContain(decision.what);
    }
    for (const line of [...NEVER_AUTOMATED, ...HUMAN_CONTROLS, ...INFORMATION_USED]) {
      expect(page, "a list item is hardcoded into the page").not.toContain(line);
    }
  });

  it("passes W192's public sweep with nothing new accepted", () => {
    // Pulled forward from e2e: this is the text that will be published, so it is linted here
    // rather than after the browser renders it. The acceptances are W192's existing ones — this
    // unit adds none, which is the bar for a page that just grew five sections.
    const findings = sweepSurface(ADM_PATH, "patient_notice", pageCopy());
    expect(unaccepted(findings, ACCEPTED_FINDINGS)).toEqual([]);
  });

  it("is the check W200's register says covers this module", () => {
    // W194's method note: when two registers describe the same module, test that they AGREE.
    // W200 declares this module's copy as answering to the patient_notice sweep rather than to
    // the advice rules, and points here. If somebody moves it back under the advice rules, the
    // two registers disagree and this fails — which a per-register test could never notice.
    const surface = OPERATOR_COPY_SURFACES.find((s) => s.module === "src/privacy/automated-decisions.ts");
    expect(surface, "W200's register has lost this module").toBeDefined();
    expect(surface!.operatorCopy, "W200 now lints this copy too; one of the two is wrong").toEqual([]);
    expect(surface!.notCopy).toContain("patient_notice");
  });

  it("still catches a claim, so the clean sweep means something", () => {
    // Non-vacuous: the sweep does fire on this page's audience when the copy earns it.
    const findings = sweepSurface(ADM_PATH, "patient_notice", "Rated 5/5 by our patients.");
    expect(unaccepted(findings, ACCEPTED_FINDINGS).length).toBeGreaterThan(0);
  });

  it("writes every decision to the patient it is about", () => {
    for (const decision of AUTOMATED_DECISIONS) {
      expect(decision.title.length, `${decision.id} has no title`).toBeGreaterThan(15);
      expect(decision.what.length, `${decision.id} is described in a phrase`).toBeGreaterThan(120);
      expect(decision.decidedBy.length, `${decision.id} names no module`).toBeGreaterThan(0);
    }
    expect(new Set(AUTOMATED_DECISIONS.map((d) => d.id)).size).toBe(AUTOMATED_DECISIONS.length);
    // The Year 2 page listed seven. Fewer than that now would mean the refresh lost something.
    expect(AUTOMATED_DECISIONS.length).toBeGreaterThan(7);
  });
});
