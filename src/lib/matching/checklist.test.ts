// M4 verify gate: the checklist is generated from the narrative's signals with a reason per
// item, the three items everybody gets are always present, and every sentence a patient reads
// passes the landing linter.

import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { CHECKLIST_TEMPLATES, TIMELINE_TEMPLATE, generateChecklist, whatToExpect } from "./checklist";
import { embedder, gp, patient } from "./test-fixtures";

const AT = "2026-09-09T00:00:00.000Z";

describe("M4 the checklist", () => {
  it("always carries the three items everybody needs, marked required", () => {
    const list = generateChecklist(patient({ narrativeText: "hello" }), embedder, AT);
    expect(list.items.filter((i) => i.required).map((i) => i.id)).toEqual(["medicare-and-id", "symptom-timeline", "medication-list"]);
    expect(list.patientId).toBe("p-1");
    expect(list.generatedAt).toBe(AT);
    expect(list.items.every((i) => !i.done)).toBe(true);
  });

  it("adds school reports and an informant for an adult with no prior assessment", () => {
    const list = generateChecklist(patient({ narrativeText: "I have struggled since I was a kid and never been assessed." }), embedder, AT);
    const ids = list.items.map((i) => i.id);
    expect(ids).toContain("school-reports");
    expect(ids).toContain("someone-who-knew-you");
    expect(list.items.find((i) => i.id === "school-reports")!.triggeredBy).toEqual(expect.arrayContaining(["long-standing", "assessment"]));
  });

  it("adds the earlier report, and drops the informant, when an assessment already exists", () => {
    const p = patient({ narrativeText: "I was diagnosed with ADHD in 2019 and moved interstate.", signals: { priorAssessment: true } });
    const ids = generateChecklist(p, embedder, AT).items.map((i) => i.id);
    expect(ids).toContain("prior-assessment-report");
    expect(ids).not.toContain("someone-who-knew-you");
  });

  it("adds parent and teacher questionnaires for a child, never the adult informant", () => {
    const ids = generateChecklist(patient({ signals: { ageGroup: "children" } }), embedder, AT).items.map((i) => i.id);
    expect(ids).toContain("parent-and-teacher-questionnaires");
    expect(ids).not.toContain("someone-who-knew-you");
  });

  it("adds medication history and the heart check from a medication history", () => {
    const ids = generateChecklist(patient({ signals: { medicationHistory: "past" } }), embedder, AT).items.map((i) => i.id);
    expect(ids).toContain("medication-history");
    expect(ids).toContain("heart-history");
  });

  it("adds the concession item from a stated cost constraint and letters from comorbidity", () => {
    const ids = generateChecklist(patient({ signals: { financialConstraint: true, comorbidities: ["anxiety"] } }), embedder, AT).items.map((i) => i.id);
    expect(ids).toContain("concession-card");
    expect(ids).toContain("letters-from-others");
  });

  it("adds sleep notes and the alcohol note from the narrative's concepts", () => {
    const ids = generateChecklist(patient({ narrativeText: "I cannot sleep and I drink more than I should." }), embedder, AT).items.map((i) => i.id);
    expect(ids).toContain("sleep-notes");
    expect(ids).toContain("alcohol-and-drugs");
  });

  it("gives every template a reason a person can act on, and passes the landing linter", () => {
    for (const t of CHECKLIST_TEMPLATES) {
      expect(t.why.length).toBeGreaterThan(20);
      expect(lintLandingCopy(`${t.label}. ${t.why}`)).toEqual([]);
    }
    for (const row of TIMELINE_TEMPLATE) expect(lintLandingCopy(`${row.heading}. ${row.prompt}`)).toEqual([]);
  });
});

describe("M4 what to expect", () => {
  it("is built from the GP's declarations and says when one is missing", () => {
    const sections = whatToExpect(patient(), gp({ credentials: { prescribingPhilosophy: null, titrationPace: null } }));
    expect(sections.map((s) => s.title)).toEqual(["How long it takes", "What you will be asked", "Medication", "Cost", "What will not happen"]);
    expect(sections.find((s) => s.title === "Medication")!.body).toMatch(/has not declared/);
  });

  it("names the declared approach to medication and pace", () => {
    const body = whatToExpect(patient(), gp()).find((s) => s.title === "Medication")!.body;
    expect(body).toMatch(/case by case/);
    expect(body).toMatch(/gradually/);
  });

  it("adds the telehealth and earlier-assessment sections only when they apply", () => {
    const titles = whatToExpect(patient({ signals: { preferredConsultStyle: "telehealth", priorAssessment: true } }), gp()).map((s) => s.title);
    expect(titles).toContain("Telehealth");
    expect(titles).toContain("Your earlier assessment");
  });

  it("passes the landing linter for every declared combination", () => {
    const philosophies = ["stimulant-first", "non-stimulant-first", "case-by-case", "non-prescribing", null] as const;
    const paces = ["gradual", "standard", "brisk", null] as const;
    for (const philosophy of philosophies) {
      for (const pace of paces) {
        const g = gp({ credentials: { prescribingPhilosophy: philosophy, titrationPace: pace } });
        for (const section of whatToExpect(patient({ signals: { preferredConsultStyle: "telehealth", priorAssessment: true } }), g)) {
          expect(lintLandingCopy(`${section.title}. ${section.body}`), `${philosophy}/${pace}/${section.title}`).toEqual([]);
        }
      }
    }
  });
});
