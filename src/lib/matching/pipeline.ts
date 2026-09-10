// The whole pipeline for one patient: embed, generate candidates, rank both sides, run deferred
// acceptance against the other open patients, present up to three with a rationale each.
//
// The three stages are separate modules on purpose (candidates.ts, ranking.ts,
// deferred-acceptance.ts) so each can be replaced or generalised alone: a dense embedder behind
// `Embedder`, a different condition's vocabularies behind `types.ts`, a different mechanism
// behind the same proposer/receiver lists. This file only composes them.

import { generateCandidates, type Candidate, type CandidateResult, distanceBetween, embeddingFor, narrativeEmbedding } from "./candidates";
import { deferredAcceptance, type Proposer, type Receiver } from "./deferred-acceptance";
import { LexicalEmbedder, cosine, sharedConcepts, type Embedder } from "./embedding";
import { gpBioText } from "./candidates";
import { explainMatch } from "./rationale";
import { PATIENT_WEIGHTS, rankGPsForPatient, rankPatientsForGP, type PatientCriterion, type RankedGP, type RankedPatient } from "./ranking";
import type { GP, Match, Patient } from "./types";

export const PRESENTED_PER_PATIENT = 3;

export interface PipelineOptions {
  embedder: Embedder;
  /** ISO datetime stamped on the match records. */
  now: string;
  /** Other patients still waiting on a match, who contest the same capacity. */
  openPatients?: readonly Patient[];
  weights?: Readonly<Record<PatientCriterion, number>>;
  radiusKm?: number;
  quota?: number;
  matchId?: (patientId: string, gpId: string) => string;
}

export interface PresentedMatch {
  match: Match;
  gp: GP;
  distanceKm: number | null;
}

export interface MatchOutcome {
  /** The patient with the embedding filled in. */
  patient: Patient;
  shortlist: CandidateResult;
  /** The patient side's ranking of the shortlist, best first. */
  patientRanking: readonly RankedGP[];
  /** Each shortlisted GP's ranking of this patient, keyed by GP id. */
  gpRankings: ReadonlyMap<string, RankedPatient>;
  presented: readonly PresentedMatch[];
  rounds: number;
  proposals: number;
  note: string | null;
}

/** An embedder fitted on the roster's bios, so rare words weigh more than common ones. */
export function fittedEmbedder(gps: readonly GP[]): LexicalEmbedder {
  return new LexicalEmbedder().fit(gps.map(gpBioText));
}

