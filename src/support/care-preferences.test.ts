import { describe, expect, it } from "vitest";
import { carePreferencesFromRequest, matchesCare, publicIdentity, type CareProvider } from "./care-preferences";
import { emptyFilters, readFilters, FILTERS_KEY } from "@/finder/filters";
const declared: CareProvider = { careProfile: { needs: ["spiritual-wellbeing", "university-adjustments"], source: "https://example.org/clinician-declaration", declaredAt: "2026-09-14", identity: { identities: ["aboriginal"], country: "Wiradjuri", publish: true } } };
describe("declared care matching", () => {
  it("keeps declared occasional care eligible without promoting its ranking grade", () => {
    expect(matchesCare({ careAreasSometimes: ["anxiety"] }, { careNeeds: ["anxiety"] })).toBe(true);
    expect(matchesCare({ careAreasSometimes: ["anxiety"] }, { careNeeds: ["autism"] })).toBe(false);
  });
  it("requires identity and spiritual-care experience independently", () => {
    const preferences = carePreferencesFromRequest("I want an Aboriginal clinician who understands spiritual health and ADHD");
    expect(preferences).toEqual({ clinicianIdentity: "aboriginal", careNeeds: ["spiritual-wellbeing"] });
    expect(matchesCare(declared, preferences)).toBe(true);
    expect(matchesCare({}, preferences)).toBe(false);
    expect(matchesCare({ careProfile: { ...declared.careProfile!, needs: [] } }, preferences)).toBe(false);
  });
  it("never infers clinician identity from the patient's identity or negated wording", () => {
    expect(carePreferencesFromRequest("I am Aboriginal and need help").clinicianIdentity).toBe("any");
    expect(carePreferencesFromRequest("a non-Aboriginal clinician").clinicianIdentity).toBe("any");
    expect(carePreferencesFromRequest("I do not need an Aboriginal clinician").clinicianIdentity).toBe("any");
    expect(carePreferencesFromRequest("No anxiety support, but spiritual wellbeing matters").careNeeds).toEqual(["spiritual-wellbeing"]);
  });
  it("handles either identity without collapsing Torres Strait Islander into Aboriginal", () => {
    expect(carePreferencesFromRequest("Aboriginal or Torres Strait Islander clinician").clinicianIdentity).toBe("either");
    expect(carePreferencesFromRequest("Torres Strait Islander psychologist").clinicianIdentity).toBe("torres-strait-islander");
    expect(matchesCare(declared, { clinicianIdentity: "torres-strait-islander" })).toBe(false);
  });
  it("requires an explicitly public declaration and matches Country separately from address", () => {
    expect(matchesCare(declared, { country: " wiradjuri " })).toBe(true);
    expect(matchesCare(declared, { country: "Gadigal" })).toBe(false);
    const privateProfile = { careProfile: { ...declared.careProfile!, identity: { ...declared.careProfile!.identity!, publish: false } } };
    expect(publicIdentity(privateProfile)).toBeUndefined();
    expect(matchesCare(privateProfile, { clinicianIdentity: "aboriginal" })).toBe(false);
    expect(matchesCare({ careProfile: { ...declared.careProfile!, source: "" } }, { careNeeds: ["spiritual-wellbeing"] })).toBe(false);
  });
  it("preserves valid preferences and discards unsupported stored values", () => {
    const raw = JSON.stringify({ ...emptyFilters(), clinicianIdentity: "aboriginal", careNeeds: ["university-adjustments", "constructor", "made-up"], country: "Wiradjuri" });
    const held = readFilters({ getItem: key => key === FILTERS_KEY ? raw : null });
    expect(held.careNeeds).toEqual(["university-adjustments"]);
    expect(held.clinicianIdentity).toBe("aboriginal");
  });
});
