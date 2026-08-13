// Meherr core domain model (W2).
// Storage-agnostic: mirrored 1:1 by supabase/migrations/0001_core.sql (consistency-tested).

export type PracticeId = string & { readonly __brand: "PracticeId" };
export type ClinicianId = string & { readonly __brand: "ClinicianId" };
export type PatientId = string & { readonly __brand: "PatientId" };
export type AppointmentId = string & { readonly __brand: "AppointmentId" };
export type InvitationId = string & { readonly __brand: "InvitationId" };

export interface Practice {
  id: PracticeId;
  name: string;
  timezone: string;
  holdoutRate: number; // 0..1, share of eligible patients held out for incrementality
}

export interface Clinician {
  id: ClinicianId;
  practiceId: PracticeId;
  displayName: string;
  participating: boolean; // opted into availability invitations
}

export interface Patient {
  id: PatientId;
  practiceId: PracticeId;
  usualClinicianId: ClinicianId | null;
  smsConsent: boolean;
  optedOut: boolean; // terminal for invitations
  lastAttendedAt: string | null; // ISO date
  futureBookingAt: string | null; // ISO date of next existing booking, if any
  activeRecall: boolean; // practice already managing a recall — never duplicate
  chronicCare: boolean; // ongoing-care marker (register membership)
  holdout: boolean; // control arm — never invited (W8 assigns; stored for stability)
}

export type AppointmentStatus =
  | "open" // unfilled bookable slot
  | "booked"
  | "attended"
  | "dna" // did not attend
  | "cancelled";

/** Bookable appointment kinds a session config can choose to fill (W17). */
export type AppointmentType = "standard" | "long" | "telehealth";

export interface Appointment {
  id: AppointmentId;
  practiceId: PracticeId;
  clinicianId: ClinicianId;
  startsAt: string; // ISO datetime
  status: AppointmentStatus;
  patientId: PatientId | null;
  generatedByInvitation: boolean; // booked via a Meherr invitation
  /** Optional: untyped slots (undefined) are always fillable; typed slots honour session config. */
  appointmentType?: AppointmentType;
}

export type InvitationStatus =
  | "queued"
  | "sent"
  | "booked"
  | "expired" // session filled or window passed
  | "opted_out";

export interface Invitation {
  id: InvitationId;
  practiceId: PracticeId;
  patientId: PatientId;
  clinicianId: ClinicianId;
  sessionDate: string; // ISO date of the availability window offered
  status: InvitationStatus;
  sentAt: string | null;
}

/** What happened in a generated visit — the usefulness audit (brief §Phase 1). */
export type VisitUsefulness =
  | "medication_reviewed"
  | "investigation_ordered"
  | "preventive_care"
  | "care_plan_updated"
  | "referral_made"
  | "follow_up_arranged"
  | "no_action_required"
  | "unnecessary";

export interface OutcomeRecord {
  appointmentId: AppointmentId;
  practiceId: PracticeId;
  usefulness: VisitUsefulness[];
  clinicianJudgedReasonable: boolean;
}

export type AuditEventKind =
  | "holdout_assigned"
  | "invitation_queued"
  | "invitation_sent"
  | "invitation_booked"
  | "invitation_expired"
  | "patient_opted_out"
  | "config_changed";

export interface AuditEvent {
  practiceId: PracticeId;
  kind: AuditEventKind;
  at: string; // ISO datetime
  subjectId: string; // invitation/patient/config id
  detail: string;
}

// ---------------------------------------------------------------------------
// W55: care-gap registers. Schema only — no clinical content lives here.
// ---------------------------------------------------------------------------

/** Stable identifier for a condition (e.g. the code W56 cites its intervals against). */
export type ConditionCode = string & { readonly __brand: "ConditionCode" };
export type GuidelineIntervalId = string & { readonly __brand: "GuidelineIntervalId" };

export interface Condition {
  code: ConditionCode;
  displayName: string;
  /** Plain-English, practice-facing. Never a clinical definition of the condition. */
  description: string;
  active: boolean;
}

/**
 * Where a guideline interval came from. Every field is required, so an interval
 * cannot exist in the type system without a citable source — the TS twin of the
 * NOT NULL source columns in 0004_registers.sql.
 */
export interface IntervalProvenance {
  /** Human-readable citation, e.g. the guideline title and its issuing body. */
  citation: string;
  url: string;
  /** ISO date the cited source was published. */
  publishedOn: string;
  /** ISO date the source was read when the row was written. */
  retrievedOn: string;
}

