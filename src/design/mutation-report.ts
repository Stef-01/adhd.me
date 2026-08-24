// AR13: the mutation report — which sweeps have a live probe, and which enforced rules do not
// (docs/AESTHETIC-REVIEW-PLAN.md Phase 2's closing row: "count pinned; a rule losing its probe
// fails the build").
//
// AR9-AR12 each proved one sweep can go red by driving its REAL detector from a mutation probe.
// This file is where that fact stops being four commit messages and becomes a register the build
// checks: every entry names the detector module, the probe spec that mutates against it, the
// sweep spec that enforces with it, and the rule id all three share. The test checks each claim
// against the filesystem in both directions (AR2's `enforcedBy` discipline, one level up) — a
// probe spec that vanishes, a probe that stops importing its detector (drifting back into the
// probe-against-a-copy failure AR9 was built to prevent), a detector whose exported rule id no
// longer matches this register, and a family probed but not listed here all go red in vitest,
// the hard gate, before the e2e suite is even reached.
//
// TWO FAMILIES LIVE OUTSIDE THE TASTE REGISTER, AND THE REPORT SAYS SO RATHER THAN ROUNDING IT
// OFF: semantics is O160's accessibility gate and contrast is O157's WCAG gate; neither has a
// `taste-register.ts` entry or a `taste-rule:` tag, which AR11 and AR12 each recorded at their
// rule ids. `registerRule: null` is that fact made checkable — the test refuses an entry that
// claims register membership it does not have, and refuses the reverse.
//
// THE OTHER HALF OF THE QUESTION — enforced rules with NO probe — is a list, not a shrug. Five
// register rules carry `enforcedBy` and no mutation probe; each entry says what a probe for it
// would have to mutate, so the next AR-lane unit that picks one up starts from a spec rather
// than from archaeology. The union of probed-register-rules and unprobed-enforced-rules must
// equal the register's enforced set exactly, both directions, so a rule gaining or losing
// enforcement moves this file or fails the build.

import { TASTE_RULES } from "./taste-register";

export interface ProbeEntry {
  /** Sweep-family name, matching the AR unit that built the probe. */
  readonly family: "accent" | "touch-floor" | "semantics" | "contrast";
  /** The id a red run names; must equal the detector module's exported *_RULE_ID. */
  readonly ruleId: string;
  /** The shared detector module the sweep AND the probe both drive. */
  readonly detectorModule: string;
  /** The mutation probe spec (e2e/support/, per AR8's placement precedent). */
  readonly probeSpec: string;
  /** The product sweep that enforces the rule with the same detector. */
  readonly sweepSpec: string;
  /** The taste-register rule this enforces, or null for the two out-of-register gates. */
  readonly registerRule: string | null;
}

export const MUTATION_PROBES: readonly ProbeEntry[] = [
  {
    family: "accent",
    ruleId: "type.accent-live-tokens",
    detectorModule: "e2e/support/accent-load.ts",
    probeSpec: "e2e/support/accent-probe.spec.ts",
    sweepSpec: "e2e/accent-discipline.spec.ts",
    registerRule: "type.accent-live-tokens",
  },
  {
    family: "touch-floor",
    ruleId: "interaction.touch-44",
    detectorModule: "e2e/support/touch-load.ts",
    probeSpec: "e2e/support/touch-probe.spec.ts",
    sweepSpec: "e2e/touch-floor.spec.ts",
    registerRule: "interaction.touch-44",
  },
  {
    family: "semantics",
    ruleId: "a11y.semantic-structure (O160)",
    detectorModule: "e2e/support/semantics-load.ts",
    probeSpec: "e2e/support/semantics-probe.spec.ts",
    sweepSpec: "e2e/semantics.spec.ts",
    registerRule: null,
  },
  {
    family: "contrast",
    ruleId: "wcag-aa.contrast (O157)",
    detectorModule: "e2e/support/contrast-load.ts",
    probeSpec: "e2e/support/contrast-probe.spec.ts",
    sweepSpec: "e2e/contrast.spec.ts",
    registerRule: null,
  },
];

/**
 * Pinned as a COUNT the way HEADERLESS_AT_W210 and INCOMPLETE_SWEEP_COUNT are: it falls only if
 * somebody deletes a probe (which the diff below reports by name first), and a fifth probe is a
 * deliberate edit to this file, never a silent arrival.
 */
export const PROBED_FAMILY_COUNT = 4;

/**
 * Register rules that carry `enforcedBy` and no mutation probe — the report's other half.
 * `whatAProbeWouldMutate` is the next builder's starting spec, written while the four probes'
 * shapes are fresh rather than reverse-engineered later.
 */
