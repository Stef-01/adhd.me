import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { SUBURBS, coveredSuburbs, describeDistance, distanceKm, resolvePlace, type SuburbPoint, suggestPlaces, placeIn } from "./suburbs";

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

  it("keeps every point inside one of the focus areas, so a typo in a coordinate is caught", () => {
    // Tight boxes, not one: a single box spanning Sydney to Perth would wave through a Sydney
    // point mistyped into the Queensland range. Each suburb sits in an area the roster consults in.
    const AREAS: Record<string, [number, number, number, number]> = {
      "northern Sydney": [-33.9, -33.6, 150.9, 151.2],
      "eastern suburbs": [-33.95, -33.83, 151.2, 151.31],
      "southern Sydney": [-34.1, -33.95, 150.95, 151.15],
      "Blue Mountains": [-33.8, -33.7, 150.55, 150.7],
      "Central Coast": [-33.5, -33.3, 151.3, 151.55],
      "Snowy Mountains": [-36.5, -36.3, 148.5, 148.7],
      "Gold Coast": [-28.3, -27.7, 153.15, 153.6],
      Brisbane: [-27.6, -27.35, 152.9, 153.2],
      Perth: [-32.1, -31.8, 115.75, 116],
    };
    const inside = (s: SuburbPoint, [south, north, west, east]: [number, number, number, number]) => s.lat > south && s.lat < north && s.lon > west && s.lon < east;
    // 2026-10-01: the places people name beyond the focus areas (capitals, regional centres) are held
    // to their state instead, by the postcode's first digit, so a coordinate typed into the wrong state fails.
    const STATES: Record<string, [number, number, number, number]> = {
      "0": [-26, -10.9, 129, 138.1], "2": [-37.6, -28.1, 140.9, 153.7], "3": [-39.2, -33.9, 140.9, 150.1],
      "4": [-29.2, -10, 137.9, 153.6], "5": [-38.1, -25.9, 129, 141.1], "6": [-35.2, -13.7, 112.9, 129.1], "7": [-43.7, -39.5, 143.8, 148.5],
    };
    for (const s of SUBURBS) {
      const state = STATES[s.postcode[0]!];
      expect(Object.values(AREAS).some((box) => inside(s, box)) || (state !== undefined && inside(s, state)), `${s.suburb} is outside every focus area and its state`).toBe(true);
      expect(s.postcode).toMatch(/^\d{4}$/);
    }
  });
});

describe("O251 the Gold Coast, as a room of Gold Coast GPs would type it", () => {
  it("resolves a postcode, and says which suburb it took", () => {
    expect(resolvePlace("4220")?.suburb).toBe("Burleigh Heads");
    expect(resolvePlace("4217")?.suburb).toBe("Surfers Paradise");
  });
  it("prefers the suburb the person also named when a postcode covers several", () => {
    expect(resolvePlace("Main Beach 4217")?.suburb).toBe("Main Beach");
    expect(resolvePlace("4217 benowa")?.suburb).toBe("Benowa");
  });
  it("ignores a state name, a comma and doubled spaces", () => {
    expect(resolvePlace("Southport QLD")?.suburb).toBe("Southport");
    // O267: the regions people say to the voice finder resolve to their centres, as "Sydney" does.
    expect(resolvePlace("Gold Coast")?.suburb).toBe("Gold Coast");
    expect(resolvePlace("gold coast qld")?.postcode).toBe("4215");
    expect(resolvePlace("Brisbane")?.suburb).toBe("Brisbane");
    expect(resolvePlace("Queensland")).toBeNull();
    expect(resolvePlace("Coolangatta, 4225")?.suburb).toBe("Coolangatta");
    expect(resolvePlace("  helensvale   queensland ")?.suburb).toBe("Helensvale");
    expect(resolvePlace("Tweed Heads NSW")?.postcode).toBe("2485");
  });
  it("still refuses to guess a half-typed name", () => {
    expect(resolvePlace("Burleigh")).toBeNull();
    expect(resolvePlace("Coolang")).toBeNull();
  });
  it("suggests from two characters, prefixes first, then contains, then postcodes", () => {
    expect(suggestPlaces("b")).toEqual([]);
    expect(suggestPlaces("burl").map((s) => s.suburb)).toEqual(["Burleigh Heads", "Burleigh Waters"]);
    expect(suggestPlaces("coom").map((s) => s.suburb)).toEqual(["Coomera", "Coombabah", "Upper Coomera"]);
    expect(suggestPlaces("422").map((s) => s.postcode).every((p) => p.startsWith("422"))).toBe(true);
    expect(suggestPlaces("42").length).toBe(6);
    expect(suggestPlaces("Southport")).toEqual([]);
  });
  it("covers every Gold Coast suburb a persona consults in", () => {
    for (const name of ["Burleigh Heads", "Coolangatta", "Helensvale", "Nerang", "Varsity Lakes", "Palm Beach"]) {
      expect(resolvePlace(name)?.suburb).toBe(name);
    }
  });
});

