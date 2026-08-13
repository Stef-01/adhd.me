// W32: identity & consent ingestion — PMS reads (W27 contract) mapped onto platform
// records. Two laws govern this layer:
//   1. Identity is stable: the same PMS patient maps to the same platform id on every
//      ingest, and ids from different source systems can never collide.
//   2. Consent has provenance and a one-way door: every consent observation is kept
//      as an append-only provenance record, the latest capture wins for effective
//      state — EXCEPT that a Meherr STOP (optedOut) is terminal and no PMS record
//      ever re-enables contact (W6 law, upheld here at the ingestion boundary).

import type { Patient, PatientId } from "@/domain/types";
import type { ConsentRecord, PmsReadAdapter } from "./adapter";

export interface IdentityRecord {
  platformId: PatientId;
  /** Adapter name the identity came from, e.g. "synthetic", "best-practice". */
  source: string;
  sourcePatientId: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** Deterministic, source-scoped platform id: stable across ingests, no cross-source collisions. */
export function platformPatientId(source: string, sourcePatientId: string): PatientId {
  return `pat:${source}:${sourcePatientId}` as PatientId;
}

export interface ConsentProvenance {
  patientId: PatientId;
  smsConsent: boolean;
  capturedAt: string;
  source: string; // where the PMS says consent was captured, e.g. "pms:intake-form"
  adapter: string; // which integration delivered it
  ingestedAt: string;
}

export interface ConsentConflict {
  patientId: PatientId;
  capturedAt: string;
  values: boolean[];
}

export interface IngestState {
  identities: IdentityRecord[];
  provenance: ConsentProvenance[];
  /** Platform patients by id — effective consent state lives here. */
  patients: Map<PatientId, Patient>;
  conflicts: ConsentConflict[];
}

export function emptyIngestState(): IngestState {
  return { identities: [], provenance: [], patients: new Map(), conflicts: [] };
}

const provenanceKey = (p: ConsentProvenance) =>
  `${p.patientId}|${p.capturedAt}|${p.source}|${p.smsConsent}|${p.adapter}`;

/**
 * Ingest one adapter's patients + consents into the platform state. Pure with respect
 * to its inputs (returns a new state) and idempotent: re-ingesting identical PMS data
 * changes nothing but `lastSeenAt`.
 */
export async function ingestFromAdapter(
  adapter: PmsReadAdapter,
  state: IngestState,
  atIso: string,
): Promise<IngestState> {
  const [pmsPatients, consents] = await Promise.all([
    adapter.listPatients(),
    adapter.listConsents(),
  ]);

  // 1. Identity mapping — stable and source-scoped.
  const identities = [...state.identities];
  const identityByKey = new Map(identities.map((r) => [`${r.source}|${r.sourcePatientId}`, r]));
  for (const p of pmsPatients) {
    const key = `${adapter.name}|${p.id}`;
    const existing = identityByKey.get(key);
    if (existing) {
      identities[identities.indexOf(existing)] = { ...existing, lastSeenAt: atIso };
    } else {
      const record: IdentityRecord = {
        platformId: platformPatientId(adapter.name, p.id),
        source: adapter.name,
        sourcePatientId: p.id,
        firstSeenAt: atIso,
        lastSeenAt: atIso,
      };
      identities.push(record);
      identityByKey.set(key, record);
    }
  }

  // 2. Platform patient records under platform ids. A previously stored terminal
  // opt-out survives any PMS refresh.
  const patients = new Map(state.patients);
  for (const p of pmsPatients) {
    const platformId = platformPatientId(adapter.name, p.id);
    const prior = patients.get(platformId);
    patients.set(platformId, {
      ...p,
      id: platformId,
      optedOut: (prior?.optedOut ?? false) || p.optedOut,
      smsConsent: prior?.optedOut ? false : p.smsConsent,
    });
  }

  // 3. Consent provenance — append-only, deduplicated, conflict-flagged.
  const provenance = [...state.provenance];
  const seen = new Set(provenance.map(provenanceKey));
  const conflicts = [...state.conflicts];
  const byPatientCapture = new Map<string, ConsentProvenance[]>();
  for (const record of provenance) {
    const k = `${record.patientId}|${record.capturedAt}`;
    byPatientCapture.set(k, [...(byPatientCapture.get(k) ?? []), record]);
  }
  for (const consent of consents) {
    const platformId = platformPatientId(adapter.name, consent.patientId);
    const record: ConsentProvenance = {
      patientId: platformId,
      smsConsent: consent.smsConsent,
      capturedAt: consent.capturedAt,
      source: consent.source,
      adapter: adapter.name,
      ingestedAt: atIso,
    };
    const key = provenanceKey(record);
    if (seen.has(key)) continue; // identical observation already on file
    const captureKey = `${platformId}|${consent.capturedAt}`;
    const sameCapture = byPatientCapture.get(captureKey) ?? [];
    if (sameCapture.some((r) => r.smsConsent !== consent.smsConsent)) {
      conflicts.push({
        patientId: platformId,
        capturedAt: consent.capturedAt,
        values: [...sameCapture.map((r) => r.smsConsent), consent.smsConsent],
      });
    }
    provenance.push(record);
    seen.add(key);
    byPatientCapture.set(captureKey, [...sameCapture, record]);
  }

  // 4. Effective consent = latest capture per patient — gated by the one-way door.
  //
  // W155 finding Y3-1. This sorted by `capturedAt` with a comparator that returned 1 rather than
  // 0 for equal keys, then took the last row. Two observations captured at the SAME instant with
  // OPPOSITE values — a batch export that stamps every row with the export time is enough — were
  // therefore resolved by whatever order the PMS happened to return them in. Step 3 already
  // RECORDED that disagreement as a conflict; step 4 never read it, so the product filed the
  // ambiguity and then resolved it anyway.
  //
  // Now the ambiguity decides. Absence of a clear yes is not a yes (W120/W125's rule), and this
  // is the flag that decides whether a real person is contacted, so an undecidable latest capture
  // resolves to NO CONTACT. Note there is no sort left at all: the maximum is taken directly, so
  // there is no comparator to be inconsistent and no position for a tie to be resolved by.
  for (const [platformId, patient] of patients) {
    const records = provenance.filter((r) => r.patientId === platformId);
    if (records.length === 0) continue;
    const newest = records.reduce((max, r) => (r.capturedAt > max ? r.capturedAt : max), records[0]!.capturedAt);
    const values = new Set(records.filter((r) => r.capturedAt === newest).map((r) => r.smsConsent));
    const effective = values.size === 1 ? [...values][0]! : false;
    patients.set(platformId, {
      ...patient,
      smsConsent: patient.optedOut ? false : effective,
    });
  }

  return { identities, provenance, patients, conflicts };
}

/** Record a Meherr STOP against a platform patient: terminal, provenance kept. */
export function recordPlatformStop(state: IngestState, platformId: PatientId, atIso: string): IngestState {
  const patient = state.patients.get(platformId);
  if (!patient) return state;
  const patients = new Map(state.patients);
  patients.set(platformId, { ...patient, optedOut: true, smsConsent: false });
  return {
    ...state,
    patients,
    provenance: [
      ...state.provenance,
      {
        patientId: platformId,
        smsConsent: false,
        capturedAt: atIso,
        source: "careyield:stop",
        adapter: "careyield",
        ingestedAt: atIso,
      },
    ],
  };
}
