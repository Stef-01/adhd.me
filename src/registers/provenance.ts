// W62: register provenance UI — the presentation half of the W55/W56 guarantee.
//
// W55 made provenance impossible to *store* without a source (NOT NULL columns, a
// required IntervalProvenance type). W56's loader made it impossible to *load* one.
// Neither stops a view from quietly rendering an interval and leaving the source off,
// which is the failure this unit closes: an interval on screen with no visible source
// looks like Meherr's own clinical opinion rather than someone else's published
// guidance.
//
// So intervals reach the UI only as a ViewInterval, which cannot be constructed
// without its provenance line. The page renders that type and nothing else, and the
// e2e counts provenance lines against interval rows so an omission fails the gate
// rather than merely looking untidy.

import type { GuidelineInterval } from "@/domain/types";
import { wholeMonthsBetween } from "./caregap";

export interface ProvenanceView {
  /** Who published it — shown verbatim, never paraphrased. */
  citation: string;
  url: string;
  /** ISO date the source was last read. */
  reviewedOn: string;
  /** "today" / "3 days ago" / "2 months ago" — relative to an injected clock. */
  reviewedAgo: string;
}

export interface ViewInterval {
  id: string;
  name: string;
  /** "every 12 months" — the schedule, never a recommendation about a patient. */
  cadence: string;
  provenance: ProvenanceView;
}

const DAY_MS = 86_400_000;

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/** Plain relative age. Deliberately no staleness policy — that is not this unit's call. */
export function describeAge(reviewedOn: string, now: Date): string {
  const then = new Date(`${reviewedOn}T00:00:00Z`);
  if (Number.isNaN(then.getTime())) return "review date unreadable";

  // Compare date to date, not a UTC midnight to a wall clock. Meherr is an Australian
  // product (AEST = UTC+10), so a source retrieved "today" local time is a future instant in
  // UTC for the first ten hours of every day — which rendered "reviewed in the future" on the
  // one page whose job is making provenance credible.
  const days = daysBetween(then, new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`));
  if (days < 0) return "reviewed in the future";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  // Calendar months, with years derived FROM them, so the two can never disagree. The
  // previous mix of a 30-day month and a 365-day year made a source appear to get FRESHER
  // as it aged — 719 days read "23 months ago", 720 days read "1 year ago" — and any
  // fixed-length year makes an exact two-year-old source read as one year old.
  const months = wholeMonthsBetween(reviewedOn, now.toISOString().slice(0, 10));
  if (months < 24) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function cadenceLabel(intervalMonths: number): string {
  if (intervalMonths === 1) return "every month";
  return `every ${intervalMonths} months`;
}

/**
 * The only way an interval becomes renderable. Returns null rather than a
 * provenance-less view when the source is unusable, so a bad row is dropped from the
 * UI instead of appearing as an unsourced interval — the failure mode this unit exists
 * to prevent. Callers surface the drop; they cannot render around it.
 */
export function toViewInterval(interval: GuidelineInterval, now: Date): ViewInterval | null {
  const p = interval.provenance;
  if (!p) return null;

  const citation = typeof p.citation === "string" ? p.citation.trim() : "";
  const url = typeof p.url === "string" ? p.url : "";
  const reviewedOn = typeof p.retrievedOn === "string" ? p.retrievedOn : "";

  // Same bar the W56 loader applies, re-checked here because a view can be handed data
  // that never went through the loader (a mock store, a fixture, a future API).
  if (citation.length < 8) return null;
  if (!url.startsWith("https://")) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn)) return null;

  return {
    id: interval.id,
    name: interval.name,
    cadence: cadenceLabel(interval.intervalMonths),
    provenance: { citation, url, reviewedOn, reviewedAgo: describeAge(reviewedOn, now) },
  };
}

export interface ViewIntervals {
  /** Renderable intervals — every one carries a complete provenance line. */
  shown: ViewInterval[];
  /** How many were withheld for unusable provenance. Surfaced, never silent. */
  withheld: number;
}

export function toViewIntervals(
  intervals: readonly GuidelineInterval[],
  now: Date,
): ViewIntervals {
  const shown: ViewInterval[] = [];
  let withheld = 0;

  for (const interval of intervals) {
    const view = toViewInterval(interval, now);
    if (view) shown.push(view);
    else withheld += 1;
  }

  return { shown, withheld };
}
