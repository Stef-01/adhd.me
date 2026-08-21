// W230 verify gate: "W106 classification; a forecast is practice-level and no figure can identify a
// patient, by type rather than by scrubbing."
//
// "BY TYPE RATHER THAN BY SCRUBBING" RULES SOMETHING OUT, and that is the useful half of the
// sentence. A disclosure floor is scrubbing: it is what W218 had to reach for because a
// response-graph edge counts the people who answered. This lane is asked for the other guarantee —
// that the identity never enters — so the checks below are on signatures, on values and on imports
// across all seven modules, and none of them is a filter applied afterwards.
//
// The small-cell question is answered by COUNTING rather than by reasoning, and both numbers are
// pinned here so a later reader can see which figures were measured and which were not.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { RECORD_CLASSES } from "@/privacy/record-classes";
import { capacityView } from "@/console/capacity";
import { capacityReport, occurrencesFrom } from "./model";

const LANE = path.join(process.cwd(), "src/capacity");
const laneFiles = () =>
  readdirSync(LANE).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts")).sort();

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const AS_OF = isoDaysFrom(sim.config.todayIso, 6 * 7 + 1);
const PERIOD = { fromIso: sim.config.todayIso, toIso: AS_OF };

describe("W230 the identity never enters, across the whole lane", () => {
  it("has seven modules and checks all of them, so no file is quietly out of scope", () => {
    // Non-vacuity for everything below: a directory read that returned two files would make the
    // sweeps trivially green.
    expect(laneFiles()).toEqual([
      "calendar.ts",
      "copy.ts",
      "drift.ts",
      "forecast.ts",
      "model.ts",
      "recommendation.ts",
      "score.ts",
    ]);
  });

  it("takes no patient in any exported signature, in any of them", () => {
    // On the SIGNATURES rather than the names — `sizeFor(patient)` passes a name check — and
    // counting the functions found, because a regex that matches nothing passes silently.
    let checked = 0;
    for (const file of laneFiles()) {
      const source = readFileSync(path.join(LANE, file), "utf8");
      for (const match of source.matchAll(/^export function (\w+)\s*\(([^)]*)\)/gms)) {
        checked += 1;
        const params = match[2]!.replace(/\s+/g, " ");
        expect(params, `${file}: ${match[1]} takes a patient`).not.toMatch(
          /\bpatient\b|\bpatientId\b|Patient\[\]|readonly Patient/i,
        );
      }
    }
    expect(checked, "the signature scan found no functions to check").toBeGreaterThan(12);
  });

  it("declares no field a patient could occupy, in any exported interface", () => {
    // The second door. A type is where an id arrives without any signature changing.
    let fields = 0;
    for (const file of laneFiles()) {
      const source = readFileSync(path.join(LANE, file), "utf8");
      for (const block of source.matchAll(/^export interface \w+ \{([\s\S]*?)^\}/gm)) {
        for (const line of block[1]!.split("\n")) {
          if (!/^\s{2}\w/.test(line)) continue;
          fields += 1;
          expect(line, `${file}: a field could hold a patient — ${line.trim()}`).not.toMatch(
            /\bpatient/i,
          );
        }
      }
    }
    expect(fields, "the field scan found no fields to check").toBeGreaterThan(25);
  });

  it("imports nothing that holds a patient, in any of them", () => {
    // The third door, and the one MATCH-1 came through: a reasonable-looking line in a module that
    // already had the data to hand. The lane may reach its own files, the reporting basis type and
    // the domain types — nothing that carries people.
    const allowed = new Set([
      "./calendar", "./copy", "./drift", "./forecast", "./model", "./recommendation", "./score",
      "@/reporting/model", "@/domain/types",
    ]);
    // COMMENTS STRIPPED FIRST, and this file learned it the same way W228 did an hour earlier:
    // `calendar.ts`'s own prose explains that a caller can tell "no holiday that day" from
    // "no calendar", and `from "([^"]+)"` matched the sentence. A scan that cannot tell prose from
    // code reports the explanation as a violation, and the fix somebody reaches for is deleting
    // the explanation.
    let imports = 0;
    for (const file of laneFiles()) {
      const code = readFileSync(path.join(LANE, file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/[^\n]*/g, " ");
      expect(code, `${file}: the comment stripper removed the code too`).toMatch(/export (function|const|interface|type)/);
      for (const match of code.matchAll(/from "([^"]+)"/g)) {
        imports += 1;
        expect(allowed.has(match[1]!), `${file} imports ${match[1]}`).toBe(true);
      }
    }
    expect(imports, "the import scan found no imports to check").toBeGreaterThan(8);
  });

  it("carries no patient identity through a whole rendered view", () => {
    // And the same claim by VALUE, end to end: the console's own view, serialised, against real
    // synthetic patient ids. A type argument that survives this is worth more than either alone.
    const serialised = JSON.stringify(capacityView(sim.appointments, AS_OF, PERIOD));
    expect(serialised.length).toBeGreaterThan(5000);
    for (const patient of sim.patients.slice(0, 200)) {
      expect(serialised).not.toContain(String(patient.id));
    }
    for (const appointment of sim.appointments.slice(0, 200)) {
      expect(serialised).not.toContain(String(appointment.id));
    }
  });
});

