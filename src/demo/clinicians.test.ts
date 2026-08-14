import { describe, expect, it } from "vitest";
import { clinicians, distanceTo, getPersonalizedMatch, rankClinicians, rankCliniciansNear } from "./clinicians";
import { resolvePlace } from "@/geo/suburbs";
import type { CareArea } from "./care-archetypes";

describe("demo clinician matching", () => {
  it.each([
    ["a GP who will check my heart before starting a stimulant", "daniel-okafor"],
    // Named with what distinguishes her from the other AuDHD clinician. A bare "autism and ADHD"
    // query does not separate them, and a test that forced a winner there would be pinning an
    // arbitrary weight rather than a real preference.
    ["a neurodiversity-affirming GP for a sensory-considerate autism and ADHD assessment", "grace-chen"],
    ["someone who understands adult ADHD without medication being the only answer", "tom-bennett"],
    ["a calm woman GP who speaks Hindi, I was treated for anxiety for years", "nisha-kapoor"],
    ["a young South Indian woman whose family thinks ADHD is not real", "priya-nair"],
    ["a trauma-informed GP, I have a trauma history and a difficult childhood", "erin-walsh"],
    ["telehealth, and I need to talk about drinking without being treated like an addict", "anubhav-saxena"],
  ])("ranks %s first", (request, expectedId) => {
    expect(rankClinicians(request)[0]!.id).toBe(expectedId);
  });

  it("surfaces several distinct late-diagnosis matches for the demo use case", () => {
    const ids = rankClinicians(
      "A South Indian woman whose ADHD was missed, needs Malayalam and cultural support",
    ).slice(0, 4).map((clinician) => clinician.id);

    expect(ids).toEqual(["priya-nair", "anjali-menon", "maya-singh", "nisha-kapoor"]);
  });

  it("keeps the full roster available", () => {
    expect(clinicians).toHaveLength(16);
    expect(new Set(clinicians.map((clinician) => clinician.id)).size).toBe(16);
  });

  /**
   * The roster is synthetic except where it says otherwise, and this test is what keeps that
   * sentence true. A real person's record appearing without `realPerson` would make the demo
   * quietly indistinguishable from the directory.
   */
  it("marks the one real clinician, and only that one", () => {
    const real = clinicians.filter((clinician) => clinician.realPerson);

    expect(real.map((clinician) => clinician.id)).toEqual(["anubhav-saxena"]);
  });

  /**
   * A founder in his own company's directory is a conflict whether or not the ranking favours him,
   * because the reader cannot see the ranking. The disclosure is required to exist on the record
   * and to name the interest — not merely to be a non-empty string.
   */
  it("discloses the founder interest on the founder's own listing", () => {
    const saxena = clinicians.find((clinician) => clinician.id === "anubhav-saxena")!;

    expect(saxena.founderInterest).toMatch(/co-founder/i);
    expect(saxena.founderInterest).toMatch(/ADHD\.ME/);

    for (const clinician of clinicians.filter((c) => c.id !== "anubhav-saxena")) {
      expect(clinician.founderInterest).toBeUndefined();
    }
  });

  /**
   * The founder is not ranked to the top of a generic request. This does not prove the ranking is
   * unbiased — nothing here could — but it pins the most visible way bias would show up.
   */
  it("does not float the founder to the top of an unspecific request", () => {
    const generic = "I think I might have ADHD and I would like an assessment";

    expect(rankClinicians(generic)[0]!.id).not.toBe("anubhav-saxena");
  });

  /**
   * The failure this pins is the one that made the founder effectively unlistable.
   *
   * Dr Saxena is telehealth-first, so distance is simply not a fact about seeing him. Before this
   * was fixed, giving an origin dropped him far down the list because the ranking treated his
   * rooms like everyone else's; with five results shown by default that put him behind a fold, for
   * a service that needs no travel at all. The check runs from origins in both focus areas.
   */
  it("does not let distance bury a clinician nobody has to travel to", () => {
    const request = "I need an ADHD assessment";
    const byFit = rankClinicians(request).findIndex((c) => c.id === "anubhav-saxena");
    // With two clusters, the non-telehealth clinicians legitimately reorder by distance, so his
    // ABSOLUTE index can drift by a place — the single-cluster roster never exposed that. The
    // guarantee that matters is the one the fold makes: a clinician nobody travels to is never
    // pushed behind the five results shown by default, from any origin in either focus area.
    expect(byFit).toBeLessThan(5);
    for (const suburb of ["Beecroft", "Epping", "Southport", "Robina"]) {
      const near = rankCliniciansNear(request, resolvePlace(suburb));
      const at = near.findIndex((c) => c.id === "anubhav-saxena");
      expect(at, `telehealth clinician buried at ${at} for ${suburb}`).toBeLessThan(5);
    }
  });

  it("says telehealth instead of a kilometre figure that answers no question", () => {
    const saxena = clinicians.find((c) => c.id === "anubhav-saxena")!;
    const local = clinicians.find((c) => c.id === "maya-singh")!;
    const origin = resolvePlace("Beecroft");

    expect(distanceTo(saxena, origin)).toMatch(/telehealth/i);
    expect(distanceTo(saxena, origin)).not.toMatch(/km/);
    // And a clinician you DO travel to still gets a distance.
    expect(distanceTo(local, origin)).toMatch(/km|in your suburb/);
  });

  it("marks telehealth-first explicitly rather than reading it off a display string", () => {
    // Several clinicians advertise telehealth FOLLOW-UPS and still need a first visit in person.
    // Inferring the ranking rule from practicalSignals would collapse that difference silently.
    const flagged = clinicians.filter((c) => c.telehealthFirstAppointment).map((c) => c.id);
    expect(flagged).toEqual(["anubhav-saxena"]);

    const mentionsTelehealth = clinicians.filter((c) =>
      c.practicalSignals.some((signal) => /telehealth/i.test(signal)),
    );
    expect(mentionsTelehealth.length).toBeGreaterThan(flagged.length);
  });

  it("keeps every demo clinician in one of the two focus areas", () => {
    const nsw = new Set(["Beecroft", "Cheltenham", "Pennant Hills", "Epping"]);
    const goldCoast = new Set(["Southport", "Surfers Paradise", "Broadbeach", "Robina"]);
    const focusAreas = new Set([...nsw, ...goldCoast]);

    expect(clinicians.every((clinician) => focusAreas.has(clinician.suburb))).toBe(true);
    // Both areas are represented, so the roster actually spans the geography the landing claims.
    // Dr Saxena is telehealth-first and sits in Beecroft; distance keeps him out of the ranking
    // rather than a short bus ride being implied.
    expect(clinicians.some((c) => nsw.has(c.suburb))).toBe(true);
    expect(clinicians.some((c) => goldCoast.has(c.suburb))).toBe(true);
  });

  it.each([
    ["Tamil", 2],
    ["Malayalam", 2],
    ["Hindi", 2],
    ["Punjabi", 2],
    ["Spanish", 2],
    ["Arabic", 2],
    ["Vietnamese", 2],
  ])("has multiple women clinicians who speak %s", (language, minimum) => {
    const matches = clinicians.filter((clinician) =>
      clinician.gender === "woman" && clinician.languages.includes(language),
    );

    expect(matches.length).toBeGreaterThanOrEqual(minimum);
  });

  it("only presents language as a match reason when the patient requested it", () => {
    const sofia = clinicians.find((clinician) => clinician.id === "sofia-alvarez")!;

    expect(getPersonalizedMatch(sofia, "I need a GP to assess my son at school").reason)
      .not.toContain("Spanish");
    expect(getPersonalizedMatch(sofia, "I need a Spanish-speaking GP to assess my son").reason)
      .toContain("Spanish-speaking");
  });

  it.each([
    ["trauma-informed", "Trauma-informed care"],
    ["complex-mental-health", "Complex mental-health shared care"],
    ["autism-adhd", "Co-occurring autism"],
    ["titration", "Titration and dose review"],
    ["child-adolescent-adhd", "Children and adolescents"],
    ["substance-history", "Substance history held safely"],
  ] satisfies Array<[CareArea, string]>)(
    "has multiple clinicians and a grounded explanation for %s",
    (careArea, expectedSignal) => {
      const queryByArea: Record<CareArea, string> = {
        "adhd-assessment": "I would like an ADHD assessment",
        "adult-adhd": "I am an adult seeking an ADHD assessment",
        "child-adolescent-adhd": "My son is struggling at school and I want an assessment",
        "adhd-in-women": "My coping stopped working and I think it was missed because I am a woman",
        "autism-adhd": "I am autistic and think I have ADHD as well, an AuDHD assessment",
        titration: "My dose is wearing off and I need a review of the side effects",
        "shared-care": "I am already diagnosed and need shared care with my psychiatrist",
        "non-medication": "I want alternatives and coaching, not just medication",
        "emotional-regulation": "Rejection sensitivity and shame are the hardest part",
        "comorbid-mood": "I was treated for anxiety and think it was the wrong diagnosis",
        "substance-history": "I drink too much and used cannabis, is a non-stimulant an option",
        sleep: "I am exhausted and not sleeping",
        "cardiac-screening": "Is a stimulant safe for my heart, I need my blood pressure checked",
        "disability-rights": "I am disabled and need accessible care and NDIS adjustments",
        "trauma-informed": "I need trauma-informed care that respects boundaries and asks permission",
        "complex-mental-health": "I live with PTSD and bipolar disorder and need psychiatrist shared care",
        "student-academic": "My employer is asking for a workplace adjustments letter",
      };
      const matches = clinicians.filter((clinician) => clinician.careAreas.includes(careArea));

      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(getPersonalizedMatch(matches[0]!, queryByArea[careArea]).signals).toContain(expectedSignal);
    },
  );

  /**
   * Every archetype requires `adhd-assessment`, so a clinician without it can never be matched by
   * one. An unreachable roster entry is worse than a missing one: it renders in the directory and
   * cannot be arrived at.
   */
  it("gives every clinician the assessment anchor", () => {
    for (const clinician of clinicians) {
      expect(clinician.careAreas).toContain("adhd-assessment");
    }
  });

  it("describes complex mental-health care as coordinated shared care", () => {
    const complexCareClinicians = clinicians.filter((clinician) =>
      clinician.careAreas.includes("complex-mental-health"),
    );

    for (const clinician of complexCareClinicians) {
      expect(clinician.about).toMatch(/coordinate|specialist|shared care/i);
    }
  });

  it("includes useful billing, travel and access details for every clinician", () => {
    for (const clinician of clinicians) {
      expect(clinician.practicalSignals).toHaveLength(3);
      expect(clinician.practicalSignals[0]).toMatch(/billing|bills/i);
    }

    // Travel time is only meaningful for a clinician you travel to. The telehealth-led practice
    // states its reach instead, and asserting a minute count there would be inventing one.
    for (const clinician of clinicians.filter((c) => !c.practicalSignals[1]!.match(/telehealth/i))) {
      const travelMinutes = clinician.practicalSignals[1]!.match(/^(\d+) min/);
      expect(travelMinutes, `${clinician.id} needs a travel time or a telehealth reach`).not.toBeNull();
      expect(Number(travelMinutes![1])).toBeLessThanOrEqual(30);
    }

    expect(
      clinicians.filter((clinician) => clinician.practicalSignals[0]!.toLowerCase().includes("bulk")),
    ).toHaveLength(11);
  });

  /**
   * A null portrait is a supported state, not an oversight: nothing in this tree generates a face
   * for a real person, and the surfaces render a monogram instead. This pins which entries have
   * one so a synthetic persona silently losing its portrait is caught.
   */
  it("has a portrait for every synthetic persona and none invented for the real one", () => {
    for (const clinician of clinicians.filter((c) => !c.realPerson)) {
      expect(clinician.image, `${clinician.id} should have a portrait`).toMatch(/^\/clinicians\/.+\.png$/);
    }
    for (const clinician of clinicians.filter((c) => c.realPerson)) {
      expect(clinician.image).toBeNull();
    }
  });
});
