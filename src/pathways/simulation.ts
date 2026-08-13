// W124: running a pathway over a synthetic cohort.
//
// The question this answers is NOT "is this pathway any good". It cannot be: the cohort is
// invented, and a distribution of verdicts over invented patients says nothing about medicine.
// What it does answer is a question nobody else in the stack can, and one that sinks pathways
// in the field:
//
//   HOW OFTEN CAN THIS PATHWAY BE DECIDED AT ALL? W120 returns `cannot_determine` when the
//   record says nothing either way. A pathway whose criteria lean on facts practices do not
//   routinely record is a pathway that will mostly return "we don't know" — and that is a
//   DATA AVAILABILITY finding, not a clinical one. It is worth knowing before a specialist
//   reviewer spends an afternoon on the content, and it is exactly the kind of thing that is
//   invisible until you run it over a population.
//
// Two constraints follow, and both are load-bearing.
//
//   THE COHORT'S RATES ARE ASSUMPTIONS, NOT PREVALENCE. Writing "30% of patients have fact X"
//   into a generator would be a clinical claim about how common something is, made by a build
//   unit. So the rates are supplied by the caller, defaulted to a flat arbitrary value, and
//   carried into the report as stated assumptions — W99's rule that a projection whose
//   assumptions are invisible gets quoted as a measurement, applied where the misreading would
//   be clinical rather than commercial.
//
//   THE REPORT IS DISTRIBUTIONAL ONLY. There is no per-patient output and no type that could
//   hold one. A simulated patient's verdict is meaningless, and a real one's would be a
//   clinical statement about a person — so the shape that would carry either does not exist.
//   W115 made the same move against per-clinician tallies.

import { chance, mulberry32 } from "@/synthetic/rng";
import { evaluatePathway, type RecordedFact } from "./evaluation";
import type { UsablePathway } from "./approval";

/**
 * How often a fact is recorded at all, and how often it is recorded present when it is.
 *
 * Both are ARBITRARY inputs, not estimates of anything. Naming them `rate` rather than
 * `prevalence` is deliberate: prevalence is a clinical quantity this product does not hold.
 */
export interface FactProfile {
  factCode: string;
  /** 0..1 — share of the cohort with ANY record for this fact. */
  recordedRate: number;
  /** 0..1 — of those with a record, the share recorded PRESENT. */
  presentRate: number;
}

export interface CohortSpec {
  size: number;
  seed: number;
  profiles: readonly FactProfile[];
}

/**
 * The default when a caller states nothing: every fact recorded half the time, present half of
 * those. Chosen to be obviously arbitrary rather than plausible — a number that looks like a
 * real rate invites somebody to quote it as one.
 */
export const ARBITRARY_RATE = 0.5;

export function flatProfiles(factCodes: readonly string[]): FactProfile[] {
  return factCodes.map((factCode) => ({
    factCode,
    recordedRate: ARBITRARY_RATE,
    presentRate: ARBITRARY_RATE,
  }));
}

/** Every fact code a pathway's criteria mention, in a stable order. */
export function factCodesOf(pathway: UsablePathway): string[] {
  const { inclusion, exclusion, escalation } = pathway.version.criteria;
  return [...new Set([...inclusion, ...exclusion, ...escalation].map((c) => c.factCode))].sort();
}

/**
 * Build one synthetic patient's recorded facts.
 *
 * Draws in a fixed order — profiles as given, one `recorded` draw then one `present` draw —
 * so a cohort is a pure function of (seed, size, profiles). Adding a profile changes later
 * patients, which is expected and is why the seed and the profiles are both in the report.
 */
function syntheticFacts(
  profiles: readonly FactProfile[],
  rng: () => number,
  index: number,
): RecordedFact[] {
  const facts: RecordedFact[] = [];
  for (const profile of profiles) {
    const isRecorded = chance(rng, profile.recordedRate);
    const isPresent = chance(rng, profile.presentRate);
    if (!isRecorded) continue;
    facts.push({
      code: profile.factCode,
      state: isPresent ? "recorded_present" : "recorded_absent",
      source: "pms_condition_flag",
      recordedAt: "2026-01-01",
      recordedBy: `synthetic-clinician-${index % 3}`,
    });
  }
  return facts;
}

export interface CountedCode {
  factCode: string;
  count: number;
}

export interface SimulationReport {
  pathwayId: string;
  versionHash: string;
  cohortSize: number;
  seed: number;
  /** Counts of W120's three outcomes. The whole of the numeric output. */
  distribution: { criteriaMet: number; criteriaNotMet: number; cannotDetermine: number };
  /** How often each fact code had nothing recorded. The headline finding — see the module note. */
  undeterminedBy: CountedCode[];
  /** How often each exclusion criterion was the reason. */
  excludedBy: CountedCode[];
  /** How often each escalation criterion fired. */
  escalatedBy: CountedCode[];
  /** The rates the cohort was built from, restated as what they are. */
  assumptions: string[];
  caveats: string[];
}

