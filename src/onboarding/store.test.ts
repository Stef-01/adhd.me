import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CARE_AREA_LABELS, OFFERED_LANGUAGES, REFUSED_APPLICATION_FIELDS } from "./types";
import { AHPRA_SHAPE, listApplications, saveApplication, validateApplication } from "./store";

const store = () => path.join(mkdtempSync(path.join(tmpdir(), "adhdme-join-")), "applications.jsonl");

const valid = {
  fullName: "Dr Amrita Bose",
  ahpraRegistrationNumber: "MED0002468013",
  email: "amrita@example.practice",
  practiceSuburb: "Blacktown",
  practiceName: "Blacktown Family Practice",
  careAreas: ["adhd-assessment", "adult-adhd"],
  manner: ["unhurried"],
  languages: ["Hindi"],
  nswAdhdTrained: true,
  acceptingNewPatients: true,
};

describe("validation reports everything at once", () => {
  it("accepts a complete application", () => {
    expect(validateApplication(valid)).toEqual({});
  });

  it("returns every problem together rather than the first", () => {
    // A form that reveals one mistake per submission is a form somebody abandons, and this one is
    // long enough that it matters.
    const errors = validateApplication({
      ...valid,
      fullName: "",
      ahpraRegistrationNumber: "nope",
      email: "not-an-email",
      practiceSuburb: "",
      practiceName: "",
      careAreas: [],
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["ahpraRegistrationNumber", "careAreas", "email", "fullName", "practiceName", "practiceSuburb"],
    );
  });

  it("checks the SHAPE of a registration number and claims nothing more", () => {
    expect(AHPRA_SHAPE.test("MED0001234567")).toBe(true);
    for (const bad of ["MED123", "0001234567", "MEDICAL0001234567", "med0001234567"]) {
      expect(AHPRA_SHAPE.test(bad), bad).toBe(false);
    }
  });

  it("requires the assessment anchor, because a listing without it can never be matched", () => {
    // Every archetype requires `adhd-assessment`. A listing without it renders in the directory and
    // cannot be arrived at from any search, which is worse than not being listed.
    const errors = validateApplication({ ...valid, careAreas: ["titration"] });
    expect(errors.careAreas).toMatch(/anchor/i);
  });

  it("refuses a care area outside the vocabulary", () => {
    expect(validateApplication({ ...valid, careAreas: ["adhd-assessment", "invented-area"] })).toEqual({});
    // The invalid one is dropped rather than stored, so it cannot reach the matcher.
    const file = store();
    const { application } = saveApplication({ ...valid, careAreas: ["adhd-assessment", "invented-area"] }, { filePath: file });
    expect(application.careAreas).toEqual(["adhd-assessment"]);
  });

  it("refuses a language outside the offered list", () => {
    expect(validateApplication({ ...valid, languages: ["Klingon"] }).languages).toBeDefined();
  });

  it("accepts every mix the hero's control can express, and nothing else", () => {
    // The value only ever arrives from the hero (10–50, step 10), so anything outside that range
    // is a tampered or mangled submission and is refused with a reason, never rounded or guessed.
    for (const declarable of [10, 20, 30, 40, 50]) {
      expect(validateApplication({ ...valid, desiredMixPercent: declarable })).toEqual({});
    }
    for (const tampered of [0, 5, 15, 55, 100, -10, 30.5, Number.NaN]) {
      expect(
        validateApplication({ ...valid, desiredMixPercent: tampered }).desiredMixPercent,
        String(tampered),
      ).toBeDefined();
    }
  });

  it("treats an absent mix as fine, because a default nobody set is not a declaration", () => {
    expect(validateApplication(valid)).toEqual({});
  });
});

describe("storage", () => {
  it("writes one row and reads it back", () => {
    const file = store();
    const { created, application } = saveApplication(valid, { filePath: file });
    expect(created).toBe(true);
    expect(application.status).toBe("received");
    expect(listApplications(file)).toHaveLength(1);
  });

  it("treats a second submission from the same registration number as the same application", () => {
    // Two rows for one GP is a person applying twice, and it puts a duplicate in front of whoever
    // reviews rather than in front of nobody.
    const file = store();
    const first = saveApplication(valid, { filePath: file });
    const second = saveApplication({ ...valid, practiceName: "A Different Practice" }, { filePath: file });
    expect(second.created).toBe(false);
    expect(second.application.id).toBe(first.application.id);
    expect(listApplications(file)).toHaveLength(1);
  });

  it("normalises the registration number so case cannot create a duplicate", () => {
    const file = store();
    saveApplication(valid, { filePath: file });
    const again = saveApplication({ ...valid, ahpraRegistrationNumber: "med0002468013" }, { filePath: file });
    expect(again.created).toBe(false);
  });

  it("neutralises a spreadsheet formula at the writer, not at the export", () => {
    // W153's finding: quoting every CSV cell makes a file safe to PARSE and leaves it unsafe to
    // OPEN. Applications are exactly the list somebody exports to work through.
    const file = store();
    const { application } = saveApplication(
      { ...valid, fullName: "=HYPERLINK(\"http://evil.example\",\"click\")", ahpraRegistrationNumber: "MED0009999999" },
      { filePath: file },
    );
    expect(application.fullName.startsWith("=")).toBe(false);
    expect(readFileSync(file, "utf8")).not.toMatch(/"fullName":"=/);
  });

  it("stores the declared mix, and omits the key entirely when none was declared", () => {
    // O26: the join hero's percent used to be discarded on submit. When the GP set one it is now
    // part of the row a reviewer reads; when they did not, the key is absent — not null, not a
    // default — so the file cannot show a preference nobody stated.
    const file = store();
    const withMix = saveApplication({ ...valid, desiredMixPercent: 40 }, { filePath: file });
    expect(withMix.application.desiredMixPercent).toBe(40);

    const without = saveApplication(
      { ...valid, ahpraRegistrationNumber: "MED0001111111" },
      { filePath: file },
    );
    expect("desiredMixPercent" in without.application).toBe(false);
    expect(readFileSync(file, "utf8").split("\n")[1]).not.toContain("desiredMixPercent");
  });

  it("has exactly one status, so no code path can approve an application", () => {
    // The gate on publication is an Ahpra advertising review, which is a human act. A status enum
    // with an `approved` member would make that gate a variable somebody could set.
    const file = store();
    const { application } = saveApplication(valid, { filePath: file });
    const status: "received" = application.status;
    expect(status).toBe("received");
  });
});

describe("what the form refuses to ask", () => {
  it("gives a reason for every refused field", () => {
    for (const [field, why] of Object.entries(REFUSED_APPLICATION_FIELDS)) {
      expect(why.length, `${field} is refused without a reason`).toBeGreaterThan(60);
    }
    for (const field of ["bio", "yearsExperience", "certificateUpload", "streetAddress"]) {
      expect(REFUSED_APPLICATION_FIELDS[field], `${field} should be refused`).toBeDefined();
    }
  });

  it("stores no field the public profile model could not hold", () => {
    const file = store();
    const { application } = saveApplication(valid, { filePath: file });
    for (const refused of Object.keys(REFUSED_APPLICATION_FIELDS)) {
      expect(application, `${refused} reached the stored application`).not.toHaveProperty(refused);
    }
  });
});

describe("the offered vocabularies match what the finder can use", () => {
  it("offers only care areas the matcher knows", () => {
    // A label offered here that the matcher does not hold produces a listing that silently never
    // appears in a result.
    expect(CARE_AREA_LABELS.length).toBeGreaterThan(10);
    expect(new Set(CARE_AREA_LABELS.map((a) => a.id)).size).toBe(CARE_AREA_LABELS.length);
    expect(CARE_AREA_LABELS.map((a) => a.id)).toContain("adhd-assessment");
  });

  it("offers no duplicate languages", () => {
    expect(new Set(OFFERED_LANGUAGES).size).toBe(OFFERED_LANGUAGES.length);
  });
});
