// The map (founder, 2026-09-19): the person's own picture as the six axes the founder drew,
// across five areas of a life — the one reading every screen in the My ADHD tab is drawn from.
//
// WHAT THIS IS NOT. It is not a second model and it stores nothing. `deriveNeeds` already holds
// the four things the direction asked for about every need — does it happen (signal strength and
// persistence), does it cost anything (functional cost), do you want it changed (priority), and
// how much evidence is there (confidence). This file is one more reading of that, the way
// `src/wellness/map.ts` is: it groups needs into cells, gives each cell a WORD, and gives each
// aspect a reach for the radar to draw.
//
// THE TWO NUMBERS ARE DIFFERENT QUESTIONS, and confusing them would invert the product.
//
//   REACH is how much you have BUILT on an aspect. It is `RUNG_REACH`, imported from the wellness
//   map rather than restated, and it climbs because you named something, went through a run, kept
//   a strategy, said it worked. Outward means you have got somewhere. The founder's design system
//   says so in as many words — "outward dimensional sprawl signifies stability and ease, framing
//   ADHD characteristics around resilience and environmental fit rather than pathology" — and a
//   polygon that grew because somebody was struggling would say the exact opposite.
//
//   STATUS is how that part of life is GOING, in one of five words a person would use about
//   themselves. It never renders as a number and never reads as a diagnosis.
//
// They are orthogonal and both true. A long spike on `needs-support` is somebody who has worked at
// this and still finds it hard, which is the strongest care-navigation signal the product has. A
// short spike on `working-well` is somebody who mentioned it once, it is fine, and nothing should
// be recommended.

import { INTERACTIVE_MODULES, type InteractiveModule } from "@/learn/interactive";
import type { LearningProfile } from "@/lives/types";
import { RUNG_REACH, type Rung } from "@/wellness/map";
import { DOMAIN_LABELS, type Domain, type Subdomain } from "./layers";
import { deriveNeeds, priorityScore, type Need } from "./needs";
import type { ModelRecord } from "./store";

/* ------------------------------------------------------------------ aspects */

/**
 * The six axes of the radar, exactly as the founder drew them in the My ADHD comp.
 *
 * They are deliberately not a tidy single taxonomy: three are aspects of functioning (Starting,
 * Focus, Organisation), one is a subdomain (Emotional regulation) and two are areas of a life
 * (Relationships, Sleep & energy). That is the founder's choice and it is the right one for a
 * person reading it — these are the six words somebody would use about their own week.
 */
export const ASPECTS = ["starting", "focus", "organisation", "emotional-regulation", "relationships", "sleep-energy"] as const;
export type Aspect = (typeof ASPECTS)[number];

export const ASPECT_LABELS: Readonly<Record<Aspect, string>> = {
  starting: "Starting",
  focus: "Focus",
  organisation: "Organisation",
  "emotional-regulation": "Emotional regulation",
  relationships: "Relationships",
  "sleep-energy": "Sleep & energy",
};

/** What each axis is, in the person's own language. The sheet shows it; the hub never does. */
export const ASPECT_MEANINGS: Readonly<Record<Aspect, string>> = {
  starting: "Getting going, especially on something vague.",
  focus: "Staying with a thing, and getting back after an interruption.",
  organisation: "Time, structure, and what falls out of mind.",
  "emotional-regulation": "How fast feelings arrive, and how long they settle.",
  relationships: "The people who carry part of the load.",
  "sleep-energy": "Sleep, movement and energy.",
};

/**
 * Which axis a subdomain is evidence about. Total over `Subdomain` by type, so a new subdomain is
 * a compile error rather than a silent hole in the map.
 *
 * `memory` sits under Organisation rather than on an axis of its own, which is the comp's own
 * reading: its Organisation panel says "admin and household filings create prospective memory
 * fatigue". Remembering is a column in the founder's written matrix and not an axis in the
 * founder's drawn one; the drawn one is the newer artefact and this follows it.
 */
