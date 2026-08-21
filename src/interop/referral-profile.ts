// W236: the e-referral document profile — W131's structured referral, rendered to R4.
//
// G7'S FOURTH PROPERTY IS RE-DERIVED HERE, NOT INHERITED, and the difference is the whole unit.
// W131 holds it inside the document: exactly one field carries prose, it is attributed to a named
// clinician at a stated time, and no function there produces narrative. None of that survives as a
// claim about a MAPPER unless the mapper is checked on its own terms — because the three ways a
// mapper breaks it are ways W131 never had to think about.
//
// (1) A PROFILE HAS SLOTS THE DOCUMENT HAS NOTHING FOR. R4's `ServiceRequest` offers `note`,
// `reasonCode`, `orderDetail`. The tempting fill for an empty slot is a sentence composed from the
// structured fields — "Referred for shared care of ADHD" reads like bookkeeping and IS a clinical
// sentence this tree authored, travelling under a GP's name to another practice, having passed
// through no sign-off. Every slot this profile leaves empty is declared empty, with the reason.
//
// (2) A CODE IS NOT PROSE UNTIL SOMEBODY DISPLAYS IT. R4 codings carry an optional `display`, and
// filling it means writing the human-readable clinical wording a receiving clinician reads — which
// is authoring the sentence, one field further down than anybody looks. W235 refused to borrow a
// terminology URI; this refuses to author the label that would go with one. No coding produced here
// carries a `display`, and the test greps the built resource for the key rather than trusting the
// type.
//
// (3) A NARRATIVE MUST NOT BE EDITED IN TRANSIT. Not trimmed, not normalised, not re-punctuated,
// not sentence-cased. The GP is professionally responsible for those words, and a mapper that
// tidied them would make this tree a co-author of a clinical statement. Asserted character-identical
// through a round trip, with `===` rather than "equivalent".
//
// WHAT THIS PROFILE IS NOT: a transport. There is no client, no endpoint, no serialiser that
// reaches a network. W237 builds the conformance harness against recorded fixtures, W239 the
// outbound disclosure ledger, W242 the credentials posture. This produces a value.

import {
  ALL_REFERRAL_REASONS,
  ALL_REFERRAL_REQUESTS,
  type ReferralDocument,
  type ReferralReason,
  type ReferralRequest,
} from "@/referrals/document";
import type { UnmappedField } from "./fhir";

/** This product's own code systems, named as its own. W235's rule, and the reason it gave. */
export const REFERRAL_REASON_SYSTEM = "https://adhd.me/fhir/CodeSystem/referral-reason";
export const REFERRAL_REQUEST_SYSTEM = "https://adhd.me/fhir/CodeSystem/referral-request";
export const RECORDED_FACT_SYSTEM = "https://adhd.me/fhir/CodeSystem/recorded-fact";
/**
 * The condition code gets its OWN system rather than riding with the recorded facts.
 *
 * Caught while writing the reader: merging them into one `orderDetail` list made the round trip
 * lossy — a receiver could not tell the practice's register/condition code from a W120 fact code,
 * and the document came back with `conditionCode: null` and one extra fact. The two are different
 * kinds of claim (what register this is work under, versus what was recorded), and collapsing them
 * would have been a silent drop of exactly the kind W235 spent its unit ending.
 */
export const CONDITION_CODE_SYSTEM = "https://adhd.me/fhir/CodeSystem/condition-code";

/**
 * A coding with NO `display`.
 *
 * The absence is the point and the type enforces it: `display` is where the human-readable clinical
 * wording would go, and writing it is authoring the sentence a receiving clinician reads. A
 * receiving system that needs a label resolves the code against the system that defines it, which
 * is what a code system is for.
 */
export interface CodeOnly {
  system: string;
  code: string;
}

export interface FhirAnnotation {
  /** The GP's own words, character-identical. Never edited, trimmed or normalised in transit. */
  text: string;
  authorString: string;
  time: string;
}

export interface FhirServiceRequest {
  resourceType: "ServiceRequest";
  id: string;
  status: "active";
  intent: "order";
  authoredOn: string;
  requester: { reference: string };
  subject: { reference: string };
  performer: readonly { reference: string }[];
  category: readonly { coding: readonly CodeOnly[] }[];
  code: { coding: readonly CodeOnly[] };
  orderDetail: readonly { coding: readonly CodeOnly[] }[];
  /** Present only when the referring clinician wrote something. Never composed. */
  note?: readonly FhirAnnotation[];
}

