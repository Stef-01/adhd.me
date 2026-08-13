// W11: console store — the practice profile and its versioned eligibility rules
// config, in memory behind globalThis (same mock-persistence posture as the W7
// rail store; Supabase persistence replaces this at the wiring unit). Every rules
// change bumps the version and lands in the audit trail (config-as-audit, W10 spine
// captures it downstream).

import { DEFAULT_CONFIG, type EligibilityConfig } from "@/engine/eligibility";
import type { AuditEvent, ClinicianId, Practice, PracticeId } from "@/domain/types";
import {
  DEFAULT_SESSION_CONFIG,
  validateSessionConfig,
  type SessionConfig,
} from "@/session/config";
import { authorize, type Membership } from "@/tenancy/tenancy";

/** W41: the practice's own clinician roster, entered during self-serve setup. */
export interface ClinicianRecord {
  id: ClinicianId;
  displayName: string;
  /** Opted into availability invitations at all (the clinician's own choice). */
  participating: boolean;
  /**
   * W81: the sign-in identity this clinician is, when known. Optional and null by default,
   * so existing rosters and the W41 wizard are unaffected. Needed because stating a case-mix
   * interest requires knowing WHICH clinician is signed in — an interest recorded for
   * someone else is not their preference.
   */
  email?: string | null;
}

/**
 * Everything that belongs to ONE practice.
 *
 * W166: these fields lived on `ConsoleState` directly, alongside a single nullable practice and a
 * hardcoded `prac-console` id. That shape made a defect unrepresentable in tests and inevitable in
 * production — Y2 finding B2 and Y3 audit item 6, open for two years: console-side scoping could
 * not be tested end to end because a second practice could not exist.
 *
 * Note what moved and why. A practice's ELIGIBILITY RULES, ROSTER, SESSION DIALS and SETUP
 * PROGRESS are its own; two practices sharing one rules config would be a silent cross-tenant
 * leak of exactly the kind W57/B1 turned out to be. `auditEvents` and `memberships` stay on the
 * state because both already carry a `practiceId` and are queried across practices by design.
 */
export interface PracticeRecord {
  practice: Practice;
  rulesConfig: EligibilityConfig;
  rulesVersion: number;
  clinicians: ClinicianRecord[]; // W41 — the roster W17 deferred
  sessionConfig: SessionConfig; // W41 — W17's dials, now practice-editable
  /**
   * W41: wizard steps the practice has explicitly saved. Seeded defaults validate
   * clean, so validity alone cannot prove a practice chose its settings — without
   * this, finishing setup would attest to wide-open defaults nobody ever saw.
   */
  acknowledgedSteps: string[];
  /** Monotonic clinician id counter — never reuses a retired id (W41 review fix). */
  nextClinicianSeq: number;
  /** Set when the practice finishes the setup wizard; null while still in setup. */
  setupCompletedAt: string | null;
}

export interface ConsoleState {
  practices: PracticeRecord[];
  auditEvents: AuditEvent[];
  memberships: Membership[]; // W18 — whoever onboards becomes owner
  /** Monotonic practice id counter. Ids are generated, never a literal (W166). */
  nextPracticeSeq: number;
}

export interface FieldErrors {
  [field: string]: string;
}

const globalStore = globalThis as { __careyieldConsole?: ConsoleState };

function initial(): ConsoleState {
  return { practices: [], auditEvents: [], memberships: [], nextPracticeSeq: 0 };
}

function newRecord(practice: Practice): PracticeRecord {
  return {
    practice,
    rulesConfig: { ...DEFAULT_CONFIG },
    rulesVersion: 1,
    clinicians: [],
    sessionConfig: { ...DEFAULT_SESSION_CONFIG },
    acknowledgedSteps: [],
    nextClinicianSeq: 0,
    setupCompletedAt: null,
  };
}

/** One practice's record, or null. Takes the id as the QUERY — W123's rule. */
export function practiceRecord(practiceId: PracticeId, state: ConsoleState = getConsole()): PracticeRecord | null {
  return state.practices.find((r) => r.practice.id === practiceId) ?? null;
}

/**
 * The practices an email may act for, oldest first.
 *
 * Derived from memberships rather than stored, so there is no second place for the answer to
 * drift from. An email with no membership gets an empty list, never everybody's.
 */
export function practicesFor(email: string, state: ConsoleState = getConsole()): PracticeRecord[] {
  const wanted = email.trim().toLowerCase();
  const mine = new Set(
    state.memberships
      .filter((m) => m.email.trim().toLowerCase() === wanted)
      .map((m) => m.practiceId as string),
  );
  return state.practices.filter((r) => mine.has(r.practice.id as string));
}

