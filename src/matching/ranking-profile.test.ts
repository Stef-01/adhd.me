import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import {
  clinicians,
  rankBands,
  rankClinicians,
  rankingProfile,
  requestFitCopy,
  requestFitSummary,
  unservedAsks,
  needsFor,
  type Clinician,
} from "@/demo/clinicians";
import { syntheticClinician } from "@/demo/synthetic-clinician";
import type { CareArea } from "@/demo/care-archetypes";
import type { EIQuality } from "@/demo/emotional-fit";

const base = clinicians[0]!;

function clone(id: string, changes: Partial<Clinician>): Clinician {
  return { ...base, id, ...changes };
}

describe("2026-08-22 constraint-first ranking audit", () => {
  it("does not let accumulated care overlaps override an explicit telehealth constraint", () => {
    const telehealth = clone("telehealth", {
      telehealthFirstAppointment: true,
      careAreas: ["adhd-assessment"],
      careAreasSometimes: [],
      manner: [],
    });
    const broadInRooms = clone("broad-in-rooms", {
      telehealthFirstAppointment: undefined,
      careAreas: [
        "adhd-assessment",
        "titration",
        "shared-care",
        "depression",
        "anxiety",
        "substance-history",
        "non-medication",
      ] as CareArea[],
      manner: ["structured", "non_judgmental", "sense_making", "collaborative"] as EIQuality[],
    });
    const request =
      "I want the first appointment by phone. I also need titration, shared care, anxiety support and somewhere I can be honest about drinking.";

    expect(rankClinicians(request, [broadInRooms, telehealth])[0]!.id).toBe("telehealth");
    const needs = needsFor(request, [broadInRooms, telehealth]);
    expect(rankingProfile(telehealth, needs).constraintScore).toBeGreaterThan(0);
    expect(rankingProfile(telehealth, needs).constraintCoverage).toBe(1);
    expect(rankingProfile(broadInRooms, needs).constraintScore).toBe(0);
  });

  it("counts distinct constraints before their aggregate weight", () => {
    const moreConstraints = clone("more-constraints", {
      gender: "woman",
      languages: ["English", "Urdu"],
      telehealthFirstAppointment: undefined,
    });
    const telehealthOnly = clone("telehealth-only", {
      gender: "man",
      languages: ["English"],
      telehealthFirstAppointment: true,
    });
    const commonA = clone("common-a", {
      gender: "woman",
      languages: ["English", "Urdu"],
      telehealthFirstAppointment: undefined,
    });
    const commonB = clone("common-b", {
      gender: "woman",
      languages: ["English", "Urdu"],
      telehealthFirstAppointment: undefined,
    });
    const roster = [telehealthOnly, moreConstraints, commonA, commonB];
    const request =
      "I need a woman GP who speaks Urdu. I want the first appointment by phone";
    const needs = needsFor(request, roster);

    expect(rankingProfile(moreConstraints, needs).constraintCoverage).toBe(2);
    expect(rankingProfile(telehealthOnly, needs).constraintCoverage).toBe(1);
    expect(rankingProfile(moreConstraints, needs).constraintScore).toBeLessThan(
      rankingProfile(telehealthOnly, needs).constraintScore,
    );
    const ranked = rankClinicians(request, roster).map((clinician) => clinician.id);
    expect(ranked.indexOf("more-constraints")).toBeLessThan(ranked.indexOf("telehealth-only"));
  });

  it("never turns roster-wide coverage into a claim that each doctor is a full match", () => {
    const summary = requestFitSummary("I need a woman GP who speaks Urdu and offers telehealth");
    expect(summary.recognizedNeedCount).toBe(3);
    expect(summary.fullMatchCount).toBe(0);
    expect(requestFitCopy(summary, clinicians.length)).toBe(
      "No listed GP matches every part of your request we understood. Showing the strongest declared matches.",
    );
  });

  it("names a supported consultation-language gap instead of treating it as unreadable", () => {
    const needs = needsFor("I need a Punjabi-speaking GP");
    expect(needs.map((need) => need.label)).toContain("Punjabi-speaking");
    expect(unservedAsks("I need a Punjabi-speaking GP")[0]).toContain(
      "Punjabi-speaking is not something any GP listed today declares",
    );
  });

  it("does not invent a constraint when the reader only names care preferences", () => {
    const needs = needsFor("my dose needs titration and I want it explained without jargon");
    for (const clinician of eachOf(clinicians, "the roster")) {
      expect(rankingProfile(clinician, needs).constraintScore).toBe(0);
    }
  });

  it("uses distinct-need coverage only after constraint and weighted scores tie", () => {
    const needs = [
      { facet: { kind: "care" as const, area: "titration" as const }, matched: "dose", label: "Dose", weight: 20 },
      { facet: { kind: "care" as const, area: "anxiety" as const }, matched: "anxiety", label: "Anxiety", weight: 10 },
      { facet: { kind: "care" as const, area: "depression" as const }, matched: "mood", label: "Mood", weight: 10 },
    ];
    const narrow = clone("narrow", { careAreas: ["titration"], careAreasSometimes: [], manner: [] });
    const broad = clone("broad", { careAreas: ["anxiety", "depression"], careAreasSometimes: [], manner: [] });

    expect(rankingProfile(narrow, needs).weightedScore).toBe(rankingProfile(broad, needs).weightedScore);
    expect(rankingProfile(broad, needs).coverage).toBeGreaterThan(rankingProfile(narrow, needs).coverage);
  });

  it("keeps bands honest about the complete ranking vector, not only the raw score", () => {
    const languageMatch = clone("language-match", { languages: ["English", "Tamil"], careAreas: [] });
    const careMatch = clone("care-match", { languages: ["English"], careAreas: ["titration"] });
    const bands = rankBands("I need a Tamil-speaking GP and titration", [careMatch, languageMatch]);

    expect(bands).toHaveLength(2);
    expect(bands[0]!.clinicians[0]!.id).toBe("language-match");
    expect(bands[0]!.constraintScore).toBeGreaterThan(bands[1]!.constraintScore);
  });
});

