// W254: what kind of read a caller has been granted — a different question from which practice.
//
// TWO AXES, AND THE BUG WORTH FEARING IS ONE DOING THE OTHER'S JOB. W253 answers WHICH PRACTICE:
// resolved from memberships, minted as a brand no caller can construct. This answers WHAT KIND OF
// READ, inside a practice the caller already holds. They are independent, and the authorisation
// failures that matter are the ones where that independence quietly stops holding — a scope that
// also widens tenancy, or a tenancy check treated as sufficient because the caller "has access".
// Y4-1 was exactly one axis failing while the other looked fine.
//
// SO `authoriseRead` TAKES BOTH AND NEITHER IS DERIVABLE FROM THE OTHER. There is no signature
// that takes a scope alone, none that takes a practice alone, and — the part that is easy to get
// wrong — the granted scopes are NOT read from the `ScopedPractice`. Hanging them off the resolved
// practice would be convenient and would make the two axes one: every caller who could reach a
// practice would carry whatever that practice's grants were, and a widening on either side would
// silently widen the other.
//
// A SCOPE MODEL ALSO FAILS MORE QUIETLY THAN A TENANCY MODEL. An unscoped tenancy read returns
// somebody else's rows, and a test seeding two practices sees it immediately. A scope granting
// more than it should returns exactly the right practice's data through the wrong door — every
// tenancy assertion still passes, and nothing looks wrong. What catches that is the census in both
// directions plus one property a permissive default cannot satisfy: A CALLER GRANTED NOTHING CAN
// READ NOTHING, swept over every endpoint rather than sampled on a granted caller.
//
// SCOPES NAME A KIND OF DATA, NOT AN ENDPOINT. One scope per endpoint is not a model — it is the
// endpoint list with a second name, and it grows a new grant every time a path is added, which
// means every integrator's grant has to be revisited to add a read they already conceptually had.
// Naming the KIND is what makes a grant stable across new endpoints over the same data, and it is
// also what makes the both-directions check meaningful: a scope no endpoint requires grants
// nothing and is a promise to an integrator that this product cannot keep.
//
// NO CREDENTIAL, AND W242'S DISTINCTION APPLIES WITH ONE DIFFERENCE. That unit drew the line: "no
// credentials in the tree" is a fact about today's contents and stops being true in a commit that
// looks like configuration, while "nothing can be constructed" is a property of the code. Same
// here — `SHIPPED_GRANTS` is pinned empty and there is no minting function at all. THE DIFFERENCE:
// G1 covers PMS and booking credentials, and a credential for THIS product's own API is covered by
// no named gate. The honest posture is not to imply one protects it. Nothing is shipped, nothing
// can be minted, and when a founder decides an integrator may hold a credential, that ruling and
// the minting path arrive together.

/**
 * A kind of read.
 *
 * Deliberately few and deliberately about DATA rather than about paths. Adding an endpoint over
 * data a scope already names must not require re-granting anything to anybody.
 */
export type ApiScope =
  /** A practice's own configuration: roster size, setup state, rules version. */
  | "practice:read"
  /** Counts of complaints a practice holds. Never their text, and never who made one. */
  | "complaints:read";

export const ALL_API_SCOPES: readonly ApiScope[] = ["practice:read", "complaints:read"];

/**
 * What each scope grants and why it is not folded into another.
 *
 * The "why separate" half is the one that stops a model rotting into a single `read` scope. Every
 * merge looks harmless at the time; what it costs is the ability to grant an integrator one of the
 * two, which is the only reason to have scopes at all.
 */
export const SCOPE_GRANTS: Record<ApiScope, { grants: string; whySeparate: string }> = {
  "practice:read": {
    grants:
      "How a practice is set up: how many clinicians are on its roster, whether it has finished setting up, and which version of its rules is in force.",
    whySeparate:
      "This is the practice describing its own configuration, and it is the read an integrator needs simply to know whether a practice is live. Folding the complaint counts into it would mean any integration that checks setup state also learns how many complaints a practice is carrying, which is a different subject and a different conversation with the practice.",
  },
  "complaints:read": {
    grants: "How many complaints a practice holds and how many are still open. Counts only.",
    whySeparate:
      "A complaint count is a sensitive operational figure about a practice — it is the number a practice would want to discuss before an outside system could read it, and W206 is the reason to be careful with this store specifically. Granting it must be a separate decision from granting configuration, or the decision never actually gets made.",
  },
};

