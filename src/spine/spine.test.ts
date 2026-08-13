import { describe, expect, it } from "vitest";
import type { Appointment, AppointmentId, Invitation, InvitationId, PatientId } from "@/domain/types";
import { bookInvitation, type RailState } from "@/booking/rail";
import { DEFAULT_CONFIG, eligibleForClinician } from "@/engine/eligibility";
import { assignHoldout } from "@/engine/holdout";
import { buildInvitationPool, DEFAULT_POOL_CONFIG } from "@/engine/pool";
import { generatePractice } from "@/synthetic/generate";
import {
  append,
  appendAll,
  bookingEvents,
  EMPTY_LOG,
  replay,
  verifyLog,
  type EventLog,
  type SpineEvent,
  anchorOf,
  verifyLogAgainst,
} from "./spine";

const TODAY = "2026-08-08";
const AT = "2026-08-08T09:00:00Z";

/** Full loop on synthetic data, recording every transition; returns log + final observed state. */
function runScenario() {
  const data = generatePractice({
    seed: 7,
    patientCount: 3_000,
    clinicianCount: 10,
    scheduleWeeks: 1,
    todayIso: TODAY,
  });
  let log: EventLog = EMPTY_LOG;

  const { patients, auditEvents } = assignHoldout(data.patients, data.practice, AT);
  log = appendAll(
    log,
    auditEvents.map((e): SpineEvent => {
      const arm = e.detail.includes("arm=holdout") ? "holdout" : "invite";
      return { kind: "holdout_assigned", at: e.at, patientId: e.subjectId as PatientId, arm };
    }),
  );

  log = append(log, { kind: "config_changed", at: AT, key: "holdoutRate", value: "0.1" });
  log = append(log, { kind: "config_changed", at: AT, key: "holdoutRate", value: "0.2" });

  // Two single-slot sessions with different clinicians, capacity crafted so fills are certain.
  const sessionDate = "2026-08-11";
  const [clinA, clinB] = data.clinicians.filter((c) => c.participating);
  if (!clinA || !clinB) throw new Error("need two participating clinicians");
  const slot = (id: string, clinicianId: typeof clinA.id): Appointment => ({
    id: id as AppointmentId,
    practiceId: data.practice.id,
    clinicianId,
    startsAt: `${sessionDate}T09:00:00+10:00`,
    status: "open",
    patientId: null,
    generatedByInvitation: false,
  });
  // A has spare capacity (2 slots, 1 booking → offers stay live); B fills (1 slot → rest expire).
  const appointments = [slot("apt-A1", clinA.id), slot("apt-A2", clinA.id), slot("apt-B", clinB.id)];

  let invitations: Invitation[] = [];
  for (const clinician of [clinA, clinB]) {
    const { eligible } = eligibleForClinician(
      patients,
      clinician,
      { ...DEFAULT_CONFIG, usualClinicianOnly: false },
      TODAY,
      new Map(),
    );
    const pool = buildInvitationPool(sessionDate, clinician, appointments, eligible, {
      ...DEFAULT_POOL_CONFIG,
      maxInvitesPerSession: 4,
    });
    for (const inv of pool) log = append(log, { kind: "invitation_queued", at: AT, invitation: inv });
    // Send the whole batch.
    const sent = pool.map((i) => ({ ...i, status: "sent" as const, sentAt: AT }));
    for (const inv of sent) log = append(log, { kind: "invitation_sent", at: AT, invitationId: inv.id });
    invitations = [...invitations, ...sent];
  }

  let rail: RailState = { appointments, invitations, auditEvents: [] };

  // One patient in clinician B's pool opts out before booking.
  const optOut = rail.invitations.find((i) => i.clinicianId === clinB.id);
  if (!optOut) throw new Error("no invitation to opt out");
  rail = {
    ...rail,
    invitations: rail.invitations.map((i) =>
      i.id === optOut.id ? { ...i, status: "opted_out" as const } : i,
    ),
  };
  log = append(log, { kind: "patient_opted_out", at: AT, patientId: optOut.patientId });
  log = append(log, { kind: "invitation_opted_out", at: AT, invitationId: optOut.id });

  // Book one invitation per session; each booking fills its 1-slot session and expires the rest.
  for (const clinician of [clinA, clinB]) {
    const target = rail.invitations.find(
      (i) => i.clinicianId === clinician.id && i.status === "sent",
    );
    if (!target) throw new Error("no bookable invitation");
    const before = rail.invitations;
    const result = bookInvitation(rail, target.id, AT);
    if (!result.ok) throw new Error(`booking refused: ${result.reason}`);
    log = appendAll(log, bookingEvents(before, result, AT));
    rail = result.state;
  }

  return { data, patients, rail, log };
}