function tally(counts: Map<string, number>): CountedCode[] {
  return [...counts.entries()]
    .map(([factCode, count]) => ({ factCode, count }))
    // Count descending, then code — deterministic, and never ties broken by insertion order.
    .sort((a, b) => b.count - a.count || a.factCode.localeCompare(b.factCode));
}

export function simulatePathway(pathway: UsablePathway, cohort: CohortSpec): SimulationReport {
  const rng = mulberry32(cohort.seed);
  const distribution = { criteriaMet: 0, criteriaNotMet: 0, cannotDetermine: 0 };
  const undetermined = new Map<string, number>();
  const excluded = new Map<string, number>();
  const escalated = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

  for (let index = 0; index < cohort.size; index++) {
    const verdict = evaluatePathway(pathway, syntheticFacts(cohort.profiles, rng, index));
    if (verdict.outcome === "criteria_met") distribution.criteriaMet++;
    else if (verdict.outcome === "criteria_not_met") {
      distribution.criteriaNotMet++;
      for (const criterion of verdict.because) bump(excluded, criterion.factCode);
    } else {
      distribution.cannotDetermine++;
      for (const factCode of verdict.missingFactCodes) bump(undetermined, factCode);
    }
    for (const outcome of verdict.escalation) {
      if (outcome.status === "met") bump(escalated, outcome.criterion.factCode);
    }
  }

  const assumptions = cohort.profiles.map(
    (profile) =>
      `\`${profile.factCode}\`: recorded for ${Math.round(profile.recordedRate * 100)}% of the cohort; of those, ${Math.round(profile.presentRate * 100)}% recorded present. Both are arbitrary inputs, not estimates of how common anything is.`,
  );

  return {
    pathwayId: pathway.version.pathwayId,
    versionHash: pathway.version.versionHash,
    cohortSize: cohort.size,
    seed: cohort.seed,
    distribution,
    undeterminedBy: tally(undetermined),
    excludedBy: tally(excluded),
    escalatedBy: tally(escalated),
    assumptions,
    caveats: [
      "This is a distribution over an INVENTED cohort. It says nothing about whether this pathway is clinically appropriate, safe, or better than any alternative, and nothing about any real patient.",
      "The useful reading is operational: how often the pathway can be DECIDED at all. A high 'cannot determine' share means the criteria depend on facts that are not routinely recorded — a data availability finding, not a clinical one.",
      "No patient-level result is produced or retained. A simulated patient's verdict is meaningless and a real one's would be a clinical statement about a person.",
      "Same seed and same cohort spec produce the same report, byte for byte. A different seed is a different cohort, not a better estimate of anything.",
    ],
  };
}

const pct = (n: number, total: number) => (total === 0 ? "—" : `${Math.round((n / total) * 100)}%`);

function countTable(title: string, rows: readonly CountedCode[], total: number): string[] {
  if (rows.length === 0) return [];
  return [
    `### ${title}`,
    ``,
    `| Fact | Patients | Share of cohort |`,
    `|---|---|---|`,
    ...rows.map((row) => `| \`${row.factCode}\` | ${row.count} | ${pct(row.count, total)} |`),
    ``,
  ];
}

export function renderSimulationReport(report: SimulationReport): string {
  const total = report.cohortSize;
  return [
    `# Pathway simulation — ${report.pathwayId} (synthetic cohort)`,
    ``,
    `Version \`${report.versionHash.slice(0, 12)}\`, ${total} synthetic patients, seed ${report.seed}.`,
    ``,
    `## Distribution`,
    ``,
    `| Outcome | Patients | Share |`,
    `|---|---|---|`,
    `| Criteria met | ${report.distribution.criteriaMet} | ${pct(report.distribution.criteriaMet, total)} |`,
    `| Criteria not met | ${report.distribution.criteriaNotMet} | ${pct(report.distribution.criteriaNotMet, total)} |`,
    `| Cannot determine | ${report.distribution.cannotDetermine} | ${pct(report.distribution.cannotDetermine, total)} |`,
    ``,
    ...countTable("Facts that could not be determined", report.undeterminedBy, total),
    ...countTable("Criteria that ruled a patient out", report.excludedBy, total),
    ...countTable("Escalation criteria that fired", report.escalatedBy, total),
    `## What this report does not say`,
    ``,
    ...report.caveats.map((c) => `- ${c}`),
    ``,
    `## Cohort assumptions`,
    ``,
    ...report.assumptions.map((a) => `- ${a}`),
    ``,
  ].join("\n");
}
