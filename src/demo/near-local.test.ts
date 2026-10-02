// Local rooms before a screen far away, and the place and kind said in a hurry (production, 2026-10-02).

import { describe, expect, it } from "vitest";
import { clinicians, rankCliniciansNear } from "@/demo/clinicians";
import { emptyFilters } from "@/finder/filters";
import { searchRoster } from "@/finder/pipeline";
import { placeIn, resolvePlace } from "@/geo/suburbs";
import { professionsMentioned } from "@/support/professions";

const top = (request: string, place: string) => {
  const origin = resolvePlace(place)!;
  return rankCliniciansNear(request, origin, searchRoster(clinicians, emptyFilters(), request, origin));
};

describe("near a place (2026-10-02)", () => {
  it("a GP in Brisbane lists the Brisbane GPs before a Sydney GP seen by telehealth", () => {
    const list = top("A gp in Brisbane", "Brisbane");
    expect(list[0]!.suburb).toBe("Graceville");
    expect(list.findIndex((c) => c.id === "anubhav-saxena")).toBeGreaterThan(list.findIndex((c) => c.suburb === "Graceville"));
  });

  it("a misspelt psychologist is a psychologist search", () => {
    expect(professionsMentioned("A physchologist in Brisbane")).toEqual(["psychologist"]);
    expect(professionsMentioned("psychologists near me")).toEqual(["psychologist"]);
    expect(top("A physchologist in Brisbane", "Brisbane").every((c) => c.profession === "psychologist")).toBe(true);
  });

  it("a city's short name is the city", () => {
    expect(placeIn("A gp in bris")).toBe("Brisbane");
    expect(placeIn("a psych in brissie")).toBe("Brisbane");
  });
});

describe("none local (2026-10-02)", () => {
  it("says so only when nobody listed has rooms near the place", async () => {
    const { noneLocal } = await import("@/demo/clinicians");
    expect(noneLocal(top("A gp in Brisbane", "Brisbane"), resolvePlace("Brisbane"))).toBe(false);
    const sydneyGp = clinicians.filter((c) => c.id === "anubhav-saxena");
    expect(noneLocal(sydneyGp, resolvePlace("Brisbane"))).toBe(true);
  });
});

describe("closed books stay behind (2026-10-02)", () => {
  it("a local clinician not taking patients does not move above an open one by telehealth", () => {
    const origin = resolvePlace("Brisbane")!;
    const roster = clinicians.map((c) => (c.id === "beth-hansen" ? { ...c, acceptingNewPatients: false } : c));
    const list = rankCliniciansNear("A gp in Brisbane", origin, searchRoster(roster, emptyFilters(), "A gp in Brisbane", origin));
    expect(list.findIndex((c) => c.id === "beth-hansen")).toBeGreaterThan(list.findIndex((c) => c.id === "anubhav-saxena"));
  });
});
