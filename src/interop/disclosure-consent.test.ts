// W243 verify gate: "a disclosure without a recorded patient consent is refused BY TYPE; silence is
// never consent (W135), and no timeout grants it (W134)."
//
// THE TWO RULES ARE ONE PROPERTY AND IT IS SWEPT, NOT SAMPLED. Silence-is-not-consent and
// no-timeout-grants-it are both instances of: time can only ever REMOVE consent, never create it.
// A name-based check ("no function called `assumeConsent`") misses the shapes that actually occur —
// an expiry that wraps into renewal, a "pending" state that ages into acceptance, a grace period
// counted from the wrong end. So every state is generated and read at every interesting moment, and
// the property is asserted across the whole cross-product.

import { describe, expect, it } from "vitest";
import { lintEducationCopy } from "@/education/advice-lint";
import {
  CONSENT_RECORD_REJECTION_COPY,
  DISCLOSURE_CONSENT_COPY,
  disclosureConsentAt,
  mayDisclose,
  recordDisclosureConsent,
  withdrawDisclosureConsent,
  type DisclosureConsent,
  type DisclosureConsentInput,
} from "./disclosure-consent";

const INPUT: DisclosureConsentInput = {
  patientId: "pat-7",
  recipient: "Example PHN",
  statement: "Agreed that the practice may send quarterly activity figures about their care to this recipient.",
  recordedAtIso: "2026-08-01",
  expiresOnIso: null,
  decision: "given",
};

const mint = (over: Partial<DisclosureConsentInput> = {}): DisclosureConsent => {
  const result = recordDisclosureConsent({ ...INPUT, ...over });
  if (!result.recorded) throw new Error(`fixture refused: ${result.why}`);
  return result.consent;
};

describe("W243 a disclosure without recorded consent cannot be constructed", () => {
  it("cannot be forged: the brand is not exported", () => {
    // The row's "refused by type". A caller with no consent has nothing to pass — and cannot write
    // an object literal that stands in for one, which is what makes this different from a check
    // somebody has to remember to make.
    // @ts-expect-error — an object with the right fields is not a DisclosureConsent.
    const forged: DisclosureConsent = {
      patientId: "pat-7",
      recipient: "Example PHN",
      statement: "I say this is consent.",
      recordedAtIso: "2026-08-01",
      expiresOnIso: null,
      decision: "given",
      withdrawnAtIso: null,
    };
    void forged;
  });

  it("reads a missing record as not_recorded, never as permission", () => {
    const result = mayDisclose(null, "Example PHN", "2026-08-20");
    expect(result.permitted).toBe(false);
    expect(result.status).toBe("not_recorded");
    expect(result.copy).toMatch(/never turned into agreement by time passing/);
  });

  it("permits only a current, given, right-recipient consent", () => {
    expect(mayDisclose(mint(), "Example PHN", "2026-08-20").permitted).toBe(true);
    expect(mayDisclose(mint(), "Somebody Else", "2026-08-20").permitted).toBe(false);
    expect(mayDisclose(mint({ decision: "refused" }), "Example PHN", "2026-08-20").permitted).toBe(false);
  });
});

