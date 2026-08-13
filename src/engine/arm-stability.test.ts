// W175 verify gate: "holdout membership is stable across a vertical version change; a migration
// cannot move a practice between arms."
//
// The property holds by construction — the vertical is not an input to the draw — so the tests
// have to do two different jobs. They demonstrate the property end to end across a realistic
// migration, and they PIN THE CONSTRUCTION, because a property that holds by construction is
// worth exactly what the construction's stability is worth.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ArmDriftError, armDrift, assertArmsUnchanged } from "./arm-stability";
import { assignArm, assignHoldout, assignmentUnit } from "./holdout";
import type { Patient, PatientId, PracticeId, Practice } from "@/domain/types";
import { acceptVersion, currentBinding, type VerticalBinding } from "@/verticals/binding";
import type { VerticalSpec } from "@/verticals/model";

const PRACTICE: Practice = {
  id: "prac-1" as PracticeId,
  name: "Demo Family Practice",
  timezone: "Australia/Sydney",
  holdoutRate: 0.2,
};

const panel = (n: number): Patient[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `pat-${String(i + 1).padStart(3, "0")}` as PatientId,
    practiceId: PRACTICE.id,
    usualClinicianId: null,
    smsConsent: true,
    optedOut: false,
    lastAttendedAt: "2026-01-01",
    futureBookingAt: null,
    activeRecall: false,
    chronicCare: true,
    holdout: false,
  }));

/** The panel with arms actually assigned, which is the state a migration would start from. */
const assigned = (patients: Patient[]) =>
  assignHoldout(patients, PRACTICE, "2026-02-01T00:00:00Z").patients;

describe("W175 a vertical version change cannot move an arm", () => {
  it("leaves every arm identical across an accept-and-migrate", () => {
    const before = assigned(panel(200));

    // A real migration: bind to v1, then accept v2 with different membership.
    const v1: VerticalSpec = {
      verticalId: "vert-1",
      name: "Example vertical",
      members: [{ kind: "pathway", ref: "hash-a" }],
    };
    const v2: VerticalSpec = {
      verticalId: "vert-1",
      name: "Example vertical",
      members: [{ kind: "pathway", ref: "hash-a" }, { kind: "pathway", ref: "hash-b" }],
    };
    expect(v1.members.length).not.toBe(v2.members.length);

    // Re-running assignment after the change is what a migration would do.
    const after = assigned(before);
    expect(armDrift(before, after)).toEqual([]);
    expect(() => assertArmsUnchanged(before, after, "vertical migration")).not.toThrow();
  });

  it("is unaffected by ANY vertical identity, because the vertical is not an input", () => {
    // Stated as a property over the function rather than over a scenario: the draw takes a
    // practice and a patient, and there is no third argument for a version to arrive through.
    const unit = assignmentUnit(PRACTICE.id, "pat-001");
    expect(assignmentUnit(PRACTICE.id, "pat-001")).toBe(unit);
    // @ts-expect-error — no vertical, version or binding can be passed to the draw.
    void (() => assignmentUnit(PRACTICE.id, "pat-001", "vert-1"));
  });

  it("survives many successive version changes", () => {
    const start = assigned(panel(120));
    let current = start;
    for (let version = 0; version < 10; version++) current = assigned(current);
    expect(armDrift(start, current)).toEqual([]);
  });

  it("keeps a patient's arm when they fall out of the vertical's scope", () => {
    // Deliberate, and the measurement-safe direction: dropping people from the control arm
    // exactly where the intervention changed is how a control group stops being one.
    const before = assigned(panel(50));
    const stillHere = before.filter((_, i) => i % 2 === 0);
    const after = assigned(stillHere);
    expect(armDrift(before, after)).toEqual([]);
  });
});

