// W56 (G5-safe half). Two things are pinned here: the loader's refusal behaviour, which is
// what makes "every interval traceable to a cited source" true of whatever loads later, and
// the emptiness of the shipped catalogue, which is what keeps the G5 gate honest.
//
// The fixtures below are deliberately NOT clinical. They cite a placeholder source and use
// a fictional condition code, so this file cannot become a back door for unreviewed clinical
// content — the same posture W60 took with its placeholder register catalogue.

import { describe, expect, it } from "vitest";
import type { ConditionCode, GuidelineInterval, GuidelineIntervalId } from "@/domain/types";
import {
  SHIPPED_INTERVALS,
  citedSources,
  guidelineIntervals,
  loadIntervals,
  lookupInterval,
} from "./intervals";

const CODE = "test-placeholder-condition" as ConditionCode;

function fixture(over: Partial<GuidelineInterval> = {}): unknown {
  return {
    id: "interval-placeholder-1",
    conditionCode: CODE,
    name: "Placeholder review cadence",
    intervalMonths: 12,
    provenance: {
      citation: "Placeholder source for loader tests — not clinical guidance",
      url: "https://example.org/not-a-guideline",
      publishedOn: "2026-01-01",
      retrievedOn: "2026-08-10",
    },
    ...over,
  };
}

describe("W56 the shipped catalogue ships no clinical content", () => {
  it("is empty until the G5 ruling lands", () => {
    // This is the gate, expressed as a test. If a future edit adds intervals without the
    // founder ruling recorded in BUILD-STATE, this fails and says why.
    expect(SHIPPED_INTERVALS).toEqual([]);
    expect(guidelineIntervals().intervals).toEqual([]);
    expect(guidelineIntervals().rejected).toEqual([]);
  });

  it("every consumer must already handle 'no interval for this condition'", () => {
    // With an empty catalogue this is the only path, which is exactly the path a
    // not-yet-signed-off condition takes once real values exist.
    expect(lookupInterval(guidelineIntervals(), CODE)).toBeNull();
  });
});

describe("W56 loader: an interval without a citable source cannot enter the catalogue", () => {
  it("accepts a fully-sourced row", () => {
    const { intervals, rejected } = loadIntervals([fixture()]);
    expect(rejected).toEqual([]);
    expect(intervals).toHaveLength(1);
    expect(citedSources({ intervals, rejected })).toEqual(["https://example.org/not-a-guideline"]);
  });

  it.each([
    ["provenance missing entirely", { provenance: undefined }, /provenance missing/],
    ["citation absent", { provenance: { ...(fixture() as GuidelineInterval).provenance, citation: "" } }, /citation/],
    ["http source", { provenance: { ...(fixture() as GuidelineInterval).provenance, url: "http://example.org/x" } }, /https/],
    ["unparseable publication date", { provenance: { ...(fixture() as GuidelineInterval).provenance, publishedOn: "January 2026" } }, /publishedOn/],
    ["retrieved before published", { provenance: { ...(fixture() as GuidelineInterval).provenance, publishedOn: "2026-08-10", retrievedOn: "2026-01-01" } }, /precedes/],
  ])("refuses a row with %s", (_label, over, reason) => {
    const { intervals, rejected } = loadIntervals([fixture(over)]);
    expect(intervals).toEqual([]);
    expect(rejected[0]?.reason).toMatch(reason);
  });

  it.each([
    ["a zero interval", 0],
    ["a negative interval", -6],
    ["a fractional interval", 1.5],
    ["days mistaken for months", 365],
  ])("refuses %s", (_label, intervalMonths) => {
    const { intervals, rejected } = loadIntervals([fixture({ intervalMonths })]);
    expect(intervals).toEqual([]);
    expect(rejected[0]?.reason).toMatch(/intervalMonths/);
  });

  it("refuses duplicate ids rather than letting the last one win", () => {
    const { intervals, rejected } = loadIntervals([fixture(), fixture({ intervalMonths: 3 })]);
    expect(intervals).toHaveLength(1);
    expect(intervals[0]?.intervalMonths).toBe(12);
    expect(rejected[0]?.reason).toMatch(/duplicate/);
  });

  it("reports every refusal — a dropped interval is never silent", () => {
    const { intervals, rejected } = loadIntervals([
      fixture(),
      fixture({ id: "bad-1" as GuidelineIntervalId, provenance: undefined }),
      null,
      "not a row",
    ]);
    expect(intervals).toHaveLength(1);
    expect(rejected.map((r) => r.id)).toEqual(["bad-1", "row-2", "row-3"]);
    expect(rejected.every((r) => r.reason.length > 0)).toBe(true);
  });

  it("keeps a good row when a neighbouring row is refused", () => {
    // Partial loading matters: one bad row must not take a signed-off interval with it.
    const { intervals, rejected } = loadIntervals([fixture({ id: "bad" as GuidelineIntervalId, name: "" }), fixture()]);
    expect(intervals.map((i) => i.id)).toEqual(["interval-placeholder-1"]);
    expect(rejected.map((r) => r.id)).toEqual(["bad"]);
  });

  it("looks intervals up by condition and by name, never by hardcoded constant", () => {
    const catalogue = loadIntervals([
      fixture(),
      fixture({ id: "interval-placeholder-2" as GuidelineIntervalId, name: "Second cadence", intervalMonths: 6 }),
    ]);
    expect(lookupInterval(catalogue, CODE, "Second cadence")?.intervalMonths).toBe(6);
    expect(lookupInterval(catalogue, CODE, "No such cadence")).toBeNull();
    expect(lookupInterval(catalogue, "other-condition" as ConditionCode)).toBeNull();
  });
});
