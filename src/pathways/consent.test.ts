// W125 verify gate: "fixtures; no default consent."
//
// "No default consent" is tested as an exhaustive property rather than by example. One test
// showing an empty record set yields `not_recorded` proves that one call; what the unit claims
// is that NO input produces `given` without a recorded `given` decision for that exact version,
// so the last describe block enumerates every fixture combination and asserts it.

import { describe, expect, it } from "vitest";
import * as consentModule from "./consent";
import {
  assertConsented,
  ConsentMissingError,
  consentFor,
  describeConsent,
  explainConsentRejection,
  recordConsent,
  withdrawConsent,
  type ConsentInput,
  type ConsentRecord,
  type ConsentRejection,
} from "./consent";

const TODAY = "2026-08-11";
const HASH_A = "hash-version-a";
const HASH_B = "hash-version-b";

const input = (over: Partial<ConsentInput> = {}): ConsentInput => ({
  patientId: "pat-1",
  practiceId: "prac-a",
  pathwayId: "path-1",
  versionHash: HASH_A,
  decision: "given",
  statement: "Placeholder statement of what was put to the patient — fixture only.",
  decidedAt: "2026-06-01",
  recordedBy: "clin-1",
  ...over,
});

/** Build a record the only way one can be built, failing loudly if the fixture is invalid. */
function record(over: Partial<ConsentInput> = {}): ConsentRecord {
  const result = recordConsent(input(over), TODAY);
  if (!result.ok) throw new Error(`fixture rejected: ${result.errors.join(", ")}`);
  return result.record;
}

/** The fixture set the gate asks for: every decision shape, across two versions. */
const FIXTURES = {
  given: record(),
  refused: record({ decision: "refused", decidedAt: "2026-06-02" }),
  otherVersion: record({ versionHash: HASH_B, decidedAt: "2026-06-03" }),
  otherPatient: record({ patientId: "pat-2", decidedAt: "2026-06-04" }),
  otherPractice: record({ practiceId: "prac-b", decidedAt: "2026-06-05" }),
  otherPathway: record({ pathwayId: "path-2", decidedAt: "2026-06-06" }),
  withdrawn: withdrawConsent(record({ decidedAt: "2026-06-07" }), "2026-07-01"),
};

const lookup = (records: readonly ConsentRecord[]) =>
  consentFor(records, "pat-1", "prac-a", "path-1", HASH_A);

describe("W125 no default consent", () => {
  it("an empty record set is not_recorded — never given, never refused", () => {
    expect(lookup([])).toEqual({ status: "not_recorded", because: "no_record_at_all" });
  });

  it("NO combination of fixtures yields `given` without a recorded given decision", () => {
    // The claim the unit actually makes. Every subset of the fixture set that excludes the
    // matching `given` record must not produce `given` — 2^6 = 64 combinations.
    const others = [
      FIXTURES.refused,
      FIXTURES.otherVersion,
      FIXTURES.otherPatient,
      FIXTURES.otherPractice,
      FIXTURES.otherPathway,
      FIXTURES.withdrawn,
    ];
    let checked = 0;
    for (let mask = 0; mask < 1 << others.length; mask++) {
      const subset = others.filter((_, i) => (mask & (1 << i)) !== 0);
      expect(lookup(subset).status, `subset ${mask}`).not.toBe("given");
      checked++;
    }
    // Guards the search: an empty loop would pass silently.
    expect(checked).toBe(64);
    // The positive control, and it has to be dated LAST to mean anything: the fixture set
    // includes a withdrawal dated 2026-06-07, and latest-wins correctly reports that as
    // `withdrawn`. A control dated earlier would fail for the right reason and look like the
    // property being broken — re-consent after a withdrawal is a fresh act that does restore
    // consent, so the control asserts exactly that.
    const freshlyGiven = record({ decidedAt: "2026-08-01" });
    expect(lookup([...others, freshlyGiven]).status).toBe("given");
  });

  it("exports no default, and nothing whose name suggests one", () => {
    // W120's shape: the only way to smuggle a default in is to add one, and that is named.
    for (const name of Object.keys(consentModule)) {
      expect(name).not.toMatch(/default|implied|assumed|inferred|presumed|opt_?out|blanket/i);
    }
  });

  it("cannot be constructed without going through recordConsent", () => {
    // Every field is a plain literal of the right type, so the ONLY thing wrong with this
    // object is the missing brand (the W65 trap, avoided).
    // @ts-expect-error — ConsentRecord is branded; knowing its fields is not enough.
    const forged: ConsentRecord = {
      patientId: "pat-1",
      practiceId: "prac-a",
      pathwayId: "path-1",
      versionHash: HASH_A,
      decision: "given",
      statement: "Anything at all.",
      decidedAt: "2026-06-01",
      recordedBy: "clin-1",
      withdrawnAt: null,
    };
    expect(forged).toBeDefined();
  });

  it("has no boolean anywhere in the record", () => {
    // A `consented: boolean` has a default, and whichever it is, it is wrong.
    for (const [key, value] of Object.entries(FIXTURES.given)) {
      expect(typeof value, `${key} is a boolean`).not.toBe("boolean");
    }
  });
});

