// W94: barrier taxonomy — why a referral did not complete, as data.
//
// W93 says where a referral stopped. This says why, when — and only when — somebody actually
// said so. The whole unit is one rule: A BARRIER IS RECORDED, NEVER INFERRED.
//
// The temptation is obvious and worth naming, because it is what this module exists to
// refuse. Given a postcode, an appointment time and a cancellation, a plausible guess about
// cost or transport is easy to compute and would look useful on a dashboard. It would also be
// a claim about someone's circumstances that they never made, attached to their health
// record, and wrong often enough to matter. A practice acting on "probably a transport
// problem" for a patient who simply forgot has been misled by us.
//
// So the guarantee is structural, in the same shape W80 used for experience:
//
//   * There is NO FUNCTION HERE that takes patient attributes and returns barriers. The
//     absence is the guarantee — you cannot call what does not exist, and a test asserts the
//     module's exports contain no inference entry point.
//   * `BarrierSource` admits only who SAID it. There is no 'derived', 'inferred' or
//     'predicted' member, so an inferred barrier is unrepresentable rather than discouraged.
//   * Recording requires the words to have come from somewhere: a source and a recorded-at.
//
// The taxonomy is deliberately coarse. Four categories a receptionist can pick from in a
// second beat twenty they will not use, and a finer taxonomy would invite exactly the
// guessing this refuses.

import type { PatientId, PracticeId } from "@/domain/types";

export const BARRIER_CODES = ["cost", "timing", "transport", "uncertainty"] as const;
export type BarrierCode = (typeof BARRIER_CODES)[number];

/**
 * Practice-facing descriptions. Each is phrased as something a PERSON said, not as a
 * property of the person — "said the cost was a problem", never "cannot afford care".
 */
export const BARRIER_COPY: Record<BarrierCode, string> = {
  cost: "Said the cost was a problem",
  timing: "Said the available times did not work",
  transport: "Said getting there was a problem",
  uncertainty: "Said they were unsure whether to go",
};

/** Who said it. There is deliberately no derived or inferred member. */
export const BARRIER_SOURCES = ["patient_stated", "practice_recorded"] as const;
export type BarrierSource = (typeof BARRIER_SOURCES)[number];

export interface BarrierRecord {
  practiceId: PracticeId;
  patientId: PatientId;
  referralId: string;
  code: BarrierCode;
  source: BarrierSource;
  /** When it was recorded. A barrier with no recording time has no provenance. */
  recordedAt: string;
  /** Optional verbatim note. Never required, never generated. */
  note?: string | null;
}

export type RecordRefusal =
  | "unknown_barrier_code"
  | "missing_source"
  | "unknown_barrier_source"
  | "missing_recorded_at";

export type RecordResult =
  | { ok: true; record: BarrierRecord }
  | { ok: false; reason: RecordRefusal };

export interface BarrierInput {
  practiceId: PracticeId;
  patientId: PatientId;
  referralId: string;
  code: string;
  source: BarrierSource | null;
  recordedAt: string | null;
  note?: string | null;
}

function isBarrierCode(value: string): value is BarrierCode {
  return (BARRIER_CODES as readonly string[]).includes(value);
}

function isBarrierSource(value: string): value is BarrierSource {
  return (BARRIER_SOURCES as readonly string[]).includes(value);
}

/**
 * Record a barrier somebody stated.
 *
 * Refuses rather than defaults: there is no fallback source, because a barrier whose origin
 * we invented is exactly the inferred barrier this module exists to prevent.
 */
export function recordBarrier(input: BarrierInput): RecordResult {
  if (!isBarrierCode(input.code)) return { ok: false, reason: "unknown_barrier_code" };
  if (input.source === null) return { ok: false, reason: "missing_source" };
  // Checked at RUNTIME as well as in the type. The type stops our own code writing an
  // inferred source; this stops a form post, an ingest or a future API doing it, which is
  // where the value would actually come from. Same belt-and-braces as W55's CHECK.
  if (!isBarrierSource(input.source)) return { ok: false, reason: "unknown_barrier_source" };
  if (input.recordedAt === null || input.recordedAt.trim() === "") {
    return { ok: false, reason: "missing_recorded_at" };
  }

  return {
    ok: true,
    record: {
      practiceId: input.practiceId,
      patientId: input.patientId,
      referralId: input.referralId,
      code: input.code,
      source: input.source,
      recordedAt: input.recordedAt,
      note: input.note ?? null,
    },
  };
}

export interface BarrierTally {
  code: BarrierCode;
  count: number;
}

/**
 * Count recorded barriers by code, for one practice.
 *
 * Counts only what was recorded. A referral with no barrier record contributes to nothing —
 * there is deliberately no "unknown" bucket, because an unknown bucket invites filling it in.
 */
export function tallyBarriers(
  records: readonly BarrierRecord[],
  practiceId: PracticeId,
): BarrierTally[] {
  const counts = new Map<BarrierCode, number>();
  for (const record of records) {
    if (record.practiceId !== practiceId) continue;
    counts.set(record.code, (counts.get(record.code) ?? 0) + 1);
  }

  return BARRIER_CODES.filter((code) => counts.has(code))
    .map((code) => ({ code, count: counts.get(code)! }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

/** Barriers recorded against one referral, if any. */
export function barriersFor(
  records: readonly BarrierRecord[],
  practiceId: PracticeId,
  referralId: string,
): BarrierRecord[] {
  return records.filter((r) => r.practiceId === practiceId && r.referralId === referralId);
}

/**
 * How much of the picture is actually known.
 *
 * Reported so a practice reading a barrier chart knows what share of their leaked referrals
 * it covers. A chart of four bars over 6% of cases is not a finding, and the only honest way
 * to say so is to say so.
 */
export function coverage(
  records: readonly BarrierRecord[],
  practiceId: PracticeId,
  leakedReferralIds: readonly string[],
): { withBarrier: number; total: number; share: number } {
  const withBarrier = new Set(
    records.filter((r) => r.practiceId === practiceId).map((r) => r.referralId),
  );
  const total = leakedReferralIds.length;
  const covered = leakedReferralIds.filter((id) => withBarrier.has(id)).length;
  return { withBarrier: covered, total, share: total === 0 ? 0 : covered / total };
}
