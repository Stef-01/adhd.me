// W238: terminology binding, as declared data — and the bindings ship EMPTY.
//
// W227's posture, with a sharper reason. A SNOMED CT-AU concept id is an eighteen-digit number, and
// writing one from memory would produce something that looks exactly as authoritative as a correct
// one, passes every structural check a reviewer could write, and binds this product's "shared care"
// to whatever my recollection produced. This session has already hit that failure three times in
// smaller ways — an invented holdout count, a fixture total asserted rather than computed, a
// substitute holiday date reconstructed from memory — and this is the one place where getting it
// wrong means a receiving clinical system files a referral under the wrong concept.
//
// So the loader is the guarantee and the values are a data change behind somebody who has opened a
// release file. `SHIPPED_BINDINGS` is empty and pinned empty.
//
// THE REFUSAL NAMES THE CODE, which is the row's own sharpest requirement. Not "some codes are
// unbound" — the specific local code, so the person who has to go and find the concept knows which
// one. An unbound code refused anonymously is a task nobody can pick up.
//
// AND NOTHING IS GUESSED. There is no nearest-match, no fuzzy lookup, no default system and no
// "unknown" concept to fall back to. A terminology binding that guesses is worse than none: an
// unbound code is a gap somebody fills, and a wrongly bound one is a fact a clinician acts on.
//
// THE WORK ORDER IS DERIVED, NOT LISTED. `codesNeedingBinding` reads the codes this lane actually
// emits — W235's appointment types, W236's reasons, requests, condition and fact codes — so it says
// exactly what a binding would have to cover, cannot go stale, and shows a new local code as unbound
// the day it is added rather than the day somebody notices.

import { APPOINTMENT_TYPE_MAP, APPOINTMENT_TYPE_SYSTEM } from "./fhir";
import {
  CONDITION_CODE_SYSTEM,
  RECORDED_FACT_SYSTEM,
  REFERRAL_REASON_SYSTEM,
  REFERRAL_REQUEST_SYSTEM,
} from "./referral-profile";
import { ALL_REFERRAL_REASONS, ALL_REFERRAL_REQUESTS } from "@/referrals/document";

/** The external terminologies this product may bind to. Closed, and both are versioned releases. */
export type Terminology = "snomed-ct-au" | "loinc";

export const ALL_TERMINOLOGIES: readonly Terminology[] = ["snomed-ct-au", "loinc"];

/**
 * Where a binding came from. Every field required.
 *
 * `releaseVersion` is the field that distinguishes this from W227's calendar provenance and it is
 * not decoration: SNOMED CT-AU is re-released and concepts are inactivated between releases, so a
 * binding without the release it was read from cannot be checked or re-checked by anybody.
 */
export interface BindingProvenance {
  citation: string;
  url: string;
  releaseVersion: string;
  retrievedOn: string;
}

/** One local code bound to one external concept. */
export interface TerminologyBinding {
  /** The system this product emits, as W235 and W236 spell it. */
  localSystem: string;
  localCode: string;
  terminology: Terminology;
  /** The concept identifier, exactly as the release publishes it. */
  conceptId: string;
  provenance: BindingProvenance;
}

export interface BindingRejection {
  localCode: string;
  reason: string;
}

export interface BindingCatalogue {
  bindings: readonly TerminologyBinding[];
  /** Rows refused at load, with why and WHICH code. Never silently dropped (W56's rule). */
  rejected: readonly BindingRejection[];
}

/**
 * The shipped bindings. EMPTY, pinned empty by this module's test.
 *
 * Not a stub: see the module note. Filling this means opening a release file and recording what it
 * says, which is a data change with no code change behind it.
 */
export const SHIPPED_BINDINGS: readonly unknown[] = [];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validateProvenance(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "provenance missing";
  const { citation, url, releaseVersion, retrievedOn } = value as Partial<BindingProvenance>;
  if (typeof citation !== "string" || citation.trim().length < 8) {
    return "citation missing or too short to identify a source";
  }
  if (typeof url !== "string" || !url.startsWith("https://")) return "source url must be https";
  if (typeof releaseVersion !== "string" || releaseVersion.trim().length === 0) {
    return "release version missing — concepts are inactivated between releases, so a binding without one cannot be re-checked";
  }
  if (typeof retrievedOn !== "string" || !ISO_DATE.test(retrievedOn)) {
    return "retrievedOn missing or not an ISO date";
  }
  return null;
}

/**
 * Load bindings, refusing every row that cannot be checked — with the reason AND the code.
 *
 * A property of this function rather than of today's contents, so the guarantee holds for whatever
 * is loaded later. Duplicate local codes are refused rather than last-one-wins: a silently
 * overwritten binding sends a referral under a concept nobody chose.
 */
