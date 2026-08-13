// W12: simulation harness — runs the entire Meherr loop over N simulated weeks on the
// synthetic practice (W3), wiring holdout (W8) → eligibility (W4) → pool (W5) → compliant
// messaging (W6) → booking rail (W7) → event spine (W10) → attribution (W9).
// Everything is seeded and deterministic. Organic attendance is modelled identically in both
// arms (with displacement after a generated visit), so the attribution numbers in the report
// are an honest rehearsal of the real measurement design — synthetic data only, founder gates
// untouched.

import type { Appointment, AppointmentId, Invitation, Patient } from "@/domain/types";
import { bookInvitation, type RailState } from "@/booking/rail";
import {
  DEFAULT_CONFIG,
  eligibleForClinician,
  type EligibilityConfig,
} from "@/engine/eligibility";
import { buildBackfillPool } from "@/engine/backfill";
import { assignHoldout } from "@/engine/holdout";
import { countAttribution, type AttributionResult } from "@/engine/attribution";
import { buildInvitationPool, DEFAULT_POOL_CONFIG, type PoolConfig } from "@/engine/pool";
import {
  clinicianParticipates,
  DEFAULT_SESSION_CONFIG,
  offerableSlots,
  type SessionConfig,
} from "@/session/config";
import { ALL_CLEAR, canSend, type OpsSwitches } from "@/ops/switches";
import { isoDaysFrom } from "@/lib/dates";
import { assertFireAndForgetSafe, handleStop, MockSmsAdapter } from "@/messaging/adapter";
import { renderCompliant } from "@/messaging/templates";
import { generatePractice, type SyntheticPractice } from "@/synthetic/generate";
import {
  buildRegisterLayer,
  DEFAULT_REGISTER_SIM,
  type RegisterSimConfig,
} from "@/registers/sim-registers";
import { chance, intBetween, mulberry32 } from "@/synthetic/rng";
import {
  append,
  appendAll,
  bookingEvents,
  EMPTY_LOG,
  replay,
  verifyLog,
  type EventLog,
  type SpineEvent,
} from "@/spine/spine";

export interface SimConfig {
  seed: number;
  weeks: number;
  patientCount: number;
  clinicianCount: number;
  todayIso: string;
  eligibility: EligibilityConfig;
  pool: PoolConfig;
  session: SessionConfig;
  /** Operational safety switches (W19): a killed or paused practice sends nothing. */
  switches: OpsSwitches;
  /** Probability a sent invitation books within its week. */
  responseRate: number;
  /**
   * W30: probability a booked organic appointment in the current week late-cancels,
   * triggering the near-real-time backfill fast path. 0 disables the path entirely
   * (no RNG draws), keeping earlier goldens byte-stable.
   */
  lateCancellationRate: number;
  /**
   * W63: care-gap registers. Disabled by default and short-circuited when disabled, so
   * every committed golden stays byte-identical — the register layer draws no RNG.
   */
  registers?: RegisterSimConfig;
  /** Probability a sent invitation triggers STOP instead. */
  optOutRate: number;
  /** DNA probability on generated bookings. */
  dnaRate: number;
  /** Baseline weekly probability of an organic attended visit (both arms, identically). */
  organicWeeklyRate: number;
  /** Organic-rate multiplier for the weeks after a generated visit (displacement). */
  displacementFactor: number;
  displacementWeeks: number;
}

export const DEFAULT_SIM_CONFIG: SimConfig = {
  seed: 20260808,
  weeks: 26,
  patientCount: 4_000,
  clinicianCount: 10,
  todayIso: "2026-08-08",
  eligibility: DEFAULT_CONFIG,
  pool: DEFAULT_POOL_CONFIG,
  session: DEFAULT_SESSION_CONFIG,
  switches: ALL_CLEAR,
  responseRate: 0.25,
  lateCancellationRate: 0,
  registers: DEFAULT_REGISTER_SIM,
  optOutRate: 0.01,
  dnaRate: 0.05,
  organicWeeklyRate: 0.05,
  displacementFactor: 0.5,
  displacementWeeks: 4,
};

