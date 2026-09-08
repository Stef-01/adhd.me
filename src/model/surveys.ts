// Scoring a topic survey (PRD §22–§23, §67), and the rule for when one may be OFFERED (§20).
//
// The result has no total and no cut-off. It says which subdomain the answers point at most,
// what amplifies it (an environment-layer contributor), what else contributes, a strength, the
// person's own cost figure, and the next thing to try and to explore. Skipped questions are
// simply absent; two answers that claim opposite things about the same pattern are noticed,
// named in the result, and left out of the scoring rather than silently averaged; fewer than
// half the questions answered is an incomplete survey, which still reads what it can.

import { TOPIC_SURVEYS, topicSurvey, type SurveyOption, type TopicSurvey } from "@/learn/surveys";
import { needLabel } from "./labels";
import type { Layer, Subdomain } from "./layers";
import type { ModelRecord } from "./store";

export type SurveyAnswers = Readonly<Record<string, string | number>>;

export interface SurveyContributor {
  readonly layer: Layer;
  readonly subdomain: Subdomain;
  readonly note: string;
}

export interface SurveyResult {
  readonly surveyId: string;
  readonly answered: number;
  readonly total: number;
  /** At least half the questions answered. */
  readonly complete: boolean;
  /** Subdomains by evidence, strongest first. */
  readonly frictions: ReadonlyArray<{ readonly subdomain: Subdomain; readonly score: number }>;
  readonly friction: { readonly subdomain: Subdomain; readonly label: string } | null;
  readonly amplifier: SurveyContributor | null;
  readonly contributor: SurveyContributor | null;
  readonly contributors: readonly SurveyContributor[];
  readonly strengths: readonly string[];
  /** The person's own 0–10, from the consequence question, or null. */
  readonly cost: number | null;
  /** Pairs of answers that said opposite things, by claim key. Left out of the scoring. */
  readonly contradictions: readonly string[];
  readonly tryNext: string;
  readonly exploreNext: string;
}

function chosen(survey: TopicSurvey, answers: SurveyAnswers): Array<{ questionId: string; option: SurveyOption }> {
  const out: Array<{ questionId: string; option: SurveyOption }> = [];
  for (const q of survey.questions) {
    if (q.kind !== "single") continue;
    const value = answers[q.id];
    if (typeof value !== "string") continue;
    const option = q.options?.find((o) => o.id === value);
    if (option) out.push({ questionId: q.id, option });
  }
  return out;
}

/** Claim keys that two chosen options disagree about. */
export function contradictionsIn(survey: TopicSurvey, answers: SurveyAnswers): string[] {
  const seen = new Map<string, boolean>();
  const clashes = new Set<string>();
  for (const { option } of chosen(survey, answers)) {
    for (const [key, value] of Object.entries(option.claims ?? {})) {
      if (seen.has(key) && seen.get(key) !== value) clashes.add(key);
      seen.set(key, value);
    }
  }
  return [...clashes].sort();
}

export function scoreSurvey(survey: TopicSurvey, answers: SurveyAnswers): SurveyResult {
  const contradictions = contradictionsIn(survey, answers);
  const clashing = new Set(contradictions);
  const picks = chosen(survey, answers).filter(({ option }) => !Object.keys(option.claims ?? {}).some((k) => clashing.has(k)));
  const scores = new Map<Subdomain, number>();
  const contributors = new Map<string, SurveyContributor>();
  const strengths = new Set<string>();
  for (const { option } of picks) {
    for (const s of option.signals ?? []) scores.set(s.subdomain, (scores.get(s.subdomain) ?? 0) + s.weight);
    if (option.contributor) contributors.set(`${option.contributor.layer}:${option.contributor.note}`, option.contributor);
    if (option.strength) strengths.add(option.strength);
  }
  const answered = survey.questions.filter((q) => {
    const v = answers[q.id];
    return q.kind === "scale" ? typeof v === "number" && Number.isFinite(v) : typeof v === "string" && Boolean(q.options?.some((o) => o.id === v));
  }).length;
  const scale = survey.questions.find((q) => q.kind === "scale");
  const rawCost = scale ? answers[scale.id] : undefined;
  const cost = typeof rawCost === "number" && Number.isFinite(rawCost) ? Math.max(0, Math.min(10, Math.round(rawCost))) : null;
  const frictions = [...scores.entries()].filter(([, score]) => score > 0).map(([subdomain, score]) => ({ subdomain, score })).sort((a, b) => b.score - a.score);
  // With nothing pointing anywhere, the scale question's subject is the friction only when the person put a cost on it.
  const friction = frictions[0] ? { subdomain: frictions[0].subdomain, label: needLabel(frictions[0].subdomain) } : scale?.costFor && cost !== null && cost > 0 ? { subdomain: scale.costFor, label: needLabel(scale.costFor) } : null;
  const all = [...contributors.values()];
  const amplifier = all.find((c) => c.layer === "environment") ?? null;
  const contributor = all.find((c) => c !== amplifier) ?? null;
  return {
    surveyId: survey.id,
    answered,
    total: survey.questions.length,
    complete: answered >= Math.ceil(survey.questions.length / 2),
    frictions,
    friction,
    amplifier,
    contributor,
    contributors: all,
    strengths: [...strengths],
    cost,
    contradictions,
    tryNext: survey.tryNext,
    exploreNext: survey.exploreNext,
  };
}

/** The scored result of every survey the record holds, complete or not. */
export function surveyResults(record: ModelRecord): SurveyResult[] {
  return Object.entries(record.surveys).flatMap(([id, held]) => {
    const survey = topicSurvey(id);
    return survey ? [scoreSurvey(survey, held.answers)] : [];
  });
}

/** Surveys a person may start by choice at any time, whatever the offer rule says — the ones not yet completed. */
export function availableSurveys(record: ModelRecord): TopicSurvey[] {
  return TOPIC_SURVEYS.filter((s) => !record.surveys[s.id]?.completedAt);
}
