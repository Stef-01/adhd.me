// W38 gate (part 2): the error taxonomy is complete, stable, and correctly
// classifies each subsystem's own failure vocabulary.

import { describe, expect, it } from "vitest";
import {
  ALL_ERROR_CODES,
  blocksSending,
  classifyDrift,
  classifyLink,
  classifyRead,
  ERROR_TAXONOMY,
  meaningOf,
} from "@/integration/errors";
import { BEST_PRACTICE_SPEC, detectDrift } from "@/pms/drift";
import { BEST_PRACTICE_FIXTURE } from "@/pms/fixtures";

describe("W38 error taxonomy shape", () => {
  it("every code carries a severity, a summary and an operator action", () => {
    for (const code of ALL_ERROR_CODES) {
      const meaning = meaningOf(code);
      expect(meaning.code).toBe(code); // key and payload agree — no copy-paste drift
      expect(["info", "warning", "error"]).toContain(meaning.severity);
      expect(meaning.summary.length).toBeGreaterThan(10);
      expect(meaning.operatorAction.length).toBeGreaterThan(10);
    }
  });

  it("the conditions that must hold sending are exactly the safety ones", () => {
    const blocking = ALL_ERROR_CODES.filter((c) => ERROR_TAXONOMY[c].blocksSending).sort();
    expect(blocking).toEqual(["GATE_BLOCKED", "LINK_UNSAFE", "PMS_FIXTURE_DRIFT", "PMS_STALE_DATA"]);
  });

  it("transient PMS faults alone do not hold sending (a fresh snapshot may cover them)", () => {
    expect(blocksSending(["PMS_TIMEOUT", "PMS_THREW", "PMS_CIRCUIT_OPEN"])).toBe(false);
    expect(blocksSending(["PMS_TIMEOUT", "PMS_STALE_DATA"])).toBe(true);
    expect(blocksSending([])).toBe(false);
  });
});

describe("W38 classifiers", () => {
  it("maps each W36 read failure to its code", () => {
    const base = { usableForSending: true, health: "ok" as const };
    expect(classifyRead({ ...base, failure: "timeout" })).toEqual(["PMS_TIMEOUT"]);
    expect(classifyRead({ ...base, failure: "threw" })).toEqual(["PMS_THREW"]);
    expect(classifyRead({ ...base, failure: "malformed" })).toEqual(["PMS_MALFORMED"]);
    expect(classifyRead({ ...base, failure: "circuit_open" })).toEqual(["PMS_CIRCUIT_OPEN"]);
  });

  it("a healthy read classifies to nothing", () => {
    expect(classifyRead({ usableForSending: true, health: "ok" })).toEqual([]);
  });

  it("a degraded read past the freshness budget adds the stale code", () => {
    expect(
      classifyRead({ failure: "threw", usableForSending: false, health: "degraded" }),
    ).toEqual(["PMS_THREW", "PMS_STALE_DATA"]);
  });

  it("an unavailable read (no snapshot) is not reported as stale data", () => {
    // Nothing was cached, so "stale" would be misleading — it's simply unavailable.
    expect(classifyRead({ failure: "threw", usableForSending: false, health: "unavailable" })).toEqual([
      "PMS_THREW",
    ]);
  });

  it("maps W29 link fallbacks, and nothing when the link is fine", () => {
    expect(classifyLink("provider_disabled")).toBe("LINK_PROVIDER_DISABLED");
    expect(classifyLink("clinician_not_mapped")).toBe("LINK_CLINICIAN_UNMAPPED");
    expect(classifyLink(undefined)).toBeNull();
  });

  it("maps drift issues to a blocking code, and clean fixtures to none", () => {
    const clean = detectDrift("best-practice", BEST_PRACTICE_FIXTURE, BEST_PRACTICE_SPEC);
    expect(classifyDrift(clean.issues)).toBeNull();

    const drifted = structuredClone(BEST_PRACTICE_FIXTURE) as unknown as Record<string, unknown>;
    delete (drifted.slots as Record<string, unknown>[])[0]!.Status;
    const report = detectDrift("best-practice", drifted, BEST_PRACTICE_SPEC);
    const code = classifyDrift(report.issues);
    expect(code).toBe("PMS_FIXTURE_DRIFT");
    expect(blocksSending([code!])).toBe(true);
  });
});
