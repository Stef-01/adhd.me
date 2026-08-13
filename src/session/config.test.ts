import { describe, expect, it } from "vitest";
import {
  clinicianParticipates,
  DEFAULT_SESSION_CONFIG,
  isOfferable,
  localHour,
  offerableSlots,
  type SessionConfig,
} from "@/session/config";
import type { Appointment, AppointmentId, AppointmentType, ClinicianId, PracticeId } from "@/domain/types";

const PRACTICE = "p1" as PracticeId;
const CLIN = "c1" as ClinicianId;

function slot(id: string, hour: number, type?: AppointmentType): Appointment {
  return {
    id: id as AppointmentId,
    practiceId: PRACTICE,
    clinicianId: CLIN,
    startsAt: `2026-09-01T${String(hour).padStart(2, "0")}:00:00+10:00`,
    status: "open",
    patientId: null,
    generatedByInvitation: false,
    appointmentType: type,
  };
}

function config(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return { ...DEFAULT_SESSION_CONFIG, ...overrides };
}

describe("clinicianParticipates", () => {
  it("'all' includes everyone", () => {
    expect(clinicianParticipates(config(), CLIN)).toBe(true);
  });
  it("an allowlist includes only listed clinicians", () => {
    expect(clinicianParticipates(config({ participatingClinicianIds: ["c1"] }), CLIN)).toBe(true);
    expect(clinicianParticipates(config({ participatingClinicianIds: ["c2"] }), CLIN)).toBe(false);
    expect(clinicianParticipates(config({ participatingClinicianIds: [] }), CLIN)).toBe(false);
  });
});

describe("localHour", () => {
  it("reads the local hour from the ISO offset string", () => {
    expect(localHour("2026-09-01T09:15:00+10:00")).toBe(9);
    expect(localHour("2026-09-01T17:45:00+10:00")).toBe(17);
  });
});

describe("isOfferable", () => {
  it("rejects non-open slots", () => {
    expect(isOfferable({ ...slot("a", 9), status: "booked" }, config())).toBe(false);
  });
  it("filters by fillable type, treating untyped as always fillable", () => {
    const cfg = config({ fillableTypes: ["standard"] });
    expect(isOfferable(slot("a", 9, "standard"), cfg)).toBe(true);
    expect(isOfferable(slot("b", 9, "telehealth"), cfg)).toBe(false);
    expect(isOfferable(slot("c", 9, undefined), cfg)).toBe(true);
  });
  it("filters by scheduling window (start inclusive, end exclusive)", () => {
    const cfg = config({ schedulingWindow: { startHour: 9, endHour: 17 } });
    expect(isOfferable(slot("a", 8), cfg)).toBe(false);
    expect(isOfferable(slot("b", 9), cfg)).toBe(true);
    expect(isOfferable(slot("c", 16), cfg)).toBe(true);
    expect(isOfferable(slot("d", 17), cfg)).toBe(false);
  });
});

describe("offerableSlots", () => {
  const slots = [slot("a", 9), slot("b", 10), slot("c", 11), slot("d", 14)];

  it("offers everything when unconstrained", () => {
    expect(offerableSlots(slots, config()).map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("reserves the protected-capacity fraction, holding back the latest slots", () => {
    const offered = offerableSlots(slots, config({ protectedCapacityFraction: 0.5 }));
    expect(offered.map((s) => s.id)).toEqual(["a", "b"]); // 4 → protect ceil(2)=2, offer earliest 2
  });

  it("protects at least one slot for any non-zero fraction", () => {
    expect(offerableSlots(slots, config({ protectedCapacityFraction: 0.1 }))).toHaveLength(3);
    expect(offerableSlots([slot("a", 9)], config({ protectedCapacityFraction: 0.1 }))).toHaveLength(0);
  });

  it("combines window + type + protection", () => {
    const mixed = [slot("a", 8, "standard"), slot("b", 10, "standard"), slot("c", 11, "telehealth")];
    const offered = offerableSlots(
      mixed,
      config({ schedulingWindow: { startHour: 9, endHour: 17 }, fillableTypes: ["standard"] }),
    );
    expect(offered.map((s) => s.id)).toEqual(["b"]); // a out of window, c wrong type
  });
});
