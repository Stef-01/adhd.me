// Your map: the nine wellness dimensions as a shape you can see, and advance (founder, 2026-09-11).
//
// WHAT WAS ASKED, AND THE ONE THING IT CANNOT BE. The direction was a Pokémon-style IV map — a
// radar of the key aspects of a life, emotional regulation and curiosity among them, that grows as
// you play. The thing it must not become is a SCORE OF A PERSON. `app/my-adhd.tsx` has said "no
// graphs, no score; every line traces to something the person said" since it was written, and
// `src/model/events.ts` §68 refuses a label that reads like an inferred pathology. Nothing this
// app can observe — a mosquito caught, a module finished — measures anybody's emotional regulation,
// and a chart that implied it would be inventing the most consequential claim in the product.
//
// THE RESOLUTION IS THE ONE THE SOURCE MATERIAL ALREADY USES. Pokémon's IV judge does not show the
// number either: it says a WORD. So does this. Every rung below is an act the person took, and the
// word names the act rather than the person:
//
//   Not yet · Named · Explored · In your kit · Working
//
// A dimension advances because you said something that lands there, because you finished a run
// about it, because you kept a strategy from it, because you said that strategy worked. That is a
// map of what you have BUILT, and it is honest, and it still does the thing that was asked: the
// shape shows where you are strong, the flat edges show what nothing has touched, and playing
// moves it.
//
// NOTHING HERE IS A NEW VOCABULARY. The dimensions are `src/wellness/nwia.ts`'s nine, attributed
// there; the subdomains that feed them are the eco-bio-psychosocial map's own; the strengths are
// the `strength` each interactive module already declares; and the kinds of care a dimension opens
// are the `professions` those same modules already name. A dimension cannot point at a profession
// nobody teaching it points at.

import { INTERACTIVE_MODULES, type InteractiveModule } from "@/learn/interactive";
import { deriveNeeds } from "@/model/needs";
import type { ModelRecord } from "@/model/store";
import type { LearningProfile } from "@/lives/types";
import type { Profession } from "@/support/professions";
import { NWIA_DIMENSIONS, NWIA_OF, type NwiaDimension } from "./nwia";

/** The ladder. Words, never numbers — see the header. */
export const RUNGS = ["unmapped", "named", "explored", "kept", "working"] as const;
export type Rung = (typeof RUNGS)[number];

/** What each rung is called on the map. Two words at most: nine of these share one screen, and
 *  the one law is that a screen holds sixty. */
export const RUNG_LABEL: Readonly<Record<Rung, string>> = {
  unmapped: "Not yet",
  named: "Named",
  explored: "Explored",
  kept: "Kept",
  working: "Working",
};

/** What put a dimension on its rung, said as the act it was. */
export const RUNG_BECAUSE: Readonly<Record<Rung, string>> = {
  unmapped: "Nothing yet. Not a gap, unasked.",
  named: "You have named something here.",
  explored: "You went through a run here.",
  kept: "You are carrying a strategy from here.",
  working: "You said a strategy here worked.",
};

/** How far out the polygon reaches on each rung. The outer ring is the frame, not a target. */
export const RUNG_REACH: Readonly<Record<Rung, number>> = {
  unmapped: 0.08,
  named: 0.34,
  explored: 0.56,
  kept: 0.78,
  working: 1,
};

export interface MapPoint {
  readonly dimension: NwiaDimension;
  readonly rung: Rung;
  /** 0–1, what the polygon draws. */
  readonly reach: number;
  /** A strength one of the modules here names — present once something here has been finished. */
  readonly strength: string | null;
  /** The kinds of care the modules on this dimension point to. Derived, never listed by hand. */
  readonly kinds: readonly Profession[];
}

/** The modules whose targets land on a dimension. The only route from a module to the map. */
export function modulesOn(dimension: NwiaDimension): readonly InteractiveModule[] {
  return INTERACTIVE_MODULES.filter((m) => m.targets.some((t) => NWIA_OF[t].includes(dimension)));
}

/**
 * The two dimensions nothing in the module library teaches, and why — so the fact is recorded
 * rather than discovered as a flat edge somebody reads as a verdict.
 *
 * A dimension here can still be NAMED: a contributor or the goal at the door reaches it. It cannot
 * be explored, because no run is about it. That is a fact about what this app has built so far,
 * never about the person looking at the map, and the screen says so in those words.
 */
export const NOT_TAUGHT: Readonly<Partial<Record<NwiaDimension, string>>> = {
  spiritual:
    "has no node on the eco-bio-psychosocial map at all; the goal set at the door is what names it, the same reading nwiaBalance uses.",
  cultural:
    "is reached only through the `family` subdomain, which modules ASK about (\"who most often feels unheard?\", and the survey's \"with family\") but none declares as a target. Nameable today, explorable when a run is written about it.",
};

