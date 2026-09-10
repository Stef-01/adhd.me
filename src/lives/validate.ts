// §110: content validation. Broken references fail CI (src/lives/lives.test.ts calls this).
import { CHARACTER_IDS, INPUT_MECHANICS, LEARNING_DOMAINS, MECHANIC_ENGINES, type GameDefinition, type LearningModule, type StrategyDefinition } from "./types";

export interface ContentProblem { readonly where: string; readonly problem: string }

const ACTIVE_MS = { min: 2500, max: 7000 } as const;
const MODULE_MINUTES = { min: 1, max: 12 } as const;

export function validateContent(games: readonly GameDefinition[], strategies: readonly StrategyDefinition[], modules: readonly LearningModule[]): ContentProblem[] {
  const out: ContentProblem[] = [];
  const add = (where: string, problem: string) => out.push({ where, problem });
  const ids = (list: readonly { id: string }[], where: string) => {
    const seen = new Set<string>();
    for (const item of list) { if (seen.has(item.id)) add(`${where}/${item.id}`, "duplicate id"); seen.add(item.id); }
    return seen;
  };
  const gameIds = ids(games, "game");
  const strategyIds = ids(strategies, "strategy");
  const moduleIds = ids(modules, "module");
  for (const g of games) {
    if (!MECHANIC_ENGINES.includes(g.engine)) add(`game/${g.id}`, `unsupported engine ${g.engine}`);
    if (!INPUT_MECHANICS.includes(g.mechanic)) add(`game/${g.id}`, `unsupported mechanic ${g.mechanic}`);
    if (g.character !== "random" && !CHARACTER_IDS.includes(g.character)) add(`game/${g.id}`, `unknown character ${g.character}`);
    if (g.config.kind !== g.engine) add(`game/${g.id}`, `config ${g.config.kind} does not match engine ${g.engine}`);
    // The founder's multi-wave Leo challenge is a longer round; other microgames keep their bounds.
    const maxActiveMs = g.id === "leo_mosquito" ? 22000 : ACTIVE_MS.max;
    if (g.activeMs < ACTIVE_MS.min || g.activeMs > maxActiveMs) add(`game/${g.id}`, `active ${g.activeMs}ms outside ${ACTIVE_MS.min}–${maxActiveMs}`);
    if (g.instruction.trim().split(/\s+/).length > 4) add(`game/${g.id}`, "instruction longer than four words");
    if (g.character === "random" && g.learningLinks.length) add(`game/${g.id}`, "a fun game carries no learning");
    for (const link of g.learningLinks) if (!strategyIds.has(link)) add(`game/${g.id}`, `learning link ${link} is not a strategy`);
  }
  for (const s of strategies) {
    if (!moduleIds.has(s.moduleId)) add(`strategy/${s.id}`, `module ${s.moduleId} does not exist`);
    for (const d of s.domains) if (!LEARNING_DOMAINS.includes(d)) add(`strategy/${s.id}`, `unknown domain ${d}`);
    for (const c of s.characterIds) if (!CHARACTER_IDS.includes(c)) add(`strategy/${s.id}`, `unknown character ${c}`);
    for (const g of s.relatedGameIds) if (!gameIds.has(g)) add(`strategy/${s.id}`, `related game ${g} does not exist`);
    if (!s.claim.trim()) add(`strategy/${s.id}`, "no claim");
  }
  for (const m of modules) {
    if (m.blocks.length === 0) add(`module/${m.id}`, "no blocks");
    if (m.estimatedMinutes < MODULE_MINUTES.min || m.estimatedMinutes > MODULE_MINUTES.max) add(`module/${m.id}`, `estimated ${m.estimatedMinutes} min outside ${MODULE_MINUTES.min}–${MODULE_MINUTES.max}`);
    if (!m.blocks.some((b) => b.type === "action_plan")) add(`module/${m.id}`, "no action plan: the person must leave with one action (§70)");
    for (const d of m.domains) if (!LEARNING_DOMAINS.includes(d)) add(`module/${m.id}`, `unknown domain ${d}`);
    for (const b of m.blocks) {
      if (b.type === "audio" && (!b.audioAssetId || !b.transcriptId)) add(`module/${m.id}`, "audio without asset or transcript");
      if (b.type === "scenario" && b.choices.length < 2) add(`module/${m.id}`, "scenario with fewer than two choices");
      if (b.type === "timer" && b.durationSeconds <= 0) add(`module/${m.id}`, "timer without a duration");
    }
    if (!strategies.some((s) => s.moduleId === m.id)) add(`module/${m.id}`, "no strategy points at this module");
  }
  return out;
}