export function loadBindings(rows: readonly unknown[]): BindingCatalogue {
  const bindings: TerminologyBinding[] = [];
  const rejected: BindingRejection[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const at = `row ${index}`;
    if (typeof row !== "object" || row === null) {
      rejected.push({ localCode: at, reason: "not an object" });
      return;
    }
    const candidate = row as Partial<TerminologyBinding>;
    const localCode =
      typeof candidate.localCode === "string" && candidate.localCode.length > 0 ? candidate.localCode : at;

    if (typeof candidate.localSystem !== "string" || candidate.localSystem.length === 0) {
      rejected.push({ localCode, reason: "local system missing — a code without one belongs to nothing" });
      return;
    }
    if (typeof candidate.localCode !== "string" || candidate.localCode.trim().length === 0) {
      rejected.push({ localCode, reason: "local code missing" });
      return;
    }
    if (!ALL_TERMINOLOGIES.includes(candidate.terminology as Terminology)) {
      rejected.push({ localCode, reason: `terminology must be one of ${ALL_TERMINOLOGIES.join(", ")}` });
      return;
    }
    if (typeof candidate.conceptId !== "string" || candidate.conceptId.trim().length === 0) {
      rejected.push({ localCode, reason: "concept id missing" });
      return;
    }
    const key = `${candidate.localSystem}::${candidate.localCode}`;
    if (seen.has(key)) {
      rejected.push({
        localCode,
        reason: "duplicate local code — a silently overwritten binding sends a referral under a concept nobody chose",
      });
      return;
    }
    const problem = validateProvenance(candidate.provenance);
    if (problem !== null) {
      rejected.push({ localCode, reason: problem });
      return;
    }

    seen.add(key);
    bindings.push(candidate as TerminologyBinding);
  });

  return { bindings, rejected };
}

export type BindResult =
  | { bound: true; binding: TerminologyBinding }
  | { bound: false; localSystem: string; localCode: string; copy: string };

/**
 * Bind one local code — or refuse it, naming it.
 *
 * There is no nearest match, no default terminology and no "unknown" concept. A binding that
 * guesses is worse than none: an unbound code is a gap somebody fills, and a wrongly bound one is a
 * fact a clinician acts on.
 */
export function bindCode(
  catalogue: BindingCatalogue,
  localSystem: string,
  localCode: string,
): BindResult {
  const binding = catalogue.bindings.find(
    (b) => b.localSystem === localSystem && b.localCode === localCode,
  );
  if (binding !== undefined) return { bound: true, binding };
  return {
    bound: false,
    localSystem,
    localCode,
    copy: `No terminology binding is recorded for "${localCode}" in ${localSystem}. It is left unbound rather than matched to the nearest concept: an unbound code is a gap somebody can fill, and a wrongly bound one is a fact a clinician acts on.`,
  };
}

/** One local code this lane emits, and where it comes from. */
export interface LocalCode {
  system: string;
  code: string;
  /** Which module emits it, so the work order says where to look. */
  emittedBy: string;
}

/**
 * Every local code this lane emits — the work order for a terminology binding.
 *
 * DERIVED from the vocabularies the mappings actually use rather than listed here, so it cannot go
 * stale and a new local code shows up as unbound the day it is added.
 */
export function codesNeedingBinding(): LocalCode[] {
  const out: LocalCode[] = [];
  for (const code of Object.values(APPOINTMENT_TYPE_MAP)) {
    out.push({ system: APPOINTMENT_TYPE_SYSTEM, code: code.code, emittedBy: "src/interop/fhir.ts" });
  }
  for (const reason of ALL_REFERRAL_REASONS) {
    out.push({ system: REFERRAL_REASON_SYSTEM, code: reason, emittedBy: "src/interop/referral-profile.ts" });
  }
  for (const request of ALL_REFERRAL_REQUESTS) {
    out.push({ system: REFERRAL_REQUEST_SYSTEM, code: request, emittedBy: "src/interop/referral-profile.ts" });
  }
  return out.sort((a, b) => (a.system === b.system ? a.code.localeCompare(b.code) : a.system.localeCompare(b.system)));
}

/**
 * The two systems whose codes are OPEN — they carry whatever the practice recorded.
 *
 * Named rather than omitted from the work order, because "this system has no fixed vocabulary" and
 * "nobody has listed this system's vocabulary yet" are different facts, and a reader of
 * `codesNeedingBinding` would otherwise have to guess which one applies.
 */
export const OPEN_LOCAL_SYSTEMS: readonly { system: string; why: string }[] = [
  {
    system: CONDITION_CODE_SYSTEM,
    why: "The condition code comes from the practice's own register catalogue, so there is no fixed list to bind — a binding here would have to be per practice, and W133's cross-boundary question is still open.",
  },
  {
    system: RECORDED_FACT_SYSTEM,
    why: "W120 fact codes describe what a practice recorded, and the set grows with the practice's own registers rather than with this product. Binding them is a per-practice mapping exercise, not a fixed table.",
  },
];

/** What is still unbound, named one code at a time. The row's own requirement. */
export function unboundCodes(catalogue: BindingCatalogue): LocalCode[] {
  return codesNeedingBinding().filter((c) => !bindCode(catalogue, c.system, c.code).bound);
}