describe("W243 time can only remove consent, never create it", () => {
  it("holds across every state and every moment, swept rather than sampled", () => {
    // THE PROPERTY, STATED CORRECTLY ON THE SECOND ATTEMPT. My first version asserted that no state
    // ever reads `given`, and the sweep failed on a WITHDRAWN consent read before the withdrawal —
    // rightly, because that consent genuinely was given then. "Never given" is not the property;
    // MONOTONICITY is: once a status is not `given` at some moment, it is not `given` at any later
    // moment. That is what "time can only remove consent, never create it" actually means, and it
    // subsumes both W134 and W135 while admitting the histories that really happen.
    //
    // Read from the record date onward. Before the record there was no record — asking what it said
    // in 2025 is anachronistic, and it is checked separately below.
    const states: { label: string; consent: DisclosureConsent | null }[] = [
      { label: "nothing recorded", consent: null },
      { label: "given, no expiry", consent: mint() },
      { label: "refused", consent: mint({ decision: "refused" }) },
      { label: "refused with an expiry", consent: mint({ decision: "refused", expiresOnIso: "2026-09-01" }) },
      { label: "withdrawn", consent: withdrawDisclosureConsent(mint(), "2026-08-10") },
      { label: "withdrawn and expired", consent: withdrawDisclosureConsent(mint({ expiresOnIso: "2026-08-05" }), "2026-08-10") },
      { label: "for another recipient", consent: mint({ recipient: "Somebody Else" }) },
      { label: "expired", consent: mint({ expiresOnIso: "2026-08-05" }) },
    ];
    const moments = [
      "2026-08-01", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-09",
      "2026-08-10", "2026-08-11", "2026-09-01", "2030-01-01", "2099-12-31",
    ];

    let checked = 0;
    let everLost = 0;
    for (const { label, consent } of states) {
      let lost = false;
      for (const at of moments) {
        checked += 1;
        const status = disclosureConsentAt(consent, "Example PHN", at);
        if (status !== "given") {
          if (!lost) everLost += 1;
          lost = true;
          continue;
        }
        expect(lost, `${label} regained consent at ${at}`).toBe(false);
      }
    }
    expect(checked).toBe(states.length * moments.length);
    expect(checked).toBeGreaterThan(70);
    // Non-vacuity, both ways: some state must actually LOSE consent during the sweep, and some
    // state must actually hold it — otherwise monotonicity is true of a sweep where nothing moved.
    expect(everLost, "no state ever lost consent, so monotonicity proves nothing").toBeGreaterThan(3);
    for (const at of moments) {
      expect(disclosureConsentAt(mint(), "Example PHN", at), at).toBe("given");
    }
  });

  it("reads a record as not_recorded at any moment before it was made", () => {
    // The direction the first draft of the module got wrong: without this, a withdrawn consent read
    // "given" a year before anybody was asked — time creating consent, backwards. Found by the
    // sweep reading moments before the record date, which a test written against "now" never does.
    for (const at of ["2020-01-01", "2026-07-31"]) {
      for (const consent of [mint(), mint({ decision: "refused" }), withdrawDisclosureConsent(mint(), "2026-08-10")]) {
        expect(disclosureConsentAt(consent, "Example PHN", at), at).toBe("not_recorded");
      }
    }
  });

  it("never renews an expired consent, however long you wait", () => {
    // The shape a name check misses: an expiry that wraps. Read far past the expiry, repeatedly.
    const lapsed = mint({ expiresOnIso: "2026-08-05" });
    for (const at of ["2026-08-06", "2026-09-06", "2027-08-06", "2036-08-06"]) {
      expect(disclosureConsentAt(lapsed, "Example PHN", at)).toBe("expired");
    }
  });

  it("takes no grace period, no default clock and no assumption", () => {
    // @ts-expect-error — no grace period to count from the wrong end.
    void disclosureConsentAt(mint(), "Example PHN", "2026-08-20", { graceDays: 30 });
    // @ts-expect-error — and the moment is required: a status read against an unstated clock is a
    // status nobody can check.
    void disclosureConsentAt(mint(), "Example PHN");
  });

  it("reads a null expiry as nothing stated, not as an invented date", () => {
    // "No stated expiry" is not "never expires" — but with nothing stated there is nothing to have
    // run out, and the distinction lives in the record rather than in a default this module made up.
    expect(mint().expiresOnIso).toBeNull();
    expect(disclosureConsentAt(mint(), "Example PHN", "2099-12-31")).toBe("given");
  });
});