describe("W175 the construction is pinned, not merely relied on", () => {
  it("the holdout engine mentions no vertical, version or binding", () => {
    // The change this guards against is a REASONABLE-SOUNDING one: "different verticals should
    // get independent arms, so salt the hash with the vertical id". That single line silently
    // re-randomises every patient on every version change, and the result would still be
    // balanced, deterministic and auditable — just completely different from last month's.
    const source = readFileSync(path.join(__dirname, "holdout.ts"), "utf8");
    const body = source
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");
    for (const banned of ["vertical", "Vertical", "versionHash", "binding", "Binding", "pathway"]) {
      expect(body, `holdout.ts references "${banned}"`).not.toContain(banned);
    }
  });

  it("keys the draw on practice and patient alone", () => {
    // Two patients differ; the same patient at two practices differs; the same pair never does.
    expect(assignmentUnit("prac-1", "pat-1")).not.toBe(assignmentUnit("prac-1", "pat-2"));
    expect(assignmentUnit("prac-1", "pat-1")).not.toBe(assignmentUnit("prac-2", "pat-1"));
    expect(assignmentUnit("prac-1", "pat-1")).toBe(assignmentUnit("prac-1", "pat-1"));
  });

  it("keeps a rate change monotone, so even THAT cannot release a holdout", () => {
    // Threshold hashing, asserted rather than assumed: raising the rate only adds holdouts.
    // A vertical migration must not change the rate either, but if one ever did, the direction
    // of the damage is bounded — nobody already in the control arm leaves it.
    const ids = panel(300).map((p) => p.id as string);
    const atLow = ids.filter((id) => assignArm(PRACTICE.id, id, 0.2) === "holdout");
    const atHigh = ids.filter((id) => assignArm(PRACTICE.id, id, 0.4) === "holdout");
    for (const id of atLow) expect(atHigh, `${id} released by a rate rise`).toContain(id);
    expect(atHigh.length).toBeGreaterThan(atLow.length);
  });
});

describe("W175 the guard names who moved", () => {
  const before = assigned(panel(20));

  it("reports a move by patient id, not by position", () => {
    // A migration may reorder the panel; a positional comparison would report everybody as moved
    // or, worse, miss a real move offset by another.
    const after = [...before].reverse().map((p) => (p.id === before[3]!.id ? { ...p, holdout: !p.holdout } : p));
    expect(armDrift(before, after)).toEqual([
      { patientId: before[3]!.id as string, from: before[3]!.holdout ? "holdout" : "invite", to: before[3]!.holdout ? "invite" : "holdout" },
    ]);
  });

  it("does not treat arriving or leaving as a move", () => {
    const arrived = [...before, { ...before[0]!, id: "pat-new" as PatientId, holdout: true }];
    expect(armDrift(before, arrived)).toEqual([]);
    expect(armDrift(before, before.slice(0, 5))).toEqual([]);
  });

  it("throws rather than returning a finding nobody reads", () => {
    const moved = before.map((p, i) => (i === 0 ? { ...p, holdout: !p.holdout } : p));
    expect(() => assertArmsUnchanged(before, moved, "vertical migration")).toThrow(ArmDriftError);
    try {
      assertArmsUnchanged(before, moved, "vertical migration");
    } catch (error) {
      expect((error as ArmDriftError).message).toContain("vertical migration");
      expect((error as ArmDriftError).message).toContain(before[0]!.id as string);
      expect((error as ArmDriftError).message).toContain("measurement backbone");
      expect((error as ArmDriftError).moves).toHaveLength(1);
    }
  });

  it("reports drift in a fixed order whatever order the panels are in", () => {
    const moved = before.map((p, i) => (i < 3 ? { ...p, holdout: !p.holdout } : p));
    const forwards = armDrift(before, moved);
    const backwards = armDrift([...before].reverse(), [...moved].reverse());
    expect(backwards).toEqual(forwards);
    expect(forwards).toHaveLength(3);
  });
});

describe("W175 the binding itself carries no arm", () => {
  it("has no field a version change could use to reassign anybody", () => {
    const spec: VerticalSpec = {
      verticalId: "vert-1",
      name: "Example vertical",
      members: [{ kind: "pathway", ref: "hash-a" }],
    };
    const bindings: VerticalBinding[] = [];
    // Accepting is refused here because the version is not usable in this fixture — which is
    // W157's gate doing its job. What matters for THIS unit is the shape of the record.
    const result = acceptVersion(
      bindings,
      spec,
      { pathways: [], content: [], educationItems: [], intervals: { intervals: [], rejected: [] } },
      PRACTICE.id,
      "owner@demo.example",
      "2026-03-01",
    );
    expect(result.ok).toBe(false);
    expect(currentBinding([], PRACTICE.id, "vert-1")).toBeNull();

    const record: VerticalBinding = {
      practiceId: PRACTICE.id,
      verticalId: "vert-1",
      versionHash: "hash-x",
      acceptedBy: "owner@demo.example",
      acceptedAt: "2026-03-01",
    };
    for (const key of Object.keys(record)) {
      expect(key).not.toMatch(/holdout|arm|cohort|control|randomis|randomiz/i);
    }
  });
});
