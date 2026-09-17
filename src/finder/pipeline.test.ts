// Every finder control, held to the engine: each quick filter, the kind pill, the profile's
// other filters and the ways out of an empty list, run over the roster the finder actually shows
// (the example profiles on, as it ships) and over the real one.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { clinicians, nearestKm, professionOf, rankCliniciansNear } from "@/demo/clinicians";
import { rosterFor } from "@/demo/synthetic-roster";
import { carePreferencesFromRequest, combineCarePreferences } from "@/support/care-preferences";
import { holdsPreference } from "@/matching/needs";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { APPROACHES } from "@/demo/roster";
import { PROFESSIONS } from "@/support/professions";
import { resolvePlace } from "@/geo/suburbs";
import { BOOLEAN_FILTER_KEYS, describeFilters, DISTANCE_CHOICES, emptyFilters, relaxations, type Filters } from "./filters";
import { careKindsFor, searchRoster, waysOut } from "./pipeline";

const shipped = rosterFor(true);
const hornsby = resolvePlace("Hornsby")!;
const ids = (list: readonly { id: string }[]) => list.map((c) => c.id);

/** What each chip means, stated once here so the test cannot quietly agree with a wrong filter. */
const DECLARES = {
  womanGp: (c: (typeof shipped)[number]) => c.gender === "woman",
  telehealth: (c: (typeof shipped)[number]) => c.telehealthFirstAppointment === true,
  bulkBilling: (c: (typeof shipped)[number]) => c.practicalSignals.some((s) => /bulk/i.test(s)),
  longerAppointments: (c: (typeof shipped)[number]) => c.manner.includes("unhurried"),
  wheelchair: (c: (typeof shipped)[number]) => c.wheelchairAccessible,
  openBooks: (c: (typeof shipped)[number]) => c.acceptingNewPatients,
} as const;

describe("the quick filters", () => {
  it.each(BOOLEAN_FILTER_KEYS)("%s keeps exactly the providers who declare it, on both rosters", (key) => {
    for (const roster of [shipped, clinicians]) {
      const kept = searchRoster(roster, { ...emptyFilters(), [key]: true }, "", null);
      expect(ids(kept)).toEqual(ids(roster.filter(DECLARES[key])));
      for (const c of kept) expect(DECLARES[key](c)).toBe(true);
    }
  });

  it("every chip has somebody to show on the roster the finder ships with — a chip that can only empty the list is a dead control", () => {
    for (const key of eachOf(BOOLEAN_FILTER_KEYS, "the quick filters")) {
      expect(searchRoster(shipped, { ...emptyFilters(), [key]: true }, "", null).length).toBeGreaterThan(0);
    }
  });

  it("agrees with the ranking's own reading of a preference", () => {
    for (const c of shipped) {
      expect(DECLARES.womanGp(c)).toBe(holdsPreference(c, "woman-gp"));
      expect(DECLARES.telehealth(c)).toBe(holdsPreference(c, "telehealth-first"));
      expect(DECLARES.bulkBilling(c)).toBe(holdsPreference(c, "bulk-billing"));
      expect(DECLARES.longerAppointments(c)).toBe(holdsPreference(c, "longer-appointment"));
    }
  });

  it("switches off to the full list again, and combines as AND", () => {
    const all = searchRoster(shipped, emptyFilters(), "", null);
    expect(ids(all)).toEqual(ids(shipped));
    const both = searchRoster(shipped, { ...emptyFilters(), womanGp: true, telehealth: true }, "", null);
    for (const c of both) expect(DECLARES.womanGp(c) && DECLARES.telehealth(c)).toBe(true);
    expect(both.length).toBeLessThan(searchRoster(shipped, { ...emptyFilters(), womanGp: true }, "", null).length);
  });
});

