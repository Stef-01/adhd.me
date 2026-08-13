// W73: escalation triggers as data.
//
// W68 decides who must not be SENT to. This decides what happens when something has already
// happened — a patient replies with free text, a complaint is logged, generated bookings keep
// being missed. Those are moments where an automated loop must hand back to a human.
//
// The rule the whole module exists to enforce: an escalation routes A PERSON TO THEIR USUAL
// GP and states A FACT ABOUT WHAT HAPPENED. It never says what might be wrong, how urgent it
// is, or what should be done. That is the difference between "Priya replied to an appointment
// message with free text — her usual GP should read it" and a triage system, and only the
// first one is inside the TGA boundary this product keeps (founder gate G7).
//
// So the escalation record has no field for advice, severity or suspected cause — those are
// not values that can be written down here. What CAN be written is the observation, and it is
// linted: `lintEscalationText` rejects the same clinical, urgency and diagnosis vocabulary W6
// bans from patient messages. Staff-facing text gets that scrutiny because an escalation note
// is read by a human under time pressure and is the most tempting place to editorialise.
//
// Triggers are DATA, like W68's rules, so adding one is reviewable as a list rather than a
// code change. Unlike W68's rules the shipped set is NOT empty: routing a human conversation
// to a human is not clinical authorship, so it needs no G5 sign-off. Nothing in a trigger
// asserts a clinical fact — each names an observable event and where to route it.

import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";

/** Observable events, none of which is a clinical finding. */
export type EscalationEvent =
  | "patient_replied_free_text"
  | "complaint_logged"
  | "repeated_generated_dna"
  | "opt_out_with_message";

/** The only destination. There is deliberately no second value. */
export type EscalationRoute = "usual_gp";

export interface EscalationTrigger {
  id: string;
  event: EscalationEvent;
  /** null when the trigger applies regardless of register. */
  conditionCode: ConditionCode | null;
  route: EscalationRoute;
  /** Staff-facing statement of what happened. Linted; never advice. */
  observation: string;
  /** Why this event warrants a human. Reviewable as a list. */
  rationale: string;
}

/**
 * The shipped triggers.
 *
 * Each observation states an event and nothing else. Read them as a set: if any one of them
 * could be mistaken for clinical advice, the linter below should be rejecting it.
 */
export const SHIPPED_TRIGGERS: readonly EscalationTrigger[] = [
  {
    id: "free-text-reply",
    event: "patient_replied_free_text",
    conditionCode: null,
    route: "usual_gp",
    observation: "This patient replied to an appointment message with their own words.",
    rationale:
      "An automated loop cannot read free text. Anything a patient took the trouble to write " +
      "belongs with the person who knows them.",
  },
  {
    id: "complaint",
    event: "complaint_logged",
    conditionCode: null,
    route: "usual_gp",
    observation: "A complaint was logged about contact from the practice.",
    rationale:
      "W43 handles the complaint workflow; this makes sure the patient's own GP is told rather " +
      "than the matter staying inside operations.",
  },
  {
    id: "repeated-dna",
    event: "repeated_generated_dna",
    conditionCode: null,
    route: "usual_gp",
    observation:
      "Appointments booked from these messages have not been attended more than once.",
    rationale:
      "Repeatedly booking and not attending is a signal that messaging is not working for this " +
      "person. Continuing to message is the wrong response; a conversation is.",
  },
  {
    id: "opt-out-with-message",
    event: "opt_out_with_message",
    conditionCode: null,
    route: "usual_gp",
    observation: "This patient opted out and included a message.",
    rationale:
      "The opt-out is honoured immediately and permanently either way. The message still needs " +
      "a human to read it.",
  },
];

export interface Escalation {
  practiceId: PracticeId;
  patientId: PatientId;
  triggerId: string;
  event: EscalationEvent;
  route: EscalationRoute;
  observation: string;
  at: string;
}

export interface EscalationInput {
  practiceId: PracticeId;
  patientId: PatientId;
  event: EscalationEvent;
  conditionCode?: ConditionCode | null;
  at: string;
}

export interface LintFinding {
  rule: string;
  match: string;
}

/**
 * The same clinical, urgency and diagnosis vocabulary W6 bans from patient messages, applied
 * to staff-facing escalation text.
 *
 * Kept as its own list rather than imported from templates.ts because the two serve different
 * readers and will diverge: a staff note may legitimately say "appointment" or "practice" in
 * ways a patient SMS may not, while the clinical-advice half must hold in both. Divergence is
 * the point; a shared list would eventually be loosened for one reader and silently loosen the
 * other.
 */
const ADVICE_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  { rule: "no-diagnosis", pattern: /\bdiagnos\w*|\blikely (has|have)\b|\bsuspect\w*\b|\bprobabl[ey]\b/i },
  { rule: "no-clinical-advice", pattern: /\bshould (be seen|start|stop|take|have)\b|\brecommend\w*\b|\badvise[ds]?\b|\bprescrib\w*\b/i },
  { rule: "no-urgency", pattern: /\burgent\w*\b|\bimmediately\b|\bas soon as possible\b|\basap\b|\bemergency\b/i },
  { rule: "no-severity-grading", pattern: /\bsevere\w*\b|\bmild\b|\bmoderate\b|\bhigh[- ]risk\b|\bat risk\b|\bdeteriorat\w*\b/i },
  { rule: "no-condition-assertion", pattern: /\bhas (diabetes|ckd|kidney disease|heart failure)\b|\buncontrolled\b|\bunstable\b/i },
  { rule: "no-triage-language", pattern: /\btriage\w*\b|\bpriorit(y|ise|ize)\b|\bescalate clinically\b/i },
];

export function lintEscalationText(text: string): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const { rule, pattern } of ADVICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) findings.push({ rule, match: match[0] });
  }
  return findings;
}

/** Every shipped trigger must survive its own linter. Called by the test, and cheap to call. */
export function lintTriggers(
  triggers: readonly EscalationTrigger[] = SHIPPED_TRIGGERS,
): Array<{ triggerId: string; findings: LintFinding[] }> {
  return triggers
    .map((t) => ({ triggerId: t.id, findings: lintEscalationText(t.observation) }))
    .filter((r) => r.findings.length > 0);
}

/**
 * Turn observed events into escalations.
 *
 * Fail-closed on text: a trigger whose observation does not pass the linter is DROPPED rather
 * than emitted, so a badly-worded trigger cannot put clinical advice in front of staff. The
 * drop is returned so it cannot pass unnoticed.
 */
export function escalate(
  inputs: readonly EscalationInput[],
  triggers: readonly EscalationTrigger[] = SHIPPED_TRIGGERS,
): { escalations: Escalation[]; rejectedTriggers: string[] } {
  const rejectedTriggers = lintTriggers(triggers).map((r) => r.triggerId);
  const usable = triggers.filter((t) => !rejectedTriggers.includes(t.id));

  const escalations: Escalation[] = [];
  for (const input of inputs) {
    for (const trigger of usable) {
      if (trigger.event !== input.event) continue;
      if (
        trigger.conditionCode !== null &&
        trigger.conditionCode !== (input.conditionCode ?? null)
      ) {
        continue;
      }
      escalations.push({
        practiceId: input.practiceId,
        patientId: input.patientId,
        triggerId: trigger.id,
        event: trigger.event,
        route: trigger.route,
        observation: trigger.observation,
        at: input.at,
      });
    }
  }

  return { escalations, rejectedTriggers };
}
