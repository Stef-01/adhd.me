// AR15: one capture run over the whole matrix, written to a manifest file. The plan's gate —
// three consecutive runs with ZERO diff before any baseline is accepted — is executed by
// running this spec three times and diffing the manifests (the unit's ledger row records the
// three runs and their verdict); once a baseline is accepted, this spec compares against it
// and a mismatch names every capture that moved.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { captureAll, captureMatrix, manifestDiff } from "./visual";
import { measured } from "./measured";

const BASELINE = path.resolve(__dirname, "../../qa/baselines/manifest.json");
const RUN_OUT = process.env.VISUAL_RUN_OUT; // stability mode: write here, compare nothing

test("the visual matrix is stable against the accepted baseline", async ({ page, request }) => {
  test.setTimeout(1_500_000);
  const manifest = await captureAll(page, request);
  measured("visual.captures", Object.keys(manifest).length);
  expect(Object.keys(manifest).length).toBe(captureMatrix().length);

  if (RUN_OUT) {
    mkdirSync(path.dirname(RUN_OUT), { recursive: true });
    writeFileSync(RUN_OUT, JSON.stringify(manifest, null, 2) + "\n", "utf8");
    return; // stability mode: three of these runs must agree before a baseline exists.
  }

  // AR15 is parked in-progress: until its three-run protocol accepts a baseline, this spec
  // SKIPS with the reason named rather than holding every other unit's gate red — an unfinished
  // unit's artifact must not fail the suite for work it still owes. The ledger row owes the
  // protocol; once qa/baselines/manifest.json exists this becomes the comparison gate.
  test.skip(!existsSync(BASELINE), "AR15 baseline not yet accepted — three-run stability protocol pending");
  const accepted = JSON.parse(readFileSync(BASELINE, "utf8")) as Record<string, string>;
  const diff = manifestDiff(accepted, manifest);
  expect(diff, `the visual baseline moved:\n${diff.join("\n")}`).toEqual([]);
});
