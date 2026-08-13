// W60: register store (mock, synthetic only — globalThis, same posture as the other
// phase-1 stores). Holds the register catalogue, each practice's enable/disable
// choices, and the counts the console renders.
//
// G5 BOUNDARY — read before adding to the catalogue:
// W56 (the real guideline intervals: diabetes cycle of care, KHA-CARI CKD monitoring,
// GPCCMP cadence) is BLOCKED pending a founder ruling on whether transcribed guidance
// is clinical content requiring sign-off. This unit needs a catalogue to render, so it
// ships PLACEHOLDERS that assert nothing clinical — neutral names, neutral intervals,
// and provenance that says outright it is not guidance. A test pins that, so real
// clinical values cannot arrive here ahead of the ruling by the back door.
//
// The gap counts are likewise carried, not computed: care-gap DETECTION is W58. This
// store is the seam the console renders from, and W58 becomes its real source.

import type {
  Condition,
  ConditionCode,
  GuidelineInterval,
  GuidelineIntervalId,
  PracticeId,
} from "@/domain/types";

export interface RegisterCounts {
  /** Patients on the register (W57 populates this for real). */
  memberCount: number;
  /** Members currently past their interval (W58 computes this for real). */
  gapCount: number;
}

export interface RegisterState {
  conditions: Condition[];
  intervals: GuidelineInterval[];
  /** Condition codes each practice has switched off. Absent practice ⇒ nothing disabled. */
  disabledByPractice: Record<string, ConditionCode[]>;
  /** Synthetic counts per practice per condition, until W57/W58 supply them. */
  countsByPractice: Record<string, Record<string, RegisterCounts>>;
}

const code = (value: string): ConditionCode => value as ConditionCode;

/**
 * Placeholder catalogue. Deliberately says nothing clinical: the names are generic,
 * and every provenance record states that it is not guidance. Real registers arrive
 * with W56 once the G5 scope question is settled.
 */
const PLACEHOLDER_PROVENANCE = {
  citation: "Synthetic placeholder — not clinical guidance, not a real source",
  url: "https://example.invalid/careyield-placeholder",
  publishedOn: "2026-01-01",
  retrievedOn: "2026-01-01",
} as const;

function seedCatalogue(): Pick<RegisterState, "conditions" | "intervals"> {
  const conditions: Condition[] = [
    {
      code: code("placeholder_register_a"),
      displayName: "Example register A",
      description: "Placeholder register used to exercise the console before real registers land.",
      active: true,
    },
    {
      code: code("placeholder_register_b"),
      displayName: "Example register B",
      description: "Second placeholder, so the console renders more than one row.",
      active: true,
    },
  ];

  const intervals: GuidelineInterval[] = [
    {
      id: "placeholder-interval-a1" as GuidelineIntervalId,
      conditionCode: code("placeholder_register_a"),
      name: "Example scheduled review",
      intervalMonths: 12,
      provenance: { ...PLACEHOLDER_PROVENANCE },
    },
    {
      id: "placeholder-interval-b1" as GuidelineIntervalId,
      conditionCode: code("placeholder_register_b"),
      name: "Example scheduled review",
      intervalMonths: 6,
      provenance: { ...PLACEHOLDER_PROVENANCE },
    },
  ];

  return { conditions, intervals };
}

function initial(): RegisterState {
  return { ...seedCatalogue(), disabledByPractice: {}, countsByPractice: {} };
}

const globalStore = globalThis as { __careyieldRegisters?: RegisterState };

export function getRegisters(): RegisterState {
  globalStore.__careyieldRegisters ??= initial();
  return globalStore.__careyieldRegisters;
}

export function resetRegisters(): RegisterState {
  globalStore.__careyieldRegisters = initial();
  return globalStore.__careyieldRegisters;
}

/** Seed synthetic counts for a practice (test/demo only — W57/W58 replace this). */
export function seedCounts(
  practiceId: PracticeId,
  counts: Record<string, RegisterCounts>,
): void {
  getRegisters().countsByPractice[practiceId] = counts;
}

export interface RegisterSummary {
  condition: Condition;
  intervals: GuidelineInterval[];
  enabled: boolean;
  counts: RegisterCounts;
}

const NO_COUNTS: RegisterCounts = { memberCount: 0, gapCount: 0 };

/**
 * What one practice sees. Disable choices are read per practice, so two practices
 * looking at the same catalogue can see different enabled states.
 */
export function registersFor(practiceId: PracticeId): RegisterSummary[] {
  const state = getRegisters();
  const disabled = state.disabledByPractice[practiceId] ?? [];
  const counts = state.countsByPractice[practiceId] ?? {};

  return state.conditions
    .filter((condition) => condition.active)
    .map((condition) => ({
      condition,
      intervals: state.intervals.filter((i) => i.conditionCode === condition.code),
      enabled: !disabled.includes(condition.code),
      counts: counts[condition.code] ?? NO_COUNTS,
    }));
}

export type SetEnabledResult =
  | { ok: true; enabled: boolean }
  | { ok: false; reason: "unknown_register" };

/**
 * Switch a register on or off for ONE practice. Writes are keyed by practice id, so a
 * practice can never change what another practice sees — the isolation the unit's
 * verify gate asks for, held in the data shape rather than by convention.
 */
export function setRegisterEnabled(
  practiceId: PracticeId,
  conditionCode: ConditionCode,
  enabled: boolean,
): SetEnabledResult {
  const state = getRegisters();
  if (!state.conditions.some((c) => c.code === conditionCode && c.active)) {
    // Refuse unknown codes rather than recording a disable for a register that does
    // not exist: a stale form post must not create phantom state.
    return { ok: false, reason: "unknown_register" };
  }

  const current = state.disabledByPractice[practiceId] ?? [];
  const next = enabled
    ? current.filter((c) => c !== conditionCode)
    : current.includes(conditionCode)
      ? current
      : [...current, conditionCode];

  state.disabledByPractice[practiceId] = next;
  return { ok: true, enabled };
}
