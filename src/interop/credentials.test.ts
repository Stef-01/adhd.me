// W242 verify gate: "no credential in the tree; the loader enforces the gate rather than the values
// doing it (W56's shape); G1 named as the blocker for anything live."
//
// THE LOAD-BEARING TEST SUPPLIES A CREDENTIAL AND WATCHES IT BE REFUSED. A refusal that has only
// ever seen `undefined` is a refusal nobody has tested, and it would pass identically if the gate
// check were deleted and the emptiness were doing the work. That is the difference W56 drew and the
// difference this row asks for.
//
// The source scan is here too and is explicitly the SECOND line: it finds what it knows to look
// for, and a credential in a shape nobody anticipated walks past it.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { lintEducationCopy } from "@/education/advice-lint";
import { unacceptedCopy } from "@/compliance/cdss-boundary";
import {
  ALL_CREDENTIAL_SOURCES,
  CONFIGURED_INTEGRATIONS,
  CREDENTIAL_GATES,
  CREDENTIAL_REFUSAL_COPY,
  G1_OPEN,
  interopCredentials,
} from "./credentials";

/** A plausible secret. Not real, and the point is that being plausible changes nothing. */
const PLAUSIBLE = "hk_live_9f2c41ab77e04d5e8b6f0c3a1e7d2b95";

describe("W242 the loader enforces the gate, not the emptiness", () => {
  it("refuses a perfectly good credential, because the gate is shut", () => {
    // The whole unit. If the gate check were deleted and the tree's emptiness were doing the work,
    // this test would fail — which is exactly what makes it worth writing.
    const result = interopCredentials({
      integration: "best-practice",
      value: PLAUSIBLE,
      source: "process_environment",
    });
    expect(result.configured).toBe(false);
    if (result.configured) return;
    expect(result.why).toBe("gate_shut");
    expect(result.integration).toBe("best-practice");
    // And the reason names the GATE rather than the value, so nobody goes looking for a missing
    // environment variable that is not the problem.
    expect(result.copy).not.toMatch(/missing|not supplied|empty/i);
    expect(result.copy).toMatch(/G1/);
  });

  it("gives the same answer with a credential and without one, for the same reason", () => {
    const withOne = interopCredentials({ integration: "halo", value: PLAUSIBLE, source: "process_environment" });
    const without = interopCredentials({ integration: "halo", value: undefined, source: "process_environment" });
    expect(withOne.configured).toBe(false);
    expect(without.configured).toBe(false);
    if (withOne.configured || without.configured) return;
    expect(withOne.why).toBe(without.why);
    expect(withOne.why).toBe("gate_shut");
  });

  it("refuses a credential written into the tree first, and independently of the gate", () => {
    // Ordered before the gate check on purpose: a secret committed to a repository is disclosed the
    // moment it is written, and no later ruling undoes that. So this refusal must not wait for G1.
    const result = interopCredentials({
      integration: "hotdoc",
      value: PLAUSIBLE,
      source: "source_literal",
    });
    expect(result.configured).toBe(false);
    if (result.configured) return;
    expect(result.why).toBe("credential_in_source");
    expect(result.copy).toMatch(/refused whatever the gate says/);
  });

  it("keeps 'gate shut' and 'nothing supplied' as different refusals", () => {
    // They are different situations, and a reader who cannot tell them apart goes looking in the
    // wrong place. The second is unreachable today by construction — asserted, rather than left as
    // an apparent gap somebody removes.
    expect(Object.keys(CREDENTIAL_REFUSAL_COPY).sort()).toEqual([
      "credential_in_source",
      "gate_shut",
      "no_credential_supplied",
    ]);
    expect(G1_OPEN).toBe(false);
    const reachableToday = new Set(
      [
        interopCredentials({ integration: "x", value: PLAUSIBLE, source: "process_environment" }),
        interopCredentials({ integration: "x", value: undefined, source: "process_environment" }),
        interopCredentials({ integration: "x", value: PLAUSIBLE, source: "source_literal" }),
      ].flatMap((r) => (r.configured ? [] : [r.why])),
    );
    expect([...reachableToday].sort()).toEqual(["credential_in_source", "gate_shut"]);
    // `no_credential_supplied` becomes reachable the day G1 opens, which is why it exists now.
    expect(CREDENTIAL_REFUSAL_COPY.no_credential_supplied).toMatch(/different situations/);
  });

  it("declares one source for a credential, and the tree is not it", () => {
    expect(ALL_CREDENTIAL_SOURCES).toEqual(["process_environment"]);
    expect(CONFIGURED_INTEGRATIONS).toEqual([]);
  });
});

