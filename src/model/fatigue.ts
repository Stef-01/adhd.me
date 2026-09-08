// Survey fatigue (PRD §21): the app asks less when it has been asking a lot.
//
// Tracked from the record alone — questions answered today, abandons in the last seven days, the
// person's preferred depth, days since the last long survey — and folded into one score the
// screens read. The rules it implements: never launch a precision survey on its own; never more
// than ten consecutive questions without a break; when fatigue is high, stop offering optional
// questions and say so in the PRD's own words.

import type { ModelRecord } from "./store";

export const MAX_CONSECUTIVE_QUESTIONS = 10;

export interface Fatigue {
  /** 0–1. */
  score: number;
  /** Above this, optional questions are withheld. */
  high: boolean;
  answeredToday: number;
  abandons7d: number;
  daysSinceLongSurvey: number | null;
}

const HIGH = 0.6;

export function surveyFatigue(record: ModelRecord, now: Date = new Date()): Fatigue {
  const day = now.toISOString().slice(0, 10);
  const answeredToday = record.survey.day === day ? record.survey.answeredToday : 0;
  const week = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const abandons7d = record.survey.abandons.filter((a) => a.slice(0, 10) >= week).length;
  const daysSinceLongSurvey = record.survey.lastLongAt ? Math.floor((now.getTime() - Date.parse(record.survey.lastLongAt)) / 86_400_000) : null;
  const depth = record.onboarding?.depth ?? "medium";
  const depthWeight = depth === "short" ? 1.4 : depth === "deep" ? 0.7 : 1;
  // Each answered question today is worth a twentieth; each abandon this week a fifth; a long
  // survey in the last two days a third. Scaled by how much time the person said they wanted.
  const raw = (answeredToday / 20 + abandons7d / 5 + (daysSinceLongSurvey !== null && daysSinceLongSurvey < 2 ? 1 / 3 : 0)) * depthWeight;
  const score = Math.max(0, Math.min(1, raw));
  return { score, high: score >= HIGH, answeredToday, abandons7d, daysSinceLongSurvey };
}

/** Whether an OPTIONAL question may be asked now. Required resonance is never withheld. */
export function mayAskOptional(record: ModelRecord, askedThisSession: number, now: Date = new Date()): boolean {
  if (askedThisSession >= MAX_CONSECUTIVE_QUESTIONS) return false;
  return !surveyFatigue(record, now).high;
}

export const ENOUGH_FOR_NOW = "That’s enough for now. We already know enough to make this useful.";
