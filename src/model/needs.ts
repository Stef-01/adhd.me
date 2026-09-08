// Needs (PRD §24): what the record says matters to this person, derived every time it is read.
//
// A need is one identified difficulty with its domain, subdomain, how strongly the signals point
// at it, how much it costs, whether the person wants it easier, how confident the model is, what
// seems to contribute by layer, and which strategies have been tried with what result. It is
// DERIVED, never stored — the record holds only what the person said, and this file is the one
// reading of it, so two screens cannot disagree about what the signals mean.
//
// Confidence follows sources: onboarding alone is low; one module's resonance is medium; two
// modules pointing the same way, or resonance plus a personalisation answer, is high. Every
// contributor carries the layer it sits in, because the whole point of the model is that a
// difficulty in the brain layer can have its strongest lever in the environment or people layer.

import { INTERACTIVE_MODULES, strategyById, type InteractiveModule } from "@/learn/interactive";
import { improveOption } from "./onboarding";
import type { Domain, Layer, Subdomain } from "./layers";
import { needLabel } from "./labels";
import { scoreSurvey } from "./surveys";
import { topicSurvey } from "@/learn/surveys";
export { needLabel } from "./labels";
import { meanRelate, type ExperimentOutcome, type ModelRecord } from "./store";

export type Confidence = "low" | "medium" | "high";

export interface Contributor {
  readonly layer: Layer;
  readonly subdomain: Subdomain;
  readonly note: string;
}

export interface StrategyOutcome {
  readonly strategyId: string;
  readonly title: string;
  readonly outcome: ExperimentOutcome | "pending";
}

export interface Need {
  readonly id: string;
  readonly domain: Domain;
  readonly subdomain: Subdomain;
  /** The sentence the screens use — "Starting long independent work." */
  readonly label: string;
  /** 0–1: how many sources point here, saturating at three. */
  readonly signalStrength: number;
  /** 0–10, from resonance where given, from onboarding impact otherwise. */
  readonly functionalCost: number;
  readonly userPriority: "yes" | "maybe" | "no" | "unknown";
  readonly confidence: Confidence;
  readonly contributors: readonly Contributor[];
  readonly strengths: readonly string[];
  readonly context: readonly string[];
  readonly strategies: readonly StrategyOutcome[];
  /** Module ids that fed this need. */
  readonly sources: readonly string[];
  /** How many separate occasions the signal was recorded — the persistence input. */
  readonly persistence: number;
}

const COST_BY_FREQUENCY = { often: 7, sometimes: 5, rarely: 2, unsure: 4 } as const;

interface Draft {
  domain: Domain;
  subdomain: Subdomain;
  sources: Set<string>;
  costs: number[];
  priorities: Array<"yes" | "maybe" | "no">;
  contributors: Map<string, Contributor>;
  strengths: Set<string>;
  context: Set<string>;
  strategies: Map<string, StrategyOutcome>;
  occasions: number;
}

function draft(domain: Domain, sub: Subdomain): Draft {
  return { domain, subdomain: sub, sources: new Set(), costs: [], priorities: [], contributors: new Map(), strengths: new Set(), context: new Set(), strategies: new Map(), occasions: 0 };
}

