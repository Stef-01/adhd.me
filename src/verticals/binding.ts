// W160: a practice is bound to the vertical version it accepted, and stays there.
//
// The failure this exists to prevent is the quiet one. A practice reads a cardiometabolic
// vertical, agrees to it, and turns it on. Six weeks later a new version publishes with a
// widened exclusion criterion. If the binding names the VERTICAL, that practice is now running
// content nobody at that practice ever read — and because nothing broke, nobody finds out. The
// clinical content changed under a practice that had accepted a different document.
//
// So the binding names a VERSION HASH, never a vertical id. W157 made a vertical's identity its
// membership, which means publishing v2 produces a different hash and the binding still points
// at v1. "No silent upgrade" is then not a rule anyone enforces — there is no code path that
// could perform one, because nothing here resolves "the latest version of X".
//
// UPGRADING IS AN ACT, WITH A NAME ON IT. `acceptVersion` records who accepted what and when,
// and it takes the TARGET HASH explicitly. An `upgradeToLatest(verticalId)` would reintroduce the
// silent upgrade at the moment of the call — the practice would get whatever happened to be
// newest, which is precisely the thing they did not agree to.
//
// W128'S WITHDRAWAL SEMANTICS ARE INHERITED, NOT RESTATED, and the inheritance is worth being
// precise about because it is the reason this module is small. A binding holds a hash. Whether
// that version still WORKS is asked of W157 at resolution time, and W157 assembles evidence from
// whatever is signed off right now. So when a specialist review is revoked, the pathway leaves
// `usablePathways()`, the vertical citing it stops being usable, and every practice bound to it
// learns at their next resolution. No propagation step exists here because none is needed — the
// same free inheritance W152 got from W119 and W119 got from W118.
//
// WHAT HAPPENS WHEN A BOUND VERSION GOES UNUSABLE IS THE INTERESTING CASE, and there are two
// wrong answers that both look helpful:
//
//   * AUTO-MIGRATE to a newer usable version. That is the silent upgrade, arriving through the
//     back door at the worst possible moment — the practice is now running unread content AND
//     the trigger was a safety withdrawal.
//   * DROP THE BINDING, so the practice is simply not on a vertical. A practice silently
//     unbound has had a decision reversed without being told, and the register they thought was
//     running is not.
//
// So the binding STANDS and resolution reports `bound_version_unusable`, naming what is missing.
// That is uncomfortable and correct, the same shape W134 chose for an unanswered referral: the
// discomfort is the signal, and somebody has to decide.

import type { PracticeId } from "@/domain/types";
import {
  type VerticalEvidence,
  type VerticalSpec,
  type UnusableMember,
  usableVertical,
  verticalHash,
} from "./model";

export interface VerticalBinding {
  practiceId: PracticeId;
  verticalId: string;
  /** W157's membership hash. Naming the vertical instead is the bug this module prevents. */
  versionHash: string;
  acceptedBy: string;
  acceptedAt: string;
  /** Set when superseded by a later acceptance. History is kept, never overwritten. */
  replacedAt?: string | null;
}

export type AcceptRefusal =
  | "unknown_version"
  | "version_not_usable"
  | "already_on_this_version"
  | "unattributed";

export type AcceptResult =
  | { ok: true; bindings: VerticalBinding[] }
  | { ok: false; reason: AcceptRefusal; unusable?: UnusableMember[] };

/** The live binding for a practice and vertical, if any. */
export function currentBinding(
  bindings: readonly VerticalBinding[],
  practiceId: PracticeId,
  verticalId: string,
): VerticalBinding | null {
  const live = bindings.filter(
    (b) => b.practiceId === practiceId && b.verticalId === verticalId && !b.replacedAt,
  );
  if (live.length === 0) return null;
  // Latest acceptance wins if more than one is somehow live; a practice cannot be on two
  // versions of one vertical at once, and picking the newest is the only defensible tie-break.
  //
  // W167: and when two acceptances share an instant, the version hash breaks the tie. Without
  // it the practice's answer to "which version am I on" would depend on store order — the same
  // silent-version-drift this whole module exists to prevent, arriving by a different door.
  return live.reduce((a, b) => {
    if (a.acceptedAt === b.acceptedAt) return a.versionHash <= b.versionHash ? a : b;
    return a.acceptedAt > b.acceptedAt ? a : b;
  });
}

/**
 * Accept a specific version.
 *
 * Takes the SPEC of the version being accepted rather than a bare hash, so the hash is derived
 * here from the membership the practice is agreeing to. A caller passing a hash alone could bind
 * a practice to a string that corresponds to no document.
 */
