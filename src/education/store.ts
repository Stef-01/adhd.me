// W151: where the education library and CPD entries live for a running console.
//
// The modules that decide things are pure — W145 orders, W148 matches triggers, W149 folds a
// trail — and this holds what they read. One decision worth stating:
//
//   THE LIBRARY IS NOT PRACTICE-SCOPED; THE CPD TRAIL IS CLINICIAN-SCOPED. Material is content,
//   like a pathway (W127), so per-practice copies would mean N versions of a document with no
//   single answer to what was published. A clinician's reading record is the opposite: it is
//   about one person, and W149 refused any read that returns somebody else's.

import type { EducationItem } from "./curation";
import type { CpdEntry } from "./cpd";
import type { CaseTrigger } from "./triggers";
import { type SignedOffSource, sourcesFromContent } from "./provenance";
import type { ApprovedContent } from "@/registers/authoring";

interface EducationState {
  items: EducationItem[];
  triggers: CaseTrigger[];
  cpd: CpdEntry[];
  /**
   * W154: the signed-off sources the library may cite. Held as `SignedOffSource`, and the only
   * way to put one here is `addSignedOffContent`, which takes `ApprovedContent` — so the store
   * cannot be handed a source that never cleared G5.
   */
  sources: SignedOffSource[];
}

const globalStore = globalThis as { __meherrEducation?: EducationState };

function state(): EducationState {
  globalStore.__meherrEducation ??= { items: [], triggers: [], cpd: [], sources: [] };
  return globalStore.__meherrEducation;
}

export function resetEducation(): void {
  globalStore.__meherrEducation = { items: [], triggers: [], cpd: [], sources: [] };
}

/**
 * Record content that has cleared G5, so material may cite it.
 *
 * Takes `ApprovedContent` rather than a ref string: the parameter type is the whole guarantee
 * (W152). There is deliberately no overload accepting a bare source.
 */
export function addSignedOffContent(approved: readonly ApprovedContent[]): void {
  state().sources.push(...sourcesFromContent(approved));
}

/** The catalogue a surface checks material against. Empty until something is signed off. */
export function getSignedOffSources(): readonly SignedOffSource[] {
  return state().sources;
}

export function getLibrary(): readonly EducationItem[] {
  return state().items;
}

export function getTriggers(): readonly CaseTrigger[] {
  return state().triggers;
}

export function addLibraryItems(items: readonly EducationItem[]): void {
  state().items.push(...items);
}

export function addTriggers(triggers: readonly CaseTrigger[]): void {
  state().triggers.push(...triggers);
}

export function addCpdEntries(entries: readonly CpdEntry[]): void {
  state().cpd.push(...entries);
}

/**
 * CPD entries for one clinician at one practice.
 *
 * Takes the pair as the query, and there is deliberately no sibling returning everyone's —
 * W149's absence, preserved at the storage layer so it cannot be reintroduced by a page that
 * "just needs the list".
 */
export function cpdEntriesFor(practiceId: string, clinicianId: string): CpdEntry[] {
  return state().cpd.filter(
    (entry) => entry.practiceId === practiceId && entry.clinicianId === clinicianId,
  );
}

/**
 * Drop one clinician's trail at one practice. For erasure and reset only, never for a view.
 *
 * PRACTICE-SCOPED, unlike patient erasure. A clinician leaving practice A has not left practice
 * B, and their trail there is a different practice's record of a different engagement — W106's
 * distinction, which is also why `scrubPatientFromComplaints` deliberately takes no practice.
 */
export function scrubClinicianCpd(practiceId: string, clinicianId: string): number {
  const before = state().cpd.length;
  state().cpd = state().cpd.filter(
    (entry) => !(entry.practiceId === practiceId && entry.clinicianId === clinicianId),
  );
  return before - state().cpd.length;
}
