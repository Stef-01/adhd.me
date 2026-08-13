// W119: the G5 gate for pathways — W69's three stages, applied to W118's versions.
//
// W118 built the container: a pathway version is derived from events, immutable, and
// identified by the hash of its criteria. This decides which of those versions may actually
// be used, and the rule is the one W69 established for register content: **an unsigned pathway
// is UNUSABLE — not flagged, not warned about, unusable** — and the type system is what
// enforces it, because a runtime check can be forgotten at a call site and a type cannot.
//
//   * `UsablePathway` is branded. The only way to obtain one is `usablePathway()`, which
//     demands a completed review AND a founder sign-off. There is no cast, no constructor and
//     no force parameter, so `as UsablePathway` is the sole bypass and is greppable in review.
//   * W120's evaluation and W123's capability binding must take `UsablePathway`, not
//     `PathwayVersion`. Passing an unsigned version is then a compile error rather than a
//     policy someone remembered.
//
// Three stages, not two, for W69's reason: a specialist reviewer answers "is this clinically
// correct?" and the founder answers "do we accept the liability of shipping it?". Those are
// different questions, and collapsing them loses the distinction G5 exists to preserve.
//
// ONE PROPERTY COMES FREE, AND IT IS THE IMPORTANT ONE. Attestations are keyed by the version
// hash, and W118 made a version's identity its content — so editing a pathway does not
// "invalidate" its sign-off, it produces a different version that was never signed at all.
// W67 had to build hash-keyed revocation deliberately; here it is a consequence of the
// representation, and there is no code path that could get it wrong.
//
// Ships with zero pathways signed, and a test pins it.

import type { PathwayVersion } from "./versioning";

export type PathwayAttestationKind = "specialist_review" | "founder_sign_off";

export interface PathwayAttestation {
  pathwayId: string;
  /** W118's content hash. An edit produces a different hash and therefore no attestation. */
  versionHash: string;
  kind: PathwayAttestationKind;
  byEmail: string;
  at: string;
  /**
   * What the attester actually concluded. Required on both kinds: an attestation with no
   * finding is a signature on a document nobody described, which is what a paper trail of a
   * check that never happened looks like.
   */
  finding: string;
  /** Set when the attestation is revoked. Revocation is immediate and terminal for it. */
  revokedAt?: string | null;
}

/**
 * A pathway that has cleared G5.
 *
 * The brand cannot be produced by a literal, so `usablePathway()` is the only legitimate
 * source. Downstream units take THIS type, never `PathwayVersion`.
 */
declare const G5_PATHWAY_SIGNED_OFF: unique symbol;

export interface UsablePathway {
  readonly [G5_PATHWAY_SIGNED_OFF]: true;
  version: PathwayVersion;
  reviewedBy: string;
  reviewedAt: string;
  signedOffBy: string;
  signedOffAt: string;
}

export type PathwayRefusal =
  | "not_reviewed"
  | "not_signed_off"
  | "reviewer_was_the_author"
  | "signatory_was_the_reviewer"
  | "sign_off_precedes_review"
  | "review_revoked"
  | "sign_off_revoked"
  | "attested_before_withdrawal"
  | "version_not_published";

/** Any attestation of this kind at all, regardless of date — used only to explain a refusal. */
function hasAny(
  attestations: readonly PathwayAttestation[],
  version: PathwayVersion,
  kind: PathwayAttestationKind,
): boolean {
  return attestations.some(
    (a) =>
      a.pathwayId === version.pathwayId &&
      a.versionHash === version.versionHash &&
      a.kind === kind &&
      !a.revokedAt,
  );
}

export type UsabilityResult =
  | { usable: true; pathway: UsablePathway }
  | { usable: false; reason: PathwayRefusal };

function live(
  attestations: readonly PathwayAttestation[],
  version: PathwayVersion,
  kind: PathwayAttestationKind,
  /** W128: attestations before this instant do not count at all. */
  since: string | null,
): { found: PathwayAttestation | null; revoked: boolean } {
  const matching = attestations.filter(
    (a) =>
      a.pathwayId === version.pathwayId &&
      a.versionHash === version.versionHash &&
      a.kind === kind &&
      // Filtered BEFORE choosing, not checked after. Choosing the earliest and then testing
      // it against the boundary would let a stale signature mask a genuinely fresh one,
      // reporting a re-attested pathway as unusable.
      (since === null || a.at >= since),
  );
  const unrevoked = matching.filter((a) => !a.revokedAt);
  if (unrevoked.length > 0) {
    // The earliest live one, so the recorded date is when the check actually happened rather
    // than whichever row was appended last.
    //
    // W167: tie-broken on the attester. Two attestations at the same instant used to resolve to
    // whichever the store listed first, so the audit record would name a different reviewer
    // depending on row order — a small thing that is exactly wrong in the one document whose
    // job is to say who looked.
    return {
      found: unrevoked.reduce((a, b) =>
        a.at === b.at ? (a.byEmail <= b.byEmail ? a : b) : a.at < b.at ? a : b,
      ),
      revoked: false,
    };
  }
  return { found: null, revoked: matching.length > 0 };
}

