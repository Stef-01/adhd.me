// Persistence for the matching store (Phase M5). The in-memory state stays the record the
// process reads; a journal mirrors every write to Supabase over PostgREST, and a cold process
// hydrates from it once before its first read. When nothing is configured there is no journal
// and the store behaves exactly as before: in memory, per instance, gone on restart.
//
// Why a journal and not a client: every caller of the store is synchronous, and the routes are
// short. So writes are queued and flushed in order on a promise chain, reads never wait, and a
// failed flush is counted (never logged with its row, which is the narrative) while the memory
// copy stays right. The tables are `supabase/migrations/0006_matching.sql`; the mapping below
// is the only place the two shapes meet.
//
// Configured by SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server. The service role
// bypasses row-level security, which is why this module must never run in a browser, and why
// the key is read here, once, and nowhere else.

import type { MatchingState } from "./store";
import type { DocumentChecklist, Feedback, GP, Match, Patient } from "./types";

export type MatchingTable = "match_patients" | "match_gps" | "match_matches" | "match_feedback" | "match_checklists";

export interface JournalWrite {
  table: MatchingTable;
  op: "upsert" | "delete";
  id: string;
  row?: Record<string, unknown>;
}

export interface JournalStats {
  queued: number;
  flushed: number;
  failed: number;
  hydrated: boolean;
}

export interface SupabaseEndpoint {
  url: string;
  key: string;
}

