// W21: practice-economics / ROI model. A transparent, deterministic calculation
// from named assumptions to the numbers a practice manager cares about: how much
// unused capacity exists, how much of it ADHD.ME fills, how much of THAT is
// genuinely incremental (holdout-adjusted, not displaced organic attendance), and
// the revenue and return that follow.
//
// The default assumptions are the ones already encoded across this build — slot
// calibration (W3 synthetic generator), response/DNA rates (W12 sim), and
// $/visit (W20 report) — so every surface tells one story. ADHD.ME pricing is a
// stated assumption here; it is finalised at W47 (pricing pack). Revenue is only
// ever counted on INCREMENTAL visits, never the naive generated-booking count —
// the same honesty rule the attribution (W9) and weekly report (W20) enforce.

export interface RoiAssumptions {
  /** Participating GPs in the practice. */
  gpCount: number;
  /** Bookable slots per GP per week (W3: 24 slots/day × 5 days). */
  slotsPerGpPerWeek: number;
  /** Share of upcoming capacity that sits unfilled — the wedge (W3 calibration). */
  openSlotRate: number;
  /** Share of open slots ADHD.ME converts to a booking (W12 response rate). */
  fillRate: number;
  /** Share of generated bookings that do not attend (W12 DNA rate). */
  dnaRate: number;
  /** Share of attended generated visits that are genuinely incremental vs displaced. */
  incrementalShare: number;
  /** Practice billing per attended GP visit, AUD (W20 default). */
  revenuePerAttendedVisit: number;
  /** ADHD.ME subscription, AUD/month (pricing assumption — finalised W47). */
  adhdMeMonthlyFee: number;
}

export const BRIEF_ASSUMPTIONS: RoiAssumptions = {
  gpCount: 10,
  slotsPerGpPerWeek: 120,
  openSlotRate: 0.08,
  fillRate: 0.25,
  dnaRate: 0.05,
  incrementalShare: 0.6,
  revenuePerAttendedVisit: 80,
  adhdMeMonthlyFee: 990,
};

export interface RoiResult {
  openSlotsPerWeek: number;
  generatedBookingsPerWeek: number;
  attendedPerWeek: number;
  incrementalAttendedPerWeek: number;
  incrementalRevenuePerWeek: number;
  annualIncrementalVisits: number;
  annualIncrementalRevenue: number;
  annualAdhdMeCost: number;
  netAnnualBenefit: number;
  /** Incremental revenue ÷ ADHD.ME cost; 0 when cost is 0 (guarded). */
  roiMultiple: number;
}

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

export function computeRoi(a: RoiAssumptions): RoiResult {
  const openSlotsPerWeek = a.gpCount * a.slotsPerGpPerWeek * a.openSlotRate;
  const generatedBookingsPerWeek = openSlotsPerWeek * a.fillRate;
  const attendedPerWeek = generatedBookingsPerWeek * (1 - a.dnaRate);
  const incrementalAttendedPerWeek = attendedPerWeek * a.incrementalShare;
  const incrementalRevenuePerWeek = incrementalAttendedPerWeek * a.revenuePerAttendedVisit;
  const annualIncrementalVisits = incrementalAttendedPerWeek * WEEKS_PER_YEAR;
  const annualIncrementalRevenue = incrementalRevenuePerWeek * WEEKS_PER_YEAR;
  const annualAdhdMeCost = a.adhdMeMonthlyFee * MONTHS_PER_YEAR;
  const netAnnualBenefit = annualIncrementalRevenue - annualAdhdMeCost;
  const roiMultiple = annualAdhdMeCost === 0 ? 0 : annualIncrementalRevenue / annualAdhdMeCost;
  return {
    openSlotsPerWeek,
    generatedBookingsPerWeek,
    attendedPerWeek,
    incrementalAttendedPerWeek,
    incrementalRevenuePerWeek,
    annualIncrementalVisits,
    annualIncrementalRevenue,
    annualAdhdMeCost,
    netAnnualBenefit,
    roiMultiple,
  };
}