/**
 * Can this version be used?
 *
 * Every refusal is named, because "this pathway is not available" is unactionable and
 * "it has been reviewed but not signed off" tells the founder exactly what is waiting on them.
 */
export function usablePathway(
  version: PathwayVersion,
  attestations: readonly PathwayAttestation[],
): UsabilityResult {
  // A draft or superseded version is not usable however well attested. Sign-off says the
  // content is acceptable; being in force is a separate fact, and W118 owns it.
  if (version.state !== "published") return { usable: false, reason: "version_not_published" };

  // W128: a withdrawal resets the clock on both stages. See the note below.
  const since = version.withdrawnAt;
  const review = live(attestations, version, "specialist_review", since);
  if (!review.found) {
    if (since !== null && hasAny(attestations, version, "specialist_review")) {
      // There ARE signatures, they just predate the withdrawal. Saying "not reviewed" to
      // somebody looking at a review on screen would read as a bug.
      return { usable: false, reason: "attested_before_withdrawal" };
    }
    return { usable: false, reason: review.revoked ? "review_revoked" : "not_reviewed" };
  }
  if (review.found.byEmail === version.draftedBy) {
    // Not ceremony: the whole value of a review is that a second person looked, and a
    // workflow permitting self-review produces the paper trail of a check that never happened.
    return { usable: false, reason: "reviewer_was_the_author" };
  }

  const signOff = live(attestations, version, "founder_sign_off", since);
  if (!signOff.found) {
    if (since !== null && hasAny(attestations, version, "founder_sign_off")) {
      return { usable: false, reason: "attested_before_withdrawal" };
    }
    return { usable: false, reason: signOff.revoked ? "sign_off_revoked" : "not_signed_off" };
  }
  if (signOff.found.byEmail === review.found.byEmail) {
    // The two stages exist to ask different questions. One person answering both has
    // collapsed them back into one, whatever the record says.
    return { usable: false, reason: "signatory_was_the_reviewer" };
  }
  if (signOff.found.at < review.found.at) {
    // A sign-off dated before the review it depends on cannot have been informed by it.
    return { usable: false, reason: "sign_off_precedes_review" };
  }

  return {
    usable: true,
    pathway: {
      version,
      reviewedBy: review.found.byEmail,
      reviewedAt: review.found.at,
      signedOffBy: signOff.found.byEmail,
      signedOffAt: signOff.found.at,
    } as UsablePathway,
  };
}

/**
 * The gate for call sites that must not proceed. Throws rather than returning a boolean,
 * for W67's reason: a boolean nobody reads is not a gate.
 */
export function assertUsable(
  version: PathwayVersion,
  attestations: readonly PathwayAttestation[],
): UsablePathway {
  const result = usablePathway(version, attestations);
  if (!result.usable) {
    throw new Error(
      `founder gate G5: pathway ${version.pathwayId}@${version.versionHash.slice(0, 8)} is not usable (${result.reason})`,
    );
  }
  return result.pathway;
}

/** Only the versions that cleared the gate. The list a console shows as "in use". */
export function usablePathways(
  versions: readonly PathwayVersion[],
  attestations: readonly PathwayAttestation[],
): UsablePathway[] {
  return versions
    .map((v) => usablePathway(v, attestations))
    .filter((r): r is { usable: true; pathway: UsablePathway } => r.usable)
    .map((r) => r.pathway);
}

/**
 * Shipped attestations. **EMPTY** — no pathway has been reviewed or signed off, so nothing is
 * usable, and a test pins it. Signing one off is a founder act recorded in a commit.
 */
export const SHIPPED_ATTESTATIONS: readonly PathwayAttestation[] = [];

export const PATHWAY_REFUSAL_COPY: Record<PathwayRefusal, string> = {
  not_reviewed: "No specialist has reviewed this version yet, so it cannot be used.",
  not_signed_off:
    "A specialist has reviewed this version, and it is waiting on founder sign-off before it can be used.",
  reviewer_was_the_author:
    "The review was recorded by the person who wrote it. A second person has to look before this can be used.",
  signatory_was_the_reviewer:
    "The same person reviewed and signed this off. Those are different questions and need different people.",
  sign_off_precedes_review:
    "The sign-off is dated before the review it depends on, so it cannot have been informed by it.",
  review_revoked: "The specialist review of this version was withdrawn. It needs reviewing again.",
  sign_off_revoked: "Sign-off for this version was withdrawn. It needs signing off again.",
  attested_before_withdrawal:
    "This version was withdrawn after it was signed off. Bringing it back into force needs a fresh review and sign-off, made in the knowledge of why it was withdrawn.",
  version_not_published:
    "This version is not the one in force. Sign-off says the content is acceptable; being in force is a separate thing.",
};
