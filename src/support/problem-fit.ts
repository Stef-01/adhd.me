// Problem fit (PRD §42): how well an allied provider's declared expertise answers the person's
// top need, and the sentence that says so on a card.
//
// The finder's engine ranks on what a person SAID they want (`src/matching`), and it stays the
// order among GPs. What it cannot see is what the personal model has learned — that starting
// ambiguous work is the biggest friction. This reads that need against the closed expertise
// taxonomy an allied provider declares, and reorders the ALLIED entries among themselves by fit,
// leaving every GP where the engine put it and never moving an allied entry past a GP position.
// Problem fit is the highest-weighted factor among allied providers, as §42 asks; scope
// (profession) stays a hard constraint handled by the filters; nothing paid exists to alter it.

import type { Need } from "@/model/needs";
import type { Subdomain } from "@/model/layers";
import { EXPERTISE_LABELS, type ExpertiseTag } from "./professions";

/** Which declared expertise answers a subdomain — the problem-side of the §40 taxonomy. */
export const EXPERTISE_FOR: Partial<Record<Subdomain, readonly ExpertiseTag[]>> = {
  activation: ["task-initiation", "adhd-work-systems", "perfectionism"],
  time: ["deadline-management", "task-initiation"],
  switching: ["adhd-work-systems", "workplace-adjustments"],
  attention: ["adhd-work-systems", "adhd-couples"],
  memory: ["household-organisation", "adhd-work-systems", "adhd-couples"],
  inhibition: ["emotional-regulation", "household-organisation"],
  "emotional-regulation": ["emotional-regulation", "perfectionism", "adhd-couples"],
  sleep: ["sleep-routine"],
  movement: ["exercise-adherence"],
  appetite: ["stimulant-appetite-concerns"],
  energy: ["sleep-routine", "exercise-adherence"],
  "medication-experience": ["medication-review", "stimulant-appetite-concerns"],
  structure: ["adhd-work-systems", "household-organisation", "university-adhd"],
  workload: ["workplace-adjustments", "adhd-work-systems"],
  "deadline-design": ["deadline-management", "university-adhd"],
  "living-environment": ["household-organisation"],
  "study-context": ["university-adhd"],
  "workplace-context": ["workplace-adjustments", "adhd-work-systems"],
  partner: ["adhd-couples"],
  family: ["adhd-couples"],
  manager: ["workplace-adjustments"],
  teachers: ["university-adhd"],
  clinicians: ["medication-review", "late-diagnosis"],
};

export interface Fittable {
  readonly profession?: string | undefined;
  readonly expertise?: readonly ExpertiseTag[] | undefined;
}

/** Tags that match the need's own subdomain score 2; its contributors' subdomains score 1. */
export function problemFit(provider: Fittable, need: Need | null): number {
  if (!need || !provider.expertise?.length) return 0;
  const primary = new Set(EXPERTISE_FOR[need.subdomain] ?? []);
  const secondary = new Set(need.contributors.flatMap((c) => EXPERTISE_FOR[c.subdomain] ?? []));
  let score = 0;
  for (const tag of provider.expertise) {
    if (primary.has(tag)) score += 2;
    else if (secondary.has(tag)) score += 1;
  }
  return score;
}

/** The matched tags, primary first, for the reason on a card. */
export function fitTags(provider: Fittable, need: Need | null): ExpertiseTag[] {
  if (!need || !provider.expertise?.length) return [];
  // In the taxonomy's own order — the most specific answer to the need is listed first there.
  const primary = (EXPERTISE_FOR[need.subdomain] ?? []).filter((t) => provider.expertise!.includes(t));
  const secondary = need.contributors.flatMap((c) => EXPERTISE_FOR[c.subdomain] ?? []).filter((t) => provider.expertise!.includes(t) && !primary.includes(t));
  return [...new Set([...primary, ...secondary])];
}

/** "Works on task initiation — the thing you said is hardest." or null when nothing fits. */
export function fitReason(provider: Fittable, need: Need | null): string | null {
  const tags = fitTags(provider, need);
  if (tags.length === 0 || !need) return null;
  const primary = new Set(EXPERTISE_FOR[need.subdomain] ?? []);
  const lead = tags[0]!;
  // Lower-case the first letter unless the word is an acronym — "ADHD at work" keeps its case.
  const raw = EXPERTISE_LABELS[lead];
  const label = /^[A-Z]{2,}/.test(raw) ? raw : raw.replace(/^\w/, (c) => c.toLowerCase());
  return primary.has(lead)
    ? `Works on ${label} — the thing you said is hardest.`
    : `Works on ${label}, which is part of what you described.`;
}

const isGp = (p: Fittable) => (p.profession ?? "gp") === "gp";

/**
 * Reorder the allied entries among the positions they already hold, by fit descending (stable),
 * leaving every GP exactly where the engine ranked it. With no need, the list is returned as is.
 */
export function orderByProblemFit<T extends Fittable>(ranked: readonly T[], need: Need | null): T[] {
  if (!need) return [...ranked];
  const alliedPositions = ranked.map((p, i) => (isGp(p) ? -1 : i)).filter((i) => i >= 0);
  const allied = alliedPositions.map((i) => ranked[i]!);
  const sorted = allied.map((p, i) => ({ p, i, fit: problemFit(p, need) })).sort((a, b) => b.fit - a.fit || a.i - b.i).map((x) => x.p);
  const out = [...ranked];
  alliedPositions.forEach((pos, k) => { out[pos] = sorted[k]!; });
  return out;
}