describe("W242 G1 is named, and the gates that do not cover this are named too", () => {
  it("carries the plan's own words for G1 rather than paraphrasing them", () => {
    // Two phrasings of one gate drift (W177), and a gate somebody has to go and look up is a gate
    // they will guess at. Checked against the plan itself.
    const plan = readFileSync(path.join(process.cwd(), "docs/FIVE-YEAR-PLAN.md"), "utf8");
    expect(plan).toContain(CREDENTIAL_GATES.G1.covers);
    expect(CREDENTIAL_GATES.G1.isTheBlocker).toBe(true);
    expect(CREDENTIAL_REFUSAL_COPY.gate_shut).toContain(CREDENTIAL_GATES.G1.covers);
  });

  it("says which gates do NOT cover credentials, and that they are not the blocker", () => {
    // A reader who assumes one gate covers everything is the reader who ships behind the wrong one.
    expect(CREDENTIAL_GATES.G8.isTheBlocker).toBe(false);
    expect(CREDENTIAL_GATES.G10.isTheBlocker).toBe(false);
    expect(CREDENTIAL_GATES.G8.covers).toMatch(/says nothing about credentials/);
    expect(CREDENTIAL_GATES.G10.covers).toMatch(/says nothing about credentials/);
    // Exactly one gate is the blocker, so "which one" is never a judgement call.
    const blockers = Object.entries(CREDENTIAL_GATES).filter(([, g]) => g.isTheBlocker);
    expect(blockers.map(([name]) => name)).toEqual(["G1"]);
    for (const [name, gate] of Object.entries(CREDENTIAL_GATES)) {
      expect(gate.definedIn, `${name} does not say where it is defined`).toMatch(/FIVE-YEAR-PLAN/);
    }
  });
});

describe("W242 the scan is the second line, not the gate", () => {
  it("finds no credential-shaped literal in either integration lane", () => {
    // Worth having and NOT the guarantee: it finds what it knows to look for. The first line is
    // that no code path exists to use one — which is the test at the top of this file.
    const lanes = ["src/interop", "src/pms"];
    let scanned = 0;
    const patterns = [
      /\b(sk|pk|hk|api)_(live|test|prod)_[A-Za-z0-9]{16,}/,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /\b(client_secret|api[_-]?key|access[_-]?token|password)\s*[:=]\s*["'][^"']{12,}["']/i,
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
    ];
    for (const lane of lanes) {
      for (const file of readdirSync(path.join(process.cwd(), lane)).filter((f) => f.endsWith(".ts"))) {
        const source = readFileSync(path.join(process.cwd(), lane, file), "utf8");
        scanned += 1;
        // This test file legitimately contains a plausible-looking string, and excluding it by name
        // is honest: a scan that had to be weakened to accommodate its own fixture would be weaker
        // for every other file too.
        if (file === "credentials.test.ts") continue;
        for (const pattern of patterns) {
          expect(source, `${lane}/${file} contains a credential-shaped literal`).not.toMatch(pattern);
        }
      }
    }
    expect(scanned, "the lane walk read nothing").toBeGreaterThan(10);
  });

  it("still fires on a credential, so a clean scan means something", () => {
    // A scan that cannot fail reports the same green over any tree at all.
    const pattern = /\b(sk|pk|hk|api)_(live|test|prod)_[A-Za-z0-9]{16,}/;
    expect(PLAUSIBLE).toMatch(pattern);
    expect("hk_live_short").not.toMatch(pattern);
  });

  it("passes the compliance linter, with one acceptance that is recorded rather than hidden", () => {
    // THE LINTER FIRES ON A VENDOR'S PRODUCT NAME, and that is worth stating rather than working
    // around. `no-benefit-claims` bans `\bbest\b` because "the best care in the area" is marketing a
    // patient reads; "Halo/Best Practice" is practice-management software, quoted from the plan's
    // own definition of G1. Rewording it would make the gate text wrong to make a scan quiet, and
    // narrowing the rule is what W164 already showed the cost of. So it goes through the tree's own
    // acceptance mechanism — per module, per export, per matched string, with a review date — and
    // this test checks the UNACCEPTED findings, which is the number that has to be zero.
    const findings = Object.values(CREDENTIAL_REFUSAL_COPY).flatMap((text) =>
      lintEducationCopy(text).map((v) => ({ ...v, module: "src/interop/credentials.ts", exportName: "CREDENTIAL_REFUSAL_COPY" })),
    );
    expect(unacceptedCopy(findings).map((f) => `${f.rule}: ${f.match}`)).toEqual([]);
    // Non-vacuity: the acceptance is covering a real finding, not sitting over nothing.
    expect(findings.map((f) => f.rule)).toContain("no-benefit-claims");
  });
});
