// W71: synthetic practice-recall data.
//
// Deliberately a SEPARATE module with its own seed rather than an addition to
// generate.ts. W17 learned this the hard way: drawing from the practice generator's
// shared `rng` shifts the stream every later draw depends on, which silently moved
// another unit's attribution invariant. Nothing here touches that stream — the
// reference practice generates identically whether or not recalls are asked for.

import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";
import type { PracticeRecall } from "@/registers/recalls";
import { isoDaysFrom } from "@/lib/dates";
import { chance, intBetween, mulberry32, pick } from "./rng";

export interface RecallGeneratorOptions {
  seed: number;
  practiceId: PracticeId;
  /** Patients eligible to be recalled — usually a register's members. */
  patientIds: readonly PatientId[];
  /** Condition codes the practice runs recalls for. */
  conditionCodes: readonly ConditionCode[];
  todayIso: string;
  /** Share of patients carrying an open recall. */
  openRate?: number;
  /** Share of recalls the practice recorded without a condition. */
  unscopedRate?: number;
  /** Share of recalls already closed — these must not suppress anything. */
  closedRate?: number;
}

const DEFAULTS = { openRate: 0.18, unscopedRate: 0.15, closedRate: 0.25 };

/**
 * A plausible spread of practice recalls: mostly condition-scoped and open, with a
 * minority unscoped (the practice recorded no condition) and a minority already closed.
 * Both minorities exist because they are the cases the dedup rule turns on.
 */
export function syntheticRecalls(options: RecallGeneratorOptions): PracticeRecall[] {
  const openRate = options.openRate ?? DEFAULTS.openRate;
  const unscopedRate = options.unscopedRate ?? DEFAULTS.unscopedRate;
  const closedRate = options.closedRate ?? DEFAULTS.closedRate;

  const rng = mulberry32(options.seed);
  const recalls: PracticeRecall[] = [];

  for (const patientId of options.patientIds) {
    if (!chance(rng, openRate)) continue;

    const closed = chance(rng, closedRate);
    const unscoped = chance(rng, unscopedRate) || options.conditionCodes.length === 0;
    const openedAt = isoDaysFrom(options.todayIso, -intBetween(rng, 7, 240));

    recalls.push({
      practiceId: options.practiceId,
      patientId,
      conditionCode: unscoped ? null : pick(rng, options.conditionCodes),
      status: closed ? "closed" : "open",
      openedAt,
      closedAt: closed ? isoDaysFrom(openedAt, intBetween(rng, 1, 60)) : null,
    });
  }

  return recalls;
}
