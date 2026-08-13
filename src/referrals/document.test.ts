// W131 verify gate: "schema fixtures; no free-text clinical field that bypasses the content
// gate."
//
// The second half needs the right reading, and the last describe block is where that reading
// is pinned. G5 governs clinical content MEHERR publishes. A GP writing about their own patient
// is not that — so the gate is not "no free text", it is that no clinical wording originates
// with the product. The tests therefore check that exactly one field carries prose, that it
// must be attributed to a named clinician, and that this module contains no generator and no
// template a system could fill in.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as documentModule from "./document";
import {
  ALL_REFERRAL_REASONS,
  ALL_REFERRAL_REQUESTS,
  buildReferral,
  explainReferralRejection,
  REFERRAL_REASON_COPY,
  REFERRAL_REQUEST_COPY,
  type ReferralInput,
  type ReferralRejection,
} from "./document";

const TODAY = "2026-08-11";

const input = (over: Partial<ReferralInput> = {}): ReferralInput => ({
  referralId: "ref-1",
  fromPracticeId: "prac-a",
  toPracticeId: "prac-b",
  patientId: "pat-1",
  createdAt: "2026-08-01",
  createdBy: "clin-1",
  reason: "extended_scope",
  request: "procedure",
  conditionCode: "placeholder_register_a",
  recordedFactCodes: ["placeholder_fact_a"],
  narrative: {
    text: "Placeholder clinical note written by the referring GP — fixture only.",
    authoredBy: "clin-1",
    authoredAt: "2026-08-01",
  },
  ...over,
});

function build(over: Partial<ReferralInput> = {}) {
  const result = buildReferral(input(over), TODAY);
  if (!result.ok) throw new Error(`fixture rejected: ${result.errors.join(", ")}`);
  return result.document;
}

/** The schema fixtures the gate asks for: one of each valid shape. */
const FIXTURES = {
  full: build(),
  noNarrative: build({ referralId: "ref-2", narrative: null }),
  noCondition: build({ referralId: "ref-3", conditionCode: null, reason: "capacity" }),
  adviceOnly: build({ referralId: "ref-4", request: "advice_only", recordedFactCodes: [] }),
};

describe("W131 schema fixtures", () => {
  it("accepts every valid shape", () => {
    for (const [name, document] of Object.entries(FIXTURES)) {
      expect(document.referralId, name).toBeTruthy();
    }
    expect(FIXTURES.noNarrative.narrative).toBeNull();
    expect(FIXTURES.noCondition.conditionCode).toBeNull();
    expect(FIXTURES.adviceOnly.recordedFactCodes).toEqual([]);
  });

  it("has exactly the fields it claims, and no more", () => {
    expect(Object.keys(FIXTURES.full)).toEqual([
      "referralId",
      "fromPracticeId",
      "toPracticeId",
      "patientId",
      "createdAt",
      "createdBy",
      "reason",
      "request",
      "conditionCode",
      "recordedFactCodes",
      "narrative",
    ]);
  });

  it("copies the fact codes rather than aliasing the caller's array", () => {
    const codes = ["a", "b"];
    const document = build({ recordedFactCodes: codes });
    codes.push("c");
    expect(document.recordedFactCodes).toEqual(["a", "b"]);
  });

  it.each<[Partial<ReferralInput>, ReferralRejection]>([
    [{ referralId: " " }, "referral_id_missing"],
    [{ fromPracticeId: "" }, "from_practice_missing"],
    [{ toPracticeId: "" }, "to_practice_missing"],
    [{ toPracticeId: "prac-a" }, "referral_to_self"],
    [{ patientId: "" }, "patient_missing"],
    [{ createdBy: " " }, "author_missing"],
    [{ createdAt: "last tuesday" }, "date_missing_or_unreadable"],
    [{ reason: "because_i_said_so" }, "unknown_reason"],
    [{ request: "anything" }, "unknown_request"],
    [{ recordedFactCodes: ["a", "a"] }, "duplicate_fact_code"],
  ])("refuses %o with %s", (over, expected) => {
    const result = buildReferral(input(over), TODAY);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toContain(expected);
  });

  it("reports every problem at once", () => {
    const result = buildReferral(input({ referralId: "", patientId: "", reason: "nope" }), TODAY);
    expect(!result.ok && result.errors.sort()).toEqual([
      "patient_missing",
      "referral_id_missing",
      "unknown_reason",
    ]);
  });

  it("explains every refusal it can produce", () => {
    const reasons: ReferralRejection[] = [
      "referral_id_missing", "from_practice_missing", "to_practice_missing", "referral_to_self",
      "patient_missing", "author_missing", "date_missing_or_unreadable", "unknown_reason",
      "unknown_request", "narrative_unattributed", "narrative_empty", "duplicate_fact_code",
    ];
    for (const reason of reasons) {
      expect(explainReferralRejection(reason).length, reason).toBeGreaterThan(15);
    }
  });
});

