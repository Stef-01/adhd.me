// One matching eval: `pnpm match:eval --level L0|L1 --phase P0..P6 [--live]`. The runner is
// src/lib/matching/eval/run.ts, loaded through vitest's module runner for the `@/` paths. Orders
// are graded on the real roster and on syntheticRoster(50), which only a script or a test may load.
// Live phases read OPENAI_API_KEY from the environment or .env.local.

import { createVitest } from "vitest/node";

const arg = (name) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? "" : process.argv[at + 1] ?? "";
};
const source = (path) => new URL(`../src/${path}`, import.meta.url).pathname;

const vitest = await createVitest("test", { watch: false });
const { runEval } = await vitest.import(source("lib/matching/eval/run.ts"));
const { clinicians } = await vitest.import(source("demo/clinicians.ts"));
const { syntheticRoster } = await vitest.import(source("matching/scale-fixture.ts"));
const outcome = await runEval({
  level: arg("level"),
  phase: arg("phase"),
  live: process.argv.includes("--live"),
  rosters: { real: clinicians, "synthetic-50": syntheticRoster(50) },
});
await vitest.close();
console.log(outcome.message);
process.exit(outcome.code);
