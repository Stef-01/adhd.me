// W193: a public profile is a disclosure, and the subject is a clinician.
//
// Everything the privacy work in this tree has done so far has a patient as its subject. W33
// answers a patient's access request, W51 found the store erasure missed, W106 enumerates every
// class that can hold a patient's identity. A directory profile is the first thing that discloses
// a NAMED CLINICIAN, to everybody, permanently — and none of that machinery is pointed at them.
//
// TWO PROPERTIES MAKE THIS DIFFERENT FROM EVERY EXPORT THE TREE ALREADY BUILDS.
//
//   IT CANNOT BE RECALLED. W177 said this about a downloaded file and it is more true here: a
//   published page is indexed, cached and quoted. "Remove it from the directory" removes it from
//   the directory. Erasure is not available as a remedy, so the only control that works is the
//   one applied before publication — which is why this module is a boundary and not a report.
//
//   AND THE CLINICIAN'S OTHER DATA IS EVERYWHERE. Thirty-three modules hold a `clinicianId`:
//   their credentials and the evidence behind them, their capability graph, their referral acts,
//   their CPD reading, their session config, the complaints their practice recorded. Every one of
//   those is a fact about the same person the directory names, and any of them would be a
//   catastrophic thing to publish. The distance between "profile" and "disaster" is one careless
//   join, and a join is a thing somebody writes on a Tuesday.
//
// SO THE CONTROL IS THE TYPE, NOT A REVIEW.
//
//   `DirectoryProfile` (W183) holds five scalars, a location, a language list and `ScopeStatement`
//   values. There is no field on it typed as a credential, an experience count, a complaint or a
//   referral, so publishing one is not something a caller can do carelessly — it is something they
//   would have to build a new field for. The `@ts-expect-error` cases in this unit's tests are the
//   assertion: each names a real clinician-keyed type from the tree and shows it does not fit.
//
//   THAT IS THE ONLY KIND OF GUARANTEE WORTH HAVING HERE, because the alternative — a runtime
//   scrubber over an object on its way out — has to be correct about every field that exists
//   today and every field added later. W51's failure was exactly that shape: a scrubber that knew
//   about the stores it was written for.
//
// AND WHAT DOES LEAVE IS ENUMERATED, WITH ITS BASIS. `DISCLOSED_FIELDS` carries one entry per
// field a profile can emit, tree-checked against W183's `PROFILE_FIELDS` in both directions, and
// each entry says whose claim the field is: checkable on a public register, or declared by the
// clinician and checked by nobody. A reader of a published page cannot tell those apart, and W187
// renders the distinction for exactly that reason. This is the same distinction, held as data, so
// the page and the privacy record cannot drift into disagreeing about it.

import { PROFILE_FIELDS } from "./profile";

/** Whose claim a disclosed field is, and therefore what a reader may rely on. */
export type DisclosureBasis =
  /** Verifiable by the reader against a public register or a public fact. */
  | "checkable"
  /** The clinician told us. Meherr has not checked it and does not assess it. */
  | "declared"
  /** Neither: an identifier the product needs, which is not a claim about anybody. */
  | "identifier";

export interface DisclosedField {
  basis: DisclosureBasis;
  /** What actually leaves, in the words a person would use. */
  what: string;
  /** Why disclosing it is justified — required, because an undocumented disclosure is a guess. */
  why: string;
}

/**
 * Every field that leaves the tenancy when a profile is published.
 *
 * One entry per `PROFILE_FIELDS` entry, checked both directions by this unit's tests: a field
 * added to the profile without an entry here fails, and an entry naming a field the profile no
 * longer has fails too. "We enumerated what we disclose" is otherwise a claim about what the
 * author remembered on the day.
 */
export const DISCLOSED_FIELDS: Readonly<Record<string, DisclosedField>> = {
  clinicianId: {
    basis: "identifier",
    what: "An internal identifier for the clinician.",
    why: "Needed to link a published page back to the record it came from, so a correction (W190) reaches the right profile. It is not rendered as copy and says nothing about the person.",
  },
  displayName: {
    basis: "declared",
    what: "The clinician's name as they gave it.",
    why: "A directory that does not name people is not a directory. It is the clinician's own name, published on their own decision, and W184 lints it because a name field is also where a title goes.",
  },
  ahpraRegistrationNumber: {
    basis: "checkable",
    what: "The public registration number.",
    why: "Already public on the Ahpra register by law. Publishing it is what makes every other claim on the page checkable BY THE READER rather than on our word, which is the whole alternative this product offers to testimonials.",
  },
  descriptor: {
    basis: "checkable",
    what: "Profession, or a recognised specialty.",
    why: "A closed enum whose values are registration categories, verifiable on the same public register. Nothing free-text can reach it.",
  },
  specialty: {
    basis: "checkable",
    what: "A recognised Ahpra specialty, where one applies.",
    why: "Same register, same reasoning. In practice nothing is published under it — W187 refuses to render a specialist profile at all, pending G6.",
  },
  location: {
    basis: "checkable",
    what: "The practice suburb and state.",
    why: "A workplace address, not a home one, and it is the question a patient is actually asking. Deliberately a suburb rather than a street: precision beyond what the question needs is disclosure without purpose.",
  },
  languages: {
    basis: "declared",
    what: "Languages the clinician says they speak.",
    why: "Declared by them, checked by nobody, and W187's framing says so on the page. It is the single most useful fact for the population this product exists for, and it is a fact about a working life rather than a private one.",
  },
  acceptingNewPatients: {
    basis: "declared",
    what: "Whether they are currently taking new patients.",
    why: "A perishable operational fact the clinician controls. Published because a directory that cannot answer it sends people to closed books.",
  },
  focus: {
    basis: "declared",
    what: "Areas the clinician says they see often.",
    why: "The clinician's own statement about their own practice, minted only through W114's linted constructor. W187 renders it under an explicit denial that it is a specialty, because a reader supplies that inference otherwise.",
  },
};

