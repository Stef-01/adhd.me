import type { Domain, Subdomain } from "./layers";
import type { LearningDomain, LearningProfile } from "@/lives/types";
import { CHARACTERS } from "@/lives/characters";
import { GAMES } from "@/lives/games";
import { STRATEGIES } from "@/lives/strategies";

export const LEARNING_TARGETS: Record<LearningDomain, { domain: Domain; subdomain: Subdomain }> = {
  attention: { domain: "work-study", subdomain: "attention" },
  working_memory: { domain: "daily-life", subdomain: "memory" },
  task_initiation: { domain: "work-study", subdomain: "activation" },
  prioritisation: { domain: "daily-life", subdomain: "structure" },
  time_management: { domain: "daily-life", subdomain: "time" },
  transitions: { domain: "daily-life", subdomain: "switching" },
  impulsivity: { domain: "mind-emotions", subdomain: "inhibition" },
  relationships: { domain: "relationships", subdomain: "partner" },
  communication: { domain: "relationships", subdomain: "partner" },
  emotional_regulation: { domain: "mind-emotions", subdomain: "emotional-regulation" },
  sleep: { domain: "sleep-body", subdomain: "sleep" },
  sensory_management: { domain: "daily-life", subdomain: "noise" },
  environment: { domain: "daily-life", subdomain: "living-environment" },
  planning: { domain: "daily-life", subdomain: "structure" },
  organisation: { domain: "daily-life", subdomain: "structure" },
  mindfulness: { domain: "mind-emotions", subdomain: "emotional-regulation" },
  self_understanding: { domain: "understand", subdomain: "attention" },
};

export interface LearningEvidence {
  domain: Domain;
  subdomain: Subdomain;
  source: string;
  at: number;
  kind: "self-report" | "chosen-goal";
}

/** Recognition and chosen goals only. Scores, speed, mistakes and completion cannot create a need. */
export function learningEvidence(profile?: LearningProfile): LearningEvidence[] {
  if (!profile) return [];
  const latest = new Map<string, LearningProfile["resonanceSignals"][number]>();
  for (const s of profile.resonanceSignals) {
    if (!s || !Number.isFinite(s.createdAt)) continue;
    const key = `${s.sourceType}:${s.sourceId}`;
    if (!latest.has(key) || latest.get(key)!.createdAt <= s.createdAt) latest.set(key, s);
  }
  const out: LearningEvidence[] = [];
  for (const [source, s] of latest) {
    if (s.response !== "this_is_me" && s.response !== "sometimes") continue;
    const game = s.sourceType === "game" ? GAMES.find(g => g.id === s.sourceId) : undefined;
    if (s.sourceType !== "game" && s.sourceType !== "character" && s.sourceType !== "moment") continue;
    if (s.sourceType === "game" && !game) continue;
    const person = CHARACTERS.find(c => c.id === (game?.character ?? s.sourceId));
    const domain = game ? STRATEGIES.find(x => x.id === game.learningLinks[0])?.domains[0] : person?.domains[0];
    if (!domain || !Object.hasOwn(LEARNING_TARGETS, domain)) continue;
    out.push({ ...LEARNING_TARGETS[domain], source: `lives:${source}`, at: s.createdAt, kind: "self-report" });
  }
  for (const domain of new Set(profile.selectedGoals)) {
    if (Object.hasOwn(LEARNING_TARGETS, domain)) out.push({ ...LEARNING_TARGETS[domain], source: `goal:${domain}`, at: 0, kind: "chosen-goal" });
  }
  return out;
}