/** Which layer a personalisation answer points at, from its question id and option — the closed set of things modules ask. */
function contributorFor(module: InteractiveModule, questionId: string, option: string): Contributor | null {
  const key = `${questionId}:${option}`;
  const table: Record<string, Contributor> = {
    "switch:deadline": { layer: "environment", subdomain: "deadline-design", note: "Waiting for urgency" },
    "switch:interest": { layer: "brain", subdomain: "attention", note: "Interest switches attention on" },
    "switch:company": { layer: "people", subdomain: "peers", note: "Company lowers the threshold" },
    "switch:clear": { layer: "environment", subdomain: "structure", note: "Clear tasks start; vague ones do not" },
    "hardest-to-start:vague": { layer: "environment", subdomain: "structure", note: "Activation for ambiguous tasks" },
    "hardest-to-start:big": { layer: "brain", subdomain: "activation", note: "Large tasks raise the threshold" },
    "hardest-to-start:boring": { layer: "brain", subdomain: "attention", note: "Low interest, low activation" },
    "hardest-to-start:judged": { layer: "brain", subdomain: "emotional-regulation", note: "Being judged raises the threshold" },
    "what-helps-start:deadline": { layer: "environment", subdomain: "deadline-design", note: "Waiting for urgency" },
    "what-helps-start:person": { layer: "people", subdomain: "peers", note: "External accountability helps" },
    "horizon:day": { layer: "brain", subdomain: "time", note: "A deadline feels real about a day out" },
    "horizon:days": { layer: "brain", subdomain: "time", note: "A deadline feels real a few days out" },
    "knocks:phone": { layer: "environment", subdomain: "noise", note: "The phone clears the table" },
    "knocks:people": { layer: "people", subdomain: "peers", note: "Interruption by people" },
    "knocks:tired": { layer: "body", subdomain: "sleep", note: "Tiredness shrinks working memory" },
    "capture:no": { layer: "environment", subdomain: "structure", note: "No capture place outside your head" },
    "source:manager": { layer: "people", subdomain: "manager", note: "Vague tasks arrive from a manager" },
    "source:course": { layer: "people", subdomain: "teachers", note: "Vague briefs from a course" },
    "source:self": { layer: "brain", subdomain: "activation", note: "Own tasks left undefined" },
    "source:messages": { layer: "environment", subdomain: "noise", note: "Messages interrupt" },
    "source:noise": { layer: "environment", subdomain: "noise", note: "Noise where you work" },
    "standard:guess": { layer: "brain", subdomain: "emotional-regulation", note: "Perfectionistic starting threshold" },
    "standard:no": { layer: "environment", subdomain: "workplace-context", note: "The expected standard is unclear" },
    "worse:judged": { layer: "people", subdomain: "manager", note: "Being judged makes it worse" },
    "who:partner": { layer: "people", subdomain: "partner", note: "A partner feels unheard" },
    "who:family": { layer: "people", subdomain: "family", note: "Family feel unheard" },
    "when:tired": { layer: "body", subdomain: "sleep", note: "Drift is worse when tired" },
    "when:phone": { layer: "environment", subdomain: "noise", note: "A phone nearby pulls attention" },
    "carries:partner": { layer: "people", subdomain: "partner", note: "A partner carries the follow-up" },
    "carries:family": { layer: "people", subdomain: "family", note: "Family carry the follow-up" },
    "trigger:tired": { layer: "body", subdomain: "sleep", note: "Tired or hungry lights it" },
    "trigger:criticism": { layer: "brain", subdomain: "emotional-regulation", note: "Anything like criticism lights it" },
    "holds:partner": { layer: "people", subdomain: "partner", note: "A partner or flatmate holds the household list" },
    "holds:nobody": { layer: "environment", subdomain: "structure", note: "Nobody holds the household list" },
    "late:screens": { layer: "environment", subdomain: "noise", note: "Screens hold the night open" },
    "late:work": { layer: "environment", subdomain: "workload", note: "Work spills into the night" },
    "next-day:starting": { layer: "body", subdomain: "sleep", note: "Short nights raise the start threshold" },
    "stops:alone": { layer: "people", subdomain: "peers", note: "Exercise alone does not hold" },
    "stops:starting": { layer: "brain", subdomain: "activation", note: "Getting out the door is the barrier" },
    "lands-on:side": { layer: "brain", subdomain: "attention", note: "Focus lands on side tasks" },
  };
  const hit = table[key];
  if (!hit) return null;
  void module;
  return hit;
}

/** What the onboarding said, as context sentences. */
function onboardingContext(record: ModelRecord): string[] {
  const a = record.onboarding;
  if (!a) return [];
  const out: string[] = [];
  const easier = a.easier ?? [];
  if (easier.includes("urgent")) out.push("Easier when something is due right now");
  if (easier.includes("interested")) out.push("Easier when interested");
  if (easier.includes("structure")) out.push("Easier with structure from somebody else");
  if (easier.includes("alongside")) out.push("Easier working alongside someone");
  if (easier.includes("slept")) out.push("Easier after a good night's sleep");
  if (easier.includes("exercise")) out.push("Easier when exercising regularly");
  if (easier.includes("clear")) out.push("Easier when tasks are very clear");
  if (a.affects && a.affects !== "several") out.push(`Affects ${a.affects === "wellbeing" ? "emotional wellbeing" : a.affects} most`);
  return out;
}

