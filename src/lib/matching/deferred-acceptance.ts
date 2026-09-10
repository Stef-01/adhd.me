// Stage two, second half: deferred acceptance, the many-to-many hospitals/residents form.
//
// `src/matching/match.ts` named this as the successor to its greedy the day slots stopped being
// interchangeable, and gave the reason: deferred acceptance is stable (no patient and GP who
// would both rather be together than where they ended up) and strategyproof for the proposing
// side, which is the patient here. That matters the moment a GP-facing preference screen exists:
// with a first-come queue, under-declaring capacity becomes the winning move; with proposals,
// telling the truth is.
//
// THE SHAPE. Patients propose, in their own preference order, until they hold their quota (three:
// the brief presents a top three rather than a single forced match) or run out of acceptable GPs.
// A GP holds up to their declared capacity, keeps the best by their own ranking, and lets the
// rest go, which frees those patients to propose further down their list. Each side's ranking is
// a plain list of ids; a GP who has not listed a patient finds them unacceptable and never holds
// them. The loop ends when nobody with free quota has anyone left to propose to.
//
// Deterministic and order-independent: proposers are processed in id order each round and the
// result is a function of the two preference sets, never of the arrays' arrival order (W214's
// law, asserted in the test). Every proposal, hold and release is logged so a reviewer can read
// why any pair ended up where it did, which is what W213's floor asks of a mechanism.

export interface Proposer {
  id: string;
  /** Receiver ids in preference order. Only these are ever proposed to. */
  preferences: readonly string[];
  /** How many receivers this proposer may hold at once. */
  quota: number;
}

export interface Receiver {
  id: string;
  /** Acceptable proposer ids in preference order. A proposer absent here is refused. */
  preferences: readonly string[];
  capacity: number;
}

export type ProposalEvent =
  | { kind: "proposed"; round: number; proposer: string; receiver: string }
  | { kind: "held"; round: number; proposer: string; receiver: string }
  | { kind: "refused"; round: number; proposer: string; receiver: string; because: "unacceptable" | "full_and_preferred_others" }
  | { kind: "released"; round: number; proposer: string; receiver: string; displacedBy: string };

export interface DeferredAcceptanceResult {
  /** Receivers each proposer holds at the end, in the proposer's own preference order. */
  held: ReadonlyMap<string, readonly string[]>;
  /** Proposers each receiver holds at the end, in the receiver's own preference order. */
  holding: ReadonlyMap<string, readonly string[]>;
  rounds: number;
  proposals: number;
  log: readonly ProposalEvent[];
}

export function deferredAcceptance(proposers: readonly Proposer[], receivers: readonly Receiver[]): DeferredAcceptanceResult {
  const ps = [...proposers].sort((a, b) => a.id.localeCompare(b.id));
  const receiverById = new Map(receivers.map((r) => [r.id, r]));
  const rankAt = new Map<string, Map<string, number>>();
  for (const r of receivers) rankAt.set(r.id, new Map(r.preferences.map((p, i) => [p, i])));

  const held = new Map<string, Set<string>>(ps.map((p) => [p.id, new Set<string>()]));
  const holding = new Map<string, string[]>(receivers.map((r) => [r.id, []]));
  const nextIndex = new Map<string, number>(ps.map((p) => [p.id, 0]));
  const log: ProposalEvent[] = [];
  let round = 0;
  let proposals = 0;

  const wantsToPropose = (p: Proposer) =>
    held.get(p.id)!.size < Math.max(0, p.quota) && (nextIndex.get(p.id) ?? 0) < p.preferences.length;

  while (ps.some(wantsToPropose)) {
    round += 1;
    for (const p of ps) {
      if (!wantsToPropose(p)) continue;
      const index = nextIndex.get(p.id)!;
      nextIndex.set(p.id, index + 1);
      const receiverId = p.preferences[index]!;
      const receiver = receiverById.get(receiverId);
      proposals += 1;
      log.push({ kind: "proposed", round, proposer: p.id, receiver: receiverId });
      const rank = receiver ? rankAt.get(receiverId)!.get(p.id) : undefined;
      if (!receiver || rank === undefined || receiver.capacity <= 0) {
        log.push({ kind: "refused", round, proposer: p.id, receiver: receiverId, because: "unacceptable" });
        continue;
      }
      const current = holding.get(receiverId)!;
      if (current.length < receiver.capacity) {
        current.push(p.id);
        current.sort((a, b) => rankAt.get(receiverId)!.get(a)! - rankAt.get(receiverId)!.get(b)!);
        held.get(p.id)!.add(receiverId);
        log.push({ kind: "held", round, proposer: p.id, receiver: receiverId });
        continue;
      }
      const worst = current[current.length - 1]!;
      const worstRank = rankAt.get(receiverId)!.get(worst)!;
      if (rank < worstRank) {
        current.pop();
        held.get(worst)!.delete(receiverId);
        log.push({ kind: "released", round, proposer: worst, receiver: receiverId, displacedBy: p.id });
        current.push(p.id);
        current.sort((a, b) => rankAt.get(receiverId)!.get(a)! - rankAt.get(receiverId)!.get(b)!);
        held.get(p.id)!.add(receiverId);
        log.push({ kind: "held", round, proposer: p.id, receiver: receiverId });
      } else {
        log.push({ kind: "refused", round, proposer: p.id, receiver: receiverId, because: "full_and_preferred_others" });
      }
    }
  }

  const heldOrdered = new Map<string, readonly string[]>();
  for (const p of ps) {
    const set = held.get(p.id)!;
    heldOrdered.set(p.id, p.preferences.filter((r) => set.has(r)));
  }
  const holdingOrdered = new Map<string, readonly string[]>();
  for (const id of [...holding.keys()].sort()) holdingOrdered.set(id, holding.get(id)!);
  return { held: heldOrdered, holding: holdingOrdered, rounds: round, proposals, log };
}

/**
 * Pairs that would both rather be together than where the result left them. Empty for a stable
 * result; this is the property the test holds, and it is exported so a reviewer can run it on
 * any result rather than trust the algorithm's name.
 */
export function blockingPairs(
  result: DeferredAcceptanceResult,
  proposers: readonly Proposer[],
  receivers: readonly Receiver[],
): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const receiverById = new Map(receivers.map((r) => [r.id, r]));
  for (const p of proposers) {
    if (p.quota <= 0) continue;
    const mine = result.held.get(p.id) ?? [];
    const myRank = new Map(p.preferences.map((r, i) => [r, i]));
    const worstHeld = mine.length > 0 ? Math.max(...mine.map((r) => myRank.get(r)!)) : -1;
    for (const receiverId of p.preferences) {
      if (mine.includes(receiverId)) continue;
      const receiver = receiverById.get(receiverId);
      if (!receiver || receiver.capacity <= 0) continue;
      const rRank = receiver.preferences.indexOf(p.id);
      if (rRank < 0) continue;
      // p would take r: a free place in the quota, or r ranks above something p holds.
      const pPrefers = mine.length < p.quota || myRank.get(receiverId)! < worstHeld;
      const theirs = result.holding.get(receiverId) ?? [];
      const theirWorst = theirs.length > 0 ? Math.max(...theirs.map((x) => receiver.preferences.indexOf(x))) : -1;
      const rPrefers = theirs.length < receiver.capacity || rRank < theirWorst;
      if (pPrefers && rPrefers) pairs.push([p.id, receiverId]);
    }
  }
  return pairs;
}
