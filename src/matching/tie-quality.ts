// W234 (O62): the tie-quality metric — how often the finder fails to separate the top.
//
// THE KPI CLARIFIER WORK MOVES (year plan Q2 item 8). A ranked list is only useful where the
// ranking actually separated somebody; a top band holding the whole roster is the finder
// saying "these are all the same to me", which the product does say out loud (the tie is
// honest) but should also MEASURE — because the clarifier exists precisely to shrink that
// number, and a KPI nobody computes is a goal nobody moves.
//
// ADAPTED TO THE ROSTER WE ACTUALLY HAVE. The plan's wording ("top band ties at size >3")
// assumes a large roster; the roster is three real GPs, where a size->3 threshold is
// unreachable and would make the metric permanently, meaninglessly green. So the report
// classifies every request by what its TOP BAND did, in terms that survive roster growth:
//   separated   — top band size 1: the stated preference chose a first row.
//   partialTie  — top band smaller than the roster but larger than 1.
//   unseparated — the WHOLE roster tied at the top: nothing in the words separated anybody.
// At roster size 3, unseparated IS the plan's "clarifier failed to separate"; at twenty
// clinicians the same definition tightens naturally (a full-roster tie is then a 20-way tie),
// and partialTie carries the >1 band sizes the plan wanted watched.
//
// MEASURED OVER THE CORPUS THE TREE ALREADY TRUSTS. The run is the W231 reach corpus's
// REACHING sentences — first-person requests the reader is pinned to hear. Sentences the
// reader cannot hear yet (aspires) are excluded on purpose: an unheard request produces an
// unordered list by design, and counting it against the clarifier would punish the honesty
// rules for existing. The gate in tie-quality.test.ts pins the measured counts in BOTH
// directions, REACH_FLOORS-style: a regression fails, and an improvement demands the pin
// move up rather than passing silently.

import { rankBands, type Clinician } from "@/demo/clinicians";
import { clinicians } from "@/demo/clinicians";
import { REACH_CORPUS } from "./corpus";

export type TieOutcome = "separated" | "partialTie" | "unseparated";

export interface TieQualityReport {
  /** How many corpus requests were measured (the reaching register, verbatim). */
  total: number;
  separated: number;
  partialTie: number;
  unseparated: number;
  /** separated / total, rounded to 3 dp — the headline the clarifier work moves. */
  separationRate: number;
}

/** Classify one request by what its top band did against this roster. */
export function tieOutcome(text: string, roster: readonly Clinician[] = clinicians): TieOutcome {
  const top = rankBands(text, roster)[0];
  const size = top?.clinicians.length ?? roster.length;
  if (size <= 1) return "separated";
  return size >= roster.length ? "unseparated" : "partialTie";
}

/** The corpus's reaching sentences — the synthetic run the plan says to track per. */
export function corpusRun(): readonly string[] {
  return REACH_CORPUS.filter((entry) => (entry.reaches?.length ?? 0) > 0).map((entry) => entry.text);
}

export function tieQualityReport(
  sentences: readonly string[] = corpusRun(),
  roster: readonly Clinician[] = clinicians,
): TieQualityReport {
  const report = { total: sentences.length, separated: 0, partialTie: 0, unseparated: 0 };
  for (const text of sentences) report[tieOutcome(text, roster)] += 1;
  return {
    ...report,
    separationRate: report.total === 0 ? 0 : Math.round((report.separated / report.total) * 1000) / 1000,
  };
}
