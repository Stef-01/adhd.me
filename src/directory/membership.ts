// W188: who is in the network, and on what basis.
//
// A directory is a list of practices, and the only interesting question is how a practice gets
// onto it. There is a cheap answer available and it is wrong: the tree already knows which
// practices refer to each other (W93), which ones answer (W134) and which ones return reports
// (W142). Deriving membership from that is one afternoon's work and it would be the same defect
// W57 refused for register membership, arriving in a place where the consequence is public.
//
// SO MEMBERSHIP IS A RECORDED DECISION AND THERE IS NO PATH THAT INFERS ONE. `MembershipBasis`
// has two members, both of them acts somebody performed: the practice joined, or the practice
// left. There is no `inferred_from_referrals`, no `active`, no `implied`. The absence is the
// feature, exactly as W57 put it — this module cannot be ASKED to derive membership, so no
// caller can obtain a derived one and no future edit can quietly widen the basis without
// deleting a stated refusal. `joinNetwork` takes who decided and when, and refuses without them.
//
// WHY IT MATTERS MORE HERE THAN IT DID AT W57. Register membership derived from activity gives
// a practice a wrong internal list. Directory membership derived from activity PUBLISHES a
// practice's name in a network it never agreed to join — and under G6 that is advertising with
// somebody else's business attached to it. A practice that refers a lot has not consented to
// anything; it has been busy.
//
// LEAVING KEEPS HISTORY, W57's second rule for W57's reason. A practice that leaves gets a
// recorded departure rather than a deleted row, because "was in the network until March" is the
// fact an audit needs and a deleted row cannot be told from one that never existed. What the
// DIRECTORY shows is only current members; what the record holds is everything.
//
// AND NOTHING HERE RANKS. No count of referrals, no tenure score, no "most active", no order
// other than by practice id — which carries no meaning and is stated to carry none. W83 refused
// ranking clinicians internally and W184 refused comparative claims in profile copy; a network
// membership list is the third place the same temptation appears, and it is the one where an
// order would read as an endorsement by the network itself.

/** Why a practice is, or is not, in the network. Both members are acts, never observations. */
export type MembershipBasis =
  /** The practice decided to join. Somebody at the practice, on a date. */
  | "joined"
  /** The practice decided to leave. Also an act, and it does not erase the joining. */
  | "left";

/** One recorded decision. Append-only: a departure is a new event, not an edit. */
export interface MembershipEvent {
  practiceId: string;
  basis: MembershipBasis;
  /** ISO date the decision was made. */
  at: string;
  /** Who at the practice decided. A decision with no decider is an assertion with a date on it. */
  decidedBy: string;
}

export type JoinRefusal =
  | "practice_missing"
  | "decider_missing"
  | "date_missing_or_unreadable"
  | "already_a_member";

export type LeaveRefusal = "practice_missing" | "decider_missing" | "date_missing_or_unreadable" | "not_a_member";

export type MembershipResult<R> = { ok: true; event: MembershipEvent } | { ok: false; errors: R[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function invalid(practiceId: string, decidedBy: string, at: string): Array<"practice_missing" | "decider_missing" | "date_missing_or_unreadable"> {
  const errors: Array<"practice_missing" | "decider_missing" | "date_missing_or_unreadable"> = [];
  if (practiceId.trim() === "") errors.push("practice_missing");
  if (decidedBy.trim() === "") errors.push("decider_missing");
  if (!ISO_DATE.test(at)) errors.push("date_missing_or_unreadable");
  return errors;
}

/**
 * Record a practice's decision to join.
 *
 * The ONLY producer of a `joined` event, and it takes the decider as an argument rather than
 * defaulting one — every refusal is returned rather than the first, W108's rule.
 */
export function joinNetwork(
  history: readonly MembershipEvent[],
  practiceId: string,
  decidedBy: string,
  at: string,
): MembershipResult<JoinRefusal> {
  const errors: JoinRefusal[] = [...invalid(practiceId, decidedBy, at)];
  if (errors.length === 0 && isMember(history, practiceId, at)) errors.push("already_a_member");
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, event: { practiceId, basis: "joined", at, decidedBy } };
}

/** Record a practice's decision to leave. The joining stays on the record. */
export function leaveNetwork(
  history: readonly MembershipEvent[],
  practiceId: string,
  decidedBy: string,
  at: string,
): MembershipResult<LeaveRefusal> {
  const errors: LeaveRefusal[] = [...invalid(practiceId, decidedBy, at)];
  if (errors.length === 0 && !isMember(history, practiceId, at)) errors.push("not_a_member");
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, event: { practiceId, basis: "left", at, decidedBy } };
}

