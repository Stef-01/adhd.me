// W94 verify gate: no-inference tests. A barrier is recorded, never inferred.

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import * as barriersModule from "./barriers";
import {
  BARRIER_CODES,
  BARRIER_COPY,
  type BarrierRecord,
  type BarrierSource,
  barriersFor,
  coverage,
  recordBarrier,
  tallyBarriers,
} from "./barriers";

const PRACTICE = "prac-1" as PracticeId;
const OTHER = "prac-2" as PracticeId;

function input(over: Partial<Parameters<typeof recordBarrier>[0]> = {}) {
  return {
    practiceId: PRACTICE,
    patientId: "p1" as PatientId,
    referralId: "r1",
    code: "cost",
    source: "patient_stated" as BarrierSource | null,
    recordedAt: "2026-08-01T09:00:00Z",
    ...over,
  };
}

function record(over: Partial<BarrierRecord> = {}): BarrierRecord {
  const result = recordBarrier(input());
  if (!result.ok) throw new Error("fixture must record");
  return { ...result.record, ...over };
}

describe("W94 NO INFERENCE — the guarantee is an absence", () => {
  it("the module exports no way to derive a barrier from patient attributes", () => {
    // You cannot call what does not exist. Given a postcode, an appointment time and a
    // cancellation, a plausible guess is easy to compute and would be a claim about
    // someone's circumstances they never made — attached to their health record.
    const exported = Object.keys(barriersModule);
    for (const name of exported) {
      expect(name.toLowerCase(), `no inference entry point: ${name}`).not.toMatch(
        /infer|derive|predict|guess|estimate|likely|suspect/,
      );
    }
    // And nothing takes a patient shape as its only input.
    expect(exported.sort()).toEqual(
      ["BARRIER_CODES", "BARRIER_COPY", "BARRIER_SOURCES", "barriersFor", "coverage", "recordBarrier", "tallyBarriers"].sort(),
    );
  });

  it("an inferred source is refused at runtime, not only by the type", () => {
    // Writing this test honestly exposed a gap: the union stopped OUR code writing an
    // inferred source, but a form post, an ingest or a future API would have sailed
    // through. The value comes from outside, so the check has to exist outside the type.
    const valid: BarrierSource[] = ["patient_stated", "practice_recorded"];
    for (const source of valid) expect(recordBarrier(input({ source })).ok).toBe(true);

    for (const bad of ["inferred", "derived", "predicted", "assumed", "guessed"]) {
      expect(recordBarrier(input({ source: bad as BarrierSource })), bad).toEqual({
        ok: false,
        reason: "unknown_barrier_source",
      });
    }
  });

  it("refuses to record without a source — there is no default", () => {
    // A fallback source would be an invented origin, which is the inferred barrier by
    // another name.
    expect(recordBarrier(input({ source: null }))).toEqual({ ok: false, reason: "missing_source" });
  });

  it("refuses to record without a recording time", () => {
    expect(recordBarrier(input({ recordedAt: null })).ok).toBe(false);
    expect(recordBarrier(input({ recordedAt: "  " })).ok).toBe(false);
  });

  it("refuses an unknown barrier code rather than bucketing it", () => {
    expect(recordBarrier(input({ code: "probably_forgot" }))).toEqual({
      ok: false,
      reason: "unknown_barrier_code",
    });
  });

  it("has no unknown bucket — an unknown bucket invites filling it in", () => {
    const tallies = tallyBarriers([record()], PRACTICE);
    expect(tallies.map((t) => t.code)).toEqual(["cost"]);
    for (const t of tallies) expect(BARRIER_CODES).toContain(t.code);
  });
});

describe("W94 the taxonomy", () => {
  it("covers the four categories the unit names", () => {
    expect([...BARRIER_CODES].sort()).toEqual(["cost", "timing", "transport", "uncertainty"]);
  });

  it("phrases every barrier as something a person SAID, not a property they have", () => {
    // "Said the cost was a problem", never "cannot afford care".
    for (const [code, copy] of Object.entries(BARRIER_COPY)) {
      expect(copy.toLowerCase(), code).toMatch(/^said /);
      for (const banned of ["cannot", "unable", "poor", "deprived", "non-compliant", "refuses"]) {
        expect(copy.toLowerCase(), `${code} must not describe the person`).not.toContain(banned);
      }
    }
  });

  it("is coarse on purpose — a finer taxonomy invites guessing", () => {
    expect(BARRIER_CODES.length).toBeLessThanOrEqual(6);
  });
});

describe("W94 recording and reading", () => {
  it("records a stated barrier with its provenance intact", () => {
    const result = recordBarrier(input({ note: "works nights" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.source).toBe("patient_stated");
    expect(result.record.recordedAt).toBe("2026-08-01T09:00:00Z");
    expect(result.record.note).toBe("works nights");
  });

  it("defaults the note to null rather than inventing one", () => {
    const result = recordBarrier(input());
    expect(result.ok && result.record.note).toBeNull();
  });

  it("tallies by code, commonest first", () => {
    const records = [
      record({ code: "timing" }),
      record({ code: "timing", referralId: "r2" }),
      record({ code: "cost", referralId: "r3" }),
    ];
    expect(tallyBarriers(records, PRACTICE)).toEqual([
      { code: "timing", count: 2 },
      { code: "cost", count: 1 },
    ]);
  });

  it("ignores another practice's records", () => {
    expect(tallyBarriers([record({ practiceId: OTHER })], PRACTICE)).toEqual([]);
    expect(barriersFor([record({ practiceId: OTHER })], PRACTICE, "r1")).toEqual([]);
  });

  it("reads back the barriers on one referral", () => {
    const records = [record(), record({ code: "transport" }), record({ referralId: "other" })];
    expect(barriersFor(records, PRACTICE, "r1").map((r) => r.code)).toEqual(["cost", "transport"]);
  });
});

describe("W94 coverage — how much of the picture is known", () => {
  it("reports the share of leaked referrals that have any barrier recorded", () => {
    // A chart of four bars over 6% of cases is not a finding, and the only honest way to
    // say so is to say so.
    const records = [record({ referralId: "r1" })];
    expect(coverage(records, PRACTICE, ["r1", "r2", "r3", "r4"])).toEqual({
      withBarrier: 1,
      total: 4,
      share: 0.25,
    });
  });

  it("counts a referral once however many barriers it carries", () => {
    const records = [record({ referralId: "r1" }), record({ referralId: "r1", code: "timing" })];
    expect(coverage(records, PRACTICE, ["r1", "r2"]).withBarrier).toBe(1);
  });

  it("does not divide by zero on an empty leak list", () => {
    expect(coverage([], PRACTICE, [])).toEqual({ withBarrier: 0, total: 0, share: 0 });
  });
});