describe("2026-08-24 M9 — tiers before summing, past the constraint tier (F9)", () => {
  /**
   * THE PINNED DEFECT, MEASURED ON THE REAL LEXICON BEFORE THIS UNIT'S FIX. A GP who declares
   * exactly the one care area asked for (`adhd-assessment`, weight 12) lost to a GP who
   * declares three manner traits the same request happens to reach (24 each, weight 72) —
   * `weightedScore` summed them into one number and 72 > 12, so three style adjectives outranked
   * a real clinical-scope match. O185 (2026-08-22) already stops this shape for a language or
   * preference constraint (`constraintScore`, compared above); it never reached care vs manner,
   * which is the gap this unit closes. Before the fix `rankClinicians` returned
   * `["manner-match", "care-match"]` for this exact pair and request — a reader would call that
   * wrong, which is the unit's own verify criterion.
   */
  it("does not let three manner traits outrank a real care-area match", () => {
    const careMatch = syntheticClinician({
      id: "care-match",
      careAreas: ["adhd-assessment"],
      manner: [],
    });
    const mannerMatch = syntheticClinician({
      id: "manner-match",
      careAreas: [],
      manner: ["structured", "non_judgmental", "sense_making"] as EIQuality[],
    });
    const request =
      "I need adhd assessment. I want a structured, non judgmental doctor who helps me make sense of things.";
    const needs = needsFor(request, [careMatch, mannerMatch]);

    expect(rankingProfile(mannerMatch, needs).weightedScore).toBeGreaterThan(
      rankingProfile(careMatch, needs).weightedScore,
    );
    expect(rankingProfile(careMatch, needs).careScore).toBeGreaterThan(0);
    expect(rankingProfile(mannerMatch, needs).mannerScore).toBeGreaterThan(
      rankingProfile(careMatch, needs).careScore,
    );

    expect(rankClinicians(request, [mannerMatch, careMatch])[0]!.id).toBe("care-match");
  });

  /**
   * The mirror case, so the tier is a real comparison and not "care always wins": with no care
   * ask in the request, a manner match still separates the field on its own — the contributory
   * tier is compared, not skipped, once the strong tier ties (both zero here).
   */
  it("still separates on manner when no care area was asked for", () => {
    const mannerRich = syntheticClinician({ id: "manner-rich", careAreas: [], manner: ["structured"] as EIQuality[] });
    const mannerNone = syntheticClinician({ id: "manner-none", careAreas: [], manner: [] });
    const request = "I want a structured doctor.";

    expect(rankClinicians(request, [mannerNone, mannerRich])[0]!.id).toBe("manner-rich");
  });

  /**
   * The tier already fixed by O185 stays fixed: a language constraint still cannot be
   * outvoted by manner, now that `weightedScore` no longer decides ties directly — it is the
   * pre-existing `constraintCoverage`/`constraintScore` steps above the new ones that hold this,
   * and this is the regression guard that the reordering did not disturb them.
   */
  it("still never lets manner traits outvote a language constraint (O185, unchanged by M9)", () => {
    const languageMatch = syntheticClinician({ id: "lang-match", languages: ["English", "Hindi"], careAreas: [], manner: [] });
    const mannerMatch = syntheticClinician({
      id: "manner-match",
      languages: ["English"],
      careAreas: [],
      manner: ["structured", "non_judgmental", "sense_making"] as EIQuality[],
    });
    const request =
      "I speak Hindi and want a structured, non judgmental doctor who helps me make sense of things.";

    expect(rankClinicians(request, [mannerMatch, languageMatch])[0]!.id).toBe("lang-match");
  });
});
