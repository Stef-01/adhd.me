// W193 verify gate: "what leaves the tenancy is enumerated, and a clinician's non-directory data
// cannot reach a public surface by type."
//
// The second clause says BY TYPE, so the tests that carry it are `@ts-expect-error` cases naming
// real clinician-keyed types from this tree. A runtime scrubber would be the wrong proof and the
// wrong control: it has to be right about every field that exists today and every field added
// later, which is precisely the shape of the failure W51 found.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLINICIAN_RECORD_CLASSES,
  DISCLOSED_FIELDS,
  DISCLOSURE_CAVEATS,
  checkableFields,
  declaredFields,
  disclosedFieldNames,
} from "./disclosure";
import { PROFILE_FIELDS, type GeneralProfile } from "./profile";
import { renderProfile, renderedLines } from "./render";
import { scopeStatement, type ScopeStatement } from "@/credentials/scope";
import type { CredentialRecord } from "@/credentials/model";

const focus = (label: string): ScopeStatement => {
  const result = scopeStatement({
    credentialId: "cred-1",
    scope: { kind: "condition", conditionCode: "E28.2" },
    label,
    permits: ["record_only"],
  });
  if (!result.ok) throw new Error(`fixture rejected: ${JSON.stringify(result.violations)}`);
  return result.statement;
};

const GP: GeneralProfile = {
  clinicianId: "clin-1",
  displayName: "Dr Example Name",
  ahpraRegistrationNumber: "MED0001234567",
  location: { practiceId: "prac-1", suburb: "Parramatta", state: "NSW" },
  languages: ["English", "Hindi"],
  acceptingNewPatients: true,
  descriptor: { kind: "general_registration", profession: "general_practitioner" },
  focus: [focus("Women's health")],
};

describe("W193 what leaves the tenancy is enumerated", () => {
  it("declares one entry per field a profile can emit, both directions", () => {
    // "We enumerated what we disclose" is otherwise a claim about what the author remembered.
    // A field added to W183 without an entry here fails; an entry for a field that no longer
    // exists fails too.
    expect(disclosedFieldNames()).toEqual([...PROFILE_FIELDS]);
    for (const name of Object.keys(DISCLOSED_FIELDS)) {
      expect(PROFILE_FIELDS, `DISCLOSED_FIELDS names "${name}", which no profile has`).toContain(
        name,
      );
    }
  });

  it("gives every disclosure a reason, because an undocumented one is a guess", () => {
    for (const [name, field] of Object.entries(DISCLOSED_FIELDS)) {
      expect(field.why.length, `${name} has no rationale`).toBeGreaterThan(40);
      expect(field.what.length, `${name} does not say what leaves`).toBeGreaterThan(10);
    }
  });

  it("says whose claim each field is, which a reader of the page cannot tell", () => {
    // The same distinction W187 renders. Held as data so the page and the privacy record cannot
    // drift into disagreeing about which facts this product has actually checked.
    expect(checkableFields()).toContain("ahpraRegistrationNumber");
    expect(checkableFields()).toContain("descriptor");
    expect(declaredFields()).toContain("focus");
    expect(declaredFields()).toContain("languages");
    expect(declaredFields()).toContain("acceptingNewPatients");
  });

  it("classes the registration number as checkable, which is the point of publishing it", () => {
    // It is what makes every other claim confirmable BY THE READER rather than on our word —
    // the whole alternative this product offers to testimonials and ratings.
    expect(DISCLOSED_FIELDS.ahpraRegistrationNumber!.basis).toBe("checkable");
    expect(DISCLOSED_FIELDS.ahpraRegistrationNumber!.why).toMatch(/public on the Ahpra register/);
    expect(DISCLOSED_FIELDS.ahpraRegistrationNumber!.why).toContain("checkable BY THE READER");
  });

  it("discloses no more precision than the question needs", () => {
    // A suburb, not a street. Precision beyond the question is disclosure without purpose.
    expect(DISCLOSED_FIELDS.location!.why).toContain("suburb rather than a street");
    expect(JSON.stringify(GP.location)).not.toMatch(/street|address|postcode|unit/i);
  });
});

