// W102: the surface census, made mechanical.
//
// `docs/COMPLIANCE-DOSSIER.md` has claimed "zero unmapped surfaces in app/" twice, and both
// times the claim was untrue within a day — four routes landed in a founder commit at W77, and
// three more (including one of mine) landed across Q7/Q8. The document was corrected each time
// by a human noticing. That is the control failing, not working: a compliance register whose
// completeness depends on whoever happens to look is complete only by luck.
//
// So completeness stops being a claim and becomes a test. The dossier carries a census block
// listing every route and the row that governs it; this module reads the filesystem, reads the
// block, and the test fails on any difference IN EITHER DIRECTION:
//
//   * a route with no census line is unmapped — the failure everyone expects;
//   * a census line with no route is STALE — the failure nobody catches, and the one that makes
//     a dossier actively misleading rather than merely incomplete. The W77 entry had to retract
//     a row describing a page that had moved.
//
// This is the mechanical check the W91 hardening asked for, applied to a different bug class:
// noticing a tendency did not stop it recurring, and a lint does.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** A route the application serves. Pages and route handlers alike — both are surfaces. */
export interface Surface {
  /** URL path as served, e.g. "/console/outreach" or "/book/[token]". */
  path: string;
  kind: "page" | "route";
}

const ENTRY_FILES: ReadonlyArray<{ file: string; kind: Surface["kind"] }> = [
  { file: "page.tsx", kind: "page" },
  { file: "route.ts", kind: "route" },
];

/**
 * Every route under `appDir`, derived from the App Router's file conventions.
 *
 * Route groups `(name)` are stripped because they do not appear in the URL; dynamic segments
 * `[param]` are kept verbatim, because "which parameter" is part of what a reviewer is
 * assessing.
 */
export function discoverSurfaces(appDir: string): Surface[] {
  const found: Surface[] = [];

  const walk = (dir: string, segments: string[]) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        // Private folders (_name) are never routable.
        if (entry.startsWith("_")) continue;
        const isGroup = entry.startsWith("(") && entry.endsWith(")");
        walk(full, isGroup ? segments : [...segments, entry]);
        continue;
      }
      const match = ENTRY_FILES.find((e) => e.file === entry);
      if (match) found.push({ path: `/${segments.join("/")}`, kind: match.kind });
    }
  };

  walk(appDir, []);
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

/** One census line: the route, and the dossier row that governs it. */
export interface CensusEntry {
  path: string;
  row: string;
}

const CENSUS_FENCE = /```surface-census\n([\s\S]*?)```/;

/**
 * Parse the dossier's census block.
 *
 * Returns an empty list when the block is absent, which the test reads as "nothing is mapped"
 * — deleting the block must fail loudly rather than pass vacuously.
 */
export function parseCensus(markdown: string): CensusEntry[] {
  const block = CENSUS_FENCE.exec(markdown);
  if (!block?.[1]) return [];

  const entries: CensusEntry[] = [];
  for (const line of block[1].split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const [path, ...rest] = trimmed.split("—");
    entries.push({ path: (path ?? "").trim(), row: rest.join("—").trim() });
  }
  return entries;
}

export interface CensusDiff {
  /** Routes the application serves that the dossier does not list. */
  unmapped: string[];
  /** Routes the dossier lists that the application no longer serves. */
  stale: string[];
  /** Listed routes with no governing row named. */
  unattributed: string[];
}

export function diffCensus(surfaces: readonly Surface[], census: readonly CensusEntry[]): CensusDiff {
  const served = new Set(surfaces.map((s) => s.path));
  const listed = new Set(census.map((c) => c.path));

  return {
    unmapped: [...served].filter((p) => !listed.has(p)).sort(),
    stale: [...listed].filter((p) => !served.has(p)).sort(),
    unattributed: census.filter((c) => c.row === "").map((c) => c.path).sort(),
  };
}
