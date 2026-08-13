// W183: what a public directory profile may contain.
//
// A profile is the first thing this product publishes ABOUT A NAMED PERSON to people who are
// not the practice. Everything else the tree emits is either internal (a console a practice
// signed into) or about the practice itself. That changes what a mistake costs: a wrong figure
// on a dashboard is a wrong figure, and a wrong sentence beside a clinician's name is regulated
// advertising with their registration attached to it.
//
// SO THE MODEL IS THE CONTROL, NOT A LINTER OVER THE MODEL. W114 already lints scope labels and
// refuses the specialist title beside a narrow scope. That is a good check and it stays. But a
// check runs, and a check that runs can be routed around by a caller that builds the object a
// different way. This unit's gate is that the bad shapes cannot be WRITTEN.
//
// THE s 133 CONSTRUCTION, WHICH IS THE WHOLE POINT OF THE FILE:
//
//   Using "specialist" without specialist registration is an offence under s 133 of the National
//   Law, and the damage is worst beside a narrow scope, where it reads as "specialist in
//   <condition>" — a claim nobody made and everybody hears.
//
//   A profile is therefore one of two shapes, and they are exclusive. A GENERAL profile carries
//   declared focus areas and has no specialty. A SPECIALIST profile carries a recognised Ahpra
//   specialty and its `focus` field is typed `never`. Writing a specialty beside a focus list is
//   a TYPE ERROR — not a lint failure, not a runtime refusal, not a rule somebody can forget to
//   call. There is no code path that produces the combination because the combination does not
//   typecheck.
//
//   `RecognisedSpecialty` is a closed list of specialties Ahpra actually recognises. It is not a
//   string, so "specialist in PMOS" cannot be invented — the nearest representable thing is a
//   general profile with a declared focus, which is what such a clinician actually is.
//
// WHAT IS ABSENT, AND ABSENT BY CONSTRUCTION: no rating, no star, no score, no review, no
// testimonial, no endorsement, no free-text "about" paragraph. CLAUDE.md law 6 bans the first
// several outright. The last one is the interesting refusal: a free-text bio is where every
// banned thing reappears wearing different clothes, because it is the field nobody can lint
// meaningfully and everybody wants. Every human-authored string here is a `ScopeStatement`,
// which W114 will only mint after both linters pass.
//
// FOUNDER GATE G6. Nothing ships. `SHIPPED_DIRECTORY_PROFILES` is empty and pinned empty by its
// own test, the same device as the nine registries W161-W163 left empty: the model may exist
// before the Ahpra advertising review, the content may not.

import type { ScopeStatement } from "@/credentials/scope";

/**
 * Professions with general registration, closed.
 *
 * A string here would let a practice write its own profession, and "profession" is exactly the
 * field where an unregulated title would land.
 */
export type RegisteredProfession =
  | "general_practitioner"
  | "registered_nurse"
  | "nurse_practitioner"
  | "psychologist"
  | "dietitian";

/**
 * Ahpra-recognised specialties, closed.
 *
 * Short on purpose: this list is a statement about what the register recognises, and adding to
 * it is a factual claim somebody has to check, not a convenience.
 */
export type RecognisedSpecialty = "general_practice" | "obstetrics_and_gynaecology" | "endocrinology";

/** Where a clinician can be seen. Checkable facts, not descriptions. */
export interface PracticeLocation {
  practiceId: string;
  suburb: string;
  state: "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
}

/** Fields every profile has, whichever shape it is. */
interface ProfileCore {
  clinicianId: string;
  /** The clinician's own name. The only unlinted free text, because it is a fact about them. */
  displayName: string;
  /** Registration number, so a reader can check the claim on the public register themselves. */
  ahpraRegistrationNumber: string;
  location: PracticeLocation;
  /** Languages spoken, as declared by the clinician. Checkable, and not a claim about care. */
  languages: readonly string[];
  /** Whether they are currently accepting new patients. A fact, and a perishable one. */
  acceptingNewPatients: boolean;
}