/**
 * R4 slots this profile deliberately leaves empty, and why.
 *
 * The register that makes the emptiness reviewable. Every entry here is a slot somebody could fill
 * with a composed sentence, and the reason says what filling it would cost.
 */
export const REFERRAL_PROFILE_EMPTY_SLOTS: readonly UnmappedField[] = [
  {
    field: "ServiceRequest.reasonCode.text",
    why: "R4 allows free text beside a reason code. Composing it from the structured fields — 'Referred for shared care' — would put a clinical sentence this tree wrote into a document travelling under a GP's name, having passed through no sign-off. The code is sent and the receiving system resolves its own label.",
  },
  {
    field: "ServiceRequest.note (when the clinician wrote nothing)",
    why: "An absent narrative stays absent. A referral with no note is a referral the clinician chose not to annotate, and filling the gap with a generated summary would misattribute this product's words to them.",
  },
  {
    field: "ServiceRequest.priority",
    why: "R4's priority is a clinical urgency judgement. W131's reason vocabulary is deliberately operational — scope and capacity, never how unwell somebody is — so there is nothing here to derive a priority from, and deriving one would be this tree making a triage decision at the boundary (G7).",
  },
  {
    field: "ServiceRequest.coding.display",
    why: "Every coding this profile emits carries a system and a code and no display. The display is the human-readable clinical wording a receiving clinician reads, and writing it is authoring that sentence one field further down than anybody looks.",
  },
];

export interface ProfiledReferral {
  resource: FhirServiceRequest;
  /** The slots left empty, carried with the resource so the emptiness travels with it. */
  emptySlots: readonly UnmappedField[];
}

/** PROPOSED FOR NOBODY — no referral has ever been exchanged. Pinned empty by the test. */
export const SHIPPED_REFERRAL_PROFILES: readonly ProfiledReferral[] = [];

const REASON_CODES: Readonly<Record<ReferralReason, string>> = Object.fromEntries(
  ALL_REFERRAL_REASONS.map((reason) => [reason, reason]),
) as Record<ReferralReason, string>;

const REQUEST_CODES: Readonly<Record<ReferralRequest, string>> = Object.fromEntries(
  ALL_REFERRAL_REQUESTS.map((request) => [request, request]),
) as Record<ReferralRequest, string>;

/**
 * Render one structured referral to the profile.
 *
 * Every value in the output comes from a field of the input. Nothing is composed, summarised or
 * defaulted — a slot with no source is absent, and the absence is declared in
 * `REFERRAL_PROFILE_EMPTY_SLOTS` rather than filled.
 */
export function referralToProfile(document: ReferralDocument): ProfiledReferral {
  const orderDetail = document.recordedFactCodes.map((code) => ({
    coding: [{ system: RECORDED_FACT_SYSTEM, code }],
  }));

  return {
    resource: {
      resourceType: "ServiceRequest",
      id: document.referralId,
      status: "active",
      intent: "order",
      authoredOn: document.createdAt,
      requester: { reference: `Practitioner/${document.createdBy}` },
      subject: { reference: `Patient/${document.patientId}` },
      performer: [{ reference: `Organization/${document.toPracticeId}` }],
      category: [
        { coding: [{ system: REFERRAL_REASON_SYSTEM, code: REASON_CODES[document.reason] }] },
      ],
      code: {
        coding: [{ system: REFERRAL_REQUEST_SYSTEM, code: REQUEST_CODES[document.request] }],
      },
      // The condition code, when there is one, rides with the referenced facts. A null one adds
      // nothing rather than adding an empty coding, which a receiver would have to interpret.
      orderDetail:
        document.conditionCode === null
          ? orderDetail
          : [...orderDetail, { coding: [{ system: CONDITION_CODE_SYSTEM, code: document.conditionCode }] }],
      // Present only when the clinician wrote something, and then verbatim.
      ...(document.narrative === null
        ? {}
        : {
            note: [
              {
                text: document.narrative.text,
                authorString: document.narrative.authoredBy,
                time: document.narrative.authoredAt,
              },
            ],
          }),
    },
    emptySlots: REFERRAL_PROFILE_EMPTY_SLOTS,
  };
}

