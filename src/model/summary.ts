// The one-page summary a person can take to a GP (founder, 2026-09-19: "make the GP export one
// tap"), built entirely out of rows the record already holds and the person's own words.
//
// THE RULE THIS LIVES UNDER. `src/referrals/document.ts` states the gate the tree applies to every
// document it produces: NO CLINICAL TEXT THAT ADHD.ME AUTHORS, TEMPLATES OR GENERATES. A summary
// handed to a doctor is exactly the artefact that rule exists for, so there is no narrative here
// and no sentence about the person. Every line this file emits is one of three things:
//
//   1. a STRUCTURED ROW the record already holds — a need's label, a contributor's note, a
//      strategy title and how it went, the name of a kind of professional the app already showed
//      this person on their own screen;
//   2. the PERSON'S OWN WORDS, verbatim — their manual, their medication note, the goal they set;
//   3. a SECTION HEADING.
//
// `summaryText` therefore contains no sentence templates, and `summary.test.ts` asserts of every
// line it emits that it is one of those three. That is the machine-checkable form of the rule.
//
// NOTHING LEAVES THE DEVICE. The text is built here, rendered in the browser, and copied, printed
// or downloaded by the person. There is no endpoint, and "share securely" is not built because it
// would need a record that outlives the device — the open question in ADR 0008.

import { profession, type Profession } from "@/support/professions";
import { hasPlan, suggestFor } from "./care-plan";
import { ADJUSTMENT_TRACKS, trackForSubdomain } from "./adjustments";
import { ASPECT_LABELS, STATUS_LABEL, areaOf, matrix, type Area } from "./matrix";
import { AREA_LABELS } from "./matrix";
import { deriveNeeds, priorityScore, type Need } from "./needs";
import { escalationEligible, professionsFor } from "./recommend";
import type { ExperimentOutcome, ModelRecord } from "./store";

