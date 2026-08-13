// W63 verify gate: sim completes, invariants hold, comparative report generated.
//
// The load-bearing assertion is not any particular number — those are properties of a
// synthetic world and a fixture cadence. It is that turning registers ON changes only what
// it is allowed to change: fewer or equally many messages, never a patient the W4 rules
// exclude, and never a raw before/after presented as impact.

import { describe, expect, it } from "vitest";
import { verifyLog } from "@/spine/spine";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { renderComparisonReport, runRegisterComparison } from "./compare";
import { DEFAULT_REGISTER_SIM } from "./sim-registers";

const SHORT = { ...DEFAULT_SIM_CONFIG, weeks: 8, patientCount: 800, clinicianCount: 4 };
const ON = { ...DEFAULT_REGISTER_SIM, enabled: true };

describe("W63 registers-off is indistinguishable from the pre-register sim", () => {
  it("an undefined register config and an explicitly disabled one produce identical runs", () => {
    const undef = runSim({ ...SHORT, registers: undefined });
    const off = runSim({ ...SHORT, registers: { ...ON, enabled: false } });
    expect(off.totals).toEqual(undef.totals);
    expect(off.attribution).toEqual(undef.attribution);
    // The register layer draws no RNG, so the whole world is identical, not just the totals.
    expect(off.invitations.length).toBe(undef.invitations.length);
  });
});

describe("W63 the 26-week comparison", () => {
  const comparison = runRegisterComparison(SHORT, ON);

  it("completes both arms", () => {
    expect(comparison.off.invitationsSent).toBeGreaterThan(0);
    expect(comparison.weeks).toBe(8);
  });

  it("holds invariants: each arm replays from its own spine", () => {
    for (const registers of [{ ...ON, enabled: false }, ON]) {
      const result = runSim({ ...SHORT, registers });
      expect(verifyLog(result.log)).toBe(true);
    }
    // Not a tautology: assert the check actually ran and found nothing, so a real
    // violation would surface here rather than being asserted away.
    expect(comparison.violations).toEqual({ off: [], on: [] });
    expect(comparison.invariantsHeld).toBe(true);
  });

  it("narrowing sends no MORE messages than not narrowing", () => {
    // The whole point of a narrowing input: it can only reduce the send set.
    expect(comparison.on.invitationsSent).toBeLessThanOrEqual(comparison.off.invitationsSent);
    expect(comparison.delta.invitationsSent).toBeLessThanOrEqual(0);
  });

  it("keeps each arm's incrementality holdout-based, never a raw off-vs-on difference", () => {
    // Both arms report their own holdout-measured figure; the report compares those, and
    // never presents (on.attended − off.attended) as an effect.
    const report = renderComparisonReport(comparison);
    expect(report).toContain("Incremental attended / 1,000 arm patients");
    expect(report).toContain("holdout-based, each arm on its own");
    expect(report).toContain("Naive generated count (contrast only, never impact)");
  });

  it("generates a comparative report that refuses a clinical reading", () => {
    const report = renderComparisonReport(comparison);
    expect(report).toContain("What this does NOT show");
    expect(report).toContain("FIXTURE");
    expect(report).toContain("G5");
    expect(report).toContain("makes no clinical claim");
    // A negative on-arm figure must never read as "registers harm patients".
    expect(report).toContain("shows no benefit, and cannot");
    expect(report).toContain("sampling noise, not evidence");
    expect(report).toContain("Sample-size warning");
    expect(report).toMatch(/registers off vs on \(synthetic\)/);
  });

  it("is deterministic — the same seed gives the same comparison", () => {
    expect(runRegisterComparison(SHORT, ON)).toEqual(comparison);
  });
});

describe("W63 registers never widen who is contacted", () => {
  it("narrowing changes WHO is picked, but never who is ELIGIBLE", () => {
    // This test previously asserted that the on-arm's recipients are a subset of the
    // off-arm's. That is NOT a guaranteed property and it passed by luck: narrowing shrinks
    // the candidate pool, so a fixed batch size reaches deeper into it, and a patient ranked
    // below the cutoff in the wide arm can sit inside it in the narrow one. They were always
    // eligible — they just were not picked. The distinction matters, because "never widens"
    // is a claim about ELIGIBILITY (W59's property), not about batch composition.
    const off = runSim({ ...SHORT, registers: { ...ON, enabled: false } });
    const on = runSim({ ...SHORT, registers: ON });
    const offRecipients = new Set(off.invitations.map((i) => i.patientId as string));
    const onRecipients = [...new Set(on.invitations.map((i) => i.patientId as string))];

    // Some on-arm recipients may be new to the batch — that is expected.
    const newToBatch = onRecipients.filter((p) => !offRecipients.has(p));
    // ...but every one of them must have been an eligible, non-holdout, attended patient in
    // the unnarrowed world. Narrowing may reorder and shorten; it may not admit anyone.
    const offById = new Map(off.patients.map((p) => [p.id as string, p]));
    for (const id of newToBatch) {
      const patient = offById.get(id);
      expect(patient, `${id} does not exist in the unnarrowed world`).toBeDefined();
      expect(patient?.holdout, `${id} is a holdout patient`).toBe(false);
      expect(patient?.lastAttendedAt, `${id} has never attended`).not.toBeNull();
      expect(patient?.optedOut, `${id} has opted out`).toBe(false);
    }
  });

  it("no invited patient is one the eligibility rules exclude", () => {
    const on = runSim({ ...SHORT, registers: ON });
    const byId = new Map(on.patients.map((p) => [p.id as string, p]));
    for (const inv of on.invitations) {
      const patient = byId.get(inv.patientId as string);
      // Holdout and never-attended are the two exclusions that survive the whole run
      // unchanged, so they are the safe ones to assert against final state.
      expect(patient?.holdout, `holdout patient ${inv.patientId} was invited`).toBe(false);
      expect(patient?.lastAttendedAt, `never-attended ${inv.patientId} was invited`).not.toBeNull();
    }
  });
});
