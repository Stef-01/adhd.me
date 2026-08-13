// W95: leakage outreach — availability-only nudges within the same compliance rails.
//
// The obvious reading of this unit is "write a template about the referral". It deliberately
// is not that. THIS MODULE WRITES NO COPY AT ALL. The message it plans is W6's ordinary
// availability invitation, byte for byte. The referral is the practice's REASON for putting a
// patient on the list; it is never the message's CONTENT. Three arguments, each of which on
// its own would be enough:
//
//   1. AN SMS IS READ BY WHOEVER HOLDS THE PHONE. "About your cardiology referral" tells a
//      partner, a parent, or the person next to them on the bus that this patient is under
//      investigation. W92 keeps the specialty an opaque code precisely so it never reaches a
//      surface, and a text message is the surface furthest outside the practice's control.
//   2. THE RECORD CANNOT SUPPORT THE SENTENCE. W92 and W93 refuse to distinguish "the letter
//      never arrived" from "the appointment was never made". A nudge saying "you haven't been"
//      asserts that guess to the one person who knows it is wrong — the worst possible
//      audience for a guess.
//   3. IT WOULD FAIL THE LINTER, AND RIGHTLY. "Follow up on your referral" trips
//      no-overdue-framing; "your specialist appointment" trips no-benefit-claims. Rather than
//      write copy that threads that needle, there is no new copy: the planner calls W6's
//      `renderCompliant`, so a nudge passes the same gate as every other message because it IS
//      the same message. The test that matters asserts byte-identity with the plain
//      invitation — anyone who later appends "(about your referral)" breaks it.
//
// What the nudge is FOR, then: getting the patient back in front of their own GP, who has the
// referral in front of them. The clinical conversation happens in the room, not in an SMS
// (G7). The input type is `LeakageSummary` rather than `Referral[]` for the same reason — the
// module is handed the shape that carries no specialty, so there is nothing here to leak.
//
// Two consequences of the condition-free message, both of which cost us sends:
//
//   * W71's recall dedup CANNOT compare condition codes here, because the nudge carries no
//     condition to compare. So ANY open recall for that patient suppresses it. The fail-safe
//     direction is silence, and in this unit it is forced rather than chosen.
//   * A patient who has already told the practice why (W94) is not texted. Answering a person
//     who explained themselves with an automated availability message is answering them with
//     a form letter. Those cases go to the practice as a conversation to have.
//
// And one stage is deliberately never nudged: `attended_no_completion` means an appointment is
// recorded and nothing came back. That is a correspondence gap between the service and the
// practice — texting the patient asks them to chase the practice's admin. W93 built the stage
// distinction so the two stopping points could get different responses; this is that.

import type { PatientId, PracticeId } from "@/domain/types";
import {
  type ContactPreferences,
  type ContactRefusal,
  planContact,
} from "@/messaging/preferences";
import { type MessageContext, renderCompliant } from "@/messaging/templates";
import type { PracticeRecall } from "@/registers/recalls";
import type { BarrierRecord } from "./barriers";
import type { LeakageStage, LeakageSummary } from "./leakage";

/** Stages a PATIENT can actually act on. The rest are not theirs to fix. */
const ACTIONABLE: ReadonlySet<LeakageStage> = new Set([
  "written_no_appointment",
  "appointment_lost",
]);

/** Refusals this module decides. W74's three are unioned in below, not restated. */
type OutreachRefusal =
  /**
   * W136: a return report closed this chain. Checked FIRST and given its own reason, because
   * a completed referral otherwise fell out as `stage_not_actionable` — true, and misleading:
   * it filed a GOOD OUTCOME under the same reason as a chain that is stuck in a way the patient
   * cannot fix. A practice reading the withheld counts could not tell success from a gap.
   */
  | "loop_closed_by_return"
  | "stage_not_actionable"
  | "service_side_gap"
  | "barrier_already_recorded"
  | "recall_already_running"
  | "already_nudged"
  | "contact_cap_reached"
  | "no_recipient_on_file";

/**
 * Every reason a nudge is not sent. W74's contact refusals are unioned rather than copied, so
 * a new refusal there is a compile error here instead of a silently unhandled case.
 */
