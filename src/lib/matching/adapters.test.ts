// M1 verify gate: the roster adapter invents nothing for a real person, declares deterministic
// examples for synthetic entries, and the intake reader takes only what the person stated.

import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/roster";
import { demoRoster } from "@/demo/synthetic-roster";
import { gpFromClinician, patientFromIntake, readStructuredSignals, rosterGPs, statedDurationMonths } from "./adapters";
import { embedder } from "./test-fixtures";

const TODAY = new Date("2026-09-09T00:00:00.000Z");

describe("M1 the roster becomes GPs", () => {
  it("maps every GP and leaves allied entries out", () => {
    const gps = rosterGPs(TODAY);
    const rosterGpCount = demoRoster.filter((c) => c.profession === undefined || c.profession === "gp").length;
    expect(gps.length).toBe(rosterGpCount);
    expect(gps.every((g) => g.conditions.includes("adhd"))).toBe(true);
  });

  it("invents nothing for a real person: undeclared fields are null", () => {
    for (const real of clinicians) {
      const gp = gpFromClinician(real, TODAY)!;
      expect(gp.realPerson).toBe(true);
      expect(gp.credentials.yearsTreatingAdhd).toBeNull();
      expect(gp.credentials.aadpaTrained).toBeNull();
      expect(gp.credentials.racgpSpecificInterestsMember).toBeNull();
      expect(gp.credentials.prescribingPhilosophy).toBeNull();
      expect(gp.credentials.prescribingPhilosophyText).toBe("");
      expect(gp.verificationStatus).toBe("pending");
      expect(gp.verifiedBy).toBeNull();
    }
  });

  it("declares examples deterministically for synthetic entries, and the same way every run", () => {
    const synthetic = demoRoster.filter((c) => c.synthetic && (c.profession === undefined || c.profession === "gp"));
    expect(synthetic.length).toBeGreaterThan(5);
    for (const c of synthetic) {
      const a = gpFromClinician(c, TODAY)!;
      const b = gpFromClinician(c, TODAY)!;
      expect(a).toEqual(b);
      expect(a.realPerson).toBe(false);
      expect(a.credentials.yearsTreatingAdhd).not.toBeNull();
      expect(a.credentials.prescribingPhilosophy).not.toBeNull();
    }
  });

  it("reads capacity from the roster's grade, age groups from care areas, and billing from signals", () => {
    const child = demoRoster.find((c) => c.careAreas.includes("child-adolescent-adhd") && c.acceptingNewPatients)!;
    const gp = gpFromClinician(child, TODAY)!;
    expect(gp.credentials.ageGroupsTreated).toEqual(["children", "adolescents", "adults"]);
    expect(gp.credentials.caseloadCapacityCurrent).toBeGreaterThan(0);
    const closed = demoRoster.find((c) => !c.acceptingNewPatients && (c.profession === undefined || c.profession === "gp"));
    if (closed) expect(gpFromClinician(closed, TODAY)!.credentials.caseloadCapacityCurrent).toBe(0);
    // A real person gets no invented count: one place, open or closed, and a bio of sentences.
    for (const real of clinicians) {
      const gp = gpFromClinician(real, TODAY)!;
      expect(gp.credentials.caseloadCapacityMax).toBe(1);
      expect(gp.credentials.caseloadCapacityCurrent).toBe(real.acceptingNewPatients ? 1 : 0);
      // The roster's pieces are joined as sentences: the focus line ends with a full stop before the next piece.
      const focus = real.focus.trim().replace(/[.!?]$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(gp.credentials.bioLongText).toMatch(new RegExp(`${focus}[.!?] `));
    }
    // Years are never negative: the derivation uses unsigned shifts.
    for (const c of demoRoster) {
      const gp = gpFromClinician(c, TODAY);
      if (gp?.credentials.yearsTreatingAdhd !== null && gp) expect(gp.credentials.yearsTreatingAdhd).toBeGreaterThanOrEqual(3);
    }
    const mixed = demoRoster.find((c) => c.practicalSignals.some((s) => /mixed/i.test(s)) && (c.profession === undefined || c.profession === "gp"))!;
    expect(gpFromClinician(mixed, TODAY)!.preferences.billingAccepted).toContain("bulk-billing");
  });
});

describe("M1 the intake reader", () => {
  it("reads a stated duration and nothing else as a duration", () => {
    expect(statedDurationMonths("for about six years now")).toBe(72);
    expect(statedDurationMonths("over the last 8 months")).toBe(8);
    expect(statedDurationMonths("for a year")).toBe(12);
    expect(statedDurationMonths("I am 34 years old")).toBeNull();
    expect(statedDurationMonths("nothing about time")).toBeNull();
  });

  it("takes care asks and manner through the finder's reader, comorbidities through both", () => {
    const s = readStructuredSignals(
      { narrative: "I need an ADHD assessment. I have anxiety too and I don't want to be rushed. I feel ashamed asking.", ageGroup: "adults" },
      embedder,
    );
    expect(s.careAsks).toContain("adhd-assessment");
    expect(s.comorbidities).toEqual(["anxiety"]);
    expect(s.communicationPreference).toContain("unhurried");
    expect(s.stigmaSensitive).toBe(true);
    expect(s.financialConstraint).toBe(false);
    expect(s.priorAssessment).toBe(false);
    expect(s.medicationHistory).toBe("none");
  });

  it("fills consult style and billing from the narrative only when the form left them open", () => {
    const open = readStructuredSignals({ narrative: "telehealth please, and bulk billing if possible", ageGroup: "adults" }, embedder);
    expect(open.preferredConsultStyle).toBe("telehealth");
    expect(open.billingPreference).toBe("bulk-billing");
    expect(open.financialConstraint).toBe(true);
    const fixed = readStructuredSignals({ narrative: "telehealth please, and bulk billing if possible", ageGroup: "adults", consultStyle: "in-person", billing: "private" }, embedder);
    expect(fixed.preferredConsultStyle).toBe("in-person");
    expect(fixed.billingPreference).toBe("private");
  });

  it("separates a current medication from a past one by the person's own words", () => {
    expect(readStructuredSignals({ narrative: "I am currently taking Vyvanse", ageGroup: "adults" }, embedder).medicationHistory).toBe("current");
    expect(readStructuredSignals({ narrative: "I was on Ritalin as a teenager and stopped", ageGroup: "adults" }, embedder).medicationHistory).toBe("past");
  });

  it("builds a patient with the embedding filled and the contact optional", () => {
    const p = patientFromIntake({ id: "p", name: "A", narrative: "adult assessment", suburb: "Epping", ageGroup: "adults", createdAt: "2026-09-09" }, embedder);
    expect(p.narrativeEmbedding!.length).toBe(embedder.dim);
    expect(p.contact).toEqual({ email: null, phone: null });
    expect(p.status).toBe("intake");
  });
});
