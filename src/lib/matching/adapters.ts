// Adapters between this service's entities and the rest of the tree: the demo roster's
// `Clinician` becomes a `GP`, and an intake (narrative plus a few declared facts) becomes a
// `Patient` with its structured signals read out.
//
// THE REAL-PERSON LAW (README §2, `src/demo/roster.ts` header) holds here: for a real person,
// nothing is invented. A field the roster does not declare is null and the page says "not
// declared".
//
// The intake reader introduces NO reading of its own (allocation.ts's rule): care asks and manner
// come from `readNeeds`, the concepts from the embedder's closed vocabulary, and a stated
// duration from a number the person wrote. Nothing infers severity.

import { capacityGrade, clinicians } from "@/demo/clinicians";
import type { Clinician } from "@/demo/roster";
import { readNeeds } from "@/matching/needs";
import type { ConceptId, Embedder } from "./embedding";
import {
  COMORBIDITIES,
  type AgeGroup,
  type BillingPreference,
  type Comorbidity,
  type ConsultStyle,
  type GP,
  type Patient,
  type StructuredSignals,
} from "./types";

/**
 * A real person gets no invented count: their roster entry declares books open or closed and nothing
 * more, so their list is ONE place, open or not, and the surfaces say "books declared open" rather
 * than a figure nobody stated (README §2).
 */
const REAL_PERSON_PLACES = { open: { current: 1, max: 1 }, closed: { current: 0, max: 1 } } as const;