export function matchPatient(input: Patient, gps: readonly GP[], options: PipelineOptions): MatchOutcome {
  const { embedder } = options;
  const quota = options.quota ?? PRESENTED_PER_PATIENT;
  const weights = options.weights ?? PATIENT_WEIGHTS;
  const patient: Patient = { ...input, narrativeEmbedding: narrativeEmbedding(embedder, input) };
  const shortlist = generateCandidates(patient, gps, { embedder, radiusKm: options.radiusKm });
  const patientRanking = rankGPsForPatient(patient, shortlist.candidates, weights);

  // The contest: every open patient's own shortlist and ranking, over the same roster.
  const others = (options.openPatients ?? []).filter((p) => p.id !== patient.id);
  const otherRuns = others.map((other) => {
    const embedded: Patient = { ...other, narrativeEmbedding: narrativeEmbedding(embedder, other) };
    const list = generateCandidates(embedded, gps, { embedder, radiusKm: options.radiusKm });
    return { patient: embedded, candidates: list.candidates, ranking: rankGPsForPatient(embedded, list.candidates, weights) };
  });

  // Each shortlisted GP ranks everyone who shortlisted them, this patient included.
  const gpRankings = new Map<string, RankedPatient>();
  const receivers: Receiver[] = shortlist.candidates.map((candidate) => {
    const incoming = [
      { patient, similarity: candidate.similarity },
      ...otherRuns.flatMap((run) => {
        const c = run.candidates.find((x) => x.gp.id === candidate.gp.id);
        return c ? [{ patient: run.patient, similarity: c.similarity }] : [];
      }),
    ];
    const ranked = rankPatientsForGP(candidate.gp, incoming);
    const mine = ranked.find((r) => r.patientId === patient.id);
    if (mine) gpRankings.set(candidate.gp.id, mine);
    return {
      id: candidate.gp.id,
      preferences: ranked.filter((r) => r.acceptable).map((r) => r.patientId),
      capacity: candidate.gp.credentials.caseloadCapacityCurrent,
    };
  });
  // GPs on other patients' shortlists but not on this one still need to exist as receivers.
  const known = new Set(receivers.map((r) => r.id));
  for (const run of otherRuns) {
    for (const c of run.candidates) {
      if (known.has(c.gp.id)) continue;
      known.add(c.gp.id);
      const ranked = rankPatientsForGP(
        c.gp,
        otherRuns.flatMap((r) => {
          const x = r.candidates.find((y) => y.gp.id === c.gp.id);
          return x ? [{ patient: r.patient, similarity: x.similarity }] : [];
        }),
      );
      receivers.push({ id: c.gp.id, preferences: ranked.filter((r) => r.acceptable).map((r) => r.patientId), capacity: c.gp.credentials.caseloadCapacityCurrent });
    }
  }

  const proposers: Proposer[] = [
    { id: patient.id, preferences: patientRanking.map((r) => r.gpId), quota },
    ...otherRuns.map((run) => ({ id: run.patient.id, preferences: run.ranking.map((r) => r.gpId), quota })),
  ];
  const result = deferredAcceptance(proposers, receivers);
  const heldIds = result.held.get(patient.id) ?? [];

  const byId = new Map(shortlist.candidates.map((c) => [c.gp.id, c]));
  const presented: PresentedMatch[] = heldIds.slice(0, quota).map((gpId, index) => {
    const candidate = byId.get(gpId)!;
    const patientRank = patientRanking.find((r) => r.gpId === gpId)!;
    const gpRank = gpRankings.get(gpId) ?? null;
    const distance = candidate.distanceKm;
    const rationale = explainMatch({
      patient,
      gp: candidate.gp,
      similarity: candidate.similarity,
      sharedConcepts: sharedConcepts(embedder, patient.narrativeText, gpBioText(candidate.gp)),
      patientRank,
      gpRank,
      distanceKm: distance,
    });
    const match: Match = {
      id: options.matchId ? options.matchId(patient.id, gpId) : `m-${patient.id}-${gpId}`,
      patientId: patient.id,
      gpId,
      patientRankScore: patientRank.score,
      gpRankScore: gpRank?.score ?? 0,
      similarity: candidate.similarity,
      position: index + 1,
      matchStatus: "proposed",
      rationale,
      patientBreakdown: patientRank.breakdown,
      createdAt: options.now,
      decidedAt: null,
      declineReason: null,
    };
    return { match, gp: candidate.gp, distanceKm: distance };
  });

  let note = shortlist.note;
  if (presented.length === 0 && shortlist.candidates.length > 0) {
    note = "Every GP on the shortlist is holding other requests or asked not to be proposed this one. Nothing is presented rather than something forced.";
  } else if (presented.length < quota && shortlist.candidates.length >= quota) {
    note = `${presented.length} presented rather than ${quota}: the others on the shortlist are holding other requests, or asked not to be proposed this one.`;
  }

  return { patient, shortlist, patientRanking, gpRankings, presented, rounds: result.rounds, proposals: result.proposals, note };
}

/** Similarity for one pair, for surfaces that show it outside a run. */
export function pairSimilarity(embedder: Embedder, patient: Patient, gp: GP): number {
  return cosine(narrativeEmbedding(embedder, patient), embeddingFor(embedder, gp));
}

export type { Candidate };
export { distanceBetween };
