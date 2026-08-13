// W80: case-mix telemetry — derive a clinician's EXPERIENCE from what they actually did.
//
// W79 established that interest, experience and competence are three different things. This
// module is the only way experience is ever written, and its whole job is to keep that
// promise: experience is counted from attended visits, never stated by anyone.
//
// The unit's gate is "no self-reported data promoted to experience". That is enforced three
// ways rather than trusted:
//
//   1. The function's INPUTS cannot carry a self-report. It takes attended appointments and
//      register memberships. There is no parameter a claim could arrive through, so there is
//      no code path that promotes one — a test asserts the ClinicianInterest type is not
//      accepted here at all.
//   2. Output is pinned to `source: "derived_case_mix"`, the literal W79's CHECK constraint
//      admits. An experience row carrying any other provenance cannot be constructed.
//   3. Attendance is the only qualifying event. A booking that was not attended is not
//      experience of anything, and neither is a cancellation.
//
// The W15 usefulness signal is carried ALONGSIDE the count, never folded into it. A visit the
// clinician judged unreasonable still happened — they still saw that presentation — so it
// counts as experience while being reported separately as a quality signal. Blending the two
// into one "adjusted" number would produce a score that is neither a count nor a judgement,
// and W79's separation exists precisely to stop numbers like that.

import type {
  Appointment,
  ClinicianExperience,
  ClinicianId,
  ConditionCode,
  OutcomeRecord,
  PracticeId,
  RegisterMembership,
} from "@/domain/types";

export interface CaseMixWindow {
  fromIso: string;
  toIso: string;
}

export interface CaseMixInput {
  practiceId: PracticeId;
  /** Attended visits are the only qualifying evidence; others are ignored. */
  appointments: readonly Appointment[];
  /** Which patients are on which register — the only way a visit gets a condition. */
  memberships: readonly RegisterMembership[];
  /** W15 outcomes, carried alongside the count and never folded into it. */
  outcomes?: readonly OutcomeRecord[];
  window: CaseMixWindow;
  computedAtIso: string;
}

/** The W15 signal, reported next to the count rather than blended into it. */
export interface UsefulnessSignal {
  /** Visits in this cell that carry a W15 outcome record at all. */
  audited: number;
  /** Of those, how many the clinician judged reasonable. */
  judgedReasonable: number;
}

export interface ExperienceCell {
  experience: ClinicianExperience;
  usefulness: UsefulnessSignal;
}

function inWindow(appointment: Appointment, window: CaseMixWindow): boolean {
  const date = appointment.startsAt.slice(0, 10);
  return date >= window.fromIso && date <= window.toIso;
}

/**
 * Count attended visits per clinician per condition.
 *
 * A patient on several registers contributes their visit to EACH of them. That is the same
 * overlap W72 reports for cohorts: the clinician did see that person, and which register the
 * visit "really" belonged to is not knowable from appointment data. Cells therefore do not
 * sum to the clinician's total attended visits, and `deriveCaseMix` never claims they do.
 */
export function deriveCaseMix(input: CaseMixInput): ExperienceCell[] {
  const registersOf = new Map<string, Set<ConditionCode>>();
  for (const m of input.memberships) {
    if (m.practiceId !== input.practiceId) continue;
    if (m.removedAt !== null) continue;
    const set = registersOf.get(m.patientId as string) ?? new Set<ConditionCode>();
    set.add(m.conditionCode);
    registersOf.set(m.patientId as string, set);
  }

  const reasonableByAppointment = new Map<string, boolean>();
  for (const outcome of input.outcomes ?? []) {
    if (outcome.practiceId !== input.practiceId) continue;
    reasonableByAppointment.set(outcome.appointmentId as string, outcome.clinicianJudgedReasonable);
  }

  interface Tally {
    attended: number;
    audited: number;
    judgedReasonable: number;
  }
  const cells = new Map<string, Tally>();

  for (const appointment of input.appointments) {
    if (appointment.practiceId !== input.practiceId) continue;
    // Attendance is the only qualifying event: a booking that did not happen is not
    // experience of anything, and neither is a cancellation.
    if (appointment.status !== "attended") continue;
    if (appointment.patientId === null) continue;
    if (!inWindow(appointment, input.window)) continue;

    const conditions = registersOf.get(appointment.patientId as string);
    if (!conditions) continue; // no register, no condition to attribute the visit to

    const judged = reasonableByAppointment.get(appointment.id as string);

    for (const conditionCode of conditions) {
      const key = `${appointment.clinicianId}::${conditionCode}`;
      const tally = cells.get(key) ?? { attended: 0, audited: 0, judgedReasonable: 0 };
      tally.attended += 1;
      if (judged !== undefined) {
        tally.audited += 1;
        if (judged) tally.judgedReasonable += 1;
      }
      cells.set(key, tally);
    }
  }

  return [...cells.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, tally]) => {
      const [clinicianId, conditionCode] = key.split("::");
      return {
        experience: {
          practiceId: input.practiceId,
          clinicianId: clinicianId as ClinicianId,
          conditionCode: conditionCode as ConditionCode,
          attendedVisits: tally.attended,
          windowFrom: input.window.fromIso,
          windowTo: input.window.toIso,
          // Pinned to the literal W79's CHECK admits. An experience row cannot be
          // constructed here with any other provenance.
          source: "derived_case_mix",
          computedAt: input.computedAtIso,
        },
        usefulness: { audited: tally.audited, judgedReasonable: tally.judgedReasonable },
      };
    });
}

/**
 * Experience for one clinician and condition, or null when there is none.
 *
 * Null rather than a zero-count row: "we have no record of them seeing this" and "we counted
 * and it was zero" are the same statement here, and inventing a row for every clinician×
 * condition pair would fill the graph with claims nobody measured.
 */
export function experienceFor(
  cells: readonly ExperienceCell[],
  clinicianId: ClinicianId,
  conditionCode: ConditionCode,
): ExperienceCell | null {
  return (
    cells.find(
      (c) => c.experience.clinicianId === clinicianId && c.experience.conditionCode === conditionCode,
    ) ?? null
  );
}
