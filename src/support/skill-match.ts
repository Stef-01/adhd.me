import type { Clinician } from "@/demo/clinicians";
import type { Filters } from "@/finder/filters";
import { searchRoster } from "@/finder/pipeline";
import { resolvePlace } from "@/geo/suburbs";
import { deriveNeeds, type Need } from "@/model/needs";
import type { ModelRecord } from "@/model/store";
import { EXPERTISE_FOR, fitTags, problemFit, strengthFit } from "./problem-fit";
import { EXPERTISE_LABELS, type ExpertiseTag } from "./professions";
import type { Subdomain } from "@/model/layers";

export interface SkillMatch {
  provider: Clinician;
  skill: ExpertiseTag;
  label: string;
  subdomain: Subdomain;
  sources: readonly string[];
  basis: "your-answers" | "this-practice";
}

/** Exact declared skill first, contextual contributors second. Never invent expertise to fill a card. */
export function matchSkill(roster: readonly Clinician[], filters: Filters, record: ModelRecord, context?: Subdomain): SkillMatch | null {
  const reportedNeeds = deriveNeeds(record);
  if (context && reportedNeeds.some(n => n.subdomain === context && n.userPriority === "no")) return null;
  const needs = reportedNeeds.filter(n => n.userPriority !== "no");
  const candidates = searchRoster(roster, filters, "", resolvePlace(filters.place));
  const contextual: Need | undefined = context ? needs.find(n => n.subdomain === context) ?? {
    id: context, subdomain: context, domain: "daily-life", label: "", signalStrength: 0, functionalCost: 0,
    userPriority: "unknown", confidence: "low", contributors: [], strengths: [], context: [], strategies: [], sources: [], persistence: 0,
  } : undefined;
  for (const need of contextual ? [contextual] : needs) {
    const primary = EXPERTISE_FOR[need.subdomain] ?? [];
    const ranked = candidates.filter(p => p.expertise?.some(t => primary.includes(t)))
      .map(provider => ({ provider, score: problemFit(provider, need), strength: strengthFit(provider, need) }))
      .sort((a, b) => b.score - a.score || b.strength - a.strength || Number(Boolean(a.provider.synthetic)) - Number(Boolean(b.provider.synthetic)) || Number(Boolean(b.provider.image)) - Number(Boolean(a.provider.image)) || a.provider.id.localeCompare(b.provider.id));
    const provider = ranked[0]?.provider;
    if (!provider) continue;
    const skill = fitTags(provider, need).find(t => primary.includes(t))!;
    return { provider, skill, label: EXPERTISE_LABELS[skill], subdomain: need.subdomain,
      sources: need.sources, basis: need.sources.length ? "your-answers" : "this-practice" };
  }
  return null;
}
