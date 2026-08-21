// W222: the capacity model — sessions, slots, and utilisation that was actually recorded.
//
// The tree has session CONTROLS since W17 (who participates, which types may be filled, protected
// capacity, the scheduling window) and no session MODEL. Nothing in it can answer "how full does
// this clinician's Thursday usually run", which is the question everything Q18 plans to forecast
// rests on. So the model lands before the forecaster — W213's ordering argument in a second lane,
// because v2 is where the fallback arrives.
//
// THE ROW'S GATE IS THE WHOLE UNIT: A SESSION WITH NO RECORDED HISTORY YIELDS NO FORECAST RATHER
// THAN A DEFAULT. `SessionHistory` is a discriminated union whose no-history arm holds NO NUMERIC
// FIELD AT ALL — not a zero, not a null, nothing a forecaster can read a number out of. A
// `utilisation: 0` for a session nobody has observed is a confident claim about a diary, and it is
// the shape of the defect W215 found live: `(incrementalAttended ?? 0).toFixed(0)` printed a
// measured zero for a practice that simply had no comparison group.
//
// TWO CONFLATIONS ARE REFUSED WHILE DEFINING THE TERMS, because each produces a plausible number.
//
// (1) A SESSION THAT HAS NOT HAPPENED YET IS NOT A SESSION THAT WENT UNFILLED. Its open slots are
// unoffered, not rejected. Utilisation counts occurrences strictly before the as-of date, and the
// future is excluded in the grouping rather than filtered downstream — a later filter is a line
// somebody deletes, and the deletion looks like a simplification (W123).
//
// (2) A SESSION THAT OFFERED NO SLOTS HAS NO UTILISATION, NOT 0%. `filled / offered` with a zero
// denominator is NaN, or worse a zero that rounds into a percentage: an empty-looking diary
// invented from a division that never had an answer. It is a declared refusal, not an edge case.
//
// WHAT COUNTS AS OFFERED AND WHAT COUNTS AS FILLED ARE BOTH DECLARED, WITH A REASON EACH. Two
// judgements live in that table. A `dna` OCCUPIED the slot — the practice could not have given it
// to anybody else, and counting it as empty would report capacity that never existed. A
// `cancelled` was never on offer at all: it was withdrawn before it ran, so it belongs in neither
// the numerator nor the denominator. That second one is what makes the zero-denominator refusal
// reachable rather than theoretical — a clinician off sick has a whole list cancelled, and that
// session offered nothing, which is not the same as offering slots nobody took.
//
// NO PATIENT IDENTITY, BY TYPE. A session is a fact about a diary. A slot record is precisely the
// thing tempted to carry its occupant, so the occurrence type has nowhere to put one and the test
// asserts it on the value as well as the type.

import type { Appointment, AppointmentStatus } from "@/domain/types";
import type { RecordedBasis } from "@/reporting/model";

/** Weekday index as `Date.getUTCDay` reports it: 0 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_NAMES: Readonly<Record<Weekday, string>> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/**
 * What each appointment status means for capacity: was the slot on offer, and was it taken.
 *
 * Declared rather than switched on, and given a reason each, because two of the five are
 * judgements rather than bookkeeping. `filled` without `offered` is incoherent and the test
 * asserts no row does it.
 */
export const SLOT_STATUS: Readonly<
  Record<AppointmentStatus, { offered: boolean; filled: boolean; why: string }>
> = {
  open: { offered: true, filled: false, why: "A bookable slot that went unfilled. On offer, not taken." },
  booked: {
    offered: true,
    filled: true,
    why: "Somebody holds this slot, so the practice cannot offer it to anybody else.",
  },
  attended: { offered: true, filled: true, why: "The appointment happened in this slot." },
  dna: {
    offered: true,
    filled: true,
    why: "The patient did not attend, and the slot was held for them regardless — the practice could not have given it to somebody else. Counting this as an empty slot would report capacity the practice never had.",
  },
  cancelled: {
    offered: false,
    filled: false,
    why: "Withdrawn before it ran, so it was never capacity on offer. It belongs in neither the numerator nor the denominator: a session whose whole list was cancelled offered nothing, which is not the same as offering slots nobody took.",
  },
};

/**
 * One clinician's slots on one day: the unit a practice actually runs.
 *
 * No patient identity, no appointment ids and no times: those belong to the diary this is counted
 * from. What is here is what a capacity question needs and nothing further.
 */
export interface SessionOccurrence {
  clinicianId: string;
  dayIso: string;
  weekday: Weekday;
  slotsOffered: number;
  slotsFilled: number;
}

/** A recurring session, in the sense a practice means it: this clinician, this weekday. */
export interface SessionKey {
  clinicianId: string;
  weekday: Weekday;
}

export function sessionKeyOf(key: SessionKey): string {
  return `${key.clinicianId}::${key.weekday}`;
}

export type NoHistoryReason =
  /** The session has never run before the as-of date. Nothing has been observed. */
  | "never_run"
  /** It ran, and offered no slots at all. There is no denominator, so there is no rate. */
  | "no_slots_offered";

export const NO_HISTORY_COPY: Record<NoHistoryReason, string> = {
  never_run:
    "This session has not run before, so there is nothing recorded about how full it gets. That is not a session that runs empty — nothing has been observed either way.",
  no_slots_offered:
    "This session ran and offered no slots, so there is no figure to work a rate out of. A percentage needs something to be a percentage of, and reporting nought per cent here would describe a session that went unfilled rather than one that had nothing to fill.",
};

/**
 * What is recorded about how full a session runs.
 *
 * The no-history arm carries a reason and nothing else. There is no `utilisation: null`, no
 * `weeksRecorded: 0` and no optional number — the gate this unit answers to is that a forecaster
 * cannot read a default out of a session nobody has observed, and the only way to guarantee that
 * is for there to be nothing there to read.
 */
