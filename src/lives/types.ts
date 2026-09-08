// ADHD Lives (docs/adhd-lives/PRD-v2.md, ADR 0006): the engine's vocabulary. Renderer-independent —
// no React, no DOM — so the DOM player renders it now and a Skia renderer can later. Section
// numbers refer to the PRD.

/** §47: the eight lives. Maya is the same person as the existing bean. */
export const CHARACTER_IDS = ["maya", "leo", "arjun", "zoe", "theo", "mia", "jax", "nina"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

/** §45. */
export const INPUT_MECHANICS = ["tap", "tap_filter", "rapid_tap", "drag", "swipe", "trace", "hold", "hold_release", "no_input", "sequence", "wipe", "timing", "catch"] as const;
export type InputMechanic = (typeof INPUT_MECHANICS)[number];

/** §46: the ten reusable engines. A game is a configuration of one of these. */
export const MECHANIC_ENGINES = ["target_swat", "semantic_filter", "trace_path", "inhibition", "object_search", "goal_protection", "hold_release", "rapid_sorting", "wipe_scrub", "precision_timing"] as const;
export type MechanicEngine = (typeof MECHANIC_ENGINES)[number];

/** §11. Never exposed as clinical categories in gameplay. */
export const LEARNING_DOMAINS = ["attention", "working_memory", "task_initiation", "prioritisation", "time_management", "transitions", "impulsivity", "relationships", "communication", "emotional_regulation", "sleep", "sensory_management", "environment", "planning", "organisation", "mindfulness", "self_understanding"] as const;
export type LearningDomain = (typeof LEARNING_DOMAINS)[number];

/** §58: difficulty is several dimensions, never only speed. */
export interface DifficultyParameters {
  readonly timeMultiplier: number;
  readonly targetSpeed: number;
  readonly targetCount: number;
  readonly distractorCount: number;
  readonly distractorSimilarity: number;
  readonly hitRadiusMultiplier: number;
  readonly memoryLength: number;
  readonly pathWidthMultiplier: number;
}

/** A game in the registry: one engine, configured. `character` is "random" for the fun games (§56). */
export interface GameDefinition {
  readonly id: string;
  readonly title: string;
  readonly character: CharacterId | "random";
  readonly engine: MechanicEngine;
  readonly mechanic: InputMechanic;
  /** The instruction, shouted (§4): at most three words. */
  readonly instruction: string;
  /** ACTIVE phase length at difficulty 1, ms (§44: 2.5–7 s). */
  readonly activeMs: number;
  /** The engine's configuration: targets, distractors, a path, a button. Validated per engine. */
  readonly config: GameConfig;
  /** §31: strategies this game can bring to the end of a run. Empty for fun games. */
  readonly learningLinks: readonly string[];
  /** Difficulty levels this game is compatible with (§57.8). */
  readonly difficulty: { readonly min: number; readonly max: number };
  /** §57.5: mechanically obvious games may open a run. */
  readonly obvious: boolean;
}

export type GameConfig =
  | { readonly kind: "target_swat"; readonly targets: readonly string[]; readonly escalation?: readonly string[] }
  | { readonly kind: "semantic_filter"; readonly relevant: readonly string[]; readonly irrelevant: readonly string[]; readonly nearMiss?: readonly string[] }
  | { readonly kind: "trace_path"; readonly hazards: readonly string[]; readonly pathWidth: number }
  | { readonly kind: "inhibition"; readonly temptation: string; readonly taunts: readonly string[] }
  | { readonly kind: "object_search"; readonly goal: string; readonly decoys: readonly string[]; readonly remindBefore: boolean }
  | { readonly kind: "goal_protection"; readonly keep: string; readonly intruders: readonly string[] }
  | { readonly kind: "hold_release"; readonly verb: string; readonly releaseAt: string }
  | { readonly kind: "rapid_sorting"; readonly bins: readonly string[]; readonly items: readonly { readonly label: string; readonly bin: string }[] }
  | { readonly kind: "wipe_scrub"; readonly covering: string }
  | { readonly kind: "precision_timing"; readonly marks: readonly string[]; readonly hitIndex: number };

/** §85. */
export interface SessionState {
  readonly sessionId: string;
  readonly score: number;
  readonly lives: number;
  readonly difficulty: number;
  readonly currentGameId: string | null;
  readonly gameIndex: number;
  readonly completedGames: number;
  readonly successes: number;
  readonly recentGameIds: readonly string[];
  readonly recentMechanics: readonly InputMechanic[];
  readonly recentCharacters: readonly (CharacterId | "random")[];
  readonly encounteredGameIds: readonly string[];
  readonly encounteredCharacterIds: readonly CharacterId[];
  readonly encounteredLearningLinks: readonly string[];
  readonly startedAt: number;
  readonly over: boolean;
}

/** §86. Reaction time is recorded and never fed to learning (§86). */
export interface GameResult {
  readonly outcome: "success" | "failure" | "timeout";
  readonly reactionTimeMs?: number;
  readonly completionMs?: number;
  readonly allowedMs: number;
  readonly mistakes: number;
}

/** §23. */
export type EvidenceLevel = "established" | "supported" | "practical_consensus" | "experiential";
export interface StrategyDefinition {
  readonly id: string;
  readonly title: string;
  readonly shortDescription: string;
  readonly domains: readonly LearningDomain[];
  readonly estimatedMinutes: number;
  readonly characterIds: readonly CharacterId[];
  readonly relatedGameIds: readonly string[];
  readonly evidenceLevel: EvidenceLevel;
  readonly moduleId: string;
  readonly tags: readonly string[];
  readonly active: boolean;
  /** §77: the one claim the strategy makes, in the tone §79 asks for. */
  readonly claim: string;
  readonly reviewStatus: "pending" | "reviewed";
}

/** §24, §72–§75: blocks. */
export type LearningBlock =
  | { readonly type: "text"; readonly body: string }
  | { readonly type: "illustration"; readonly characterId: CharacterId; readonly caption: string }
  | { readonly type: "choice"; readonly prompt: string; readonly options: readonly string[] }
  | { readonly type: "reflection"; readonly prompt: string }
  | { readonly type: "interactive_practice"; readonly activityId: string; readonly instruction: string }
  | { readonly type: "timer"; readonly durationSeconds: number; readonly label: string; readonly allowSkip: boolean }
  | { readonly type: "audio"; readonly audioAssetId: string; readonly durationSeconds: number; readonly transcriptId: string; readonly allowBackgroundPlayback: boolean }
  | { readonly type: "checklist"; readonly items: readonly { readonly id: string; readonly label: string }[]; readonly allowCustomItems: boolean }
  | { readonly type: "scenario"; readonly characterId: CharacterId; readonly prompt: string; readonly choices: readonly { readonly id: string; readonly text: string; readonly feedback: string }[] }
  | { readonly type: "action_plan"; readonly prompt: string; readonly options: readonly string[] };

export interface EvidenceReference {
  readonly type: "guideline" | "systematic_review" | "randomized_trial" | "expert_consensus" | "clinical_practice";
  readonly citation: string;
  readonly url?: string;
}

export interface LearningModule {
  readonly id: string;
  readonly version: number;
  readonly title: string;
  readonly description: string;
  readonly estimatedMinutes: number;
  readonly domains: readonly LearningDomain[];
  readonly blocks: readonly LearningBlock[];
  readonly sources?: readonly EvidenceReference[];
  readonly reviewedBy?: readonly string[];
  readonly safetyCategory?: "general" | "wellbeing" | "requires_disclaimer";
}

/** §35: the ethically appropriate basis for personalisation. */
export interface ResonanceSignal {
  readonly sourceType: "game" | "character" | "moment";
  readonly sourceId: string;
  readonly response: "this_is_me" | "sometimes" | "not_me";
  readonly createdAt: number;
}

/** §30. */
export interface SavedLearningItem {
  readonly strategyId: string;
  readonly savedAt: number;
  readonly source: "score_screen" | "character" | "learn" | "module";
  readonly relatedCharacterId?: CharacterId;
  readonly relatedGameId?: string;
  readonly status: "saved" | "started" | "completed" | "dismissed";
}

/** §64. */
export interface PersonalStrategy {
  readonly strategyId: string;
  readonly addedAt: number;
  readonly status: "saved" | "trying" | "useful" | "not_useful";
  readonly customNote?: string;
  readonly personalConfig?: Readonly<Record<string, string | readonly string[] | boolean>>;
}

/** §63. Device-local (§65). */
export interface LearningProfile {
  readonly v: 1;
  readonly savedStrategyIds: readonly string[];
  readonly completedModuleIds: readonly string[];
  readonly startedModuleIds: readonly string[];
  readonly dismissedStrategyIds: readonly string[];
  readonly resonanceSignals: readonly ResonanceSignal[];
  readonly selectedGoals: readonly LearningDomain[];
  readonly personalStrategies: readonly PersonalStrategy[];
  readonly saved: readonly SavedLearningItem[];
  readonly highScore: number;
  /** Module ids completed with a timestamp, for §34's "completed recently". */
  readonly completedAt: Readonly<Record<string, number>>;
}

/** §31. */
export interface RecommendationContext {
  readonly encounteredGameIds: readonly string[];
  readonly encounteredCharacterIds: readonly CharacterId[];
  readonly resonanceSignals: readonly ResonanceSignal[];
  readonly savedStrategyIds: readonly string[];
  readonly completedModuleIds: readonly string[];
  readonly recentlyCompletedModuleIds: readonly string[];
  readonly dismissedStrategyIds: readonly string[];
  readonly selectedGoals: readonly LearningDomain[];
}

/** §87. */
export const DESIGN_WIDTH = 390;
export const DESIGN_HEIGHT = 844;
