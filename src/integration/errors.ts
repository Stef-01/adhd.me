// W38: integration error taxonomy. Q3 added several independent failure vocabularies
// — the resilience reader's failure kinds (W36), the deep-link fallback reasons (W29),
// the vendor gate refusal (W28), and fixture drift (this unit). Ops needs ONE stable
// set of codes to alert on, and each code has to answer two questions the loop asks:
// does this stop us sending, and what should a human do about it?
//
// Codes are stable strings — they land in logs, alerts and the W39 dossier — so they
// are treated as an API: add new ones, never repurpose an existing one.

import type { DriftIssue } from "@/pms/drift";

export type IntegrationErrorCode =
  // PMS read path (W27/W36)
  | "PMS_TIMEOUT"
  | "PMS_THREW"
  | "PMS_MALFORMED"
  | "PMS_CIRCUIT_OPEN"
  | "PMS_STALE_DATA"
  // Vendor payload conformance (W28/W38)
  | "PMS_FIXTURE_DRIFT"
  // Booking-link path (W29)
  | "LINK_PROVIDER_DISABLED"
  | "LINK_CLINICIAN_UNMAPPED"
  | "LINK_UNSAFE"
  // Founder gates (W28/W31)
  | "GATE_BLOCKED";

export type Severity = "info" | "warning" | "error";

export interface ErrorMeaning {
  code: IntegrationErrorCode;
  severity: Severity;
  /** True when the condition must stop Meherr offering appointments. */
  blocksSending: boolean;
  /** What it means, in the words an operator needs. */
  summary: string;
  /** The action a human should take. */
  operatorAction: string;
}

export const ERROR_TAXONOMY: Record<IntegrationErrorCode, ErrorMeaning> = {
  PMS_TIMEOUT: {
    code: "PMS_TIMEOUT",
    severity: "warning",
    blocksSending: false, // a fresh snapshot may still cover this read
    summary: "The practice management system did not respond within the read budget.",
    operatorAction: "Watch for repeats; the breaker opens if the system stays slow.",
  },
  PMS_THREW: {
    code: "PMS_THREW",
    severity: "warning",
    blocksSending: false,
    summary: "The practice management system returned an error.",
    operatorAction: "Check the vendor status page; escalate if it persists past one cycle.",
  },
  PMS_MALFORMED: {
    code: "PMS_MALFORMED",
    severity: "error",
    blocksSending: false,
    summary: "The PMS response did not match the expected shape and was rejected.",
    operatorAction: "Likely an API change — run the drift check and update the mapping.",
  },
  PMS_CIRCUIT_OPEN: {
    code: "PMS_CIRCUIT_OPEN",
    severity: "error",
    blocksSending: false,
    summary: "Reads are paused after repeated failures; a trial read runs after cooldown.",
    operatorAction: "Treat as an outage for that practice; confirm the PMS is reachable.",
  },
  PMS_STALE_DATA: {
    code: "PMS_STALE_DATA",
    severity: "error",
    blocksSending: true, // the W36 fail-closed rule
    summary: "Appointment data is older than the freshness budget, so sending is held.",
    operatorAction: "Restore the PMS connection; sending resumes automatically once fresh.",
  },
  PMS_FIXTURE_DRIFT: {
    code: "PMS_FIXTURE_DRIFT",
    severity: "error",
    blocksSending: true, // wrong mappings must never drive real invitations
    summary: "A vendor payload no longer matches the shape its mapping depends on.",
    operatorAction: "Update the vendor mapping and re-record the fixture before enabling.",
  },
  LINK_PROVIDER_DISABLED: {
    code: "LINK_PROVIDER_DISABLED",
    severity: "info",
    blocksSending: false,
    summary: "A vendor booking provider is configured but switched off; internal links used.",
    operatorAction: "None, unless the practice expected vendor links — then enable the flag.",
  },
  LINK_CLINICIAN_UNMAPPED: {
    code: "LINK_CLINICIAN_UNMAPPED",
    severity: "warning",
    blocksSending: false,
    summary: "A clinician has no booking slug for the vendor, so the internal link was used.",
    operatorAction: "Add the clinician's slug to the practice's booking configuration.",
  },
  LINK_UNSAFE: {
    code: "LINK_UNSAFE",
    severity: "error",
    blocksSending: true, // never send a link that failed the safety guard
    summary: "A booking link failed the safety guard (non-https, or carried an identifier).",
    operatorAction: "Fix the booking configuration; no message is sent until it passes.",
  },
  GATE_BLOCKED: {
    code: "GATE_BLOCKED",
    severity: "info",
    blocksSending: true,
    summary: "A founder gate blocked a live third-party connection in this phase.",
    operatorAction: "Expected before go-live; opening the gate is a founder decision.",
  },
};

export const ALL_ERROR_CODES = Object.keys(ERROR_TAXONOMY) as IntegrationErrorCode[];

export function meaningOf(code: IntegrationErrorCode): ErrorMeaning {
  return ERROR_TAXONOMY[code];
}

// --- Classifiers: turn each subsystem's own vocabulary into taxonomy codes ------

/** W36 read outcome → code(s). A read can be both failed AND stale. */
export function classifyRead(read: {
  failure?: "threw" | "timeout" | "malformed" | "circuit_open";
  usableForSending: boolean;
  health: "ok" | "degraded" | "unavailable";
}): IntegrationErrorCode[] {
  const codes: IntegrationErrorCode[] = [];
  switch (read.failure) {
    case "timeout":
      codes.push("PMS_TIMEOUT");
      break;
    case "threw":
      codes.push("PMS_THREW");
      break;
    case "malformed":
      codes.push("PMS_MALFORMED");
      break;
    case "circuit_open":
      codes.push("PMS_CIRCUIT_OPEN");
      break;
  }
  if (!read.usableForSending && read.health === "degraded") codes.push("PMS_STALE_DATA");
  return codes;
}

/** W29 link outcome → code, or null when the link is fine. */
export function classifyLink(
  fellBackBecause?: "provider_disabled" | "clinician_not_mapped",
): IntegrationErrorCode | null {
  if (fellBackBecause === "provider_disabled") return "LINK_PROVIDER_DISABLED";
  if (fellBackBecause === "clinician_not_mapped") return "LINK_CLINICIAN_UNMAPPED";
  return null;
}

/** W38 drift issues → a single code (any drift blocks). */
export function classifyDrift(issues: readonly DriftIssue[]): IntegrationErrorCode | null {
  return issues.length > 0 ? "PMS_FIXTURE_DRIFT" : null;
}

/** Would any of these conditions stop the loop sending? */
export function blocksSending(codes: readonly IntegrationErrorCode[]): boolean {
  return codes.some((c) => ERROR_TAXONOMY[c].blocksSending);
}
