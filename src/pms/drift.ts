// W38: fixture-drift detection. The W28 vendor mappings are written against a
// recorded snapshot of each PMS API. When the real API changes — a field renamed,
// a type widened, an enum value added — the mapping keeps compiling and silently
// produces wrong data: an unmapped consent flag reads as `undefined`, a renamed
// status field makes every slot look unavailable. TypeScript cannot catch this,
// because the payload arrives as JSON at runtime.
//
// So each vendor declares the shape it depends on, and drift is checked against
// that declaration. Re-recording a fixture from a live API (the gated W39 step)
// runs the same check, which is what turns an API change into a failing test
// instead of a silent data fault.

export type FieldType = "string" | "boolean" | "number" | "string|null";

export interface FieldSpec {
  name: string;
  type: FieldType;
  /** Closed enums: any value outside this set is drift, not just a new option. */
  oneOf?: readonly string[];
}

export interface CollectionSpec {
  /** Key of the array in the raw payload. */
  collection: string;
  /** Fields the mapping reads. Extra fields in the payload are fine — unread. */
  fields: readonly FieldSpec[];
}

export type DriftIssueKind =
  | "missing_collection"
  | "missing_field"
  | "type_mismatch"
  | "unknown_enum_value";

export interface DriftIssue {
  kind: DriftIssueKind;
  collection: string;
  field?: string;
  /** Index of the offending row, when the issue is row-level. */
  index?: number;
  detail: string;
}

export interface DriftReport {
  vendor: string;
  ok: boolean;
  issues: DriftIssue[];
}

function typeMatches(value: unknown, type: FieldType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "string|null":
      return value === null || typeof value === "string";
  }
}

/**
 * Check a raw vendor payload against the shape its mapping depends on.
 * Only declared fields are checked — a vendor adding fields we don't read is
 * not drift, but changing or removing one we do read is.
 */
export function detectDrift(
  vendor: string,
  raw: unknown,
  specs: readonly CollectionSpec[],
): DriftReport {
  const issues: DriftIssue[] = [];
  const payload = (raw ?? {}) as Record<string, unknown>;

  for (const spec of specs) {
    const rows = payload[spec.collection];
    if (!Array.isArray(rows)) {
      issues.push({
        kind: "missing_collection",
        collection: spec.collection,
        detail: `expected an array at "${spec.collection}"`,
      });
      continue;
    }
    rows.forEach((row, index) => {
      const record = (row ?? {}) as Record<string, unknown>;
      for (const field of spec.fields) {
        if (!(field.name in record)) {
          issues.push({
            kind: "missing_field",
            collection: spec.collection,
            field: field.name,
            index,
            detail: `row ${index} is missing "${field.name}"`,
          });
          continue;
        }
        const value = record[field.name];
        if (!typeMatches(value, field.type)) {
          issues.push({
            kind: "type_mismatch",
            collection: spec.collection,
            field: field.name,
            index,
            detail: `row ${index} field "${field.name}" expected ${field.type}, got ${
              value === null ? "null" : typeof value
            }`,
          });
          continue;
        }
        if (field.oneOf && typeof value === "string" && !field.oneOf.includes(value)) {
          issues.push({
            kind: "unknown_enum_value",
            collection: spec.collection,
            field: field.name,
            index,
            detail: `row ${index} field "${field.name}" has unknown value "${value}"`,
          });
        }
      }
    });
  }

  return { vendor, ok: issues.length === 0, issues };
}

/** The Best Practice payload shape the W28 mapping reads. */
export const BEST_PRACTICE_SPEC: readonly CollectionSpec[] = [
  {
    collection: "patients",
    fields: [
      { name: "PatientId", type: "string" },
      { name: "UsualProviderId", type: "string|null" },
      { name: "MobileConsent", type: "boolean" },
      { name: "OptedOut", type: "boolean" },
      { name: "LastVisitDate", type: "string|null" },
      { name: "NextAppointmentDate", type: "string|null" },
      { name: "ActiveRecall", type: "boolean" },
      { name: "ChronicDiseaseRegister", type: "boolean" },
    ],
  },
  {
    collection: "slots",
    fields: [
      { name: "AppointmentId", type: "string" },
      { name: "ProviderId", type: "string" },
      { name: "StartTime", type: "string" },
      { name: "Status", type: "string", oneOf: ["Available", "Booked", "Cancelled"] },
      { name: "AppointmentType", type: "string|null" },
    ],
  },
  {
    collection: "cancellations",
    fields: [
      { name: "AppointmentId", type: "string" },
      { name: "ProviderId", type: "string" },
      { name: "PatientId", type: "string" },
      { name: "StartTime", type: "string" },
      { name: "CancelledAt", type: "string" },
    ],
  },
  {
    collection: "consents",
    fields: [
      { name: "PatientId", type: "string" },
      { name: "SmsConsent", type: "boolean" },
      { name: "ConsentDate", type: "string" },
      { name: "ConsentSource", type: "string" },
    ],
  },
];

/** The Halo payload shape the W28 mapping reads. */
export const HALO_SPEC: readonly CollectionSpec[] = [
  {
    collection: "members",
    fields: [
      { name: "member_id", type: "string" },
      { name: "regular_gp", type: "string|null" },
      { name: "sms_ok", type: "boolean" },
      { name: "unsubscribed", type: "boolean" },
      { name: "last_seen", type: "string|null" },
      { name: "next_booking", type: "string|null" },
      { name: "recall_open", type: "boolean" },
      { name: "care_plan", type: "boolean" },
    ],
  },
  {
    collection: "openings",
    fields: [
      { name: "id", type: "string" },
      { name: "gp", type: "string" },
      { name: "start", type: "string" },
      { name: "state", type: "string", oneOf: ["open", "filled", "void"] },
      { name: "duration_min", type: "number" },
      { name: "mode", type: "string", oneOf: ["in_person", "video"] },
    ],
  },
  {
    collection: "voids",
    fields: [
      { name: "id", type: "string" },
      { name: "gp", type: "string" },
      { name: "member_id", type: "string" },
      { name: "start", type: "string" },
      { name: "voided_at", type: "string" },
    ],
  },
  {
    collection: "consents",
    fields: [
      { name: "member_id", type: "string" },
      { name: "sms", type: "boolean" },
      { name: "at", type: "string" },
      { name: "via", type: "string" },
    ],
  },
];
