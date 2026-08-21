// W255: what a refused caller is told, and what a refusal is structurally incapable of telling them.
//
// THREE THINGS AN ERROR PATH LEAKS, AND ONLY THE FIRST IS THE ONE PEOPLE CHECK.
//
//   1. PATIENT DATA. The obvious one, and the easy one to pass: none of this lane's refusals
//      mentions a patient, because none of its reads returns one.
//   2. THE REQUEST. A refusal that echoes what the caller sent — "no such practice: prac-abc" —
//      leaks whatever the caller put in the field, which on a public API is whatever an attacker
//      chose to put there. Echo a request field into a refusal and you have built a reflector:
//      the caller supplies a patient id, the API hands it back, and it lands in whatever logs,
//      dashboards or support tickets the refusal reaches. Nothing about this is stopped by "we
//      never put patient data in errors", because the product did not put it there.
//   3. EXISTENCE. "Not a member" and "no such practice" are different answers, and telling them
//      apart is an oracle: ask repeatedly and you enumerate the tenants. W253 already took this
//      position for one branch; this module makes it the rule.
//
// SO THE PROPERTY IS NOT "NO PATIENT DATA IN REFUSALS". It is that A REFUSAL CARRIES NOTHING FROM
// THE REQUEST AT ALL — the copy for a reason is the same bytes whatever it was called with. That
// is a stronger claim, it subsumes the first two, and unlike "contains no patient id" it is
// checkable against inputs nobody thought of: exercise a branch with an attacker-shaped argument
// and require the answer to be identical to the one from an ordinary argument.
//
// WHICH IS ALSO WHY THIS IS A REGISTER RATHER THAN A TEST. The gate says "every refusal branch
// rather than sampled", and a test that checks the branches its author remembered is a sample
// whatever it is called. The branches are DISCOVERED by exercising the lane, and the discovered
// set is checked against the declared one in both directions — three registers in this session
// failed in exactly the direction their author was not facing, which is enough of a pattern to
// design against rather than note.

import { SCOPE_REFUSAL_COPY, type ScopeRefusal } from "./scope";
import { CALLER_MISMATCH_COPY, SCOPE_DENIAL_COPY, type GrantRefusal } from "./scopes";

/** Every reason this lane can refuse a read. Tenancy first, then grant. */
export type PlatformRefusal = ScopeRefusal | GrantRefusal | "grant_belongs_to_another_caller";

/**
 * The declared branches, with the copy each produces.
 *
 * The copy is CARRIED from the module that owns the refusal rather than restated here — W177's
 * rule, and the reason W223 carries W222's sentences verbatim. A second wording of one refusal is
 * a second thing to keep in step, and the copy is always what drifts.
 */
export const PLATFORM_REFUSALS: Record<PlatformRefusal, string> = {
  no_practice_requested: SCOPE_REFUSAL_COPY.no_practice_requested,
  caller_holds_nothing: SCOPE_REFUSAL_COPY.caller_holds_nothing,
  not_a_member: SCOPE_REFUSAL_COPY.not_a_member,
  no_scopes_granted: SCOPE_DENIAL_COPY.no_scopes_granted,
  scope_not_granted: SCOPE_DENIAL_COPY.scope_not_granted,
  grant_belongs_to_another_caller: CALLER_MISMATCH_COPY,
};

export const ALL_PLATFORM_REFUSALS: readonly PlatformRefusal[] = Object.keys(
  PLATFORM_REFUSALS,
) as PlatformRefusal[];

/**
 * Pairs that must be indistinguishable to a caller, and why.
 *
 * Declared as data because "these two must look the same" is exactly the kind of rule that lives
 * in a comment and stops being true. Each pair names the question a caller could otherwise answer
 * by asking repeatedly.
 *
 * NOTE WHAT IS NOT HERE. `caller_holds_nothing` and `not_a_member` are deliberately DISTINCT, and
 * that is a decision rather than an oversight: both are about the caller's own access and neither
 * says anything about another practice. Making them identical would cost a caller the ability to
 * tell "nobody has granted me anything" from "I asked for the wrong one" — a real support burden
 * — for no disclosure gain, because a caller already knows what they hold.
 */
export interface IndistinguishablePair {
  reason: PlatformRefusal;
  /** What a caller must not be able to learn by comparing answers. */
  wouldOtherwiseReveal: string;
}

export const MUST_NOT_DISCLOSE_EXISTENCE: readonly IndistinguishablePair[] = [
  {
    reason: "not_a_member",
    wouldOtherwiseReveal:
      "Whether a practice exists at all. A refusal that said 'no such practice' for one id and 'not a member' for another is an oracle: ask it repeatedly and you have enumerated this product's tenants, along with which ids are real. The same sentence is returned either way, so the answer carries no information beyond the caller's own lack of access.",
  },
  {
    reason: "scope_not_granted",
    wouldOtherwiseReveal:
      "Which reads exist that this caller cannot perform. Narrowing the answer instead of refusing it — returning a smaller payload with the ungranted fields missing — would let a caller map the surface by watching which fields disappear, so the read is refused whole.",
  },
];

/**
 * A refusal, as it goes back to a caller.
 *
 * TAKES THE REASON AND NOTHING ELSE, and that is the guarantee rather than a convention. There is
 * no second parameter for context, no `detail`, no `field`. A refusal cannot echo the request
 * because there is no request in scope here — which is a much stronger position than remembering
 * not to interpolate one, and it is why this function exists at all rather than each caller
 * formatting its own.
 */
export function refuse(reason: PlatformRefusal): { refused: true; reason: PlatformRefusal; copy: string } {
  return { refused: true, reason, copy: PLATFORM_REFUSALS[reason] };
}