/**
 * Which practice a session is acting for.
 *
 * `requested` is a SELECTION, not a grant: it is honoured only when the email already belongs to
 * that practice, so the cookie carrying it cannot widen access — at worst it picks among practices
 * the user already has. With no valid request, the first practice they belong to, deterministically.
 */
export function activePracticeFor(
  email: string,
  requested?: string | null,
  state: ConsoleState = getConsole(),
): PracticeRecord | null {
  const mine = practicesFor(email, state);
  if (requested) {
    const chosen = mine.find((r) => (r.practice.id as string) === requested);
    if (chosen) return chosen;
  }
  return mine[0] ?? null;
}

export function getConsole(): ConsoleState {
  globalStore.__careyieldConsole ??= initial();
  return globalStore.__careyieldConsole;
}

export function resetConsole(): ConsoleState {
  globalStore.__careyieldConsole = initial();
  return globalStore.__careyieldConsole;
}

export interface OnboardingInput {
  name: string;
  timezone: string;
  holdoutPercent: number; // 0–50, UI-facing; stored as a 0..1 rate
}

export function validateOnboarding(input: OnboardingInput): FieldErrors {
  const errors: FieldErrors = {};
  if (input.name.trim().length < 2) errors.name = "Practice name is too short.";
  if (!/^[A-Za-z_]+\/[A-Za-z_]+$/.test(input.timezone)) {
    errors.timezone = "Use an IANA timezone like Australia/Sydney.";
  }
  if (!Number.isFinite(input.holdoutPercent) || input.holdoutPercent < 0 || input.holdoutPercent > 50) {
    errors.holdoutPercent = "Holdout must be between 0 and 50 percent.";
  }
  return errors;
}

export function onboardPractice(input: OnboardingInput, at: string, ownerEmail: string): FieldErrors {
  const errors = validateOnboarding(input);
  if (Object.keys(errors).length > 0) return errors;
  const state = getConsole();
  // W26 hardening, restated for the plural model: onboarding must not overwrite an existing
  // practice or re-seat its owner. Appending never can — but an email that already owns a
  // practice creating another is a real multi-site case, so what is refused is narrower now: a
  // SECOND practice with the same name for the same owner, which is the shape a double-submit
  // takes. A genuinely different practice is allowed, and that is the point of the unit.
  const duplicate = practicesFor(ownerEmail, state).some(
    (r) => r.practice.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
  );
  if (duplicate) return { form: "This practice is already set up." };
  state.nextPracticeSeq += 1;
  const practice: Practice = {
    id: `prac-${state.nextPracticeSeq}` as PracticeId,
    name: input.name.trim(),
    timezone: input.timezone,
    holdoutRate: input.holdoutPercent / 100,
  };
  state.practices.push(newRecord(practice));
  state.memberships.push({ practiceId: practice.id, email: ownerEmail, role: "owner" });
  state.auditEvents.push({
    practiceId: practice.id,
    kind: "config_changed",
    at,
    subjectId: practice.id,
    detail: `practice onboarded: ${practice.name} (${practice.timezone}, holdout ${input.holdoutPercent}%)`,
  });
  return {};
}

export function validateRules(config: EligibilityConfig): FieldErrors {
  const errors: FieldErrors = {};
  const intField = (field: "minDaysSinceLastVisit" | "futureBookingBlockDays" | "maxInvitesPerQuarter", max: number) => {
    const value = config[field];
    if (!Number.isInteger(value) || value < 0 || value > max) {
      errors[field] = `Must be a whole number between 0 and ${max}.`;
    }
  };
  intField("minDaysSinceLastVisit", 3650);
  intField("futureBookingBlockDays", 365);
  intField("maxInvitesPerQuarter", 12);
  return errors;
}

export function updateRules(
  practiceId: PracticeId,
  config: EligibilityConfig,
  at: string,
  byEmail: string,
): FieldErrors {
  const errors = validateRules(config);
  if (Object.keys(errors).length > 0) return errors;
  const state = getConsole();
  const record = practiceRecord(practiceId, state);
  if (!record) return { form: "Onboard the practice before changing rules." };
  // W18: rules changes are an owner/manager grant; clinicians and non-members are refused.
  // W166: authorized against the practice being EDITED, not against whichever practice happened
  // to be the only one — the check now means something it could not mean before.
  const decision = authorize(state.memberships, byEmail, practiceId, "edit_rules");
  if (!decision.allowed) return { form: "Your role cannot change eligibility rules." };
  const changed = (Object.keys(config) as Array<keyof EligibilityConfig>)
    .filter((k) => record.rulesConfig[k] !== config[k])
    .map((k) => `${k}: ${String(record.rulesConfig[k])} -> ${String(config[k])}`);
  if (changed.length === 0) return {};
  record.rulesConfig = { ...config };
  record.rulesVersion += 1;
  state.auditEvents.push({
    practiceId,
    kind: "config_changed",
    at,
    subjectId: `rules-v${record.rulesVersion}`,
    detail: changed.join("; "),
  });
  return {};
}

