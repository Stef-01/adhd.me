// O234/O235: the nearby map's grouping, held to the distances the ranking uses.

import { describe, expect, it } from "vitest";
import { distanceKm, SUBURBS, type SuburbPoint } from "./suburbs";
import { stopsFor } from "./local-map";

const at = (name: string): SuburbPoint => SUBURBS.find((s) => s.suburb === name)!;
const beecroft = at("Beecroft");
const hornsby = at("Hornsby");

describe("stopsFor()", () => {
  it("groups GPs by consulting suburb, keeps their list positions, and orders stops nearest first", () => {
    const stops = stopsFor(beecroft, [
      { suburb: "Hornsby", point: hornsby },
      null, // telehealth-first: not placed
      { suburb: "Beecroft", point: beecroft },
      { suburb: "Hornsby", point: hornsby },
    ]);
    expect(stops.map((s) => s.suburb)).toEqual(["Beecroft", "Hornsby"]);
    expect(stops[0]!.positions).toEqual([3]);
    expect(stops[1]!.positions).toEqual([1, 4]);
    expect(stops[0]!.km).toBeCloseTo(0, 5);
    expect(stops[1]!.km).toBeCloseTo(distanceKm(beecroft, hornsby), 6);
  });

  it("is empty when nobody can be placed", () => {
    expect(stopsFor(beecroft, [null, null])).toEqual([]);
  });

  it("carries the gazetteer point, so the map draws the stop where the rooms are", () => {
    const [stop] = stopsFor(beecroft, [{ suburb: "Hornsby", point: hornsby }]);
    expect(stop!.point).toEqual(hornsby);
  });
});