export const ASPECT_OF: Readonly<Record<Subdomain, Aspect>> = {
  // Starting
  activation: "starting",
  "deadline-design": "starting",
  // Focus
  attention: "focus",
  switching: "focus",
  noise: "focus",
  // Organisation — including prospective memory
  memory: "organisation",
  time: "organisation",
  structure: "organisation",
  workload: "organisation",
  "living-environment": "organisation",
  "study-context": "organisation",
  "workplace-context": "organisation",
  // Emotional regulation
  "emotional-regulation": "emotional-regulation",
  inhibition: "emotional-regulation",
  // Relationships
  partner: "relationships",
  family: "relationships",
  manager: "relationships",
  teachers: "relationships",
  peers: "relationships",
  clinicians: "relationships",
  // Sleep & energy
  sleep: "sleep-energy",
  movement: "sleep-energy",
  appetite: "sleep-energy",
  energy: "sleep-energy",
  "medication-experience": "sleep-energy",
};

/* -------------------------------------------------------------------- areas */

/**
 * The five areas of a life. `DOMAINS` minus `understand`, which is the education domain and not a
 * part of anybody's life — a module about what ADHD is belongs to the area it is about for you,
 * which `areaOf` works out.
 */
export const AREAS = ["work-study", "relationships", "daily-life", "mind-emotions", "sleep-body"] as const;
export type Area = (typeof AREAS)[number];

export const AREA_LABELS: Readonly<Record<Area, string>> = {
  "work-study": DOMAIN_LABELS["work-study"],
  relationships: DOMAIN_LABELS.relationships,
  "daily-life": DOMAIN_LABELS["daily-life"],
  "mind-emotions": DOMAIN_LABELS["mind-emotions"],
  "sleep-body": DOMAIN_LABELS["sleep-body"],
};

const IS_AREA = new Set<string>(AREAS);

/** Where the person said it lands, when a module did not say. */
const AFFECTS_AREA: Readonly<Record<string, Area>> = {
  work: "work-study",
  study: "work-study",
  home: "daily-life",
  relationships: "relationships",
  health: "sleep-body",
  wellbeing: "mind-emotions",
};

/** The `where` answer on the first module, which asks the same question in other words. */
const WHERE_AREA: Readonly<Record<string, Area>> = {
  work: "work-study",
  study: "work-study",
  home: "daily-life",
  relationships: "relationships",
};

/**
 * The area a need belongs to. A need whose domain is one of the five says so itself. A need from
 * the `understand` modules is attributed to the area the person named at the door, then to the
 * first module's own `where` answer, and only then to work and study — which is where the
 * onboarding's own default sits.
 */
export function areaOf(need: Need, record: ModelRecord): Area {
  if (IS_AREA.has(need.domain)) return need.domain as Area;
  const affects = record.onboarding?.affects;
  if (affects && AFFECTS_AREA[affects]) return AFFECTS_AREA[affects]!;
  const where = record.answers["context.where"];
  for (const value of Array.isArray(where) ? where : [where]) {
    if (typeof value === "string" && WHERE_AREA[value]) return WHERE_AREA[value]!;
  }
  return "work-study";
}

/* ------------------------------------------------------------------- status */

export type CellStatus =
  | "unexplored"
  | "still-learning"
  | "working-well"
  | "mostly-supported"
  | "worth-improving"
  | "needs-support";

/**
 * The five words a person would use about themselves, as the comp labels them.
 *
 * `unexplored` has no word on purpose: an absence is rendered as an absence, because naming it
 * would put the gap on the person rather than on the app, which has not asked.
 *
 * MOSTLY SUPPORTED is the fifth word and it earns its place: it is the difference between "there
 * is nothing here" (working well) and "there is something here and you have it handled" — which
 * is a thing somebody has built, and the map should say so.
 */
export const STATUS_LABEL: Readonly<Record<CellStatus, string>> = {
  unexplored: "",
  "still-learning": "Still learning",
  "working-well": "Working well",
  "mostly-supported": "Mostly supported",
  "worth-improving": "Worth improving",
  "needs-support": "Needs support",
};

/** Which status leads when one axis holds several. Support first; an absence last. */
const STATUS_RANK: Readonly<Record<CellStatus, number>> = {
  "needs-support": 5,
  "worth-improving": 4,
  "mostly-supported": 3,
  "still-learning": 2,
  "working-well": 1,
  unexplored: 0,
};

const COST_LOW = 3;
const COST_HIGH = 7;
const STRENGTH_COST_CEILING = 5;

/**
 * One cell's word, from the best need standing on it.
 *
 * `working-well` is the row that makes "a strong pattern that is not a problem" true. Somebody who
 * says they hyperfocus constantly and that it costs them nothing gets a filled cell that reaches
 * outward and generates no recommendation, because `escalationEligible` never sees it.
 */
