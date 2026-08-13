import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { SUBURBS, coveredSuburbs, describeDistance, distanceKm, resolvePlace } from "./suburbs";

const at = (name: string) => resolvePlace(name)!;

describe("the gazetteer covers what the roster claims", () => {
  /**
   * The load-bearing test. A clinician in an unlisted suburb cannot be given a distance, and the
   * failure mode without this is silent: they rank last for every search, forever, and nothing
   * says why. This makes adding a practice in a new suburb fail loudly instead.
   */
  it("has a point for every suburb a clinician practises in", () => {
    for (const clinician of clinicians) {
      expect(resolvePlace(clinician.suburb), `${clinician.suburb} is not in the gazetteer`).not.toBeNull();
    }
  });

  it("has no duplicate suburbs", () => {
    expect(new Set(SUBURBS.map((s) => s.suburb)).size).toBe(SUBURBS.length);
  });

  it("keeps every point inside greater Sydney, so a typo in a coordinate is caught", () => {
    for (const s of SUBURBS) {
      expect(s.lat, `${s.suburb} latitude`).toBeGreaterThan(-34.2);
      expect(s.lat, `${s.suburb} latitude`).toBeLessThan(-33.5);
      expect(s.lon, `${s.suburb} longitude`).toBeGreaterThan(150.6);
      expect(s.lon, `${s.suburb} longitude`).toBeLessThan(151.35);
      expect(s.postcode).toMatch(/^\d{4}$/);
    }
  });
});

describe("resolving what somebody typed", () => {
  it("matches a suburb name regardless of case or padding", () => {
    expect(resolvePlace("  blACKtown ")?.suburb).toBe("Blacktown");
  });

  it("matches a postcode", () => {
    expect(resolvePlace("2770")?.suburb).toBe("Mount Druitt");
  });

  it("returns null rather than guessing at a near miss", () => {
    // W189's rule, and here it has teeth: "Blacktow" resolving to Blacktown is harmless, but the
    // same leniency sends "Richmond" to the nearest string match on the other side of the city.
    for (const miss of ["Blacktow", "Black town", "Bondi", "9999", "", "   "]) {
      expect(resolvePlace(miss), `${miss} should not resolve`).toBeNull();
    }
  });

  it("offers the covered suburbs, so somebody can see what is in range", () => {
    expect(coveredSuburbs()).toContain("Blacktown");
    expect(coveredSuburbs().length).toBe(SUBURBS.length);
  });
});

describe("distance", () => {
  it("is zero from a place to itself", () => {
    expect(distanceKm(at("Blacktown"), at("Blacktown"))).toBeCloseTo(0, 5);
  });

  it("is symmetric", () => {
    const a = distanceKm(at("Blacktown"), at("Parramatta"));
    const b = distanceKm(at("Parramatta"), at("Blacktown"));
    expect(a).toBeCloseTo(b, 9);
  });

  it("puts Blacktown to Parramatta in the right ballpark", () => {
    // Roughly 10km straight line. A wide band on purpose: this asserts the maths is not broken,
    // not that the centroids are survey-grade.
    const km = distanceKm(at("Blacktown"), at("Parramatta"));
    expect(km).toBeGreaterThan(7);
    expect(km).toBeLessThan(13);
  });

  it("orders near before far", () => {
    const origin = at("Blacktown");
    expect(distanceKm(origin, at("Doonside"))).toBeLessThan(distanceKm(origin, at("Parramatta")));
  });
});

describe("how a distance is said", () => {
  it("never states a travel time, only a straight-line distance, and hedges it", () => {
    // The failure this prevents is the one the hardcoded "12 min by train" string was already
    // making: a travel time this product cannot know, printed as though it could.
    for (const km of [0.05, 0.4, 1.2, 4.9, 18]) {
      const said = describeDistance(km);
      expect(said).not.toMatch(/min|hour|train|bus|walk/i);
      if (km >= 0.1) expect(said).toMatch(/^about /);
    }
  });

  it("says 'in your suburb' rather than 'about 0 km away'", () => {
    expect(describeDistance(0.02)).toBe("in your suburb");
  });

  it("keeps one decimal under a kilometre and whole numbers above", () => {
    expect(describeDistance(0.44)).toBe("about 0.4 km away");
    expect(describeDistance(4.4)).toBe("about 4 km away");
    expect(describeDistance(4.6)).toBe("about 5 km away");
  });
});