describe("W125 not_recorded is not refused", () => {
  it("reports a refusal as a decision the patient made", () => {
    const status = lookup([FIXTURES.refused]);
    expect(status.status).toBe("refused");
    expect(describeConsent(status)).toContain("not a gap to fill in");
  });

  it("reports nothing recorded as neither agreement nor refusal", () => {
    expect(describeConsent(lookup([]))).toContain("not agreement, and it is not refusal");
  });

  it("distinguishes the two absences, because they are different conversations", () => {
    // Consent to another version means "re-consent to the change"; nothing at all means
    // "consent from scratch".
    expect(lookup([FIXTURES.otherVersion])).toEqual({
      status: "not_recorded",
      because: "recorded_for_another_version",
    });
    expect(describeConsent(lookup([FIXTURES.otherVersion]))).toContain("has not seen this version");
  });
});

describe("W125 consent is to a version, not to a name", () => {
  it("does not carry over to another version of the same pathway", () => {
    // Consent that survives an edit is consent to something the patient never saw.
    const status = consentFor([FIXTURES.given], "pat-1", "prac-a", "path-1", HASH_B);
    expect(status).toEqual({ status: "not_recorded", because: "recorded_for_another_version" });
  });

  it("does not leak across patient, practice or pathway", () => {
    for (const other of [FIXTURES.otherPatient, FIXTURES.otherPractice, FIXTURES.otherPathway]) {
      expect(lookup([other]).status).toBe("not_recorded");
    }
    // And the practice boundary specifically: same patient id at another practice.
    expect(consentFor([FIXTURES.otherPractice], "pat-1", "prac-a", "path-1", HASH_A).status).toBe(
      "not_recorded",
    );
  });

  it("takes the latest decision when a patient changed their mind", () => {
    const first = record({ decision: "refused", decidedAt: "2026-06-01" });
    const second = record({ decision: "given", decidedAt: "2026-06-10" });
    expect(lookup([first, second]).status).toBe("given");
    expect(lookup([second, first]).status).toBe("given"); // order of the array must not matter
  });
});

describe("W125 withdrawal", () => {
  it("is reported as itself, not as an absence", () => {
    // The patient did something. A record that reads as "nothing recorded" loses that.
    const status = lookup([FIXTURES.withdrawn]);
    expect(status.status).toBe("withdrawn");
    expect(describeConsent(status)).toContain("withdrawn on 2026-07-01");
  });

  it("keeps the original decision and date, so the period it stood is not erased", () => {
    expect(FIXTURES.withdrawn.decidedAt).toBe("2026-06-07");
    expect(FIXTURES.withdrawn.decision).toBe("given");
    expect(FIXTURES.withdrawn.withdrawnAt).toBe("2026-07-01");
  });

  it("does not satisfy the gate", () => {
    expect(() => assertConsented(lookup([FIXTURES.withdrawn]))).toThrow(ConsentMissingError);
  });
});

describe("W129 a withdrawal cannot be lost to array order", () => {
  // The finding: `withdrawConsent` returns a NEW record with the SAME decidedAt, which is the
  // documented way to use it — so a set holding both copies used to resolve by array order,
  // and a withdrawn consent read as `given` whenever they were stored the other way round.
  const original = record({ decidedAt: "2026-06-01" });
  const withdrawn = withdrawConsent(original, "2026-07-01");

  it.each([
    ["withdrawn last", [original, withdrawn]],
    ["withdrawn first", [withdrawn, original]],
  ])("reads as withdrawn with the copies %s", (_label, records) => {
    expect(lookup(records as ConsentRecord[]).status).toBe("withdrawn");
  });

  it("suppresses an earlier decision as well as the withdrawn one", () => {
    // The rule is stated over the whole set: a withdrawal suppresses every decision made at or
    // before it. Anything narrower leaves an older `given` to be picked up by a later reader.
    const earlier = record({ decidedAt: "2026-05-01" });
    expect(lookup([earlier, original, withdrawn]).status).toBe("withdrawn");
  });

  it("a re-consent dated AFTER the withdrawal still restores it", () => {
    const fresh = record({ decidedAt: "2026-08-01" });
    expect(lookup([original, withdrawn, fresh]).status).toBe("given");
    expect(lookup([fresh, withdrawn, original]).status).toBe("given");
  });

  it("a re-consent dated the SAME DAY as the withdrawal reads as withdrawn", () => {
    // Day-granularity dates cannot order two events within a day, and refusing to guess is the
    // safe direction for consent. Stated so the behaviour is a decision, not an accident.
    const sameDay = record({ decidedAt: "2026-07-01" });
    expect(lookup([original, withdrawn, sameDay]).status).toBe("withdrawn");
  });
});