export function acceptVersion(
  bindings: readonly VerticalBinding[],
  spec: VerticalSpec,
  evidence: VerticalEvidence,
  practiceId: PracticeId,
  acceptedBy: string,
  acceptedAt: string,
): AcceptResult {
  if (acceptedBy.trim() === "" || acceptedAt.trim() === "") {
    // An acceptance nobody made is not an acceptance — the same requirement W122 put on a
    // pathway change and W119 on an attestation.
    return { ok: false, reason: "unattributed" };
  }

  const result = usableVertical(spec, evidence);
  if (!result.usable) {
    // A practice cannot accept something that does not work today. This is not the same check
    // as resolution: that one asks whether an ALREADY-accepted version still works.
    return { ok: false, reason: "version_not_usable", unusable: result.unusable };
  }

  const hash = verticalHash(spec.members);
  const existing = currentBinding(bindings, practiceId, spec.verticalId);
  if (existing?.versionHash === hash) return { ok: false, reason: "already_on_this_version" };

  return {
    ok: true,
    bindings: [
      // The previous binding is CLOSED, not deleted: "on v1 from March to June" is what an audit
      // needs, and a deleted row cannot be told from one that never existed (W57's rule).
      ...bindings.map((b) =>
        b === existing ? { ...b, replacedAt: acceptedAt } : b,
      ),
      {
        practiceId,
        verticalId: spec.verticalId,
        versionHash: hash,
        acceptedBy,
        acceptedAt,
        replacedAt: null,
      },
    ],
  };
}

export type ResolutionState =
  /** Bound, and the version still works. */
  | "in_force"
  /** Bound to a version that has stopped working — a member was withdrawn or revoked. */
  | "bound_version_unusable"
  /** Bound to a hash that matches none of the supplied specs. */
  | "bound_version_unknown"
  /** Never accepted anything. Not an error: most practices are on no vertical. */
  | "not_bound";

export interface Resolution {
  practiceId: PracticeId;
  verticalId: string;
  state: ResolutionState;
  binding: VerticalBinding | null;
  /** The spec in force, only when the state is `in_force`. */
  spec: VerticalSpec | null;
  /** Populated when the bound version has stopped working. */
  unusable: UnusableMember[];
  /**
   * Versions of this vertical that ARE usable now. Offered as information, never applied —
   * see the module note on why auto-migration is the wrong kind of helpful.
   */
  usableAlternatives: string[];
}

/**
 * What is this practice actually running?
 *
 * Asks W157 whether the bound version still works rather than caching an answer, which is what
 * makes withdrawal propagate with no step here.
 */
export function resolveBinding(
  bindings: readonly VerticalBinding[],
  specs: readonly VerticalSpec[],
  evidence: VerticalEvidence,
  practiceId: PracticeId,
  verticalId: string,
): Resolution {
  const binding = currentBinding(bindings, practiceId, verticalId);
  const forVertical = specs.filter((s) => s.verticalId === verticalId);
  const usableAlternatives = forVertical
    .filter((s) => usableVertical(s, evidence).usable)
    .map((s) => verticalHash(s.members))
    .sort();

  const base = { practiceId, verticalId, binding, spec: null, unusable: [], usableAlternatives };
  if (!binding) return { ...base, state: "not_bound" };

  const bound = forVertical.find((s) => verticalHash(s.members) === binding.versionHash);
  if (!bound) return { ...base, state: "bound_version_unknown" };

  const result = usableVertical(bound, evidence);
  if (!result.usable) {
    return { ...base, state: "bound_version_unusable", unusable: result.unusable };
  }

  return { ...base, state: "in_force", spec: bound };
}

export const RESOLUTION_COPY: Record<ResolutionState, string> = {
  in_force: "Running the version this practice accepted.",
  bound_version_unusable:
    "The version this practice accepted has stopped working — part of its content has been withdrawn or its sign-off revoked. It has NOT been moved to another version: that would be running content nobody here has read. Somebody has to decide.",
  bound_version_unknown:
    "This practice is bound to a version that is no longer on file. Nothing has been assumed in its place.",
  not_bound: "This practice has not accepted a version of this vertical.",
};

export const ACCEPT_REFUSAL_COPY: Record<AcceptRefusal, string> = {
  unknown_version: "That version is not on file, so there is nothing to accept.",
  version_not_usable:
    "That version does not work today — some of its content is not signed off. The members are named so they can be fixed before it is offered again.",
  already_on_this_version: "This practice is already on that exact version. Nothing changed.",
  unattributed: "An acceptance has to record who made it and when. Nothing was recorded.",
};
