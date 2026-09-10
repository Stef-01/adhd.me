// M1 verify gate, end to end: over the real demo roster a narrative yields at most three
// matches, each with a rationale that quotes no patient text and passes the landing linter; the
// run is deterministic; contested capacity is honoured through deferred acceptance; and the
// rationale is the ranking's own evidence.

import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { patientFromIntake, rosterGPs } from "./adapters";
import { PRESENTED_PER_PATIENT, fittedEmbedder, matchPatient } from "./pipeline";
import { gp, patient } from "./test-fixtures";

const TODAY = new Date("2026-09-09T00:00:00.000Z");
const NOW = "2026-09-09T00:00:00.000Z";
const roster = rosterGPs(TODAY);
const embedder = fittedEmbedder(roster);

const intake = (id: string, narrative: string, suburb = "Epping") =>
  patientFromIntake({ id, name: "Example", narrative, suburb, ageGroup: "adults", createdAt: NOW }, embedder);

const NARRATIVE =
  "I am 34 and I think I have had ADHD my whole life. I want an adult assessment with someone who will not rush me, " +
  "and I have anxiety too. Telehealth would be easier. I am embarrassed to be asking.";

describe("M1 the pipeline over the demo roster", () => {
  it("presents up to three, in the patient's preference order, with a rationale each", () => {
    const outcome = matchPatient(intake("p", NARRATIVE), roster, { embedder, now: NOW });
    expect(outcome.presented.length).toBeGreaterThan(0);
    expect(outcome.presented.length).toBeLessThanOrEqual(PRESENTED_PER_PATIENT);
    expect(outcome.presented.map((p) => p.match.position)).toEqual(outcome.presented.map((_, i) => i + 1));
    for (let i = 1; i < outcome.presented.length; i++) {
      expect(outcome.presented[i - 1]!.match.patientRankScore).toBeGreaterThanOrEqual(outcome.presented[i]!.match.patientRankScore);
    }
    for (const { match, gp } of outcome.presented) {
      expect(match.rationale.headline.length).toBeGreaterThan(8);
      expect(match.rationale.points.length).toBeGreaterThan(0);
      expect(match.matchStatus).toBe("proposed");
      expect(gp.telehealthAvailable).toBe(true);
      expect(match.gpRankScore).toBeGreaterThan(0);
    }
    expect(outcome.shortlist.candidates.length).toBeGreaterThan(0);
  });

  it("is deterministic: the same intake gives the same presentation", () => {
    const a = matchPatient(intake("p", NARRATIVE), roster, { embedder, now: NOW });
    const b = matchPatient(intake("p", NARRATIVE), [...roster].reverse(), { embedder, now: NOW });
    expect(b.presented.map((p) => p.match)).toEqual(a.presented.map((p) => p.match));
  });

  it("quotes no patient text in any rationale, and every sentence passes the landing linter", () => {
    const secret = "ZEBRAWORD";
    const outcome = matchPatient(intake("p", `${NARRATIVE} ${secret}`), roster, { embedder, now: NOW });
    for (const { match } of outcome.presented) {
      const text = [match.rationale.headline, ...match.rationale.points].join(" ");
      expect(text).not.toMatch(secret);
      expect(lintLandingCopy(text), text).toEqual([]);
      for (const b of match.patientBreakdown) expect(lintLandingCopy(b.sentence), b.sentence).toEqual([]);
    }
  });

  it("explains from the shared concepts, which are the embedding's own dimensions", () => {
    const outcome = matchPatient(intake("p", NARRATIVE), roster, { embedder, now: NOW });
    const first = outcome.presented[0]!;
    expect(first.match.rationale.sharedConcepts.length).toBeGreaterThan(0);
    expect(first.match.rationale.headline).toContain(first.match.rationale.sharedConcepts[0]);
  });

  it("puts a child's request with GPs who see children", () => {
    const child = patientFromIntake(
      { id: "c", name: "Parent", narrative: "My son is nine and school thinks he needs an ADHD assessment.", suburb: "Epping", ageGroup: "children", createdAt: NOW },
      embedder,
    );
    const outcome = matchPatient(child, roster, { embedder, now: NOW });
    expect(outcome.presented.length).toBeGreaterThan(0);
    for (const { gp } of outcome.presented) expect(gp.credentials.ageGroupsTreated).toContain("children");
  });

  it("says so, rather than padding, when the constraints leave nobody", () => {
    const outcome = matchPatient(intake("p", NARRATIVE), roster.map((g) => ({ ...g, acceptingNewPatients: false })), { embedder, now: NOW });
    expect(outcome.presented).toEqual([]);
    expect(outcome.shortlist.candidates).toEqual([]);
    expect(outcome.note).toMatch(/Only 0/);
  });
});

describe("M1 contested capacity goes through deferred acceptance", () => {
  const one = gp({ id: "only", credentials: { caseloadCapacityCurrent: 1, caseloadCapacityMax: 1 } });

  it("holds the patient the GP prefers when two want the last place", () => {
    const preferred = patient({ id: "a", narrativeText: "adult ADHD assessment, unhurried, titration on a schedule", signals: { comorbidities: ["anxiety"] } });
    const other = patient({ id: "b", narrativeText: "I want to talk about parking", signals: { ageGroup: "older-adults" } });
    const forA = matchPatient(preferred, [one], { embedder, now: NOW, openPatients: [other] });
    const forB = matchPatient(other, [one], { embedder, now: NOW, openPatients: [preferred] });
    expect(forA.presented.map((p) => p.gp.id)).toEqual(["only"]);
    expect(forB.presented).toEqual([]);
    expect(forB.note).toMatch(/holding other requests/);
  });

  it("does not propose a patient the GP declared unacceptable", () => {
    const strict = gp({ id: "strict", preferences: { acceptsComplexComorbidity: false } });
    const complex = patient({ id: "x", signals: { comorbidities: ["anxiety", "depression"] } });
    const outcome = matchPatient(complex, [strict], { embedder, now: NOW });
    expect(outcome.shortlist.candidates.length).toBe(1);
    expect(outcome.gpRankings.get("strict")!.acceptable).toBe(false);
    expect(outcome.presented).toEqual([]);
  });

  it("stamps the clock and uses the caller's id scheme", () => {
    const outcome = matchPatient(patient(), [gp()], { embedder, now: NOW, matchId: (p, g) => `${p}+${g}` });
    expect(outcome.presented[0]!.match.id).toBe("p-1+gp-1");
    expect(outcome.presented[0]!.match.createdAt).toBe(NOW);
  });
});