describe("the kind of support", () => {
  it("the pill offers every kind the search reaches, each leading to exactly the list it counts — never an empty screen", () => {
    const requests = ["", "autism and ADHD", "help with sleep", "I want an Aboriginal clinician who understands spiritual health", "a psychologist near Beecroft", "an OT for starting work"];
    for (const request of eachOf(requests, "requests")) {
      const held = emptyFilters();
      const effective: Filters = { ...held, ...combineCarePreferences(held, carePreferencesFromRequest(request)) };
      const kinds = careKindsFor(shipped, effective, request, hornsby);
      expect(kinds.length).toBeGreaterThan(0);
      for (const kind of kinds) {
        const picked = searchRoster(shipped, { ...effective, professions: [kind.id] }, request, hornsby);
        expect(picked.length, `${kind.id} for "${request}"`).toBe(kind.count);
        expect(picked.length).toBeGreaterThan(0);
        for (const c of picked) expect(professionOf(c)).toBe(kind.id);
      }
      expect(kinds.reduce((n, k) => n + k.count, 0)).toBe(searchRoster(shipped, { ...effective, professions: [] }, "", hornsby).length);
    }
  });

  it("puts the kinds the sentence names first, then the richest", () => {
    const kinds = careKindsFor(shipped, emptyFilters(), "an OT for starting work, or a coach", null);
    expect(kinds.slice(0, 2).map((k) => k.id).sort()).toEqual(["adhd-coach", "occupational-therapist"]);
    for (let i = 3; i < kinds.length; i += 1) expect(kinds[i - 1]!.count).toBeGreaterThanOrEqual(kinds[i]!.count);
  });

  it("the sentence's kind is the default, and the profile's kind wins", () => {
    const named = searchRoster(shipped, emptyFilters(), "a psychologist near Beecroft", null);
    expect(named.length).toBeGreaterThan(0);
    for (const c of named) expect(professionOf(c)).toBe("psychologist");
    const held = searchRoster(shipped, { ...emptyFilters(), professions: ["gp"] }, "a psychologist near Beecroft", null);
    for (const c of held) expect(professionOf(c)).toBe("gp");
    // Every kind on the vocabulary is reachable on the shipped roster, or the profile's chip for it is dead.
    for (const id of eachOf(PROFESSIONS, "the professions")) {
      expect(searchRoster(shipped, { ...emptyFilters(), professions: [id] }, "", null).length).toBeGreaterThan(0);
    }
  });
});

describe("the profile's other filters", () => {
  it("a distance ceiling keeps everybody within it and everybody seen by telehealth first, from the place given", () => {
    for (const km of eachOf(DISTANCE_CHOICES, "the distance choices")) {
      const kept = searchRoster(shipped, { ...emptyFilters(), withinKm: km }, "", hornsby);
      expect(kept.length).toBeGreaterThan(0);
      for (const c of kept) {
        if (c.telehealthFirstAppointment) continue;
        const away = nearestKm(c, hornsby);
        expect(away).not.toBeNull();
        expect(away!).toBeLessThanOrEqual(km);
      }
      for (const c of shipped) {
        const away = nearestKm(c, hornsby);
        if (!c.telehealthFirstAppointment && away !== null && away <= km) expect(ids(kept)).toContain(c.id);
      }
      // No place yet: the ceiling waits rather than emptying the list.
      expect(searchRoster(shipped, { ...emptyFilters(), withinKm: km }, "", null).length).toBe(shipped.length);
    }
  });

  it("every language, way of working and note-taking choice keeps only who declares it, and each has somebody", () => {
    for (const language of eachOf(MATCHABLE_LANGUAGES, "the languages")) {
      const kept = searchRoster(shipped, { ...emptyFilters(), languages: [language] }, "", null);
      expect(kept.length).toBeGreaterThan(0);
      for (const c of kept) expect(c.languages).toContain(language);
    }
    for (const a of eachOf(APPROACHES, "the approaches")) {
      const kept = searchRoster(shipped, { ...emptyFilters(), approach: [a] }, "", null);
      expect(kept.length).toBeGreaterThan(0);
      for (const c of kept) expect(c.approach).toContain(a);
    }
    for (const choice of ["ai-scribe", "no-ai"] as const) {
      const kept = searchRoster(shipped, { ...emptyFilters(), consultRecording: choice }, "", null);
      expect(kept.length).toBeGreaterThan(0);
      for (const c of kept) expect(c.consultRecording).toBe(choice);
    }
  });
});