// --- W41: self-serve setup (clinician roster, session config, completion) -------
// Setup edits are the same class of grant as eligibility rules — they govern who
// gets contacted and when — so they authorize against "edit_rules" rather than
// widening the W18 action set. Every change is audited, like every other config
// change in this store.

function requireEditRules(
  state: ConsoleState,
  practiceId: PracticeId,
  byEmail: string,
): FieldErrors | null {
  if (!practiceRecord(practiceId, state)) return { form: "Set up the practice before configuring it." };
  const decision = authorize(state.memberships, byEmail, practiceId, "edit_rules");
  if (!decision.allowed) return { form: "Your role cannot change this configuration." };
  return null;
}

function audit(
  state: ConsoleState,
  practiceId: PracticeId,
  at: string,
  subjectId: string,
  detail: string,
): void {
  state.auditEvents.push({ practiceId, kind: "config_changed", at, subjectId, detail });
}

export interface ClinicianInput {
  /** Existing clinician id when this row edits a saved clinician; absent for new rows. */
  id?: ClinicianId;
  displayName: string;
  participating: boolean;
}

export function validateClinicians(inputs: readonly ClinicianInput[]): FieldErrors {
  const errors: FieldErrors = {};
  if (inputs.length === 0) errors.clinicians = "Add at least one clinician.";
  inputs.forEach((c, i) => {
    if (c.displayName.trim().length < 2) errors[`clinician-${i}`] = "Name is too short.";
  });
  const names = inputs.map((c) => c.displayName.trim().toLowerCase());
  if (new Set(names).size !== names.length) errors.clinicians = "Clinician names must be unique.";
  if (inputs.length > 0 && !inputs.some((c) => c.participating)) {
    errors.clinicians = "At least one clinician must be participating.";
  }
  return errors;
}

/**
 * Replace the roster wholesale — the wizard edits it as one list.
 *
 * Two W41 review findings are fixed here, both about the same hazard: the session
 * allowlist names clinicians by id, and it records a consent decision about who may
 * have appointments offered on their behalf.
 *
 *   1. IDS MUST BE STABLE. Ids were previously minted from the submission's array
 *      index, so clearing a row shifted every id below it and the allowlist silently
 *      re-pointed at a DIFFERENT clinician. Ids are now carried forward by identity
 *      (the caller passes the existing id) and new rows take a monotonic counter that
 *      never reuses a retired id.
 *   2. AN EMPTIED ALLOWLIST MUST FAIL CLOSED. It previously collapsed to "all" — the
 *      most permissive value — turning a deliberate narrowing into a grant-everyone.
 *      It now keeps the empty list, which validateSessionConfig rejects, and the
 *      sessions step loses its acknowledgement so setup cannot certify the practice
 *      until a human re-confirms who is included.
 */
export function saveClinicians(
  practiceId: PracticeId,
  inputs: readonly ClinicianInput[],
  at: string,
  byEmail: string,
): FieldErrors {
  const errors = validateClinicians(inputs);
  if (Object.keys(errors).length > 0) return errors;
  const state = getConsole();
  const denied = requireEditRules(state, practiceId, byEmail);
  if (denied) return denied;
  const record = practiceRecord(practiceId, state)!;

  record.clinicians = inputs.map((c) => {
    if (c.id && record.clinicians.some((existing) => existing.id === c.id)) {
      return { id: c.id, displayName: c.displayName.trim(), participating: c.participating };
    }
    record.nextClinicianSeq += 1;
    // W166: the counter is per practice, so two practices can hold `clin-1` — which is correct,
    // because a clinician id is only ever resolved inside the practice that minted it.
    return {
      id: `clin-${record.nextClinicianSeq}` as ClinicianId,
      displayName: c.displayName.trim(),
      participating: c.participating,
    };
  });

  // Drop allowlisted ids that no longer exist. Ids are stable, so a survivor here is
  // genuinely the same clinician the practice picked.
  const ids = new Set(record.clinicians.map((c) => c.id as string));
  const allowlist = record.sessionConfig.participatingClinicianIds;
  if (allowlist !== "all") {
    const kept = allowlist.filter((id) => ids.has(id));
    if (kept.length !== allowlist.length) {
      record.sessionConfig = { ...record.sessionConfig, participatingClinicianIds: kept };
      // Fail closed: an empty allowlist is invalid, so the sessions step is no longer
      // acknowledged and completeSetup will refuse until it is re-confirmed.
      if (kept.length === 0) {
        record.acknowledgedSteps = record.acknowledgedSteps.filter((s) => s !== "sessions");
      }
      audit(
        state,
        practiceId,
        at,
        "setup:sessions",
        `offering allowlist narrowed to ${kept.length} clinician(s) after a roster change`,
      );
    }
  }
  audit(state, practiceId, at, "setup:clinicians", `roster set to ${record.clinicians.length} clinician(s)`);
  return {};
}

