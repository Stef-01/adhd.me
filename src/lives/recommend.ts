// §31–§34, §108: the deterministic recommendation engine. Weighted matching over explicit
// resonance, goals, encounters and history; at most three; every row explains itself (§107).
import type { LearningDomain, RecommendationContext, StrategyDefinition } from "./types";

export const WEIGHTS = {
  thisIsMe: 10,
  sometimes: 5,
  goalMatch: 6,
  encounteredGame: 3,
  encounteredCharacter: 2,
  savedPreviously: -5,
  completedRecently: -6,
  sameDomainShown: -2,
} as const;

export const MAX_RECOMMENDATIONS = 3;

export interface Recommendation {
  readonly strategy: StrategyDefinition;
  readonly score: number;
  readonly reasons: readonly string[];
}

function baseScore(strategy: StrategyDefinition, context: RecommendationContext): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  for (const signal of context.resonanceSignals) {
    const matches = (signal.sourceType === "game" && strategy.relatedGameIds.includes(signal.sourceId)) || (signal.sourceType === "character" && strategy.characterIds.includes(signal.sourceId as never)) || (signal.sourceType === "moment" && strategy.characterIds.includes(signal.sourceId as never));
    if (!matches) continue;
    // A reason names what it came from (PLAN.md W8): `game:zoe_dont_send`, `character:mia`.
    const like = `${signal.sourceType === "game" ? "game" : "character"}:${signal.sourceId}`;
    if (signal.response === "this_is_me") { score += WEIGHTS.thisIsMe; reasons.push(like); }
    else if (signal.response === "sometimes") { score += WEIGHTS.sometimes; reasons.push(like); }
    else { score -= WEIGHTS.thisIsMe; reasons.push(`not me: ${signal.sourceId}`); }
  }
  const goals = strategy.domains.filter((d) => context.selectedGoals.includes(d));
  if (goals.length) { score += WEIGHTS.goalMatch; reasons.push(...goals.map((d) => `goal:${d}`)); }
  if (strategy.relatedGameIds.some((g) => context.encounteredGameIds.includes(g))) { score += WEIGHTS.encounteredGame; reasons.push("a related game came up this run"); }
  if (strategy.characterIds.some((c) => context.encounteredCharacterIds.includes(c))) { score += WEIGHTS.encounteredCharacter; reasons.push("a related character came up this run"); }
  if (context.savedStrategyIds.includes(strategy.id)) { score += WEIGHTS.savedPreviously; reasons.push("already saved"); }
  if (context.recentlyCompletedModuleIds.includes(strategy.moduleId)) { score += WEIGHTS.completedRecently; reasons.push("completed recently"); }
  return { score, reasons };
}

/** Up to three, highest first, with a domain-diversity penalty applied greedily (§34). */
export function recommendStrategies(context: RecommendationContext, strategies: readonly StrategyDefinition[]): Recommendation[] {
  const scored = strategies
    .filter((s) => s.active)
    .filter((s) => !context.dismissedStrategyIds.includes(s.id))
    .map((strategy) => ({ strategy, ...baseScore(strategy, context) }))
    .sort((a, b) => b.score - a.score || a.strategy.id.localeCompare(b.strategy.id));
  const out: Recommendation[] = [];
  const shownDomains = new Set<string>();
  for (const candidate of scored) {
    if (out.length >= MAX_RECOMMENDATIONS) break;
    const overlap = candidate.strategy.domains.some((d) => shownDomains.has(d));
    const score = candidate.score + (overlap ? WEIGHTS.sameDomainShown : 0);
    const reasons = overlap ? [...candidate.reasons, "same domain already shown"] : candidate.reasons;
    // A recommendation with nothing behind it is not one: only tier 4 (§32) shows without a signal, and only one.
    if (score <= 0 && out.length > 0) continue;
    out.push({ strategy: candidate.strategy, score, reasons });
    candidate.strategy.domains.forEach((d) => shownDomains.add(d));
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * The line under "For you" (PLAN.md W8, `{#honesty.claim-earned}`): what the picks came from, said
 * once for all of them. Null when nothing the person chose is behind them, and then there is no
 * "For you". "Sometimes" counts as like you: the person picked it.
 */
export function reasonLine(picks: readonly Recommendation[], goalLabel: (goal: LearningDomain) => string): string | null {
  const reasons = picks.flatMap((p) => p.reasons);
  const goals = [...new Set(reasons.filter((r) => r.startsWith("goal:")).map((r) => r.slice("goal:".length) as LearningDomain))];
  const like = reasons.some((r) => r.startsWith("character:") || r.startsWith("game:"));
  if (goals.length && like) return "From your goals and characters like you.";
  if (goals.length) return `From your goals: ${goals.map(goalLabel).join(", ")}.`;
  if (like) return "From the characters you said are like you.";
  return null;
}
