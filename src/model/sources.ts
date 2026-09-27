// Where an axis came from, said in words (docs/design/ux-evaluation-2026-09/PLAN.md W4). A need's
// sources are ids: "onboarding", a run's module id, "survey:…", "lives:…" for a character a person
// said is like them, and "goal:…". The sheet names them by kind and counts them in words, because
// the map carries no digits. At most two kinds are named, so the line is seven words at most.

const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n: number) => COUNT[n] ?? "many";

type Kind = "first" | "survey" | "run" | "character" | "goal";

function kindOf(source: string): Kind {
  if (source === "onboarding") return "first";
  if (source.startsWith("survey:")) return "survey";
  if (source.startsWith("lives:")) return "character";
  if (source.startsWith("goal:")) return "goal";
  return "run";
}

const PHRASE: Record<Kind, (n: number) => string> = {
  first: () => "your first answers",
  survey: (n) => (n === 1 ? "a check-in" : `${count(n)} check-ins`),
  run: (n) => `${count(n)} ${n === 1 ? "game" : "games"}`,
  character: (n) => (n === 1 ? "a character" : `${count(n)} characters`),
  goal: (n) => (n === 1 ? "a goal" : `${count(n)} goals`),
};

const ORDER: readonly Kind[] = ["first", "survey", "run", "character", "goal"];

/** The most kinds a line names, in `ORDER`. The longest line is "From your first answers and two goals." */
const MAX_KINDS = 2;

/**
 * "From your first answers and one game." Null when nothing is on file for the axis. `firstOnly`
 * names just the first kind, for a sheet that also shows "What you tried" and has fewer words to spare.
 */
export function sourceLine(sources: readonly string[], firstOnly = false): string | null {
  const counts = new Map<Kind, number>();
  for (const s of new Set(sources)) counts.set(kindOf(s), (counts.get(kindOf(s)) ?? 0) + 1);
  const parts = ORDER.filter((k) => counts.has(k)).map((k) => PHRASE[k](counts.get(k)!)).slice(0, firstOnly ? 1 : MAX_KINDS);
  if (parts.length === 0) return null;
  return `From ${parts.join(" and ")}.`;
}