export type SessionHistory =
  | {
      recorded: true;
      /** Distinct past days on which this session ran. The floor W223 applies is applied to this. */
      occurrences: number;
      slotsOffered: number;
      slotsFilled: number;
      /** slotsFilled / slotsOffered. Only ever present with a non-zero denominator. */
      utilisation: number;
      basis: RecordedBasis;
    }
  | { recorded: false; why: NoHistoryReason; copy: string };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function weekdayOf(dayIso: string): Weekday {
  return new Date(`${dayIso}T00:00:00.000Z`).getUTCDay() as Weekday;
}

/**
 * Group a diary into past session occurrences.
 *
 * `asOfIso` is required and the future is dropped HERE: a slot that has not come round yet is
 * unoffered, and letting it reach the arithmetic as an unfilled one is the first conflation this
 * module refuses. Same-day is excluded too — a session part-way through has not finished being
 * filled, and counting it would report every Thursday morning as a poor Thursday.
 */
export function occurrencesFrom(
  appointments: readonly Appointment[],
  asOfIso: string,
): SessionOccurrence[] {
  if (!ISO_DAY.test(asOfIso)) throw new Error(`asOfIso must be an ISO date, got ${asOfIso}`);

  const byDay = new Map<string, SessionOccurrence>();
  for (const appointment of appointments) {
    const dayIso = appointment.startsAt.slice(0, 10);
    if (!ISO_DAY.test(dayIso)) continue;
    if (dayIso >= asOfIso) continue;

    // KEYED ON PRACTICE TOO. W234's review found this grouping on clinician and day alone, so a
    // diary holding two practices would merge sessions that happen to share a clinician id into
    // one. Latent rather than live — every caller feeds a single practice's diary — but a caller
    // had no way to scope it, and "the input happens to be narrow" is not a property of this
    // function. The practice id is dropped from the OCCURRENCE itself: a session is a fact about a
    // diary, and every occurrence in one report comes from the same practice by construction.
    const key = `${appointment.practiceId}::${appointment.clinicianId}::${dayIso}`;
    const existing = byDay.get(key) ?? {
      clinicianId: String(appointment.clinicianId),
      dayIso,
      weekday: weekdayOf(dayIso),
      slotsOffered: 0,
      slotsFilled: 0,
    };
    const status = SLOT_STATUS[appointment.status];
    if (status.offered) existing.slotsOffered += 1;
    if (status.filled) existing.slotsFilled += 1;
    byDay.set(key, existing);
  }

  return [...byDay.values()].sort((a, b) =>
    a.clinicianId === b.clinicianId ? a.dayIso.localeCompare(b.dayIso) : a.clinicianId.localeCompare(b.clinicianId),
  );
}

/** Every recurring session the diary has actually run, in a fixed order. */
export function sessionKeysFrom(occurrences: readonly SessionOccurrence[]): SessionKey[] {
  const keys = new Map<string, SessionKey>();
  for (const occurrence of occurrences) {
    keys.set(sessionKeyOf(occurrence), { clinicianId: occurrence.clinicianId, weekday: occurrence.weekday });
  }
  return [...keys.values()].sort((a, b) =>
    a.clinicianId === b.clinicianId ? a.weekday - b.weekday : a.clinicianId.localeCompare(b.clinicianId),
  );
}

/**
 * What the record holds about one recurring session, or the reason it holds nothing.
 *
 * The period is stamped on the basis rather than used to filter: `occurrencesFrom` has already
 * decided what is in the past, and two places deciding the same thing is how they come to disagree.
 */
export function sessionHistory(
  occurrences: readonly SessionOccurrence[],
  key: SessionKey,
  period: { fromIso: string; toIso: string },
): SessionHistory {
  const mine = occurrences.filter(
    (o) => o.clinicianId === key.clinicianId && o.weekday === key.weekday,
  );
  if (mine.length === 0) {
    return { recorded: false, why: "never_run", copy: NO_HISTORY_COPY.never_run };
  }

  let slotsOffered = 0;
  let slotsFilled = 0;
  for (const occurrence of mine) {
    slotsOffered += occurrence.slotsOffered;
    slotsFilled += occurrence.slotsFilled;
  }
  if (slotsOffered === 0) {
    return { recorded: false, why: "no_slots_offered", copy: NO_HISTORY_COPY.no_slots_offered };
  }

  return {
    recorded: true,
    occurrences: mine.length,
    slotsOffered,
    slotsFilled,
    utilisation: slotsFilled / slotsOffered,
    basis: {
      source: "the practice's own recorded diary",
      recordedFacts: slotsOffered,
      fromIso: period.fromIso,
      toIso: period.toIso,
    },
  };
}

export interface CapacityReport {
  asOfIso: string;
  period: { fromIso: string; toIso: string };
  sessions: readonly { key: SessionKey; label: string; history: SessionHistory }[];
}

/**
 * The whole diary as a value: every recurring session the practice has run, and what is recorded
 * about each. A session the practice has never run is absent rather than present-and-empty —
 * inventing a row for every clinician × weekday would manufacture six `never_run` refusals per
 * clinician per week and bury the sessions that exist.
 */
export function capacityReport(
  appointments: readonly Appointment[],
  asOfIso: string,
  period: { fromIso: string; toIso: string },
): CapacityReport {
  const occurrences = occurrencesFrom(appointments, asOfIso);
  return {
    asOfIso,
    period,
    sessions: sessionKeysFrom(occurrences).map((key) => ({
      key,
      label: `${key.clinicianId}, ${WEEKDAY_NAMES[key.weekday]}`,
      history: sessionHistory(occurrences, key, period),
    })),
  };
}