export function supabaseEndpointFromEnv(env: Record<string, string | undefined> = process.env): SupabaseEndpoint | null {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

// Row mapping. Column names follow the migration; nested declarations travel as JSON columns.

export const toRow = {
  match_patients: (p: Patient) => ({
    id: p.id,
    name: p.name,
    contact: p.contact,
    location: p.location,
    narrative_text: p.narrativeText,
    narrative_embedding: p.narrativeEmbedding,
    structured_signals: p.structuredSignals,
    documents_uploaded: p.documentsUploaded,
    status: p.status,
    condition: p.condition,
    created_at: p.createdAt,
  }),
  match_gps: (g: GP) => ({
    id: g.id,
    name: g.name,
    short_name: g.shortName,
    practice: g.practice,
    practice_location: g.practiceLocation,
    telehealth_available: g.telehealthAvailable,
    accepting_new_patients: g.acceptingNewPatients,
    credentials: g.credentials,
    preferences: g.preferences,
    bio_embedding: g.bioEmbedding,
    verification_status: g.verificationStatus,
    verified_by: g.verifiedBy,
    verified_on: g.verifiedOn,
    rating_aggregate: g.ratingAggregate,
    conditions: g.conditions,
    languages: g.languages,
    appointment_length: g.appointmentLength,
    real_person: g.realPerson,
    image: g.image,
  }),
  match_matches: (m: Match) => ({
    id: m.id,
    patient_id: m.patientId,
    gp_id: m.gpId,
    patient_rank_score: m.patientRankScore,
    gp_rank_score: m.gpRankScore,
    similarity: m.similarity,
    position: m.position,
    match_status: m.matchStatus,
    rationale: m.rationale,
    patient_breakdown: m.patientBreakdown,
    decline_reason: m.declineReason,
    created_at: m.createdAt,
    decided_at: m.decidedAt,
  }),
  match_feedback: (f: Feedback) => ({
    id: f.id,
    match_id: f.matchId,
    side: f.from,
    patient_rating: f.patientRating,
    gp_rating: f.gpRating,
    free_text_feedback: f.freeTextFeedback,
    created_at: f.createdAt,
  }),
  match_checklists: (c: DocumentChecklist) => ({
    id: c.id,
    patient_id: c.patientId,
    items: c.items,
    generated_at: c.generatedAt,
  }),
};

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const vec = (v: unknown): readonly number[] | null => {
  if (Array.isArray(v)) return v.map(num);
  // pgvector's text form: "[0.1,0.2,...]"
  if (typeof v === "string" && v.startsWith("[")) return v.slice(1, -1).split(",").filter(Boolean).map(Number);
  return null;
};

export const fromRow = {
  match_patients: (r: Row): Patient => ({
    id: str(r.id),
    name: str(r.name),
    contact: (r.contact as Patient["contact"]) ?? { email: null, phone: null },
    location: (r.location as Patient["location"]) ?? { suburb: "", postcode: null },
    narrativeText: str(r.narrative_text),
    narrativeEmbedding: vec(r.narrative_embedding),
    structuredSignals: r.structured_signals as Patient["structuredSignals"],
    documentsUploaded: (r.documents_uploaded as Patient["documentsUploaded"]) ?? [],
    status: r.status as Patient["status"],
    condition: r.condition as Patient["condition"],
    createdAt: str(r.created_at),
  }),
  match_gps: (r: Row): GP => ({
    id: str(r.id),
    name: str(r.name),
    shortName: str(r.short_name),
    practice: str(r.practice),
    practiceLocation: (r.practice_location as GP["practiceLocation"]) ?? { suburb: "", postcode: null },
    telehealthAvailable: r.telehealth_available === true,
    acceptingNewPatients: r.accepting_new_patients === true,
    credentials: r.credentials as GP["credentials"],
    preferences: r.preferences as GP["preferences"],
    bioEmbedding: vec(r.bio_embedding),
    verificationStatus: r.verification_status as GP["verificationStatus"],
    verifiedBy: strOrNull(r.verified_by),
    verifiedOn: strOrNull(r.verified_on),
    ratingAggregate: (r.rating_aggregate as GP["ratingAggregate"]) ?? null,
    conditions: (r.conditions as GP["conditions"]) ?? ["adhd"],
    languages: (r.languages as GP["languages"]) ?? [],
    appointmentLength: str(r.appointment_length),
    realPerson: r.real_person === true,
    image: strOrNull(r.image),
  }),
  match_matches: (r: Row): Match => ({
    id: str(r.id),
    patientId: str(r.patient_id),
    gpId: str(r.gp_id),
    patientRankScore: num(r.patient_rank_score),
    gpRankScore: num(r.gp_rank_score),
    similarity: num(r.similarity),
    position: num(r.position),
    matchStatus: r.match_status as Match["matchStatus"],
    rationale: r.rationale as Match["rationale"],
    patientBreakdown: (r.patient_breakdown as Match["patientBreakdown"]) ?? [],
    createdAt: str(r.created_at),
    decidedAt: strOrNull(r.decided_at),
    declineReason: (r.decline_reason as Match["declineReason"]) ?? null,
  }),
  match_feedback: (r: Row): Feedback => ({
    id: str(r.id),
    matchId: str(r.match_id),
    from: r.side as Feedback["from"],
    patientRating: (r.patient_rating as Feedback["patientRating"]) ?? null,
    gpRating: (r.gp_rating as Feedback["gpRating"]) ?? null,
    freeTextFeedback: str(r.free_text_feedback),
    createdAt: str(r.created_at),
  }),
  match_checklists: (r: Row): DocumentChecklist => ({
    id: str(r.id),
    patientId: str(r.patient_id),
    items: (r.items as DocumentChecklist["items"]) ?? [],
    generatedAt: str(r.generated_at),
  }),
};

const TABLES: readonly MatchingTable[] = ["match_gps", "match_patients", "match_matches", "match_feedback", "match_checklists"];

export class SupabaseJournal {
  private chain: Promise<void> = Promise.resolve();
  private hydration: Promise<void> | null = null;
  readonly stats: JournalStats = { queued: 0, flushed: 0, failed: 0, hydrated: false };

  constructor(
    private readonly endpoint: SupabaseEndpoint,
    private readonly fetchFn: FetchLike = (input, init) => fetch(input, init),
  ) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { apikey: this.endpoint.key, authorization: `Bearer ${this.endpoint.key}`, "content-type": "application/json", ...extra };
  }

  /** Queue one write; it flushes after every write queued before it. Never throws. */
  record(write: JournalWrite): void {
    this.stats.queued += 1;
    this.chain = this.chain.then(() => this.flush(write)).catch(() => undefined);
  }

  private async flush(write: JournalWrite): Promise<void> {
    try {
      const base = `${this.endpoint.url}/rest/v1/${write.table}`;
      const response =
        write.op === "upsert"
          ? await this.fetchFn(base, { method: "POST", headers: this.headers({ prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify(write.row) })
          : await this.fetchFn(`${base}?id=eq.${encodeURIComponent(write.id)}`, { method: "DELETE", headers: this.headers({ prefer: "return=minimal" }) });
      if (response.ok) this.stats.flushed += 1;
      else this.stats.failed += 1;
    } catch {
      this.stats.failed += 1;
    }
  }

  /** Wait for every queued write so far. For tests and for a graceful stop. */
  settle(): Promise<void> {
    return this.chain;
  }

  /**
   * Load every table into the state once. Rows already in memory (the seeded roster) are
   * overwritten by what the database holds, which is where a GP's edits live between instances.
   * A failed table leaves memory as it was; the failure is counted, and hydration is retried on
   * the next call rather than remembered as done.
   */
  hydrate(state: MatchingState): Promise<void> {
    this.hydration ??= this.load(state).finally(() => {
      if (!this.stats.hydrated) this.hydration = null;
    });
    return this.hydration;
  }

  private async load(state: MatchingState): Promise<void> {
    let allOk = true;
    for (const table of TABLES) {
      try {
        const response = await this.fetchFn(`${this.endpoint.url}/rest/v1/${table}?select=*`, { method: "GET", headers: this.headers() });
        if (!response.ok) {
          allOk = false;
          this.stats.failed += 1;
          continue;
        }
        const rows = (await response.json()) as Row[];
        for (const row of rows) applyRow(state, table, row);
      } catch {
        allOk = false;
        this.stats.failed += 1;
      }
    }
    this.stats.hydrated = allOk;
  }
}

export function applyRow(state: MatchingState, table: MatchingTable, row: Row): void {
  switch (table) {
    case "match_patients": {
      const p = fromRow.match_patients(row);
      state.patients.set(p.id, p);
      return;
    }
    case "match_gps": {
      const g = fromRow.match_gps(row);
      state.gps.set(g.id, g);
      return;
    }
    case "match_matches": {
      const m = fromRow.match_matches(row);
      state.matches.set(m.id, m);
      return;
    }
    case "match_feedback": {
      const f = fromRow.match_feedback(row);
      state.feedback.set(f.id, f);
      return;
    }
    case "match_checklists": {
      const c = fromRow.match_checklists(row);
      state.checklists.set(c.patientId, c);
      return;
    }
  }
}
