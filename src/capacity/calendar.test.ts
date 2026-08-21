// W227 verify gate: "nothing seasonal is inferred from the practice's own history; the calendar is
// data with provenance, W56's shape."
//
// The second half is a loader property and is checked the way W56 checks its own: refusals, with
// reasons, over rows that fail one way each.
//
// The FIRST half cannot be checked on this module, because this module is not where a seasonal
// inference would appear — it would appear in the forecaster. So it is checked as a behavioural
// invariant over the shipped lane: shift every recorded date by whole weeks, preserving the
// weekday and the order, and every number the lane produces must be identical. If anything in it
// read a month, a season or a distance from December, that shift would change the answer. A source
// scan backs it up, because an invariant can be satisfied today by a function nobody calls yet.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isoDaysFrom } from "@/lib/dates";
import { lintEducationCopy } from "@/education/advice-lint";
import type { SessionKey, SessionOccurrence, Weekday } from "./model";
import { forecastFill } from "./forecast";
import { backTest, scorePredictions } from "./score";
import { sessionRecommendation } from "./recommendation";
import {
  CALENDAR_UNKNOWN_COPY,
  SHIPPED_HOLIDAYS,
  calendarKnowsNothing,
  isDeclaredHoliday,
  loadCalendar,
  type CalendarDay,
} from "./calendar";

const KEY: SessionKey = { clinicianId: "c1", weekday: 4 as Weekday };
const PERIOD = { fromIso: "2026-01-01", toIso: "2026-12-31" };

/** A valid row, which every rejection fixture below breaks in exactly one way. */
const GOOD: CalendarDay = {
  id: "nsw-2026-anzac",
  jurisdiction: "NSW",
  name: "Anzac Day",
  fallsOn: "2026-04-25",
  observedOn: "2026-04-25",
  provenance: {
    citation: "Fixture only — not a real citation, and this row exists to exercise the loader.",
    url: "https://example.test/fixture",
    publishedOn: "2026-01-01",
    retrievedOn: "2026-01-02",
  },
};

/** Occurrences on a given weekday, starting at `startIso`, one per week. */
const weeksFrom = (startIso: string, rates: readonly number[], clinicianId = KEY.clinicianId): SessionOccurrence[] =>
  rates.map((rate, i) => ({
    clinicianId,
    dayIso: isoDaysFrom(startIso, i * 7),
    weekday: KEY.weekday,
    slotsOffered: 6,
    slotsFilled: Math.round(rate * 6),
  }));

const RATES = [0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1];

