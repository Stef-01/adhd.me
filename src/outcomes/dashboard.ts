// W173: the outcome dashboard's data, separated from the page that renders it.
//
// W170 built what an outcome IS and refused to make a failure statistic out of a records gap.
// This unit points it at the one rail in this tree that has recorded events — referrals (W93) —
// and the whole job is to carry W170's refusals into a SURFACE, because a dashboard is where
// they get lost. Three of them, each with a specific way it would have gone wrong here.
//
// THE DENOMINATOR TRAVELS WITH THE NUMBER, and there are two denominators, not one. W170's
// `basis` says how many of the chains have nothing recorded either way. That is necessary and
// not sufficient on a page: the second denominator is WHICH CHAINS ARE ON THE RAIL AT ALL. A
// referral written on paper, or in a PMS nothing has ingested from, is not a chain with an
// unknown outcome — it is not in the population. "12 referrals, 9 not recorded" invites the
// reading "we wrote 12 referrals"; the honest sentence is "12 referrals are on this rail". So
// `DASHBOARD_BASIS` states the population, and the page shows both.
//
// IT RANKS NOBODY, AND THE GUARANTEE IS STRUCTURAL RATHER THAN A DECISION NOT TO. W83 named the
// failure exactly — a capability graph broken down per clinician "turns a capability graph into
// a productivity board" — and an outcome dashboard is a far shorter step from there, because
// "referrals that went somewhere, by GP" is a table anyone would think to build and it reads as
// a performance measure of the one thing a GP has least control over: whether somebody at the
// other end wrote anything down. This module cannot build it. `ReferralEvent` carries no
// clinician, nothing here takes a clinician argument, and there is no export that groups
// anything by anyone — asserted on the export list, which is the only form of that promise a
// future edit cannot quietly drop.
//
// AND NO RATE, PERCENT OR SCORE, inherited from W170's export rule for W170's reason: a single
// figure is computed by dividing `reached` into `total`, which silently treats every unknown as
// a failure. On this rail today the unknowns are most of the population, so the one number
// everybody wants is the one number that would be most wrong.
//
// One thing this module deliberately does NOT try to answer. W170's verdict is a MAX OVER A SET
// — order-independent by construction, which is why it has no tie to break — and the price of
// that is that it cannot see a sequence. "Booked, cancelled, rebooked, completed" and "booked,
// completed" are the same set of stages reached. W93's replay is the thing that distinguishes
// them and it already exists, so `appointment_cancelled` is left out of the chain definition
// entirely rather than mapped to a stop it cannot reason about: an event kind the definition
// does not mention contributes nothing (W170), which is the honest answer here. The page says
// where to look for the sequence question instead of approximating it.

import type { ReferralEvent } from "@/referrals/leakage";
import { type ChainDefinition, type Outcome, outcomeOf } from "./model";

/**
 * The referral chain, as W170 wants it declared.
 *
 * `referral_cancelled` is the one stop: somebody recorded that this referral will not proceed.
 * `appointment_cancelled` is absent on purpose — see the module note.
 */
export const REFERRAL_CHAIN: ChainDefinition = {
  name: "Referrals",
  stages: [
    { stage: "Referral written", reachedBy: ["referral_written"], stoppedBy: ["referral_cancelled"] },
    { stage: "Appointment recorded", reachedBy: ["appointment_recorded"] },
    { stage: "Completion recorded", reachedBy: ["completion_recorded"] },
  ],
};

/** The population this dashboard reports on, said in words rather than implied by a total. */
export const DASHBOARD_BASIS =
  "These are the referrals recorded on this rail. A referral written on paper, or held in a system nothing has been ingested from, is not counted as an unknown outcome — it is not here at all. So this says what the record contains, not how many referrals the practice wrote.";

/** One verdict per referral on the rail, in referral-id order. */
export function referralChainOutcomes(events: readonly ReferralEvent[]): Outcome[] {
  // Sorted so the page is stable to look at and to diff. Ordering by id carries no meaning,
  // which is the point — any other order here would be a judgement about which referral matters.
  const ids = [...new Set(events.map((event) => event.referralId))].sort();
  const chainEvents = events.map((event) => ({
    chainId: event.referralId,
    kind: event.kind,
    at: event.at,
  }));
  return ids.map((id) => outcomeOf(id, chainEvents, REFERRAL_CHAIN));
}

/** An event kind that would settle some unsettled chains, and how many it would settle. */
export interface SettlementAsk {
  kind: string;
  chains: number;
}

/**
 * Turn the unsettled pile into a list of things somebody could go and record.
 *
 * W120's move, and the reason this page is worth having at all: `not_recorded` as a count is a
 * number an operator can only feel bad about, while "9 of these are waiting on a completion
 * letter" is an action. Counted per event kind, never per person — an ask is something the
 * RECORD is missing, and attributing it would be the productivity board by another route.
 */
export function whatWouldSettleIt(outcomes: readonly Outcome[]): SettlementAsk[] {
  const counts = new Map<string, number>();
  for (const outcome of outcomes) {
    // A kind listed twice for one chain is still one chain waiting on it.
    for (const kind of new Set(outcome.wouldSettleIt)) {
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([kind, chains]) => ({ kind, chains }))
    // Most-settling first, ties by name so the answer cannot depend on Map insertion order
    // (W167/W168). This ranks EVENT KINDS, which is a fact about the record.
    .sort((a, b) => b.chains - a.chains || a.kind.localeCompare(b.kind));
}

/** What each event kind means in the words an operator uses, so the asks read as actions. */
export const SETTLEMENT_ASK_COPY: Record<string, string> = {
  referral_written: "the referral itself recorded against the patient",
  appointment_recorded: "an appointment recorded with the service",
  completion_recorded: "a completion or letter back recorded",
  referral_cancelled: "a note that the referral will not proceed",
};

export function describeAsk(kind: string): string {
  // Named rather than defaulted: an unmapped kind says so instead of rendering a raw code as
  // though it were copy.
  return SETTLEMENT_ASK_COPY[kind] ?? `an event of kind "${kind}" recorded`;
}
