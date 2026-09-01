// O214: `pnpm gate:accounting` — the honesty step of the verify gate.
//
// AR14 put the gate's verdict on the one path every firing walks. It checks the line's SHAPE and
// never its CONTENT, and O213 found what that costs: four consecutive gate lines claimed a green
// e2e over a red tree, because `pnpm e2e | tail -N` returns TAIL's exit status and a failing run
// reports 0. This asks the one question nobody asked for four units — does the green line account
// for every test in the suite it claims to have run?
//
// AR32's shape exactly: all decision logic lives in src/quality/gate-state.ts, which is unit-tested
// against O211's real (wrong) line and O213's real (right) one; this file only measures the suite
// and sets the exit code.
//
// IT IS A SCRIPT RATHER THAN A UNIT TEST FOR ONE CONCRETE REASON. Measuring the suite means
// spawning Playwright, and vitest runs test files in parallel workers alongside timing-sensitive
// tests (`src/tenancy/rollout.test.ts` times a quadratic workload against a 2.5x line). A gate
// check has no business adding CPU load to a run that measures CPU. Here it runs sequentially,
// after the suite, exactly like audit:gate and perf:gate.

import { execFileSync } from "node:child_process";
import path from "node:path";
import { currentGateState, e2eAccountingGuard } from "../src/quality/gate-state.ts";

/**
 * The suite's real size, from Playwright rather than from a grep. `--list` collects the files and
 * prints a total without launching a browser or a dev server. A static count is NOT a substitute:
 * measured against this suite it reads 324 against a true 344, because five sites generate tests
 * in loops — and undercounting is the one error this check must not make, since it would let a
 * dishonest gate line look fully accounted for.
 */
function suiteSize(): number {
  // Invoke the installed CLI through Node instead of asking the operating system to resolve
  // `npx`. The latter works on Unix, but Windows exposes npx as a .cmd shim and `execFileSync`
  // does not run command scripts through a shell. The package entry is the same Playwright CLI,
  // now reached identically on every host and without a shell interpolation boundary.
  const playwrightCli = path.resolve("node_modules/@playwright/test/cli.js");
  const out = execFileSync(process.execPath, [playwrightCli, "test", "--list"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 180_000,
  });
  const m = /Total:\s*(\d+)\s+tests?\s+in\s+\d+\s+files?/.exec(out);
  if (!m) throw new Error("could not read a total out of `playwright test --list`");
  return Number(m[1]);
}

const size = suiteSize();
if (size === 0) {
  console.error("gate accounting: FAIL — Playwright reported an empty suite, so the size is unread");
  process.exit(1);
}

// The repo root explicitly: `currentGateState`'s default resolves through `__dirname`, which does
// not exist in ES module scope, and pnpm runs this script from the package root.
const state = currentGateState(process.cwd());
const refusal = e2eAccountingGuard(state, size);
if (refusal) {
  console.error(`gate accounting: FAIL — ${refusal}`);
  process.exit(1);
}

console.log(
  `gate accounting: PASS (the ${state.status} line @ ${state.sha} accounts for all ${size} e2e tests)`,
);
