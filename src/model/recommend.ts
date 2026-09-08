// The support recommendation engine (PRD §35–§36, §64–§65): what the app suggests next, why, and
// the record that lets somebody audit the rule that produced it.
//
// RULE-BASED AND AUDITABLE. No model, no weights nobody can read. Each recommendation names the
// rule that fired, the inputs it read and its version, and carries the "Why am I seeing this?"
// sentence in the person's own terms. Professional support is one output among seven and never
// the default: it is offered when the cost is high, the person wants the problem easier, the
// model is confident, and self-guided attempts have been made — or when the person said at the
// door that professional support is what they are looking for.

import { interactiveModule, INTERACTIVE_MODULES, strategyById, type Strategy } from "@/learn/interactive";
import { MODULES } from "@/learn/scenes";
import { LAYER_LABELS, type Layer } from "./layers";
import { deriveNeeds, priorityScore, type Need } from "./needs";
import { PROFESSION_ENTRIES, type Profession } from "@/support/professions";
import { activeSafety, pendingExperiment, type ModelRecord } from "./store";

export const RULE_VERSION = "2026-09-08.1";

export type NextAction =
  | "LEARN"
  | "TRY_STRATEGY"
  | "CHANGE_ENVIRONMENT"
  | "INVOLVE_SUPPORT_PERSON"
  | "DISCUSS_WITH_EXISTING_CLINICIAN"
  | "EXPLORE_PROVIDER"
  | "URGENT_ESCALATION";

export interface Explainability {
  readonly recommendationId: string;
  readonly inputsUsed: readonly string[];
  readonly ruleTriggered: string;
  readonly output: NextAction;
  readonly timestamp: string;
  readonly ruleVersion: typeof RULE_VERSION;
}

export interface Recommendation {
  readonly action: NextAction;
  readonly need: Need | null;
  readonly heading: string;
  readonly body: string;
  /** "Why am I seeing this?" */
  readonly why: string;
  readonly moduleId?: string;
  readonly strategy?: Strategy;
  readonly professions?: readonly Profession[];
  readonly explain: Explainability;
}