describe("W193 a clinician's other data cannot reach a public surface, by type", () => {
  it("refuses a credential record", () => {
    const credential = {} as CredentialRecord;
    const attempt: GeneralProfile = {
      ...GP,
      // @ts-expect-error — a profile has no field a credential fits into.
      credential,
    };
    expect(attempt.clinicianId).toBe("clin-1");
  });

  it("refuses an experience or volume figure", () => {
    // The most tempting field on the list: it looks like a fact and reads as a competence claim.
    const attempt: GeneralProfile = {
      ...GP,
      // @ts-expect-error — no appointment-volume field exists on a profile.
      appointmentsLast12Months: 1840,
    };
    expect(attempt.clinicianId).toBe("clin-1");
  });

  it("refuses a complaint", () => {
    const attempt: GeneralProfile = {
      ...GP,
      // @ts-expect-error — the worst thing this product could emit has nowhere to go.
      complaints: [{ id: "cmp-1" }],
    };
    expect(attempt.clinicianId).toBe("clin-1");
  });

  it("refuses CPD and referral history", () => {
    const attempt: GeneralProfile = {
      ...GP,
      // @ts-expect-error — a professional development record is not publishable.
      cpdCompleted: ["item-1"],
    };
    const second: GeneralProfile = {
      ...GP,
      // @ts-expect-error — every referral names a patient.
      referralsWritten: 42,
    };
    expect(attempt.clinicianId).toBe(second.clinicianId);
  });

  it("refuses free text of any name, which is how the others would arrive", () => {
    // A scrubber over a typed object catches the fields it knows; a free-text field is where
    // everything refused above reappears as prose somebody pasted.
    const attempt: GeneralProfile = {
      ...GP,
      // @ts-expect-error — there is no notes field, deliberately (W183).
      notes: "verified by practice manager, 1840 appointments last year",
    };
    expect(attempt.clinicianId).toBe("clin-1");
  });

  it("publishes nothing beyond the enumerated fields, checked on the rendered page", () => {
    // The type stops the field existing; this checks that what actually renders carries no
    // value from anywhere else. Types and templates are different failure surfaces.
    const result = renderProfile(GP);
    if (!result.ok) throw new Error("expected a render");
    const published = renderedLines(result.rendered)
      .map(({ text }) => text)
      .join(" ");
    for (const forbidden of ["cred-1", "1840", "cmp-", "cpd", "referral"]) {
      expect(published.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

describe("W193 the clinician record classes are enumerated, W106's device for a new subject", () => {
  it("names every class as not reaching a public surface", () => {
    // Every entry is false, and that is the point: this is a list somebody has to consciously
    // edit to make a mistake, not a classification exercise with interesting cases.
    for (const record of CLINICIAN_RECORD_CLASSES) {
      expect(record.reachesPublicSurface).toBe(false);
    }
  });

  it("gives each one a reason, because 'no' without one is indistinguishable from not looking", () => {
    for (const record of CLINICIAN_RECORD_CLASSES) {
      expect(record.why.length, `${record.module} has no rationale`).toBeGreaterThan(50);
    }
  });

  it("names modules that exist in the tree", () => {
    // A registry of module paths drifts the moment one is renamed, and a stale entry reads as
    // coverage. W106's registry is tree-checked for the same reason.
    for (const record of CLINICIAN_RECORD_CLASSES) {
      const full = path.join(process.cwd(), record.module);
      expect(() => readFileSync(full, "utf8"), `${record.module} does not exist`).not.toThrow();
    }
  });

  it("covers the classes a reader would ask about first", () => {
    const modules = CLINICIAN_RECORD_CLASSES.map((r) => r.module);
    for (const expected of [
      "src/credentials/vault.ts",
      "src/capability/experience.ts",
      "src/complaints/store.ts",
      "src/referrals/store.ts",
      "src/education/cpd.ts",
    ]) {
      expect(modules, `no entry for ${expected}`).toContain(expected);
    }
  });

  it("names no module twice", () => {
    const modules = CLINICIAN_RECORD_CLASSES.map((r) => r.module);
    expect(new Set(modules).size).toBe(modules.length);
  });
});

describe("W193 the disclosure carries its own caveats", () => {
  it("says it cannot be undone, which is the property with no remedy", () => {
    // W177 said this about a downloaded file; it is more true of a page that is indexed and
    // quoted. Erasure is not available here, so the only control is applied before publication.
    expect(DISCLOSURE_CAVEATS.join(" ")).toContain("cannot be undone");
    expect(DISCLOSURE_CAVEATS.join(" ")).toContain("does not reach those copies");
  });

  it("says what stays inside, not only what leaves", () => {
    const text = DISCLOSURE_CAVEATS.join(" ");
    for (const stays of ["credentials", "professional development", "referrals"]) {
      expect(text).toContain(stays);
    }
  });

  it("says that some of what is published is checked and some is not", () => {
    expect(DISCLOSURE_CAVEATS.join(" ")).toContain("checkable and some is not");
  });
});
