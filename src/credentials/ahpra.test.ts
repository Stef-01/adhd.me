// W111 verify gate: live-host refusal, fixtures only, and no inference from a failed lookup.

import { describe, expect, it } from "vitest";
import {
  AHPRA_OUTCOME_COPY,
  AhpraRegisterAdapter,
  type AhpraRecord,
  type AhpraRegisterClient,
} from "./ahpra";

const SANDBOX = "https://register.fixture.test";
const CHECKED = "2026-08-10T09:00:00Z";

function record(over: Partial<AhpraRecord> = {}): AhpraRecord {
  return {
    registrationNumber: "MED0001234567",
    familyName: "Nguyen",
    givenName: "Mai",
    profession: "Medical Practitioner",
    status: "registered",
    conditions: [],
    registrationExpiresOn: "2027-09-30",
    checkedAt: "1970-01-01T00:00:00Z", // deliberately wrong: the adapter must restamp it
    sourceUrl: "https://somewhere.else.test",
    ...over,
  };
}

function client(records: readonly AhpraRecord[] | Error): AhpraRegisterClient {
  return {
    async search() {
      if (records instanceof Error) throw records;
      return records;
    },
  };
}

const adapter = (records: readonly AhpraRecord[] | Error) =>
  new AhpraRegisterAdapter({ baseUrl: SANDBOX }, client(records));

describe("W111 the live register is gated", () => {
  for (const host of [
    "https://www.ahpra.gov.au/registration",
    "https://ahpra.gov.au",
    "https://www.medicalboard.gov.au/registration",
    "https://register.ahpra.example.com",
  ]) {
    it(`refuses ${host}`, () => {
      expect(() => new AhpraRegisterAdapter({ baseUrl: host }, client([]))).toThrow(
        /founder gate/,
      );
    });
  }

  it("allows a fixture host, so the refusal is not refusing everything", () => {
    // Guard against a vacuous pass: a constructor that threw unconditionally would satisfy
    // every case above.
    expect(() => new AhpraRegisterAdapter({ baseUrl: SANDBOX }, client([]))).not.toThrow();
  });
});

describe("W111 a lookup never infers", () => {
  it("no match is not_found — a statement about the SEARCH", () => {
    // The union has no "unregistered" member, so the conclusion this lookup is not entitled
    // to draw is unrepresentable rather than merely discouraged.
    return adapter([])
      .lookup({ familyName: "Nguyen" }, CHECKED)
      .then((outcome) => {
        expect(outcome).toEqual({ found: false, reason: "not_found" });
        expect(AHPRA_OUTCOME_COPY.not_found).toContain("not that the person is unregistered");
      });
  });

  it("a failed lookup is unavailable, never not_found", async () => {
    // An outage must not become an absence of registration.
    const outcome = await adapter(new Error("network")).lookup({ familyName: "Nguyen" }, CHECKED);
    expect(outcome).toEqual({ found: false, reason: "lookup_unavailable" });
  });

  it("more than one match is ambiguous, never the first one", async () => {
    // Two practitioners share a name more often than a practice notices, and picking one
    // attaches a registration to the wrong person — the hardest failure to spot afterwards,
    // because the record looks complete.
    const outcome = await adapter([record(), record({ givenName: "Minh" })]).lookup(
      { familyName: "Nguyen" },
      CHECKED,
    );
    expect(outcome).toEqual({ found: false, reason: "ambiguous" });
  });

  it("an empty query is refused rather than run", async () => {
    for (const query of [{}, { familyName: "  " }, { registrationNumber: "" }]) {
      expect(await adapter([record()]).lookup(query, CHECKED)).toEqual({
        found: false,
        reason: "lookup_unavailable",
      });
    }
  });
});

describe("W111 what a hit records", () => {
  it("stamps when WE read it, not what the client claimed", async () => {
    const outcome = await adapter([record()]).lookup({ registrationNumber: "MED0001234567" }, CHECKED);
    expect(outcome.found).toBe(true);
    if (!outcome.found) throw new Error("unreachable");
    expect(outcome.record.checkedAt).toBe(CHECKED);
    expect(outcome.record.sourceUrl).toBe(SANDBOX);
  });

  it("carries conditions verbatim", async () => {
    // A condition is a legal statement. Paraphrasing or scoring one is a claim about it.
    const conditions = [
      "Must not provide cosmetic procedures involving injectables.",
      "Practice must be supervised at level 2 as approved by the Board.",
    ];
    const outcome = await adapter([record({ status: "registered_with_conditions", conditions })]).lookup(
      { registrationNumber: "MED0001234567" },
      CHECKED,
    );
    if (!outcome.found) throw new Error("expected a hit");
    expect(outcome.record.conditions).toEqual(conditions);
  });

  it("has no field that grades or endorses a practitioner", () => {
    // The register records registration and restrictions. It does not rank people, and a
    // score here would become a competence claim the moment W108's model consumed it.
    const keys = Object.keys(record());
    for (const banned of ["score", "rating", "rank", "endorsedFor", "competence", "quality"]) {
      expect(keys, `an Ahpra record must not carry "${banned}"`).not.toContain(banned);
    }
    expect(keys).toContain("status");
  });
});

describe("W111 the module holds no credential", () => {
  it("exports no way to turn a lookup into a credential", async () => {
    // A register hit says "this person is registered", not "this person may do the thing".
    // Collapsing the two is how a registration becomes an implied competence, so the bridge
    // is deliberately not here — it is W108's model and a later unit's binding.
    const module_ = await import("./ahpra");
    const exported = Object.keys(module_);
    for (const name of exported) {
      expect(name.toLowerCase()).not.toMatch(/credential|verify|attest|grant|approve/);
    }
    expect(exported).toContain("AhpraRegisterAdapter");
  });
});
