"use client";

// Learn (PRD §28): not a textbook library. For you first — from explicit resonance, saved
// strategies and chosen goals — then the two-minute tools, then the shelves by life area. Each
// row is a strategy and opens its module; `?module=` opens the renderer in place.

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { recentlyCompleted, recommendStrategies, STRATEGIES, type LearningDomain, type StrategyDefinition } from "@/lives";
import { ModuleRenderer } from "./module-renderer";
import { useProfile } from "./profile-hook";
import { LeoBedroom } from "./leo-mosquito";

const SHELVES: ReadonlyArray<{ title: string; domains: readonly LearningDomain[] }> = [
  { title: "Sleep", domains: ["sleep"] },
  { title: "Work and study", domains: ["attention", "prioritisation", "working_memory"] },
  { title: "Relationships", domains: ["relationships", "communication"] },
  { title: "Getting things done", domains: ["task_initiation", "time_management", "transitions", "planning", "organisation"] },
  { title: "Managing overwhelm", domains: ["sensory_management", "emotional_regulation", "impulsivity", "environment"] },
  { title: "Understanding your ADHD", domains: ["mindfulness", "self_understanding"] },
];

export function LearnHome() {
  const params = useSearchParams();
  const router = useRouter();
  const moduleId = params.get("module");
  const { profile } = useProfile();
  const forYou = useMemo(() => {
    if (!profile) return [];
    return recommendStrategies({ encounteredGameIds: [], encounteredCharacterIds: [], resonanceSignals: profile.resonanceSignals, savedStrategyIds: profile.savedStrategyIds, completedModuleIds: profile.completedModuleIds, recentlyCompletedModuleIds: recentlyCompleted(profile), dismissedStrategyIds: profile.dismissedStrategyIds, selectedGoals: profile.selectedGoals }, STRATEGIES).filter((r) => r.score > 0);
  }, [profile]);

  if (moduleId) return <ModuleRenderer key={moduleId} moduleId={moduleId} onLeave={() => router.push("/lives/learn")} />;

  const quick = STRATEGIES.filter((s) => s.estimatedMinutes <= 2);
  return (
    <div className="me-screen learn-screen lives-screen">
      <header className="life-head">
        <span className="life-eyebrow">ADHD Lives</span>
        <h1 className="life-title">Learn</h1>
      </header>
      {forYou.length > 0 && <Shelf title="For you" strategies={forYou.map((r) => r.strategy)} done={profile?.completedModuleIds ?? []} />}
      <Link className="leo-feature" href="/lives/play/leo-mosquito"><span className="leo-feature-art"><LeoBedroom /></span><span><strong>One tiny sound.</strong><span>Play Leo’s moment <ArrowRight size={18} /></span></span></Link>
      <Shelf title="Two-minute tools" strategies={quick} done={profile?.completedModuleIds ?? []} />
      {SHELVES.map((shelf) => {
        const rows = STRATEGIES.filter((s) => s.domains.some((d) => shelf.domains.includes(d)) && !quick.includes(s));
        return rows.length ? <Shelf key={shelf.title} title={shelf.title} strategies={rows} done={profile?.completedModuleIds ?? []} /> : null;
      })}
    </div>
  );
}

function Shelf({ title, strategies, done }: { title: string; strategies: readonly StrategyDefinition[]; done: readonly string[] }) {
  return (
    <section className="lives-shelf" aria-labelledby={`shelf-${title.replace(/\W+/g, "-").toLowerCase()}`}>
      <h2 id={`shelf-${title.replace(/\W+/g, "-").toLowerCase()}`} className="lives-section-title">{title}</h2>
      <ul className="lives-rows">
        {strategies.map((s) => (
          <li key={s.id}>
            <Link className="lives-row" href={`/lives/learn?module=${encodeURIComponent(s.moduleId)}`} data-strategy={s.id}>
              <span className="lives-row-text"><strong>{s.title}</strong><span>{s.estimatedMinutes} min{done.includes(s.moduleId) ? " · done" : ""}</span></span>
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
