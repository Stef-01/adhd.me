// The triage table: total, honest, and short enough to be two taps rather than a form.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { PROFESSIONS } from "./professions";
import {
  CARE_FOR,
  CARE_STAGE,
  FOR_LABELS,
  PATHWAYS,
  STAGE_LABELS,
  pathwayFor,
  type CareFor,
  type CareStage,
} from "./pathway";

describe("the pathway table", () => {
  it("answers every pair of answers, because a flow with a hole routes somebody nowhere", () => {
    for (const who of eachOf(CARE_FOR, "who the care is for")) {
      for (const stage of eachOf(CARE_STAGE, "the stages")) {
        const path = pathwayFor(who, stage);
        expect(path.for, `${who}/${stage}`).toBe(who);
        expect(path.stage, `${who}/${stage}`).toBe(stage);
      }
    }
    expect(PATHWAYS.length).toBe(CARE_FOR.length * CARE_STAGE.length);
  });

  it("holds no duplicate row, so one pair cannot mean two things", () => {
    const keys = PATHWAYS.map((p) => `${p.for}/${p.stage}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("sends every route through a profession the roster can actually show", () => {
    for (const path of eachOf(PATHWAYS, "the pathways")) {
      expect(PROFESSIONS, `${path.for}/${path.stage}`).toContain(path.through);
    }
  });

  it("separates the pathways: the two questions are not decoration", () => {
    // If every answer led to the same professional the questions would be a toll, which is the
    // failure this file's header refuses. Both questions have to move somebody somewhere.
    const forAdult = CARE_STAGE.map((s) => pathwayFor("me", s).through);
    expect(new Set(forAdult).size, "the stage question changes nothing for an adult").toBeGreaterThan(1);
    const dayToDay = CARE_FOR.map((w) => pathwayFor(w, "day-to-day").through);
    expect(new Set(dayToDay).size, "who it is for changes nothing").toBeGreaterThan(1);
  });

  it("keeps the misrouting Charmaine Bernie measured on the card that would cause it", () => {
    // Her evidence: children on an autism assessment waitlist for two years when it was never the
    // right list. The child assessment route is the one place in the product that can say so.
    expect(pathwayFor("child", "finding-out").note).toMatch(/autism/i);
  });

  it("passes the patient copy rules on every string a person reads", () => {
    for (const path of eachOf(PATHWAYS, "the pathways")) {
      const copy = `${path.lead} ${path.firstStep} ${path.note ?? ""}`;
      expect(lintLandingCopy(copy), `${path.for}/${path.stage}`).toEqual([]);
    }
    for (const who of eachOf(CARE_FOR, "who the care is for")) expect(lintLandingCopy(FOR_LABELS[who]), who).toEqual([]);
    for (const stage of eachOf(CARE_STAGE, "the stages")) expect(lintLandingCopy(STAGE_LABELS[stage]), stage).toEqual([]);
  });

  it("fits the screen's budget: no card longer than the law allows", () => {
    // The one law is 20 to 60 words a screen, and this screen is a heading, a step, a note and a
    // link. Twenty-five words of card leaves room for the trail and the control.
    for (const path of eachOf(PATHWAYS, "the pathways")) {
      const words = `${path.lead} ${path.firstStep} ${path.note ?? ""}`.trim().split(/\s+/).length;
      expect(words, `${path.for}/${path.stage}`).toBeLessThanOrEqual(25);
    }
    for (const stage of eachOf(CARE_STAGE, "the stages")) {
      expect(STAGE_LABELS[stage].split(/\s+/).length, stage).toBeLessThanOrEqual(5);
    }
  });

  it("names the answers as a person would say them, not as the code spells them", () => {
    const spelled = [...CARE_FOR, ...CARE_STAGE] as readonly string[];
    for (const who of eachOf(CARE_FOR, "who the care is for")) {
      expect(spelled, FOR_LABELS[who]).not.toContain(FOR_LABELS[who]);
    }
    for (const stage of eachOf(CARE_STAGE, "the stages")) {
      expect(spelled, STAGE_LABELS[stage]).not.toContain(STAGE_LABELS[stage]);
    }
  });
});

describe("pathwayFor", () => {
  it("throws rather than returning a half-answer for a pair outside the vocabulary", () => {
    expect(() => pathwayFor("nobody" as CareFor, "finding-out")).toThrow(/no pathway/);
    expect(() => pathwayFor("me", "someday" as CareStage)).toThrow(/no pathway/);
  });
});
