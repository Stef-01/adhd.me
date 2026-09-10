// The matching store: patients, GP profiles, matches, feedback and checklists, in memory behind
// `globalThis` in the same mock-persistence posture as every other store in the tree
// (`src/console/store.ts` header). `supabase/migrations/0006_matching.sql` mirrors the shape for
// the wiring unit (Phase M5); nothing here talks to a database.
//
// GP profiles are SEEDED from the roster the first time the store is read, and edits from the GP
// dashboard land on the copy here: the roster stays the declared record it is, the store holds
// what a GP has changed since. `resetMatching` drops everything, including the edits.
//
// Patient rows hold a narrative. They never leave this process, never reach a log line, and the
// mock introspection route returns counts, not rows (`app/api/mock/matching`).

import { rosterGPs } from "./adapters";
import type { PatientCriterion } from "./ranking";
import type { DocumentChecklist, Feedback, GP, Match, MatchStatus, Patient } from "./types";

export interface MatchingState {
  patients: Map<string, Patient>;
  gps: Map<string, GP>;
  matches: Map<string, Match>;
  feedback: Map<string, Feedback>;
  checklists: Map<string, DocumentChecklist>;
  /** Learned patient-side weights, or null while the loop has not moved them. */
  weights: Readonly<Record<PatientCriterion, number>> | null;
  /** The clock the roster was graded against when seeded. */
  seededAt: string | null;
}

const globalStore = globalThis as { __adhdMeMatching?: MatchingState };

function initial(): MatchingState {
  return { patients: new Map(), gps: new Map(), matches: new Map(), feedback: new Map(), checklists: new Map(), weights: null, seededAt: null };
}

export function getMatching(today: Date = new Date()): MatchingState {
  globalStore.__adhdMeMatching ??= initial();
  const state = globalStore.__adhdMeMatching;
  if (state.seededAt === null) {
    for (const gp of rosterGPs(today)) state.gps.set(gp.id, gp);
    state.seededAt = today.toISOString();
  }
  return state;
}

export function resetMatching(): MatchingState {
  globalStore.__adhdMeMatching = initial();
  return globalStore.__adhdMeMatching;
}

export function listGPs(state: MatchingState = getMatching()): GP[] {
  return [...state.gps.values()];
}

export function gpById(id: string, state: MatchingState = getMatching()): GP | null {
  return state.gps.get(id) ?? null;
}

export function saveGP(gp: GP, state: MatchingState = getMatching()): GP {
  state.gps.set(gp.id, gp);
  return gp;
}

export function savePatient(patient: Patient, state: MatchingState = getMatching()): Patient {
  state.patients.set(patient.id, patient);
  return patient;
}

export function patientById(id: string, state: MatchingState = getMatching()): Patient | null {
  return state.patients.get(id) ?? null;
}

/** Patients still waiting: intake or matched, with no accepted match yet. */
export function openPatients(state: MatchingState = getMatching()): Patient[] {
  return [...state.patients.values()].filter(
    (p) => (p.status === "intake" || p.status === "matched") && !matchesForPatient(p.id, state).some((m) => m.matchStatus === "accepted"),
  );
}

export function saveMatches(matches: readonly Match[], state: MatchingState = getMatching()): void {
  for (const m of matches) state.matches.set(m.id, m);
}

export function matchById(id: string, state: MatchingState = getMatching()): Match | null {
  return state.matches.get(id) ?? null;
}

export function matchesForPatient(patientId: string, state: MatchingState = getMatching()): Match[] {
  return [...state.matches.values()].filter((m) => m.patientId === patientId).sort((a, b) => a.position - b.position);
}

export function matchesForGP(gpId: string, state: MatchingState = getMatching()): Match[] {
  return [...state.matches.values()].filter((m) => m.gpId === gpId).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function allMatches(state: MatchingState = getMatching()): Match[] {
  return [...state.matches.values()];
}

export type StatusChange = { ok: true; match: Match } | { ok: false; reason: "not_found" | "not_open" };

/**
 * Move a match to a decided status. Only a proposed match can be accepted or declined, and only
 * an accepted one completed; a second answer from a stale page is refused, not re-applied.
 */
export function setMatchStatus(
  matchId: string,
  status: Exclude<MatchStatus, "proposed">,
  at: string,
  declineReason: Match["declineReason"] = null,
  state: MatchingState = getMatching(),
): StatusChange {
  const match = state.matches.get(matchId);
  if (!match) return { ok: false, reason: "not_found" };
  const allowed: Record<Exclude<MatchStatus, "proposed">, MatchStatus[]> = {
    accepted: ["proposed"],
    declined: ["proposed"],
    withdrawn: ["proposed", "accepted"],
    completed: ["accepted"],
  };
  if (!allowed[status].includes(match.matchStatus)) return { ok: false, reason: "not_open" };
  const next: Match = { ...match, matchStatus: status, decidedAt: at, declineReason: status === "declined" ? declineReason : null };
  state.matches.set(matchId, next);
  if (status === "accepted") {
    const patient = state.patients.get(match.patientId);
    if (patient) state.patients.set(patient.id, { ...patient, status: "booked" });
    const gp = state.gps.get(match.gpId);
    if (gp) {
      state.gps.set(gp.id, {
        ...gp,
        credentials: { ...gp.credentials, caseloadCapacityCurrent: Math.max(0, gp.credentials.caseloadCapacityCurrent - 1) },
      });
    }
  }
  if (status === "completed") {
    const patient = state.patients.get(match.patientId);
    if (patient) state.patients.set(patient.id, { ...patient, status: "consulted" });
  }
  return { ok: true, match: next };
}

export function saveFeedback(record: Feedback, state: MatchingState = getMatching()): Feedback {
  state.feedback.set(record.id, record);
  return record;
}

export function feedbackForMatch(matchId: string, state: MatchingState = getMatching()): Feedback[] {
  return [...state.feedback.values()].filter((f) => f.matchId === matchId);
}

export function allFeedback(state: MatchingState = getMatching()): Feedback[] {
  return [...state.feedback.values()];
}

export function saveChecklist(checklist: DocumentChecklist, state: MatchingState = getMatching()): DocumentChecklist {
  state.checklists.set(checklist.patientId, checklist);
  return checklist;
}

export function checklistFor(patientId: string, state: MatchingState = getMatching()): DocumentChecklist | null {
  return state.checklists.get(patientId) ?? null;
}

export function setChecklistItem(patientId: string, itemId: string, done: boolean, state: MatchingState = getMatching()): DocumentChecklist | null {
  const checklist = state.checklists.get(patientId);
  if (!checklist) return null;
  const next: DocumentChecklist = { ...checklist, items: checklist.items.map((i) => (i.id === itemId ? { ...i, done } : i)) };
  state.checklists.set(patientId, next);
  return next;
}

export function setWeights(weights: Readonly<Record<PatientCriterion, number>> | null, state: MatchingState = getMatching()): void {
  state.weights = weights;
}

/** Counts only: what the mock introspection route may say about this store. */
export function matchingCounts(state: MatchingState = getMatching()): Record<string, number> {
  return {
    patients: state.patients.size,
    gps: state.gps.size,
    matches: state.matches.size,
    feedback: state.feedback.size,
    checklists: state.checklists.size,
  };
}