export type NudgeRefusal = OutreachRefusal | ContactRefusal;

export interface NudgeRecipient {
  /** Carried and checked, not trusted from the caller (W91). */
  practiceId: PracticeId;
  patientId: PatientId;
  firstName: string;
  /** The patient's own GP. Routing away from them is W84's decision, not this module's. */
  usualClinicianDisplayName: string;
  bookingUrl: string;
  preferences: ContactPreferences;
  /** Invitations already sent to this patient in the trailing window (W16's cap). */
  invitesInWindow: number;
}

export interface OutreachInput {
  practiceId: PracticeId;
  practiceName: string;
  /** Availability the practice is actually offering. Availability language only. */
  sessionWindow: string;
  leakage: LeakageSummary;
  barriers: readonly BarrierRecord[];
  recalls: readonly PracticeRecall[];
  recipients: readonly NudgeRecipient[];
  /** Referrals already nudged once. One nudge per referral, ever. */
  nudgedReferralIds?: readonly string[];
  /**
   * W136: referrals a return report has closed (W132).
   *
   * Supplied directly rather than read only from the derived stage, and the difference matters:
   * `completed` is derived from a `completion_recorded` event, so a return report that has been
   * written but whose event has not been folded in yet would leave the chain looking open — and
   * the patient would be chased about something that is finished. Closure is checked against
   * both, so whichever arrives first stops the nudge.
   */
  closedReferralIds?: readonly string[];
  now: Date;
  offerExpiresAt: Date;
  maxInvitesInWindow: number;
}

export interface PlannedNudge {
  referralId: string;
  patientId: PatientId;
  sendAt: string;
  deferred: boolean;
  /** W6's availability invitation, unmodified. Nothing in this module adds to it. */
  text: string;
}

export interface WithheldNudge {
  referralId: string;
  patientId: PatientId;
  reason: NudgeRefusal;
}

export interface OutreachPlan {
  practiceId: PracticeId;
  send: PlannedNudge[];
  /** Nothing disappears silently — every referral considered ends up in one list or the other. */
  withheld: WithheldNudge[];
}

/**
 * Build the message context.
 *
 * Takes the input and the recipient and NOTHING referral-shaped, so there is no parameter here
 * a specialty could arrive through. The guarantee is the argument list.
 */
function contextFor(input: OutreachInput, recipient: NudgeRecipient): MessageContext {
  return {
    patientFirstName: recipient.firstName,
    clinicianDisplayName: recipient.usualClinicianDisplayName,
    practiceName: input.practiceName,
    sessionWindow: input.sessionWindow,
    bookingUrl: recipient.bookingUrl,
  };
}

/**
 * Decide who may be nudged about a session with room, given what the referral records show.
 *
 * A non-compliant `sessionWindow` throws (via `renderCompliant`) rather than withholding
 * per-patient: bad wording supplied by the practice is one configuration error affecting every
 * message in the batch, not a fact about any recipient, and a plan that quietly withheld all of
 * them would read as "nobody was eligible".
 */
