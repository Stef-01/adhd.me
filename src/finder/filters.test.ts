// O234: the filters, round-tripped through a fake storage and applied to a fixture roster.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { SUBURBS } from "@/geo/suburbs";
import {
  activeFilterCount,
  applyFilters,
  clearFilters,
  describeFilters,
  DISTANCE_CHOICES,
  emptyFilters,
  FILTERS_KEY,
  readFilters,
  writeFilters,
  type Filterable,
  type Filters,
} from "./filters";

function fakeStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

type Fixture = Filterable & { id: string; suburb: string };

const gp = (id: string, over: Partial<Fixture> = {}): Fixture => ({
  id,
  suburb: "Beecroft",
  gender: "man",
  manner: [],
  practicalSignals: [],
  languages: ["English"],
  wheelchairAccessible: false,
  acceptingNewPatients: true,
  ...over,
});

const roster: Fixture[] = [
  gp("a", { gender: "woman", languages: ["English", "Tamil"], wheelchairAccessible: true, practicalSignals: ["Bulk billed"] }),
  gp("b", { telehealthFirstAppointment: true, suburb: "Southport" }),
  gp("c", { manner: ["unhurried"], acceptingNewPatients: false }),
  gp("d", { suburb: "Nowhere" }),
];

const beecroft = SUBURBS.find((s) => s.suburb === "Beecroft")!;
const kmOf: Record<string, number | null> = { a: 0, b: 900, c: 3, d: null };
const nearest = (c: Fixture) => kmOf[c.id] ?? null;

describe("the device record", () => {
  it("reads the empty set when nothing is held, and never throws on a storage that does", () => {
    expect(readFilters(fakeStorage())).toEqual(emptyFilters());
    expect(readFilters({ getItem: () => { throw new Error("private mode"); } })).toEqual(emptyFilters());
  });

  it("round-trips a set and removes the key when the set is empty", () => {
    const storage = fakeStorage();
    const set: Filters = { ...emptyFilters(), place: "Beecroft", womanGp: true, languages: ["Tamil"], withinKm: 10 };
    writeFilters(storage, set);
    expect(storage.store.has(FILTERS_KEY)).toBe(true);
    expect(readFilters(storage)).toEqual(set);
    writeFilters(storage, emptyFilters());
    expect(storage.store.has(FILTERS_KEY)).toBe(false);
  });

  it("keeps a place alone — it is not a filter, but it is the person's", () => {
    const storage = fakeStorage();
    writeFilters(storage, { ...emptyFilters(), place: "Hornsby" });
    expect(readFilters(storage).place).toBe("Hornsby");
  });

  it.each([
    ["another version", JSON.stringify({ ...emptyFilters(), v: 99 })],
    ["a language the roster does not declare", JSON.stringify({ ...emptyFilters(), languages: ["Klingon"] })],
    ["a distance that is not a choice", JSON.stringify({ ...emptyFilters(), withinKm: 7 })],
    ["a boolean that is not one", JSON.stringify({ ...emptyFilters(), womanGp: "yes" })],
    ["not JSON", "{nope"],
  ])("refuses %s rather than misreading it", (_label, raw) => {
    expect(readFilters(fakeStorage({ [FILTERS_KEY]: raw }))).toEqual(emptyFilters());
  });

  it("clears", () => {
    const storage = fakeStorage({ [FILTERS_KEY]: JSON.stringify({ ...emptyFilters(), womanGp: true }) });
    clearFilters(storage);
    expect(storage.store.size).toBe(0);
  });

  it("writes the filter fields and nothing else — no request, no draft", () => {
    const storage = fakeStorage();
    writeFilters(storage, { ...emptyFilters(), womanGp: true });
    const written = JSON.parse(storage.store.get(FILTERS_KEY)!) as Record<string, unknown>;
    expect(Object.keys(written).sort()).toEqual(Object.keys(emptyFilters()).sort());
  });
});

describe("counting and naming", () => {
  it("counts every narrowing filter and not the place", () => {
    expect(activeFilterCount(emptyFilters())).toBe(0);
    expect(activeFilterCount({ ...emptyFilters(), place: "Epping" })).toBe(0);
    expect(activeFilterCount({ ...emptyFilters(), womanGp: true, languages: ["Tamil", "Urdu"], withinKm: 5 })).toBe(4);
  });

  it("names them in a fixed order, one label per filter", () => {
    const all: Filters = {
      ...emptyFilters(),
      womanGp: true,
      telehealth: true,
      bulkBilling: true,
      longerAppointments: true,
      wheelchair: true,
      openBooks: true,
      languages: ["Mandarin"],
      withinKm: 20,
    };
    const labels = describeFilters(all);
    expect(labels).toHaveLength(activeFilterCount(all));
    expect(labels[0]).toBe("Woman GP");
    expect(labels.at(-1)).toBe("Within 20 km");
    expect(labels).toContain("Speaks Mandarin");
  });

  it("accepts exactly the languages the roster can match", () => {
    for (const language of eachOf(MATCHABLE_LANGUAGES, "the matchable languages")) {
      const held = readFilters(fakeStorage({ [FILTERS_KEY]: JSON.stringify({ ...emptyFilters(), languages: [language] }) }));
      expect(held.languages).toEqual([language]);
    }
  });
});

describe("applying", () => {
  it("is the identity with nothing on", () => {
    expect(applyFilters(roster, emptyFilters(), null, nearest).map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
  });

  it.each([
    ["womanGp", ["a"]],
    ["telehealth", ["b"]],
    ["bulkBilling", ["a"]],
    ["longerAppointments", ["c"]],
    ["wheelchair", ["a"]],
    ["openBooks", ["a", "b", "d"]],
  ] as const)("%s narrows to the GPs who declare it", (key, expected) => {
    expect(applyFilters(roster, { ...emptyFilters(), [key]: true }, null, nearest).map((c) => c.id)).toEqual([...expected]);
  });

  it("requires every chosen language", () => {
    expect(applyFilters(roster, { ...emptyFilters(), languages: ["Tamil"] }, null, nearest).map((c) => c.id)).toEqual(["a"]);
    expect(applyFilters(roster, { ...emptyFilters(), languages: ["Tamil", "Urdu"] }, null, nearest)).toEqual([]);
  });

  it("applies a distance ceiling only once the place resolves, lets telehealth-first through, and never an unplaceable GP", () => {
    const within: Filters = { ...emptyFilters(), withinKm: 5 };
    expect(applyFilters(roster, within, null, nearest).map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
    expect(applyFilters(roster, within, beecroft, nearest).map((c) => c.id)).toEqual(["a", "b", "c"]);
    const cFurther = (c: Fixture) => (c.id === "c" ? 6 : nearest(c));
    expect(applyFilters(roster, { ...within, withinKm: DISTANCE_CHOICES[0] }, beecroft, cFurther).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("combines filters as AND", () => {
    expect(applyFilters(roster, { ...emptyFilters(), womanGp: true, openBooks: true }, null, nearest).map((c) => c.id)).toEqual(["a"]);
    expect(applyFilters(roster, { ...emptyFilters(), womanGp: true, telehealth: true }, null, nearest)).toEqual([]);
  });
});
