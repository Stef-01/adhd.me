// W235: the FHIR R4 mapping, as declared data.
//
// A MAPPER'S CHARACTERISTIC FAILURE IS SILENCE, NOT ERROR. It does not crash on a field it has no
// home for — it returns a resource that looks complete, and the field is simply gone. The
// receiving system cannot know what it was not told, and neither can the sender. So the output is
// a PAIR: the resource, and everything that did not fit, each with a reason. That turns the
// mapping's incompleteness into a value somebody reads rather than a property somebody has to
// notice.
//
// THE FIELD MAP IS DATA, CHECKED BOTH DIRECTIONS AGAINST THE DOMAIN TYPE. A `switch` inside a
// function is a mapping nobody audits, and worse, a field added to `Appointment` next year would
// simply not appear in it — the silence again, one level up. The test derives the domain's field
// list from a real value and asserts every field is either mapped or declared unmappable with a
// reason.
//
// THE ROUND TRIP IS THE ONLY HONEST TEST. Asserting `toFhir` produces the right shape checks that
// I wrote what I meant. Asserting `fromFhir(toFhir(x))` returns `x` checks that nothing was lost in
// a corner neither assertion looks at. Run over every synthetic record, both directions.
//
// THIS IS THE FIRST MODULE IN THE INTEROP LANE THAT CAN CARRY A PATIENT IDENTIFIER, and it says so
// rather than pretending. A FHIR Appointment's participant IS the patient; a mapping that dropped
// it would be a mapping of nothing useful, with the drop hidden in precisely the silence this unit
// exists to end. What keeps it safe is that it is a pure function over synthetic records with
// nowhere to send anything: there is no endpoint in this tree, `SHIPPED_MAPPINGS` is pinned empty,
// and the record class carries the trigger — the day anything TRANSMITS a mapped resource, G8
// applies and this stops being a pure function.

import type { Appointment, AppointmentStatus, AppointmentType } from "@/domain/types";

/** The FHIR R4 status a domain status maps to, and why that is the right one. */
export const APPOINTMENT_STATUS_MAP: Readonly<
  Record<AppointmentStatus, { fhir: string; why: string }>
> = {
  open: {
    fhir: "free",
    why: "R4 `Appointment.status` has no 'available slot' member — an open slot is a Slot with status `free` rather than an Appointment. Mapped so the round trip is total; a receiver reading it as an Appointment would see a slot that exists and is not booked, which is what it is.",
  },
  booked: { fhir: "booked", why: "Direct." },
  attended: {
    fhir: "fulfilled",
    why: "R4 uses `fulfilled` for an appointment that happened. 'Attended' is the same fact in this tree's vocabulary.",
  },
  dna: {
    fhir: "noshow",
    why: "Direct, and the one mapping where the two vocabularies agree exactly on a judgement about a person — R4's `noshow` and this tree's `dna` both record that the slot was held and not used.",
  },
  cancelled: { fhir: "cancelled", why: "Direct." },
};

/**
 * How a domain appointment type is coded in R4, and under whose code system.
 *
 * ADDED AFTER THE BOTH-DIRECTIONS FIELD CHECK CAUGHT ITS ABSENCE ON THE FIRST RUN. The first draft
 * mapped neither `appointmentType` nor named it — the exact silence this unit exists to end, in
 * this unit's own mapping. Dropping it would have sent a long consultation as an ordinary one,
 * which changes what the receiving diary believes about the day.
 *
 * The system is this product's own, stated as such: R4 wants a coding system URI and there is no
 * national code set this tree has a citation for (W56's rule — no value without a source). A local
 * system named as local is honest; borrowing a real terminology URI to look conformant would not
 * be, and W238 is where terminology binding gets done properly.
 */
export const APPOINTMENT_TYPE_SYSTEM = "https://adhd.me/fhir/CodeSystem/appointment-type";

export const APPOINTMENT_TYPE_MAP: Readonly<Record<AppointmentType, { code: string; why: string }>> = {
  standard: { code: "standard", why: "The ordinary consultation length this practice runs." },
  long: {
    code: "long",
    why: "A longer consultation. Carried because sending it as an ordinary one would tell a receiving diary the day has more room than it does.",
  },
  telehealth: {
    code: "telehealth",
    why: "Delivered remotely. Carried because it changes what the slot needs — a room, or not.",
  },
};

