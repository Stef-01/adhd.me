import { describe, expect, it } from "vitest";
import { clinicians, getPersonalizedMatch, rankClinicians } from "./clinicians";

describe("demo clinician matching", () => {
  it.each([
    ["a cardiac focused GP", "daniel-okafor"],
    ["someone with renal and kidney experience", "linh-nguyen"],
    ["a GP experienced with dialysis", "aisha-rahman"],
    ["someone who understands adult ADHD", "tom-bennett"],
    ["a calm woman GP", "nisha-kapoor"],
    ["a young South Indian woman seeking PCOS and mental health care", "priya-nair"],
    ["a young South Indian woman seeking PMOS and mental health care", "priya-nair"],
  ])("ranks %s first", (request, expectedId) => {
    expect(rankClinicians(request)[0]!.id).toBe(expectedId);
  });

  it("surfaces several distinct PCOS and mental-health matches for the demo use case", () => {
    const ids = rankClinicians(
      "A young South Indian woman with PCOS who needs mental health and cultural support",
    ).slice(0, 4).map((clinician) => clinician.id);

    expect(ids).toEqual(["priya-nair", "anjali-menon", "nisha-kapoor", "maya-singh"]);
  });

  it("keeps the full synthetic roster available", () => {
    expect(clinicians).toHaveLength(15);
    expect(new Set(clinicians.map((clinician) => clinician.id)).size).toBe(15);
  });

  it("keeps every demo clinician in Blacktown or a neighbouring suburb", () => {
    const blacktownArea = new Set([
      "Blacktown",
      "Doonside",
      "Glenwood",
      "Kings Langley",
      "Lalor Park",
      "Marayong",
      "Mount Druitt",
      "Prospect",
      "Quakers Hill",
      "Rooty Hill",
      "Seven Hills",
      "Toongabbie",
      "Woodcroft",
    ]);

    expect(clinicians.every((clinician) => blacktownArea.has(clinician.suburb))).toBe(true);
    expect(clinicians.filter((clinician) => clinician.suburb === "Blacktown")).toHaveLength(2);
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

    expect(getPersonalizedMatch(sofia, "I need a woman GP for PCOS and sustainable health").reason)
      .not.toContain("Spanish");
    expect(getPersonalizedMatch(sofia, "I need a Spanish-speaking woman GP for PCOS").reason)
      .toContain("Spanish-speaking");
  });

  it.each([
    ["trauma-informed", "Trauma-informed care"],
    ["complex-mental-health", "Complex mental-health shared care"],
    ["maternal-depression", "Maternal depression experience"],
  ])("has multiple clinicians and a grounded explanation for %s", (careArea, expectedSignal) => {
    const queryByArea: Record<string, string> = {
      "trauma-informed": "I need trauma-informed care that respects boundaries and asks permission",
      "complex-mental-health": "I live with PTSD and bipolar disorder and need psychiatrist shared care",
      "maternal-depression": "I need support for maternal depression after birth",
    };
    const matches = clinicians.filter((clinician) => clinician.careAreas.includes(careArea));

    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(getPersonalizedMatch(matches[0]!, queryByArea[careArea]!).signals).toContain(expectedSignal);
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

      const travelMinutes = clinician.practicalSignals[1]!.match(/^(\d+) min/);
      expect(travelMinutes).not.toBeNull();
      expect(Number(travelMinutes![1])).toBeLessThanOrEqual(30);
    }

    expect(
      clinicians.filter((clinician) => clinician.practicalSignals[0]!.toLowerCase().includes("bulk")),
    ).toHaveLength(11);
  });
});
