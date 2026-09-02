// U12 (O229): `pnpm smoke <origin>` — is the deployment answering?
//
// The steps and their checks live in src/ops/smoke.ts, which is unit-tested against fake
// responses and holds docs/DEPLOY-RUNBOOK.md to the same list; this file only takes the origin
// off the command line, walks the steps, prints one line each, and sets the exit code. Any miss
// is exit 1. The script sends no cookie and no secret, and carries no request text.

import { formatSmokeResult, runSmoke } from "../src/ops/smoke.ts";

const origin = process.argv[2];
if (!origin) {
  console.error("usage: pnpm smoke <origin>   e.g. pnpm smoke http://localhost:3100");
  process.exit(2);
}

let results;
try {
  results = await runSmoke(origin);
} catch (error) {
  console.error(`smoke: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
for (const result of results) console.log(formatSmokeResult(result));

const misses = results.filter((r) => r.miss !== null).length;
if (misses > 0) {
  console.error(`smoke: FAIL — ${misses} of ${results.length} steps missed at ${origin}`);
  process.exit(1);
}
console.log(`smoke: PASS — ${results.length} steps answered at ${origin}`);