describe("W243 expiry, refusal and absence are three different answers", () => {
  it("keeps them apart, each with its own instruction to the reader", () => {
    expect(disclosureConsentAt(null, "Example PHN", "2026-08-20")).toBe("not_recorded");
    expect(disclosureConsentAt(mint({ decision: "refused" }), "Example PHN", "2026-08-20")).toBe("refused");
    expect(disclosureConsentAt(mint({ expiresOnIso: "2026-08-05" }), "Example PHN", "2026-08-20")).toBe("expired");
    // The instructions really are opposite, and the copy says so rather than leaving it to be read
    // off a status name.
    expect(DISCLOSURE_CONSENT_COPY.refused).toMatch(/not a gap to be filled by asking again/);
    // Reworded after the ADVICE LINTER flagged the first draft's "Asking again is the right next
    // step" under `no-action-framing`. Unlike W242's vendor name, that was a real hit rather than a
    // false one — the sentence genuinely told a reader what to do — and the fix is the wording, not
    // an acceptance. The distinction it has to carry survives: a lapsed permission can be sought
    // again where a refusal cannot.
    expect(DISCLOSURE_CONSENT_COPY.expired).toMatch(/can be sought again where a refusal cannot/);
    expect(DISCLOSURE_CONSENT_COPY.not_recorded).toMatch(/absence of a decision rather than the presence of a refusal/);
  });

  it("reads a refusal that also lapsed as a refusal, not as expiry", () => {
    // Ordering, and it matters: a patient who said no and then let it lapse still said no.
    // Reporting that as "expired" would invite somebody to ask again.
    const both = mint({ decision: "refused", expiresOnIso: "2026-08-05" });
    expect(disclosureConsentAt(both, "Example PHN", "2026-08-20")).toBe("refused");
  });

  it("declares copy for every status and no status without copy", () => {
    const statuses = new Set<string>();
    for (const consent of [
      null,
      mint(),
      mint({ decision: "refused" }),
      mint({ expiresOnIso: "2026-08-05" }),
      mint({ recipient: "Somebody Else" }),
      withdrawDisclosureConsent(mint(), "2026-08-10"),
    ]) {
      statuses.add(disclosureConsentAt(consent, "Example PHN", "2026-08-20"));
    }
    expect([...statuses].sort()).toEqual(Object.keys(DISCLOSURE_CONSENT_COPY).sort());
  });
});

describe("W243 a record that cannot say what was agreed is refused", () => {
  it("refuses each incomplete input with its own reason", () => {
    const cases: Array<[string, Partial<DisclosureConsentInput>, keyof typeof CONSENT_RECORD_REJECTION_COPY]> = [
      ["no patient", { patientId: " " }, "no_patient"],
      ["no recipient", { recipient: "" }, "no_recipient"],
      ["thin statement", { statement: "ok" }, "no_statement"],
      ["unreadable date", { recordedAtIso: "August" }, "unreadable_date"],
      ["unreadable expiry", { expiresOnIso: "soon" }, "unreadable_date"],
      ["expiry before record", { expiresOnIso: "2026-07-01" }, "expiry_before_record"],
    ];
    const produced = new Set<string>();
    for (const [label, over, expected] of cases) {
      const result = recordDisclosureConsent({ ...INPUT, ...over });
      expect(result.recorded, label).toBe(false);
      if (result.recorded) continue;
      expect(result.why, label).toBe(expected);
      expect(result.copy, label).toBe(CONSENT_RECORD_REJECTION_COPY[expected]);
      produced.add(result.why);
    }
    expect([...produced].sort()).toEqual(Object.keys(CONSENT_RECORD_REJECTION_COPY).sort());
  });

  it("records a refusal through the same door as a permission", () => {
    // A refusal is a decision the patient made. It has to be recordable, and visible, rather than
    // left as an absence somebody fills in later by asking again (W125).
    const refused = recordDisclosureConsent({ ...INPUT, decision: "refused" });
    expect(refused.recorded).toBe(true);
  });

  it("passes the advice linter on everything it says", () => {
    for (const text of [...Object.values(DISCLOSURE_CONSENT_COPY), ...Object.values(CONSENT_RECORD_REJECTION_COPY)]) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
