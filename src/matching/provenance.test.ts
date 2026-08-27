// O117: the console panel and the finder cannot disagree about what a patient is told.

import { describe, expect, it } from "vitest";
import { eachOf, tally } from "@/quality/non-vacuous";
import { clinicians, getPersonalizedMatch, matchEvidence } from "@/demo/clinicians";
import { facetKey } from "@/matching/needs";
import { notDeclaredFrames, reasonsPatientsCanSee, sentencesPatientsSee } from "@/matching/provenance";

describe("O117 what patients are told, enumerated for the clinician", () => {
  it("lists a line for every declaration, and nothing that is not a declaration", () => {
    for (const clinician of clinicians) {
      const keys = reasonsPatientsCanSee(clinician).map((line) => line.key);
      for (const area of clinician.careAreas) expect(keys).toContain(`care:${area}`);
      for (const trait of clinician.manner) expect(keys).toContain(`manner:${trait}`);
      // Nothing invented: every key belongs to something on the record.
      const declared = new Set<string>([
        ...clinician.careAreas.map((a) => `care:${a}`),
        ...(clinician.careAreasSometimes ?? []).map((a) => `care:${a}`),
        ...clinician.manner.map((t) => `manner:${t}`),
        ...clinician.languages.map((l) => `language:${l.toLowerCase()}`),
      ]);
      for (const key of keys) {
        if (key?.startsWith("pref:")) continue;
        expect(declared.has(key!), `${clinician.id} was told to show ${key}`).toBe(true);
      }
    }
  });

  /**
   * THE PROPERTY THE PANEL EXISTS FOR.
   *
   * A "what patients see" view that authored its own copy would drift from the product the
   * first time a sentence changed, and a clinician would be reading a reassuring fiction. Every
   * label here is asserted to be one the RANKING would actually print for a query that reaches
   * it — same function, same evidence.
   */
  it("every label it shows is one the finder would really print", () => {
    // O196: COUNTED, because this body skips twice — past labels that are not care/manner, and
    // past labels whose own words are not their cue. A non-empty roster is not enough to know the
    // assertion ran, so the number that actually reached `expect` is the thing with a floor on it.
    const checked = tally();
    for (const clinician of eachOf(clinicians, "the roster")) {
      for (const line of reasonsPatientsCanSee(clinician)) {
        if (!line.key?.startsWith("care:") && !line.key?.startsWith("manner:")) continue;
        // Ask the finder, in the reader's own register, for exactly this thing.
        const evidence = matchEvidence(clinician, line.said.toLowerCase());
        const printed = evidence.map((need) => facetKey(need.facet));
        if (printed.length === 0) continue; // the label's words may not be its own cue
        checked.saw();
        expect(printed).toContain(line.key);
      }
    }
    expect(checked.count(), "no label reached the assertion — the two skips swallowed them all").toBeGreaterThan(0);
  });

  it("the reason sentence is the finder's own, not a copy of it", () => {
    for (const clinician of clinicians) {
      const first = reasonsPatientsCanSee(clinician)[0]!;
      const said = sentencesPatientsSee(clinician).map((line) => line.said);
      expect(said).toContain(getPersonalizedMatch(clinician, first.said.toLowerCase()).reason);
    }
  });

  it("names the declaration behind every line, because W190 needs it to be correctable", () => {
    for (const clinician of clinicians) {
      for (const line of [...reasonsPatientsCanSee(clinician), ...sentencesPatientsSee(clinician), ...notDeclaredFrames(clinician)]) {
        expect(line.from.length).toBeGreaterThan(0);
        expect(line.said.length).toBeGreaterThan(0);
      }
    }
  });

  it("the not-declared frames stay facts about a declaration, never claims about ability", () => {
    const checked = tally();
    for (const clinician of eachOf(clinicians, "the roster")) {
      for (const line of notDeclaredFrames(clinician)) {
        checked.saw();
        expect(line.said.toLowerCase()).toContain("declare");
        for (const forbidden of ["cannot", "unable", "does not do", "not qualified", "no good"]) {
          expect(line.said.toLowerCase()).not.toContain(forbidden);
        }
      }
    }
    // O196: a roster where nobody has an undeclared facet would run this over nothing.
    expect(checked.count(), "no not-declared frame was checked").toBeGreaterThan(0);
  });

  it("says when a sometimes-declaration answers at half weight, because the clinician chose", () => {
    const withSometimes = clinicians.find((c) => (c.careAreasSometimes ?? []).length > 0);
    if (!withSometimes) return;
    const sources = reasonsPatientsCanSee(withSometimes).map((line) => line.from);
    expect(sources.some((from) => from.includes("half weight"))).toBe(true);
  });
});