describe("W131 no clinical text originates with the product", () => {
  it("has exactly one prose field, and it must be attributed", () => {
    // The gate's real content. One ungoverned field is acceptable BECAUSE a named clinician
    // stands behind it; an unattributed one is text nobody can question (W122).
    const stringFields = Object.entries(FIXTURES.noNarrative).filter(
      ([, value]) => typeof value === "string",
    );
    // Every other string on the document is an identifier, a date or a closed-vocabulary code.
    for (const [key] of stringFields) {
      expect(["referralId", "fromPracticeId", "toPracticeId", "patientId", "createdAt", "createdBy", "reason", "request", "conditionCode"]).toContain(key);
    }
    expect(buildReferral(input({ narrative: { text: "note", authoredBy: "", authoredAt: "2026-08-01" } }), TODAY).ok).toBe(false);
    expect(buildReferral(input({ narrative: { text: "note", authoredBy: "clin-1", authoredAt: "" } }), TODAY).ok).toBe(false);
  });

  it("refuses an empty narrative rather than sending a blank section", () => {
    const result = buildReferral(input({ narrative: { text: "   ", authoredBy: "clin-1", authoredAt: "2026-08-01" } }), TODAY);
    expect(!result.ok && result.errors).toContain("narrative_empty");
  });

  it("does not edit or validate the clinician's wording", () => {
    // Deliberate. This is the referring clinician's professional communication, and a product
    // that rewrote a doctor's note about their own patient would be wrong in the other
    // direction from the one the gate guards.
    const odd = "Placeholder note with UNUSUAL wording, ALL CAPS and a  double space.";
    expect(build({ narrative: { text: odd, authoredBy: "clin-1", authoredAt: "2026-08-01" } }).narrative?.text).toBe(odd);
  });

  it("exports no generator and no clinical template", () => {
    // The bypass the gate exists to close: system-generated clinical wording travelling inside
    // a referral would be Meherr content that never went through W119's sign-off, wearing a
    // GP's name. There is nothing here that could produce it.
    for (const name of Object.keys(documentModule)) {
      expect(name).not.toMatch(/template|generate|compose|draft|suggest|autofill|prefill|boilerplate/i);
    }
    // The only exported string tables are operator labels about the ASK, and a test below
    // asserts they say nothing about a patient.
    const exportedStringTables = Object.entries(documentModule).filter(
      ([, value]) => typeof value === "object" && value !== null && !Array.isArray(value),
    );
    expect(exportedStringTables.map(([name]) => name).sort()).toEqual([
      "REFERRAL_REASON_COPY",
      "REFERRAL_REQUEST_COPY",
    ]);
  });

  it("references recorded facts by code and never restates them", () => {
    // Restating a recorded fact as prose turns a bookkeeping entry into a clinical assertion
    // somebody has to stand behind, and loses the link to the record it came from.
    const document = FIXTURES.full;
    expect(document.recordedFactCodes).toEqual(["placeholder_fact_a"]);
    for (const code of document.recordedFactCodes) {
      expect(typeof code).toBe("string");
    }
    // No field pairs a fact with a sentence about it.
    expect(JSON.stringify(document)).not.toMatch(/"factText"|"factDescription"|"findings"/);
  });

  it("keeps the operator copy about the ask, never about the patient", () => {
    for (const copy of [...Object.values(REFERRAL_REASON_COPY), ...Object.values(REFERRAL_REQUEST_COPY)]) {
      expect(copy.toLowerCase()).not.toMatch(/diagnos|symptom|condition is|suffers|presents with|severe/);
    }
  });
});

describe("W131 the reason vocabulary is operational, not diagnostic", () => {
  it("is closed and says why a PRACTICE is asking, never what is wrong with a patient", () => {
    expect([...ALL_REFERRAL_REASONS].sort()).toEqual([
      "capacity",
      "continuity",
      "extended_scope",
      "patient_preference",
    ]);
    for (const reason of ALL_REFERRAL_REASONS) {
      expect(reason).not.toMatch(/diagnos|symptom|severity|urgent|suspected|rule_?out/i);
    }
  });

  it("has a closed request vocabulary too", () => {
    expect([...ALL_REFERRAL_REQUESTS].sort()).toEqual([
      "advice_only",
      "assessment_and_management",
      "procedure",
      "shared_care",
    ]);
  });
});

describe("W131 no credential field — the A/B ruling stays the founder's", () => {
  it("carries nothing about the receiving clinician's credentials or capability", () => {
    // docs/GATE-DOSSIER-Q9 action 1 is outstanding: whether credential detail may cross a
    // practice boundary. This document's shape IS what a referral can carry, so a credential
    // field added before the ruling would make that ruling by default. A document without one
    // is valid under either answer.
    const serialised = JSON.stringify(FIXTURES.full);
    for (const banned of ["credential", "competence", "capability", "qualification", "verified", "floor"]) {
      expect(serialised.toLowerCase(), `referral carries "${banned}"`).not.toContain(banned);
    }
    for (const key of Object.keys(FIXTURES.full)) {
      expect(key).not.toMatch(/credential|competence|capability|qualif/i);
    }
  });

  it("does not name a receiving CLINICIAN at all, only a receiving practice", () => {
    // Choosing which clinician at the far end is W133's routing question, and it is the one
    // the pending ruling governs. Naming one here would answer it.
    expect(Object.keys(FIXTURES.full)).toContain("toPracticeId");
    expect(Object.keys(FIXTURES.full)).not.toContain("toClinicianId");
  });

  it("says so in the source, so the omission reads as a decision rather than a gap", () => {
    // A missing field is indistinguishable from an oversight unless somebody wrote down that
    // it is missing on purpose. The next author to reach for it should hit the reason.
    const source = readFileSync(path.join(__dirname, "document.ts"), "utf8");
    expect(source).toContain("DELIBERATELY ABSENT");
    expect(source).toContain("GATE-DOSSIER-Q9");
  });
});
