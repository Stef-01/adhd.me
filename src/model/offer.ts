// When a longer survey may be OFFERED (PRD §20 level 4). Never launched: this returns an offer
// a screen renders as a card with a button, or null.

import { surveyForDomain, type TopicSurvey } from "@/learn/surveys";
import { surveyFatigue } from "./fatigue";
import { deriveNeeds } from "./needs";
import type { ModelRecord } from "./store";

export interface SurveyOffer {
  readonly survey: TopicSurvey;
  readonly why: string;
  readonly rule: "need.persisted" | "wants.professional" | "would.sharpen";
}

/**
 * PRD §20 level 4: a longer survey is OFFERED, never launched. Offered only when the person has
 * said what matters (a top need exists), that domain has a survey they have not completed,
 * fatigue is not high, and one of three things is true: the need has come up more than once,
 * they said at the door they want professional support (where a survey sharpens the match), or
 * the cost is high and the model is not yet confident. Otherwise nothing is offered.
 */
export function offerSurvey(record: ModelRecord, now: Date = new Date()): SurveyOffer | null {
  if (surveyFatigue(record, now).high) return null;
  const need = deriveNeeds(record)[0];
  if (!need) return null;
  const survey = surveyForDomain(need.domain);
  if (!survey) return null;
  if (record.surveys[survey.id]?.completedAt) return null;
  const wantsProfessional = record.onboarding?.lookingFor === "professional";
  if (need.persistence >= 2) return { survey, why: `${need.label} has come up more than once. Eight to twelve questions would say which part of it is the friction, and what to try first.`, rule: "need.persisted" };
  if (wantsProfessional) return { survey, why: "You said you are looking for professional support. A few more questions make the match more precise before anybody is suggested.", rule: "wants.professional" };
  if (need.functionalCost >= 7 && need.confidence !== "high") return { survey, why: `You put the cost of ${need.label.toLowerCase()} high, and the app has only one source for it so far. This would sharpen the picture.`, rule: "would.sharpen" };
  return null;
}