/**
 * A guideline-recommended interval between reviews.
 *
 * This is a SCHEDULING input, not a clinical recommendation: it says how often a
 * guideline expects a review, never what should happen at one. W58 types the
 * "not a clinical recommendation" boundary where gaps are computed.
 */
export interface GuidelineInterval {
  id: GuidelineIntervalId;
  conditionCode: ConditionCode;
  name: string;
  intervalMonths: number;
  provenance: IntervalProvenance;
}

/**
 * How a patient came to be on a register.
 *
 * There is deliberately no inferential member of this union — nothing for "inferred
 * from symptoms" or "predicted". Symptom-based membership is unrepresentable, which
 * is the G7/TGA boundary held at the type level as well as by a CHECK constraint.
 */
export type RegisterMembershipSource = "pms_condition_flag" | "practice_confirmed";

export interface RegisterMembership {
  practiceId: PracticeId;
  patientId: PatientId;
  conditionCode: ConditionCode;
  source: RegisterMembershipSource;
  addedAt: string; // ISO datetime
  /** Set when the patient leaves the register; history is kept, not deleted. */
  removedAt: string | null;
}

// ---------------------------------------------------------------------------
// W79: capability graph. Three DISTINCT things about a clinician, never conflated.
// ---------------------------------------------------------------------------

/**
 * The provenance vocabularies are disjoint BY CONSTRUCTION, mirroring the single-valued
 * CHECK on each table in 0005_capability.sql. Because each interface pins its own literal,
 * a self-reported record cannot be assigned where a derived one is expected: conflating the
 * three fails to typecheck rather than merely being discouraged.
 */
export type InterestSource = "clinician_self_reported";
export type ExperienceSource = "derived_case_mix";
export type CompetenceSource = "external_verification";

/** What a clinician says they want more of. A preference, never a capability. */
export interface ClinicianInterest {
  practiceId: PracticeId;
  clinicianId: ClinicianId;
  conditionCode: ConditionCode;
  /** 1 (would take some) .. 5 (would take much more). */
  strength: number;
  source: InterestSource;
  statedAt: string;
}

/**
 * What a clinician has actually seen. Derived (W80) and never typed in — note there is no
 * free-text field here, because anything hand-written would be a self-report wearing a
 * derived label.
 */
export interface ClinicianExperience {
  practiceId: PracticeId;
  clinicianId: ClinicianId;
  conditionCode: ConditionCode;
  attendedVisits: number;
  /** The window the count covers, so a number never floats free of its period. */
  windowFrom: string;
  windowTo: string;
  source: ExperienceSource;
  computedAt: string;
}

/**
 * What someone external has verified. `attestedBy` and `verifiedOn` are required, so a
 * competence record cannot exist without naming who checked it — there is no path to
 * "verified" that does not record a verifier.
 */
export interface ClinicianCompetence {
  practiceId: PracticeId;
  clinicianId: ClinicianId;
  conditionCode: ConditionCode;
  credential: string;
  attestedBy: string;
  verifiedOn: string;
  /** Null means no stated expiry, not "never expires" — W82 decides how to treat that. */
  expiresOn: string | null;
  source: CompetenceSource;
}

/** Registry mirrored by SQL tables — the W2 consistency test keys off this. */
export const DOMAIN_TABLES = [
  "practices",
  "clinicians",
  "patients",
  "appointments",
  "invitations",
  "outcome_records",
  "audit_events",
  "memberships", // W18 multi-tenancy
  "conditions", // W55 reference
  "guideline_intervals", // W55 reference
  "register_membership", // W55 practice-scoped
  "clinician_interest", // W79 capability graph
  "clinician_experience", // W79
  "clinician_competence", // W79
] as const;

export type DomainTable = (typeof DOMAIN_TABLES)[number];

/**
 * National clinical guidance, identical for every practice, so NOT practice-scoped:
 * readable by any staff identity, writable by none (rows change by migration).
 *
 * This is the only sanctioned exception to the 0003 rule that every table is scoped
 * by membership. It is listed explicitly, and the schema-consistency test holds both
 * halves — reference tables stay read-only, and everything else stays scoped — so the
 * exception cannot spread to practice data by accident.
 */
export const REFERENCE_TABLES = ["conditions", "guideline_intervals"] as const;

export type ReferenceTable = (typeof REFERENCE_TABLES)[number];

/** Every domain table that holds one practice's data and must be membership-scoped. */
export const PRACTICE_SCOPED_TABLES = DOMAIN_TABLES.filter(
  (table): table is Exclude<DomainTable, ReferenceTable> =>
    !(REFERENCE_TABLES as readonly string[]).includes(table),
);