/** A sentence: trimmed, with a full stop if the roster's text ended without one. */
function sentence(text: string): string {
  const t = text.trim();
  if (t === "") return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function isGeneralPractitioner(clinician: Clinician): boolean {
  return clinician.profession === undefined || clinician.profession === "gp";
}

export function gpFromClinician(clinician: Clinician, today: Date = new Date()): GP | null {
  if (!isGeneralPractitioner(clinician)) return null;
  const areas = [...clinician.careAreas, ...(clinician.careAreasSometimes ?? [])];
  const grade = capacityGrade(clinician, today);
  const places = grade === "closed" ? REAL_PERSON_PLACES.closed : REAL_PERSON_PLACES.open;
  const child = areas.includes("child-adolescent-adhd");
  const ageGroups: AgeGroup[] = child ? ["children", "adolescents", "adults"] : ["adults", "older-adults"];
  const caseloadMix = COMORBIDITIES.filter((c) => (areas as string[]).includes(c));
  const telehealth = clinician.telehealthFirstAppointment === true;
  const billing = billingFromSignals(clinician.practicalSignals);

  return {
    id: clinician.id,
    name: clinician.name,
    shortName: clinician.shortName,
    practice: clinician.practice,
    practiceLocation: { suburb: clinician.suburb, postcode: null },
    telehealthAvailable: telehealth,
    acceptingNewPatients: clinician.acceptingNewPatients,
    credentials: {
      racgpSpecificInterestsMember: null,
      aadpaTrained: null,
      stateAdhdTrained: clinician.nswAdhdTrained === true ? true : null,
      yearsTreatingAdhd: null,
      caseloadCapacityCurrent: places.current,
      caseloadCapacityMax: places.max,
      ageGroupsTreated: ageGroups,
      caseloadMix,
      prescribingPhilosophy: null,
      titrationPace: null,
      prescribingPhilosophyText: "",
      communicationStyle: clinician.manner,
      bioLongText: [
        sentence(clinician.focus),
        sentence(clinician.matchLine),
        sentence(clinician.summary),
        sentence(clinician.about),
        clinician.experience.length > 0 ? sentence(`Experience: ${clinician.experience.map((e) => e.trim().replace(/\.$/, "")).join("; ")}`) : "",
      ]
        .filter((s) => s.length > 0)
        .join(" "),
      videoIntroUrl: null,
      evidence: [],
    },
    preferences: {
      ageGroups,
      consultStyles: telehealth ? ["telehealth", "in-person"] : ["in-person"],
      billingAccepted: billing,
      acceptsComplexComorbidity: caseloadMix.length >= 2 || areas.includes("complex-mental-health"),
      minimumFit: 0.3,
    },
    bioEmbedding: null,
    practiceId: null,
    verificationStatus: "pending",
    verifiedBy: null,
    verifiedOn: null,
    ratingAggregate: null,
    conditions: ["adhd"],
    languages: clinician.languages.filter((l) => l !== "English"),
    appointmentLength: clinician.appointmentLength,
    realPerson: clinician.realPerson === true,
    image: clinician.image,
  };
}

function billingFromSignals(signals: readonly string[]): Array<Exclude<BillingPreference, "either">> {
  const text = signals.join(" ").toLowerCase();
  if (/bulk/.test(text)) return ["bulk-billing", "medicare-gap"];
  if (/mixed/.test(text)) return ["bulk-billing", "medicare-gap", "private"];
  if (/private/.test(text)) return ["medicare-gap", "private"];
  return ["medicare-gap", "private"];
}

/** Every GP on the roster, in its own order, allied entries left out. */
export function rosterGPs(today: Date = new Date(), roster: readonly Clinician[] = clinicians): GP[] {
  return roster.flatMap((c) => {
    const gp = gpFromClinician(c, today);
    return gp ? [gp] : [];
  });
}

interface IntakeInput {
  id: string;
  name: string;
  narrative: string;
  suburb: string;
  postcode?: string | null;
  email?: string | null;
  phone?: string | null;
  ageGroup: AgeGroup;
  consultStyle?: ConsultStyle;
  billing?: BillingPreference;
  createdAt: string;
}

const CONCEPT_TO_COMORBIDITY: Partial<Record<ConceptId, Comorbidity>> = {
  anxiety: "anxiety",
  depression: "depression",
  autism: "autism-adhd",
  trauma: "trauma-informed",
  substance: "substance-history",
  "emotional-regulation": "emotional-regulation",
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30,
};

/** A duration the person wrote ("for about six years", "for 8 months"); null otherwise. */
export function statedDurationMonths(narrative: string): number | null {
  const m = /\b(?:for|over|about|around|nearly|almost|past|last)\s+(?:about\s+|around\s+|nearly\s+|the\s+last\s+|the\s+past\s+)?(\d{1,2}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty)\s+(years?|months?)\b/i.exec(
    narrative,
  );
  if (!m) return null;
  const n = /^\d+$/.test(m[1]!) ? Number(m[1]) : NUMBER_WORDS[m[1]!.toLowerCase()];
  if (n === undefined) return null;
  return m[2]!.toLowerCase().startsWith("year") ? n * 12 : n;
}

export function readStructuredSignals(input: Pick<IntakeInput, "narrative" | "ageGroup" | "consultStyle" | "billing">, embedder: Embedder): StructuredSignals {
  const needs = readNeeds(input.narrative);
  const concepts = new Set(embedder.concepts(input.narrative));
  const careAsks = needs.flatMap((n) => (n.facet.kind === "care" ? [n.facet.area] : []));
  const manner = needs.flatMap((n) => (n.facet.kind === "manner" ? [n.facet.trait] : []));
  const prefs = new Set(needs.flatMap((n) => (n.facet.kind === "preference" ? [n.facet.preference] : [])));
  const comorbidities = new Set<Comorbidity>();
  for (const area of careAsks) if ((COMORBIDITIES as readonly string[]).includes(area)) comorbidities.add(area as Comorbidity);
  for (const concept of concepts) {
    const c = CONCEPT_TO_COMORBIDITY[concept];
    if (c) comorbidities.add(c);
  }
  const financial = concepts.has("cost") || concepts.has("bulk-billing") || prefs.has("bulk-billing");
  let consultStyle: ConsultStyle = input.consultStyle ?? "either";
  if (consultStyle === "either" && (prefs.has("telehealth-first") || concepts.has("telehealth"))) consultStyle = "telehealth";
  let billing: BillingPreference = input.billing ?? "either";
  if (billing === "either" && (prefs.has("bulk-billing") || concepts.has("bulk-billing"))) billing = "bulk-billing";
  const lower = input.narrative.toLowerCase();
  const mentionsMedication = concepts.has("medication-history") || concepts.has("stimulant-medication") || concepts.has("non-stimulant");
  const medicationHistory: StructuredSignals["medicationHistory"] = !mentionsMedication
    ? "none"
    : /\b(used to|was on|stopped|came off|came off of|tried|in the past)\b/.test(lower)
      ? "past"
      : "current";
  return {
    symptomDurationMonths: statedDurationMonths(input.narrative),
    stigmaSensitive: concepts.has("stigma"),
    financialConstraint: financial,
    comorbidities: COMORBIDITIES.filter((c) => comorbidities.has(c)),
    preferredConsultStyle: consultStyle,
    billingPreference: billing,
    ageGroup: input.ageGroup,
    priorAssessment: concepts.has("prior-assessment"),
    medicationHistory,
    communicationPreference: [...new Set(manner)],
    careAsks: [...new Set(careAsks)],
  };
}

export function patientFromIntake(input: IntakeInput, embedder: Embedder): Patient {
  return {
    id: input.id,
    name: input.name,
    contact: { email: input.email ?? null, phone: input.phone ?? null },
    location: { suburb: input.suburb, postcode: input.postcode ?? null },
    narrativeText: input.narrative,
    narrativeEmbedding: embedder.embed(input.narrative),
    structuredSignals: readStructuredSignals(input, embedder),
    documentsUploaded: [],
    status: "intake",
    condition: "adhd",
    createdAt: input.createdAt,
  };
}
