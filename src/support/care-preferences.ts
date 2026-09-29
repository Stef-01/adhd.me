export const CARE_NEEDS = {
  "whole-person": "Whole-person care", "spiritual-wellbeing": "Spiritual wellbeing",
  "social-emotional-wellbeing": "Social and emotional wellbeing", "family-community": "Family and community",
  "connection-country": "Connection to Country", "university-adjustments": "University accommodations",
  "workplace-adjustments": "Workplace adjustments", "autism": "Autism alongside ADHD",
  "sensory-needs": "Sensory needs", "learning-differences": "Learning differences",
  "anxiety": "Anxiety", "depression": "Low mood and depression", "trauma": "Trauma-informed support",
  "ocd": "OCD", "bipolar": "Bipolar disorder", "tics": "Tics and Tourette syndrome",
  "substance-use": "Substance use", "eating-concerns": "Eating concerns",
  "sleep": "Sleep difficulties", "chronic-pain": "Persistent pain", "fatigue": "Fatigue",
  "movement": "Movement and physical health", "relationships": "Relationships", "daily-routines": "Daily routines",
} as const;
export type CareNeed = keyof typeof CARE_NEEDS;
export const IDENTITY_LABELS = {
  any: "No preference", aboriginal: "Aboriginal clinician", "torres-strait-islander": "Torres Strait Islander clinician",
  either: "Aboriginal or Torres Strait Islander clinician",
} as const;
export type ClinicianIdentityPreference = keyof typeof IDENTITY_LABELS;
export interface CarePreferences { careNeeds?: CareNeed[]; clinicianIdentity?: ClinicianIdentityPreference; country?: string }
export interface CareDeclaration {
  needs: readonly CareNeed[];
  /** Source of the clinician's own declaration, never inferred from a name, portrait or address. */
  source: string;
  declaredAt: string;
  identity?: {
    identities: readonly ("aboriginal" | "torres-strait-islander")[];
    /** The clinician's own wording, distinct from their consulting location. */
    country?: string;
    publish: boolean;
  };
}
export interface CareProvider { careProfile?: CareDeclaration; synthetic?: boolean; careAreas?: readonly string[]; careAreasSometimes?: readonly string[]; expertise?: readonly string[]; approach?: readonly string[] }
export const isCareNeed = (value: unknown): value is CareNeed => typeof value === "string" && Object.hasOwn(CARE_NEEDS, value);
export const isIdentityPreference = (value: unknown): value is ClinicianIdentityPreference => typeof value === "string" && Object.hasOwn(IDENTITY_LABELS, value);
export function publicCareProfile(provider: CareProvider): CareDeclaration | undefined {
  const profile = provider.careProfile;
  if (!profile?.declaredAt || (!/^https:\/\//.test(profile.source) && !(provider.synthetic && profile.source === "fictional-example"))) return undefined;
  return profile;
}
export function publicIdentity(provider: CareProvider) { const profile = publicCareProfile(provider); return profile?.identity?.publish ? profile.identity : undefined; }
const LEGACY_AREAS: Partial<Record<CareNeed, string>> = { anxiety: "anxiety", depression: "depression", trauma: "trauma-informed", autism: "autism-adhd", "substance-use": "substance-history" };
function declaresCareNeed(provider: CareProvider, need: CareNeed): boolean {
  return publicCareProfile(provider)?.needs.includes(need) === true
    || (need === "whole-person" && provider.approach?.includes("holistic") === true)
    || (need === "university-adjustments" && provider.expertise?.includes("university-adhd") === true)
    || (need === "workplace-adjustments" && provider.expertise?.includes("workplace-adjustments") === true)
    || (!!LEGACY_AREAS[need] && [...(provider.careAreas ?? []), ...(provider.careAreasSometimes ?? [])].includes(LEGACY_AREAS[need]!));
}
export function matchesCare(provider: CareProvider, preferences: CarePreferences): boolean {
  if ((preferences.careNeeds ?? []).some(need => !declaresCareNeed(provider, need))) return false;
  const identity = publicIdentity(provider);
  const wanted = preferences.clinicianIdentity ?? "any";
  if (wanted !== "any" && (!identity || (wanted === "either" ? identity.identities.length === 0 : !identity.identities.includes(wanted)))) return false;
  const country = preferences.country?.trim().toLocaleLowerCase();
  if (country && identity?.country?.trim().toLocaleLowerCase() !== country) return false;
  return true;
}
/** Extract stated care topics, not a diagnosis or an assumption about the patient's identity. */
export function carePreferencesFromRequest(request: string): CarePreferences {
  const clauses = request.split(/[.!?;\n]|\bbut\b/i);
  const positive = (pattern: RegExp) => clauses.some(clause => {
    const match = pattern.exec(clause);
    return match && !/(?:\b(?:not|no|don't|do not|without)\b|\bnon[- ])/i.test(clause.slice(Math.max(0, match.index - 38), match.index));
  });
  const role = "(?:clinician|doctor|gp|psychologist|therapist|provider|psychiatrist|ot|counsellor)";
  let clinicianIdentity: ClinicianIdentityPreference = "any";
  if (positive(new RegExp("\\b(?:Aboriginal or Torres Strait Islander|First Nations|Indigenous) " + role + "\\b", "i"))) clinicianIdentity = "either";
  else if (positive(new RegExp("\\bAboriginal " + role + "\\b", "i"))) clinicianIdentity = "aboriginal";
  else if (positive(new RegExp("\\bTorres Strait Islander " + role + "\\b", "i"))) clinicianIdentity = "torres-strait-islander";
  /* R17 (qa/matching/rca.md, 2026-09-29): a care word in the sentence ORDERS the list and never narrows it.
     Until tonight "anxiety", "depression", "trauma", "autism" and a dozen more in the request became hard
     filters here, so "an assessment … someone who has ADHD themselves … I have anxiety as well" ran over the
     twelve clinicians who declare anxiety and none of the three who have ADHD themselves. The lexicon already
     reads every one of those words as a weighted need; a filter is a choice a person makes on the filters
     screen or in their saved preferences, not a topic they mentioned. The clinician's identity stays: "an
     Aboriginal clinician" names the clinician, not a topic. */
  return { clinicianIdentity, careNeeds: [] };
}
export function combineCarePreferences(saved: CarePreferences, request: CarePreferences): CarePreferences {
  return { clinicianIdentity: saved.clinicianIdentity && saved.clinicianIdentity !== "any" ? saved.clinicianIdentity : request.clinicianIdentity,
    country: saved.country, careNeeds: [...new Set([...(saved.careNeeds ?? []), ...(request.careNeeds ?? [])])] };
}