/** A domain field with no home in the target resource, and the reason it has none. */
export interface UnmappedField {
  field: string;
  why: string;
}

/**
 * Domain fields deliberately absent from the mapped resource.
 *
 * Declared rather than omitted: this is the list the output carries so a receiver knows what it was
 * not told. The test checks it against the domain type in BOTH directions, so a field added to
 * `Appointment` cannot become silently unmapped.
 */
export const APPOINTMENT_UNMAPPED: readonly UnmappedField[] = [
  {
    field: "practiceId",
    why: "R4 puts the organisation on a separate resource and references it, rather than stamping it on the appointment. This mapping does not invent that reference, so the practice is supplied by the caller of `appointmentFromFhir` instead — which means a resource read in the wrong practice's context would be attributed to that practice, and naming it here is how a caller learns that is their responsibility rather than the mapping's.",
  },
  {
    field: "generatedByInvitation",
    why: "Whether this booking came from an ADHD.ME invitation is this product's own attribution bookkeeping (W9). It is not a fact about the appointment that any receiving system needs, and sending it would tell a third party something about how the practice fills its diary.",
  },
];

export interface FhirReference {
  reference: string;
}

/** The subset of R4 `Appointment` this mapping produces. Nothing here is invented. */
export interface FhirAppointment {
  resourceType: "Appointment";
  id: string;
  status: string;
  start: string;
  /** Absent where the domain leaves it undefined — an untyped slot, not a slot typed as ordinary. */
  appointmentType?: { coding: readonly { system: string; code: string }[] };
  participant: readonly { actor: FhirReference; status: "accepted" | "needs-action" }[];
}

export interface MappedResource<T> {
  resource: T;
  /** Everything the mapping had no home for. Never empty by accident — see the register above. */
  unmapped: readonly UnmappedField[];
}

/** PROPOSED FOR NOBODY — nothing is exchanged. Pinned empty by this module's test. */
export const SHIPPED_MAPPINGS: readonly MappedResource<FhirAppointment>[] = [];

/**
 * Map one appointment to R4, and say what did not fit.
 *
 * Takes a domain value and returns a value. There is no endpoint, no client and no serialiser that
 * reaches a network here; W237 builds the conformance harness against recorded fixtures and W242
 * holds the credentials posture. This function's only output is data.
 */
export function appointmentToFhir(appointment: Appointment): MappedResource<FhirAppointment> {
  const participant: FhirAppointment["participant"] = [
    { actor: { reference: `Practitioner/${appointment.clinicianId}` }, status: "accepted" },
    ...(appointment.patientId === null
      ? []
      : [{ actor: { reference: `Patient/${appointment.patientId}` }, status: "accepted" as const }]),
  ];

  return {
    resource: {
      resourceType: "Appointment",
      id: String(appointment.id),
      status: APPOINTMENT_STATUS_MAP[appointment.status].fhir,
      start: appointment.startsAt,
      // Omitted when the domain has none. An untyped slot is not a slot typed as ordinary — W17
      // treats undefined as always fillable, and coding it `standard` would narrow it.
      ...(appointment.appointmentType === undefined
        ? {}
        : {
            appointmentType: {
              coding: [
                {
                  system: APPOINTMENT_TYPE_SYSTEM,
                  code: APPOINTMENT_TYPE_MAP[appointment.appointmentType].code,
                },
              ],
            },
          }),
      participant,
    },
    unmapped: APPOINTMENT_UNMAPPED,
  };
}

export type FhirReadRefusal =
  | "not_an_appointment"
  | "unknown_status"
  | "no_practitioner"
  | "missing_start"
  | "unknown_appointment_type"
  | "ambiguous_participant";

export const FHIR_READ_REFUSAL_COPY: Record<FhirReadRefusal, string> = {
  not_an_appointment: "The resource is not an R4 Appointment, so there is nothing here to read as one.",
  unknown_status:
    "The resource carries a status this mapping does not recognise. It is refused rather than guessed at: a status read as the nearest familiar one would silently change what the record says happened.",
  no_practitioner:
    "The resource names no practitioner, so there is no session for it to belong to. An appointment without a clinician is not an appointment this product can place in a diary.",
  missing_start: "The resource has no readable start time, so it cannot be placed on any day.",
  unknown_appointment_type:
    "The resource codes an appointment type this mapping does not recognise, or codes one under a system it does not know. It is refused rather than read as an ordinary consultation: a long appointment received as a standard one tells the diary the day has more room than it does.",
  ambiguous_participant:
    "The resource names more than one patient, or more than one practitioner, and this mapping will not choose between them. R4 permits several participants and a group session is a real thing; what is not real is a single-patient appointment silently attributed to whichever reference happened to come first in the array. Refused rather than resolved: picking one would put a booking in a named person\'s record on the strength of array order.",
};

