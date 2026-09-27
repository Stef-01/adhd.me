// One matching eval: `pnpm match:eval --level L0|L1 --phase P0..P6 [--live]`. The runner is
// src/lib/matching/eval/run.ts, loaded through vitest's module runner for the `@/` paths.
// Live phases read OPENAI_API_KEY from the environment or .env.local.

import { createVitest } from "vitest/node";

const arg = (name) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? "" : process.argv[at + 1] ?? "";
};

const vitest = await createVitest("test", { watch: false });
const { runEval } = await vitest.import(new URL("../src/lib/matching/eval/run.ts", import.meta.url).pathname);
const outcome = await runEval({ level: arg("level"), phase: arg("phase"), live: process.argv.includes("--live") });
await vitest.close();
console.log(outcome.message);
process.exit(outcome.code);
