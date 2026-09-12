// Safety rules (PRD §49–§50): what a reflection may say that has to interrupt the ordinary
// experience, and what the app does then.
//
// THE RULES ARE DATA AND EVERY ONE HAS A TEST. A reflection is the only free text the app reads,
// and it is read for these triggers at the moment it is written (`store.ts`). A hit records a
// safety event; while one stands, every ordinary recommendation is suppressed, nothing gamified
// renders, and the person sees the safety screen with the route to a human. The app never decides
// a crisis disposition — the message says who to contact, and that is the whole of what it does.
//
// Jurisdiction: Australia. The numbers are the national services; nothing here is a clinical
// judgement about the person, and the copy says so.

export type SafetyRuleId =
  | "self-harm"
  | "hopelessness"
  | "psychosis"
  | "mania"
  | "eating"
  | "substance"
  | "violence"
  | "cardiac"
  | "danger";

export type Severity = "emergency" | "urgent-support" | "support";

export interface SafetyRule {
  readonly id: SafetyRuleId;
  readonly trigger: RegExp;
  readonly severity: Severity;
  /** What the person reads, in plain words, with no diagnosis in it. */
  readonly message: string;
  readonly recommendedAction: string;
  readonly jurisdiction: "AU";
  readonly suppressStandardRecommendations: true;
}

const EMERGENCY = "If you are in immediate danger, call 000 now.";

