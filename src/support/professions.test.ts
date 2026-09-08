import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { EXPERTISE_LABELS, EXPERTISE_TAGS, PROFESSION_ENTRIES, PROFESSIONS, professionsMentioned } from "./professions";

describe("professions", () => {
  it("cover the PRD's six P0 kinds, each with copy that passes the patient rules", () => {
    expect(PROFESSIONS.length).toBe(6);
    for (const p of eachOf(PROFESSION_ENTRIES, "the professions")) {
      expect(lintLandingCopy(`${p.label}. ${p.typicallyFor} ${p.whenToExplore}`), p.id).toEqual([]);
      expect(p.cues.length).toBeGreaterThan(0);
    }
    for (const tag of eachOf(EXPERTISE_TAGS, "the expertise tags")) expect(lintLandingCopy(EXPERTISE_LABELS[tag]), tag).toEqual([]);
  });

  it("reads the profession a sentence names, word-bounded, once each, in vocabulary order", () => {
    expect(professionsMentioned("a psychologist near Beecroft who does telehealth")).toEqual(["psychologist"]);
    expect(professionsMentioned("an OT for starting work, or a coach")).toEqual(["occupational-therapist", "adhd-coach"]);
    expect(professionsMentioned("a woman GP who bulk bills")).toEqual(["gp"]);
    expect(professionsMentioned("a hot desk and a spotlight")).toEqual([]);
    expect(professionsMentioned("")).toEqual([]);
    expect(professionsMentioned("Exercise physiologist, please")).toEqual(["exercise-physiologist"]);
  });
});