export function statusFor(needs: readonly Need[], touchedByContributor: boolean): CellStatus {
  const best = needs[0];
  if (!best) return touchedByContributor ? "still-learning" : "unexplored";
  if (best.confidence === "low") return "still-learning";
  if (best.userPriority === "no") return "working-well";
  if (best.functionalCost <= COST_LOW) return "working-well";
  if (best.strengths.length > 0 && best.functionalCost < STRENGTH_COST_CEILING) return "working-well";
  // Worked at and still costly is the strongest care-navigation signal the product has, so it
  // outranks "you have it handled" rather than being softened by it.
  if (best.functionalCost >= COST_HIGH && best.userPriority === "yes") return "needs-support";
  if (best.strategies.some((st) => st.outcome === "a-lot")) return "mostly-supported";
  return "worth-improving";
}

/* -------------------------------------------------------------------- cells */

export interface Cell {
  readonly area: Area;
  readonly aspect: Aspect;
  readonly status: CellStatus;
  /** A strength named here by a module or a survey. Null until something here is finished. */
  readonly strength: string | null;
  /** What put it on this word, said as the act the person took. Empty when unexplored. */
  readonly because: string;
  /** The needs standing on this cell, strongest first. */
  readonly needs: readonly Need[];
}

export interface AxisPoint {
  readonly aspect: Aspect;
  readonly rung: Rung;
  /** 0–1, what the polygon draws. How much you have built here — never how badly it is going. */
  readonly reach: number;
  /** Too little to place: the spoke goes dotted and the polygon detaches from this node. */
  readonly stillLearning: boolean;
  readonly status: CellStatus;
  readonly strength: string | null;
}

/** The modules that teach an aspect. The only route from a module to the map. */
export function modulesOnAspect(aspect: Aspect): readonly InteractiveModule[] {
  return INTERACTIVE_MODULES.filter((m) => m.targets.some((t) => ASPECT_OF[t] === aspect));
}

function becauseFor(status: CellStatus, rung: Rung, need: Need | undefined): string {
  if (status === "unexplored") return "";
  if (status === "working-well") {
    if (need?.userPriority === "no") return "You said this is not something you want to change.";
    return "You said this one is going well enough.";
  }
  if (status === "mostly-supported") return "You are carrying something here that works.";
  if (status === "still-learning") return "Only one thing points here so far.";
  if (rung === "working") return "You said a strategy here worked.";
  if (rung === "kept") return "You are carrying a strategy from here.";
  if (rung === "explored") return "You went through a run about this.";
  return "You said this happens to you.";
}

interface Evidence {
  finished: Set<string>;
  kept: Set<string>;
  worked: Set<string>;
  resonated: Set<string>;
}

function evidenceIn(record: ModelRecord, profile: LearningProfile | null): Evidence {
  const kept = new Set<string>();
  const worked = new Set<string>();
  for (const e of record.experiments) {
    kept.add(e.moduleId);
    if (e.outcome === "a-lot") worked.add(e.moduleId);
  }
  return {
    finished: new Set([...(record.completed ?? []), ...(profile?.completedModuleIds ?? [])]),
    kept,
    worked,
    resonated: new Set(Object.keys(record.resonance ?? {})),
  };
}

function rungForAspect(aspect: Aspect, ev: Evidence, named: boolean): Rung {
  const ids = modulesOnAspect(aspect).map((m) => m.id);
  const hit = (set: Set<string>) => ids.some((id) => set.has(id));
  if (hit(ev.worked)) return "working";
  if (hit(ev.kept)) return "kept";
  if (hit(ev.finished)) return "explored";
  if (named || hit(ev.resonated)) return "named";
  return "unmapped";
}

/**
 * Every need read once, grouped by the cell it stands on, plus the cells a contributor merely
 * touches. Contributors matter because a difficulty in one part of a life very often has its lever
 * in another, which is the whole point of the four-layer model underneath.
 */
