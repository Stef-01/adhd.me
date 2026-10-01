// First steps for a parent (docs/matching/CHILD-FLOWS.md): above the list, three short steps chosen
// by what a request about a child was read as asking for. The steps are about what to do, never
// about the child, and each is grounded in the plan's sources (AADPA guideline, NCCD, Medicare).
// Also for a woman at midlife (docs/matching/MIDLIFE-FLOW.md) and for someone autistic as well as
// ADHD. Nothing shows for any other request.

const CHILD = "care:child-adolescent-adhd";

export type Scenario = "wears-off" | "assessment" | "worry" | "friends" | "sensory" | "behaviour" | "focus" | "school" | "start" | "midlife-find" | "midlife-medication" | "midlife-days" | "audhd-assessment" | "audhd";

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
  // Midlife: the GP menopause health assessment (MBS 695, from 1 July 2025) is the visit both questions fit in.
  "midlife-find": ["Ask for the menopause health check", "Ask about ADHD in that visit", "Note what changed, and when"],
  "midlife-medication": ["Ask your prescriber for a review", "Book the menopause health check", "Ask them to share care"],
  "midlife-days": ["Raise sleep with your GP", "A psychologist who knows midlife ADHD", "One thing off the list"],
  "audhd-assessment": ["Ask for an assessment covering both", "Ask for a quiet appointment", "Bring notes, ask for writing"],
  audhd: ["Ask for a quiet appointment", "Ask for answers in writing", "Pace sessions around your energy"],
};

/** Midlife said in the words: the change itself, or an age in the late forties or fifties. */
export const MIDLIFE = /\b(peri-?menopaus\w*|menopaus\w*|post-?menopaus\w*|the change|hot (flush|flash)\w*|night sweats|hrt|mht|periods? (have |has )?(stopped|changed)|in my (late )?(forties|fifties)|(4[5-9]|5\d)(?! ?(km|min\w*|hours?|\$|dollars))\b)/i;

/** The scenario a request's keys (and, for midlife, its words) fit, most specific first; null when none does. */
export function scenarioFor(keys: readonly string[], words = ""): Scenario | null {
  const has = (tag: string) => keys.includes(`care:${tag}`);
  if (!keys.includes(CHILD)) {
    if (has("womens-health") && MIDLIFE.test(words)) return has("titration") || has("shared-care") ? "midlife-medication" : has("adhd-assessment") ? "midlife-find" : "midlife-days";
    if (has("autism-adhd")) return has("adhd-assessment") ? "audhd-assessment" : "audhd";
    return null;
  }
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

export function firstSteps(keys: readonly string[], words = ""): FirstSteps | null {
  const scenario = scenarioFor(keys, words);
  return scenario ? { scenario, steps: STEPS[scenario] } : null;
}