/** Who the person says they are taking it to. Emphasis changes; the facts never do. */
export const AUDIENCES = ["gp", "psychologist", "work", "self"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Readonly<Record<Audience, string>> = {
  gp: "My GP",
  psychologist: "A psychologist",
  work: "Work or university",
  self: "Myself",
};

/** The heading each section carries in the document. */
export const SECTION_HEADINGS = {
  priority: "Current priority",
  highestImpact: "Highest-impact needs",
  context: "Context",
  helps: "What appears to help",
  tried: "Strategies already tried",
  otherAreas: "Other areas",
  goal: "My goal",
  carePlan: "Care plan",
  supports: "Potential supports for consideration",
  ownWords: "In my own words",
} as const;

export type SectionKey = keyof typeof SECTION_HEADINGS;

export const SECTION_ORDER: readonly SectionKey[] = [
  "priority",
  "highestImpact",
  "context",
  "helps",
  "tried",
  "otherAreas",
  "goal",
  // Before the supports, because a plan is the mechanism the supports below are reached through.
  "carePlan",
  "supports",
  "ownWords",
];

export interface TriedRow {
  readonly title: string;
  readonly outcome: ExperimentOutcome | "pending";
}

export interface GpSummary {
  readonly audience: Audience;
  /** The leading need's own label, and where it sits. Never a sentence about the person. */
  readonly priority: string | null;
  readonly highestImpact: readonly string[];
  readonly context: readonly string[];
  readonly helps: readonly string[];
  readonly tried: readonly TriedRow[];
  readonly otherAreas: readonly string[];
  readonly goal: string | null;
  /**
   * The person's own plan numbers and the kinds they are considering — rows off the record, never
   * a drafted request. Empty when they have not told us about a plan, which is most people.
   * No amount of money, ever: `src/model/care-plan.ts` says why, and its test enforces it.
   */
  readonly carePlan: { readonly allows: number; readonly used: number; readonly considering: readonly Profession[] } | null;
  readonly supports: readonly Profession[];
  /** The person's own text, verbatim, never edited and never summarised. */
  readonly ownWords: readonly string[];
}

const OUTCOME_WORD: Readonly<Record<ExperimentOutcome | "pending", string>> = {
  "a-lot": "helped a lot",
  "a-little": "helped a little",
  no: "did not help",
  "didnt-try": "not tried yet",
  pending: "still testing",
};

const IMPACT_COST_FLOOR = 5;
const MAX_IMPACT = 3;
const MAX_CONTEXT = 4;
const MAX_TRIED = 6;

/** Which areas each audience leads with. Emphasis only: nothing is added and nothing is hidden. */
const AUDIENCE_LEAD: Readonly<Record<Audience, readonly Area[]>> = {
  gp: [],
  psychologist: ["mind-emotions", "relationships"],
  work: ["work-study"],
  self: [],
};

function orderForAudience(needs: readonly Need[], record: ModelRecord, audience: Audience): Need[] {
  const lead = AUDIENCE_LEAD[audience];
  if (lead.length === 0) return [...needs];
  const rank = (n: Need) => {
    const i = lead.indexOf(areaOf(n, record));
    return i === -1 ? lead.length : i;
  };
  return [...needs].sort((a, b) => rank(a) - rank(b) || priorityScore(b) - priorityScore(a));
}

/**
 * The summary, from the record alone.
 *
 * `matched` providers are deliberately absent. The brief makes them an optional section the person
 * opts into, and an opt-in that defaults to on is not an opt-in — so the finder's own results are
 * not read here at all.
 */
export function gpSummary(record: ModelRecord, audience: Audience = "gp"): GpSummary {
  const all = deriveNeeds(record);
  const ordered = orderForAudience(all, record, audience);
  const top = ordered[0] ?? null;

  const priority = top ? `${top.label} (${AREA_LABELS[areaOf(top, record)]})` : null;

  const highestImpact = ordered
    .filter((n) => n.functionalCost >= IMPACT_COST_FLOOR)
    .slice(0, MAX_IMPACT)
    .map((n) => n.label);

  const context = [
    ...new Set([
      ...(top?.contributors.map((c) => c.note) ?? []),
      ...(top?.context ?? []),
    ]),
  ].slice(0, MAX_CONTEXT);

  const helps = [
    ...new Set([
      ...(top?.strategies.filter((s) => s.outcome === "a-lot").map((s) => s.title) ?? []),
      ...(top?.strengths ?? []),
    ]),
  ];

  const tried: TriedRow[] = [];
  for (const n of ordered) {
    for (const s of n.strategies) {
      if (tried.some((t) => t.title === s.title)) continue;
      tried.push({ title: s.title, outcome: s.outcome });
      if (tried.length >= MAX_TRIED) break;
    }
    if (tried.length >= MAX_TRIED) break;
  }

  // One line per other area, with the person's own priority on it where they gave one.
  const leadArea = top ? areaOf(top, record) : null;
  const byArea = new Map<Area, Need>();
  for (const n of ordered) {
    const area = areaOf(n, record);
    if (area === leadArea || byArea.has(area)) continue;
    byArea.set(area, n);
  }
  const otherAreas = [...byArea.entries()].map(([area, n]) =>
    n.userPriority === "no" ? `${AREA_LABELS[area]}: ${n.label} (not a priority)` : `${AREA_LABELS[area]}: ${n.label}`,
  );

  const goalId = record.onboarding?.improveFirst;
  const goal = goalId && top ? top.label : null;

  const supports = top && escalationEligible(top, record) ? professionsFor(top).slice(0, 3) : [];

  // The person's three manual fields, raw. NOT `manualText`, which wraps them in this app's own
  // section headings — those are ADHD.ME words, and this section is for theirs.
  const ownWords: string[] = [];
  for (const field of [record.manual.helps, record.manual.harder, record.manual["work-with-me"]]) {
    if (field.trim()) ownWords.push(field.trim());
  }
  if (audience !== "work") {
    const med = record.medication;
    const medLines = [med.changes, med.untouched, med.unwanted].filter((t) => t.trim());
    if (medLines.length) ownWords.push(medLines.join("\n"));
  }

  const plan = record.carePlan;
  const carePlan = hasPlan(plan)
    ? {
        allows: plan.allows,
        used: plan.used,
        // Only the kinds a plan can actually pay for. A GP reading this does not need to be told
        // about the coach the map suggested; the sheet is where that honesty belongs.
        considering: suggestFor(record, plan).filter((x) => x.covered).map((x) => x.kind),
      }
    : null;
  return { audience, priority, highestImpact, context, helps, tried, otherAreas, goal, carePlan, supports, ownWords };
}

/** The rows one section contributes, already in the words they will be read in. */
export function sectionRows(s: GpSummary, key: SectionKey): string[] {
  switch (key) {
    case "priority":
      return s.priority ? [s.priority] : [];
    case "highestImpact":
      return [...s.highestImpact];
    case "context":
      return [...s.context];
    case "helps":
      return [...s.helps];
    case "tried":
      return s.tried.map((t) => `${t.title} — ${OUTCOME_WORD[t.outcome]}`);
    case "otherAreas":
      return [...s.otherAreas];
    case "goal":
      return s.goal ? [s.goal] : [];
    case "carePlan":
      if (!s.carePlan) return [];
      return [
        `Plan allows: ${s.carePlan.allows}`,
        `Used so far: ${s.carePlan.used}`,
        ...(s.carePlan.considering.length ? [`Considering: ${s.carePlan.considering.map((p) => profession(p).label).join(", ")}`] : []),
      ];
    case "supports":
      return s.supports.map((p) => profession(p).label);
    case "ownWords":
      return s.ownWords.flatMap((t) => t.split("\n").filter((l) => l.trim()));
  }
}

/** The sections that have anything in them, in document order, minus anything removed. */
export function sectionsIn(s: GpSummary, removed: ReadonlySet<SectionKey> = new Set()): SectionKey[] {
  return SECTION_ORDER.filter((k) => !removed.has(k) && sectionRows(s, k).length > 0);
}

/**
 * The document as text, for the clipboard.
 *
 * Headings and rows. No connective prose, because there is no sentence here this app is allowed
 * to write.
 */
export function summaryText(s: GpSummary, removed: ReadonlySet<SectionKey> = new Set()): string {
  const blocks = sectionsIn(s, removed).map((key) => [SECTION_HEADINGS[key], ...sectionRows(s, key)].join("\n"));
  return blocks.join("\n\n");
}

/** The adjustments track worth naming to a workplace or a university, or null. */
export function adjustmentsFor(record: ModelRecord): { heading: string; items: readonly string[] } | null {
  const top = deriveNeeds(record)[0];
  if (!top) return null;
  const id = trackForSubdomain(top.subdomain);
  if (!id) return null;
  const track = ADJUSTMENT_TRACKS.find((t) => t.id === id);
  return track ? { heading: track.title, items: [...track.commonlyAvailable] } : null;
}

/** A one-line reading of the map for the top of the document: which axes are which word. */
export function axisLines(record: ModelRecord): string[] {
  const cells = matrix(record);
  const byAspect = new Map<string, string>();
  for (const cell of cells) {
    if (cell.status === "unexplored") continue;
    const current = byAspect.get(cell.aspect);
    if (!current) byAspect.set(cell.aspect, STATUS_LABEL[cell.status]);
  }
  return [...byAspect.entries()].map(([aspect, word]) => `${ASPECT_LABELS[aspect as keyof typeof ASPECT_LABELS]}: ${word}`);
}
