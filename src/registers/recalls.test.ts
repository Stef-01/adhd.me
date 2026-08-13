// W71 verify gate: dedup against synthetic recall data — a Meherr offer never
// duplicates a recall the practice is already running for the same gap.

import { describe, expect, it } from "vitest";
import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";
import { syntheticRecalls } from "@/synthetic/recalls";
import type { CareGap } from "./caregap";
import {
  type PracticeRecall,
  reconcileWithRecalls,
  suppressionCounts,
} from "./recalls";

const PRACTICE = "practice-1" as PracticeId;
const TODAY = "2026-08-10";
const DIABETES = "cond_a" as ConditionCode;
const CKD = "cond_b" as ConditionCode;

function gap(patientId: string, conditionCode: ConditionCode = DIABETES): CareGap {
  return {
    notAClinicalRecommendation: true,
    practiceId: PRACTICE,
    patientId: patientId as PatientId,
    conditionCode,
    intervalId: "i1" as CareGap["intervalId"],
    intervalMonths: 12,
    lastRelevantVisit: "2025-01-01",
    monthsSinceLastVisit: 19,
    basis: "interval_elapsed",
  };
}

function recall(over: Partial<PracticeRecall> = {}): PracticeRecall {
  return {
    practiceId: PRACTICE,
    patientId: "p1" as PatientId,
    conditionCode: DIABETES,
    status: "open",
    openedAt: "2026-06-01",
    ...over,
  };
}

describe("W71 recall coexistence", () => {
  it("suppresses a gap the practice is already recalling for the same condition", () => {
    const result = reconcileWithRecalls([gap("p1")], [recall()]);

    expect(result.send).toEqual([]);
    expect(result.suppressed).toHaveLength(1);
    expect(result.suppressed[0]?.reason).toBe("recall_same_condition");
    expect(result.suppressed[0]?.recallOpenedAt).toBe("2026-06-01");
  });

  it("leaves a gap for a different condition alone", () => {
    // The practice recalling diabetes says nothing about the CKD register.
    const result = reconcileWithRecalls([gap("p1", CKD)], [recall({ conditionCode: DIABETES })]);

    expect(result.send).toHaveLength(1);
    expect(result.suppressed).toEqual([]);
  });

  it("treats an unscoped recall as covering everything", () => {
    // Fail-safe: a recall we cannot attribute might be about this gap, and guessing
    // otherwise is the guess that produces the duplicate contact.
    const result = reconcileWithRecalls(
      [gap("p1", DIABETES), gap("p1", CKD)],
      [recall({ conditionCode: null })],
    );

    expect(result.send).toEqual([]);
    expect(result.suppressed.map((s) => s.reason)).toEqual(["recall_unscoped", "recall_unscoped"]);
  });

  it("ignores a closed recall — finished work must not silence a register forever", () => {
    const result = reconcileWithRecalls(
      [gap("p1")],
      [recall({ status: "closed", closedAt: "2026-07-01" })],
    );

    expect(result.send).toHaveLength(1);
    expect(result.suppressed).toEqual([]);
  });

  it("honours the legacy coarse activeRecall flag", () => {
    const result = reconcileWithRecalls([gap("p1")], [], {
      patientsWithActiveRecall: new Set(["p1" as PatientId]),
    });

    expect(result.send).toEqual([]);
    expect(result.suppressed[0]?.reason).toBe("patient_active_recall");
  });

  it("only affects the patient the recall names", () => {
    const result = reconcileWithRecalls([gap("p1"), gap("p2")], [recall({ patientId: "p1" as PatientId })]);

    expect(result.send.map((g) => g.patientId)).toEqual(["p2"]);
  });

  it("reports the earliest open recall, not whichever row came last", () => {
    const result = reconcileWithRecalls(
      [gap("p1")],
      [recall({ openedAt: "2026-07-01" }), recall({ openedAt: "2026-03-01" })],
    );

    expect(result.suppressed[0]?.recallOpenedAt).toBe("2026-03-01");
  });

  it("never silently drops a gap — every one is sent or explained", () => {
    const gaps = [gap("p1"), gap("p2", CKD), gap("p3")];
    const result = reconcileWithRecalls(gaps, [recall({ patientId: "p3" as PatientId })], {
      patientsWithActiveRecall: new Set(["p2" as PatientId]),
    });

    expect(result.send.length + result.suppressed.length).toBe(gaps.length);
    for (const item of result.suppressed) expect(item.reason).toBeTruthy();
  });
});

describe("W71 dedup against synthetic recall data", () => {
  const patientIds = Array.from({ length: 400 }, (_, i) => `p-${i}` as PatientId);
  const conditionCodes = [DIABETES, CKD];

  const recalls = syntheticRecalls({
    seed: 71,
    practiceId: PRACTICE,
    patientIds,
    conditionCodes,
    todayIso: TODAY,
  });

  // Every patient has a gap on both registers, so the recall data is the only thing
  // that can suppress anything.
  const gaps = patientIds.flatMap((id) => conditionCodes.map((c) => gap(id, c)));

  it("generates a spread that actually exercises every branch", () => {
    // A dedup test proves nothing if the fixture contains no recalls to dedup against.
    const open = recalls.filter((r) => r.status === "open");
    expect(open.length).toBeGreaterThan(20);
    expect(open.filter((r) => r.conditionCode === null).length).toBeGreaterThan(0);
    expect(recalls.filter((r) => r.status === "closed").length).toBeGreaterThan(0);
  });

  it("no gap survives that an open recall already covers", () => {
    const result = reconcileWithRecalls(gaps, recalls);

    const openScoped = new Set(
      recalls
        .filter((r) => r.status === "open" && r.conditionCode !== null)
        .map((r) => `${r.patientId}::${r.conditionCode}`),
    );
    const openUnscoped = new Set(
      recalls.filter((r) => r.status === "open" && r.conditionCode === null).map((r) => r.patientId),
    );

    for (const sent of result.send) {
      expect(openScoped.has(`${sent.patientId}::${sent.conditionCode}`)).toBe(false);
      expect(openUnscoped.has(sent.patientId)).toBe(false);
    }
  });

  it("suppresses nothing that no open recall covers", () => {
    const result = reconcileWithRecalls(gaps, recalls);
    const coveredPatients = new Set(
      recalls.filter((r) => r.status === "open").map((r) => r.patientId),
    );

    for (const item of result.suppressed) {
      expect(coveredPatients.has(item.gap.patientId)).toBe(true);
    }
  });

  it("a closed-only recall never suppresses", () => {
    const closedOnly = recalls.filter((r) => r.status === "closed");
    const result = reconcileWithRecalls(gaps, closedOnly);

    expect(result.suppressed).toEqual([]);
    expect(result.send).toHaveLength(gaps.length);
  });

  it("is deterministic — the same seed reconciles identically", () => {
    const again = syntheticRecalls({
      seed: 71,
      practiceId: PRACTICE,
      patientIds,
      conditionCodes,
      todayIso: TODAY,
    });

    expect(again).toEqual(recalls);
    expect(suppressionCounts(reconcileWithRecalls(gaps, again))).toEqual(
      suppressionCounts(reconcileWithRecalls(gaps, recalls)),
    );
  });

  it("counts suppressions by reason for the ops surfaces", () => {
    const counts = suppressionCounts(reconcileWithRecalls(gaps, recalls));

    expect(counts.recall_same_condition).toBeGreaterThan(0);
    expect(counts.recall_unscoped).toBeGreaterThan(0);
    expect(counts.patient_active_recall).toBe(0);
  });
});