export function planOutreach(input: OutreachInput): OutreachPlan {
  const recipients = new Map(
    input.recipients
      .filter((r) => r.practiceId === input.practiceId)
      .map((r) => [r.patientId, r] as const),
  );
  const barriered = new Set(
    input.barriers.filter((b) => b.practiceId === input.practiceId).map((b) => b.referralId),
  );
  const recalled = new Set(
    input.recalls
      .filter((r) => r.practiceId === input.practiceId && r.status === "open")
      .map((r) => r.patientId),
  );
  const nudged = new Set(input.nudgedReferralIds ?? []);
  const closed = new Set(input.closedReferralIds ?? []);

  const send: PlannedNudge[] = [];
  const withheld: WithheldNudge[] = [];

  // Referral-record order. Stable, and carries no priority — ordering a list of patients by
  // anything derived from their referrals is the ranking W96 refuses, by another route.
  const timelines = input.leakage.timelines
    .filter((t) => t.practiceId === input.practiceId)
    .slice()
    .sort((a, b) => a.referralId.localeCompare(b.referralId));

  for (const timeline of timelines) {
    const hold = (reason: NudgeRefusal) =>
      withheld.push({ referralId: timeline.referralId, patientId: timeline.patientId, reason });

    // W136: checked before everything, so the reason a practice sees IS the completion. A
    // closed loop is not a leak, not a gap and not an unactionable stage — it is the outcome
    // the whole rail exists to produce, and it should read that way in the counts.
    if (closed.has(timeline.referralId) || timeline.stage === "completed") {
      hold("loop_closed_by_return");
      continue;
    }
    // Checked before the general stage test: this stage IS leaked, and the practice's next
    // step is a different one, so it earns its own reason rather than "not actionable".
    if (timeline.stage === "attended_no_completion") {
      hold("service_side_gap");
      continue;
    }
    if (!ACTIONABLE.has(timeline.stage)) {
      hold("stage_not_actionable");
      continue;
    }
    if (nudged.has(timeline.referralId)) {
      hold("already_nudged");
      continue;
    }
    if (barriered.has(timeline.referralId)) {
      hold("barrier_already_recorded");
      continue;
    }
    if (recalled.has(timeline.patientId)) {
      hold("recall_already_running");
      continue;
    }

    const recipient = recipients.get(timeline.patientId);
    if (!recipient) {
      hold("no_recipient_on_file");
      continue;
    }
    if (recipient.invitesInWindow >= input.maxInvitesInWindow) {
      hold("contact_cap_reached");
      continue;
    }

    const contact = planContact(recipient.preferences, input.now, input.offerExpiresAt);
    if (!contact.send) {
      hold(contact.reason);
      continue;
    }

    send.push({
      referralId: timeline.referralId,
      patientId: timeline.patientId,
      sendAt: contact.at,
      deferred: contact.deferred,
      text: renderCompliant(contextFor(input, recipient)),
    });
  }

  return { practiceId: input.practiceId, send, withheld };
}

/**
 * Practice-facing reasons.
 *
 * Each says what the practice should do INSTEAD, because "withheld" on its own is a dead end —
 * the whole value of separating the reasons is that they need different responses.
 */
export const NUDGE_REFUSAL_COPY: Record<NudgeRefusal, string> = {
  loop_closed_by_return:
    "A return report came back, so this referral is finished. Nothing is outstanding and the patient is not being chased.",
  stage_not_actionable:
    "Nothing to send — this referral is completed, was withdrawn, or has no record to act on.",
  service_side_gap:
    "An appointment is recorded and nothing has come back. That is worth chasing with the service, not with the patient.",
  barrier_already_recorded:
    "Someone has already told the practice why this did not go ahead. That deserves a conversation, not an automated text.",
  recall_already_running:
    "The practice already has an open recall for this patient. Meherr does not write on top of one.",
  already_nudged:
    "This referral has already been included in one invitation. It is not sent again.",
  contact_cap_reached:
    "This patient has had as many invitations as the practice allows in the current window.",
  no_recipient_on_file:
    "No contact details are on file for this patient, so there is nothing to send to.",
  no_channel_chosen:
    "This patient has not agreed to be contacted on any channel the practice can send on.",
  channel_unsupported:
    "This patient's chosen channel is not one we can send on, and we never substitute another.",
  offer_expires_before_window:
    "The session would be gone before this patient's contact hours reopen. A text about an appointment already taken is worse than none.",
};

const REFUSAL_ZEROES: Record<NudgeRefusal, number> = {
  loop_closed_by_return: 0,
  stage_not_actionable: 0,
  service_side_gap: 0,
  barrier_already_recorded: 0,
  recall_already_running: 0,
  already_nudged: 0,
  contact_cap_reached: 0,
  no_recipient_on_file: 0,
  no_channel_chosen: 0,
  channel_unsupported: 0,
  offer_expires_before_window: 0,
};

/** Withheld tallies for the console, every reason present so zero is visible as zero. */
export function withheldCounts(plan: OutreachPlan): Record<NudgeRefusal, number> {
  const counts = { ...REFUSAL_ZEROES };
  for (const item of plan.withheld) counts[item.reason] += 1;
  return counts;
}
