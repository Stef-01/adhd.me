// W233 verify gate: "holdout-based only; refuses to answer without an arm rather than answering
// from the trend."
//
// The trend is the thing to prove absent, and an absence needs a different kind of test from a
// behaviour. It is checked three ways because it could arrive three ways: as a FUNCTION (namespace
// and source, since `improvementSince(date)` passes any name check), as a PARAMETER (a window or
// baseline argument), and as an IMPORT — W9's patient-level holdout is populated, right there, and
// answers a different question convincingly.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { lintEducationCopy } from "@/education/advice-lint";
import { occurrencesFrom, sessionKeysFrom, type SessionKey } from "./model";
import * as mod from "./attribution";
import {
  ALL_CAPACITY_COMPARATORS,
  CAPACITY_ATTRIBUTION_WITHHELD_COPY,
  SHIPPED_CAPACITY_ARMS,
  capacityAttribution,
  type CapacityArmAssignment,
} from "./attribution";

const SOURCE = readFileSync(path.join(process.cwd(), "src/capacity/attribution.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const AS_OF = isoDaysFrom(sim.config.todayIso, 6 * 7 + 1);
const PERIOD = { fromIso: sim.config.todayIso, toIso: AS_OF };
const occurrences = occurrencesFrom(sim.appointments, AS_OF);
const keys = sessionKeysFrom(occurrences);

const assign = (key: SessionKey, arm: "opened" | "held_back"): CapacityArmAssignment => ({
  key,
  arm,
  assignedOnIso: "2026-08-01",
  comparableBecause: "Same clinician group, same weekday pattern, similar list size.",
});

describe("W233 there is no arm in this tree, so it refuses over everything in it", () => {
  it("refuses over the whole simulated practice, because no session has an arm", () => {
    // The premise, checked rather than asserted: the sim has 70 recurring sessions and not one of
    // them carries an arm, so the honest answer to "did opening slots help" is that nobody ran the
    // comparison.
    expect(keys).toHaveLength(70);
    const result = capacityAttribution(SHIPPED_CAPACITY_ARMS, occurrences, PERIOD);
    expect(result.attributed).toBe(false);
    if (result.attributed) return;
    expect(result.withheld).toEqual(["no_arm_recorded"]);
    expect(result.copy).toBe(CAPACITY_ATTRIBUTION_WITHHELD_COPY.no_arm_recorded);
    // And the sentence names the wrong answer it is refusing, rather than only declining.
    expect(result.copy).toMatch(/would credit the decision with everything else that changed/);
  });

  it("ships no arms, pinned", () => {
    expect(SHIPPED_CAPACITY_ARMS).toEqual([]);
  });

  it("would answer if a practice ran one, so the refusal is about the record and not the code", () => {
    // The other direction, and the thing that stops every test above being trivially true.
    const half = Math.floor(keys.length / 2);
    const assignments = [
      ...keys.slice(0, half).map((key) => assign(key, "opened")),
      ...keys.slice(half).map((key) => assign(key, "held_back")),
    ];
    const result = capacityAttribution(assignments, occurrences, PERIOD);
    expect(result.attributed).toBe(true);
    if (!result.attributed) return;
    expect(result.figure.comparator).toBe("recorded_session_arm");
    expect(result.figure.opened.sessions).toBe(half);
    expect(result.figure.heldBack.sessions).toBe(keys.length - half);
    expect(result.figure.basis.recordedFacts).toBe(
      result.figure.opened.slotsOffered + result.figure.heldBack.slotsOffered,
    );
    // The figure is a difference of two measured rates, to the digit.
    expect(result.figure.differenceInPoints).toBeCloseTo(
      (result.figure.opened.utilisation! - result.figure.heldBack.utilisation!) * 100,
      10,
    );
  });
});

describe("W233 the trend does not exist here, checked three ways", () => {
  it("exports no function that could compute a before and after", () => {
    expect(Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === "function")).toEqual([
      "capacityAttribution",
    ]);
    // On the source too, comments stripped — the module note has to DISCUSS the trend to explain
    // why there is none, and a scan that cannot tell prose from code would force the explanation
    // out of the file. That has happened twice in this lane already.
    expect(CODE, "the comment stripper removed the code too").toContain("export function capacityAttribution");
    expect(CODE).not.toMatch(/\b(before|prior|previous|baseline|trend|since)[A-Z]\w*/);
    expect(CODE).not.toMatch(/\b(function|const)\s+\w*(trend|baseline|prePost|improvement)\w*/i);
  });

  it("takes no window, baseline or comparison-period parameter", () => {
    // @ts-expect-error — a second period to compare against IS the trend, wearing an argument name.
    void capacityAttribution([], occurrences, PERIOD, { comparedWith: PERIOD });
    // @ts-expect-error — and no comparator choice either. W215's rule.
    void capacityAttribution([], occurrences, PERIOD, { comparator: "prior_quarter" });
  });

  it("does not import the patient-level arm, which answers a different question convincingly", () => {
    // The most persuasive wrong answer available in this repository: W9's holdout is real
    // randomisation, populated, and about messaging rather than capacity.
    const imports = [...CODE.matchAll(/from "([^"]+)"/g)].map((m) => m[1]!).sort();
    expect(imports).toEqual(["./model", "./model", "@/reporting/model"].sort());
    expect(CODE).not.toMatch(/engine\/holdout|engine\/attribution/);
  });

  it("declares exactly one comparator, by value", () => {
    expect(ALL_CAPACITY_COMPARATORS).toEqual(["recorded_session_arm"]);
  });
});

describe("W233 every refusal is reachable, and the overlap one especially", () => {
  it("counts the sessions that contributed, not the ones that were assigned", () => {
    // Finding 7 of W234's review. An arm holding an assigned session that never ran reported a
    // session count and a slot total describing different sets — which is how an arm looks better
    // powered than it is.
    const ghost: SessionKey = { clinicianId: "never-ran", weekday: 3 };
    const half = Math.floor(keys.length / 2);
    const result = capacityAttribution(
      [
        ...keys.slice(0, half).map((key) => assign(key, "opened")),
        assign(ghost, "opened"),
        ...keys.slice(half).map((key) => assign(key, "held_back")),
      ],
      occurrences,
      PERIOD,
    );
    expect(result.attributed).toBe(true);
    if (!result.attributed) return;
    // The ghost is assigned and contributes nothing, so it must not be counted.
    expect(result.figure.opened.sessions).toBe(half);
  });

  it("refuses an empty arm rather than describing the one that has sessions", () => {
    const result = capacityAttribution([assign(keys[0]!, "opened")], occurrences, PERIOD);
    expect(result.attributed).toBe(false);
    if (result.attributed) return;
    expect(result.withheld).toContain("arm_empty");
  });

  it("refuses a session that appears on both sides", () => {
    // Not a larger sample: the same session compared with itself. This is the failure that looks
    // like more evidence, which is why it is refused rather than deduplicated — deduplicating
    // would silently change the experiment the practice thinks it ran.
    const result = capacityAttribution(
      [assign(keys[0]!, "opened"), assign(keys[0]!, "held_back"), assign(keys[1]!, "held_back")],
      occurrences,
      PERIOD,
    );
    expect(result.attributed).toBe(false);
    if (result.attributed) return;
    expect(result.withheld).toContain("arms_overlap");
    expect(result.copy).toMatch(/not a larger sample/);
  });

  it("refuses an assignment that cannot be shown to precede the results", () => {
    const undated = { ...assign(keys[0]!, "opened"), assignedOnIso: "last winter" };
    const result = capacityAttribution([undated, assign(keys[1]!, "held_back")], occurrences, PERIOD);
    expect(result.attributed).toBe(false);
    if (result.attributed) return;
    expect(result.withheld).toContain("assignment_undated");
    expect(result.copy).toMatch(/An arm chosen afterwards is not an arm/);
  });

  it("reports every reason, not the first", () => {
    const result = capacityAttribution(
      [{ ...assign(keys[0]!, "opened"), assignedOnIso: "whenever" }, assign(keys[0]!, "held_back")],
      occurrences,
      PERIOD,
    );
    expect(result.attributed).toBe(false);
    if (result.attributed) return;
    expect(result.withheld.length).toBeGreaterThan(1);
    expect(result.withheld).toContain("assignment_undated");
    expect(result.withheld).toContain("arms_overlap");
  });

  it("declares every refusal it can produce, both directions", () => {
    const produced = new Set<string>();
    for (const assignments of [
      [],
      [assign(keys[0]!, "opened")],
      [assign(keys[0]!, "opened"), assign(keys[0]!, "held_back"), assign(keys[1]!, "held_back")],
      [{ ...assign(keys[0]!, "opened"), assignedOnIso: "x" }, assign(keys[1]!, "held_back")],
    ]) {
      const result = capacityAttribution(assignments, occurrences, PERIOD);
      if (!result.attributed) for (const reason of result.withheld) produced.add(reason);
    }
    expect([...produced].sort()).toEqual(Object.keys(CAPACITY_ATTRIBUTION_WITHHELD_COPY).sort());
  });

  it("passes the advice linter on everything it says", () => {
    for (const text of Object.values(CAPACITY_ATTRIBUTION_WITHHELD_COPY)) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
