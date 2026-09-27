// `rankClinicians(query, roster, today, needs)`: the finder's "What we heard" row ranks on the
// facets the person kept, and a later model read will hand over its own. Omitted, the ranker reads
// the query itself, exactly as before.

import { describe, expect, it } from "vitest";
import { capacityGrade, clinicians, needsFor, rankClinicians, rankCliniciansNear, rankingProfile, type Clinician } from "./clinicians";
import { rosterFor } from "./synthetic-roster";
import { REACH_CORPUS } from "@/matching/corpus";
import { resolvePlace } from "@/geo/suburbs";
import { facetKey, type NeedSignal } from "@/matching/needs";

const TODAY = new Date("2026-09-27T00:00:00Z");
const ROSTERS = [
  { name: "real", roster: clinicians },
  { name: "with examples", roster: rosterFor(true) },
] as const;

const ids = (list: readonly Clinician[]) => list.map((c) => c.id);
const readOf = (needs: readonly NeedSignal[]) => needs.map((n) => `${facetKey(n.facet)}=${n.weight}`).sort();

/** The order up to its arbitrary part: runs of clinicians the comparator cannot tell apart, each as a set. */
function bands(list: readonly Clinician[], needs: readonly NeedSignal[]): string[][] {
  const out: { key: string; ids: string[] }[] = [];
  for (const c of list) {
    const key = `${JSON.stringify(rankingProfile(c, needs))}|${capacityGrade(c, TODAY)}`;
    const last = out.at(-1);
    if (last && last.key === key) last.ids.push(c.id);
    else out.push({ key, ids: [c.id] });
  }
  return out.map((band) => band.ids.sort());
}

describe.each(ROSTERS)("rankClinicians with needs, $name roster", ({ roster }) => {
  it("ranks every corpus request exactly as before when needs is omitted", () => {
    for (const { text } of REACH_CORPUS) {
      expect(ids(rankClinicians(text, roster, TODAY)), text).toEqual(ids(rankClinicians(text, roster, TODAY, needsFor(text, roster))));
    }
  });

  it("ranks a subset of the read the way it ranks a request that only says those things", () => {
    let compared = 0;
    let moved = 0;
    for (const { text } of REACH_CORPUS) {
      const read = needsFor(text, roster);
      const keys = [...new Set(read.map((n) => facetKey(n.facet)))];
      if (keys.length < 2) continue;
      for (const dropped of keys) {
        const kept = read.filter((n) => facetKey(n.facet) !== dropped);
        // A request that says only what was kept: the reader's own phrases for those facets.
        const said = [...new Set(kept.map((n) => n.matched))].join(", ");
        const saidRead = needsFor(said, roster);
        if (readOf(saidRead).join() !== readOf(kept).join()) continue;
        compared += 1;

        expect(ids(rankClinicians(said, roster, TODAY, kept)), said).toEqual(ids(rankClinicians(said, roster, TODAY)));
        // The finder keeps the person's words, so only the arbitrary order inside exact ties may differ.
        expect(bands(rankClinicians(text, roster, TODAY, kept), kept), `${text} without ${dropped}`).toEqual(
          bands(rankClinicians(said, roster, TODAY), saidRead),
        );
        if (ids(rankClinicians(text, roster, TODAY, kept)).join() !== ids(rankClinicians(text, roster, TODAY)).join()) moved += 1;
      }
    }
    expect(compared).toBeGreaterThan(100);
    expect(moved).toBeGreaterThan(50);
  });
});

describe("rankCliniciansNear with needs", () => {
  const hornsby = resolvePlace("Hornsby")!;

  it("ranks as before when the read is passed in, and still sorts by distance on a subset", () => {
    const roster = rosterFor(true);
    const text = "a woman GP for an ADHD assessment";
    const read = needsFor(text, roster);
    expect(ids(rankCliniciansNear(text, hornsby, roster, TODAY, read))).toEqual(ids(rankCliniciansNear(text, hornsby, roster, TODAY)));
    const kept = read.filter((n) => n.facet.kind === "care");
    expect(ids(rankCliniciansNear(text, hornsby, roster, TODAY, kept))).not.toEqual(ids(rankClinicians(text, roster, TODAY, kept)));
  });
});
