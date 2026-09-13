// The routine after the round: short enough to be a screen, and in the right order.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { LEO_ROUTINE, LEO_SETTLED, leoRoom } from "./leo-routine";

describe("Leo's night-time routine", () => {
  it("is five steps, each named and explained in a handful of words", () => {
    expect(LEO_ROUTINE.length).toBe(5);
    for (const step of eachOf(LEO_ROUTINE, "the routine steps")) {
      expect(step.label.split(/\s+/).length, step.id).toBeLessThanOrEqual(4);
      expect(step.line.split(/\s+/).length, step.id).toBeLessThanOrEqual(6);
    }
  });

  it("closes the window first, because a step that lets more in later undoes the ones before it", () => {
    expect(LEO_ROUTINE[0]!.id).toBe("window");
  });

  it("names no step twice", () => {
    expect(new Set(LEO_ROUTINE.map((s) => s.id)).size).toBe(LEO_ROUTINE.length);
  });

  it("says the lesson rather than implying it: the mosquito is still there and Leo sleeps anyway", () => {
    expect(LEO_SETTLED).toMatch(/still out there/);
    expect(LEO_SETTLED).toMatch(/asleep/);
  });

  it("passes the patient copy rules, like every other string a person reads", () => {
    for (const step of eachOf(LEO_ROUTINE, "the routine steps")) {
      expect(lintLandingCopy(`${step.label}. ${step.line}`), step.id).toEqual([]);
    }
    expect(lintLandingCopy(LEO_SETTLED)).toEqual([]);
  });
});

describe("leoRoom", () => {
  it("turns each thing on in turn and never ahead of its step", () => {
    expect(leoRoom(0)).toEqual({ window: false, phone: false, headphones: false, book: false, light: false });
    expect(leoRoom(2)).toEqual({ window: true, phone: true, headphones: false, book: false, light: false });
    expect(leoRoom(4)).toEqual({ window: true, phone: true, headphones: true, book: true, light: false });
    expect(leoRoom(5)).toEqual({ window: true, phone: true, headphones: true, book: true, light: true });
  });

  it("does not fall over on a count outside the routine", () => {
    expect(leoRoom(-4)).toEqual({ window: false, phone: false, headphones: false, book: false, light: false });
    expect(leoRoom(99)).toEqual({ window: true, phone: true, headphones: true, book: true, light: true });
  });
});
