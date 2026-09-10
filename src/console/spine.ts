// The console spine (docs/console-spine-brief.md): the home's live figures and the dashboard's
// period line, as functions the pages call rather than arithmetic they repeat.
//
// NOTHING HERE COMPUTES A NUMBER OF ITS OWN. The north star comes from the counterfactual the
// dashboard already prints, the under-full count is a filter over the capacity view's rows, and
// the period is read off the dashboard data. A withheld figure stays null all the way to the
// card; the home prints a word for it, never a nought.

import { isoDaysFrom } from "@/lib/dates";
import { counterfactual } from "@/outcomes/counterfactual";
import type { DashboardData } from "@/sim/dashboard-data";
import { DEFAULT_SIM_CONFIG, runSim, type SimResult } from "@/sim/harness";
import type { CapacitySessionRow } from "./capacity";

let cachedSim: SimResult | null = null;

/** The default sim, run once per process. The home's capacity card reads its appointments. */
export function defaultSim(): SimResult {
  cachedSim ??= runSim(DEFAULT_SIM_CONFIG);
  return cachedSim;
}

/** "6 Feb 2027": a date a manager reads without decoding. */
export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The period in words, from the data: "26 simulated weeks to 6 Feb 2027". */
export function simulatedPeriod(data: DashboardData): string {
  const last = data.weekly.at(-1);
  if (!last) return `${data.weeks} simulated weeks`;
  return `${data.weeks} simulated weeks to ${longDate(isoDaysFrom(last.weekStartIso, 6))}`;
}

/** The north star as the home prints it. Null when the claim is withheld, never zero. */
export function northStar(data: DashboardData): number | null {
  const cf = counterfactual(data.attribution);
  return cf.claimed ? data.attribution.incrementalPer1000 : null;
}

/**
 * Sessions that ran under full, over the sessions with a rate.
 *
 * A row with no rate is counted on neither side: it is not known to be full and not known to be
 * under full, and putting it in either pile would say something the record does not.
 */
export function underFull(rows: readonly CapacitySessionRow[]): { underFull: number; rated: number } {
  const rated = rows.filter((row) => row.utilisation !== null);
  return {
    underFull: rated.filter((row) => (row.utilisation as number) < 1).length,
    rated: rated.length,
  };
}