export function deriveNeeds(record: ModelRecord): Need[] {
  const drafts = new Map<Subdomain, Draft>();
  const get = (domain: Domain, sub: Subdomain): Draft => {
    const existing = drafts.get(sub);
    if (existing) return existing;
    const d = draft(domain, sub);
    drafts.set(sub, d);
    return d;
  };

  // 1. Onboarding: the chosen goal is the first need; impact is its cost.
  const goal = improveOption(record.onboarding?.improveFirst);
  const impact = record.onboarding?.impact;
  if (goal) {
    const d = get(goal.domain, goal.subdomain);
    d.sources.add("onboarding");
    d.occasions += 1;
    if (typeof impact === "number") d.costs.push(impact);
    d.priorities.push("yes");
  }
  const easier = record.onboarding?.easier ?? [];
  const onboardingContributors: Contributor[] = [];
  if (easier.includes("urgent")) onboardingContributors.push({ layer: "environment", subdomain: "deadline-design", note: "Waiting for urgency" });
  if (easier.includes("structure") || easier.includes("clear")) onboardingContributors.push({ layer: "environment", subdomain: "structure", note: "Works better with external structure" });
  if (easier.includes("alongside")) onboardingContributors.push({ layer: "people", subdomain: "peers", note: "Works better alongside someone" });
  if (easier.includes("slept")) onboardingContributors.push({ layer: "body", subdomain: "sleep", note: "Sleep changes everything else" });
  if (easier.includes("exercise")) onboardingContributors.push({ layer: "body", subdomain: "movement", note: "Regular exercise steadies the rest" });

  // 2. Module resonance: each module's first target is the need it is about; cost and priority are the person's own.
  for (const module of INTERACTIVE_MODULES) {
    const res = record.resonance[module.id];
    if (!res) continue;
    const sub = module.targets[0]!;
    const d = get(module.domain, sub);
    d.sources.add(module.id);
    d.occasions += 1;
    const related = meanRelate(record, module.id);
    if (typeof res.cost === "number") d.costs.push(res.cost);
    else if (related !== null) d.costs.push(related);
    else if (res.frequency) d.costs.push(COST_BY_FREQUENCY[res.frequency]);
    if (res.priority) d.priorities.push(res.priority);
    if (res.frequency === "often" || res.frequency === "sometimes") d.strengths.add(module.strength);
    for (const [key, value] of Object.entries(record.answers)) {
      if (!key.startsWith(`${module.id}.`)) continue;
      const questionId = key.slice(module.id.length + 1);
      for (const option of Array.isArray(value) ? value : [value]) {
        const c = contributorFor(module, questionId, option);
        if (c) d.contributors.set(`${c.layer}:${c.note}`, c);
      }
    }
    for (const experiment of record.experiments) {
      if (experiment.moduleId !== module.id) continue;
      const found = strategyById(experiment.strategyId);
      if (!found) continue;
      d.strategies.set(experiment.strategyId, { strategyId: experiment.strategyId, title: found.strategy.title, outcome: experiment.outcome ?? "pending" });
    }
  }

  // 2b. Confirmed interpretations (PRD §29): a reading the person said yes to becomes a contributor on
  // the need the module is about. A reading they declined was never written, so there is nothing to skip.
  for (const held of record.interpretations) {
    const module = INTERACTIVE_MODULES.find((m) => m.id === held.moduleId);
    if (!module) continue;
    const d = get(module.domain, module.targets[0]!);
    d.contributors.set(`${held.layer}:${held.note}`, { layer: held.layer, subdomain: held.subdomain, note: held.note });
  }

  // 3. Topic surveys: the friction is a need; the cost is the person's own; contributors and strengths ride with it.
  for (const [surveyId, held] of Object.entries(record.surveys)) {
    const survey = topicSurvey(surveyId);
    if (!survey || !held.completedAt) continue;
    const result = scoreSurvey(survey, held.answers);
    if (!result.friction) continue;
    const d = get(survey.domain, result.friction.subdomain);
    d.sources.add(`survey:${surveyId}`);
    d.occasions += 1;
    if (result.cost !== null) d.costs.push(result.cost);
    d.priorities.push("yes");
    for (const s of result.strengths) d.strengths.add(s);
    for (const c of result.contributors) d.contributors.set(`${c.layer}:${c.note}`, c);
  }

  const context = onboardingContext(record);
  const needs: Need[] = [];
  for (const d of drafts.values()) {
    for (const c of onboardingContributors) d.contributors.set(`${c.layer}:${c.note}`, c);
    // A completed survey is as strong a source as a module: both are the person's own answers.
    const moduleSources = [...d.sources].filter((s) => s !== "onboarding");
    const answered = [...d.contributors.values()].length > 0;
    const confidence: Confidence = moduleSources.length >= 2 || (moduleSources.length === 1 && answered) ? "high" : moduleSources.length === 1 ? "medium" : "low";
    const cost = d.costs.length ? Math.round(d.costs.reduce((a, b) => a + b, 0) / d.costs.length) : 0;
    const priority = d.priorities.includes("yes") ? "yes" : d.priorities.includes("maybe") ? "maybe" : d.priorities.includes("no") ? "no" : "unknown";
    needs.push({
      id: d.subdomain,
      domain: d.domain,
      subdomain: d.subdomain,
      label: needLabel(d.subdomain),
      signalStrength: Math.min(1, d.sources.size / 3),
      functionalCost: cost,
      userPriority: priority,
      confidence,
      contributors: [...d.contributors.values()],
      strengths: [...d.strengths],
      context,
      strategies: [...d.strategies.values()],
      sources: [...d.sources],
      persistence: d.occasions,
    });
  }
  return needs.sort((a, b) => priorityScore(b) - priorityScore(a));
}

const PRIORITY_WEIGHT = { yes: 1, maybe: 0.6, no: 0.2, unknown: 0.5 } as const;
const CONFIDENCE_WEIGHT = { low: 0.5, medium: 0.8, high: 1 } as const;

/** PRD §36: functional cost × user priority × persistence × confidence. 0–10 scale. */
export function priorityScore(need: Need): number {
  const persistence = Math.min(2, 1 + 0.25 * (need.persistence - 1));
  return need.functionalCost * PRIORITY_WEIGHT[need.userPriority] * persistence * CONFIDENCE_WEIGHT[need.confidence];
}

export function topNeed(record: ModelRecord): Need | null {
  return deriveNeeds(record)[0] ?? null;
}
