// §31–§34, §108: the deterministic recommendation engine. Weighted matching over explicit
// resonance, goals, encounters and history; at most three; every row explains itself (§107).
import type { RecommendationContext, StrategyDefinition } from "./types";

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
    if (signal.response === "this_is_me") { score += WEIGHTS.thisIsMe; reasons.push(`this is me: ${signal.sourceId}`); }
    else if (signal.response === "sometimes") { score += WEIGHTS.sometimes; reasons.push(`sometimes: ${signal.sourceId}`); }
    else { score -= WEIGHTS.thisIsMe; reasons.push(`not me: ${signal.sourceId}`); }
  }
  if (strategy.domains.some((d) => context.selectedGoals.includes(d))) { score += WEIGHTS.goalMatch; reasons.push("matches a chosen goal"); }
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
