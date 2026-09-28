import { describe, expect, it } from "vitest";
import { MAX_QUALITY, MIN_VISITS, clinicianQuality, clinicianSignals, type ClinicianSignal } from "./quality";

const visits = (clinicianId: string, stars: number, n: number) => Array.from({ length: n }, () => ({ clinicianId, stars: stars as 1 | 2 | 3 | 4 | 5 }));
const quality = (...ratings: ReturnType<typeof visits>[]) => clinicianQuality(clinicianSignals(ratings.flat()));

describe("demonstrated quality", () => {
  it("counts visits and stars per clinician", () => {
    expect(clinicianSignals([...visits("a", 5, 2), ...visits("b", 3, 1)])).toEqual<ClinicianSignal[]>([
      { clinicianId: "a", visits: 2, stars: 10 },
      { clinicianId: "b", visits: 1, stars: 3 },
    ]);
  });

  it("says nothing until a clinician has enough visits", () => {
    expect(quality(visits("a", 1, MIN_VISITS - 1), visits("b", 5, MIN_VISITS - 1))).toEqual({});
    expect(quality()).toEqual({});
  });

  it("moves a clinician whose visits go better or worse than everybody's, a step at a time", () => {
    const q = quality(visits("good", 5, 12), visits("poor", 2, 12), visits("usual", 4, 12));
    expect(q.good).toBeGreaterThan(1);
    expect(q.poor).toBeLessThan(1);
    expect(q.usual).toBeUndefined();
    for (const value of Object.values(q)) expect(Math.round(value * 100) % 5).toBe(0);
  });

  it("stays within its bound however many visits agree", () => {
    const q = quality(visits("good", 5, 500), visits("poor", 1, 500));
    expect(q.good).toBeLessThanOrEqual(1 + MAX_QUALITY);
    expect(q.poor).toBeGreaterThanOrEqual(1 - MAX_QUALITY);
  });

  it("is slow: the same stars over more visits move a clinician further", () => {
    const few = quality(visits("x", 3, MIN_VISITS), visits("others", 4, 400)).x!;
    const many = quality(visits("x", 3, 60), visits("others", 4, 400)).x!;
    expect(many).toBeLessThan(few);
  });
});
