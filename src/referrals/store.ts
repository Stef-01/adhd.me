// W137: where referrals live for a running console.
//
// The rail's modules are all pure — W131 builds a document, W134 folds acts into a status,
// W135 combines two machines. A console needs somewhere to read them from, and this is that
// and nothing more.
//
// The one decision worth stating is the read model. A referral has TWO practices, and the
// obvious mistake is a single `forPractice(id)` that returns everything touching it. That
// would be correct and useless: the two sides have different jobs and different rights. The
// referring practice is chasing an outcome; the receiving practice is deciding whether to take
// somebody on. So there are two reads, and neither is a flag on the other — the same reasoning
// W113 used to keep `ownCredentials` and `practiceCredentials` apart.
//
// Cross-practice isolation is by construction: both reads filter on the practice's own field
// before anything else, so a third practice's referral is ABSENT rather than removed later.

import type { PracticeId } from "@/domain/types";
import type { AcceptanceAct } from "./acceptance";
import type { ReferralDocument } from "./document";
import type { ReferralEvent } from "./leakage";
import type { ReturnReport } from "./return-report";

interface RailState {
  documents: ReferralDocument[];
  acts: AcceptanceAct[];
  events: ReferralEvent[];
  returns: ReturnReport[];
}

const globalStore = globalThis as { __meherrReferralRail?: RailState };

function state(): RailState {
  globalStore.__meherrReferralRail ??= { documents: [], acts: [], events: [], returns: [] };
  return globalStore.__meherrReferralRail;
}

export function resetReferralRail(): void {
  globalStore.__meherrReferralRail = { documents: [], acts: [], events: [], returns: [] };
}

export function addReferralDocuments(documents: readonly ReferralDocument[]): void {
  state().documents.push(...documents);
}

export function addAcceptanceActs(acts: readonly AcceptanceAct[]): void {
  state().acts.push(...acts);
}

export function addReferralEvents(events: readonly ReferralEvent[]): void {
  state().events.push(...events);
}

export function addReturnReports(reports: readonly ReturnReport[]): void {
  state().returns.push(...reports);
}

/**
 * Every referral id this practice is party to, on either side.
 *
 * The scoping primitive the two reads below are built on: a practice is party to a referral it
 * sent or was sent, and to nothing else.
 */
function referralIdsFor(practiceId: PracticeId): Set<string> {
  return new Set(
    state()
      .documents.filter((d) => d.fromPracticeId === practiceId || d.toPracticeId === practiceId)
      .map((d) => d.referralId),
  );
}

/**
 * Acceptance acts for referrals this practice is party to.
 *
 * W140 finding: this used to be `allActs()`, returning the whole rail, with the console
 * narrowing afterwards by referral id. That was correct in the path that existed and wrong in
 * shape — the safety depended on the PROVENANCE of the referral id rather than on any check, so
 * a caller passing an id from anywhere would have resolved another practice's acceptance. The
 * narrowing now happens at the source, which is W123's rule: a filter applied later is a line
 * somebody can delete, and the deletion looks like a simplification.
 */
export function actsFor(practiceId: PracticeId): AcceptanceAct[] {
  const mine = referralIdsFor(practiceId);
  return state().acts.filter((act) => mine.has(act.referralId));
}

/** Chain events for referrals this practice is party to. Same reasoning as `actsFor`. */
export function eventsFor(practiceId: PracticeId): ReferralEvent[] {
  const mine = referralIdsFor(practiceId);
  return state().events.filter((event) => mine.has(event.referralId));
}

/**
 * Chain events for referrals this practice SENT.
 *
 * W181: `eventsFor` is scoped for TENANCY — party to either side — which is right for "may this
 * practice see it" and wrong for "did what we sent go anywhere". The outcomes console asked the
 * second question with the first query, so an inbound referral counted in the sender's totals
 * AND the receiver's, under descriptions that cannot both be true. Both practices were entitled
 * to the row; only one of them wrote it.
 *
 * A separate function rather than a flag on `eventsFor`: a boolean is one argument from the
 * wrong answer, and this is the same reasoning `sentBy`/`sentTo` were split for.
 */
export function sentEventsFor(practiceId: PracticeId): ReferralEvent[] {
  const mine = new Set(sentBy(practiceId).map((document) => document.referralId));
  return state().events.filter((event) => mine.has(event.referralId));
}

