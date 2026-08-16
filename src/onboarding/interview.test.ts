import { describe, expect, it } from "vitest";
import { INTERVIEW, MATCHABLE_FACETS, interviewMinutes } from "./interview";
import { MANNER_TRAITS } from "@/matching/needs";
import { careArchetypes } from "@/demo/care-archetypes";
import { clinicians } from "@/demo/clinicians";

describe("W221 thirty minutes leaves a clinician matchable", () => {
  /**
   * THE BUDGET IS THE SPECIFICATION, so it is asserted rather than aspired to. An interview that
   * quietly grows to fifty minutes is a different product: it stops being something a GP agrees
   * to between patients and becomes something that needs scheduling, which is the difference
   * between onboarding a practice in a week and in a quarter.
   */
  it("fits the thirty-minute budget", () => {
    expect(interviewMinutes()).toBeLessThanOrEqual(30);
    expect(interviewMinutes()).toBeGreaterThan(20);
  });

  /**
   * BOTH DIRECTIONS, which is the whole point.
   *
   * A question that fills no facet is a question that changes no match, and it is how a
   * thirty-minute interview becomes ninety. A facet with no question is worse: the clinician
   * finishes onboarding unable to be matched on something patients actually ask for, and nobody
   * finds out until somebody types it into the finder and quietly gets a worse answer.
   */
  it("asks about every care area the matcher can score, and no more", () => {
    const asked = INTERVIEW.filter((q) => q.target.kind === "care")
      .map((q) => (q.target as { kind: "care"; area: string }).area).sort();
    expect(asked).toEqual([...MATCHABLE_FACETS.care].sort());
  });

  it("asks about every manner trait the matcher can score, and no more", () => {
    const asked = INTERVIEW.filter((q) => q.target.kind === "manner")
      .map((q) => (q.target as { kind: "manner"; trait: string }).trait).sort();
    expect(asked).toEqual([...MANNER_TRAITS].sort());
  });

  it("covers every care area the demo journeys require", () => {
    // If a scripted journey requires an area the interview never asks about, a clinician onboarded
    // through this instrument can never be the answer to it.
    const required = new Set(careArchetypes.flatMap((a) => a.requirements.careAreas));
    for (const area of required) expect(MATCHABLE_FACETS.care).toContain(area);
  });

  it("covers every facet the current roster already declares", () => {
    // The instrument has to be able to reproduce the profiles that exist. If it cannot, the two
    // GPs on the roster were authored by hand in a way the next one cannot be.
    for (const clinician of clinicians) {
      for (const area of clinician.careAreas) expect(MATCHABLE_FACETS.care).toContain(area);
      for (const trait of clinician.manner) expect(MANNER_TRAITS).toContain(trait);
    }
  });
});

describe("W221 the interview cannot collect what the profile refuses", () => {
  /**
   * `src/directory/profile.ts` refuses a free-text biography because it "is where every refusal
   * above reappears in prose". An interview with a free-text scope answer is that same field with
   * an interviewer's handwriting on it, so the FORM is the enforcement point rather than a linter
   * downstream of it. Scope and manner are frequency answers; short text exists only where the
   * answer is a name, a number or a fee.
   */
  it("takes no free text for scope or manner", () => {
    for (const question of INTERVIEW) {
      if (question.target.kind === "care" || question.target.kind === "manner") {
        expect(question.answer, `${question.id} takes free text`).toBe("frequency");
      }
    }
  });

  it("asks for no biography, no certificate and no patient", () => {
    const asked = INTERVIEW.map((q) => `${q.ask} ${q.saidAloud ?? ""}`.toLowerCase()).join(" ");
    // A bio would be the refused field; a certificate invites publishing evidence (W193); and
    // nothing in onboarding may be about a patient.
    expect(asked).not.toMatch(/\byour bio\b|\bbiography\b|tell us about yourself/);
    expect(asked).not.toMatch(/upload|attach|copy of your certificate/);
    expect(asked).not.toMatch(/\byour patients['’]? (?:names|records|history)\b/);
  });

  /**
   * W193: a declaration must be RENDERED as a declaration, and a clinician cannot meaningfully
   * consent to that unless somebody told them at the time they answered.
   */
  it("says out loud that the training is recorded as a declaration", () => {
    const training = INTERVIEW.find((q) => q.id === "training")!;
    expect(training.saidAloud).toMatch(/told us|declar/i);
    expect(training.saidAloud).toMatch(/no public register|cannot check|do not want a copy/i);
  });

  it("ends by reading the profile back before anything is published", () => {
    const last = INTERVIEW[INTERVIEW.length - 1]!;
    expect(last.id).toBe("readback");
    expect(last.ask).toMatch(/is this you/i);
  });

  it("tells the clinician that a language is only shown when it is asked for", () => {
    const languages = INTERVIEW.find((q) => q.id === "languages")!;
    expect(languages.saidAloud).toMatch(/only shown/i);
  });
});
