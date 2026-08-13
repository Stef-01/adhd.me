import { describe, expect, it } from "vitest";
import { careArchetypes } from "./care-archetypes";
import { cliniciansMatchingArchetype, rankClinicians } from "./clinicians";

describe("ADHD assessment demo archetypes", () => {
  it("includes fifteen distinct qualitative journeys", () => {
    expect(careArchetypes).toHaveLength(15);
    expect(new Set(careArchetypes.map((archetype) => archetype.id)).size).toBe(15);
  });

  it.each(careArchetypes)("ranks the intended first match for $title", (archetype) => {
    expect(rankClinicians(archetype.request)[0]!.id).toBe(archetype.expectedFirstMatch);
  });

  it.each(careArchetypes)("offers multiple viable clinicians for $title", (archetype) => {
    const eligible = cliniciansMatchingArchetype(archetype);
    const eligibleIds = new Set(eligible.map((clinician) => clinician.id));
    const rankedAlternatives = rankClinicians(archetype.request)
      .slice(0, 5)
      .filter((clinician) => eligibleIds.has(clinician.id));

    expect(eligible.length).toBeGreaterThanOrEqual(2);
    expect(rankedAlternatives.length).toBeGreaterThanOrEqual(2);
  });

  it("anchors every journey on assessment rather than on a subtype", () => {
    for (const archetype of careArchetypes) {
      expect(archetype.requirements.careAreas).toContain("adhd-assessment");
    }
  });

  it("covers language, psychological safety and disability rights explicitly", () => {
    const requests = careArchetypes.map((archetype) => archetype.request.toLowerCase()).join(" ");

    expect(requests).toMatch(/tamil|malayalam/);
    expect(requests).toMatch(/hindi|punjabi/);
    expect(requests).toMatch(/spanish/);
    expect(requests).toMatch(/arabic/);
    expect(requests).toMatch(/vietnamese/);
    expect(requests).toMatch(/anxious|mental health|trauma|overwhelmed/);
    expect(requests).toMatch(/disability rights/);
  });

  it("includes distinct trauma, PTSD or bipolar, and shared-care cases", () => {
    const byId = new Map(careArchetypes.map((archetype) => [archetype.id, archetype.request.toLowerCase()]));

    expect(byId.get("trauma-informed-assessment")).toMatch(/trauma|boundaries|permission/);
    expect(byId.get("psychiatrist-shared-care")).toMatch(/ptsd/);
    expect(byId.get("psychiatrist-shared-care")).toMatch(/bipolar/);
    expect(byId.get("psychiatrist-shared-care")).toMatch(/psychiatrist|shared care/);
    expect(byId.get("perimenopause-unmasking")).toMatch(/perimenopause|hormonal/);
  });

  /**
   * An assessment product whose demo only shows confirmed cases is selling a conclusion. These
   * three journeys describe somebody who may not have ADHD at all, and they are named here so a
   * later edit that quietly turns them into confirmed cases fails.
   */
  it("keeps journeys where the answer may be no", () => {
    const byId = new Map(careArchetypes.map((archetype) => [archetype.id, archetype.request.toLowerCase()]));

    expect(byId.get("anxiety-differential-hindi")).toMatch(/wrong diagnosis|differential/);
    expect(byId.get("trauma-informed-assessment")).toMatch(/trauma/);
    expect(byId.get("child-school-spanish")).toMatch(/school|teacher/);
  });
});
