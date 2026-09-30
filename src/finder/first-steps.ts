// First steps for a parent (docs/matching/CHILD-FLOWS.md): above the list, three short steps chosen
// by what a request about a child was read as asking for. The steps are about what to do, never
// about the child, and each is grounded in the plan's sources (AADPA guideline, NCCD, Medicare).
// Nothing shows when the request is not about a child.

const CHILD = "care:child-adolescent-adhd";

export type Scenario = "wears-off" | "assessment" | "worry" | "friends" | "sensory" | "behaviour" | "focus" | "school" | "start";

export interface FirstSteps {
  scenario: Scenario;
  steps: readonly [string, string, string];
}

/** Good care for a child weighs skills, school support and medication together (AADPA guideline). */
const BALANCED = "Skills and medication, weighed together";

const STEPS: Record<Scenario, FirstSteps["steps"]> = {
  "wears-off": ["Note when it wears off", "Ask about longer-acting options", "Hard subjects before lunch"],
  assessment: ["Ask school for written notes", "A GP, then a paediatrician", BALANCED],
  worry: ["Ask for a return-to-school plan", "A GP plan funds psychology", "Same mornings, small steps back"],
  friends: ["Ask school about a buddy", "A psychologist builds social skills", "One planned playdate a week"],
  sensory: ["Ask about typing and headphones", "See an occupational therapist", "Headphones at homework time"],
  behaviour: ["A behaviour plan, not suspension", "Start with a parent program", "A GP can refer"],
  focus: ["Ask for chunked, written tasks", "A coach builds study routines", "Short homework blocks, one place"],
  school: ["Request a learning support meeting", "Start with a GP visit", BALANCED],
  start: ["Start with a GP visit", "Ask what school sees", BALANCED],
};

/** The scenario a child request's keys fit, most specific first; null when it is not about a child. */
export function scenarioFor(keys: readonly string[]): Scenario | null {
  const has = (tag: string) => keys.includes(`care:${tag}`);
  if (!keys.includes(CHILD)) return null;
  if (has("titration")) return "wears-off";
  if (has("adhd-assessment")) return "assessment";
  if (has("anxiety")) return "worry";
  if (has("social-connection")) return "friends";
  if (has("autism-adhd")) return "sensory";
  if (has("emotional-regulation") || has("parenting")) return "behaviour";
  if (has("executive-function")) return "focus";
  if (has("study-school")) return "school";
  return "start";
}

export function firstSteps(keys: readonly string[]): FirstSteps | null {
  const scenario = scenarioFor(keys);
  return scenario ? { scenario, steps: STEPS[scenario] } : null;
}
