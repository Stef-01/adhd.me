// O234: the nearby map's geometry, held to the distances the ranking uses.

import { describe, expect, it } from "vitest";
import { distanceKm, SUBURBS, type SuburbPoint } from "./suburbs";
import { layoutLocalMap, stopsFor } from "./local-map";

const at = (name: string): SuburbPoint => SUBURBS.find((s) => s.suburb === name)!;
const beecroft = at("Beecroft");
const hornsby = at("Hornsby");
const epping = at("Epping");

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
});

describe("layoutLocalMap()", () => {
  const stops = stopsFor(beecroft, [
    { suburb: "Hornsby", point: hornsby },
    { suburb: "Epping", point: epping },
  ]);
  const layout = layoutLocalMap(beecroft, stops);

  it("puts the origin at the centre and every stop inside the padded box", () => {
    expect(layout.origin).toEqual({ x: 50, y: 50 });
    for (const stop of layout.stops) {
      expect(stop.x).toBeGreaterThanOrEqual(13 - 1e-9);
      expect(stop.x).toBeLessThanOrEqual(87 + 1e-9);
      expect(stop.y).toBeGreaterThanOrEqual(13 - 1e-9);
      expect(stop.y).toBeLessThanOrEqual(87 + 1e-9);
    }
  });

  it("places a stop at the distance the ranking measures, to the box's own scale", () => {
    for (const stop of layout.stops) {
      const drawn = Math.hypot(stop.x - 50, stop.y - 50) / layout.unitsPerKm;
      // Local equirectangular against great-circle: agreement well inside the gazetteer's resolution.
      expect(Math.abs(drawn - stop.km)).toBeLessThan(0.05);
    }
  });

  it("puts north up: Hornsby is north-east of Beecroft, so it lands above and to the right", () => {
    const h = layout.stops.find((s) => s.suburb === "Hornsby")!;
    expect(h.y).toBeLessThan(50);
    expect(h.x).toBeGreaterThan(50);
  });

  it("labels lean away from the edge the pin is nearest", () => {
    for (const stop of layout.stops) expect(stop.labelSide).toBe(stop.x > 50 ? "left" : "right");
  });

  it("draws at most three rings, each at its true radius, and never a ring past the reach", () => {
    expect(layout.rings.length).toBeGreaterThan(0);
    expect(layout.rings.length).toBeLessThanOrEqual(3);
    for (const ring of layout.rings) {
      expect(ring.r).toBeCloseTo(ring.km * layout.unitsPerKm, 9);
      expect(ring.km).toBeLessThanOrEqual(layout.reachKm * 1.02);
    }
  });

  it("never fits tighter than 2 km, so a same-suburb GP still gets a readable map", () => {
    const same = layoutLocalMap(beecroft, stopsFor(beecroft, [{ suburb: "Beecroft", point: beecroft }]));
    expect(same.reachKm).toBe(2);
    expect(same.rings.map((r) => r.km)).toEqual([1, 2]);
  });

  it("fits a far reach with the largest rings that fit", () => {
    const far = layoutLocalMap(beecroft, [
      { suburb: "Far", point: { ...beecroft, lat: beecroft.lat - 0.25 }, km: 27.8, positions: [1] },
    ]);
    expect(far.rings.map((r) => r.km)).toEqual([5, 10, 20]);
  });
});
