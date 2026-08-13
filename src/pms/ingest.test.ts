// W32 verify gate: mapping tests — identity stability, consent provenance, and the
// terminal opt-out door, driven through the contract-passing synthetic adapter.

import { describe, expect, it } from "vitest";
import type { PatientId } from "@/domain/types";
import type { ConsentRecord, PmsReadAdapter } from "./adapter";
import {
  emptyIngestState,
  ingestFromAdapter,
  platformPatientId,
  recordPlatformStop,
} from "./ingest";
import { DEFAULT_SYNTHETIC_PMS_OPTIONS, SyntheticPmsAdapter } from "./synthetic";

const AT = "2026-08-09T03:30:00Z";
const LATER = "2026-08-10T03:30:00Z";

const makeAdapter = () => new SyntheticPmsAdapter(DEFAULT_SYNTHETIC_PMS_OPTIONS);

describe("W32 identity mapping", () => {
  it("maps every PMS patient to a unique, source-scoped platform id", async () => {
    const adapter = makeAdapter();
    const state = await ingestFromAdapter(adapter, emptyIngestState(), AT);
    const pmsPatients = await adapter.listPatients();
    expect(state.identities).toHaveLength(pmsPatients.length);
    expect(new Set(state.identities.map((r) => r.platformId)).size).toBe(pmsPatients.length);
    for (const r of state.identities) {
      expect(r.platformId).toBe(`pat:${adapter.name}:${r.sourcePatientId}`);
      expect(r.firstSeenAt).toBe(AT);
    }
  });

  it("re-ingest is idempotent: same identities, updated lastSeenAt only", async () => {
    const adapter = makeAdapter();
    const first = await ingestFromAdapter(adapter, emptyIngestState(), AT);
    const second = await ingestFromAdapter(makeAdapter(), first, LATER);
    expect(second.identities.map((r) => r.platformId)).toEqual(
      first.identities.map((r) => r.platformId),
    );
    expect(second.identities.every((r) => r.firstSeenAt === AT && r.lastSeenAt === LATER)).toBe(true);
    expect(second.provenance).toEqual(first.provenance); // no duplicate observations
    expect(second.conflicts).toEqual([]);
  });

  it("two source systems can never collide on a platform id", () => {
    expect(platformPatientId("best-practice", "42")).not.toBe(platformPatientId("halo", "42"));
  });
});

