// W95: synthetic referral histories, for the outreach console and its e2e.
//
// A separate module with its own seed, for the reason W17 learned and W71 restated: drawing
// from the practice generator's shared `rng` shifts the stream every later draw depends on.
// Nothing here touches that stream.
//
// The spread is chosen so that every branch of `planOutreach` has something to render. A
// fixture where all four stopping points do not appear would let the console look correct
// while a refusal path was quietly broken — the same trap W87 fell into by comparing a run
// against itself.

import type { PatientId, PracticeId } from "@/domain/types";
import { isoDaysFrom } from "@/lib/dates";
import type { BarrierRecord } from "@/referrals/barriers";
import { BARRIER_CODES } from "@/referrals/barriers";
import type { ReferralEvent, ReferralEventKind } from "@/referrals/leakage";
import type { PracticeRecall } from "@/registers/recalls";
import { intBetween, mulberry32, pick } from "./rng";

export interface ReferralGeneratorOptions {
  seed: number;
  practiceId: PracticeId;
  /** How many referral histories to produce. */
  count: number;
  todayIso: string;
}

export interface SyntheticReferrals {
  events: ReferralEvent[];
  barriers: BarrierRecord[];
  recalls: PracticeRecall[];
  patientIds: PatientId[];
}

/**
 * The five histories, in the proportions a practice would recognise: most referrals complete,
 * a minority stall at one of the three stopping points, and a few are withdrawn.
 */
const HISTORIES: ReadonlyArray<{ weight: number; kinds: readonly ReferralEventKind[] }> = [
  { weight: 5, kinds: ["referral_written", "completion_recorded"] },
  { weight: 3, kinds: ["referral_written"] },
  { weight: 2, kinds: ["referral_written", "appointment_recorded"] },
  { weight: 2, kinds: ["referral_written", "appointment_recorded", "appointment_cancelled"] },
  { weight: 1, kinds: ["referral_written", "referral_cancelled"] },
];

const WEIGHTED: ReadonlyArray<readonly ReferralEventKind[]> = HISTORIES.flatMap((h) =>
  Array.from({ length: h.weight }, () => h.kinds),
);

export function syntheticReferrals(options: ReferralGeneratorOptions): SyntheticReferrals {
  const rng = mulberry32(options.seed);
  const events: ReferralEvent[] = [];
  const barriers: BarrierRecord[] = [];
  const recalls: PracticeRecall[] = [];
  const patientIds: PatientId[] = [];

  for (let i = 0; i < options.count; i += 1) {
    const patientId = `syn-patient-${String(i + 1).padStart(3, "0")}` as PatientId;
    const referralId = `syn-ref-${String(i + 1).padStart(3, "0")}`;
    patientIds.push(patientId);

    const kinds = pick(rng, WEIGHTED);
    const writtenDaysAgo = intBetween(rng, 45, 240);
    kinds.forEach((kind, step) => {
      events.push({
        practiceId: options.practiceId,
        patientId,
        referralId,
        kind,
        at: `${isoDaysFrom(options.todayIso, -writtenDaysAgo + step * 14)}T09:00:00Z`,
      });
    });

    // Every fifth patient told the practice something; every seventh is already on the
    // practice's own recall list. Both are suppressors, so both must be present for the
    // console to show a non-empty withheld list.
    if (i % 5 === 2) {
      barriers.push({
        practiceId: options.practiceId,
        patientId,
        referralId,
        code: pick(rng, BARRIER_CODES),
        source: "patient_stated",
        recordedAt: `${isoDaysFrom(options.todayIso, -intBetween(rng, 5, 40))}T09:00:00Z`,
      });
    }
    if (i % 7 === 3) {
      recalls.push({
        practiceId: options.practiceId,
        patientId,
        conditionCode: null,
        status: "open",
        openedAt: isoDaysFrom(options.todayIso, -intBetween(rng, 10, 120)),
      });
    }
  }

  return { events, barriers, recalls, patientIds };
}