/**
 * Clinician-keyed record classes in this tree, and whether any of them reaches a public surface.
 *
 * W106 for a different subject. Every entry is `false` and that is the point: this is not a
 * classification exercise with interesting cases, it is a list somebody has to consciously edit
 * to make a mistake. The rationale field is what makes it reviewable — "no" without a reason is
 * indistinguishable from nobody having looked.
 */
export interface ClinicianRecordClass {
  module: string;
  what: string;
  reachesPublicSurface: false;
  why: string;
}

export const CLINICIAN_RECORD_CLASSES: readonly ClinicianRecordClass[] = [
  {
    module: "src/credentials/vault.ts",
    what: "Credential documents and the evidence behind them",
    reachesPublicSurface: false,
    why: "Certificates, letters and identity documents a clinician handed a practice in confidence. W109 gates access to them behind a grant inside the tenancy; publishing one would be a disclosure of the document rather than of the fact it evidences.",
  },
  {
    module: "src/credentials/model.ts",
    what: "Verified credential records",
    reachesPublicSurface: false,
    why: "A profile publishes a registration NUMBER a reader can check themselves, not this product's record of having checked it. The two look similar and differ in who is being trusted.",
  },
  {
    module: "src/credentials/provenance-report.ts",
    what: "Who verified what, and when",
    reachesPublicSurface: false,
    why: "A practice's internal assurance record. It names the verifier as well as the clinician, so publishing it would disclose a second person who never chose to be on a public page.",
  },
  {
    module: "src/capability/graph.ts",
    what: "Capability graph and routing weights",
    reachesPublicSurface: false,
    why: "A derived model of what a clinician is routed for. Publishing it would be a ranking of clinicians by inference — W83's refusal, in public and about a named person.",
  },
  {
    module: "src/capability/experience.ts",
    what: "Volume and recency of a clinician's activity",
    reachesPublicSurface: false,
    why: "The most tempting field on this list and the most dangerous: it looks like a fact and reads as a competence claim. It is also partly a measure of how a practice allocates work.",
  },
  {
    module: "src/education/cpd.ts",
    what: "CPD reading and completion records",
    reachesPublicSurface: false,
    why: "A professional development record, which is a record of what somebody did not yet know. It belongs to the clinician and their regulator.",
  },
  {
    module: "src/complaints/store.ts",
    what: "Complaints recorded by a practice",
    reachesPublicSurface: false,
    why: "Publishing a complaint about a named clinician would be defamatory, would breach the patient's privacy at the same time, and is the single worst thing this product could emit.",
  },
  {
    module: "src/referrals/store.ts",
    what: "Referrals written and received, and their outcomes",
    reachesPublicSurface: false,
    why: "Every referral names a patient. It is also a performance record by construction, and W176 already refused to attribute referral timing to a clinician internally.",
  },
  {
    module: "src/booking/store.ts",
    what: "Invitations and appointments by clinician",
    reachesPublicSurface: false,
    why: "Patient-keyed throughout. The clinician's slice of it is a work diary.",
  },
  {
    module: "src/session/config.ts",
    what: "Session and availability configuration",
    reachesPublicSurface: false,
    why: "A practice's operational settings. `acceptingNewPatients` is the one bit of this a profile publishes, and it is republished as a declared flag rather than derived from the roster — a derived one would leak the shape of somebody's week.",
  },
];

/** The disclosure's own caveats, carried where it goes — W149/W177's pattern. */
export const DISCLOSURE_CAVEATS: readonly string[] = [
  "Publishing a profile cannot be undone. A page that has been public has been read, indexed and copied, and removing it from this directory does not reach those copies. Everything here is decided before publication because there is no remedy afterwards.",
  "Only what is listed here leaves. A clinician's credentials, their verification records, their professional development, the referrals they wrote and anything a practice recorded about them stay inside the practice and cannot be published from this product.",
  "Some of what is published is checkable and some is not, and the page says which is which. A registration number can be confirmed on the public register. What a clinician says they focus on is their own statement, which nobody here has assessed.",
];

/** Fields whose truth a reader can confirm without trusting this product. */
export function checkableFields(): string[] {
  return Object.entries(DISCLOSED_FIELDS)
    .filter(([, field]) => field.basis === "checkable")
    .map(([name]) => name)
    .sort();
}

/** Fields that are the clinician's own claim, published as such. */
export function declaredFields(): string[] {
  return Object.entries(DISCLOSED_FIELDS)
    .filter(([, field]) => field.basis === "declared")
    .map(([name]) => name)
    .sort();
}

/** Every field that leaves, in the order W183 declares them. */
export function disclosedFieldNames(): string[] {
  return PROFILE_FIELDS.filter((field) => field in DISCLOSED_FIELDS);
}