describe("W32 consent provenance", () => {
  it("keeps one provenance record per PMS observation with adapter and ingest time", async () => {
    const adapter = makeAdapter();
    const state = await ingestFromAdapter(adapter, emptyIngestState(), AT);
    const consents = await adapter.listConsents();
    expect(state.provenance).toHaveLength(consents.length);
    for (const record of state.provenance) {
      expect(record.adapter).toBe(adapter.name);
      expect(record.ingestedAt).toBe(AT);
      expect(record.source.length).toBeGreaterThan(0);
    }
  });

  it("effective consent follows the latest capture and provenance is append-only", async () => {
    const base = makeAdapter();
    const patients = await base.listPatients();
    const target = patients.find((p) => p.smsConsent && !p.optedOut)!;
    const platformId = platformPatientId(base.name, target.id);

    const first = await ingestFromAdapter(base, emptyIngestState(), AT);
    expect(first.patients.get(platformId)?.smsConsent).toBe(true);

    // The PMS later delivers a NEWER withdrawal for the same patient.
    const withdrawal: PmsReadAdapter = {
      ...base,
      name: base.name,
      practiceId: base.practiceId,
      listPatients: () => base.listPatients(),
      listOpenSlots: (r) => base.listOpenSlots(r),
      listCancellations: (r) => base.listCancellations(r),
      listConsents: async () => {
        const originals = await base.listConsents();
        const updated: ConsentRecord = {
          patientId: target.id,
          smsConsent: false,
          capturedAt: "2026-08-10T00:00:00Z",
          source: "pms:front-desk",
        };
        return [...originals, updated];
      },
    };
    const second = await ingestFromAdapter(withdrawal, first, LATER);
    expect(second.patients.get(platformId)?.smsConsent).toBe(false); // latest wins
    expect(second.provenance.length).toBe(first.provenance.length + 1); // nothing overwritten
    const chain = second.provenance.filter((r) => r.patientId === platformId);
    expect(chain).toHaveLength(2); // both observations preserved
  });

  it("flags same-capture conflicting values instead of silently picking one", async () => {
    const base = makeAdapter();
    const patients = await base.listPatients();
    const target = patients[0]!;
    const originals = await base.listConsents();
    const targetConsent = originals.find((c) => c.patientId === target.id)!;
    const conflicting: PmsReadAdapter = {
      ...base,
      listPatients: () => base.listPatients(),
      listOpenSlots: (r) => base.listOpenSlots(r),
      listCancellations: (r) => base.listCancellations(r),
      listConsents: async () => [
        ...originals,
        { ...targetConsent, smsConsent: !targetConsent.smsConsent, source: "pms:other-form" },
      ],
    };
    const state = await ingestFromAdapter(conflicting, emptyIngestState(), AT);
    expect(state.conflicts).toHaveLength(1);
    expect(state.conflicts[0]?.patientId).toBe(platformPatientId(base.name, target.id));
  });

  // W155 finding Y3-1. The test above is named "instead of silently picking one" and only ever
  // asserted that the conflict was RECORDED. The effective flag was still picked — by array
  // position, from a comparator that never returned 0 — so the assertion and the name were about
  // different things. These two cover what the name claims.
  it("W155: an ambiguous latest capture resolves to NO CONTACT, not to whichever row came first", async () => {
    // Absence of a clear yes is not a yes (W120/W125's rule, applied to the flag that decides
    // whether a real person is contacted).
    const base = makeAdapter();
    const patients = await base.listPatients();
    const target = patients.find((p) => !p.optedOut)!;
    const originals = await base.listConsents();
    const targetConsent = originals.find((c) => c.patientId === target.id)!;

    const withPair = (order: readonly boolean[]): PmsReadAdapter => ({
      ...base,
      listPatients: () => base.listPatients(),
      listOpenSlots: (r) => base.listOpenSlots(r),
      listCancellations: (r) => base.listCancellations(r),
      listConsents: async () => [
        ...originals.filter((c) => c.patientId !== target.id),
        ...order.map((smsConsent, index) => ({
          ...targetConsent,
          smsConsent,
          capturedAt: "2026-08-09T09:00:00Z",
          source: `pms:form-${index}`,
        })),
      ],
    });

    const platformId = platformPatientId(base.name, target.id);
    for (const order of [[true, false], [false, true]]) {
      const state = await ingestFromAdapter(withPair(order), emptyIngestState(), AT);
      expect(state.patients.get(platformId)?.smsConsent, `order ${order.join(",")}`).toBe(false);
      expect(state.conflicts.length).toBeGreaterThan(0);
    }
  });

  it("W155: an unambiguous latest capture still wins, in either input order", async () => {
    // The fix must not turn every patient into a refusal — only a genuinely undecidable one.
    const base = makeAdapter();
    const patients = await base.listPatients();
    const target = patients.find((p) => !p.optedOut)!;
    const originals = await base.listConsents();
    const targetConsent = originals.find((c) => c.patientId === target.id)!;
    const platformId = platformPatientId(base.name, target.id);

    const rows = [
      { ...targetConsent, smsConsent: false, capturedAt: "2026-08-01T00:00:00Z", source: "pms:old" },
      { ...targetConsent, smsConsent: true, capturedAt: "2026-08-09T09:00:00Z", source: "pms:new" },
    ];
    for (const order of [rows, [...rows].reverse()]) {
      const adapter: PmsReadAdapter = {
        ...base,
        listPatients: () => base.listPatients(),
        listOpenSlots: (r) => base.listOpenSlots(r),
        listCancellations: (r) => base.listCancellations(r),
        listConsents: async () => [...originals.filter((c) => c.patientId !== target.id), ...order],
      };
      const state = await ingestFromAdapter(adapter, emptyIngestState(), AT);
      expect(state.patients.get(platformId)?.smsConsent).toBe(true);
      expect(state.conflicts).toEqual([]);
    }
  });
});

describe("W32 the one-way door", () => {
  it("a Meherr STOP survives any later PMS consent refresh", async () => {
    const adapter = makeAdapter();
    const patients = await adapter.listPatients();
    const target = patients.find((p) => p.smsConsent && !p.optedOut)!;
    const platformId = platformPatientId(adapter.name, target.id);

    let state = await ingestFromAdapter(adapter, emptyIngestState(), AT);
    state = recordPlatformStop(state, platformId, "2026-08-09T12:00:00Z");
    expect(state.patients.get(platformId)).toMatchObject({ optedOut: true, smsConsent: false });

    // The PMS still says smsConsent=true — re-ingest must not reopen contact.
    state = await ingestFromAdapter(makeAdapter(), state, LATER);
    const after = state.patients.get(platformId);
    expect(after?.optedOut).toBe(true);
    expect(after?.smsConsent).toBe(false);
    // The STOP is itself a provenance record, source careyield:stop.
    expect(state.provenance.some((r) => r.patientId === platformId && r.source === "careyield:stop")).toBe(true);
  });

  it("recording a STOP for an unknown patient is a no-op, never an invention", () => {
    const state = recordPlatformStop(emptyIngestState(), "pat:ghost:1" as PatientId, AT);
    expect(state.patients.size).toBe(0);
    expect(state.provenance).toEqual([]);
  });
});
