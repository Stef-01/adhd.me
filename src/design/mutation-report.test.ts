// AR13: the mutation report, checked against the real tree — and every failure mode proven
// catchable with synthetic breakage, because a register that cannot go red is the exact thing
// the quartet it describes was built to abolish.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ENFORCED_WITHOUT_PROBE,
  MUTATION_PROBES,
  PROBED_FAMILY_COUNT,
  diffMutationReport,
} from "./mutation-report";

const ROOT = path.resolve(__dirname, "../..");
const realFacts = {
  fileExists: (p: string) => existsSync(path.join(ROOT, p)),
  fileText: (p: string) => readFileSync(path.join(ROOT, p), "utf8"),
};

describe("AR13 the mutation report holds against the real tree", () => {
  it("every claim checks out: files exist, probes drive their real detectors, ids match, membership is honest", () => {
    const diff = diffMutationReport(realFacts);
    expect(diff.missingFiles, "a probe register entry names a file that is gone").toEqual([]);
    expect(diff.probeNotDrivingDetector, "a probe has drifted onto a copy of its detector").toEqual([]);
    expect(diff.probeWithoutVerdict, "a probe no longer takes the shared verdict").toEqual([]);
    expect(diff.ruleIdMismatch, "the register and a detector disagree about the rule id").toEqual([]);
    expect(diff.registerMembershipWrong, "an entry lies about taste-register membership").toEqual([]);
  });

  it("covers the register's enforced set exactly, both directions", () => {
    const diff = diffMutationReport(realFacts);
    expect(diff.enforcedUncovered, "an enforced rule is in neither list — the report stopped covering the register").toEqual([]);
    expect(diff.staleUnprobed, "an ENFORCED_WITHOUT_PROBE row is stale").toEqual([]);
  });

  it("pins the count: five probed families, six enforced rules awaiting a probe", () => {
    expect(MUTATION_PROBES.length).toBe(PROBED_FAMILY_COUNT);
    // AR28 re-pinned 4 -> 5 and 6 -> 5: layout.fold-governed graduated from
    // enforced-without-probe to the full architecture, exactly as its own
    // whatAProbeWouldMutate specified when AR19 parked it there.
    // AR18 re-pinned 5 -> 6: type.palette-tokens moved from unenforced (taste-register.ts) to
    // enforced-without-probe (theme-parity.ts's ratchet exists but is not yet a kill/restore probe).
    expect(PROBED_FAMILY_COUNT).toBe(5);
    expect(ENFORCED_WITHOUT_PROBE.length).toBe(6);
  });

  it("the two out-of-register families are exactly semantics and contrast", () => {
    expect(
      MUTATION_PROBES.filter((p) => p.registerRule === null).map((p) => p.family).sort(),
    ).toEqual(["contrast", "semantics"]);
  });

  it("every unprobed row says what its probe would mutate — a spec, not a shrug", () => {
    for (const row of ENFORCED_WITHOUT_PROBE) {
      expect(row.whatAProbeWouldMutate.length, row.ruleId).toBeGreaterThan(60);
    }
  });
});

describe("AR13 every failure mode is provable, not decorative", () => {
  const syntheticFs = (overrides: Record<string, string | null>) => ({
    fileExists: (p: string) =>
      p in overrides ? overrides[p] !== null : realFacts.fileExists(p),
    fileText: (p: string) =>
      p in overrides && overrides[p] !== null ? overrides[p]! : realFacts.fileText(p),
  });

  it("reports a vanished probe spec by family and path", () => {
    const diff = diffMutationReport({
      ...syntheticFs({ "e2e/support/touch-probe.spec.ts": null }),
    });
    expect(diff.missingFiles).toEqual(["touch-floor: e2e/support/touch-probe.spec.ts"]);
  });

  it("reports a probe that stopped importing its detector — the probe-against-a-copy drift", () => {
    const diff = diffMutationReport({
      ...syntheticFs({
        "e2e/support/accent-probe.spec.ts": 'import { probeVerdict } from "./probe";\n// a copy of the walk, pasted here',
      }),
    });
    expect(diff.probeNotDrivingDetector).toEqual([
      "accent: e2e/support/accent-probe.spec.ts does not import ./accent-load",
    ]);
  });

  it("reports a probe that dropped the shared verdict", () => {
    const diff = diffMutationReport({
      ...syntheticFs({
        "e2e/support/contrast-probe.spec.ts": 'import { contrastFindings } from "./contrast-load";',
      }),
    });
    expect(diff.probeWithoutVerdict).toEqual([
      "contrast: e2e/support/contrast-probe.spec.ts does not take probeVerdict from ./probe",
    ]);
  });

  it("reports a detector whose exported rule id has drifted from the register's", () => {
    const diff = diffMutationReport({
      ...syntheticFs({
        "e2e/support/semantics-load.ts": 'export const SEMANTICS_RULE_ID = "a11y.renamed";',
      }),
    });
    expect(diff.ruleIdMismatch).toEqual([
      'semantics: register says "a11y.semantic-structure (O160)", detector exports "a11y.renamed"',
    ]);
  });

  it("refuses membership lies in both directions", () => {
    const claimsRegister = diffMutationReport({
      ...realFacts,
      probes: [{ ...MUTATION_PROBES[2]!, registerRule: "a11y.semantic-structure (O160)" }],
      unprobed: [],
      enforcedRegisterIds: [],
    });
    expect(claimsRegister.registerMembershipWrong).toHaveLength(1);

    const deniesRegister = diffMutationReport({
      ...realFacts,
      probes: [{ ...MUTATION_PROBES[0]!, registerRule: null }],
      unprobed: [],
      enforcedRegisterIds: ["type.accent-live-tokens"],
    });
    expect(deniesRegister.registerMembershipWrong).toHaveLength(1);
  });

  it("reports an enforced rule the register has stopped covering, and a stale unprobed row", () => {
    const uncovered = diffMutationReport({
      ...realFacts,
      probes: [],
      unprobed: [],
      enforcedRegisterIds: ["honesty.claim-earned"],
    });
    expect(uncovered.enforcedUncovered).toEqual(["honesty.claim-earned"]);

    const stale = diffMutationReport({
      ...realFacts,
      probes: [MUTATION_PROBES[0]!],
      unprobed: [{ ruleId: "type.accent-live-tokens", whatAProbeWouldMutate: "x".repeat(70) }],
      enforcedRegisterIds: ["type.accent-live-tokens"],
    });
    expect(stale.staleUnprobed).toEqual(["type.accent-live-tokens"]);
  });
});