export interface SimResult {
  config: SimConfig;
  practice: SyntheticPractice["practice"];
  /** Final patient states (holdout assigned, opt-outs and visit dates applied). */
  patients: Patient[];
  /** Schedule + organic visit records at end of sim. */
  appointments: Appointment[];
  invitations: Invitation[];
  log: EventLog;
  smsSentCount: number;
  totals: {
    weeksSimulated: number;
    sessionsPooled: number;
    invitationsSent: number;
    booked: number;
    expired: number;
    optedOut: number;
    attendedGenerated: number;
    dnaGenerated: number;
    organicVisits: number;
    backfillEvents: number;
    backfillSent: number;
    backfillBooked: number;
  };
  attribution: AttributionResult;
  /** Sent-week indexes per patient, for cap auditing. */
  sentWeeksByPatient: Map<string, number[]>;
  /** Wall-clock ms from late-cancellation to backfill offers queued+sent (one per event). */
  backfillLatenciesMs: number[];
}

export function runSim(config: SimConfig): SimResult {
  const rng = mulberry32(config.seed ^ 0x5eed);
  const data = generatePractice({
    seed: config.seed,
    patientCount: config.patientCount,
    clinicianCount: config.clinicianCount,
    scheduleWeeks: config.weeks,
    todayIso: config.todayIso,
  });
  const sms = new MockSmsAdapter();
  // Fail closed: this harness discards send promises (see SmsAdapter.fireAndForgetSafe).
  // An adapter that can actually fail must never run through it — W51 audit finding A1.
  assertFireAndForgetSafe(sms);
  let log: EventLog = EMPTY_LOG;

  // Arm assignment first — the measurement design precedes any contact.
  const assigned = assignHoldout(data.patients, data.practice, `${config.todayIso}T00:00:00Z`);
  const patientById = new Map(assigned.patients.map((p) => [p.id, { ...p }]));
  // Arm read structurally from the assigned flag, never parsed out of audit prose.
  log = appendAll(
    log,
    assigned.auditEvents.map((e): SpineEvent => {
      const patient = patientById.get(e.subjectId as Patient["id"]);
      if (!patient) throw new Error(`holdout audit event for unknown patient ${e.subjectId}`);
      return {
        kind: "holdout_assigned",
        at: e.at,
        patientId: patient.id,
        arm: patient.holdout ? "holdout" : "invite",
      };
    }),
  );
  let rail: RailState = { appointments: data.appointments, invitations: [], auditEvents: [] };
  const organicVisits: Appointment[] = [];
  const sentWeeksByPatient = new Map<string, number[]>();
  const lastGeneratedVisitWeek = new Map<string, number>();
  /** clinicianId|sessionDate → the W17-offerable slot ids fixed at pool time. */
  const offerableIdsBySession = new Map<string, Set<string>>();

  const totals = {
    weeksSimulated: 0,
    sessionsPooled: 0,
    invitationsSent: 0,
    booked: 0,
    expired: 0,
    optedOut: 0,
    attendedGenerated: 0,
    dnaGenerated: 0,
    organicVisits: 0,
    backfillEvents: 0,
    backfillSent: 0,
    backfillBooked: 0,
  };
  const backfillLatenciesMs: number[] = [];

  for (let week = 0; week < config.weeks; week++) {
    const weekDates = new Set(
      Array.from({ length: 7 }, (_, d) => isoDaysFrom(config.todayIso, week * 7 + d + 1)),
    );
    const at = `${isoDaysFrom(config.todayIso, week * 7 + 1)}T08:00:00Z`;
    const patients = [...patientById.values()];
    // Rebuilt weekly: gaps close as patients attend, and that closure is the effect W63
    // measures. Null when registers are off, which short-circuits every register call site.
    const registerLayer =
      config.registers?.enabled === true
        ? buildRegisterLayer(
            patients,
            config.registers,
            config.seed,
            isoDaysFrom(config.todayIso, week * 7),
          )
        : null;

    // 1. Pool + compliant send, one session per clinician-date with open capacity.
    // Operational switches gate sending: a kill-switch or a paused practice sends
    // nothing this week (bookings from prior weeks still resolve below).
    const sendingAllowed = canSend(config.switches, data.practice.id);
    for (const clinician of data.clinicians) {
      if (!sendingAllowed) break;
      if (!clinician.participating) continue;
      if (!clinicianParticipates(config.session, clinician.id)) continue;
      const sessionDates = new Set(
        rail.appointments
          .filter(
            (a) =>
              a.clinicianId === clinician.id &&
              a.status === "open" &&
              weekDates.has(a.startsAt.slice(0, 10)),
          )
          .map((a) => a.startsAt.slice(0, 10)),
      );
      for (const sessionDate of sessionDates) {
        const capsMap = new Map(
          [...sentWeeksByPatient].map(([id, weeks]) => [
            id,
            weeks.filter((w) => week - w < 13).length,
          ]),
        );
        const { eligible } = eligibleForClinician(
          patients,
          clinician,
          config.eligibility,
          isoDaysFrom(config.todayIso, week * 7),
          capsMap,
        );
        // Honour the session config: only offer participating clinicians' slots
        // of a fillable type, in-window, after reserving protected capacity.
        const offerable = offerableSlots(
          rail.appointments.filter(
            (a) =>
              a.clinicianId === clinician.id &&
              a.status === "open" &&
              a.startsAt.slice(0, 10) === sessionDate,
          ),
          config.session,
        );
        if (offerable.length === 0) continue;
        // W63: the register layer narrows (W59) and reorders (W61) within what W4 already
        // allows. Built once per week above; disabled configs skip it entirely.
        const pool = buildInvitationPool(
          sessionDate,
          clinician,
          offerable,
          registerLayer ? registerLayer.narrow(eligible) : eligible,
          config.pool,
          registerLayer ? registerLayer.rank : undefined,
        );
        if (pool.length === 0) continue;
        // The offerable set is fixed at pool time; bookings are confined to it below,
        // so protected/out-of-window/wrong-type slots stay untouched by the loop.
        offerableIdsBySession.set(
          `${clinician.id}|${sessionDate}`,
          new Set(offerable.map((a) => a.id as string)),
        );
        totals.sessionsPooled++;
        const sent: Invitation[] = [];
        for (const inv of pool) {
          log = append(log, { kind: "invitation_queued", at, invitation: inv });
          const patient = patientById.get(inv.patientId);
          if (!patient) throw new Error("invitation for unknown patient");
          const body = renderCompliant({
            patientFirstName: `Patient-${inv.patientId}`,
            clinicianDisplayName: clinician.displayName,
            practiceName: data.practice.name,
            sessionWindow: `on ${sessionDate}`,
            bookingUrl: `https://book.careyield.test/${inv.id}`,
          });
          void sms.send({ to: `synthetic:${inv.patientId}`, body, invitationId: inv.id });
          log = append(log, { kind: "invitation_sent", at, invitationId: inv.id });
          sent.push({ ...inv, status: "sent", sentAt: at });
          sentWeeksByPatient.set(inv.patientId, [
            ...(sentWeeksByPatient.get(inv.patientId) ?? []),
            week,
          ]);
          totals.invitationsSent++;
        }
        rail = { ...rail, invitations: [...rail.invitations, ...sent] };
      }
    }

    // 2. Responses: STOP or booking, in send order.
    for (const inv of rail.invitations.filter((i) => i.status === "sent")) {
      const patient = patientById.get(inv.patientId);
      if (!patient) throw new Error("invitation for unknown patient");
      if (patient.optedOut) continue; // STOP earlier this week closed their other offers
      if (chance(rng, config.optOutRate)) {
        // STOP semantics live in ONE place (W6 handleStop) — the sim rehearses the
        // real message path, it does not re-implement it.
        const before = rail.invitations;
        const stopped = handleStop(patient, rail.invitations);
        patientById.set(patient.id, stopped.patient);
        rail = { ...rail, invitations: stopped.invitations };
        log = append(log, { kind: "patient_opted_out", at, patientId: patient.id });
        for (const [idx, i] of rail.invitations.entries()) {
          if (i.status === "opted_out" && before[idx]?.status !== "opted_out") {
            log = append(log, { kind: "invitation_opted_out", at, invitationId: i.id });
          }
        }
        totals.optedOut++;
        continue;
      }
      if (chance(rng, config.responseRate)) {
        const before = rail.invitations;
        const result = bookInvitation(
          rail,
          inv.id,
          at,
          offerableIdsBySession.get(`${inv.clinicianId}|${inv.sessionDate}`),
        );
        if (result.ok) {
          log = appendAll(log, bookingEvents(before, result, at));
          rail = result.state;
          totals.booked++;
          patientById.set(patient.id, { ...patient, futureBookingAt: inv.sessionDate });
        }
      }
    }

    // 2.5 (W30): late cancellations → near-real-time backfill, same step as the event.
    // Guarded so a zero rate draws no randomness (stream-stable for earlier goldens).
    if (config.lateCancellationRate > 0 && canSend(config.switches, data.practice.id)) {
      const lateCancelled = rail.appointments.filter(
        (a) =>
          a.status === "booked" &&
          !a.generatedByInvitation &&
          a.patientId !== null &&
          weekDates.has(a.startsAt.slice(0, 10)) &&
          chance(rng, config.lateCancellationRate),
      );
      for (const slot of lateCancelled) {
        const clinician = data.clinicians.find((c) => c.id === slot.clinicianId);
        if (!clinician || !clinician.participating) continue;
        if (!clinicianParticipates(config.session, clinician.id)) continue;
        // The cancellation itself: the slot reopens.
        const freed = { ...slot, status: "open" as const, patientId: null };
        rail = {
          ...rail,
          appointments: rail.appointments.map((a) => (a.id === slot.id ? freed : a)),
        };
        totals.backfillEvents++;

        const t0 = performance.now();
        const capsMap = new Map(
          [...sentWeeksByPatient].map(([id, weeks]) => [
            id,
            weeks.filter((w) => week - w < 13).length,
          ]),
        );
        const backfill = buildBackfillPool(
          freed,
          clinician,
          [...patientById.values()],
          config.eligibility,
          config.session,
          config.pool,
          isoDaysFrom(config.todayIso, week * 7),
          capsMap,
          at,
        );
        const sent: Invitation[] = [];
        for (const inv of backfill.invitations) {
          log = append(log, { kind: "invitation_queued", at, invitation: inv });
          const body = renderCompliant({
            patientFirstName: `Patient-${inv.patientId}`,
            clinicianDisplayName: clinician.displayName,
            practiceName: data.practice.name,
            sessionWindow: `on ${inv.sessionDate}`,
            bookingUrl: `https://book.careyield.test/${inv.id}`,
          });
          void sms.send({ to: `synthetic:${inv.patientId}`, body, invitationId: inv.id });
          log = append(log, { kind: "invitation_sent", at, invitationId: inv.id });
          sent.push({ ...inv, status: "sent", sentAt: at });
          sentWeeksByPatient.set(inv.patientId, [
            ...(sentWeeksByPatient.get(inv.patientId) ?? []),
            week,
          ]);
          totals.invitationsSent++;
          totals.backfillSent++;
        }
        rail = { ...rail, invitations: [...rail.invitations, ...sent] };
        backfillLatenciesMs.push(performance.now() - t0);

        // Responses to the backfill offers, still within the fast-path step.
        const freedOnly = new Set([freed.id as string]);
        for (const inv of sent) {
          const patient = patientById.get(inv.patientId);
          if (!patient || patient.optedOut) continue;
          if (!chance(rng, config.responseRate)) continue;
          const before = rail.invitations;
          const result = bookInvitation(rail, inv.id, at, freedOnly);
          if (result.ok) {
            log = appendAll(log, bookingEvents(before, result, at));
            rail = result.state;
            totals.booked++;
            totals.backfillBooked++;
            patientById.set(patient.id, { ...patient, futureBookingAt: inv.sessionDate });
          }
        }
      }
    }

    // 3. Week-end expiry: an offer is for this week's session; unanswered ones lapse.
    {
      const before = rail.invitations;
      rail = {
        ...rail,
        invitations: rail.invitations.map((i) =>
          (i.status === "queued" || i.status === "sent") && weekDates.has(i.sessionDate)
            ? { ...i, status: "expired" as const }
            : i,
        ),
      };
      for (const [idx, i] of rail.invitations.entries()) {
        if (i.status === "expired" && before[idx]?.status !== "expired") {
          log = append(log, { kind: "invitation_expired", at, invitationId: i.id });
        }
      }
    }

    // 4. Attendance at week end: generated bookings attend or DNA.
    rail = {
      ...rail,
      appointments: rail.appointments.map((a) => {
        if (
          a.status !== "booked" ||
          !a.generatedByInvitation ||
          !weekDates.has(a.startsAt.slice(0, 10)) ||
          a.patientId === null
        ) {
          return a;
        }
        const patient = patientById.get(a.patientId);
        if (!patient) throw new Error("booking for unknown patient");
        if (chance(rng, config.dnaRate)) {
          totals.dnaGenerated++;
          patientById.set(patient.id, { ...patient, futureBookingAt: null });
          return { ...a, status: "dna" as const };
        }
        totals.attendedGenerated++;
        lastGeneratedVisitWeek.set(patient.id, week);
        patientById.set(patient.id, {
          ...patient,
          lastAttendedAt: a.startsAt.slice(0, 10),
          futureBookingAt: null,
        });
        return { ...a, status: "attended" as const };
      }),
    };

    // 5. Organic attendance — the same seeded process for BOTH arms; a recent generated
    // visit suppresses it (displacement), which is exactly what holdout subtraction nets out.
    for (const patient of patientById.values()) {
      const lastGen = lastGeneratedVisitWeek.get(patient.id);
      const displaced = lastGen !== undefined && week - lastGen < config.displacementWeeks;
      const rate = config.organicWeeklyRate * (displaced ? config.displacementFactor : 1);
      if (!chance(rng, rate)) continue;
      const dateIso = isoDaysFrom(config.todayIso, week * 7 + intBetween(rng, 1, 7));
      organicVisits.push({
        id: `org-${week}-${patient.id}` as AppointmentId,
        practiceId: data.practice.id,
        clinicianId: patient.usualClinicianId ?? data.clinicians[0]!.id,
        startsAt: `${dateIso}T10:00:00+10:00`,
        status: "attended",
        patientId: patient.id,
        generatedByInvitation: false,
      });
      patientById.set(patient.id, { ...patient, lastAttendedAt: dateIso });
      totals.organicVisits++;
    }

    totals.weeksSimulated++;
  }

  totals.expired = rail.invitations.filter((i) => i.status === "expired").length;

  const finalPatients = [...patientById.values()];
  const allAppointments = [...rail.appointments, ...organicVisits];
  const attribution = countAttribution(data.practice, finalPatients, allAppointments, {
    fromIso: config.todayIso,
    toIso: isoDaysFrom(config.todayIso, config.weeks * 7 + 7),
  });

  return {
    config,
    practice: data.practice,
    patients: finalPatients,
    appointments: allAppointments,
    invitations: rail.invitations,
    log,
    smsSentCount: sms.sent.length,
    totals,
    attribution,
    sentWeeksByPatient,
    backfillLatenciesMs,
  };
}