describe("W10 event spine", () => {
  it("full state is reconstructable by replay", () => {
    const { patients, rail, log } = runScenario();
    expect(verifyLog(log)).toBe(true);
    const replayed = replay(log);

    // Every invitation that ever existed replays to exactly its final rail state.
    expect(replayed.invitations.size).toBe(rail.invitations.length);
    for (const inv of rail.invitations) {
      expect(replayed.invitations.get(inv.id)).toEqual(inv);
    }
    // All statuses were exercised, so the equality above covers every transition.
    const statuses = new Set(rail.invitations.map((i) => i.status));
    for (const s of ["sent", "booked", "expired", "opted_out"]) expect(statuses).toContain(s);

    // Generated bookings replay to the same appointment→patient assignments.
    const generatedBooked = rail.appointments.filter(
      (a) => a.status === "booked" && a.generatedByInvitation,
    );
    expect(generatedBooked.length).toBe(2);
    expect(replayed.bookings.size).toBe(2);
    for (const a of generatedBooked) {
      expect(replayed.bookings.get(a.id)?.patientId).toBe(a.patientId);
    }

    // Opt-outs, holdout arms and config replay exactly.
    const optedOut = rail.invitations.find((i) => i.status === "opted_out");
    expect(replayed.optedOutPatients).toEqual(new Set([optedOut?.patientId]));
    const holdoutCount = patients.filter((p) => p.holdout).length;
    expect(replayed.holdoutArm.size).toBe(holdoutCount);
    for (const p of patients) {
      if (p.holdout) expect(replayed.holdoutArm.get(p.id)).toBe("holdout");
    }
    expect(replayed.config.get("holdoutRate")).toEqual({ value: "0.2", at: AT }); // last write wins
  });

  it("log entries and the log itself are immutable", () => {
    const log = append(EMPTY_LOG, {
      kind: "config_changed",
      at: AT,
      key: "k",
      value: "v",
    });
    expect(Object.isFrozen(log)).toBe(true);
    expect(Object.isFrozen(log[0])).toBe(true);
    const longer = append(log, { kind: "patient_opted_out", at: AT, patientId: "p" as PatientId });
    expect(log.length).toBe(1); // append never mutates its input
    expect(longer.length).toBe(2);
    expect(longer[1]?.seq).toBe(1);
  });

  it("verifyLog detects deletion and reordering; replay refuses a corrupt log", () => {
    let log: EventLog = EMPTY_LOG;
    for (let i = 0; i < 4; i++) {
      log = append(log, { kind: "config_changed", at: AT, key: "k", value: String(i) });
    }
    expect(verifyLog(log)).toBe(true);
    const deleted = [log[0]!, log[2]!, log[3]!];
    expect(verifyLog(deleted)).toBe(false);
    const reordered = [log[1]!, log[0]!, log[2]!, log[3]!];
    expect(verifyLog(reordered)).toBe(false);
    expect(() => replay(deleted)).toThrow("sequence verification");
  });

  it("replay refuses events that reference an invitation never queued", () => {
    const log = append(EMPTY_LOG, {
      kind: "invitation_sent",
      at: AT,
      invitationId: "inv-ghost" as Invitation["id"],
    });
    expect(() => replay(log)).toThrow("unknown invitation");
  });
});

describe("W51 audit fix: what verifyLog can and cannot prove", () => {
  const built = () =>
    appendAll(EMPTY_LOG, [
      { kind: "invitation_sent", at: AT, invitationId: "inv-1" as InvitationId },
      { kind: "invitation_sent", at: AT, invitationId: "inv-2" as InvitationId },
      { kind: "invitation_sent", at: AT, invitationId: "inv-3" as InvitationId },
    ]);

  it("bare verifyLog cannot see a truncated tail — and that is a property, not a bug", () => {
    // Dropping the last entries leaves 0..n-k-1 contiguous. A self-describing log cannot
    // prove it is complete: the evidence of what was removed goes with it.
    const truncated = built().slice(0, 2) as typeof EMPTY_LOG;
    expect(verifyLog(truncated)).toBe(true);
  });

  it("an anchor makes truncation visible", () => {
    const log = built();
    const anchor = anchorOf(log);
    const truncated = log.slice(0, 2) as typeof EMPTY_LOG;
    expect(verifyLogAgainst(log, anchor)).toEqual({ ok: true });
    expect(verifyLogAgainst(truncated, anchor)).toEqual({ ok: false, reason: "truncated", at: 2 });
  });

  it("a log that has grown past its anchor is fine — logs are append-only", () => {
    const anchor = anchorOf(built());
    const grown = append(built(), { kind: "invitation_sent", at: AT, invitationId: "inv-4" as InvitationId });
    expect(verifyLogAgainst(grown, anchor)).toEqual({ ok: true });
  });

  it("interior deletion is still caught, with the position", () => {
    const log = built();
    const gapped = [log[0]!, log[2]!] as typeof EMPTY_LOG;
    expect(verifyLog(gapped)).toBe(false);
    expect(verifyLogAgainst(gapped, anchorOf(log))).toMatchObject({ ok: false, reason: "not_contiguous", at: 1 });
  });
});