function group(record: ModelRecord): {
  byCell: Map<string, Need[]>;
  touched: Set<string>;
  byAspect: Map<Aspect, Need[]>;
  all: Need[];
} {
  // A record reaching here is always whole, but this runs on a render path and a map that throws
  // takes the page with it, which is a worse failure than a map with one fewer word on it.
  let all: Need[] = [];
  try {
    all = deriveNeeds(record);
  } catch {
    all = [];
  }
  const byCell = new Map<string, Need[]>();
  const byAspect = new Map<Aspect, Need[]>();
  const touched = new Set<string>();
  for (const need of all) {
    const area = areaOf(need, record);
    const aspect = ASPECT_OF[need.subdomain];
    const key = `${area}:${aspect}`;
    byCell.set(key, [...(byCell.get(key) ?? []), need]);
    byAspect.set(aspect, [...(byAspect.get(aspect) ?? []), need]);
    for (const c of need.contributors) {
      touched.add(`${area}:${ASPECT_OF[c.subdomain]}`);
    }
  }
  return { byCell, touched, byAspect, all };
}

/** Thirty cells, always, in (area, aspect) order. */
export function matrix(record: ModelRecord, profile: LearningProfile | null = null): Cell[] {
  const { byCell, touched } = group(record);
  const ev = evidenceIn(record, profile);
  const out: Cell[] = [];
  for (const area of AREAS) {
    for (const aspect of ASPECTS) {
      const key = `${area}:${aspect}`;
      const needs = (byCell.get(key) ?? []).slice().sort((a, b) => priorityScore(b) - priorityScore(a));
      const status = statusFor(needs, touched.has(key));
      const rung = rungForAspect(aspect, ev, needs.length > 0);
      const done = modulesOnAspect(aspect).find((m) => ev.finished.has(m.id) || ev.worked.has(m.id) || ev.kept.has(m.id));
      out.push({
        area,
        aspect,
        status,
        strength: needs[0]?.strengths[0] ?? done?.strength ?? null,
        because: becauseFor(status, rung, needs[0]),
        needs,
      });
    }
  }
  return out;
}

/** Six points, always, in `ASPECTS` order. The radar's only input. */
export function axes(record: ModelRecord | null, profile: LearningProfile | null = null): AxisPoint[] {
  if (!record) {
    return ASPECTS.map((aspect) => ({
      aspect,
      rung: "unmapped" as Rung,
      reach: RUNG_REACH.unmapped,
      stillLearning: true,
      status: "unexplored" as CellStatus,
      strength: null,
    }));
  }
  const { byAspect, touched } = group(record);
  const ev = evidenceIn(record, profile);
  const touchedAspects = new Set([...touched].map((k) => k.split(":")[1] as Aspect));
  return ASPECTS.map((aspect) => {
    const needs = (byAspect.get(aspect) ?? []).slice().sort((a, b) => priorityScore(b) - priorityScore(a));
    const rung = rungForAspect(aspect, ev, needs.length > 0);
    const status = statusFor(needs, touchedAspects.has(aspect));
    const done = modulesOnAspect(aspect).find((m) => ev.finished.has(m.id) || ev.worked.has(m.id) || ev.kept.has(m.id));
    return {
      aspect,
      rung,
      reach: RUNG_REACH[rung],
      // Nothing has reached this axis, or one source has and the model says so itself.
      stillLearning: rung === "unmapped" || status === "still-learning",
      status,
      strength: needs[0]?.strengths[0] ?? done?.strength ?? null,
    };
  });
}

/* ---------------------------------------------------------------- the views */

export interface AspectView {
  readonly aspect: Aspect;
  readonly point: AxisPoint;
  /** The five areas, in `AREAS` order. */
  readonly cells: Cell[];
  readonly top: Need | null;
  /** One line: where this is hardest and where it is not. Null when nothing is known. */
  readonly line: string | null;
  readonly helps: string[];
  readonly strengths: string[];
  /** The one thing the model is least sure of here, or null. */
  readonly learning: string | null;
}

const HARDEST_PHRASE: Readonly<Record<Area, string>> = {
  "work-study": "at work",
  relationships: "with people",
  "daily-life": "at home",
  "mind-emotions": "in how you feel",
  "sleep-body": "around sleep and energy",
};