/**
 * Is this practice a member as at `asOf`?
 *
 * Replayed from the events rather than read off a status column — W10's rule. "Joined, left,
 * rejoined" and "joined" both end in the network, and only the replay can tell an auditor which
 * happened.
 *
 * Same-day join and leave is reported as NOT a member. Day-granular dates cannot order two
 * decisions within a day (W142's finding, W168's rule), and between "they joined" and "they
 * left" the safe reading is the one that does not publish a practice's name.
 */
export function isMember(history: readonly MembershipEvent[], practiceId: string, asOf: string): boolean {
  const mine = history.filter((e) => e.practiceId === practiceId && e.at <= asOf);
  if (mine.length === 0) return false;
  const latest = mine.map((e) => e.at).sort().at(-1)!;
  const onLatest = mine.filter((e) => e.at === latest);
  // A departure on the latest date wins over a joining on the same date. Not a guess about what
  // happened: a decision about which way to be wrong.
  return !onLatest.some((e) => e.basis === "left");
}

export interface Membership {
  practiceId: string;
  since: string;
  decidedBy: string;
}

/**
 * The current members.
 *
 * Ordered by practice id, which carries no meaning — and the copy below says so. Any other order
 * would be the network expressing a preference between its own members, which is a claim nobody
 * has asked this product to make and W83 already refused one floor down.
 */
export function currentMembers(history: readonly MembershipEvent[], asOf: string): Membership[] {
  const ids = [...new Set(history.map((e) => e.practiceId))].sort();
  const members: Membership[] = [];
  for (const practiceId of ids) {
    if (!isMember(history, practiceId, asOf)) continue;
    // Since the CURRENT spell began, not since they first ever joined. A practice that left and
    // came back has a new tenure, and reporting the original date would overstate it.
    const mine = history.filter((e) => e.practiceId === practiceId && e.at <= asOf).sort((a, b) => a.at.localeCompare(b.at));
    let start: MembershipEvent | null = null;
    for (const event of mine) start = event.basis === "joined" && start === null ? event : event.basis === "left" ? null : start;
    if (start) members.push({ practiceId, since: start.at, decidedBy: start.decidedBy });
  }
  return members;
}

/**
 * FOUNDER GATE G6 — nobody is in the network.
 *
 * Empty and pinned empty by its own test, the same posture as `SHIPPED_DIRECTORY_PROFILES`. A
 * network with members is a published network, and publishing needs the Ahpra advertising review
 * G6 names. The mechanism can exist before that review; the membership cannot.
 */
export const SHIPPED_MEMBERSHIPS: readonly MembershipEvent[] = [];

export const MEMBERSHIP_BASIS_COPY: Record<MembershipBasis, string> = {
  joined: "This practice asked to be listed. A named person at the practice made that decision on a date, and it is recorded here.",
  left: "This practice asked to be removed. The earlier decision to join is kept on the record rather than erased, because the period they were listed is a fact somebody may need to check.",
};

export const JOIN_REFUSAL_COPY: Record<JoinRefusal, string> = {
  practice_missing: "No practice was named.",
  decider_missing: "Nobody is recorded as having made this decision. A membership with no decider is an assertion with a date on it.",
  date_missing_or_unreadable: "No readable decision date.",
  already_a_member: "This practice is already listed. Joining twice is not a second decision to record; it usually means somebody could not see the first one.",
};

/**
 * What the directory may NOT use as a reason for membership.
 *
 * Data rather than a comment, so the test that scans for these reads the same list a human does,
 * and so a future unit adding one has to delete a stated refusal rather than simply add a case.
 */
export const REFUSED_BASES: Readonly<Record<string, string>> = {
  referral_activity:
    "Practices that refer to each other have not agreed to be listed together. Deriving membership from the referral rail would publish a practice's name in a network it never joined — W57's rule, in the place where the consequence is public rather than internal.",
  acceptance_rate:
    "A count of answered referrals is a performance measure, and using it as a membership basis would make the directory a ranking with a threshold instead of a list.",
  tenure:
    "How long a practice has been listed says nothing about whether they want to be listed now, and ordering by it would make the list read as seniority.",
  proximity:
    "Geography is a fact about a practice, not a decision by one. It may filter a search (W189's problem); it may not put anybody in the network.",
};