/** Invariants the sim must uphold — returned as violations so the report can print the checklist. */
export function checkInvariants(result: SimResult): string[] {
  const violations: string[] = [];
  const holdoutIds = new Set(result.patients.filter((p) => p.holdout).map((p) => p.id));
  if (result.invitations.some((i) => holdoutIds.has(i.patientId))) {
    violations.push("holdout patient received an invitation");
  }
  for (const [patientId, weeks] of result.sentWeeksByPatient) {
    for (const w of weeks) {
      const inWindow = weeks.filter((x) => x <= w && w - x < 13).length;
      if (inWindow > result.config.eligibility.maxInvitesPerQuarter) {
        violations.push(`invite cap exceeded for ${patientId} at week ${w}`);
      }
    }
  }
  if (!verifyLog(result.log)) violations.push("event log failed sequence verification");
  const replayed = replay(result.log);
  for (const inv of result.invitations) {
    if (replayed.invitations.get(inv.id)?.status !== inv.status) {
      violations.push(`replay mismatch for invitation ${inv.id}`);
    }
  }
  const bookedInvitations = new Set(
    result.invitations.filter((i) => i.status === "booked").map((i) => i.patientId),
  );
  for (const a of result.appointments) {
    if (a.generatedByInvitation && a.patientId && !bookedInvitations.has(a.patientId)) {
      violations.push(`generated appointment ${a.id} has no booked invitation`);
    }
  }
  if (result.smsSentCount !== result.totals.invitationsSent) {
    violations.push("SMS count diverges from sent invitations");
  }
  // W17/W26: no generated booking may sit on a slot the session config excludes.
  const { fillableTypes, schedulingWindow } = result.config.session;
  for (const a of result.appointments) {
    if (!a.generatedByInvitation) continue;
    if (a.appointmentType !== undefined && !fillableTypes.includes(a.appointmentType)) {
      violations.push(`generated booking ${a.id} on non-fillable type ${a.appointmentType}`);
    }
    const hour = Number(a.startsAt.slice(11, 13));
    if (hour < schedulingWindow.startHour || hour >= schedulingWindow.endHour) {
      violations.push(`generated booking ${a.id} outside the scheduling window`);
    }
  }
  return violations;
}