/**
 * Referrals this practice SENT.
 *
 * Filters on `fromPracticeId` as the query, not afterwards — W123's rule, and the reason
 * W91/W103 gave for preferring it: a later filter is a line somebody can delete, and the
 * deletion looks like a simplification.
 */
export function sentBy(practiceId: PracticeId): ReferralDocument[] {
  return state()
    .documents.filter((document) => document.fromPracticeId === practiceId)
    .sort((a, b) => a.referralId.localeCompare(b.referralId));
}

/** Referrals sent TO this practice. A separate read, because it answers a different job. */
export function sentTo(practiceId: PracticeId): ReferralDocument[] {
  return state()
    .documents.filter((document) => document.toPracticeId === practiceId)
    .sort((a, b) => a.referralId.localeCompare(b.referralId));
}

/**
 * Remove a patient from every referral record on both sides.
 *
 * W137 declared this store as holding patient identity, and W106's registry test refuses that
 * declaration unless erasure actually reaches it — which is W51's original finding working as
 * intended rather than a formality.
 *
 * The referral ROWS are dropped rather than scrubbed, and that is the difference from the
 * booking rail: an appointment loses its patient link so the slot history survives, but a
 * referral with no patient is not a record of anything — it is a note that a practice once
 * asked another practice about somebody. Its acceptance acts and chain events go with it,
 * because a chain about a deleted referral is a dangling obligation nobody can act on.
 *
 * Returns what it removed, so the deletion record can say so rather than claiming completeness.
 */
export function scrubPatientFromReferrals(patientId: string): {
  documents: number;
  acts: number;
  events: number;
  returns: number;
} {
  const rail = state();
  const mine = new Set(
    rail.documents.filter((d) => d.patientId === patientId).map((d) => d.referralId),
  );
  for (const act of rail.acts) {
    if (act.kind === "sent" && act.patientId === patientId) mine.add(act.referralId);
  }
  for (const event of rail.events) {
    if (event.patientId === patientId) mine.add(event.referralId);
  }
  for (const report of rail.returns) {
    if (report.patientId === patientId) mine.add(report.referralId);
  }

  const removed = {
    documents: rail.documents.filter((d) => mine.has(d.referralId)).length,
    acts: rail.acts.filter((a) => mine.has(a.referralId)).length,
    events: rail.events.filter((e) => mine.has(e.referralId)).length,
    returns: rail.returns.filter((r) => mine.has(r.referralId)).length,
  };
  rail.documents = rail.documents.filter((d) => !mine.has(d.referralId));
  rail.acts = rail.acts.filter((a) => !mine.has(a.referralId));
  rail.events = rail.events.filter((e) => !mine.has(e.referralId));
  rail.returns = rail.returns.filter((r) => !mine.has(r.referralId));
  return removed;
}

export type ReturnLookup =
  | { found: false }
  | { found: true; report: ReturnReport }
  /**
   * Two DIFFERENT return reports share the latest date, so which is current is unknowable
   * from the data. Reported rather than guessed, for W111's reason: picking one attaches the
   * wrong clinical communication to a patient, and a superseded return report shown as
   * current is worse than showing none.
   */
  | { found: false; ambiguous: true; count: number };

/**
 * The current return report for one referral.
 *
 * W142 finding: this used `.find()`, which takes the FIRST match in array order. A corrected
 * report filed later was therefore shown or hidden depending on how the two happened to be
 * stored — and a return report is a clinical communication, so showing a superseded one is a
 * live wrong answer rather than an untidy one.
 *
 * Now the latest by `reportedAt` wins, and a same-date disagreement is reported as ambiguous
 * instead of resolved by position.
 */
export function returnFor(referralId: string): ReturnLookup {
  const mine = state()
    .returns.filter((report) => report.referralId === referralId)
    .sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
  const latest = mine.at(-1);
  if (!latest) return { found: false };

  const sameDate = mine.filter((report) => report.reportedAt === latest.reportedAt);
  const distinct = new Set(sameDate.map((report) => JSON.stringify(report)));
  if (distinct.size > 1) return { found: false, ambiguous: true, count: distinct.size };
  return { found: true, report: latest };
}