describe("the ways out of an empty list", () => {
  it("offers each held filter that alone brings somebody back, with the count the tap produces, most first", () => {
    const held: Filters = { ...emptyFilters(), womanGp: true, telehealth: true, bulkBilling: true };
    expect(searchRoster(shipped, held, "", hornsby)).toEqual([]);
    const ways = waysOut(shipped, held, "", hornsby);
    expect(ways.length).toBeGreaterThan(0);
    for (const way of ways) {
      expect(way.count).toBe(searchRoster(shipped, way.filters, "", hornsby).length);
      expect(way.count).toBeGreaterThan(0);
      expect(describeFilters(held)).toContain(way.label);
      expect(describeFilters(way.filters)).toHaveLength(describeFilters(held).length - 1);
    }
    for (let i = 1; i < ways.length; i += 1) expect(ways[i - 1]!.count).toBeGreaterThanOrEqual(ways[i]!.count);
  });

  it("offers nothing when no single filter is the cause, and nothing at all for a list that is not empty", () => {
    // Three languages nobody shares two of: dropping any one still leaves a pair nobody declares.
    const three: Filters = { ...emptyFilters(), languages: ["Tamil", "Igbo", "Mandarin"] };
    expect(searchRoster(shipped, three, "", null)).toEqual([]);
    expect(waysOut(shipped, three, "", null)).toEqual([]);
    expect(waysOut(shipped, { ...emptyFilters(), telehealth: true }, "", hornsby)).toEqual([]);
  });

  it("counts through the sentence's own care asks, so the number stated is the number the tap shows", () => {
    const request = "I want an Aboriginal clinician who understands spiritual health";
    const effective = (f: Filters): Filters => ({ ...f, ...combineCarePreferences(f, carePreferencesFromRequest(request)) });
    const held: Filters = { ...emptyFilters(), telehealth: true, wheelchair: true, languages: ["Tamil"] };
    expect(searchRoster(shipped, effective(held), request, null)).toEqual([]);
    for (const way of waysOut(shipped, held, request, null, effective)) {
      expect(way.count).toBe(searchRoster(shipped, effective(way.filters), request, null).length);
    }
  });

  it("relaxations and the chips name the same filters in the same order", () => {
    const all: Filters = {
      ...emptyFilters(), womanGp: true, openBooks: true, languages: ["Tamil", "Urdu"], withinKm: 20, consultRecording: "no-ai",
      approach: ["holistic"], professions: ["gp", "psychologist"], careNeeds: ["anxiety"], clinicianIdentity: "either", country: "Demonstration Country (fictional)",
    };
    const ways = relaxations(all);
    expect(ways.map((w) => w.label)).toEqual(describeFilters(all));
    expect(new Set(ways.map((w) => JSON.stringify(w.filters))).size).toBe(ways.length);
    for (const way of ways) expect(describeFilters(way.filters)).not.toContain(way.label);
  });
});

describe("the ranking over the narrowed roster", () => {
  it("orders exactly the providers the filters kept, never one they dropped and never fewer", () => {
    const held: Filters = { ...emptyFilters(), wheelchair: true, openBooks: true };
    const roster = searchRoster(shipped, held, "a woman GP for an ADHD assessment", hornsby);
    const ranked = rankCliniciansNear("a woman GP for an ADHD assessment", hornsby, roster);
    expect(ids(ranked).sort()).toEqual(ids(roster).sort());
  });
});
