// W189 verify gate: "results are ordered by declared, checkable attributes only; no symptom
// input exists (G7); the ordering basis is stated and describes the order actually used
// (W151's rule)."
//
// The third clause is the one that needs a real test rather than an assertion that a sentence
// exists. "Describes the order actually used" is a claim relating two things — a string and a
// comparator — so it is checked by sorting real profiles and confirming the stated basis
// predicts the result, not by matching the sentence against itself.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORDERING,
  REFUSED_SEARCH_FIELDS,
  orderingBasis,
  publishedFocusLabels,
  searchDirectory,
  type DirectorySearch,
} from "./search";
import type { GeneralProfile, SpecialistProfile } from "./profile";
import { scopeStatement, type ScopeStatement } from "@/credentials/scope";

const focus = (label: string): ScopeStatement => {
  const result = scopeStatement({
    credentialId: "cred-1",
    scope: { kind: "condition", conditionCode: "E28.2" },
    label,
    permits: ["record_only"],
  });
  if (!result.ok) throw new Error(`fixture rejected: ${JSON.stringify(result.violations)}`);
  return result.statement;
};

const gp = (over: Partial<GeneralProfile> & { displayName: string }): GeneralProfile => ({
  clinicianId: `clin-${over.displayName}`,
  ahpraRegistrationNumber: "MED0001234567",
  location: { practiceId: "prac-1", suburb: "Parramatta", state: "NSW" },
  languages: ["English"],
  acceptingNewPatients: true,
  descriptor: { kind: "general_registration", profession: "general_practitioner" },
  focus: [],
  ...over,
});

const PANEL: GeneralProfile[] = [
  gp({ displayName: "Dr Zara Ahmed", focus: [focus("Women's health")] }),
  gp({ displayName: "Dr Alan Brooks", acceptingNewPatients: false, focus: [focus("Women's health")] }),
  gp({ displayName: "Dr Mira Chen", location: { practiceId: "prac-2", suburb: "Auburn", state: "NSW" }, languages: ["English", "Mandarin"] }),
  gp({ displayName: "Dr Sam Diaz", focus: [focus("Long-term conditions")] }),
];

describe("W189 G7 — the searcher never describes themselves", () => {
  const source = readFileSync(path.join(__dirname, "search.ts"), "utf8");
  const interfaceBody = source.match(/export interface DirectorySearch \{([\s\S]*?)^\}/m)?.[1] ?? "";

  it("has found the search type to scan", () => {
    // Guard against the scan below passing because it matched nothing.
    expect(interfaceBody).toContain("suburb");
  });

  it("declares no field a symptom could arrive in", () => {
    // The boundary is the QUESTION, not the answer. A box a patient can type a symptom into
    // makes this software that reasons about a patient, whatever the code then does with it.
    for (const banned of Object.keys(REFUSED_SEARCH_FIELDS)) {
      const declared = new RegExp(`^\\s*\\w*${banned}\\w*\\??:`, "im");
      expect(interfaceBody, `DirectorySearch declares a "${banned}" field`).not.toMatch(declared);
    }
  });

  it("states why each refused field is refused", () => {
    for (const key of ["symptom", "condition", "query", "urgency"]) {
      expect(Object.keys(REFUSED_SEARCH_FIELDS)).toContain(key);
      expect(REFUSED_SEARCH_FIELDS[key]!.length).toBeGreaterThan(30);
    }
  });

  it("matches a focus label exactly, so nothing is interpreted", () => {
    // The field that looks like the G7 problem and is not: the searcher picks a label a
    // CLINICIAN published, not a description of themselves. Exactness is what keeps it that
    // way — a near-miss silently becoming a hit is the product deciding what somebody meant.
    expect(searchDirectory(PANEL, { focusLabel: "women's health" }).matches).toHaveLength(2);
    expect(searchDirectory(PANEL, { focusLabel: "womens health" }).matches).toEqual([]);
    expect(searchDirectory(PANEL, { focusLabel: "period pain" }).matches).toEqual([]);
  });

  it("offers only labels clinicians actually published", () => {
    // Generated from the profiles, not kept beside them: a hand-maintained list eventually
    // offers a category nobody declared, which is the product inventing one.
    expect(publishedFocusLabels(PANEL)).toEqual(["long-term conditions", "women's health"]);
  });
});

describe("W189 the result is not a selection", () => {
  it("returns every match, with no limit to pass", () => {
    // "Top 5" is a selection made by software: a product showing five of nine has chosen four
    // clinicians' worth of invisibility on a basis it never stated. There is no parameter.
    const all = searchDirectory(PANEL, {});
    expect(all.matches).toHaveLength(PANEL.length);
    // @ts-expect-error — there is no limit, page or size argument to give.
    void (() => searchDirectory(PANEL, {}, 5));
  });

  it("attaches no score, rank or relevance to any clinician", () => {
    const results = searchDirectory(PANEL, { focusLabel: "women's health" });
    for (const match of results.matches) {
      for (const key of Object.keys(match)) {
        expect(key).not.toMatch(/score|rank|relevance|match(?:ed)?Strength|recommend/i);
      }
    }
    expect(JSON.stringify(results)).not.toMatch(/"(score|rank|relevance)"/);
  });

  it("says in words that the order is not a recommendation", () => {
    expect(orderingBasis()).toContain("not a ranking");
    expect(orderingBasis()).toContain("not a recommendation");
  });

  it("does not reorder based on anything the searcher asked for", () => {
    // The claim the basis makes ("the order does not change based on anything you told us") has
    // to be true. Filters narrow the list; they never move anybody up it.
    const filtered = searchDirectory(PANEL, { focusLabel: "women's health" }).matches;
    const unfiltered = searchDirectory(PANEL, {}).matches.filter((p) => filtered.includes(p));
    expect(filtered).toEqual(unfiltered);
  });
});