export type ProfileReadRefusal =
  | "not_a_service_request"
  | "unknown_reason_code"
  | "unknown_request_code"
  | "no_requester"
  | "no_subject"
  | "no_performer";

export const PROFILE_READ_REFUSAL_COPY: Record<ProfileReadRefusal, string> = {
  not_a_service_request: "The resource is not an R4 ServiceRequest, so there is nothing here to read as a referral.",
  unknown_reason_code:
    "The referral names a reason this product does not carry. It is refused rather than mapped to the nearest one: the reason vocabulary is about scope and capacity, and reading an unfamiliar code as a familiar one would put words in the sending practice's mouth about why it asked.",
  unknown_request_code: "The referral asks for something this product does not carry, and it is refused rather than approximated.",
  no_requester: "The referral names no requesting clinician. A referral nobody is named as sending is not a referral.",
  no_subject: "The referral names no patient, so there is nobody for it to be about.",
  no_performer: "The referral names no receiving organisation, so there is nowhere for it to go.",
};

export type ProfileReadResult =
  | { read: true; document: ReferralDocument; emptySlots: readonly UnmappedField[] }
  | { read: false; why: ProfileReadRefusal; copy: string };

/**
 * Read a profiled referral back into W131's document — or refuse, with a reason.
 *
 * The narrative comes back exactly as it went out. No trimming, no normalisation: those words
 * belong to the clinician who wrote them.
 */
export function referralFromProfile(resource: unknown, fromPracticeId: string): ProfileReadResult {
  if (
    typeof resource !== "object" ||
    resource === null ||
    (resource as { resourceType?: unknown }).resourceType !== "ServiceRequest"
  ) {
    return { read: false, why: "not_a_service_request", copy: PROFILE_READ_REFUSAL_COPY.not_a_service_request };
  }
  const candidate = resource as Partial<FhirServiceRequest>;

  const reasonCode = candidate.category?.[0]?.coding?.[0];
  const reason = ALL_REFERRAL_REASONS.find(
    (r) => reasonCode?.system === REFERRAL_REASON_SYSTEM && REASON_CODES[r] === reasonCode.code,
  );
  if (reason === undefined) {
    return { read: false, why: "unknown_reason_code", copy: PROFILE_READ_REFUSAL_COPY.unknown_reason_code };
  }

  const requestCode = candidate.code?.coding?.[0];
  const request = ALL_REFERRAL_REQUESTS.find(
    (r) => requestCode?.system === REFERRAL_REQUEST_SYSTEM && REQUEST_CODES[r] === requestCode.code,
  );
  if (request === undefined) {
    return { read: false, why: "unknown_request_code", copy: PROFILE_READ_REFUSAL_COPY.unknown_request_code };
  }

  const requester = candidate.requester?.reference;
  if (requester === undefined || !requester.startsWith("Practitioner/")) {
    return { read: false, why: "no_requester", copy: PROFILE_READ_REFUSAL_COPY.no_requester };
  }
  const subject = candidate.subject?.reference;
  if (subject === undefined || !subject.startsWith("Patient/")) {
    return { read: false, why: "no_subject", copy: PROFILE_READ_REFUSAL_COPY.no_subject };
  }
  const performer = candidate.performer?.[0]?.reference;
  if (performer === undefined || !performer.startsWith("Organization/")) {
    return { read: false, why: "no_performer", copy: PROFILE_READ_REFUSAL_COPY.no_performer };
  }

  const note = candidate.note?.[0];

  return {
    read: true,
    document: {
      referralId: String(candidate.id),
      fromPracticeId,
      toPracticeId: performer.slice("Organization/".length),
      patientId: subject.slice("Patient/".length),
      createdAt: String(candidate.authoredOn),
      createdBy: requester.slice("Practitioner/".length),
      reason,
      request,
      conditionCode:
        (candidate.orderDetail ?? [])
          .map((d) => d.coding[0]!)
          .find((c) => c.system === CONDITION_CODE_SYSTEM)?.code ?? null,
      recordedFactCodes: (candidate.orderDetail ?? [])
        .map((d) => d.coding[0]!)
        .filter((c) => c.system === RECORDED_FACT_SYSTEM)
        .map((c) => c.code),
      narrative:
        note === undefined
          ? null
          : { text: note.text, authoredBy: note.authorString, authoredAt: note.time },
    },
    emptySlots: REFERRAL_PROFILE_EMPTY_SLOTS,
  };
}
