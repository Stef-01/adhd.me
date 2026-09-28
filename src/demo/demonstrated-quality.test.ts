// Demonstrated quality in the order (src/db/quality.ts, applied in `rankClinicians`): it counts
// alongside fit, and three things hold whatever the stars say. With none, nothing moves. It scales
// the evidence a clinician declared and never creates any: a clinician who answers nothing asked
// never passes one who does. And a language or access ask is never outvoted by it.

import { describe, expect, it } from "vitest";
import { capacityGrade, needsFor, rankClinicians, rankCliniciansNear, rankingProfile, type Clinician, type Demonstrated } from "./clinicians";
import { rosterFor } from "./synthetic-roster";
import { REACH_CORPUS } from "@/matching/corpus";
import { resolvePlace } from "@/geo/suburbs";
import { MAX_QUALITY } from "@/db/quality";

const TODAY = new Date("2026-09-28T00:00:00Z");
const roster = rosterFor(true);
const ids = (list: readonly Clinician[]) => list.map((c) => c.id);
const BEST = 1 + MAX_QUALITY;
const WORST = 1 - MAX_QUALITY;
/** Everyone at `value`, except the named ones. */
const everyone = (value: number, except: Record<string, number> = {}): Demonstrated =>
  Object.fromEntries(roster.map((c) => [c.id, except[c.id] ?? value]));

describe("demonstrated quality in the order", () => {
  it("moves nothing when nobody has enough rated visits", () => {
    for (const { text } of REACH_CORPUS.slice(0, 80)) {
      expect(ids(rankClinicians(text, roster, TODAY, undefined, {})), text).toEqual(ids(rankClinicians(text, roster, TODAY)));
    }
  });

  it("puts the clinician whose visits went better first when fit is level", () => {
    const text = "ADHD assessment for my son";
    const order = rankClinicians(text, roster, TODAY);
    const needs = needsFor(text, roster);
    const level = (a: Clinician, b: Clinician) =>
      JSON.stringify(rankingProfile(a, needs)) === JSON.stringify(rankingProfile(b, needs)) && capacityGrade(a, TODAY) === capacityGrade(b, TODAY);
    const at = order.findIndex((c, i) => i > 0 && level(order[i - 1]!, c));
    expect(at, "two clinicians level on fit").toBeGreaterThan(0);
    const later = order[at]!;
    const reordered = rankClinicians(text, roster, TODAY, undefined, { [later.id]: 1.05 });
    expect(reordered.indexOf(later)).toBeLessThan(at);
  });

  it("never lets a clinician who answers nothing asked pass one who does", () => {
    let checked = 0;
    for (const { text } of REACH_CORPUS.slice(0, 80)) {
      const needs = needsFor(text, roster);
      if (needs.length === 0) continue;
      const answers = (c: Clinician) => rankingProfile(c, needs).coverage > 0;
      const favoured = everyone(WORST, Object.fromEntries(roster.filter((c) => !answers(c)).map((c) => [c.id, BEST])));
      const order = rankClinicians(text, roster, TODAY, undefined, favoured);
      const firstSilent = order.findIndex((c) => !answers(c));
      if (firstSilent < 0) continue;
      checked += 1;
      expect(order.slice(firstSilent).some(answers), text).toBe(false);
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("never outvotes a language or access ask", () => {
    for (const text of ["a psychiatrist who speaks Hindi", "ADHD review by telehealth", "a GP who speaks Urdu for my ADHD medication"]) {
      const needs = needsFor(text, roster);
      const constraints = (c: Clinician) => rankingProfile(c, needs).constraintCoverage;
      const most = Math.max(...roster.map(constraints));
      expect(most, text).toBeGreaterThan(0);
      const favoured = everyone(WORST, Object.fromEntries(roster.filter((c) => constraints(c) < most).map((c) => [c.id, BEST])));
      const order = rankClinicians(text, roster, TODAY, undefined, favoured);
      const answering = roster.filter((c) => constraints(c) === most).length;
      expect(order.slice(0, answering).every((c) => constraints(c) === most), text).toBe(true);
    }
  });

  it("never lifts a clinician whose books are closed past an open one level with them", () => {
    let checked = 0;
    for (const { text } of REACH_CORPUS.slice(0, 80)) {
      const needs = needsFor(text, roster);
      const declared = (c: Clinician) => JSON.stringify(rankingProfile(c, needs));
      const closed = roster.filter((c) => !c.acceptingNewPatients);
      const order = rankClinicians(text, roster, TODAY, undefined, everyone(1, Object.fromEntries(closed.map((c) => [c.id, BEST]))));
      for (const shut of closed) {
        const behind = order.slice(order.indexOf(shut) + 1).filter((c) => c.acceptingNewPatients && declared(c) === declared(shut));
        checked += 1;
        expect(behind.map((c) => c.id), `${shut.id} on "${text}"`).toEqual([]);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("near a place, still orders by distance among clinicians level in fit and standing", () => {
    const text = "someone for adult ADHD";
    const origin = resolvePlace("Hornsby");
    expect(ids(rankCliniciansNear(text, origin, roster, TODAY, undefined, {}))).toEqual(ids(rankCliniciansNear(text, origin, roster, TODAY)));
  });
});