/** PRD §38/§40: which professions a need's subdomain points at, most relevant first. */
export function professionsFor(need: Need): Profession[] {
  // A module lists its professions most-relevant first; the first counts double.
  const counts = new Map<Profession, number>();
  for (const m of INTERACTIVE_MODULES.filter((x) => x.targets.includes(need.subdomain))) {
    m.professions.forEach((p, i) => counts.set(p, (counts.get(p) ?? 0) + (i === 0 ? 2 : 1)));
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  return ranked.length ? ranked : ["gp"];
}

const ESCALATION = { minCost: 7, minFailedStrategies: 2 } as const;

/** PRD §67's boundary: cost ≥ 7, priority yes, confidence high, and enough self-guided attempts without help. */
export function escalationEligible(need: Need, record: ModelRecord): boolean {
  const unhelpful = need.strategies.filter((s) => s.outcome === "no" || s.outcome === "a-little").length;
  const wantsProfessional = record.onboarding?.lookingFor === "professional";
  if (need.functionalCost < ESCALATION.minCost) return false;
  if (need.userPriority !== "yes") return false;
  if (need.confidence !== "high" && !wantsProfessional) return false;
  return unhelpful >= ESCALATION.minFailedStrategies || (wantsProfessional && need.confidence !== "low");
}

function dominantLayer(need: Need): Layer | null {
  const counts = new Map<Layer, number>();
  for (const c of need.contributors) counts.set(c.layer, (counts.get(c.layer) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 2 ? top[0] : null;
}

function explain(rule: string, output: NextAction, inputs: string[], now: Date): Explainability {
  return { recommendationId: `${rule}:${now.getTime().toString(36)}`, inputsUsed: inputs, ruleTriggered: rule, output, timestamp: now.toISOString(), ruleVersion: RULE_VERSION };
}

const FIRST_MODULE = "context";

/** The one next action for this person, now. Deterministic over the record. */
export function recommend(record: ModelRecord, now: Date = new Date()): Recommendation {
  const safety = activeSafety(record);
  if (safety) {
    return {
      action: "URGENT_ESCALATION",
      need: null,
      heading: "Before anything else.",
      body: "Something you wrote deserves a person, not a module. Everything else here can wait.",
      why: "A reflection you wrote matched one of the app’s safety rules. Ordinary suggestions are paused until you have seen this.",
      explain: explain("safety.active", "URGENT_ESCALATION", [`safety:${safety.ruleId}`], now),
    };
  }

  const needs = deriveNeeds(record);
  const need = needs[0] ?? null;
  const done = new Set([...record.completed]);

  if (!need) {
    const module = interactiveModule(FIRST_MODULE)!;
    return {
      action: "LEARN",
      need: null,
      heading: "Start here.",
      body: "One situation, five scenes, one question — and the idea the rest of the app is built on.",
      why: "You have not told the app anything yet, so it starts with the module everyone starts with.",
      moduleId: module.id,
      explain: explain("no-signals.first-module", "LEARN", [], now),
    };
  }

  const inputs = [`need:${need.subdomain}`, `cost:${need.functionalCost}`, `priority:${need.userPriority}`, `confidence:${need.confidence}`, `persistence:${need.persistence}`, `score:${priorityScore(need).toFixed(1)}`];

  // Experiment awaiting an outcome — the follow-up comes before anything new (PRD §31).
  const pending = pendingExperiment(record);
  if (pending) {
    const found = strategyById(pending.strategyId);
    if (found) {
      return {
        action: "TRY_STRATEGY",
        need,
        heading: `Did “${found.strategy.title}” help?`,
        body: "You said you would try it. Whatever happened — even nothing — is useful to know.",
        why: "You accepted an experiment and have not yet said how it went. Its outcome changes what comes next.",
        strategy: found.strategy,
        moduleId: found.module.id,
        explain: explain("experiment.pending", "TRY_STRATEGY", [...inputs, `experiment:${pending.strategyId}`], now),
      };
    }
  }

  // Professional support, when earned.
  if (escalationEligible(need, record)) {
    const professions = professionsFor(need);
    const first = PROFESSION_ENTRIES.find((p) => p.id === professions[0])!;
    return {
      action: "EXPLORE_PROVIDER",
      need,
      heading: `${first.aName.charAt(0).toUpperCase()}${first.aName.slice(1)} may be particularly useful for this.`,
      body: `${need.label} has stayed hard after what you have tried. ${first.typicallyFor}`,
      why: `You put the cost of this at ${need.functionalCost} out of 10, said you want it easier, and ${need.strategies.filter((s) => s.outcome === "no" || s.outcome === "a-little").length} strategies did not help enough. That is the point at which the app suggests a person.`,
      professions,
      explain: explain("escalation.eligible", "EXPLORE_PROVIDER", [...inputs, `unhelpful:${need.strategies.filter((s) => s.outcome !== "pending" && s.outcome !== "a-lot").length}`], now),
    };
  }

  // Medication in the picture and the person said so: the conversation belongs with whoever manages it.
  if (need.subdomain === "medication-experience" || (record.onboarding?.medication === "yes" && (record.onboarding.hardest ?? []).includes("medication"))) {
    return {
      action: "DISCUSS_WITH_EXISTING_CLINICIAN",
      need,
      heading: "Worth raising with whoever manages your medication.",
      body: "What medication changes and what it leaves untouched is exactly the thing a review is for. Take the pattern you have noticed with you.",
      why: "You said medication is part of what feels hardest. The app does not advise on medication; the clinician who manages it does.",
      explain: explain("medication.discuss", "DISCUSS_WITH_EXISTING_CLINICIAN", inputs, now),
    };
  }

  // No module on this need finished yet: learn first.
  const teaching = [
    ...INTERACTIVE_MODULES.filter((m) => m.targets[0] === need.subdomain),
    ...INTERACTIVE_MODULES.filter((m) => m.targets[0] !== need.subdomain && m.targets.includes(need.subdomain)),
  ];
  const taught = teaching.some((m) => record.resonance[m.id] || done.has(m.id));
  const unfinished = teaching.find((m) => !done.has(m.id) && !record.resonance[m.id]);
  if (unfinished && !taught) {
    return {
      action: "LEARN",
      need,
      heading: unfinished.title,
      body: `${unfinished.subtitle}. ${unfinished.minutes} min.`,
      why: `Your biggest priority seems to be ${need.label.toLowerCase()}. This module is about exactly that.`,
      moduleId: unfinished.id,
      explain: explain("need.untaught", "LEARN", [...inputs, `module:${unfinished.id}`], now),
    };
  }

  // A strategy from a finished module not yet tried.
  // Strategies from the modules the person has actually met come first; the rest of the domain's follow.
  const met = [...teaching.filter((m) => record.resonance[m.id] || done.has(m.id)), ...teaching.filter((m) => !record.resonance[m.id] && !done.has(m.id))];
  const untried = met.flatMap((m) => m.steps.filter((s) => s.kind === "strategy").flatMap((s) => (s.kind === "strategy" ? s.strategies : []))).find((s) => !record.experiments.some((e) => e.strategyId === s.id));
  if (untried) {
    const layer = dominantLayer(need);
    const action: NextAction = layer === "environment" ? "CHANGE_ENVIRONMENT" : layer === "people" ? "INVOLVE_SUPPORT_PERSON" : "TRY_STRATEGY";
    const found = strategyById(untried.id)!;
    return {
      action,
      need,
      heading: `Try this: ${untried.title.toLowerCase()}.`,
      body: untried.steps.join(" · "),
      why: layer
        ? `What you have said about ${need.label.toLowerCase()} points at the ${LAYER_LABELS[layer].toLowerCase()} layer more than anything else, and this is the strategy that works there.`
        : `You have learned about ${need.label.toLowerCase()} and not yet tried something for it. This is the smallest thing to try.`,
      strategy: untried,
      moduleId: found.module.id,
      explain: explain(`strategy.untried.${layer ?? "brain"}`, action, [...inputs, `strategy:${untried.id}`], now),
    };
  }

  // Everything on this need is tried: go deeper on the next need, or the next module in the domain.
  const nextModule = MODULES.find((m) => m.kind === "interactive" && !done.has(m.id) && m.interactive?.domain === need.domain) ?? MODULES.find((m) => m.kind === "interactive" && !done.has(m.id));
  return {
    action: "LEARN",
    need,
    heading: nextModule ? nextModule.title : "You have been through everything here.",
    body: nextModule ? `${nextModule.subtitle}. ${nextModule.minutes} min.` : "Update what matters on My ADHD, or take what you have learned to a person.",
    why: "You have tried what this app has for your top priority. The next module widens the picture.",
    moduleId: nextModule?.id,
    explain: explain("need.exhausted.next-module", "LEARN", inputs, now),
  };
}

/** The PRD §26 view of the record, for My ADHD. Null before any signal. */
export interface Summary {
  readonly need: Need | null;
  readonly contributors: ReadonlyArray<{ layer: Layer; label: string; note: string }>;
  readonly pattern: string | null;
  readonly helps: readonly string[];
  readonly goal: string | null;
  readonly worthExploring: string | null;
}

export function summarise(record: ModelRecord): Summary {
  const need = deriveNeeds(record)[0] ?? null;
  if (!need) return { need: null, contributors: [], pattern: null, helps: [], goal: null, worthExploring: null };
  const contributors = need.contributors.map((c) => ({ layer: c.layer, label: LAYER_LABELS[c.layer], note: c.note }));
  const pattern = need.contributors.find((c) => c.note === "Waiting for urgency")?.note ?? need.contributors[0]?.note ?? null;
  const helps = [
    ...need.strategies.filter((s) => s.outcome === "a-lot").map((s) => s.title),
    ...need.context.filter((c) => c.startsWith("Easier")).map((c) => c.replace(/^Easier /, "").replace(/^\w/, (ch) => ch.toUpperCase())),
  ];
  const goalId = record.onboarding?.improveFirst;
  const goal = goalId ? (goalId === "other" ? "Something else" : (need.label)) : null;
  const explore = record.insights["perfectionism-start"] === "partly" || record.insights["perfectionism-start"] === "yes" ? "Perfectionism" : need.contributors.some((c) => c.subdomain === "sleep") ? "Sleep" : need.contributors.some((c) => c.layer === "people") ? "The people around you" : null;
  return { need, contributors, pattern, helps, goal, worthExploring: explore };
}
