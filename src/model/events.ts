// The analytics taxonomy (PRD §58), and the one function that emits an event.
//
// NEVER FREE TEXT. A reflection, a sentence the person typed, a suburb — none of it reaches an
// event. `track` accepts a closed set of names and a property bag whose values must be short
// identifiers or numbers; anything else is refused before it leaves the function. It forwards to
// the measurement loader only when the person has agreed (the loader itself checks consent, and
// is absent otherwise), and never throws — analytics failing must not cost the app a screen.

export const EVENTS = [
  "ONBOARDING_STARTED",
  "ONBOARDING_QUESTION_ANSWERED",
  "ONBOARDING_COMPLETED",
  "MODULE_VIEWED",
  "MODULE_STARTED",
  "MODULE_STEP_COMPLETED",
  "MODULE_BRANCH_SELECTED",
  "MODULE_RESONANCE_RECORDED",
  "MODULE_COMPLETED",
  "SURVEY_STARTED",
  "SURVEY_QUESTION_ANSWERED",
  "SURVEY_ABANDONED",
  "SURVEY_COMPLETED",
  "INSIGHT_SHOWN",
  "INSIGHT_CONFIRMED",
  "INSIGHT_REJECTED",
  "STRATEGY_VIEWED",
  "EXPERIMENT_ACCEPTED",
  "EXPERIMENT_COMPLETED",
  "EXPERIMENT_OUTCOME_RECORDED",
  // The waiting checkpoint (src/model/checkpoint.ts): which one, and which of its three answers.
  // The months and the answer are both closed values; nothing about the person travels with it.
  "CHECKPOINT_ANSWERED",
  // The triage layer's two questions (src/support/pathway.ts): who the care is for, and where
  // somebody is up to. Both are closed vocabularies, so the event carries two identifiers and
  // nothing that could describe a person.
  "PATHWAY_ANSWERED",
  "SUPPORT_RECOMMENDATION_SHOWN",
  "PROVIDER_CARD_VIEWED",
  "PROVIDER_PROFILE_VIEWED",
  "BOOKING_CLICKED",
  "SAFETY_TRIGGERED",
  "CARE_MAP_OPENED",
  "MANUAL_EDITED",
  "MANUAL_COPIED",
  "SHARE_LINK_COPIED",
  "MEDICATION_NOTE_EDITED",
  "MEDICATION_NOTE_COPIED",
  "ADJUSTMENTS_TRACK",
  "ADJUSTMENTS_PROVIDERS",
  "INTERPRETATION_OFFERED",
  "INTERPRETATION_CONFIRMED",
  "INTERPRETATION_DECLINED",
  "ROUND_RELATED",
  // ADHD Lives (PRD v2 §67). Gameplay, then learning. §68: these name product behaviour, never a
  // person — the test beside them refuses a label that reads like an inferred pathology.
  "SESSION_STARTED",
  "SESSION_COMPLETED",
  "MINIGAME_STARTED",
  "MINIGAME_SUCCESS",
  "MINIGAME_FAILURE",
  "DIFFICULTY_INCREASED",
  "RESONANCE_SELECTED",
  "STRATEGY_IMPRESSION",
  "STRATEGY_SAVED",
  "STRATEGY_DISMISSED",
  "MODULE_ABANDONED",
  "STRATEGY_ADDED_TO_TOOLKIT",
  "STRATEGY_MARKED_USEFUL",
  "STRATEGY_MARKED_NOT_USEFUL",
] as const;
export type EventName = (typeof EVENTS)[number];

export type EventProps = Record<string, string | number | boolean>;

const IDENTIFIER = /^[a-z0-9][a-z0-9_.-]{0,63}$/i;

/** True when every value is an identifier-shaped string, a finite number or a boolean. */
export function safeProps(props: EventProps): boolean {
  return Object.values(props).every((v) =>
    typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && IDENTIFIER.test(v)),
  );
}

interface GtagWindow extends Window {
  gtag?: (...args: unknown[]) => void;
}

export function track(name: EventName, props: EventProps = {}): boolean {
  if (!(EVENTS as readonly string[]).includes(name) || !safeProps(props)) return false;
  try {
    const w = (typeof window === "undefined" ? undefined : window) as GtagWindow | undefined;
    w?.gtag?.("event", name, props);
  } catch {
    // Measurement is never allowed to cost a screen.
  }
  return true;
}