export function renderReport(result: SimResult, violations: string[]): string {
  const { totals, attribution: attr, config } = result;
  const pct = (n: number, d: number) => (d === 0 ? "0%" : `${((n / d) * 100).toFixed(1)}%`);
  const num = (n: number | null) => (n === null ? "n/a" : n.toFixed(1));
  return `# Meherr 26-week simulation report (W12)

Deterministic run — seed ${config.seed}, ${config.patientCount} synthetic patients,
${config.clinicianCount} clinicians, ${totals.weeksSimulated} weeks from ${config.todayIso}.
Synthetic data only (founder gate G2); SMS via mock adapter only (G3).

## Loop totals

| Metric | Value |
|---|---|
| Sessions pooled | ${totals.sessionsPooled} |
| Invitations sent | ${totals.invitationsSent} |
| Booked | ${totals.booked} (${pct(totals.booked, totals.invitationsSent)} of sent) |
| Expired on fill | ${totals.expired} |
| Opt-outs | ${totals.optedOut} (${pct(totals.optedOut, totals.invitationsSent)} of sent) |
| Generated visits attended | ${totals.attendedGenerated} |
| Generated DNA | ${totals.dnaGenerated} (${pct(totals.dnaGenerated, totals.attendedGenerated + totals.dnaGenerated)} of generated bookings) |
| Organic visits (both arms) | ${totals.organicVisits} |

## Attribution (definitions: docs/ATTRIBUTION.md ${attr.version})

| Arm | Patients | Attended | Per 1,000 |
|---|---|---|---|
| Invite | ${attr.inviteArm.patients} | ${attr.inviteArm.attended} | ${attr.inviteArm.attendedPer1000.toFixed(1)} |
| Holdout | ${attr.holdoutArm.patients} | ${attr.holdoutArm.attended} | ${attr.holdoutArm.attendedPer1000.toFixed(1)} |

- **Incremental attended appointments: ${num(attr.incrementalAttended)}** (${num(attr.incrementalPer1000)} per 1,000 invite-arm patients)
- Naive "generated bookings" count: ${attr.naiveGeneratedAttended} — contrast figure only; the gap vs incremental is displacement.

## Invariants

${violations.length === 0 ? "All invariants held." : violations.map((v) => `- VIOLATION: ${v}`).join("\n")}

- Holdout arm never invited: ${violations.some((v) => v.includes("holdout")) ? "FAIL" : "pass"}
- Contact-frequency caps respected: ${violations.some((v) => v.includes("cap")) ? "FAIL" : "pass"}
- Event spine verifies + full replay matches: ${violations.some((v) => v.includes("replay") || v.includes("log")) ? "FAIL" : "pass"}
- Every generated visit traces to a booked invitation: ${violations.some((v) => v.includes("generated")) ? "FAIL" : "pass"}
- Compliance linter on every send: enforced at render (throws on violation)
`;
}
