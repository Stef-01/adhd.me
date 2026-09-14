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
export interface CareProvider { careProfile?: CareDeclaration; synthetic?: boolean; careAreas?: readonly string[]; expertise?: readonly string[]; approach?: readonly string[] }
export const isCareNeed = (value: unknown): value is CareNeed => typeof value === "string" && Object.hasOwn(CARE_NEEDS, value);
export const isIdentityPreference = (value: unknown): value is ClinicianIdentityPreference => typeof value === "string" && Object.hasOwn(IDENTITY_LABELS, value);
export function publicCareProfile(provider: CareProvider): CareDeclaration | undefined {
  const profile = provider.careProfile;
  if (!profile?.declaredAt || (!/^https:\/\//.test(profile.source) && !(provider.synthetic && profile.source === "fictional-example"))) return undefined;
  return profile;
}
export function publicIdentity(provider: CareProvider) { const profile = publicCareProfile(provider); return profile?.identity?.publish ? profile.identity : undefined; }
const LEGACY_AREAS: Partial<Record<CareNeed, string>> = { anxiety: "anxiety", depression: "depression", trauma: "trauma-informed", autism: "autism-adhd", "substance-use": "substance-history" };
export function declaresCareNeed(provider: CareProvider, need: CareNeed): boolean {
  return publicCareProfile(provider)?.needs.includes(need) === true
    || (need === "whole-person" && provider.approach?.includes("holistic") === true)
    || (need === "university-adjustments" && provider.expertise?.includes("university-adhd") === true)
    || (need === "workplace-adjustments" && provider.expertise?.includes("workplace-adjustments") === true)
    || (!!LEGACY_AREAS[need] && provider.careAreas?.includes(LEGACY_AREAS[need]!) === true);
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
const CUES: Partial<Record<CareNeed, RegExp>> = {
  "whole-person": /\b(?:holistic|whole[- ]person)\b/i,
  "spiritual-wellbeing": /\bspiritual(?:ity| health| wellbeing)?\b/i,
  "social-emotional-wellbeing": /\b(?:social and emotional wellbeing|sewb)\b/i,
  "family-community": /\b(?:family involvement|community support)\b/i,
  "connection-country": /\bconnection to country\b/i,
  "university-adjustments": /\b(?:university|uni|study|exam) (?:accommodations?|accomodations?|adjustments?|support)\b/i,
  "workplace-adjustments": /\b(?:workplace|work) (?:accommodations?|adjustments?)\b/i,
  autism: /\b(?:autism|autistic|audhd)\b/i, "sensory-needs": /\bsensory (?:needs|overload|support)\b/i,
  "learning-differences": /\b(?:dyslexia|dyscalculia|learning differences)\b/i,
  anxiety: /\banxiety\b/i, depression: /\b(?:depression|low mood)\b/i, trauma: /\b(?:trauma|ptsd)\b/i,
  ocd: /\bocd\b/i, bipolar: /\bbipolar\b/i, tics: /\b(?:tics|tourette'?s?)\b/i,
  "substance-use": /\b(?:substance use|addiction)\b/i, "eating-concerns": /\b(?:eating disorder|disordered eating|arfid)\b/i,
  sleep: /\b(?:insomnia|sleep apnea|sleep apnoea|sleep difficulties)\b/i,
  "chronic-pain": /\b(?:chronic pain|persistent pain)\b/i, fatigue: /\b(?:chronic fatigue|fatigue support)\b/i,
};
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
  return { clinicianIdentity, careNeeds: Object.entries(CUES).filter(([, pattern]) => positive(pattern!)).map(([need]) => need as CareNeed) };
}
export function combineCarePreferences(saved: CarePreferences, request: CarePreferences): CarePreferences {
  return { clinicianIdentity: saved.clinicianIdentity && saved.clinicianIdentity !== "any" ? saved.clinicianIdentity : request.clinicianIdentity,
    country: saved.country, careNeeds: [...new Set([...(saved.careNeeds ?? []), ...(request.careNeeds ?? [])])] };
}
