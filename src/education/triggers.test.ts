// W148 verify gate: "no symptom inference (G7); rules shipped empty."
//
// The emptiness test is one line. The G7 half is tested the way W120's was — as a property of
// the vocabulary and the direction, not by example — because "does not infer symptoms" is a
// claim about every input, and a module that happens not to infer today can start tomorrow if
// nothing structural stops it.

import { describe, expect, it } from "vitest";
import * as triggerModule from "./triggers";
import { ALL_FACT_SOURCES, type RecordedFact } from "@/pathways/evaluation";
import {
  describeTriggers,
  SHIPPED_TRIGGERS,
  triggersFor,
  type CaseTrigger,
} from "./triggers";

const COND = "placeholder_register_a";

const fact = (code: string, state: RecordedFact["state"] = "recorded_present"): RecordedFact => ({
  code,
  state,
  source: "pms_condition_flag",
  recordedAt: "2026-02-01",
  recordedBy: "clin-1",
});

const trigger = (over: Partial<CaseTrigger> = {}): CaseTrigger => ({
  conditionCode: COND,
  factCode: "fact_a",
  requires: "recorded_present",
  rationale: "Placeholder rationale — fixture only, not clinical content.",
  ...over,
});

describe("W148 rules shipped empty", () => {
  it("ships zero triggers", () => {
    // Deciding that a recorded fact is a moment to teach is a clinical judgement about a
    // condition, which is G5. Mechanism ships, content does not.
    expect(SHIPPED_TRIGGERS).toEqual([]);
  });

  it("empty means nothing is surfaced NOW, not that nothing is available", () => {
    // W121's lesson: an empty rule set must not make the module a no-op that looks like it
    // works. Here it cannot, because W145 offers the whole in-scope library regardless — so
    // the honest statement is about surfacing, and the copy says exactly that.
    const outcome = triggersFor([fact("fact_a")], [COND]);
    expect(outcome.fired).toEqual([]);
    expect(describeTriggers(outcome)[0]).toContain("available as always");
    expect(describeTriggers(outcome)[0]).toContain("whether anything was surfaced now");
  });
});

describe("W148 no symptom inference", () => {
  it("matches only recorded facts, whose sources contain no symptom member", () => {
    // W120's closed union, reached rather than restated: if a symptom source were ever added
    // there, this test is where the education engine's exposure to it would show.
    expect([...ALL_FACT_SOURCES].sort()).toEqual([
      "pms_condition_flag",
      "practice_confirmed",
      "recorded_result_category",
    ]);
    for (const source of ALL_FACT_SOURCES) {
      expect(source).not.toMatch(/symptom|report|inferred|derived|predicted|guess|free_?text/i);
    }
  });

  it("exports nothing whose name suggests deriving or predicting", () => {
    for (const name of Object.keys(triggerModule)) {
      expect(name, `"${name}" reads as deriving`).not.toMatch(
        /infer|derive|predict|suspect|assess|diagnos|score|classif/i,
      );
    }
  });

  it("takes facts and returns triggers, never material and never a fact", () => {
    // The direction rule. A function returning material would let a trigger become a filter,
    // which is exactly what W144's boundary document refused.
    const outcome = triggersFor([fact("fact_a")], [COND], [trigger()]);
    expect(Object.keys(outcome)).toEqual(["fired", "undetectable"]);
    expect(JSON.stringify(outcome)).not.toContain("title");
    expect(JSON.stringify(outcome)).not.toContain("sourceRef");
  });

  it("has no free-text field a symptom could arrive in", () => {
    const keys = Object.keys(trigger()).sort();
    expect(keys).toEqual(["conditionCode", "factCode", "rationale", "requires"]);
    // `rationale` is authored by a reviewer about the RULE, never about a patient, and it is
    // never matched against anything.
    const outcome = triggersFor([fact("fact_a")], [COND], [
      trigger({ rationale: "fact_a chest pain shortness of breath" }),
    ]);
    expect(outcome.fired).toHaveLength(1);
    expect(outcome.fired[0]?.factCode).toBe("fact_a");
  });
});

describe("W148 nothing recorded is not recorded absent", () => {
  it("does not fire an absent-trigger on silence", () => {
    // W120's distinction, and the reason it matters here: a teaching moment defined by a gap
    // must not be triggered by the practice simply never having recorded the fact.
    const outcome = triggersFor([], [COND], [trigger({ requires: "recorded_absent" })]);
    expect(outcome.fired).toEqual([]);
    expect(outcome.undetectable).toEqual([{ conditionCode: COND, factCode: "fact_a" }]);
  });

  it("fires an absent-trigger on a RECORDED absence", () => {
    const outcome = triggersFor([fact("fact_a", "recorded_absent")], [COND], [
      trigger({ requires: "recorded_absent" }),
    ]);
    expect(outcome.fired.map((f) => f.matched)).toEqual(["recorded_absent"]);
  });

  it("reports what it could not check, so a practice can see its own blind spot", () => {
    const outcome = triggersFor([], [COND], [trigger(), trigger({ factCode: "fact_b" })]);
    expect(outcome.undetectable).toHaveLength(2);
    expect(describeTriggers(outcome).join(" ")).toContain("not the same as the fact being absent");
  });

  it("does not fire when the record says the opposite", () => {
    const outcome = triggersFor([fact("fact_a", "recorded_absent")], [COND], [trigger()]);
    expect(outcome.fired).toEqual([]);
    expect(outcome.undetectable).toEqual([]);
  });
});

describe("W148 case-triggered is not case-specific", () => {
  it("ignores triggers for a register the practice does not run", () => {
    const outcome = triggersFor([fact("fact_a")], ["placeholder_register_b"], [trigger()]);
    expect(outcome.fired).toEqual([]);
    expect(outcome.undetectable).toEqual([]);
  });

  it("carries the rationale through, so a fired trigger can be questioned", () => {
    const outcome = triggersFor([fact("fact_a")], [COND], [
      trigger({ rationale: "Because the fixture says so, and a reviewer would see this." }),
    ]);
    expect(outcome.fired[0]?.rationale).toContain("a reviewer would see this");
  });

  it("says what the record shows and never what it means", () => {
    const outcome = triggersFor([fact("fact_a")], [COND], [trigger()]);
    const copy = describeTriggers(outcome).join(" ").toLowerCase();
    expect(copy).toContain("what is on the record, not what it means");
    for (const banned of ["should", "recommend", "consider", "needs", "urgent", "risk"]) {
      expect(copy, `copy contains "${banned}"`).not.toContain(banned);
    }
  });

  it("is deterministic and independent of fact order", () => {
    const facts = [fact("fact_a"), fact("fact_b")];
    const rules = [trigger(), trigger({ factCode: "fact_b" })];
    expect(triggersFor([...facts].reverse(), [COND], rules)).toEqual(
      triggersFor(facts, [COND], rules),
    );
  });
});
