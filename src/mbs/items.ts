// W34: MBS context tables — item metadata for REVENUE ESTIMATION ONLY.
// This is internal analytics data (practice-facing dashboards, ROI estimates). It never drives
// billing advice, never appears in patient-facing copy, and never selects a clinical action.
// Rebate values: 1 July 2025 MBS schedule as verified in the venture research
// (Stefan-Brain wiki/entrepreneurship/startups/extended-scope-gp-network-research.md §3).

export interface MbsItem {
  item: string;
  label: string;
  /** Patient rebate in AUD (GP non-referred attendances rebate at 100% of schedule fee). */
  rebate: number;
  category: "attendance" | "chronic_disease";
}

export const MBS_ITEMS: readonly MbsItem[] = [
  { item: "23", label: "Level B consultation (6–20 min)", rebate: 43.9, category: "attendance" },
  { item: "36", label: "Level C consultation (20–40 min)", rebate: 84.9, category: "attendance" },
  { item: "44", label: "Level D consultation (40+ min)", rebate: 125.1, category: "attendance" },
  { item: "965", label: "GP chronic condition management plan — prepare", rebate: 156.55, category: "chronic_disease" },
  { item: "967", label: "GP chronic condition management plan — review", rebate: 156.55, category: "chronic_disease" },
] as const;

/**
 * Bulk-billing incentive context (from 1 Nov 2025): universal incentives plus the 12.5%
 * practice program lift an all-in bulk-billed Level B to ~$69.56 metro / ~$86.91 remote.
 * Modelled here as all-in Level B values by region for estimation only.
 */
export const BULK_BILLED_LEVEL_B_ALL_IN = {
  metro: 69.56,
  remote: 86.91,
} as const;

export function findItem(item: string): MbsItem | undefined {
  return MBS_ITEMS.find((i) => i.item === item);
}

export interface RevenueAssumptions {
  /** Share of attended visits billed privately (rebate + gap) vs bulk-billed. */
  privateBilledShare: number; // 0..1
  /** Average private gap on top of the rebate, AUD. */
  averageGap: number;
  /** Region for bulk-billed all-in value. */
  region: keyof typeof BULK_BILLED_LEVEL_B_ALL_IN;
}

export const DEFAULT_ASSUMPTIONS: RevenueAssumptions = {
  privateBilledShare: 0.6,
  averageGap: 43, // Cleanbill 2025 average OOP for a standard consult
  region: "metro",
};

/**
 * Estimated collected revenue for one attended appointment of a given item.
 * Blend of private-billed (rebate + gap) and bulk-billed (all-in incentive value for
 * Level B; other items approximated by their rebate when bulk-billed).
 */
export function estimateRevenuePerVisit(item: string, a: RevenueAssumptions): number {
  const meta = findItem(item);
  if (!meta) throw new Error(`unknown MBS item ${item}`);
  const privateRevenue = meta.rebate + a.averageGap;
  const bulkBilled =
    meta.item === "23" ? BULK_BILLED_LEVEL_B_ALL_IN[a.region] : meta.rebate;
  return a.privateBilledShare * privateRevenue + (1 - a.privateBilledShare) * bulkBilled;
}

/** Annual incremental revenue estimate for the venture-brief practice model. */
export function estimateAnnualIncremental(
  attendedPerWeek: number,
  weeks: number,
  item: string,
  a: RevenueAssumptions = DEFAULT_ASSUMPTIONS,
): number {
  return attendedPerWeek * weeks * estimateRevenuePerVisit(item, a);
}
