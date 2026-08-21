// W231: the forecast → invitation-volume coupling, shipped OFF.
//
// This is where Q18 would reach into the live rail. W223 says between four and six of six slots
// will fill; the coupling says send more invitations to cover the gap. It is the obvious next step
// and it is the first thing in this lane that would change WHO GETS CONTACTED.
//
// SHIPPING IT OFF IS THE UNIT RATHER THAN A CAVEAT ON IT, for three reasons, and the third is the
// one a reader would miss.
//
// (1) NOTHING HAS EVER BEEN SENT. G1, G2 and G3 are all unresolved and W174 is still blocked, so a
// coupling that ran would be driving a rail that does not exist.
//
// (2) VOLUME IS THE PRACTICE'S DECISION ABOUT ITS OWN CAPACITY. W225 refused to choose how many
// slots to open because this product does not know a practice's staffing, costs or appetite;
// choosing how many PEOPLE to contact is the same refusal one step further along, and the step
// where being wrong reaches patients rather than a diary.
//
// (3) MATCH-1 IS LIVE IN THIS NEIGHBOURHOOD, and this is the reason worth stating out loud.
// `rankCandidates` in src/engine/pool.ts has ordered the invitation pool by `chronicCare` since
// W5, which contradicts the published ADM notice's "no ordering of patients by need", and the
// contradiction is unresolved. Volume is not ordering — but a coupling that raises volume raises
// whatever the ordering is doing, and more people go through the contradiction. Noting that the
// two are technically separate concerns would be true and useless.
//
// THE DISABLED STATE HAS TO BE UNFAKEABLE, WHICH MEANS NO DEFAULT ANYWHERE. A boolean defaulting
// to false is one edit from defaulting to true, and the edit looks like configuration. So enabling
// takes a recorded decision VALUE — who decided, when, and a reason long enough to be an argument
// — and `couplingState` has no other way in. A control that cannot be switched on by passing
// `true` is a control nobody switches on by accident.
//
// AND THE ARITHMETIC IS HERE, DISABLED, RATHER THAN ABSENT. `invitationsToCover` is pure and
// callable, so the shape of the decision is reviewable now instead of being invented under
// deadline the day a gate opens — the posture W147's adapter and W56's loader both take. What it
// cannot do is reach the rail: nothing in `src/engine/` imports this module, and the test checks
// that rather than trusting it.

import type { FilledRange } from "./forecast";

/**
 * A practice's recorded decision to switch the coupling on.
 *
 * Every field required, and the reason has a length floor: "yes" is a click, not a decision, and
 * the point of recording one is that somebody can later read why it was taken.
 */
export interface CouplingDecision {
  /** Who at the practice decided. A role or a name — this module does not care which. */
  decidedBy: string;
  decidedOnIso: string;
  /** Why. Long enough to be an argument rather than an acknowledgement. */
  reason: string;
}

export type CouplingState =
  | { enabled: false; why: string }
  | { enabled: true; decision: CouplingDecision };

export const COUPLING_OFF_COPY =
  "Sending more invitations when a session looks like it will run under-full is switched off. How many people to contact is a decision about this practice's own capacity and staffing, which is not something this product knows — and no message has ever been sent from here, so there is nothing for it to turn up or down.";

/**
 * Why an attempt to switch the coupling on was refused.
 *
 * DECLARED AS A UNION rather than left as `keyof typeof`, which is how every other refusal in this
 * lane is written (W215, W219, W223, W228) and which this module was the odd one out on. W201's
 * detector finds decision sites by looking for exactly this shape, so the inconsistency also made
 * the register's both-directions check report a module it could not see as a stale declaration —
 * the register was right and the module was inconsistent.
 */
export type CouplingRefusal = "no_decision" | "reason_too_thin" | "date_unreadable";

export const COUPLING_REJECTION_COPY: Record<CouplingRefusal, string> = {
  no_decision:
    "The coupling can only be switched on by recording who decided it and why. There is no setting that turns it on without that, because a setting is something somebody flips and a decision is something somebody can be asked about later.",
  reason_too_thin:
    "The recorded reason is too short to be a reason. Switching this on changes how many people are contacted, and the record of that choice has to say something a reader could disagree with.",
  date_unreadable: "The decision needs a readable date, so the record says when it was taken.",
};

/** The shipped state. OFF, and pinned off by this module's own test. */
export const SHIPPED_COUPLING: CouplingState = {
  enabled: false,
  why: COUPLING_OFF_COPY,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_REASON = 60;

/**
 * The only way to a state with `enabled: true`.
 *
 * Takes a decision or nothing; there is no boolean parameter and no default. Refuses with a reason
 * rather than returning a disabled state silently, because a refusal that looks like "off" is
 * indistinguishable from the shipped state and somebody would spend an afternoon on it.
 */
export function couplingState(
  decision: CouplingDecision | null,
): CouplingState | { enabled: false; refused: CouplingRefusal; why: string } {
  if (decision === null) {
    return { enabled: false, refused: "no_decision", why: COUPLING_REJECTION_COPY.no_decision };
  }
  if (!ISO_DATE.test(decision.decidedOnIso)) {
    return { enabled: false, refused: "date_unreadable", why: COUPLING_REJECTION_COPY.date_unreadable };
  }
  if (decision.decidedBy.trim().length === 0 || decision.reason.trim().length < MIN_REASON) {
    return { enabled: false, refused: "reason_too_thin", why: COUPLING_REJECTION_COPY.reason_too_thin };
  }
  return { enabled: true, decision };
}

/**
 * How many extra invitations the forecast's LOW end would leave unfilled.
 *
 * The low end on purpose: sizing from the high end assumes the good week and over-contacts on the
 * bad one, and over-contacting is the error that reaches people. Pure, callable, and reaching
 * nothing — it takes two numbers and returns one, so there is no rail for it to drive.
 *
 * Returns null when the forecast already covers the slots, which is not zero: zero would read as
 * "send none of the invitations you were going to send".
 */
export function invitationsToCover(range: FilledRange, slotsOpen: number): number | null {
  if (!Number.isInteger(slotsOpen) || slotsOpen <= 0) return null;
  const shortfall = slotsOpen - range.low;
  return shortfall > 0 ? shortfall : null;
}

/**
 * What the coupling would do, given a state — and, while it is off, nothing.
 *
 * The state is an argument rather than a module-level read, so a caller cannot end up enabled by
 * importing a different constant. With `SHIPPED_COUPLING` this returns null for every input, which
 * is what the test asserts over a whole simulated practice.
 */
export function extraInvitations(
  state: CouplingState,
  range: FilledRange,
  slotsOpen: number,
): number | null {
  if (!state.enabled) return null;
  return invitationsToCover(range, slotsOpen);
}
