// W46: the figures register. Every number that appears in the sales deck or the
// one-pager must be declared here with a source, and the source must be something a
// reader can check: a module in this repo that computes it, or a dated published
// schedule. The register is the unit's "figures traceable" gate — a test asserts the
// declared value still equals what the code computes, so a figure cannot silently
// drift away from the product it describes.
//
// What this register deliberately does NOT contain: market-sizing and industry
// statistics ("X% of Australian GP appointments go unfilled"). Those need a real
// citation this build cannot verify offline, and a sales asset is exactly the wrong
// place to guess. They are listed in NEEDS_FOUNDER_VERIFICATION and are omitted from
// the generated assets until a source is supplied.

import { BRIEF_ASSUMPTIONS, computeRoi } from "@/economics/roi";
import { BULK_BILLED_LEVEL_B_ALL_IN, findItem } from "@/mbs/items";

export type FigureSource =
  /** Computed by a module in this repo — check the code path. */
  | { kind: "computed"; module: string; note: string }
  /** A published external schedule, pinned with its effective date. */
  | { kind: "published"; publication: string; effectiveFrom: string }
  /** A stated modelling assumption, not a measurement. */
  | { kind: "assumption"; note: string };

export interface Figure {
  id: string;
  /** How the figure is written in the asset (already formatted). */
  display: string;
  /** The raw value, so a test can compare it against the live computation. */
  value: number;
  label: string;
  source: FigureSource;
}

const roi = computeRoi(BRIEF_ASSUMPTIONS);

export const FIGURES: readonly Figure[] = [
  {
    id: "roi.net-annual-benefit",
    label: "Net annual benefit for a 10-GP practice",
    value: roi.netAnnualBenefit,
    display: "$45,029",
    source: {
      kind: "computed",
      module: "src/economics/roi.ts",
      note: "computeRoi(BRIEF_ASSUMPTIONS) — every input stated on the assumptions slide",
    },
  },
  {
    id: "roi.multiple",
    label: "Return on the Meherr subscription",
    value: roi.roiMultiple,
    display: "4.8×",
    source: {
      kind: "computed",
      module: "src/economics/roi.ts",
      note: "incremental revenue ÷ subscription cost, same model",
    },
  },
  {
    id: "roi.incremental-visits-year",
    label: "Incremental attended appointments a year",
    value: roi.annualIncrementalVisits,
    display: "711",
    source: {
      kind: "computed",
      module: "src/economics/roi.ts",
      note: "incremental only — displaced organic attendance is excluded",
    },
  },
  {
    id: "assumption.gp-count",
    label: "Practice size used in the worked example",
    value: BRIEF_ASSUMPTIONS.gpCount,
    display: "10",
    source: {
      kind: "assumption",
      note: "the worked example is a ten-GP practice; the ROI calculator takes the practice's own number",
    },
  },
  {
    id: "assumption.open-slot-rate",
    label: "Share of appointment capacity unfilled",
    value: BRIEF_ASSUMPTIONS.openSlotRate,
    display: "8%",
    source: {
      kind: "assumption",
      note: "modelling assumption used throughout the build; a pilot measures the real figure per practice",
    },
  },
  {
    id: "assumption.incremental-share",
    label: "Share of generated visits that are genuinely incremental",
    value: BRIEF_ASSUMPTIONS.incrementalShare,
    display: "60%",
    source: {
      kind: "assumption",
      note: "conservative modelling assumption; the holdout measures it for real once a practice runs",
    },
  },
  {
    id: "mbs.item23",
    label: "MBS item 23 patient rebate",
    value: findItem("23")!.rebate,
    display: "$43.90",
    source: { kind: "published", publication: "MBS item 23", effectiveFrom: "2025-07-01" },
  },
  {
    id: "mbs.bulk-billed-level-b-metro",
    label: "All-in bulk-billed Level B, metro",
    value: BULK_BILLED_LEVEL_B_ALL_IN.metro,
    display: "$69.56",
    source: {
      kind: "published",
      publication: "MBS bulk-billing incentives incl. 12.5% practice program",
      effectiveFrom: "2025-11-01",
    },
  },
];

export function figure(id: string): Figure {
  const found = FIGURES.find((f) => f.id === id);
  if (!found) throw new Error(`W46: figure "${id}" is not in the register`);
  return found;
}

/**
 * Claims a sales asset would like to make but this build cannot source. They are
 * NOT in the assets. Each needs a citation from the founder before it may appear.
 */
export const NEEDS_FOUNDER_VERIFICATION: readonly string[] = [
  "Australian market size: number of GP practices and clinicians addressable.",
  "Industry-wide unfilled-appointment rate (the 8% above is our modelling assumption, not a measured market figure).",
  "Benchmark DNA rates for Australian general practice.",
  "Any competitor comparison or win-rate claim.",
];