describe("resolving what somebody typed", () => {
  it("matches a suburb name regardless of case or padding", () => {
    expect(resolvePlace("  beeCROFT ")?.suburb).toBe("Beecroft");
  });

  it("matches a postcode", () => {
    expect(resolvePlace("4215")?.suburb).toBe("Southport");
  });

  it("returns null rather than guessing at a near miss", () => {
    // W189's rule, and here it has teeth: "Beecrof" resolving to Beecroft is harmless, but the
    // same leniency sends "Richmond" to the nearest string match in the wrong state.
    for (const miss of ["Beecrof", "Bee croft", "Bondi", "9999", "", "   "]) {
      expect(resolvePlace(miss), `${miss} should not resolve`).toBeNull();
    }
  });

  it("offers the covered suburbs, so somebody can see what is in range", () => {
    expect(coveredSuburbs()).toContain("Beecroft");
    expect(coveredSuburbs().length).toBe(SUBURBS.length);
  });
});

describe("distance", () => {
  it("is zero from a place to itself", () => {
    expect(distanceKm(at("Beecroft"), at("Beecroft"))).toBeCloseTo(0, 5);
  });

  it("is symmetric", () => {
    const a = distanceKm(at("Beecroft"), at("Epping"));
    const b = distanceKm(at("Epping"), at("Beecroft"));
    expect(a).toBeCloseTo(b, 9);
  });

  it("puts Southport to Surfers Paradise in the right ballpark", () => {
    // Roughly 5km straight line. A wide band on purpose: this asserts the maths is not broken,
    // not that the centroids are survey-grade.
    const km = distanceKm(at("Southport"), at("Surfers Paradise"));
    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(8);
  });

  it("orders near before far, including across the two focus areas", () => {
    // Cheltenham is a neighbour of Beecroft; Southport is in the other state. The straight-line
    // maths must put the neighbour first.
    const origin = at("Beecroft");
    expect(distanceKm(origin, at("Cheltenham"))).toBeLessThan(distanceKm(origin, at("Southport")));
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

describe("the places people name to the finder (2026-10-01)", () => {
  it("resolves the places in the production record and the voice personas, and 'the' is noise", () => {
    for (const place of ["Parramatta", "Penrith", "Blacktown", "Marrickville", "Newtown", "Chatswood", "Wollongong", "Melbourne", "Canberra", "Hobart", "Darwin", "Geelong"]) expect(resolvePlace(place)?.suburb, place).toBe(place);
    expect(resolvePlace("the Gold Coast")?.suburb).toBe("Gold Coast");
  });
  it("still guesses nothing: a misspelling stays unresolved", () => {
    expect(resolvePlace("Paramatta")).toBeNull();
    expect(resolvePlace("Woolongong")).toBeNull();
  });
});

describe("placeIn: the place a typed sentence names (2026-10-01)", () => {
  it("reads a place after a word that says where", () => {
    expect(placeIn("A GP near Hornsby for an adult ADHD assessment, by telehealth")).toBe("Hornsby");
    expect(placeIn("I live in Parramatta and want an assessment")).toBe("Parramatta");
    expect(placeIn("a psychologist in the Gold Coast")).toBe("Gold Coast");
    expect(placeIn("someone close to Bondi Junction please")).toBe("Bondi Junction");
    expect(placeIn("an OT around 4220")).toBe("4220");
  });
  it("takes no name without such a word, and no name it does not know", () => {
    expect(placeIn("my son Logan can't sit still")).toBe("");
    expect(placeIn("she has auburn hair and ADHD")).toBe("");
    expect(placeIn("I live in Paramatta")).toBe("");
    expect(placeIn("an adult ADHD assessment")).toBe("");
  });
});

describe("placeIn: the place said last", () => {
  it("is where they are now", () => {
    expect(placeIn("I used to live in Parramatta, now in Penrith")).toBe("Penrith");
    expect(placeIn("moving from Sydney to Perth, I am in Perth from March")).toBe("Perth");
  });
});

describe("placeIn: a place they are not in", () => {
  it("is not their place", () => {
    expect(placeIn("I don't live in Sydney")).toBe("");
    expect(placeIn("not in Sydney, I'm in Penrith")).toBe("Penrith");
    expect(placeIn("I used to live in Parramatta")).toBe("");
  });
});
