// W61 verify gate: the W5 property tests carried over. The properties that made W5's ranking
// safe — it is a permutation of the eligible set, deterministic, and never a filter — must
// still hold once gaps influence the order, because ranking is where a "prioritise this
// patient" feature could quietly become "contact this patient".

import { describe, expect, it } from "vitest";
import type { ClinicianId, ConditionCode, Patient, PatientId, PracticeId } from "@/domain/types";
import { rankCandidates } from "@/engine/pool";
import type { CareGap } from "./caregap";
import { gapShareOfBatch, rankGapAware } from "./ranking";

const PRACTICE = "prac-1" as PracticeId;

function patient(id: string, over: Partial<Patient> = {}): Patient {
  return {
    id: id as PatientId,
    practiceId: PRACTICE,
    usualClinicianId: "clin-1" as ClinicianId,
    smsConsent: true,
    optedOut: false,
    lastAttendedAt: "2025-01-10",
    futureBookingAt: null,
    activeRecall: false,
    chronicCare: false,
    holdout: false,
    ...over,
  };
}

function gap(patientId: string): CareGap {
  return {
    notAClinicalRecommendation: true,
    practiceId: PRACTICE,
    patientId: patientId as PatientId,
    conditionCode: "placeholder_register_a" as ConditionCode,
    intervalId: "iv-a" as CareGap["intervalId"],
    intervalMonths: 12,
    lastRelevantVisit: "2020-01-01",
    monthsSinceLastVisit: 79,
    basis: "interval_elapsed",
  };
}

const PANEL = [
  patient("pat-1", { lastAttendedAt: "2025-06-01" }),
  patient("pat-2", { lastAttendedAt: "2024-01-01" }),
  patient("pat-3", { chronicCare: true, lastAttendedAt: "2025-07-01" }),
  patient("pat-4", { lastAttendedAt: "2023-05-01" }),
];

describe("W61 carried-over W5 properties", () => {
  it("is a permutation of the eligible set — same members, same length", () => {
    for (const gaps of [[], [gap("pat-1")], [gap("pat-1"), gap("pat-4")], PANEL.map((p) => gap(p.id as string))]) {
      const out = rankGapAware(PANEL, gaps);
      expect(out).toHaveLength(PANEL.length);
      expect([...out].map((p) => p.id).sort()).toEqual([...PANEL].map((p) => p.id).sort());
    }
  });

  it("never adds a patient, even one that has a gap", () => {
    // The failure this guards: a gap for someone outside the eligible set pulling them in.
    const out = rankGapAware(PANEL, [gap("pat-9")]);
    expect(out.map((p) => p.id)).not.toContain("pat-9");
    expect(out).toHaveLength(PANEL.length);
  });

  it("never drops a patient who has no gap — ranking is not a filter", () => {
    const out = rankGapAware(PANEL, [gap("pat-1")]);
    expect(out.map((p) => p.id).sort()).toEqual(["pat-1", "pat-2", "pat-3", "pat-4"]);
  });

  it("is deterministic", () => {
    const gaps = [gap("pat-2")];
    expect(rankGapAware(PANEL, gaps)).toEqual(rankGapAware(PANEL, gaps));
  });

  it("does not mutate its inputs", () => {
    const before = PANEL.map((p) => p.id);
    rankGapAware(PANEL, [gap("pat-4")]);
    expect(PANEL.map((p) => p.id)).toEqual(before);
  });

  it("handles the empty panel", () => {
    expect(rankGapAware([], [gap("pat-1")])).toEqual([]);
  });
});

describe("W61 gaps rank within eligibility", () => {
  it("with no gaps the order is byte-identical to W5 — registers off changes nothing", () => {
    expect(rankGapAware(PANEL, [])).toEqual(rankCandidates([...PANEL]));
  });

  it("a gapped patient sorts ahead of a non-gapped one", () => {
    // pat-1 is the most recently seen and has no chronic marker, so W5 ranks it last.
    expect(rankCandidates([...PANEL]).at(-1)?.id).toBe("pat-1");
    expect(rankGapAware(PANEL, [gap("pat-1")])[0]?.id).toBe("pat-1");
  });

  it("W5's order is preserved WITHIN each group", () => {
    const out = rankGapAware(PANEL, [gap("pat-1"), gap("pat-2")]);
    // Gapped group ranked by W5 among themselves: pat-2 (2024) before pat-1 (2025).
    expect(out.slice(0, 2).map((p) => p.id)).toEqual(["pat-2", "pat-1"]);
    // Ungapped group likewise: chronic pat-3 first, then pat-4.
    expect(out.slice(2).map((p) => p.id)).toEqual(["pat-3", "pat-4"]);
  });

  it("when everyone has a gap the order collapses back to W5's", () => {
    const all = PANEL.map((p) => gap(p.id as string));
    expect(rankGapAware(PANEL, all)).toEqual(rankCandidates([...PANEL]));
  });

  it("a gap outranks the chronic-care marker but only for ordering", () => {
    // pat-3 is chronic and W5-first; a gap on pat-4 puts pat-4 ahead — and pat-3 is still
    // in the list, still ahead of everyone else without a gap.
    const out = rankGapAware(PANEL, [gap("pat-4")]);
    expect(out[0]?.id).toBe("pat-4");
    expect(out[1]?.id).toBe("pat-3");
  });
});

describe("W61 reporting what the register changed", () => {
  it("reports the gap share of a batch", () => {
    expect(gapShareOfBatch(PANEL, [gap("pat-1"), gap("pat-2")])).toBe(0.5);
    expect(gapShareOfBatch(PANEL, [])).toBe(0);
    expect(gapShareOfBatch([], [gap("pat-1")])).toBe(0);
  });
});
