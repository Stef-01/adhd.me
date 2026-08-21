// W253: a practice a caller has been PROVEN to hold — the only thing a platform read will accept.
//
// THE ROW SAYS "ASSERTED THE WAY Y4-1 SHOULD HAVE BEEN", SO START WITH WHAT Y4-1 ACTUALLY WAS.
// `Complaint.practiceId` existed from W43. The reads were unscoped, and the reason W206 gives is
// the one worth carrying: "the readers were unscoped BECAUSE the writer was" — intake stamped the
// literal `"prac-console"`, an id no console has ever minted, so every complaint belonged to
// nobody and a scoped read would have returned nothing at all. The field was present the entire
// time. A test asserting "this read takes a practice" would have passed every day of those two
// years.
//
// SO THE PARAMETER IS NOT THE PROPERTY, AND ON AN API THE GAP IS WIDER. An endpoint taking
// `?practiceId=` satisfies W123's letter exactly and is worth nothing, because any caller can name
// any practice. A practice id supplied by the caller is a REQUEST. Authorisation is what happens
// when that request is checked against who is asking.
//
// THE CONSOLE ALREADY GOT THIS RIGHT AND THE SENTENCE IS CARRIED RATHER THAN REWRITTEN.
// `activePracticeFor` says: "`requested` is a SELECTION, not a grant: it is honoured only when the
// email already belongs to that practice, so the cookie carrying it cannot widen access — at worst
// it picks among practices the user already has." That is the whole doctrine. What this module
// adds is not a better rule; it is making the rule impossible to skip.
//
// WHICH IS THE BRAND. `ScopedPractice` carries a symbol that is not exported, so no caller can
// construct one — `resolveScope` is the only door. An endpoint therefore cannot be handed a raw
// id, not because a check refuses it but because it does not typecheck. W243 drew the same line
// for patient consent and for the same reason: a guard somebody has to remember is a guard.
//
// WHAT THIS MODULE DOES NOT DO: it does not authenticate. Establishing WHO is calling is W254's
// scope model and the credential question behind it. This takes an already-identified caller and
// answers one question — may they read this practice — so the two concerns do not end up sharing
// one function where a change to either quietly moves the other.

import type { PracticeId } from "@/domain/types";
import { practicesFor } from "@/console/store";

declare const scopeBrand: unique symbol;

/**
 * A practice this caller has been proven to hold.
 *
 * The brand is not exported and no constructor is: `resolveScope` mints these and nothing else
 * can. That is the guarantee — a read taking `ScopedPractice` cannot be called with a string a
 * caller sent, in any code path, including ones nobody has written yet.
 */
export interface ScopedPractice {
  readonly practiceId: PracticeId;
  /** Who it was resolved for. Carried so a refusal or an audit can say whose scope this is. */
  readonly callerEmail: string;
  readonly [scopeBrand]: true;
}

export type ScopeRefusal =
  /** No practice was named. Not the same as naming one and being refused it. */
  | "no_practice_requested"
  /** The caller holds no practices at all — nobody has granted them anything. */
  | "caller_holds_nothing"
  /** They hold practices, and not this one. The one that matters. */
  | "not_a_member";

export const SCOPE_REFUSAL_COPY: Record<ScopeRefusal, string> = {
  no_practice_requested:
    "No practice was named in the request. Recorded as its own refusal rather than defaulted to the caller's only practice: a read that silently picks a practice is a read whose answer changes when somebody is added to a second one.",
  caller_holds_nothing:
    "This caller holds no practice at all. Distinguished from being refused a particular one because the two are different problems — nothing has been granted here, rather than the wrong thing having been asked for.",
  not_a_member:
    "This caller holds practices, and not this one. The request named a practice that exists or does not; either way the answer is the same and says nothing about which, because a refusal that distinguished them would answer questions about other practices to anyone willing to ask repeatedly.",
};

export type ScopeResult =
  | { scoped: true; scope: ScopedPractice }
  | { scoped: false; why: ScopeRefusal; copy: string };

/**
 * Resolve a requested practice against what the caller actually holds.
 *
 * Membership comes from `practicesFor`, which derives it from the membership records rather than
 * storing a second copy — so there is one answer to "what may this email act for" and this module
 * is not it.
 *
 * NOTE WHAT IS ABSENT: no `assume`, no default-to-first, no "if they only have one". Defaulting is
 * how a read acquires an answer that changes the day somebody joins a second practice, and the
 * caller who was relying on the default never finds out.
 */
export function resolveScope(callerEmail: string, requestedPracticeId: string | null | undefined): ScopeResult {
  const refuse = (why: ScopeRefusal): ScopeResult => ({ scoped: false, why, copy: SCOPE_REFUSAL_COPY[why] });

  if (requestedPracticeId === null || requestedPracticeId === undefined || requestedPracticeId.trim().length === 0) {
    return refuse("no_practice_requested");
  }
  const held = practicesFor(callerEmail);
  if (held.length === 0) return refuse("caller_holds_nothing");

  const wanted = requestedPracticeId.trim();
  const match = held.find((record) => (record.practice.id as string) === wanted);
  if (match === undefined) return refuse("not_a_member");

  // The brand is TYPE-ONLY — `declare const` has no runtime value, so it is never set on the
  // object. The first version of this wrote `[scopeBrand]: true` in the literal and threw
  // `scopeBrand is not defined` on every call, which is the honest way to learn that a phantom
  // brand is a claim about the type system rather than a field. W243's consent does the same.
  return {
    scoped: true,
    scope: {
      practiceId: match.practice.id,
      callerEmail: callerEmail.trim().toLowerCase(),
    } as unknown as ScopedPractice,
  };
}