describe("W189 the stated basis describes the order actually used", () => {
  it("predicts the real order, checked against a sort rather than against itself", () => {
    // W151's rule with teeth. A page saying "sorted by distance" over a list sorted by signup
    // date is worse than saying nothing, because a reader told the basis stops looking for one.
    const ordered = searchDirectory(PANEL, {}).matches;

    // Basis clause 1: taking new patients first.
    const availability = ordered.map((p) => p.acceptingNewPatients);
    expect(availability).toEqual([...availability].sort((a, b) => Number(b) - Number(a)));

    // Basis clause 2, within that group: suburb alphabetically.
    const taking = ordered.filter((p) => p.acceptingNewPatients).map((p) => p.location.suburb);
    expect(taking).toEqual([...taking].sort());

    // Basis clause 3, within a suburb: name alphabetically.
    const parramatta = ordered
      .filter((p) => p.acceptingNewPatients && p.location.suburb === "Parramatta")
      .map((p) => p.displayName);
    expect(parramatta).toEqual([...parramatta].sort());
  });

  it("generates the sentence from the same declaration the comparator reads", () => {
    // One list, three consumers. There is no second place to edit, so the description cannot
    // fall out of step with the behaviour — the drift this rule exists against is impossible
    // rather than merely tested for.
    for (const { describe: clause } of ORDERING) {
      expect(orderingBasis()).toContain(clause);
    }
    const source = readFileSync(path.join(__dirname, "search.ts"), "utf8");
    expect(source.match(/ORDERING/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("names every key it orders on and orders on no key it does not name", () => {
    const named = ORDERING.map((o) => o.key);
    expect(named).toEqual(["acceptingNewPatients", "suburb", "displayName"]);
    expect(new Set(named).size).toBe(named.length);
  });

  it("orders on declared, checkable attributes only", () => {
    // Nothing here is a judgement about care. W83 refused a productivity board internally; the
    // same claim about a named person in public is worse.
    for (const { key } of ORDERING) {
      expect(key).not.toMatch(/quality|outcome|rating|volume|success|experience|seniority/i);
    }
  });
});

describe("W189 the order cannot depend on how the list arrived", () => {
  it("is identical whatever order the profiles are given in", () => {
    const forwards = searchDirectory(PANEL, {}).matches.map((p) => p.displayName);
    const backwards = searchDirectory([...PANEL].reverse(), {}).matches.map((p) => p.displayName);
    expect(backwards).toEqual(forwards);
  });

  it("breaks every tie down to the name, so no pair is left to input order", () => {
    // Two profiles compare equal only when they share availability, suburb AND name — at which
    // point the order between them cannot carry meaning.
    const tied = [
      gp({ displayName: "Dr Same Name" }),
      gp({ displayName: "Dr Same Name", clinicianId: "clin-other" }),
      gp({ displayName: "Dr Other Name" }),
    ];
    const names = (list: GeneralProfile[]) =>
      searchDirectory(list, {}).matches.map((p) => p.displayName);
    expect(names(tied)).toEqual(names([...tied].reverse()));
  });

  it("does not mutate the caller's list while sorting it", () => {
    const original = PANEL.map((p) => p.displayName);
    searchDirectory(PANEL, {});
    expect(PANEL.map((p) => p.displayName)).toEqual(original);
  });
});

describe("W189 a zero result says what was asked", () => {
  it("echoes the filters, so an empty list is legible rather than blank", () => {
    // W179's lesson: a zero that does not say which zero it is sends a reader to the wrong
    // conclusion. Here the two are "nobody matches these filters" and "the directory is empty".
    const results = searchDirectory(PANEL, { suburb: "Nowhere" });
    expect(results.matches).toEqual([]);
    expect(results.considered).toBe(PANEL.length);
    expect(results.filters).toEqual({ suburb: "Nowhere" } satisfies DirectorySearch);
  });

  it("distinguishes an empty directory from an unmatched search", () => {
    expect(searchDirectory([], {}).considered).toBe(0);
    expect(searchDirectory(PANEL, { suburb: "Nowhere" }).considered).toBeGreaterThan(0);
  });

  it("still states the basis on an empty result", () => {
    expect(searchDirectory([], {}).basis).toBe(orderingBasis());
  });
});

describe("W189 a specialist publishes no focus, so none can be searched", () => {
  it("never matches a focus filter, because the field does not exist on that shape", () => {
    const specialist: SpecialistProfile = {
      clinicianId: "clin-s",
      displayName: "Dr Spec Ialist",
      ahpraRegistrationNumber: "MED0009999999",
      location: { practiceId: "prac-1", suburb: "Parramatta", state: "NSW" },
      languages: ["English"],
      acceptingNewPatients: true,
      descriptor: { kind: "recognised_specialist", specialty: "endocrinology" },
      specialty: "endocrinology",
    };
    expect(searchDirectory([specialist], { focusLabel: "women's health" }).matches).toEqual([]);
    expect(publishedFocusLabels([specialist])).toEqual([]);
  });
});
