// W164: where declared verticals live, and where their evidence is assembled from.
//
// W157–W160 are pure: they take a spec and evidence and answer a question. A console needs
// somewhere for the specs to sit and something that gathers the evidence, and that is all this is.
//
// ONE DECISION, AND IT IS THE SAME ONE W151 AND W127 MADE. A vertical is CONTENT, not practice
// data — a named bundle of pathways and material, identical for everybody who uses it. So the
// store is not practice-scoped. Per-practice copies would mean N versions of a document with no
// single answer to what was published, which is precisely the question W160's binding exists to
// answer: WHICH version a practice accepted is practice data, and it lives there. What the
// vertical IS lives here.
//
// `assembleEvidence` is the honest wiring point for the whole quarter, and it decides nothing.
// It asks W119 which pathway versions are signed off, W69 which content is, W152 which education
// items have a live source, and W56 which intervals validate. Every one of those answers is
// computed at CALL TIME, which is what gives W157 its withdrawal-propagates property for free: a
// revoked review disappears from this function's output on the next call, and every vertical
// citing it stops being usable with nothing having to notice.

import { usablePathways } from "@/pathways/approval";
import { allVersions, getPathwayAttestations } from "@/pathways/registry";
import { getLibrary } from "@/education/store";
import { renderableItems, sourcesFromContent, sourcesFromPathways } from "@/education/provenance";
import { SHIPPED_WORKSPACE, usableFrom } from "@/registers/authoring";
import { SHIPPED_INTERVALS, loadIntervals } from "@/registers/intervals";
import type { KnownMembers } from "./completeness";
import type { VerticalEvidence, VerticalSpec } from "./model";

interface VerticalState {
  specs: VerticalSpec[];
}

const globalStore = globalThis as { __meherrVerticals?: VerticalState };

function state(): VerticalState {
  globalStore.__meherrVerticals ??= { specs: [] };
  return globalStore.__meherrVerticals;
}

export function resetVerticals(): void {
  globalStore.__meherrVerticals = { specs: [] };
}

export function getVerticalSpecs(): readonly VerticalSpec[] {
  return state().specs;
}

export function addVerticalSpecs(specs: readonly VerticalSpec[]): void {
  state().specs.push(...specs);
}

/**
 * What is signed off right now, gathered from the registries that own each answer.
 *
 * Note what is absent: there is no parameter here, and no way to inject evidence that did not
 * come through a gate. A caller wanting to pretend something is signed off has to change the
 * registry, which is the point.
 */
export function assembleEvidence(): VerticalEvidence {
  const content = usableFrom(SHIPPED_WORKSPACE);
  const pathways = usablePathways(allVersions(), getPathwayAttestations());
  const sources = [...sourcesFromContent(content), ...sourcesFromPathways(pathways)];
  return {
    pathways,
    content,
    educationItems: renderableItems(getLibrary(), sources),
    intervals: loadIntervals(SHIPPED_INTERVALS),
  };
}

/**
 * Everything that EXISTS, signed off or not — W158's optional pool.
 *
 * Without it, "written but not through its gate" and "nothing exists under this reference" are
 * indistinguishable, and W158 reports `indeterminate` rather than guessing. Supplying it is what
 * lets the console tell a practice whether it is waiting on a reviewer or on an author.
 *
 * Intervals contribute their REJECTED rows as well as their valid ones: a row W56 refused at load
 * is a row somebody wrote, and calling it "nothing exists" would send the reader to write it again.
 */
export function knownMembers(): KnownMembers {
  const catalogue = loadIntervals(SHIPPED_INTERVALS);
  return {
    pathwayVersionHashes: allVersions().map((v) => v.versionHash),
    contentIds: SHIPPED_WORKSPACE.map((r) => r.id),
    educationItemIds: getLibrary().map((i) => i.itemId),
    intervalIds: [
      ...catalogue.intervals.map((i) => i.id as string),
      ...catalogue.rejected.map((r) => r.id),
    ],
  };
}