describe("W125 the gate throws rather than returning a boolean", () => {
  it("returns the record when consent was given", () => {
    expect(assertConsented(lookup([FIXTURES.given])).decidedAt).toBe("2026-06-01");
  });

  it("throws for every status that is not `given`", () => {
    // No "close enough": refused, withdrawn and both absences all refuse.
    for (const records of [[], [FIXTURES.refused], [FIXTURES.withdrawn], [FIXTURES.otherVersion]]) {
      expect(() => assertConsented(lookup(records))).toThrow(ConsentMissingError);
    }
  });

  it("names the status it refused on, so the caller knows which conversation to have", () => {
    expect(() => assertConsented(lookup([FIXTURES.refused]))).toThrow(/"refused"/);
    expect(() => assertConsented(lookup([]))).toThrow(/"not_recorded"/);
  });
});

describe("W125 what a record must carry", () => {
  it.each<[Partial<ConsentInput>, ConsentRejection]>([
    [{ patientId: " " }, "patient_missing"],
    [{ practiceId: "" }, "practice_missing"],
    [{ pathwayId: "" }, "pathway_missing"],
    [{ versionHash: " " }, "version_missing"],
    [{ statement: "   " }, "statement_missing"],
    [{ recordedBy: "" }, "recorder_missing"],
    [{ decidedAt: "yesterday" }, "date_missing_or_unreadable"],
    [{ decidedAt: "2027-01-01" }, "recorded_in_the_future"],
  ])("refuses %o with %s", (over, expected) => {
    const result = recordConsent(input(over), TODAY);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toContain(expected);
  });

  it("reports every problem at once", () => {
    const result = recordConsent(input({ statement: "", recordedBy: "", decidedAt: "" }), TODAY);
    expect(!result.ok && result.errors.sort()).toEqual([
      "date_missing_or_unreadable",
      "recorder_missing",
      "statement_missing",
    ]);
  });

  it("explains every refusal it can produce", () => {
    const reasons: ConsentRejection[] = [
      "patient_missing", "practice_missing", "pathway_missing", "version_missing",
      "statement_missing", "recorder_missing", "date_missing_or_unreadable", "recorded_in_the_future",
    ];
    for (const reason of reasons) {
      expect(explainConsentRejection(reason).length, reason).toBeGreaterThan(15);
    }
  });

  it("keeps the statement that was put to the patient", () => {
    const kept = record({ statement: "  Placeholder wording as read aloud.  " });
    expect(kept.statement).toBe("Placeholder wording as read aloud.");
  });
});

describe("W168: two decisions on one day do not resolve by array order", () => {
  // W129 stated the WITHDRAWAL rule over the whole set precisely because day-granularity dates
  // cannot order two events within a day, and this module says so in its own comment: "refusing
  // to guess is the safe direction for consent". Two lines later `latest` guessed anyway — a
  // plain sort by decidedAt with no tie-break, so a same-day given/refused pair resolved to
  // whichever the caller happened to list last. Same shape as the Y3-1 audit finding, in the
  // module that decides whether a patient agreed.
  const given = record({ decision: "given", decidedAt: "2026-06-10" });
  const refused = record({ decision: "refused", decidedAt: "2026-06-10" });

  it("reads as NOT consented whichever order the pair arrives in", () => {
    for (const order of [[given, refused], [refused, given]]) {
      const status = consentFor(order, "pat-1", "prac-a", "path-1", HASH_A);
      expect(status.status, `order ${order.map((r) => r.decision).join(",")}`).not.toBe("given");
    }
  });

  it("still reads as consented when the day's decisions agree", () => {
    // The fix must not turn every same-day pair into a refusal — only a contradictory one.
    const second = record({ decision: "given", decidedAt: "2026-06-10", recordedBy: "clin-2" });
    for (const order of [[given, second], [second, given]]) {
      expect(consentFor(order, "pat-1", "prac-a", "path-1", HASH_A).status).toBe("given");
    }
  });

  it("still lets a later day override an earlier one", () => {
    const later = record({ decision: "given", decidedAt: "2026-06-11" });
    expect(consentFor([refused, later], "pat-1", "prac-a", "path-1", HASH_A).status).toBe("given");
    expect(consentFor([later, refused], "pat-1", "prac-a", "path-1", HASH_A).status).toBe("given");
  });
});