export function aspectView(record: ModelRecord | null, aspect: Aspect, profile: LearningProfile | null = null): AspectView {
  const point = axes(record, profile).find((a) => a.aspect === aspect)!;
  if (!record) return { aspect, point, cells: [], top: null, line: null, helps: [], strengths: [], learning: null };
  const cells = matrix(record, profile).filter((c) => c.aspect === aspect);
  const ranked = cells.filter((c) => c.needs.length > 0).sort((a, b) => priorityScore(b.needs[0]!) - priorityScore(a.needs[0]!));
  const top = ranked[0]?.needs[0] ?? null;
  const hardest = ranked[0]?.area;
  const easiest = [...cells].reverse().find((c) => c.status === "working-well")?.area;
  const line =
    hardest && easiest && hardest !== easiest
      ? `Hardest ${HARDEST_PHRASE[hardest]}, easier ${HARDEST_PHRASE[easiest]}.`
      : hardest
        ? `Hardest ${HARDEST_PHRASE[hardest]}.`
        : null;
  const helps = [
    ...(top?.strategies.filter((s) => s.outcome === "a-lot").map((s) => s.title) ?? []),
    ...(top?.context.filter((c) => c.startsWith("Easier")).map((c) => c.replace(/^Easier /, "").replace(/^\w/, (ch) => ch.toUpperCase())) ?? []),
  ];
  const strengths = [...new Set(cells.flatMap((c) => (c.strength ? [c.strength] : [])))];
  const unsure = cells.find((c) => c.status === "still-learning" && c.needs.length > 0);
  const learning = unsure ? `Whether ${AREA_LABELS[unsure.area].toLowerCase()} belongs here too.` : null;
  return { aspect, point, cells, top, line, helps: helps.slice(0, 2), strengths: strengths.slice(0, 2), learning };
}

/** The hub's focus chips: the strongest needs, one per aspect, in priority order. */
export function currentFocus(record: ModelRecord | null, limit = 3): Array<{ need: Need; aspect: Aspect }> {
  if (!record) return [];
  const seen = new Set<Aspect>();
  const out: Array<{ need: Need; aspect: Aspect }> = [];
  for (const need of group(record).all) {
    const aspect = ASPECT_OF[need.subdomain];
    if (seen.has(aspect)) continue;
    seen.add(aspect);
    out.push({ need, aspect });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * The hub's one sentence. Authored per aspect and chosen by which aspect leads — never generated,
 * because a sentence the app writes about somebody's mind is the one thing this tree will not do.
 */
const STANDS_OUT: Readonly<Record<Aspect, string>> = {
  starting: "Starting is your biggest friction right now.",
  focus: "Staying with a thing is the harder half for you.",
  organisation: "Structure is the thing most often missing.",
  "emotional-regulation": "Feelings arriving fast is doing most of the work here.",
  relationships: "Most of this shows up with other people.",
  "sleep-energy": "Sleep and energy are under most of it.",
};

export function standsOut(record: ModelRecord | null): string | null {
  const focus = currentFocus(record, 1)[0];
  return focus ? STANDS_OUT[focus.aspect] : null;
}

/** Cells whose word changed between two records — what the map animation fills in. */
export function diff(before: ModelRecord, after: ModelRecord, profile: LearningProfile | null = null): Cell[] {
  const was = new Map(matrix(before, profile).map((c) => [`${c.area}:${c.aspect}`, c.status]));
  return matrix(after, profile).filter((c) => was.get(`${c.area}:${c.aspect}`) !== c.status);
}

/**
 * The aspects whose axis moved between two records — what the radar animates and what "your map
 * just got clearer" is counting.
 *
 * REACH OR WORD, because both are ways of getting clearer and only one of them is the shape. A
 * survey about work, answered by somebody who had already played the work runs, does not move
 * what they have BUILT — the reach is unchanged and that is honest. What it does move is how
 * sure the app is and what the axis is therefore called, which is the whole reason they answered
 * ten questions. Counting only reach would have made the reward silent for exactly the person who
 * had earned it most.
 */
export function movedAxes(before: ModelRecord, after: ModelRecord, profile: LearningProfile | null = null): Aspect[] {
  const was = new Map(axes(before, profile).map((a) => [a.aspect, `${a.reach}:${a.status}`]));
  return axes(after, profile)
    .filter((a) => was.get(a.aspect) !== `${a.reach}:${a.status}`)
    .map((a) => a.aspect);
}

/** The aspect to open on: the one furthest out, and the first of the six on a tie. */
export function leadAxis(points: readonly AxisPoint[]): AxisPoint {
  return [...points].sort((a, b) => b.reach - a.reach || STATUS_RANK[b.status] - STATUS_RANK[a.status])[0]!;
}
