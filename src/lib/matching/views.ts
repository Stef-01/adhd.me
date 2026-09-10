// What the surfaces are allowed to see, and how an intake body is validated. The API routes and
// pages read these shapes rather than the store's rows, so a page cannot render a field this
// module did not decide to show: the patient's narrative goes to the patient's own screen and
// to the GP who was proposed to them, never anywhere else; a GP's public view carries no
// evidence file names and no per-record feedback.

import { whatToExpect, type ExpectationSection } from "./checklist";
import { conceptLabel } from "./embedding";
import { feltUnderstoodCopy } from "./feedback";
import { AGE_GROUPS, type AgeGroup, type BillingPreference, type ConsultStyle, type DocumentChecklist, type GP, type Match, type Patient } from "./types";

export type AvailabilityGrade = "open" | "few" | "closed";

export interface GPPublicView {
  id: string;
  name: string;
  shortName: string;
  practice: string;
  suburb: string;
  image: string | null;
  realPerson: boolean;
  telehealthAvailable: boolean;
  appointmentLength: string;
  languages: readonly string[];
  bio: string;
  prescribingPhilosophyText: string;
  ageGroups: readonly AgeGroup[];
  caseloadMix: readonly string[];
  communicationStyle: readonly string[];
  credentials: {
    racgpSpecificInterestsMember: boolean | null;
    aadpaTrained: boolean | null;
    stateAdhdTrained: boolean | null;
    yearsTreatingAdhd: number | null;
    prescribingPhilosophy: GP["credentials"]["prescribingPhilosophy"];
    titrationPace: GP["credentials"]["titrationPace"];
  };
  verification: { status: GP["verificationStatus"]; verifiedOn: string | null };
  availability: { grade: AvailabilityGrade; placesOpen: number; placesMax: number; acceptingNewPatients: boolean; copy: string };
  /** The one aggregate sentence a patient may read, or null. */
  feltUnderstood: string | null;
  videoIntroUrl: string | null;
}

export function availabilityOf(gp: GP): GPPublicView["availability"] {
  const open = gp.credentials.caseloadCapacityCurrent;
  const max = gp.credentials.caseloadCapacityMax;
  const grade: AvailabilityGrade = !gp.acceptingNewPatients || open <= 0 ? "closed" : max > 1 && open <= 2 ? "few" : "open";
  const copy =
    grade === "closed"
      ? "Not taking new matches right now."
      : max === 1
        ? "Books declared open."
        : grade === "few"
          ? `${open} of ${max} declared places open.`
          : `Taking new matches: ${open} of ${max} declared places open.`;
  return { grade, placesOpen: open, placesMax: max, acceptingNewPatients: gp.acceptingNewPatients, copy };
}

export function gpPublicView(gp: GP): GPPublicView {
  const c = gp.credentials;
  return {
    id: gp.id,
    name: gp.name,
    shortName: gp.shortName,
    practice: gp.practice,
    suburb: gp.practiceLocation.suburb,
    image: gp.image,
    realPerson: gp.realPerson,
    telehealthAvailable: gp.telehealthAvailable,
    appointmentLength: gp.appointmentLength,
    languages: gp.languages,
    bio: c.bioLongText,
    prescribingPhilosophyText: c.prescribingPhilosophyText,
    ageGroups: c.ageGroupsTreated,
    caseloadMix: c.caseloadMix,
    communicationStyle: c.communicationStyle,
    credentials: {
      racgpSpecificInterestsMember: c.racgpSpecificInterestsMember,
      aadpaTrained: c.aadpaTrained,
      stateAdhdTrained: c.stateAdhdTrained,
      yearsTreatingAdhd: c.yearsTreatingAdhd,
      prescribingPhilosophy: c.prescribingPhilosophy,
      titrationPace: c.titrationPace,
    },
    verification: { status: gp.verificationStatus, verifiedOn: gp.verifiedOn },
    availability: availabilityOf(gp),
    feltUnderstood: feltUnderstoodCopy(gp.ratingAggregate),
    videoIntroUrl: c.videoIntroUrl,
  };
}

export interface MatchView {
  id: string;
  position: number;
  status: Match["matchStatus"];
  declineReason: Match["declineReason"];
  rationale: Match["rationale"];
  patientRankScore: number;
  gpRankScore: number;
  gp: GPPublicView;
}

export interface PatientView {
  id: string;
  status: Patient["status"];
  suburb: string;
  signals: Patient["structuredSignals"];
  /** The concepts the narrative reached, as labels, so the page can say what was heard. */
  heard: readonly string[];
  matches: readonly MatchView[];
  checklist: DocumentChecklist | null;
  /** What to expect at the first appointment, for the accepted GP or else the first match. */
  expectations: { gpName: string; sections: readonly ExpectationSection[] } | null;
  note: string | null;
}