/**
 * A clinician holding general registration.
 *
 * `focus` is where "women's health", "chronic disease" and the rest live, and every entry is a
 * `ScopeStatement` — W114's brand, mintable only through `scopeStatement()`, which runs the W23
 * marketing rules and the W6 message rules and refuses "specialist" beside a narrow scope.
 * Reached through its own module so a rule added there reaches profiles the same day.
 */
export interface GeneralProfile extends ProfileCore {
  descriptor: { kind: "general_registration"; profession: RegisteredProfession };
  focus: readonly ScopeStatement[];
  specialty?: never;
}

/**
 * A clinician on the specialist register.
 *
 * `focus` is `never`, which is the s 133 construction: a recognised specialist may be named as
 * one, and may NOT simultaneously carry a list of narrow interests that would render as
 * "specialist in <thing>". A specialist who also wants focus areas published is asking to be
 * two profiles, and the type makes them say so.
 */
export interface SpecialistProfile extends ProfileCore {
  descriptor: { kind: "recognised_specialist"; specialty: RecognisedSpecialty };
  focus?: never;
  specialty: RecognisedSpecialty;
}

export type DirectoryProfile = GeneralProfile | SpecialistProfile;

/**
 * Every field a profile may emit, declared.
 *
 * Tree-checked against a real profile's own keys, so adding a field to the type without adding
 * it here fails — which is what makes W184's linter able to promise it reaches every field
 * rather than every field somebody remembered.
 */
export const PROFILE_FIELDS: readonly string[] = [
  "acceptingNewPatients",
  "ahpraRegistrationNumber",
  "clinicianId",
  "descriptor",
  "displayName",
  "focus",
  "languages",
  "location",
  "specialty",
];

/**
 * Shapes this model refuses to have a field for, with the reason.
 *
 * Data rather than a comment, so the test that scans this module for them reads the same list a
 * human does, and so a future unit adding one has to delete a stated refusal rather than simply
 * add a property.
 */
export const REFUSED_FIELDS: Readonly<Record<string, string>> = {
  rating: "A rating is a testimonial with a number on it. CLAUDE.md law 6, and Ahpra's advertising guidelines treat both the same way.",
  review: "Patient reviews of health services are prohibited testimonials, whatever they are called.",
  testimonial: "Prohibited outright. There is no compliant way to publish one.",
  endorsement: "A free-text endorsement is a testimonial written by a colleague instead of a patient.",
  starRating: "A star is a rating.",
  score: "A score ranks clinicians against each other, which W83 already refused internally and which is worse in public.",
  waitTime: "Would be a performance claim about a practice, derived from data whose completeness the product cannot vouch for.",
  bio: "A free-text biography is where every refusal above reappears in prose. Focus areas are ScopeStatements precisely so there is no unlinted paragraph.",
};

/**
 * FOUNDER GATE G6 — nothing is published.
 *
 * Empty, and pinned empty by its own test. The public directory needs an Ahpra advertising
 * review of every field a profile can emit, which is a founder act. The model can exist before
 * that review; the content cannot.
 */
export const SHIPPED_DIRECTORY_PROFILES: readonly DirectoryProfile[] = [];

/** True when a profile names a recognised specialty. Narrow helper, so callers stop re-testing. */
export function isSpecialist(profile: DirectoryProfile): profile is SpecialistProfile {
  return profile.descriptor.kind === "recognised_specialist";
}

/**
 * The focus statements a profile publishes.
 *
 * A specialist profile has none — not "an empty list we chose to render as nothing", but none,
 * because the field does not exist on that shape. Callers get `[]` so they need no branch, and
 * the reason is here rather than rediscovered at each call site.
 */
export function publishedFocus(profile: DirectoryProfile): readonly ScopeStatement[] {
  return isSpecialist(profile) ? [] : profile.focus;
}
