// The waiting checkpoints: when one is due, and when asking again would be the wrong thing.
//
// Every case here is one of Charmaine Bernie's, turned into a date. The cadence is hers (six
// months, a year, two years); so is the reason the asking stops — the review exists partly to find
// out somebody "hasn't already found care elsewhere", and continuing to ask after they have said
// so is the opposite of listening.

import { describe, expect, it } from "vitest";
import { CHECKPOINTS, CHECKPOINT_LABEL, dueCheckpoint, monthsBetween, type Checkpoint } from "./checkpoint";
import { emptyModel, type ModelRecord } from "./store";
import { eachOf } from "@/quality/non-vacuous";

const START = "2026-01-15T09:00:00.000Z";
const at = (iso: string) => new Date(iso);

function record(over: Partial<ModelRecord> = {}, startedAt: string | null = START): ModelRecord {
  return {
    ...emptyModel(),
    onboarding: startedAt ? { completedAt: startedAt } : null,
    ...over,
  };
}
const answered = (months: Checkpoint["months"], answer: Checkpoint["answer"]): Checkpoint =>
  ({ months, answer, at: "2026-07-20T00:00:00.000Z" });

describe("monthsBetween", () => {
  it("counts a month only once the day of the month comes round", () => {
    expect(monthsBetween(at(START), at("2026-07-14T09:00:00.000Z"))).toBe(5);
    expect(monthsBetween(at(START), at("2026-07-15T09:00:00.000Z"))).toBe(6);
  });

  it("crosses years, and never goes backwards", () => {
    expect(monthsBetween(at(START), at("2028-01-15T09:00:00.000Z"))).toBe(24);
    expect(monthsBetween(at(START), at("2025-01-15T09:00:00.000Z"))).toBe(0);
  });

  it("does not throw on a record whose date cannot be read", () => {
    expect(monthsBetween(at("not a date"), at(START))).toBe(0);
  });
});

describe("dueCheckpoint", () => {
  it("asks nothing before the first one, and nothing at all without onboarding", () => {
    expect(dueCheckpoint(record(), at("2026-07-14T09:00:00.000Z"))).toBeNull();
    expect(dueCheckpoint(record({}, null), at("2030-01-01T00:00:00.000Z"))).toBeNull();
  });

  it("asks each of hers in turn, at six months, a year and two years", () => {
    expect(dueCheckpoint(record(), at("2026-07-15T09:00:00.000Z"))).toBe(6);
    expect(dueCheckpoint(record({ checkpoints: [answered(6, "still-looking")] }), at("2027-01-15T09:00:00.000Z"))).toBe(12);
    expect(dueCheckpoint(
      record({ checkpoints: [answered(6, "still-looking"), answered(12, "still-looking")] }),
      at("2028-01-15T09:00:00.000Z"),
    )).toBe(24);
  });

  it("asks a person who has been away for years the LATEST question once, not all three", () => {
    // The one that would read worst: three cards in a row, each asking about a stretch of time
    // they have already lived through.
    expect(dueCheckpoint(record(), at("2029-06-01T00:00:00.000Z"))).toBe(24);
  });

  it("stops for good once somebody says they found care", () => {
    const found = record({ checkpoints: [answered(6, "found-care")] });
    expect(dueCheckpoint(found, at("2027-01-15T09:00:00.000Z"))).toBeNull();
    expect(dueCheckpoint(found, at("2030-01-15T09:00:00.000Z"))).toBeNull();
  });

  it("lets 'not now' skip its own checkpoint and no more", () => {
    const notNow = record({ checkpoints: [answered(6, "not-now")] });
    expect(dueCheckpoint(notNow, at("2026-08-15T09:00:00.000Z"))).toBeNull();
    expect(dueCheckpoint(notNow, at("2027-01-15T09:00:00.000Z"))).toBe(12);
  });

  it("never asks the same checkpoint twice, whatever the answer was", () => {
    for (const answer of eachOf(["still-looking", "found-care", "not-now"] as const, "the answers")) {
      const r = record({ checkpoints: [answered(6, answer)] });
      expect(dueCheckpoint(r, at("2026-09-15T09:00:00.000Z")), answer).not.toBe(6);
    }
  });

  it("runs out after the last one rather than asking forever", () => {
    const all = record({ checkpoints: CHECKPOINTS.map((m) => answered(m, "still-looking")) });
    expect(dueCheckpoint(all, at("2035-01-01T00:00:00.000Z"))).toBeNull();
  });
});

describe("the label on the card", () => {
  it("names every checkpoint in at most two words, because the card has a budget", () => {
    for (const months of eachOf(CHECKPOINTS, "the checkpoints")) {
      const label = CHECKPOINT_LABEL[months];
      expect(label, `${months} months`).toBeTruthy();
      expect(label.split(/\s+/).length, label).toBeLessThanOrEqual(2);
    }
  });
});