export function matchView(match: Match, gp: GP): MatchView {
  return {
    id: match.id,
    position: match.position,
    status: match.matchStatus,
    declineReason: match.declineReason,
    rationale: match.rationale,
    patientRankScore: match.patientRankScore,
    gpRankScore: match.gpRankScore,
    gp: gpPublicView(gp),
  };
}

export function patientView(
  patient: Patient,
  matches: readonly Match[],
  gpFor: (id: string) => GP | null,
  checklist: DocumentChecklist | null,
  heard: readonly string[],
  note: string | null,
): PatientView {
  const accepted = matches.find((m) => m.matchStatus === "accepted" || m.matchStatus === "completed") ?? matches[0] ?? null;
  const expectGp = accepted ? gpFor(accepted.gpId) : null;
  return {
    id: patient.id,
    status: patient.status,
    suburb: patient.location.suburb,
    signals: patient.structuredSignals,
    heard: heard.map((c) => conceptLabel(c as Parameters<typeof conceptLabel>[0])),
    matches: matches.flatMap((m) => {
      const gp = gpFor(m.gpId);
      return gp ? [matchView(m, gp)] : [];
    }),
    checklist,
    expectations: expectGp ? { gpName: expectGp.shortName, sections: whatToExpect(patient, expectGp) } : null,
    note,
  };
}

/** What the GP dashboard shows about a proposed patient: the request, never the contact. */
export interface IncomingRequestView {
  matchId: string;
  status: Match["matchStatus"];
  position: number;
  createdAt: string;
  narrative: string;
  suburb: string;
  signals: Patient["structuredSignals"];
  rationale: Match["rationale"];
  gpRankScore: number;
  patientRankScore: number;
  declineReason: Match["declineReason"];
}

export function incomingRequestView(match: Match, patient: Patient): IncomingRequestView {
  return {
    matchId: match.id,
    status: match.matchStatus,
    position: match.position,
    createdAt: match.createdAt,
    narrative: patient.narrativeText,
    suburb: patient.location.suburb,
    signals: patient.structuredSignals,
    rationale: match.rationale,
    gpRankScore: match.gpRankScore,
    patientRankScore: match.patientRankScore,
    declineReason: match.declineReason,
  };
}

export const NARRATIVE_MAX = 2000;
export const NARRATIVE_MIN = 12;

export interface IntakeBody {
  narrative: string;
  suburb: string;
  ageGroup: AgeGroup;
  consultStyle: ConsultStyle;
  billing: BillingPreference;
  name: string;
}

export type IntakeValidation = { ok: true; body: IntakeBody } | { ok: false; error: "not_an_object" | "narrative" | "suburb" | "age_group" | "consult_style" | "billing" };

const CONSULT_STYLES: readonly ConsultStyle[] = ["telehealth", "in-person", "either"];
const BILLING: readonly BillingPreference[] = ["bulk-billing", "medicare-gap", "private", "either"];

export function validateIntake(payload: unknown): IntakeValidation {
  if (!payload || typeof payload !== "object") return { ok: false, error: "not_an_object" };
  const p = payload as Record<string, unknown>;
  const narrative = typeof p.narrative === "string" ? p.narrative.trim() : "";
  if (narrative.length < NARRATIVE_MIN || narrative.length > NARRATIVE_MAX) return { ok: false, error: "narrative" };
  const suburb = typeof p.suburb === "string" ? p.suburb.trim().slice(0, 80) : "";
  if (suburb.length === 0) return { ok: false, error: "suburb" };
  const ageGroup = p.ageGroup;
  if (typeof ageGroup !== "string" || !(AGE_GROUPS as readonly string[]).includes(ageGroup)) return { ok: false, error: "age_group" };
  const consultStyle = p.consultStyle ?? "either";
  if (typeof consultStyle !== "string" || !(CONSULT_STYLES as readonly string[]).includes(consultStyle)) return { ok: false, error: "consult_style" };
  const billing = p.billing ?? "either";
  if (typeof billing !== "string" || !(BILLING as readonly string[]).includes(billing)) return { ok: false, error: "billing" };
  const name = typeof p.name === "string" ? p.name.trim().slice(0, 80) : "";
  return {
    ok: true,
    body: { narrative, suburb, ageGroup: ageGroup as AgeGroup, consultStyle: consultStyle as ConsultStyle, billing: billing as BillingPreference, name },
  };
}