export function saveSessionConfig(
  practiceId: PracticeId,
  config: SessionConfig,
  at: string,
  byEmail: string,
): FieldErrors {
  const errors = validateSessionConfig(config);
  if (Object.keys(errors).length > 0) return errors;
  const state = getConsole();
  const denied = requireEditRules(state, practiceId, byEmail);
  if (denied) return denied;
  const record = practiceRecord(practiceId, state)!;
  if (config.participatingClinicianIds !== "all") {
    // Checked against THIS practice's roster. Before W166 there was only one roster, so an id
    // belonging to another practice was not a state the type system or the check could describe.
    const known = new Set(record.clinicians.map((c) => c.id as string));
    if (!config.participatingClinicianIds.every((id) => known.has(id))) {
      return { participatingClinicianIds: "Unknown clinician selected." };
    }
  }
  record.sessionConfig = {
    ...config,
    fillableTypes: [...config.fillableTypes],
    schedulingWindow: { ...config.schedulingWindow },
  };
  audit(
    state,
    practiceId,
    at,
    "setup:sessions",
    `types=${config.fillableTypes.join("/")}; protected=${Math.round(
      config.protectedCapacityFraction * 100,
    )}%; window=${config.schedulingWindow.startHour}-${config.schedulingWindow.endHour}`,
  );
  return {};
}

/** The checks a practice must satisfy before the loop may run for it. */
export interface SetupReadiness {
  practice: boolean;
  clinicians: boolean;
  sessions: boolean;
  rules: boolean;
  complete: boolean;
}

/**
 * A step counts as ready only when it is BOTH valid AND explicitly saved by the
 * practice. Validity alone would pass on seeded defaults, letting a practice
 * "complete" setup while never seeing the settings it is being credited with.
 */
export function setupReadiness(record: PracticeRecord | null): SetupReadiness {
  if (!record) {
    return { practice: false, clinicians: false, sessions: false, rules: false, complete: false };
  }
  const acknowledged = (step: string) => record.acknowledgedSteps.includes(step);
  const clinicians = record.clinicians.length > 0 && record.clinicians.some((c) => c.participating);
  const sessions =
    acknowledged("sessions") && Object.keys(validateSessionConfig(record.sessionConfig)).length === 0;
  const rules = acknowledged("rules") && Object.keys(validateRules(record.rulesConfig)).length === 0;
  return {
    practice: true,
    clinicians,
    sessions,
    rules,
    complete: record.setupCompletedAt !== null,
  };
}

/** Record that the practice explicitly saved a wizard step. Idempotent. */
export function acknowledgeSetupStep(
  practiceId: PracticeId,
  step: string,
  byEmail: string,
): FieldErrors {
  const state = getConsole();
  const denied = requireEditRules(state, practiceId, byEmail);
  if (denied) return denied;
  const record = practiceRecord(practiceId, state)!;
  if (!record.acknowledgedSteps.includes(step)) record.acknowledgedSteps.push(step);
  return {};
}

/** Finish setup — refused while any prerequisite is unmet, so "ready" means ready. */
export function completeSetup(practiceId: PracticeId, at: string, byEmail: string): FieldErrors {
  const state = getConsole();
  const denied = requireEditRules(state, practiceId, byEmail);
  if (denied) return denied;
  const record = practiceRecord(practiceId, state)!;
  // Keyed by the unmet prerequisite, so the wizard can name what is missing.
  const readiness = setupReadiness(record);
  if (!readiness.clinicians) return { clinicians: "Add at least one participating clinician first." };
  if (!readiness.sessions) return { fillableTypes: "Session settings are incomplete." };
  if (!readiness.rules) return { minDaysSinceLastVisit: "Eligibility rules are incomplete." };
  if (record.setupCompletedAt !== null) return {}; // idempotent
  record.setupCompletedAt = at;
  audit(state, practiceId, at, "setup:complete", "practice setup completed");
  return {};
}
