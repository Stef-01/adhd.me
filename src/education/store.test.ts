// W151 verify gate (unit half): the storage layer keeps W149's absence.
//
// Q9–Q11 have found the same class of bug five times: a fold over a collection that is correct
// for one row and wrong for two, or right only because the fixture happened to be ordered
// conveniently. So every scoping assertion here uses TWO clinicians and runs BOTH orders.

import { beforeEach, describe, expect, it } from "vitest";
import * as storeModule from "./store";
import {
  addCpdEntries,
  addLibraryItems,
  addTriggers,
  cpdEntriesFor,
  getLibrary,
  getTriggers,
  resetEducation,
  scrubClinicianCpd,
} from "./store";
import { recordCpdEntry, trailFor, type CpdEntry } from "./cpd";
import type { EducationItem } from "./curation";

const item = (itemId: string, conditionCode: string): EducationItem => ({
  itemId,
  conditionCode,
  title: `Placeholder material ${itemId}.`,
  sourceRef: `src-${itemId}`,
  relevantFactCodes: [],
});

function entry(entryId: string, clinicianId: string, at: string, practiceId = "prac-1"): CpdEntry {
  const result = recordCpdEntry(
    {
      entryId, practiceId, clinicianId, kind: "opened", itemId: "item-a",
      sourceRef: "src-item-a", itemTitle: "Placeholder material item-a.", at,
    },
    [],
  );
  if (!result.ok) throw new Error(`fixture rejected: ${result.errors.join(", ")}`);
  return result.entry;
}

const MINE_EARLY = entry("e1", "clin-1", "2026-03-01");
const THEIRS = entry("e2", "clin-2", "2026-03-02");
const MINE_LATE = entry("e3", "clin-1", "2026-03-03");
const BOTH = [MINE_EARLY, THEIRS, MINE_LATE];

beforeEach(() => {
  resetEducation();
});

describe("W151 the CPD trail stays the clinician's", () => {
  it("exports no read that returns anybody else's entries", () => {
    // W149 tested this over its own module. The storage layer is where it would be reintroduced,
    // by a page that "just needs the list" — so the absence is asserted where the list lives.
    for (const name of Object.keys(storeModule)) {
      expect(name, `"${name}" reads as a cross-clinician view`).not.toMatch(
        /allCpd|everyCpd|practice|team|everyone|byPractice|compliance|outstanding|whoHas|unread/i,
      );
    }
  });

  it("returns only the queried clinician's entries, in either insertion order", () => {
    for (const order of [BOTH, [...BOTH].reverse()]) {
      resetEducation();
      addCpdEntries(order);
      expect(cpdEntriesFor("prac-1", "clin-1").map((e) => e.entryId).sort()).toEqual(["e1", "e3"]);
      expect(cpdEntriesFor("prac-1", "clin-2").map((e) => e.entryId)).toEqual(["e2"]);
      expect(JSON.stringify(cpdEntriesFor("prac-1", "clin-1"))).not.toContain("clin-2");
    }
  });

  it("gives a clinician with no entries an empty list rather than everyone's", () => {
    addCpdEntries(BOTH);
    expect(cpdEntriesFor("prac-1", "clin-nobody")).toEqual([]);
  });

  it("hands W149 a trail that is already scoped, so the fold cannot widen it", () => {
    addCpdEntries(BOTH);
    const trail = trailFor(cpdEntriesFor("prac-1", "clin-1"), "prac-1", "clin-1");
    expect(trail.entries.map((e) => e.entryId)).toEqual(["e1", "e3"]);
  });

  it("scrubs one clinician's entries and leaves the other's, in either order", () => {
    for (const order of [BOTH, [...BOTH].reverse()]) {
      resetEducation();
      addCpdEntries(order);
      expect(scrubClinicianCpd("prac-1", "clin-1")).toBe(2);
      expect(cpdEntriesFor("prac-1", "clin-2").map((e) => e.entryId)).toEqual(["e2"]);
      expect(cpdEntriesFor("prac-1", "clin-1")).toEqual([]);
    }
  });
});

describe("W151 the library is content, not practice data", () => {
  it("holds one library rather than a copy per practice", () => {
    // A per-practice copy would mean N versions of a document with no single answer to what was
    // published — the reason W127 declined to scope the pathway catalogue either.
    for (const name of Object.keys(storeModule)) {
      expect(name, `"${name}" scopes the library`).not.toMatch(/libraryFor|itemsFor|triggersFor/);
    }
    addLibraryItems([item("item-a", "placeholder_register_a")]);
    expect(getLibrary().map((i) => i.itemId)).toEqual(["item-a"]);
  });

  it("ships empty, and a reset returns it to empty", () => {
    expect(getLibrary()).toEqual([]);
    expect(getTriggers()).toEqual([]);
    addLibraryItems([item("item-a", "placeholder_register_a")]);
    addTriggers([
      { conditionCode: "placeholder_register_a", factCode: "fact_a", requires: "recorded_present", rationale: "Placeholder." },
    ]);
    addCpdEntries([MINE_EARLY]);
    resetEducation();
    expect(getLibrary()).toEqual([]);
    expect(getTriggers()).toEqual([]);
    expect(cpdEntriesFor("prac-1", "clin-1")).toEqual([]);
  });
});

describe("W209 a clinician id is only unique inside its practice", () => {
  // W166 mints `clin-${n}` from a PER-PRACTICE counter and said so at the time: "a clinician id
  // is only ever resolved inside the practice that minted it." This module resolved one without
  // a practice, so `clin-1` at two practices shared a trail — and the page rendered the other
  // person's reading record as the reader's own.
  const A_CLIN1 = entry("a1", "clin-1", "2026-03-01", "prac-1");
  const B_CLIN1 = entry("b1", "clin-1", "2026-03-02", "prac-2");

  it("returns one practice's entries for a clinician id both practices minted", () => {
    addCpdEntries([A_CLIN1, B_CLIN1]);
    expect(cpdEntriesFor("prac-1", "clin-1").map((e) => e.entryId)).toEqual(["a1"]);
    expect(cpdEntriesFor("prac-2", "clin-1").map((e) => e.entryId)).toEqual(["b1"]);
  });

  it("folds the same way, so the trail cannot widen what the read narrowed", () => {
    addCpdEntries([A_CLIN1, B_CLIN1]);
    const trail = trailFor([A_CLIN1, B_CLIN1], "prac-1", "clin-1");
    expect(trail.entries.map((e) => e.entryId)).toEqual(["a1"]);
  });

  it("erases within the practice only — a clinician leaving A has not left B", () => {
    // The opposite direction from patient erasure, which must reach every practice (W106).
    // A clinician's trail at B is a different practice's record of a different engagement.
    addCpdEntries([A_CLIN1, B_CLIN1]);
    expect(scrubClinicianCpd("prac-1", "clin-1")).toBe(1);
    expect(cpdEntriesFor("prac-2", "clin-1").map((e) => e.entryId)).toEqual(["b1"]);
  });

  it("refuses a correction aimed at the same clinician id at another practice", () => {
    const attempt = recordCpdEntry(
      {
        entryId: "b2", practiceId: "prac-2", clinicianId: "clin-1", kind: "corrected",
        itemId: "item-a", sourceRef: "src-item-a", itemTitle: "Placeholder material item-a.",
        at: "2026-03-04", correctsEntryId: "a1", note: "Not mine to correct.",
      },
      [A_CLIN1],
    );
    expect(!attempt.ok && attempt.errors).toContain("not_your_entry");
  });
});