describe("W227 nothing seasonal is inferred from the practice's own history", () => {
  it("gives the same answer when every recorded date is shifted by whole weeks", () => {
    // Same weekday, same order, same numbers — only the calendar position moves. A lane that read
    // a month, a school term or a distance from Christmas would answer differently.
    const july = weeksFrom("2026-07-02", RATES);
    const december = weeksFrom("2026-12-03", RATES);
    expect(july[0]!.weekday).toBe(december[0]!.weekday);
    expect(july.map((o) => o.slotsFilled)).toEqual(december.map((o) => o.slotsFilled));

    const a = forecastFill(july, KEY, 6, PERIOD);
    const b = forecastFill(december, KEY, 6, PERIOD);
    expect(a.forecast && b.forecast).toBe(true);
    if (!a.forecast || !b.forecast) return;
    expect(b.range).toEqual(a.range);
    expect(b.observed).toEqual(a.observed);
    expect(b.sentence).toBe(a.sentence);
  });

  it("scores and recommends identically across the shift, all the way through the lane", () => {
    const practiceIn = (startIso: string) => [
      ...weeksFrom(startIso, RATES),
      ...["c2", "c3", "c4"].flatMap((id) => weeksFrom(startIso, RATES, id)),
    ];
    const score = (startIso: string) => {
      const occurrences = practiceIn(startIso);
      const keys = [...new Map(occurrences.map((o) => [o.clinicianId, { clinicianId: o.clinicianId, weekday: o.weekday }])).values()];
      return scorePredictions(keys.flatMap((k) => backTest(occurrences, k, PERIOD).predictions), PERIOD);
    };
    const july = score("2026-07-02");
    const december = score("2026-12-03");
    expect(july.scored).toBe(true);
    if (!july.scored || !december.scored) return;
    expect(december.hitRate).toBe(july.hitRate);
    expect(december.meanWidthSlots).toBe(july.meanWidthSlots);
    expect(december.sentence).toBe(july.sentence);

    const rJuly = sessionRecommendation(practiceIn("2026-07-02"), KEY, 3, PERIOD);
    const rDec = sessionRecommendation(practiceIn("2026-12-03"), KEY, 3, PERIOD);
    expect(rJuly.offered).toBe(true);
    if (!rJuly.offered || !rDec.offered) return;
    expect(rDec.recommendation.sentence).toBe(rJuly.recommendation.sentence);
    expect(rDec.recommendation.demandEvidence).toBe(rJuly.recommendation.demandEvidence);
  });

  it("reads no part of a date but the weekday, anywhere in the lane that computes", () => {
    // The backstop: an invariant can be satisfied today by a function nobody has called yet. The
    // calendar module itself is excluded by PATH and stated rather than pattern-matched — it is
    // the one place holidays are allowed to be named, and it declares them rather than deriving
    // them.
    const computing = ["model.ts", "forecast.ts", "score.ts", "recommendation.ts"];
    for (const file of computing) {
      const source = readFileSync(path.join(process.cwd(), "src/capacity", file), "utf8");
      const dateCalls = [...source.matchAll(/\.get(UTC)?([A-Za-z]+)\(/g)].map((m) => m[0]);
      expect([...new Set(dateCalls)], `${file} reads a date part beyond the weekday`).toEqual(
        file === "model.ts" ? [".getUTCDay("] : [],
      );
      expect(source, `${file} names a season`).not.toMatch(/\bseason(al|ality)?\b|\bquarter\b|\bschool term\b/i);
      // "holiday" may be discussed in prose but never computed from — no identifier may carry it.
      expect(source, `${file} has a holiday identifier`).not.toMatch(/\b(is|has|get|find)[A-Z]?[Hh]oliday/);
    }
  });
});

describe("W227 the calendar is data with provenance, and it ships empty", () => {
  it("ships nothing, pinned, so it cannot fill up by a well-meaning edit", () => {
    expect(SHIPPED_HOLIDAYS).toEqual([]);
  });

  it("answers honestly over an empty calendar, and says which kind of no it is", () => {
    const empty = loadCalendar(SHIPPED_HOLIDAYS);
    expect(isDeclaredHoliday(empty, "NSW", "2026-04-25")).toBe(false);
    // The distinction that stops that `false` being read as "open as usual".
    expect(calendarKnowsNothing(empty, "NSW")).toBe(true);
    expect(CALENDAR_UNKNOWN_COPY).toMatch(/gap in what has been recorded rather than a finding/);
    expect(lintEducationCopy(CALENDAR_UNKNOWN_COPY).map((f) => f.rule)).toEqual([]);
  });

  it("loads a complete row and refuses each incomplete one with its reason", () => {
    const loaded = loadCalendar([GOOD]);
    expect(loaded.days).toHaveLength(1);
    expect(loaded.rejected).toEqual([]);

    const cases: Array<[string, unknown, RegExp]> = [
      ["not an object", "2026-04-25", /not an object/],
      ["no id", { ...GOOD, id: "" }, /id missing/],
      ["no jurisdiction", { ...GOOD, jurisdiction: "" }, /applies nowhere/],
      ["no name", { ...GOOD, name: "" }, /name missing/],
      ["bad fallsOn", { ...GOOD, fallsOn: "25 April" }, /fallsOn/],
      ["no observedOn", { ...GOOD, observedOn: "" }, /the one a diary turns on/],
      ["no provenance", { ...GOOD, provenance: undefined }, /provenance missing/],
      ["thin citation", { ...GOOD, provenance: { ...GOOD.provenance, citation: "gov" } }, /too short/],
      ["http url", { ...GOOD, provenance: { ...GOOD.provenance, url: "http://example.test/x" } }, /https/],
      ["bad publishedOn", { ...GOOD, provenance: { ...GOOD.provenance, publishedOn: "2026" } }, /publishedOn/],
      ["retrieved before published", { ...GOOD, provenance: { ...GOOD.provenance, retrievedOn: "2025-12-31" } }, /precedes/],
    ];
    for (const [label, row, reason] of cases) {
      const result = loadCalendar([row]);
      expect(result.days, `${label} was accepted`).toEqual([]);
      expect(result.rejected, `${label} was dropped silently`).toHaveLength(1);
      expect(result.rejected[0]!.reason, label).toMatch(reason);
    }
  });

  it("refuses a duplicate id rather than letting the last one win", () => {
    // A silently overwritten holiday is a day the practice thinks it is closed.
    const result = loadCalendar([GOOD, { ...GOOD, observedOn: "2026-04-27" }]);
    expect(result.days).toHaveLength(1);
    expect(result.days[0]!.observedOn).toBe("2026-04-25");
    expect(result.rejected[0]!.reason).toMatch(/duplicate id/);
  });

  it("reads the observed date, never the nominal one", () => {
    // The whole reason the two are separate fields: the substitute day is the one the practice is
    // shut, and a calendar built from remembered dates gets exactly this wrong.
    const substituted = loadCalendar([{ ...GOOD, fallsOn: "2026-04-25", observedOn: "2026-04-27" }]);
    expect(isDeclaredHoliday(substituted, "NSW", "2026-04-27")).toBe(true);
    expect(isDeclaredHoliday(substituted, "NSW", "2026-04-25")).toBe(false);
    expect(isDeclaredHoliday(substituted, "VIC", "2026-04-27")).toBe(false);
  });
});