export const SAFETY_RULES: readonly SafetyRule[] = [
  {
    id: "self-harm",
    trigger: /\b(kill myself|end my life|suicid\w*|hurt(ing)? myself|self[- ]?harm\w*|want to die|don'?t want to (be here|live|wake up)|better off dead|not be here any ?more)\b/i,
    severity: "emergency",
    message: "What you wrote matters, and it is more than an app should hold on its own. You deserve a person right now.",
    recommendedAction: `${EMERGENCY} Otherwise Lifeline is on 13 11 14, any hour, and the Suicide Call Back Service is on 1300 659 467.`,
    jurisdiction: "AU",
    suppressStandardRecommendations: true,
  },
  {
    id: "hopelessness",
    trigger: /\b(no point (in )?(going on|anything|living)|can'?t go on|nothing matters any ?more|everyone would be better without me|no way out)\b/i,
    severity: "urgent-support",
    message: "It sounds like things feel very heavy right now. That is worth saying to a person, not a screen.",
    recommendedAction: "Lifeline is on 13 11 14, any hour. Beyond Blue is on 1300 22 4636. If it becomes an emergency, call 000.",
    jurisdiction: "AU",
    suppressStandardRecommendations: true,
  },
  {
    id: "psychosis",
    trigger: /\b(hearing voices|voices (are )?telling me|people are (following|watching|after) me|they are reading my (mind|thoughts)|not real any ?more)\b/i,
    severity: "urgent-support",
    message: "What you are describing is worth talking through with a clinician soon, rather than working out alone.",
    recommendedAction: "Contact your GP or the mental health line in your state today. If you or somebody else is in danger, call 000.",
    jurisdiction: "AU",
    suppressStandardRecommendations: true,
  },
  {
    id: "mania",
    trigger: /\b(haven'?t slept (in|for) (days|a week)|don'?t need (to )?sleep|can'?t stop talking|racing (thoughts|mind)|spent (all|thousands))\b/i,
    severity: "urgent-support",
    message: "Several days without sleep, or a mind that will not slow down, is something to raise with a clinician promptly.",
    recommendedAction: "Contact your GP or prescriber today. If it becomes an emergency, call 000.",
    jurisdiction: "AU",
    suppressStandardRecommendations: true,
  },
  {
    id: "eating",
    trigger: /\b(stopped eating|not eating (at all|for days)|purg\w*|making myself (sick|throw up)|starv\w*)\b/i,
    severity: "urgent-support",
    message: "Eating that has stopped, or a pattern you cannot stop, deserves a person's help, not a strategy.",
    recommendedAction: "The Butterfly Foundation is on 1800 33 4673. Your GP can also help. If you feel faint or unwell, call 000.",
    jurisdiction: "AU",
    suppressStandardRecommendations: true,
  },
  {
    id: "substance",
    trigger: /\b(can'?t stop (drinking|using)|withdraw\w*|overdos\w*|blackout\w*|drinking every (day|night))\b/i,
    severity: "support",
    message: "Alcohol or drug use that has got away from you is common alongside ADHD, and it is something a clinician can help with without judgement.",
    recommendedAction: "The National Alcohol and Other Drug Hotline is on 1800 250 015. Your GP is also a safe place to start. If somebody has overdosed, call 000.",
    jurisdiction: "AU",
    suppressStandardRecommendations: true,
  },
  {
    id: "violence",
    trigger: /\b(hits? me|hit me|scared of (my|him|her|them)|threaten\w* me|not safe at home|abus\w*|violen\w*)\b/i,
    severity: "urgent-support",
    message: "If you are not safe at home, that comes before anything this app can offer.",
    recommendedAction: `${EMERGENCY} 1800RESPECT is on 1800 737 732, any hour, for support and a plan.`,
    jurisdiction: "AU",
    suppressStandardRecommendations: true,
  },
  {
    id: "cardiac",
    trigger: /\b(chest (pain|tight\w*)|heart (is )?(racing|pounding)|palpitat\w*|can'?t breathe|fainted)\b/i,
    severity: "emergency",
    message: "Chest pain, a racing heart or trouble breathing, particularly on stimulant medication, needs a clinician now, not later.",
    recommendedAction: "Call 000 if it is happening now. Otherwise contact your prescriber or GP today and tell them what you noticed.",
    jurisdiction: "AU",
    suppressStandardRecommendations: true,
  },
  {
    id: "danger",
    trigger: /\b(in danger|going to hurt (someone|somebody|them|him|her)|kill (him|her|them|someone))\b/i,
    severity: "emergency",
    message: "If anybody is in danger right now, the only useful thing this screen can say is who to call.",
    recommendedAction: EMERGENCY,
    jurisdiction: "AU",
    suppressStandardRecommendations: true,
  },
];

const ORDER: Record<Severity, number> = { emergency: 0, "urgent-support": 1, support: 2 };

/** The most severe rule the text triggers, or null. Pure; never throws on odd input. */
export function checkSafety(text: string): SafetyRule | null {
  if (!text) return null;
  const hits = SAFETY_RULES.filter((rule) => rule.trigger.test(text));
  if (hits.length === 0) return null;
  return [...hits].sort((a, b) => ORDER[a.severity] - ORDER[b.severity])[0] ?? null;
}

export function safetyRule(id: SafetyRuleId): SafetyRule {
  const rule = SAFETY_RULES.find((r) => r.id === id);
  if (!rule) throw new Error(`safety: unknown rule ${id}`);
  return rule;
}

/**
 * The urgent routes out of this app, reachable at any moment without having written anything
 * (Charmaine Bernie, occupational therapist and service-access researcher, 2026-09-11: the
 * existing health system already has good crisis pathways, separate from any neurodiversity
 * waitlist, so the app's job is to point at them rather than build a parallel one — and given
 * comorbidity and the suicide risk in the 16–25 cohort this product serves, she called
 * always-visible signposting non-negotiable).
 *
 * The rules above quote these same services inside a message about something a person wrote.
 * This is the list for the person who has written nothing and needs it now. Jurisdiction: AU.
 * Numbers are the national services and are not a clinical judgement about anybody.
 */
export interface UrgentService {
  readonly name: string;
  /** What `tel:` dials. Digits only, as the scheme wants them. */
  readonly tel: string;
  /** The number as a person reads it aloud. */
  readonly said: string;
  /** Who it is for, or when — three words at most. */
  readonly when: string;
}

export const URGENT_SERVICES: readonly UrgentService[] = [
  { name: "Emergency", tel: "000", said: "000", when: "In danger now" },
  { name: "Lifeline", tel: "131114", said: "13 11 14", when: "Any hour" },
  { name: "Kids Helpline", tel: "1800551800", said: "1800 55 1800", when: "Up to 25" },
  { name: "Beyond Blue", tel: "1300224636", said: "1300 22 4636", when: "Any hour" },
];
