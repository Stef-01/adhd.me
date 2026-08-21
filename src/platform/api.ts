// W253: the platform's read surface — a census of endpoints, each of which takes a proven practice.
//
// WHAT THIS SURFACE WILL NOT RETURN, DECIDED FIRST BECAUSE IT SHAPES EVERYTHING ELSE.
// No patient identity, and no row that is about one person. The temptation is real: the stores
// hold appointments, complaints and invitations, all of them practice-scoped and all of them
// exactly what an integrator would ask for. But an outside system reading a patient row from this
// tree is G2 territory (real patient data) and arguably G8 (patient-derived content leaving to a
// third party), and NEITHER GATE COVERS AN API WE OURSELVES PUBLISH — there is no ruling to build
// behind, which is not the same as being allowed. So the surface answers questions ABOUT A
// PRACTICE: its configuration, its roster size, how many of a thing it has. Counts and settings,
// never people. When a founder decides an integrator may read patient-level data, that is a new
// gate and a new set of endpoints, not a field added to one of these.
//
// THAT DECISION IS ALSO WHY THIS IS ASSERTABLE. "No cross-practice data" is one property; "no
// patient identity" is a second, and a surface that returns only counts and settings can be swept
// for both over the WHOLE census rather than sampled. A surface returning rows could not: every
// new field would be a new place for an id to appear.
//
// READ-ONLY IS STRUCTURAL, NOT A NAMING CONVENTION. "It only has getters" is true until somebody
// adds one. Every endpoint's `read` returns a value and reaches no writer, checked against the
// module's own source rather than promised in this comment.
//
// AND THE CENSUS IS CHECKED BOTH DIRECTIONS, which this tree has learned the hard way three times
// in one day: W200 enforced modules and not their exports, W106 found stores by a keyword that
// missed the module that mattered, W167 matched three fold shapes and missed a fourth. A register
// that checks the direction its author was facing is the shape, so this one asserts that every
// declared endpoint exists AND that nothing exported from here is undeclared.

import { complaintsFor } from "@/complaints/store";
import { practiceRecord } from "@/console/store";
import type { ApiScope } from "./scopes";
import type { ScopedPractice } from "./scope";

/**
 * One read.
 *
 * `read` takes a `ScopedPractice` and nothing else. There is no overload taking an id, and none
 * can be added without exporting the brand — which is the point: the absence of a second signature
 * is the guarantee, not a convention.
 */
export interface PlatformEndpoint {
  /** Stable path, for the transport that will sit on top of this (W254/W255). */
  path: string;
  /** What it answers, in a sentence. Linted like any other operator copy. */
  summary: string;
  /**
   * The grant this read needs (W254). Required, not optional — an endpoint whose scope could be
   * omitted is an endpoint that is readable by anybody holding any grant the day somebody forgets
   * it, and "we always remember" is the control this tree has watched fail.
   */
  requires: ApiScope;
  read(scope: ScopedPractice): Readonly<Record<string, number | string | boolean | null>>;
}

/**
 * How many clinicians a practice has on its roster, and whether it has finished setup.
 *
 * Counts rather than the roster itself: a clinician list is a list of named people, and while
 * they are staff rather than patients, publishing who works where through an integration is a
 * decision nobody has made. The count answers the question an integrator actually has — is this
 * practice configured — without answering one they did not ask.
 */
const practiceProfile: PlatformEndpoint = {
  path: "/v1/practice",
  requires: "practice:read",
  summary:
    "The practice's own configuration: how many clinicians are on its roster, and whether it has finished setting up.",
  read: (scope) => {
    const record = practiceRecord(scope.practiceId);
    return {
      practiceId: scope.practiceId as string,
      clinicianCount: record?.clinicians.length ?? 0,
      setupComplete: record?.setupCompletedAt !== null && record?.setupCompletedAt !== undefined,
      // Null rather than absent when there is no record: a missing key reads as "not supported by
      // this version" to a client, and this is "we have no such practice".
      rulesVersion: record?.rulesVersion ?? null,
    };
  },
};

/**
 * How many complaints a practice holds, and how many are open.
 *
 * THE ENDPOINT THAT WOULD HAVE LEAKED. Y4-1 was the complaints store read unfiltered, and a count
 * is exactly the shape it took: the console home rendered an unfiltered total as "N open
 * complaints — review now", which was every practice's. It is included here deliberately rather
 * than avoided, because a surface that omits the one thing that went wrong proves nothing about
 * whether it would go wrong again. `complaintsFor` is the scoped read, filtered as the query.
 */
const complaintSummary: PlatformEndpoint = {
  path: "/v1/complaints/summary",
  requires: "complaints:read",
  summary:
    "How many complaints this practice holds and how many are still open. Counts only — no complaint text and nothing about who made one.",
  read: (scope) => {
    const mine = complaintsFor(scope.practiceId as string);
    return {
      practiceId: scope.practiceId as string,
      total: mine.length,
      open: mine.filter((c) => c.status === "open").length,
    };
  },
};

/**
 * What this surface refuses to answer, as data rather than as documentation.
 *
 * An integrator's first question after reading the two endpoints above is "where is everything
 * else", and the honest answer has a reason attached. Held here so the reason travels with the
 * surface instead of living in a document that goes stale — W239's device, and the same argument.
 */
export interface RefusedRead {
  what: string;
  why: string;
}

export const REFUSED_READS: readonly RefusedRead[] = [
  {
    what: "Any row about one person — appointments, invitations, complaint text, patient records.",
    why: "An outside system reading patient-level data from this tree sits behind G2, and on any reading of it that involves sending patient-derived content onwards, G8 as well. Neither gate covers an API this product publishes itself, and no ruling exists to build behind — which is not the same as being permitted. It is a new gate and new endpoints when a founder decides it, never a field added to one of these.",
  },
  {
    what: "The clinician roster as a list of names.",
    why: "Clinicians are staff rather than patients, so this is not a G2 question — and publishing who works where through an integration is still a decision nobody has made. The count answers what an integrator is actually asking, which is whether the practice is configured.",
  },
  {
    what: "Anything about a practice other than the one resolved for this caller.",
    why: "Not a policy but a property: every read takes a practice this caller has been proven to hold, and there is no signature that takes anything else. A cross-practice read is not refused here — it cannot be written.",
  },
  {
    what: "Any write at all.",
    why: "This surface is read-only, and structurally so rather than by naming convention: no endpoint reaches a writer, which is checked against this module's source. A write from an integration needs its own unit, its own refusal semantics and a decision about what an outside system may change.",
  },
];

/**
 * The census. Every endpoint the platform exposes, and the only place they are listed.
 *
 * Checked both directions by this module's test: nothing declared here that has gone, and nothing
 * exported from this file that is an endpoint and is not declared.
 */
export const PLATFORM_ENDPOINTS: readonly PlatformEndpoint[] = [practiceProfile, complaintSummary];