/**
 * Why a read was refused for want of a GRANT.
 *
 * Named `GrantRefusal` rather than `ScopeRefusal` because `./scope` already exports a type by that
 * name meaning something else entirely — why a TENANCY was refused. Two types with one name in
 * adjacent modules of one lane is how somebody imports the wrong one and gets a compiler error
 * they read as a mistake in their own code; it is also, more quietly, how the two axes this module
 * exists to keep apart start looking like one thing in a reader's head.
 */
export type GrantRefusal =
  /** The caller holds no grant at all. */
  | "no_scopes_granted"
  /** They hold scopes, and not the one this read needs. */
  | "scope_not_granted";

export const SCOPE_DENIAL_COPY: Record<GrantRefusal, string> = {
  no_scopes_granted:
    "This caller has been granted no read of any kind. Recorded separately from being refused a particular one, because nothing has been granted here rather than the wrong thing having been asked for.",
  scope_not_granted:
    "This caller holds grants, and not the one this read needs. The read is refused rather than narrowed: returning a smaller answer would let a caller discover what they may not read by watching which fields go missing.",
};

/**
 * What a caller has been granted.
 *
 * A plain list, and NOT a member of `ScopedPractice`. Hanging grants off the resolved practice
 * would collapse the two axes into one — see the module note. They are passed side by side so a
 * reader of any call site can see both being supplied.
 */
export interface ApiGrant {
  /** Who holds it. Matched against the resolved scope's caller, never trusted on its own. */
  callerEmail: string;
  scopes: readonly ApiScope[];
}

/**
 * PROPOSED FOR NOBODY — no integrator holds a grant, and none can be minted.
 *
 * There is no `mintGrant` in this module and no credential anywhere in the lane. W242's line: the
 * emptiness is a fact about today, the absence of a minting path is a property of the code.
 */
export const SHIPPED_GRANTS: readonly ApiGrant[] = [];

export type AuthorisationResult =
  | { authorised: true }
  | { authorised: false; why: GrantRefusal | "grant_belongs_to_another_caller"; copy: string };

export const CALLER_MISMATCH_COPY =
  "The grant supplied belongs to a different caller than the resolved practice was resolved for. Refused rather than reconciled: a grant and a tenancy that disagree about who is asking is the shape of one of them having been supplied by the wrong side of a call.";

/**
 * May this caller, holding this grant, perform this read on this practice?
 *
 * TAKES BOTH AXES AND CHECKS THEM SEPARATELY. The practice must be a resolved `ScopedPractice`,
 * which only W253's resolver mints; the scope must be in a grant that belongs to the same caller.
 * Neither is inferred from the other, and the caller identity is compared across the two rather
 * than taken from whichever argument happens to carry it — a grant naming a different caller than
 * the tenancy is refused outright, because that disagreement means one of them came from the wrong
 * place.
 */
export function authoriseRead(
  scope: { readonly callerEmail: string },
  grant: ApiGrant | null,
  required: ApiScope,
): AuthorisationResult {
  if (grant === null || grant.scopes.length === 0) {
    return { authorised: false, why: "no_scopes_granted", copy: SCOPE_DENIAL_COPY.no_scopes_granted };
  }
  if (grant.callerEmail.trim().toLowerCase() !== scope.callerEmail.trim().toLowerCase()) {
    return { authorised: false, why: "grant_belongs_to_another_caller", copy: CALLER_MISMATCH_COPY };
  }
  if (!grant.scopes.includes(required)) {
    return { authorised: false, why: "scope_not_granted", copy: SCOPE_DENIAL_COPY.scope_not_granted };
  }
  return { authorised: true };
}
