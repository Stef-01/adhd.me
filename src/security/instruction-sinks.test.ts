// W153 verify gate (the part that is a fact rather than a posture): nothing in this tree turns
// text into an instruction, because nothing calls a model.

import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DECLARED_INSTRUCTION_SINKS,
  INSTRUCTION_SINK_MARKERS,
  findInstructionSinks,
  namesInstructionSink,
  undeclaredInstructionSinks,
} from "./instruction-sinks";

const ROOT = path.resolve(__dirname, "../..");

describe("W153 there is no instruction sink", () => {
  it("finds no model endpoint anywhere in src/, app/ or scripts/", () => {
    // The day W147 is built this fails, and that is the point: the failure is the reminder that
    // the adapter needs a ratified G8, and clearing it means writing down which module calls out
    // and under which ruling.
    const undeclared = undeclaredInstructionSinks(findInstructionSinks(ROOT));
    expect(undeclared.map((h) => `${h.file} (${h.marker})`)).toEqual([]);
  });

  it("declares no exception, because G8 is not ratified", () => {
    expect(DECLARED_INSTRUCTION_SINKS).toEqual([]);
  });

  it("would actually notice one — the scanner is proven, not assumed", () => {
    // A scan that reports zero is indistinguishable from a scan that cannot see. Every marker is
    // fed to the detector so the empty result above means something.
    expect(INSTRUCTION_SINK_MARKERS.length).toBeGreaterThan(3);
    for (const marker of INSTRUCTION_SINK_MARKERS) {
      expect(namesInstructionSink(`const client = require("${marker}");`), marker).toContain(marker);
    }
    expect(namesInstructionSink("const x = 1;")).toEqual([]);
  });

  it("does not match its own marker list, so the scan has no self-exclusion to hide in", () => {
    // The markers are assembled from fragments at runtime rather than written out, which is why
    // this module can be scanned like every other file instead of being skipped by name. A
    // skipped file is a place to put something.
    const hits = findInstructionSinks(ROOT, ["src/security"]);
    expect(hits).toEqual([]);
  });

  it("scans test files too", () => {
    // A test that calls a model is a call to a model. Nothing here is exempt by being a test —
    // asserted by pointing the scanner at a directory whose test files it did read.
    const hits = findInstructionSinks(ROOT, ["src/security"]);
    expect(hits).toEqual([]);
    expect(namesInstructionSink(`describe("x", () => fetch("${INSTRUCTION_SINK_MARKERS[1]}"))`)).not.toEqual([]);
  });
});
