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
import { needForKey } from "@/matching/needs";

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
      // O252: the sentence names the list it is about, and the real roster is no longer GPs only.
      "Punjabi-speaking is not something any provider listed today declares",
    );
  });

  it("weighs lived experience with care, not ahead of it (R20, the founder's call of 02:34)", () => {
    // "help as a new mother, going back to uni, someone who has ADHD themselves": two care needs and the prompted yes,
    // at the weights the model's read carries (needForKey, as app/finder-read.ts builds them: no rarity discount).
    const needs = ["care:parenting", "care:study-school", "pref:lived-experience"].map((key) => needForKey(key)!);
    const both = clone("both", { livedExperience: undefined, telehealthFirstAppointment: undefined, careAreas: ["parenting", "study-school"] as CareArea[], careAreasSometimes: [], manner: [] });
    const livedOnly = clone("lived-only", { livedExperience: true, telehealthFirstAppointment: undefined, careAreas: ["titration"], careAreasSometimes: [], manner: [] });
    const all = clone("all", { livedExperience: true, telehealthFirstAppointment: undefined, careAreas: ["parenting", "study-school"] as CareArea[], careAreasSometimes: [], manner: [] });
    expect(rankClinicians("help as a new mother", [livedOnly, both, all], new Date(), needs).map((c) => c.id)).toEqual(["all", "both", "lived-only"]);
    expect(rankingProfile(livedOnly, needs).constraintCoverage).toBe(0);
    expect(rankingProfile(livedOnly, needs).careScore).toBeGreaterThan(0);
    // A language, telehealth or a woman is still asked for first.
    const telehealth = clone("telehealth", { telehealthFirstAppointment: true, livedExperience: undefined, careAreas: ["titration"], careAreasSometimes: [], manner: [] });
    const withTelehealth = [...needs, needForKey("pref:telehealth-first")!];
    expect(rankClinicians("help as a new mother", [both, telehealth], new Date(), withTelehealth)[0]!.id).toBe("telehealth");
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

describe("child flows (2026-10-01): what the appointment is for comes before what else it touches", () => {
  it("lists a child assessor above a coach who answers more of the story's other words", () => {
    const keys = ["care:child-adolescent-adhd", "care:executive-function", "care:study-school", "care:adhd-assessment"];
    const needs = keys.flatMap((key) => needForKey(key) ?? []);
    const coach = clone("coach", { careAreas: ["child-adolescent-adhd", "executive-function", "study-school", "non-medication"], careAreasSometimes: [], manner: [] });
    const assessor = clone("assessor", { careAreas: ["child-adolescent-adhd", "adhd-assessment", "study-school"], careAreasSometimes: [], manner: [] });
    const order = rankClinicians("his teacher thinks it might be ADHD", [coach, assessor], new Date(), needs).map((c) => c.id);
    expect(order).toEqual(["assessor", "coach"]);
  });

  it("still lets telehealth, an access constraint, come before the assessment", () => {
    const needs = ["care:adhd-assessment", "pref:telehealth-first"].flatMap((key) => needForKey(key) ?? []);
    const remote = clone("remote", { careAreas: ["executive-function"], careAreasSometimes: [], manner: [], telehealthFirstAppointment: true });
    const inRooms = clone("in-rooms", { careAreas: ["adhd-assessment"], careAreasSometimes: [], manner: [], telehealthFirstAppointment: undefined });
    expect(rankClinicians("", [inRooms, remote], new Date(), needs).map((c) => c.id)).toEqual(["remote", "in-rooms"]);
  });
});

describe("child flows: an adults-only assessor is not lifted for a child", () => {
  it("keeps the scope tier to clinicians who see children", () => {
    const needs = ["care:child-adolescent-adhd", "care:adhd-assessment", "care:executive-function"].flatMap((key) => needForKey(key) ?? []);
    const adultAssessor = clone("adult-assessor", { careAreas: ["adhd-assessment"], careAreasSometimes: [], manner: [] });
    const childCoach = clone("child-coach", { careAreas: ["child-adolescent-adhd", "executive-function"], careAreasSometimes: [], manner: [] });
    expect(rankingProfile(adultAssessor, needs).scopeScore).toBe(0);
    expect(rankClinicians("", [adultAssessor, childCoach], new Date(), needs).map((c) => c.id)).toEqual(["child-coach", "adult-assessor"]);
  });
});

describe("midlife (2026-10-01): an assessment ask lifts the assessor who also answers the rest", () => {
  it("lists the assessor who declares women's health above a coach who answers focus and work", () => {
    const needs = ["care:adhd-assessment", "care:womens-health", "care:executive-function", "care:work-career"].flatMap((key) => needForKey(key) ?? []);
    const coach = clone("coach", { careAreas: ["executive-function", "work-career"], careAreasSometimes: [], manner: [] });
    const gp = clone("gp", { careAreas: ["adhd-assessment", "womens-health"], careAreasSometimes: [], manner: [] });
    expect(rankClinicians("", [coach, gp], new Date(), needs).map((c) => c.id)).toEqual(["gp", "coach"]);
  });
});

describe("edges: for a child, an adults-only clinician does not lead", () => {
  it("lists someone who sees children above an adults-only prescriber for a child's dose review", () => {
    const needs = ["care:child-adolescent-adhd", "care:titration"].flatMap((key) => needForKey(key) ?? []);
    const adultGp = clone("adult-gp", { careAreas: ["titration"], careAreasSometimes: [], manner: [] });
    const childPsych = clone("child-psych", { careAreas: ["child-adolescent-adhd"], careAreasSometimes: [], manner: [] });
    expect(rankClinicians("", [adultGp, childPsych], new Date(), needs).map((c) => c.id)).toEqual(["child-psych", "adult-gp"]);
  });
});

describe("exercise-based help (2026-10-01, the founder's gap)", () => {
  it("lists an exercise clinician above a focus coach when exercise is how the help is asked for", () => {
    const needs = ["care:movement-exercise", "care:executive-function", "care:work-career"].flatMap((key) => needForKey(key) ?? []);
    const coach = clone("coach", { careAreas: ["executive-function", "work-career"], careAreasSometimes: [], manner: [] });
    const ep = clone("ep", { careAreas: ["movement-exercise"], careAreasSometimes: [], manner: [] });
    expect(rankClinicians("", [coach, ep], new Date(), needs).map((c) => c.id)).toEqual(["ep", "coach"]);
  });
});

describe("the 2026-10-01 personalisation sweep (1,045 combinations)", () => {
  it("lists those who see children before a language match for a child", () => {
    const needs = ["care:child-adolescent-adhd", "language:hindi"].flatMap((key) => needForKey(key) ?? []);
    const hindiAdults = clone("hindi-adults", { careAreas: ["adhd-assessment"], careAreasSometimes: [], manner: [], languages: ["English", "Hindi"] });
    const childEnglish = clone("child-english", { careAreas: ["child-adolescent-adhd"], careAreasSometimes: [], manner: [], languages: ["English"] });
    expect(rankClinicians("", [hindiAdults, childEnglish], new Date(), needs).map((c) => c.id)).toEqual(["child-english", "hindi-adults"]);
  });
  it("lists a prescriber before someone with ADHD themselves for a dose review asked alone", () => {
    const needs = ["care:titration", "pref:lived-experience"].flatMap((key) => needForKey(key) ?? []);
    const lived = clone("lived", { careAreas: [], careAreasSometimes: [], manner: [], livedExperience: true });
    const prescriber = clone("prescriber", { careAreas: ["titration"], careAreasSometimes: [], manner: [], livedExperience: undefined });
    expect(rankClinicians("", [lived, prescriber], new Date(), needs).map((c) => c.id)).toEqual(["prescriber", "lived"]);
  });
});

describe("reachable before unreachable (2026-10-01 sweep)", () => {
  it("lists a telehealth clinician before an in-person-only one hundreds of kilometres away, whatever the fit", async () => {
    const { rankCliniciansNear } = await import("@/demo/clinicians");
    const { resolvePlace } = await import("@/geo/suburbs");
    const origin = resolvePlace("Surfers Paradise")!;
    const needs = ["care:adhd-assessment", "care:anxiety"].flatMap((key) => needForKey(key) ?? []);
    const farInPerson = clone("far", { suburb: "Beecroft", careAreas: ["adhd-assessment", "anxiety"], careAreasSometimes: [], manner: [], telehealthFirstAppointment: undefined, alsoConsultsAt: [] });
    const telehealth = clone("tele", { suburb: "Graceville", careAreas: ["adhd-assessment"], careAreasSometimes: [], manner: [], telehealthFirstAppointment: true, alsoConsultsAt: [] });
    expect(rankCliniciansNear("", origin, [farInPerson, telehealth], new Date(), needs).map((c) => c.id)).toEqual(["tele", "far"]);
  });
});

describe("asked to be seen in person (2026-10-01)", () => {
  it("places a telehealth clinician by their rooms, so the near rooms come first", async () => {
    const { rankCliniciansNear } = await import("@/demo/clinicians");
    const { resolvePlace } = await import("@/geo/suburbs");
    const origin = resolvePlace("Penrith")!;
    const needs = ["care:adhd-assessment"].flatMap((key) => needForKey(key) ?? []);
    const brisbaneTele = clone("brisbane-tele", { suburb: "Graceville", careAreas: ["adhd-assessment"], careAreasSometimes: [], manner: [], telehealthFirstAppointment: true, alsoConsultsAt: [] });
    const nearRooms = clone("near-rooms", { suburb: "Glenbrook", careAreas: ["adhd-assessment"], careAreasSometimes: [], manner: [], telehealthFirstAppointment: undefined, alsoConsultsAt: [] });
    expect(rankCliniciansNear("an assessment in person", origin, [brisbaneTele, nearRooms], new Date(), needs).map((c) => c.id)).toEqual(["near-rooms", "brisbane-tele"]);
    expect(rankCliniciansNear("an assessment, telehealth or in person", origin, [brisbaneTele, nearRooms], new Date(), needs)[0]!.id).toBeDefined();
  });
});