export type FhirReadResult =
  | { read: true; appointment: Appointment; unmapped: readonly UnmappedField[] }
  | { read: false; why: FhirReadRefusal; copy: string };

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T/;

/**
 * Read an R4 Appointment back into the domain — or refuse, with a reason.
 *
 * The fields the outbound mapping did not send come back as `unmapped` here too, because a
 * receiver's silence about them is the same fact from the other side: this is what the resource
 * could not tell us, and defaulting `generatedByInvitation` to `false` without saying so would be
 * this product inventing its own attribution record out of a third party's data.
 */
export function appointmentFromFhir(resource: unknown, practiceId: string): FhirReadResult {
  if (
    typeof resource !== "object" ||
    resource === null ||
    (resource as { resourceType?: unknown }).resourceType !== "Appointment"
  ) {
    return { read: false, why: "not_an_appointment", copy: FHIR_READ_REFUSAL_COPY.not_an_appointment };
  }
  const candidate = resource as Partial<FhirAppointment>;

  const entry = Object.entries(APPOINTMENT_STATUS_MAP).find(([, v]) => v.fhir === candidate.status);
  if (entry === undefined) {
    return { read: false, why: "unknown_status", copy: FHIR_READ_REFUSAL_COPY.unknown_status };
  }
  if (typeof candidate.start !== "string" || !ISO_DATETIME.test(candidate.start)) {
    return { read: false, why: "missing_start", copy: FHIR_READ_REFUSAL_COPY.missing_start };
  }

  let appointmentType: AppointmentType | undefined;
  if (candidate.appointmentType !== undefined) {
    const coding = candidate.appointmentType.coding?.find((c) => c.system === APPOINTMENT_TYPE_SYSTEM);
    const found = coding === undefined
      ? undefined
      : (Object.keys(APPOINTMENT_TYPE_MAP) as AppointmentType[]).find(
          (key) => APPOINTMENT_TYPE_MAP[key].code === coding.code,
        );
    if (found === undefined) {
      return {
        read: false,
        why: "unknown_appointment_type",
        copy: FHIR_READ_REFUSAL_COPY.unknown_appointment_type,
      };
    }
    appointmentType = found;
  }

  const references = (candidate.participant ?? []).map((p) => p.actor.reference);
  // W247: `find` took the FIRST match and said nothing about the rest. A resource carrying two
  // Patient participants mapped to one appointment attributed to whichever came first in the
  // array — a wrong-patient attribution decided by array order, with no refusal and no record that
  // a choice had been made. Every other ambiguity in this mapping is refused by name; this one was
  // resolved silently. Counted rather than found, and refused when there is more than one.
  const practitioners = references.filter((r) => r.startsWith("Practitioner/"));
  const patients = references.filter((r) => r.startsWith("Patient/"));
  if (practitioners.length > 1 || patients.length > 1) {
    return { read: false, why: "ambiguous_participant", copy: FHIR_READ_REFUSAL_COPY.ambiguous_participant };
  }
  const practitioner = practitioners[0];
  if (practitioner === undefined) {
    return { read: false, why: "no_practitioner", copy: FHIR_READ_REFUSAL_COPY.no_practitioner };
  }
  const patient = patients[0];

  return {
    read: true,
    appointment: {
      id: String(candidate.id) as Appointment["id"],
      practiceId: practiceId as Appointment["practiceId"],
      clinicianId: practitioner.slice("Practitioner/".length) as Appointment["clinicianId"],
      startsAt: candidate.start,
      status: entry[0] as AppointmentStatus,
      patientId: patient === undefined ? null : (patient.slice("Patient/".length) as Appointment["patientId"]),
      generatedByInvitation: false,
      ...(appointmentType === undefined ? {} : { appointmentType }),
    },
    unmapped: APPOINTMENT_UNMAPPED,
  };
}