export const ENFORCED_WITHOUT_PROBE: ReadonlyArray<{
  readonly ruleId: string;
  readonly whatAProbeWouldMutate: string;
}> = [
  {
    ruleId: "honesty.claim-earned",
    whatAProbeWouldMutate:
      "Render the finder's results stage with an uninformed order and assert the 'ranked on what you asked for' claim is absent; probe on = inject the claim while the order is uninformed and the check must go red. Client-state mutation inside /finder, not a route sweep.",
  },
  {
    ruleId: "honesty.no-testimonials",
    whatAProbeWouldMutate:
      "Inject a testimonial-shaped block (quote + attribution + rating vocabulary) on one public route and assert public-sweep's detector reports it by name.",
  },
  {
    ruleId: "interaction.errors-plain",
    whatAProbeWouldMutate:
      "Drive the voice module's faked recogniser (speech.test.ts) into an error carrying error-code language and assert the copy check refuses it — a vitest probe, since the check is not route-based.",
  },
  {
    ruleId: "interaction.hover-focus",
    whatAProbeWouldMutate:
      "Inject a focusable control with outline:none and no :focus-visible replacement on one route and assert keyboard-focus's walk reports it.",
  },
  {
    ruleId: "motion.reduced-motion",
    whatAProbeWouldMutate:
      "Under emulated prefers-reduced-motion, inject an element animating without a static equal and assert the landing-motion check reports it; today's check pins source, so the probe needs the rendered-behaviour half first.",
  },
];

export interface MutationReportDiff {
  /** Entries whose probe/sweep/detector file is gone. */
  readonly missingFiles: string[];
  /** Probe specs that no longer import their detector module — a probe against a copy. */
  readonly probeNotDrivingDetector: string[];
  /** Probe specs that no longer take the shared verdict from e2e/support/probe.ts. */
  readonly probeWithoutVerdict: string[];
  /** Entries whose ruleId does not match the detector's exported *_RULE_ID. */
  readonly ruleIdMismatch: string[];
  /** Entries claiming a register rule the register does not enforce, or claiming none while the register enforces their id. */
  readonly registerMembershipWrong: string[];
  /** Enforced register rules in neither list — the report has stopped covering the register. */
  readonly enforcedUncovered: string[];
  /** ENFORCED_WITHOUT_PROBE rows that are stale: no longer enforced, or now probed. */
  readonly staleUnprobed: string[];
}

/**
 * Pure diff over facts the test gathers from the filesystem and the register, so every failure
 * mode is provable with synthetic inputs (the AR3/AR5 shape).
 */
export function diffMutationReport(facts: {
  readonly fileExists: (path: string) => boolean;
  readonly fileText: (path: string) => string;
  readonly probes?: readonly ProbeEntry[];
  readonly unprobed?: ReadonlyArray<{ readonly ruleId: string; readonly whatAProbeWouldMutate: string }>;
  readonly enforcedRegisterIds?: readonly string[];
}): MutationReportDiff {
  const probes = facts.probes ?? MUTATION_PROBES;
  const unprobed = facts.unprobed ?? ENFORCED_WITHOUT_PROBE;
  const enforced =
    facts.enforcedRegisterIds ?? TASTE_RULES.filter((r) => r.enforcedBy?.length).map((r) => r.id);

  const missingFiles: string[] = [];
  const probeNotDrivingDetector: string[] = [];
  const probeWithoutVerdict: string[] = [];
  const ruleIdMismatch: string[] = [];
  const registerMembershipWrong: string[] = [];

  for (const entry of probes) {
    for (const path of [entry.detectorModule, entry.probeSpec, entry.sweepSpec]) {
      if (!facts.fileExists(path)) missingFiles.push(`${entry.family}: ${path}`);
    }
    if (!facts.fileExists(entry.probeSpec) || !facts.fileExists(entry.detectorModule)) continue;

    const probeText = facts.fileText(entry.probeSpec);
    const detectorBase = entry.detectorModule.replace("e2e/support/", "./").replace(/\.ts$/, "");
    if (!probeText.includes(`from "${detectorBase}"`)) {
      probeNotDrivingDetector.push(`${entry.family}: ${entry.probeSpec} does not import ${detectorBase}`);
    }
    if (!probeText.includes(`from "./probe"`)) {
      probeWithoutVerdict.push(`${entry.family}: ${entry.probeSpec} does not take probeVerdict from ./probe`);
    }
    const detectorText = facts.fileText(entry.detectorModule);
    const exported = /export const \w*RULE_ID = "([^"]+)"/.exec(detectorText)?.[1];
    if (exported !== entry.ruleId) {
      ruleIdMismatch.push(`${entry.family}: register says "${entry.ruleId}", detector exports "${exported ?? "nothing"}"`);
    }
    const inRegister = enforced.includes(entry.ruleId);
    if (entry.registerRule !== null && !inRegister) {
      registerMembershipWrong.push(`${entry.family}: claims register rule ${entry.registerRule}, which the register does not enforce`);
    }
    if (entry.registerRule === null && inRegister) {
      registerMembershipWrong.push(`${entry.family}: claims to live outside the register, but ${entry.ruleId} is an enforced register rule`);
    }
  }

  const probedRegisterIds = probes.filter((p) => p.registerRule !== null).map((p) => p.ruleId);
  const unprobedIds = unprobed.map((u) => u.ruleId);
  const enforcedUncovered = enforced.filter(
    (id) => !probedRegisterIds.includes(id) && !unprobedIds.includes(id),
  );
  const staleUnprobed = unprobedIds.filter(
    (id) => !enforced.includes(id) || probedRegisterIds.includes(id),
  );

  return {
    missingFiles,
    probeNotDrivingDetector,
    probeWithoutVerdict,
    ruleIdMismatch,
    registerMembershipWrong,
    enforcedUncovered,
    staleUnprobed,
  };
}