describe("W230 the small-cell question is answered by counting", () => {
  it("renders no figure that is a count of a handful of people", () => {
    // The figures a reader actually sees are per-session aggregates over the whole period. Pinned
    // with the number, not the impression: if the sim's diary thins out, this fails rather than
    // quietly becoming untrue.
    const view = capacityView(sim.appointments, AS_OF, PERIOD);
    const filled = view.sessions.map((row) => row.slotsFilled);
    expect(filled).toHaveLength(70);
    expect(Math.min(...filled)).toBe(10);
    expect(filled.filter((n) => n < 5)).toEqual([]);
  });

  it("counts an unfilled slot as nobody, which is why no floor is put on it", () => {
    // 27 sessions have between one and four UNFILLED slots. Withholding those would suppress the
    // one figure in the lane that identifies nobody by construction — an empty slot is not a
    // person — and would leave a practice unable to see the spare room it has.
    const report = capacityReport(sim.appointments, AS_OF, PERIOD);
    const unfilled = report.sessions.map((s) =>
      s.history.recorded ? s.history.slotsOffered - s.history.slotsFilled : 0,
    );
    expect(unfilled.filter((n) => n > 0 && n < 5)).toHaveLength(27);
  });

  it("measures the per-occurrence figures that ARE small, and pins that nothing renders them", () => {
    // The honest other half. These are small cells by W218's definition — the minimum is one
    // person's appointment with a named clinician on a named day — and the reason there is no
    // floor is that no surface discloses them, not that they are harmless.
    const occurrences = occurrencesFrom(sim.appointments, AS_OF);
    expect(occurrences).toHaveLength(411);
    expect(occurrences.filter((o) => o.slotsFilled < 5)).toHaveLength(94);
    expect(Math.min(...occurrences.map((o) => o.slotsFilled))).toBe(1);

    // Nothing in the view carries one — checked on the VALUES, not the field list. The first
    // version compared `Object.keys` of a session row, and seeding a leak (per-occurrence dates
    // concatenated into `label`) left it GREEN, because stuffing data into an existing string
    // field changes no key. That is the third guard this session that inspected shape where the
    // risk was content, so this one reads what is actually in there: no occurrence's date may
    // appear anywhere in the rendered rows, other than the two period boundaries, which every
    // basis legitimately carries.
    const view = capacityView(sim.appointments, AS_OF, PERIOD);
    expect(Object.keys(view.sessions[0]!).sort()).toEqual([
      "label", "noHistoryCopy", "occurrences", "recommendation", "slotsFilled", "slotsOffered",
      "utilisation", "utilisationLabel",
    ]);
    const rendered = JSON.stringify(view.sessions);
    const occurrenceDates = new Set(occurrences.map((o) => o.dayIso));
    occurrenceDates.delete(PERIOD.fromIso);
    occurrenceDates.delete(PERIOD.toIso);
    expect(occurrenceDates.size, "every occurrence date is a period boundary, so this is moot").toBeGreaterThan(20);
    for (const dayIso of occurrenceDates) {
      expect(rendered, `a per-occurrence date reached the rendered rows: ${dayIso}`).not.toContain(dayIso);
    }
  });

  it("states the trigger in the register a reader of the register will meet", () => {
    // W145's rule: the condition under which this classification stops being right is written
    // where somebody auditing the lane will find it, rather than left to be rediscovered.
    const entry = RECORD_CLASSES.find((c) => c.module === "src/capacity/model.ts");
    expect(entry?.handling).toBe("no_patient_identity");
    expect(entry?.rationale).toMatch(/TRIGGER THAT CHANGES THIS CLASSIFICATION/);
    expect(entry?.rationale).toMatch(/per-occurrence/);
    expect(entry?.rationale).toMatch(/floor on FILLED cells only/);
  });
});

describe("W230 every module in the lane is classified", () => {
  it("has a record class for all seven, plus the console view", () => {
    const declared = new Set(RECORD_CLASSES.map((c) => c.module));
    const expected = [
      ...laneFiles()
        .filter((f) => f !== "copy.ts")
        .map((f) => `src/capacity/${f}`),
      "src/console/capacity.ts",
    ];
    expect(expected.filter((m) => !declared.has(m)), "unclassified").toEqual([]);
    for (const module of expected) {
      const entry = RECORD_CLASSES.find((c) => c.module === module)!;
      expect(entry.handling, module).toBe("no_patient_identity");
      expect(entry.rationale.length, `${module} is classified without an argument`).toBeGreaterThan(120);
    }
  });

  it("leaves copy.ts out on purpose, and says why here rather than nowhere", () => {
    // W226's module authors nothing and holds nothing: it drives the other six over fixtures and
    // returns their prose. Classifying it would declare a record class for a module with no
    // records — and W106's own staleness check would not catch that, because the file exists.
    expect(RECORD_CLASSES.find((c) => c.module === "src/capacity/copy.ts")).toBeUndefined();
  });
});
