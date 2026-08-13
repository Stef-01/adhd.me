// W56 (G5-safe half): the guideline-interval loader.
//
// W55 shipped the container: `GuidelineInterval` cannot exist in the type system without
// complete provenance, and 0004_registers.sql holds the same shape with NOT NULL columns.
// W56 as specified also ships the VALUES — real clinical intervals (diabetes cycle of care,
// KHA-CARI CKD monitoring, GPCCMP cadence). Those values are blocked on a founder G5 ruling
// (see the W56 row in BUILD-STATE.md), so this module ships the loading and validation half
// and an EMPTY catalogue.
//
// That split is deliberate, not a stub. The unit's verify gate is "every interval traceable
// to a cited source; no interval hardcoded in logic", and both halves of that are enforced
// here rather than by the values:
//
//   - traceable to a cited source: `loadIntervals` refuses any row whose provenance is
//     incomplete, non-https, or internally inconsistent. An interval without a citable
//     source cannot enter the catalogue, so the guarantee holds for whatever is loaded
//     later — it is a property of the loader, not of today's contents.
//   - no interval hardcoded in logic: consumers (W58 care-gap detection) read intervals
//     through `lookupInterval`, never from a constant. With an empty catalogue every
//     consumer must already handle "no interval for this condition", which is the same
//     path a not-yet-signed-off condition takes in production.
//
// Loading real values is then a data change behind the ruling, with no code change.

import type {
  ConditionCode,
  GuidelineInterval,
  GuidelineIntervalId,
  IntervalProvenance,
} from "@/domain/types";

export interface IntervalRejection {
  id: string;
  reason: string;
}

export interface IntervalCatalogue {
  intervals: readonly GuidelineInterval[];
  /** Rows refused at load, with why. Never silently dropped. */
  rejected: readonly IntervalRejection[];
}

/**
 * The shipped catalogue. Empty until the G5 ruling lands — a test asserts it, so this
 * cannot fill up by accident or by a well-meaning edit that skips the gate.
 */
export const SHIPPED_INTERVALS: readonly unknown[] = [];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validateProvenance(p: unknown): string | null {
  if (typeof p !== "object" || p === null) return "provenance missing";
  const { citation, url, publishedOn, retrievedOn } = p as Partial<IntervalProvenance>;
  if (typeof citation !== "string" || citation.trim().length < 8) {
    return "citation missing or too short to identify a source";
  }
  if (typeof url !== "string" || !url.startsWith("https://")) {
    return "source url must be https";
  }
  if (typeof publishedOn !== "string" || !ISO_DATE.test(publishedOn)) {
    return "publishedOn must be an ISO date";
  }
  if (typeof retrievedOn !== "string" || !ISO_DATE.test(retrievedOn)) {
    return "retrievedOn must be an ISO date";
  }
  // A source cannot be read before it existed; that ordering is also a CHECK in 0004.
  if (retrievedOn < publishedOn) return "retrievedOn precedes publishedOn";
  return null;
}

function validateRow(row: unknown): string | null {
  if (typeof row !== "object" || row === null) return "not an object";
  const r = row as Partial<GuidelineInterval>;
  if (typeof r.id !== "string" || r.id.trim() === "") return "id missing";
  if (typeof r.conditionCode !== "string" || r.conditionCode.trim() === "") {
    return "conditionCode missing";
  }
  if (typeof r.name !== "string" || r.name.trim() === "") return "name missing";
  if (typeof r.intervalMonths !== "number" || !Number.isFinite(r.intervalMonths)) {
    return "intervalMonths must be a number";
  }
  // An interval is a scheduling cadence. Zero or negative would mean "always due",
  // which is a contact loop, not a guideline; the ceiling catches unit mix-ups
  // (days entered where months belong).
  if (!Number.isInteger(r.intervalMonths) || r.intervalMonths < 1 || r.intervalMonths > 120) {
    return "intervalMonths must be a whole number of months between 1 and 120";
  }
  return validateProvenance(r.provenance);
}

/**
 * Build a catalogue from raw rows. Refusal is the default: anything that fails validation
 * is rejected with a reason rather than loaded in a degraded state, because a silently
 * dropped interval and a silently malformed one both end as "this patient was never
 * contacted" and neither is visible from the outside.
 */
export function loadIntervals(rows: readonly unknown[]): IntervalCatalogue {
  const intervals: GuidelineInterval[] = [];
  const rejected: IntervalRejection[] = [];
  const seen = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const raw = (row ?? {}) as Partial<GuidelineInterval>;
    const id = typeof raw.id === "string" && raw.id.trim() !== "" ? raw.id : `row-${index}`;
    const reason = validateRow(row);
    if (reason !== null) {
      rejected.push({ id, reason });
      continue;
    }
    if (seen.has(id)) {
      rejected.push({ id, reason: "duplicate interval id" });
      continue;
    }
    seen.add(id);
    intervals.push(row as GuidelineInterval);
  }

  return { intervals, rejected };
}

/** The catalogue actually in force. Empty until the G5 ruling — by design, not by omission. */
export function guidelineIntervals(): IntervalCatalogue {
  return loadIntervals(SHIPPED_INTERVALS);
}

/**
 * The one way logic may reach an interval. Returns null when the condition has no
 * signed-off interval, which every consumer must handle — today that is every condition.
 */
export function lookupInterval(
  catalogue: IntervalCatalogue,
  conditionCode: ConditionCode,
  name?: string,
): GuidelineInterval | null {
  const matches = catalogue.intervals.filter((i) => i.conditionCode === conditionCode);
  if (matches.length === 0) return null;
  if (name !== undefined) return matches.find((i) => i.name === name) ?? null;
  // Ambiguity is refused, not resolved by row order. Returning matches[0] meant which cited
  // source governed a patient's cadence depended on the order rows happened to load, so a
  // data-only reordering would silently flip gap counts — the opposite of "traceable to a
  // cited source". A condition with several cadences must be looked up BY NAME.
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

/** Every source cited by the catalogue — the audit view W90's gate dossier will want. */
export function citedSources(catalogue: IntervalCatalogue): string[] {
  return [...new Set(catalogue.intervals.map((i) => i.provenance.url))].sort();
}

export type { GuidelineInterval, GuidelineIntervalId };
