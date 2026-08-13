// W27: the PMS adapter contract. Any adapter — synthetic now, Best Practice/Halo/
// HotDoc later — must pass this suite. Import and call describePmsContract from the
// adapter's own test file; that green run IS the definition of a conformant adapter.

import { describe, expect, it } from "vitest";
import type { PmsReadAdapter } from "@/pms/adapter";
import { withinRange } from "@/pms/adapter";

const VALID_APPT_TYPES = new Set([undefined, "standard", "long", "telehealth"]);

export interface ContractFixture {
  /** A fresh adapter for each test. */
  makeAdapter: () => PmsReadAdapter | Promise<PmsReadAdapter>;
  /** A date range known to contain some open slots and cancellations. */
  populatedRange: { fromIso: string; toIso: string };
  /** A range known to contain NONE (e.g. far in the past), to prove filtering. */
  emptyRange: { fromIso: string; toIso: string };
}

export function describePmsContract(label: string, fixture: ContractFixture): void {
  describe(`PMS contract: ${label}`, () => {
    const make = () => Promise.resolve(fixture.makeAdapter());

    it("declares a name and a practice id", async () => {
      const a = await make();
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.practiceId.length).toBeGreaterThan(0);
    });

    it("lists patients scoped to the one practice", async () => {
      const a = await make();
      const patients = await a.listPatients();
      expect(patients.length).toBeGreaterThan(0);
      for (const p of patients) {
        expect(p.id.length).toBeGreaterThan(0);
        expect(p.practiceId).toBe(a.practiceId);
        expect(typeof p.smsConsent).toBe("boolean");
        expect(typeof p.optedOut).toBe("boolean");
      }
      // Patient ids are unique.
      expect(new Set(patients.map((p) => p.id)).size).toBe(patients.length);
    });

    it("returns only open, in-range, in-practice slots", async () => {
      const a = await make();
      const slots = await a.listOpenSlots(fixture.populatedRange);
      expect(slots.length).toBeGreaterThan(0);
      for (const s of slots) {
        expect(s.status).toBe("open");
        expect(s.practiceId).toBe(a.practiceId);
        expect(withinRange(s.startsAt, fixture.populatedRange)).toBe(true);
        expect(VALID_APPT_TYPES.has(s.appointmentType)).toBe(true);
      }
    });

    it("filters slots by range — an empty range yields nothing", async () => {
      const a = await make();
      expect(await a.listOpenSlots(fixture.emptyRange)).toEqual([]);
    });

    it("returns cancellations recorded within range, each freeing a real slot", async () => {
      const a = await make();
      const cancellations = await a.listCancellations(fixture.populatedRange);
      expect(cancellations.length).toBeGreaterThan(0);
      for (const c of cancellations) {
        expect(withinRange(c.cancelledAt, fixture.populatedRange)).toBe(true);
        expect(c.appointmentId.length).toBeGreaterThan(0);
        expect(c.patientId.length).toBeGreaterThan(0);
        expect(c.clinicianId.length).toBeGreaterThan(0);
        expect(Date.parse(c.startsAt)).not.toBeNaN();
      }
    });

    it("filters cancellations by range — an empty range yields nothing", async () => {
      const a = await make();
      expect(await a.listCancellations(fixture.emptyRange)).toEqual([]);
    });

    it("lists one consent record per patient, consistent with the patient flag", async () => {
      const a = await make();
      const patients = await a.listPatients();
      const consents = await a.listConsents();
      const byPatient = new Map(consents.map((c) => [c.patientId, c]));
      expect(byPatient.size).toBe(consents.length); // one per patient
      for (const p of patients) {
        const consent = byPatient.get(p.id);
        expect(consent).toBeDefined();
        expect(consent!.smsConsent).toBe(p.smsConsent);
        expect(typeof consent!.source).toBe("string");
        expect(Date.parse(consent!.capturedAt)).not.toBeNaN();
      }
    });

    it("is a read: repeated reads return identical data", async () => {
      const a = await make();
      expect(await a.listPatients()).toEqual(await a.listPatients());
      expect(await a.listOpenSlots(fixture.populatedRange)).toEqual(
        await a.listOpenSlots(fixture.populatedRange),
      );
    });
  });
}