/** Every insight step in the tree, with the module it belongs to. */
const INSIGHTS: ReadonlyArray<{ id: string; module: InteractiveModule }> = INTERACTIVE_MODULES.flatMap((m) =>
  m.steps.filter((s) => s.kind === "insight").map((s) => ({ id: (s as { id: string }).id, module: m })),
);

const RUNG_ORDER: Readonly<Record<Rung, number>> = { unmapped: 0, named: 1, explored: 2, kept: 3, working: 4 };

/**
 * A dimension's kinds of care: the union of what the modules on it already declare.
 *
 * NOT REORDERED, and that was tried. Sorting by how FEW dimensions a kind turns up on puts the
 * particular one first — a sleep clinician leads Physical, a relationship counsellor leads Social —
 * and then puts a DIETITIAN at the top of Work, because the eating runs target `attention` and
 * attention reads as work, so the dietitian is rare without being what Work is about. Rarity is
 * not relevance. The set is what matters here: the finder's own band of kinds, which already
 * orders by the person's words and then by how many the search found, is what chooses inside it.
 */
export function kindsOn(dimension: NwiaDimension): readonly Profession[] {
  return [...new Set(modulesOn(dimension).flatMap((m) => m.professions))];
}

/**
 * The map, from what this device already holds. Nothing is inferred and nothing is scored: each
 * rung is an act, and the highest act taken on a dimension is where it sits.
 *
 * `spiritual` has no node on the eco-bio-psychosocial map — the app's nearest thing to "the days
 * line up with what matters to you" is the goal set at the door, the same reading `nwiaBalance`
 * already uses, so a set goal is what names it.
 */
export function personalMap(record: ModelRecord | null, profile: LearningProfile | null): MapPoint[] {
  const finished = new Set([...(record?.completed ?? []), ...(profile?.completedModuleIds ?? [])]);
  const kept = new Set<string>();
  const worked = new Set<string>();
  for (const e of record?.experiments ?? []) {
    kept.add(e.moduleId);
    if (e.outcome === "a-lot") worked.add(e.moduleId);
  }
  // Recognising a pattern as yours is this app's own measure of recognition, so a confirmed
  // insight names its dimension the same way a derived need does.
  const recognised = new Set(
    INSIGHTS.filter(({ id }) => { const v = record?.insights?.[id]; return v === "yes" || v === "partly"; }).map(({ module }) => module.id),
  );
  const resonated = new Set(Object.keys(record?.resonance ?? {}));
  // The subdomains the person's own picture already touches.
  const named = new Set<NwiaDimension>();
  // `readModel` rebuilds every field, so a record reaching here is always whole — but this runs on
  // a render path and a map that throws takes the page with it, which is a worse failure than a
  // map with one fewer rung on it.
  let needs: ReturnType<typeof deriveNeeds> = [];
  try { needs = record ? deriveNeeds(record) : []; } catch { needs = []; }
  for (const need of needs) {
    for (const s of [need.subdomain, ...need.contributors.map((c) => c.subdomain)]) {
      for (const d of NWIA_OF[s] ?? []) named.add(d);
    }
  }
  if (record?.onboarding?.improveFirst) named.add("spiritual");

  return NWIA_DIMENSIONS.map((dimension) => {
    const modules = modulesOn(dimension);
    const ids = modules.map((m) => m.id);
    const hit = (set: Set<string>) => ids.some((id) => set.has(id));
    const rung: Rung = hit(worked) ? "working"
      : hit(kept) ? "kept"
      : hit(finished) ? "explored"
      : named.has(dimension) || hit(recognised) || hit(resonated) ? "named"
      : "unmapped";
    // A strength is only claimed once something here has actually been finished — the module says
    // it, not the app, and an unfinished module has not said anything to this person yet.
    const done = modules.find((m) => finished.has(m.id) || worked.has(m.id) || kept.has(m.id));
    return {
      dimension,
      rung,
      reach: RUNG_REACH[rung],
      strength: done?.strength ?? null,
      kinds: kindsOn(dimension),
    };
  });
}

/**
 * The dimensions a run lands on — what it moves when it finishes.
 *
 * The half of the direction the map alone did not do: the map advances when somebody plays, and
 * until this the GAME never said so. A run's last card names the axes it just moved and links to
 * them, so the loop is visible from inside the thing that drives it.
 */
export function dimensionsOf(moduleId: string): readonly NwiaDimension[] {
  const module = INTERACTIVE_MODULES.find((m) => m.id === moduleId);
  if (!module) return [];
  return NWIA_DIMENSIONS.filter((d) => module.targets.some((t) => (NWIA_OF[t] ?? []).includes(d)));
}

/** The dimension to open the map on: the one furthest out, and the first of the nine on a tie. */
export function strongest(points: readonly MapPoint[]): MapPoint {
  return [...points].sort((a, b) => RUNG_ORDER[b.rung] - RUNG_ORDER[a.rung])[0]!;
}
